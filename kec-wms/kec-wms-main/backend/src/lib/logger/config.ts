import type { LoggerConfig } from './types'

/**
 * 从环境变量构建日志配置
 * 遵循项目 src/lib/config/timezone.ts 的配置层风格
 */
export function buildLoggerConfig(): LoggerConfig {
  const env = process.env.NODE_ENV || 'development'
  const isDev = env === 'development'

  return {
    default: process.env.LOG_CHANNEL || (isDev ? 'console' : 'stack'),
    level: (process.env.LOG_LEVEL as LoggerConfig['level']) || (isDev ? 'DEBUG' : 'INFO'),
    channels: {
      console: {
        driver: 'console',
        pretty: isDev,
      },
      file: {
        driver: 'file',
        path: process.env.LOG_FILE_PATH || '/app/logs/app.log',
        rotation: 'daily',
        maxFiles: parseInt(process.env.LOG_FILE_MAX_DAYS || '30'),
      },
      gelf: {
        driver: 'gelf',
        host: process.env.GRAYLOG_HOST || 'localhost',
        port: parseInt(process.env.GRAYLOG_PORT || '12201'),
        transport: (process.env.GRAYLOG_TRANSPORT as 'udp' | 'tcp') || 'udp',
        facility: process.env.GRAYLOG_FACILITY || 'kec-wms',
        additionalFields: {
          environment: env,
          app_version: process.env.APP_VERSION || 'unknown',
        },
      },
      'file-error': {
        driver: 'file',
        level: 'ERROR' as LoggerConfig['level'],
        path: process.env.LOG_ERROR_FILE_PATH || '/app/logs/error.log',
        rotation: 'daily',
        maxFiles: parseInt(process.env.LOG_FILE_MAX_DAYS || '30'),
      },
      'file-external-api': {
        driver: 'file',
        path: process.env.LOG_EXTERNAL_API_FILE_PATH || '/app/logs/external-api.log',
        rotation: 'daily',
        maxFiles: parseInt(process.env.LOG_FILE_MAX_DAYS || '30'),
      },
      stack: {
        driver: 'stack',
        channels: process.env.LOG_STACK_CHANNELS?.split(',') || ['file', 'file-error', 'gelf'],
      },
    },
  }
}
