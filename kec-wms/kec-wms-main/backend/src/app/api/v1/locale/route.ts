import { isLocale } from '@/i18n/config'
import { resolveLocale } from '@/i18n/request'
import { createHandler } from '@/lib/api/create-handler'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const POST = createHandler(async (request) => {
  try {
    const { locale } = await request.json()

    if (typeof locale !== 'string' || !isLocale(locale)) {
      return NextResponse.json(
        { success: false, message: 'Invalid locale' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    cookieStore.set('locale', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })

    return NextResponse.json({ success: true, locale })
  } catch (error) {
    console.error('Set locale error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to set locale' },
      { status: 500 }
    )
  }
})

export const GET = createHandler(async () => {
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get('locale')?.value)

  return NextResponse.json({ success: true, locale })
})
