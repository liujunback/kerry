import { prisma } from '@/lib/db/prisma'
import { asnStateMachine } from '@/lib/services/asn-state-machine'

export class AsnSignInServiceError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface SignInAsnParams {
  tenantId: string
  userId: string
  userName?: string
  asnId?: string
  asnNumber?: string
}

export async function signInAsn(params: SignInAsnParams) {
  const { tenantId, userId, userName, asnId, asnNumber } = params

  if (!asnId && !asnNumber) {
    throw new AsnSignInServiceError(400, 'ASN_IDENTIFIER_REQUIRED', 'ASN标识不能为空')
  }

  const existingAsn = await prisma.asn.findFirst({
    where: {
      tenantId,
      ...(asnId ? { id: asnId } : { asnNumber }),
    },
  })

  if (!existingAsn) {
    throw new AsnSignInServiceError(404, 'ASN_NOT_FOUND', 'ASN不存在')
  }

  if (existingAsn.signedAt) {
    throw new AsnSignInServiceError(400, 'ASN_ALREADY_SIGNED', 'ASN已签收')
  }

  const now = new Date()

  await asnStateMachine.transition(
    existingAsn.id,
    'SIGN_IN',
    {
      tenantId,
      userId,
      userName,
    },
    {
      signedAt: now,
      signedBy: userId,
      actualArrivalAt: existingAsn.actualArrivalAt ? undefined : now,
    },
  )

  const asn = await prisma.asn.findUnique({
    where: { id: existingAsn.id },
    include: {
      client: {
        select: {
          id: true,
          clientCode: true,
          clientName: true,
        },
      },
      warehouse: {
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
        },
      },
    },
  })

  if (!asn) {
    throw new AsnSignInServiceError(500, 'ASN_SIGN_IN_RESULT_NOT_FOUND', '签收后的ASN不存在')
  }

  return asn
}
