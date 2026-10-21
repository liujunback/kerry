import type { TransactionClient } from '@/lib/db/prisma'

export type AsnStatusAfterReceivingComplete = 'RECEIVED' | 'PUTTING_AWAY' | 'COMPLETED'

export async function resolveAsnStatusAfterReceivingComplete(
  tx: TransactionClient,
  asnId: string
): Promise<AsnStatusAfterReceivingComplete> {
  const asn = await tx.asn.findUnique({
    where: { id: asnId },
    select: {
      totalReceivedQty: true,
      totalPutawayQty: true,
      putawayStartAt: true,
    },
  })

  if (!asn) {
    throw new Error('ASN不存在')
  }

  const putawayOrderCount = await tx.putawayOrder.count({
    where: { asnId },
  })

  const incompletePutawayOrderCount = await tx.putawayOrder.count({
    where: {
      asnId,
      status: { not: 'COMPLETED' },
    },
  })

  const hasPutawayProgress =
    putawayOrderCount > 0 ||
    asn.totalPutawayQty > 0 ||
    asn.putawayStartAt !== null

  const isPutawayCompleted =
    asn.totalReceivedQty > 0 &&
    asn.totalPutawayQty >= asn.totalReceivedQty &&
    putawayOrderCount > 0 &&
    incompletePutawayOrderCount === 0

  if (isPutawayCompleted) {
    return 'COMPLETED'
  }

  if (hasPutawayProgress) {
    return 'PUTTING_AWAY'
  }

  return 'RECEIVED'
}
