import redisConfig from '../config/redis';

const { redisClient } = redisConfig;

const OPERATION_PREFIX = 'sync:operation:';
const OPERATION_TTL_SECONDS = 60 * 60 * 24;

export const claimOperation = async (operationId: string): Promise<boolean> => {
  if (!operationId) return true;
  const key = `${OPERATION_PREFIX}${operationId}`;
  const exists = await redisClient.exists(key);
  if (exists) {
    return false;
  }
  await redisClient.set(key, '1', {
    EX: OPERATION_TTL_SECONDS,
    NX: true
  });
  return true;
};
