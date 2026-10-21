import { ReceivingLandingPage } from '@/components/receiving'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function ReceivingPageRoute() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return <ReceivingLandingPage />
}
