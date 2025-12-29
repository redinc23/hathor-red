import Bottleneck from 'bottleneck';
import { LINEAR_RATE_LIMIT_PER_SEC, NOTION_RATE_LIMIT_PER_SEC } from './config';

const notionLimiter = new Bottleneck({
  minTime: Math.ceil(1000 / NOTION_RATE_LIMIT_PER_SEC),
  reservoir: NOTION_RATE_LIMIT_PER_SEC,
  reservoirRefreshAmount: NOTION_RATE_LIMIT_PER_SEC,
  reservoirRefreshInterval: 1000
});

const linearRateLimit = Math.max(LINEAR_RATE_LIMIT_PER_SEC, 1);
const linearLimiter = new Bottleneck({
  minTime: Math.ceil(1000 / linearRateLimit),
  reservoir: linearRateLimit,
  reservoirRefreshAmount: linearRateLimit,
  reservoirRefreshInterval: 1000
});

export const withNotionRateLimit = <T>(fn: () => Promise<T>) => notionLimiter.schedule(fn);
export const withLinearRateLimit = <T>(fn: () => Promise<T>) => linearLimiter.schedule(fn);
