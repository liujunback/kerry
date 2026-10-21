import { Prisma } from '@prisma/client'
import { formatInTimeZone } from 'date-fns-tz'
import { DEFAULT_TIMEZONE, DATETIME_FORMAT } from '@/lib/config/timezone'

/**
 * 递归转换对象中的所有 Date 类型为配置的时区字符串
 * @param obj 要转换的对象
 * @returns 转换后的对象
 */
function convertDatesToTimezone(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj

  // 如果是 Date 对象，转换为配置的时区字符串
  if (obj instanceof Date) {
    try {
      // 检查日期是否有效
      if (isNaN(obj.getTime())) {
        return null
      }
      const formatted = formatInTimeZone(obj, DEFAULT_TIMEZONE, DATETIME_FORMAT)
      // 确保返回的是原始字符串类型，避免 JSON 序列化问题
      return String(formatted)
    } catch (error) {
      console.error('Failed to format date:', error, obj)
      return null
    }
  }

  // 如果是数组，递归处理每个元素
  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesToTimezone(item))
  }

  // 如果是对象，递归处理每个属性
  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        converted[key] = convertDatesToTimezone((obj as Record<string, unknown>)[key])
      }
    }
    return converted
  }

  // 其他类型直接返回
  return obj
}

/**
 * Prisma 时区扩展
 * 自动将所有查询结果中的 DateTime 字段转换为配置的时区字符串
 */
export const timezoneExtension = Prisma.defineExtension({
  name: 'timezone',
  query: {
    $allModels: {
      async $allOperations({ operation, args, query }) {
        const result = await query(args)

        // 只对查询操作进行转换（不影响写入）
        const readOperations = [
          'findUnique',
          'findUniqueOrThrow',
          'findFirst',
          'findFirstOrThrow',
          'findMany',
          'create',
          'createMany',
          'update',
          'updateMany',
          'upsert',
          'delete',
          'deleteMany',
          'aggregate',
          'groupBy',
          'count',
        ]

        if (readOperations.includes(operation)) {
          return convertDatesToTimezone(result)
        }

        return result
      },
    },
  },
})
