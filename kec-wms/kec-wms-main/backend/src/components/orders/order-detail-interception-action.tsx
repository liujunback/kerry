'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ManualOrderInterceptionDialog } from '@/components/orders/manual-order-interception-dialog'
import { usePermissions } from '@/contexts/permission-context'

interface OrderDetailInterceptionActionProps {
  orderNumber: string
  orderStatus: string
}

export function OrderDetailInterceptionAction({
  orderNumber,
  orderStatus,
}: OrderDetailInterceptionActionProps) {
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (!hasPermission('order-intercept:write')) {
    return null
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ShieldAlert className="mr-2 h-4 w-4" />
        人工拦截
      </Button>
      <ManualOrderInterceptionDialog
        open={open}
        onOpenChange={setOpen}
        orderNumber={orderNumber}
        orderStatus={orderStatus}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
