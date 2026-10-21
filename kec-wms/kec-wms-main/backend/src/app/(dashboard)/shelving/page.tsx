import { ShelvingPage } from '@/components/shelving'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function ShelvingPageRoute() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return <ShelvingPage />
}
