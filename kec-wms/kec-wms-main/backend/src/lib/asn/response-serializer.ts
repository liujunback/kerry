type DateLike = Date | string | null | undefined
type WithExpiryDate = { expiryDate?: DateLike }

export function formatAsnDateOnly(value: DateLike): string | null {
  if (!value) return null

  const raw = value instanceof Date ? value.toISOString() : String(value)
  const dateOnly = raw.split('T')[0].split(' ')[0]

  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null
}

export function serializeAsnLine<T extends WithExpiryDate>(line: T): T {
  return {
    ...line,
    expiryDate: formatAsnDateOnly(line.expiryDate),
  } as T
}

export function serializeAsn<T extends object>(asn: T): T {
  const maybeAsn = asn as T & { asnLines?: WithExpiryDate[] | null }

  if (!Array.isArray(maybeAsn.asnLines)) {
    return asn
  }

  return {
    ...asn,
    asnLines: maybeAsn.asnLines.map((line) => serializeAsnLine(line)),
  } as T
}
