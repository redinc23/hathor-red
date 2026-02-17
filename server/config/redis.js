const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
};

const getRedisClient = () => redisClient;

module.exports = { redisClient, connectRedis, getRedisClient };
