import { Prisma } from '@prisma/client'

/**
 * 递归转换对象中的所有 Decimal 类型为字符串
 * @param obj 要转换的对象
 * @returns 转换后的对象
 */
function convertDecimalsToString(obj: unknown, depth = 0, path = 'root'): unknown {
  if (obj === null || obj === undefined) return obj

  // 如果是原始类型（包括原始字符串），直接返回
  if (typeof obj !== 'object') return obj

  // 如果是 Date 对象，直接返回（不处理，由 timezone 扩展处理）
  if (obj instanceof Date) return obj

  // 检查是否有 Decimal.js 的内部结构 (d, e, s 属性)
  const decimalObj = obj as any
  const hasDecimalStructure =
    decimalObj.d !== undefined &&
    Array.isArray(decimalObj.d) &&
    decimalObj.e !== undefined &&
    typeof decimalObj.e === 'number' &&
    decimalObj.s !== undefined &&
    typeof decimalObj.s === 'number'

  if (hasDecimalStructure) {
    // 使用 Decimal 对象自己的方法来转换
    if (typeof decimalObj.toFixed === 'function') {
      return decimalObj.toFixed()
    } else {
      // 如果没有 toFixed 方法，尝试 toString
      return decimalObj.toString ? decimalObj.toString() : String(decimalObj)
    }
  }

  // 如果是数组，递归处理每个元素
  if (Array.isArray(obj)) {
    return obj.map((item, index) => convertDecimalsToString(item, depth + 1, `${path}[${index}]`))
  }

  // 如果是普通对象，递归处理每个属性
  const converted: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      converted[key] = convertDecimalsToString((obj as Record<string, unknown>)[key], depth + 1, `${path}.${key}`)
    }
  }
  return converted
}

/**
 * Prisma Decimal 扩展
 * 自动将所有查询结果中的 Decimal 字段转换为字符串
 */
export const decimalExtension = Prisma.defineExtension({
  name: 'decimal',
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
          return convertDecimalsToString(result)
        }

        return result
      },
    },
  },
})
