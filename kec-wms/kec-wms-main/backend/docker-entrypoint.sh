#!/bin/sh
set -e

echo "Starting KEC-WMS Application..."

# Use local prisma from node_modules
PRISMA_CMD="node /app/node_modules/prisma/build/index.js"

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if nc -z ${DB_HOST:-mysql} ${DB_PORT:-3306} 2>/dev/null; then
    echo "MySQL is ready!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for MySQL... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Error: MySQL did not become ready in time"
  exit 1
fi

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379} 2>/dev/null; then
    echo "Redis is ready!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for Redis... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Error: Redis did not become ready in time"
  exit 1
fi

# Run database migrations if enabled
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  $PRISMA_CMD migrate deploy
  echo "Migrations completed!"
fi

echo "Starting Next.js server with PM2..."
exec "$@"
