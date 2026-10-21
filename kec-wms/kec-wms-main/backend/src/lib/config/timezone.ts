/**
 * 全局时区配置
 * 系统统一使用的时区设置
 */

/**
 * 默认时区：Asia/Shanghai (UTC+8)
 * 可通过环境变量 TZ 覆盖
 */
export const DEFAULT_TIMEZONE = process.env.TZ || 'Asia/Shanghai'

/**
 * 默认日期时间格式
 */
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss'

/**
 * 默认日期格式
 */
export const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * 默认时间格式
 */
export const TIME_FORMAT = 'HH:mm:ss'
