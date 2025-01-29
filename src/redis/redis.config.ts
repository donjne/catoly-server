import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS);

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connection established');
  console.log(
    `📍 Connected to Redis at ${redis.options.host}:${redis.options.port}`,
  );
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.log('🔒 Redis connection closed');
});

redis.on('reconnecting', (times) => {
  console.log(`🔄 Redis reconnecting... Attempt ${times}`);
});

redis.on('end', () => {
  console.log('🛑 Redis connection ended');
});
