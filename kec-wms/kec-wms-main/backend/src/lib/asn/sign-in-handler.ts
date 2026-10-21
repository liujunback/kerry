import { requireAuth } from '@/lib/auth/middleware'
import { AsnSignInServiceError, signInAsn } from '@/lib/services/asn-sign-in-service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export interface AsnSignInRouteParams {
  params: Promise<{ id: string }>
}

const signInSchema = z.object({
  asnNumber: z.string().min(1, 'ASN单号不能为空'),
})

export async function postAsnSignInById(
  request: NextRequest,
  { params }: AsnSignInRouteParams
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user } = authResult
    const { id } = await params

    const asn = await signInAsn({
      tenantId: user.tenantId,
      userId: user.id,
      userName: user.username,
      asnId: id,
    })

    return NextResponse.json({
      success: true,
      data: asn,
      message: 'ASN签收成功',
    })
  } catch (error) {
    if (error instanceof AsnSignInServiceError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.status }
      )
    }

    console.error('ASN sign-in failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'ASN签收失败',
      },
      { status: 500 }
    )
  }
}

export async function postAsnSignInByNumber(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const body = await request.json()
    const validation = signInSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0]?.message || '参数错误',
        },
        { status: 400 }
      )
    }

    const { user } = authResult
    const asn = await signInAsn({
      tenantId: user.tenantId,
      userId: user.id,
      userName: user.username,
      asnNumber: validation.data.asnNumber.trim(),
    })

    return NextResponse.json({
      success: true,
      message: 'ASN签收成功',
      data: asn,
    })
  } catch (error) {
    if (error instanceof AsnSignInServiceError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.status }
      )
    }

    console.error('PDA ASN sign-in failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'ASN签收失败',
      },
      { status: 500 }
    )
  }
}
