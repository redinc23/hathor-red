import { Queue, Worker, QueueScheduler, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import {
  BACKOFF_MULTIPLIER,
  INITIAL_BACKOFF_MS,
  MAX_BACKOFF_MS,
  MAX_RETRIES,
  REDIS_BULL_CONFIG
} from './config';
import {
  claimOperation
} from './idempotency';
import {
  createLinearIssueFromNotion,
  createNotionPageFromLinear,
  extractLinearIdFromNotionProperties,
  extractNotionIdFromLinearIssue,
  fetchLinearIssue,
  fetchNotionPage,
  getLinearUpdatedAt,
  getNotionLastEdited,
  updateLinearIssueFromNotion,
  updateNotionPageFromLinear
} from './clients';
import {
  ensurePendingState,
  getSyncState,
  markSynced,
  markSyncing,
  recordDeadLetter,
  recordFailure
} from './stateStore';
import { SyncJobPayload, SyncSystem } from './types';

let syncQueue: Queue<SyncJobPayload> | null = null;
let deadLetterQueue: Queue<SyncJobPayload> | null = null;
let scheduler: QueueScheduler | null = null;
let worker: Worker<SyncJobPayload> | null = null;

const buildBackoff = (): JobsOptions['backoff'] => ({
  type: 'syncBackoff'
});

const syncBackoffStrategy = (attemptsMade: number) => {
  const attemptIndex = Math.max(0, attemptsMade - 1);
  const delay = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attemptIndex);
  return Math.min(delay, MAX_BACKOFF_MS);
};

const connection = new IORedis({
  host: REDIS_BULL_CONFIG.host,
  port: REDIS_BULL_CONFIG.port,
  password: REDIS_BULL_CONFIG.password
});

export const initializeSyncEngine = async () => {
  if (syncQueue) return;

  syncQueue = new Queue<SyncJobPayload>('sync-jobs', {
    connection,
    defaultJobOptions: {
      attempts: MAX_RETRIES,
      backoff: buildBackoff(),
      removeOnComplete: true
    }
  });

  deadLetterQueue = new Queue<SyncJobPayload>('sync-dead-letter', { connection });
  scheduler = new QueueScheduler('sync-jobs', { connection });

  worker = new Worker<SyncJobPayload>(
    'sync-jobs',
    async (job) => {
      const payload = job.data;
      await processJob(payload);
    },
    {
      connection,
      concurrency: Number(process.env.SYNC_WORKER_CONCURRENCY || 5),
      settings: {
        backoffStrategies: {
          syncBackoff: syncBackoffStrategy
        }
      }
    }
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const payload = job.data as SyncJobPayload;
    await recordFailure(payload.entityId, payload.sourceSystem, payload.targetSystem, err?.message || 'Unknown error');
    if (job.attemptsMade >= MAX_RETRIES && deadLetterQueue) {
      await deadLetterQueue.add('dead-letter', payload, { removeOnComplete: true, removeOnFail: true });
      await recordDeadLetter(payload, err?.message || 'Exceeded retries');
    }
  });
};

export const enqueueSyncJob = async (payload: SyncJobPayload) => {
  if (!syncQueue) {
    await initializeSyncEngine();
  }

  const claimed = await claimOperation(payload.operationId);
  if (!claimed) {
    return { skipped: true };
  }

  await ensurePendingState(payload);

  await syncQueue!.add(`${payload.sourceSystem}-to-${payload.targetSystem}`, payload, {
    attempts: MAX_RETRIES,
    backoff: buildBackoff()
  });
  return { enqueued: true };
};

const processJob = async (payload: SyncJobPayload) => {
  await markSyncing(payload.entityId, payload.sourceSystem, payload.targetSystem, payload.operationId);
  try {
    if (payload.sourceSystem === 'notion') {
      await handleNotionToLinear(payload);
    } else {
      await handleLinearToNotion(payload);
    }
    await markSynced(payload.entityId, payload.sourceSystem, payload.targetSystem, payload.operationId);
  } catch (error: any) {
    throw error;
  }
};

const handleNotionToLinear = async (payload: SyncJobPayload) => {
  const page = await fetchNotionPage(payload.sourceRecordId);
  const notionUpdated = getNotionLastEdited(page);
  const notionProps = (page as { properties?: Record<string, any> } | null | undefined)?.properties;

  let linearIssue = payload.targetRecordId ? await fetchLinearIssue(payload.targetRecordId) : null;
  if (!linearIssue) {
    const linkedId = await extractLinearIdFromNotionProperties(notionProps);
    linearIssue = linkedId ? await fetchLinearIssue(linkedId) : null;
  }

  const linearUpdated = getLinearUpdatedAt(linearIssue);

  if (linearIssue && linearUpdated && notionUpdated && linearUpdated > notionUpdated) {
    await updateNotionPageFromLinear(payload.sourceRecordId, linearIssue);
    return;
  }

  if (linearIssue) {
    await updateLinearIssueFromNotion(linearIssue.id, notionProps);
    return;
  }

  const created = await createLinearIssueFromNotion(notionProps);
  const createdId = (created as { issue?: { id?: string }; id?: string })?.issue?.id || (created as { id?: string })?.id;
  if (createdId) {
    await ensurePendingState({
      ...payload,
      targetRecordId: createdId
    });
  }
};

const handleLinearToNotion = async (payload: SyncJobPayload) => {
  const issue = await fetchLinearIssue(payload.sourceRecordId);
  const linearUpdated = getLinearUpdatedAt(issue);

  let notionPageId = payload.targetRecordId;
  if (!notionPageId) {
    notionPageId = await extractNotionIdFromLinearIssue(issue);
  }

  const notionPage = notionPageId ? await fetchNotionPage(notionPageId) : null;
  const notionUpdated = getNotionLastEdited(notionPage);
  const notionProps = (notionPage as { properties?: Record<string, any> } | null | undefined)?.properties;

  if (notionPage && notionUpdated && linearUpdated && notionUpdated > linearUpdated) {
    await updateLinearIssueFromNotion(issue.id, notionProps);
    return;
  }

  if (notionPage && notionPageId) {
    await updateNotionPageFromLinear(notionPageId, issue);
    return;
  }

  const created = await createNotionPageFromLinear(issue);
  const newPageId = (created as { id?: string })?.id;
  if (newPageId) {
    await ensurePendingState({
      ...payload,
      targetRecordId: newPageId
    });
  }
};

export const getSyncStateRecord = (entityId: string, sourceSystem: SyncSystem, targetSystem: SyncSystem) =>
  getSyncState(entityId, sourceSystem, targetSystem);
