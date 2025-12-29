import express from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { initializeSyncEngine, enqueueSyncJob, getSyncStateRecord } from './engine';
import { verifyLinearSignature, verifyNotionSignature } from './clients';
import { SyncJobPayload, SyncSystem } from './types';

const router = express.Router();
type RawBodyRequest = express.Request & { rawBody?: string };
const webhookRateLimit = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.WEBHOOK_RATE_LIMIT || 60),
  standardHeaders: true,
  legacyHeaders: false
});

router.use('/webhook', webhookRateLimit);

router.post('/webhook/notion', async (req, res) => {
  try {
    await initializeSyncEngine();
    const rawBody = (req as RawBodyRequest).rawBody;
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing raw body for signature verification' });
    }
    const signature = (req.headers['x-notion-signature'] as string) || (req.headers['notion-signature'] as string);
    if (!verifyNotionSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid Notion signature' });
    }

    const body = req.body || {};
    const entityId = body?.id || body?.page?.id || body?.record?.id;
    if (!entityId) {
      return res.status(400).json({ error: 'Missing entity id in payload' });
    }

    const operationId = (req.headers['x-operation-id'] as string) || uuidv4();

    const job: SyncJobPayload = {
      operationId,
      entityId,
      sourceSystem: 'notion',
      targetSystem: 'linear',
      sourceRecordId: entityId,
      targetRecordId: body?.linearIssueId || body?.issueId,
      updatedAt: body?.last_edited_time,
      fields: body
    };

    const result = await enqueueSyncJob(job);
    res.json({ status: 'queued', result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to queue Notion sync' });
  }
});

router.post('/webhook/linear', async (req, res) => {
  try {
    await initializeSyncEngine();
    const rawBody = (req as RawBodyRequest).rawBody;
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing raw body for signature verification' });
    }
    const signature = (req.headers['x-linear-signature'] as string) || (req.headers['linear-signature'] as string);
    if (!verifyLinearSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid Linear signature' });
    }

    const body = req.body || {};
    const issueId = body?.id || body?.issueId || body?.data?.id;
    if (!issueId) {
      return res.status(400).json({ error: 'Missing issue id in payload' });
    }

    const notionId = body?.notionPageId || body?.data?.notionPageId;
    const operationId = (req.headers['x-operation-id'] as string) || uuidv4();

    const job: SyncJobPayload = {
      operationId,
      entityId: issueId,
      sourceSystem: 'linear',
      targetSystem: 'notion',
      sourceRecordId: issueId,
      targetRecordId: notionId || undefined,
      updatedAt: body?.updatedAt,
      fields: body
    };

    const result = await enqueueSyncJob(job);
    res.json({ status: 'queued', result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to queue Linear sync' });
  }
});

router.post('/trigger', async (req, res) => {
  try {
    await initializeSyncEngine();
    const { direction, entityId, sourceRecordId, targetRecordId } = req.body || {};
    if (!direction || !entityId || !sourceRecordId) {
      return res.status(400).json({ error: 'direction, entityId and sourceRecordId are required' });
    }
    const [sourceSystemRaw, targetSystemRaw] = direction.split('-to-');
    if (!['notion', 'linear'].includes(sourceSystemRaw) || !['notion', 'linear'].includes(targetSystemRaw)) {
      return res.status(400).json({ error: 'direction must be notion-to-linear or linear-to-notion' });
    }
    const sourceSystem = sourceSystemRaw as SyncSystem;
    const targetSystem = targetSystemRaw as SyncSystem;
    const operationId = uuidv4();
    const job: SyncJobPayload = {
      operationId,
      entityId,
      sourceSystem,
      targetSystem,
      sourceRecordId,
      targetRecordId,
      fields: req.body
    };
    const result = await enqueueSyncJob(job);
    res.json({ status: 'queued', result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to queue manual sync' });
  }
});

router.get('/state/:entityId', async (req, res) => {
  try {
    const { source, target } = req.query;
    const entityId = req.params.entityId;
    if (!source || !target) {
      return res.status(400).json({ error: 'source and target query params are required' });
    }
    const sourceSystem = String(source);
    const targetSystem = String(target);
    if (!['notion', 'linear'].includes(sourceSystem) || !['notion', 'linear'].includes(targetSystem)) {
      return res.status(400).json({ error: 'source and target must be notion or linear' });
    }
    const record = await getSyncStateRecord(entityId, sourceSystem as SyncSystem, targetSystem as SyncSystem);
    if (!record) {
      return res.status(404).json({ error: 'Sync state not found' });
    }
    res.json(record);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch sync state' });
  }
});

export const syncRouter = router;
