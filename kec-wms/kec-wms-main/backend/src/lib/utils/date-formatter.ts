import {
  format,
  parse,
  parseISO,
  subDays,
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  startOfYear,
  startOfQuarter,
  startOfHour,
  subMonths,
  formatDistanceToNow
} from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { DEFAULT_TIMEZONE } from '@/lib/config/timezone'

// ============================================================================
// 内部辅助函数
// ============================================================================

// API 返回的时间格式为 "yyyy-MM-dd HH:mm:ss"（已是上海时间），需转为带时区的 ISO 格式再解析
function toDateObj(date: string | Date): Date {
  if (typeof date !== 'string') return date
  // 如果是 "yyyy-MM-dd HH:mm:ss" 格式（无 T、无时区），附加 +08:00
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
    return parseISO(date.replace(' ', 'T') + '+08:00')
  }
  return parseISO(date)
}

// ============================================================================
// 格式化函数（使用全局时区配置）
// ============================================================================

/**
 * 格式化为日期时间（2024-03-06 18:30:45）
 * @param date 日期字符串或 Date 对象
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  try {
    const dateObj = toDateObj(date)
    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) return ''
    return formatInTimeZone(dateObj, DEFAULT_TIMEZONE, 'yyyy-MM-dd HH:mm:ss')
  } catch {
    return ''
  }
}

/**
 * 格式化为日期（2024-03-06）
 * @param date 日期字符串或 Date 对象
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  try {
    const dateObj = toDateObj(date)
    if (isNaN(dateObj.getTime())) return ''
    return formatInTimeZone(dateObj, DEFAULT_TIMEZONE, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

/**
 * 格式化为时间（18:30:45）
 * @param date 日期字符串或 Date 对象
 * @returns 格式化后的时间字符串
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  try {
    const dateObj = toDateObj(date)
    if (isNaN(dateObj.getTime())) return ''
    return formatInTimeZone(dateObj, DEFAULT_TIMEZONE, 'HH:mm:ss')
  } catch {
    return ''
  }
}

/**
 * 使用自定义格式格式化日期时间（配置的时区）
 * @param date 日期字符串或 Date 对象
 * @param formatStr 格式字符串（date-fns 格式）
 * @returns 格式化后的字符串
 */
export function formatInShanghaiTZ(date: string | Date | null | undefined, formatStr: string): string {
  if (!date) return ''
  try {
    const dateObj = toDateObj(date)
    if (isNaN(dateObj.getTime())) return ''
    return formatInTimeZone(dateObj, DEFAULT_TIMEZONE, formatStr)
  } catch {
    return ''
  }
}

// ============================================================================
// 重新导出 date-fns 常用函数（统一入口）
// ============================================================================

/**
 * 减去指定天数
 * @example subDays(new Date(), 7) // 7天前
 */
export { subDays }

/**
 * 增加指定天数
 * @example addDays(new Date(), 7) // 7天后
 */
export { addDays }

/**
 * 增加指定小时数
 * @example addHours(new Date(), 2) // 2小时后
 */
export { addHours }

/**
 * 增加指定分钟数
 * @example addMinutes(new Date(), 30) // 30分钟后
 */
export { addMinutes }

/**
 * 获取一天的开始时间（00:00:00）
 * @example startOfDay(new Date()) // 今天 00:00:00
 */
export { startOfDay }

/**
 * 获取一天的结束时间（23:59:59）
 * @example endOfDay(new Date()) // 今天 23:59:59
 */
export { endOfDay }

/**
 * 判断第一个日期是否在第二个日期之后
 * @example isAfter(new Date(), subDays(new Date(), 1)) // true
 */
export { isAfter }

/**
 * 判断第一个日期是否在第二个日期之前
 * @example isBefore(subDays(new Date(), 1), new Date()) // true
 */
export { isBefore }

/**
 * 计算两个日期之间的天数差
 * @example differenceInDays(new Date(), subDays(new Date(), 7)) // 7
 */
export { differenceInDays }

/**
 * 解析 ISO 格式的日期字符串
 * @example parseISO('2024-03-06T18:30:45+08:00')
 */
export { parseISO }

/**
 * 解析日期字符串（需要指定格式）
 * @example parse('2024-03-06 18:30:45', 'yyyy-MM-dd HH:mm:ss', new Date())
 */
export { parse }

/**
 * 格式化日期（推荐使用 formatDateTime, formatDate 等封装函数）
 * @example format(new Date(), 'yyyy-MM-dd')
 */
export { format }

/**
 * 使用 date-fns 的 format 函数（不推荐直接使用，建议使用上面的格式化函数）
 * @deprecated 请使用 formatDateTime, formatDate, formatTime 或 formatInShanghaiTZ
 */
export { format as dateFnsFormat }

/**
 * 格式化相对时间（例如：3天前）
 * @example formatDistanceToNow(subDays(new Date(), 3), { addSuffix: true }) // "3 days ago"
 */
export { formatDistanceToNow }

/**
 * 获取月份的开始时间
 * @example startOfMonth(new Date()) // 本月第一天 00:00:00
 */
export { startOfMonth }

/**
 * 获取月份的结束时间
 * @example endOfMonth(new Date()) // 本月最后一天 23:59:59
 */
export { endOfMonth }

/**
 * 获取周的开始时间
 * @example startOfWeek(new Date()) // 本周第一天 00:00:00
 */
export { startOfWeek }

/**
 * 获取年份的开始时间
 * @example startOfYear(new Date()) // 今年第一天 00:00:00
 */
export { startOfYear }

/**
 * 获取季度的开始时间
 * @example startOfQuarter(new Date()) // 本季度第一天 00:00:00
 */
export { startOfQuarter }

/**
 * 获取小时的开始时间
 * @example startOfHour(new Date()) // 当前小时 xx:00:00
 */
export { startOfHour }

/**
 * 减去指定月数
 * @example subMonths(new Date(), 3) // 3个月前
 */
export { subMonths }
