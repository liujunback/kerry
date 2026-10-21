/**
 * 从 URLSearchParams 中提取参数，将 null 转换为 undefined
 * 这样 Zod 的 .default() 和 .optional() 才能正常工作
 */
export function extractQueryParams(
  searchParams: URLSearchParams,
  keys: string[]
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const key of keys) {
    result[key] = searchParams.get(key) || undefined
  }
  return result
}
