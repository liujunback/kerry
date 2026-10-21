import { prismaRead } from '@/lib/db/prisma'
import { getRedisClient } from '@/lib/db/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  }

  try {
    await prismaRead.$queryRaw`SELECT 1`
    health.services.database = 'healthy'
  } catch {
    health.services.database = 'unhealthy'
    health.status = 'degraded'
  }

  try {
    const redis = getRedisClient()
    await redis.ping()
    health.services.redis = 'healthy'
  } catch {
    health.services.redis = 'unhealthy'
    health.status = 'degraded'
  }

  const statusCode = health.status === 'healthy' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
