# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN npm install

RUN npm run db:generate

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run db:generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl curl netcat-openbsd

# 安装 PM2
RUN npm install -g pm2

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 创建日志目录和存储目录
RUN mkdir -p /app/logs /app/storage/jobs && chown -R nextjs:nodejs /app/logs /app/storage/jobs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制 Worker 源码（用于审计日志等后台任务）
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/queue ./src/lib/queue
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db ./src/lib/db
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/services ./src/lib/services
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/logger ./src/lib/logger
COPY --from=builder --chown=nextjs:nodejs /app/src/middleware ./src/middleware

# 复制 PM2 配置文件
COPY --chown=nextjs:nodejs ecosystem.config.js ./

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["pm2-runtime", "ecosystem.config.js"]
