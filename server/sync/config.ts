import { SyncSystem } from './types';

export const MAX_RETRIES = 5;
export const INITIAL_BACKOFF_MS = 1000;
export const MAX_BACKOFF_MS = 60000;
export const BACKOFF_MULTIPLIER = 2;

export const NOTION_RATE_LIMIT_PER_SEC = 3;
export const LINEAR_RATE_LIMIT_PER_SEC = Number(process.env.LINEAR_RATE_LIMIT || 10);

export const REDIS_BULL_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined
};

export const NOTION_WEBHOOK_SECRET = process.env.NOTION_WEBHOOK_SECRET || '';
export const LINEAR_WEBHOOK_SECRET = process.env.LINEAR_WEBHOOK_SECRET || '';
export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '';
export const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID || '';

export const SOURCE_SYSTEMS: SyncSystem[] = ['notion', 'linear'];
