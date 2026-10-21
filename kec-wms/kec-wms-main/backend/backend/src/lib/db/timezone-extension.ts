import { Prisma } from '@prisma/client'
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'Asia/Shanghai'
const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss'

/**
 * 递归转换对象中的所有 Date 类型为 Asia/Shanghai 时区字符串
 * @param obj 要转换的对象
 * @returns 转换后的对象
 */
function convertDatesToTimezone(obj: any): any {
  if (obj === null || obj === undefined) return obj

  // 如果是 Date 对象，转换为 Asia/Shanghai 时区字符串
  if (obj instanceof Date) {
    return formatInTimeZone(obj, TIMEZONE, DATETIME_FORMAT)
  }

  // 如果是数组，递归处理每个元素
  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesToTimezone(item))
  }

  // 如果是对象，递归处理每个属性
  if (typeof obj === 'object') {
    const converted: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        converted[key] = convertDatesToTimezone(obj[key])
      }
    }
    return converted
  }

  // 其他类型直接返回
  return obj
}

/**
 * Prisma 时区扩展
 * 自动将所有查询结果中的 DateTime 字段转换为 Asia/Shanghai 时区字符串
 */
export const timezoneExtension = Prisma.defineExtension({
  name: 'timezone',
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
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
