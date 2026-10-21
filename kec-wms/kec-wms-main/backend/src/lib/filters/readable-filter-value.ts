export interface IdOption {
  id: string
}

export function formatCodeNameLabel(code?: string | null, name?: string | null) {
  if (code && name) {
    return `${code} - ${name}`
  }

  return code || name || ''
}

export function resolveReadableOptionLabel<T extends IdOption>(
  value: string,
  options: T[],
  formatter: (option: T) => string,
  fallbackValue = value
) {
  const option = options.find((item) => item.id === value)
  if (!option) return fallbackValue

  const label = formatter(option)
  return label || fallbackValue
}
