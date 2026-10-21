import { SignInPage } from '@/components/asn-sign-in/sign-in-page'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function AsnSignInPageRoute() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return <SignInPage />
}
