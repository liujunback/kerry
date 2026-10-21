export const API_KEY_WEBHOOK_EVENT_TYPES = [
  'inventory.event.created',
] as const

export type ApiKeyWebhookEventType = (typeof API_KEY_WEBHOOK_EVENT_TYPES)[number]

const webhookEventTypeSet = new Set<string>(API_KEY_WEBHOOK_EVENT_TYPES)

export function normalizeApiKeyWebhookEvents(input: unknown): ApiKeyWebhookEventType[] {
  if (!Array.isArray(input)) {
    return []
  }

  return Array.from(
    new Set(
      input.filter(
        (item): item is ApiKeyWebhookEventType =>
          typeof item === 'string' && webhookEventTypeSet.has(item)
      )
    )
  )
}

export function normalizeOptionalWebhookString(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null
  }

  const value = input.trim()
  return value.length > 0 ? value : null
}
