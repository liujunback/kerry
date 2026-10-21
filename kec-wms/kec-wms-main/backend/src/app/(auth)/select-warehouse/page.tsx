import { redirect } from 'next/navigation'
import { SelectWarehouseForm } from '@/components/auth/select-warehouse-form'
import { auth } from '@/lib/auth/config'
import { listUserWarehouseBindings } from '@/lib/auth/user-warehouse'

export default async function SelectWarehousePage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const warehouseBindings = await listUserWarehouseBindings(
    session.user.tenantId,
    session.user.id
  )

  if (warehouseBindings.length <= 1) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-10">
      <SelectWarehouseForm
        tenantId={session.user.tenantId}
        userId={session.user.id}
        username={session.user.username}
        warehouses={warehouseBindings}
      />
    </div>
  )
}
