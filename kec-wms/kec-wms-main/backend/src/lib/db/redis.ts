import Redis from 'ioredis'

let redis: Redis | null = null

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL

    if (!redisUrl) {
      // 如果没有配置 Redis URL，使用默认配置
      redis = new Redis({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true,
      })
    } else {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true,
      })
    }
  }

  return redis
}

export { getRedisClient }
export default { get: () => getRedisClient() }
