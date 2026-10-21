import { OrderInterceptionsPageContent } from '@/components/orders/order-interceptions-page-content'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

export default async function OrderInterceptionsPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  await requirePermission('order-intercept:read')

  return <OrderInterceptionsPageContent />
}
