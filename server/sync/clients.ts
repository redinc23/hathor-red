import crypto from 'crypto';
import { Client as NotionClient } from '@notionhq/client';
import { LinearClient } from '@linear/sdk';
import { LINEAR_TEAM_ID, LINEAR_WEBHOOK_SECRET, NOTION_DATABASE_ID, NOTION_WEBHOOK_SECRET } from './config';
import { buildMappingFromRows, mapLinearToNotion, mapNotionToLinear } from './mapping';
import { withLinearRateLimit, withNotionRateLimit } from './rateLimiter';
import { MappingConfig } from './types';
import { fetchFieldMappings } from './stateStore';

const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

const timingSafeCompare = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

export const verifyNotionSignature = (rawBody: string, signature?: string) => {
  if (!NOTION_WEBHOOK_SECRET) return true;
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', NOTION_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return timingSafeCompare(digest, signature);
};

export const verifyLinearSignature = (rawBody: string, signature?: string) => {
  if (!LINEAR_WEBHOOK_SECRET) return true;
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', LINEAR_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return timingSafeCompare(digest, signature);
};

export const fetchNotionPage = async (pageId: string) => {
  return withNotionRateLimit(() => notion.pages.retrieve({ page_id: pageId }));
};

export const updateNotionPageFromLinear = async (pageId: string, issue: any, mappingOverrides?: MappingConfig) => {
  const rows = await fetchFieldMappings('notion', 'linear');
  const mapping = buildMappingFromRows(rows);
  const properties = mapLinearToNotion(issue, { ...mapping, ...mappingOverrides });
  return withNotionRateLimit(() =>
    notion.pages.update({
      page_id: pageId,
      properties
    })
  );
};

export const createNotionPageFromLinear = async (issue: any, mappingOverrides?: MappingConfig) => {
  if (!NOTION_DATABASE_ID) {
    throw new Error('NOTION_DATABASE_ID is required to create pages');
  }
  const rows = await fetchFieldMappings('notion', 'linear');
  const mapping = buildMappingFromRows(rows);
  const properties = mapLinearToNotion(issue, { ...mapping, ...mappingOverrides });
  return withNotionRateLimit(() =>
    notion.pages.create({
      parent: { database_id: NOTION_DATABASE_ID },
      properties
    })
  );
};

export const fetchLinearIssue = async (issueId: string) => {
  return withLinearRateLimit(() => linear.issue(issueId));
};

export const updateLinearIssueFromNotion = async (issueId: string, properties: any, mappingOverrides?: MappingConfig) => {
  const rows = await fetchFieldMappings('notion', 'linear');
  const mapping = buildMappingFromRows(rows);
  const mapped = mapNotionToLinear(properties, { ...mapping, ...mappingOverrides });
  const payload: any = {};
  if (mapped.title) payload.title = mapped.title;
  if (mapped.description !== undefined) payload.description = mapped.description;
  if (mapped.state) payload.state = mapped.state;

  return withLinearRateLimit(() => linear.issueUpdate(issueId, payload));
};

export const createLinearIssueFromNotion = async (properties: any, mappingOverrides?: MappingConfig) => {
  if (!LINEAR_TEAM_ID) {
    throw new Error('LINEAR_TEAM_ID is required to create Linear issues');
  }
  const rows = await fetchFieldMappings('notion', 'linear');
  const mapping = buildMappingFromRows(rows);
  const mapped = mapNotionToLinear(properties, { ...mapping, ...mappingOverrides });
  const payload: any = {
    teamId: LINEAR_TEAM_ID,
    title: mapped.title || 'Untitled',
    description: mapped.description || ''
  };
  if (mapped.state) payload.state = mapped.state;
  return withLinearRateLimit(() => linear.issueCreate(payload));
};

export const extractLinearIdFromNotionProperties = async (properties: any, mappingOverrides?: MappingConfig) => {
  const rows = await fetchFieldMappings('notion', 'linear');
  const mapping = buildMappingFromRows(rows);
  const merged = { ...mapping, ...mappingOverrides };
  const linkageField = merged.linkage?.sourceField || 'LinearID';
  const linkageProp = properties?.[linkageField];
  return linkageProp?.rich_text?.[0]?.plain_text || null;
};

export const extractNotionIdFromLinearIssue = async (issue: any, mappingOverrides?: MappingConfig) => {
  const rows = await fetchFieldMappings('linear', 'notion');
  const mapping = buildMappingFromRows(rows);
  const merged = { ...mapping, ...mappingOverrides };
  const linkageField = merged.linkage?.targetField || 'notionId';
  return issue?.[linkageField] || issue?.metadata?.[linkageField] || null;
};

export const getNotionLastEdited = (page: any) => (page?.last_edited_time ? new Date(page.last_edited_time) : null);
export const getLinearUpdatedAt = (issue: any) => (issue?.updatedAt ? new Date(issue.updatedAt) : null);
