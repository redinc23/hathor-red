import Bottleneck from 'bottleneck';
import { LINEAR_RATE_LIMIT_PER_SEC, NOTION_RATE_LIMIT_PER_SEC } from './config';

const notionLimiter = new Bottleneck({
  minTime: Math.ceil(1000 / NOTION_RATE_LIMIT_PER_SEC),
  reservoir: NOTION_RATE_LIMIT_PER_SEC,
  reservoirRefreshAmount: NOTION_RATE_LIMIT_PER_SEC,
  reservoirRefreshInterval: 1000
});

const linearLimiter = new Bottleneck({
  minTime: Math.ceil(1000 / Math.max(LINEAR_RATE_LIMIT_PER_SEC, 1)),
  reservoir: Math.max(LINEAR_RATE_LIMIT_PER_SEC, 1),
  reservoirRefreshAmount: Math.max(LINEAR_RATE_LIMIT_PER_SEC, 1),
  reservoirRefreshInterval: 1000
});

export const withNotionRateLimit = <T>(fn: () => Promise<T>) => notionLimiter.schedule(fn);
export const withLinearRateLimit = <T>(fn: () => Promise<T>) => linearLimiter.schedule(fn);
