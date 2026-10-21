import { ContainerReceivingPage } from '@/components/receiving'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function ContainerReceivingPageRoute() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return <ContainerReceivingPage />
}
