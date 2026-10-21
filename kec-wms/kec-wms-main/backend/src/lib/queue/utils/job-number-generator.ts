/**
 * 任务编号生成器
 */

import { randomInt } from 'crypto'

/**
 * 生成任务编号
 * 格式: JOB + 年月日 + 时分秒毫秒 + 4位随机数
 * 例如: JOB202402051430159991234
 *
 * 旧实现依赖「按天 count + 全租户分布式锁」来避免冲突，
 * 在高并发异步入队时会把所有任务创建串行化，容易导致部分订单根本没入队。
 * 这里改为时间戳 + 随机数，保留可读性，同时移除对串行锁的依赖。
 */
export async function generateJobNumber(tenantId: string): Promise<string> {
  void tenantId

  const date = new Date()
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const timePart = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}${String(date.getMilliseconds()).padStart(3, '0')}`
  const randomPart = String(randomInt(0, 10000)).padStart(4, '0')

  return `JOB${datePart}${timePart}${randomPart}`
}
