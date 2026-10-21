import { JOB_TYPES, QUEUE_NAMES } from '@/lib/queue/config'
import { getQueue } from '@/lib/queue/queues'

export async function enqueueInventoryEventPush(
  tenantId: string,
  eventIds: string[]
): Promise<void> {
  const normalizedEventIds = Array.from(new Set(eventIds.filter(Boolean)))
  if (normalizedEventIds.length === 0) {
    return
  }

  const queue = getQueue(QUEUE_NAMES.INVENTORY_EVENT_PUSH)
  await queue.add(JOB_TYPES.INVENTORY_EVENT_PUSH, {
    tenantId,
    userId: 'system',
    eventIds: normalizedEventIds,
  })
}
