import { ScheduledTasksPage } from '@/components/scheduled-tasks/scheduled-tasks-page'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function Page() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return <ScheduledTasksPage />
}
