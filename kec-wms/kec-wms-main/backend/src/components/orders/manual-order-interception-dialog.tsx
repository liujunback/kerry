'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ManualOrderInterceptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
  orderStatus: string
  onSuccess?: () => void
}

export function ManualOrderInterceptionDialog({
  open,
  onOpenChange,
  orderNumber,
  orderStatus,
  onSuccess,
}: ManualOrderInterceptionDialogProps) {
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setRemark('')
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!remark.trim()) {
      toast.error('请输入拦截备注')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/v1/order-interceptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber,
          remark: remark.trim(),
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        toast.error(result.message || '订单拦截失败')
        return
      }

      toast.success(result.message || '订单拦截成功')
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error('订单拦截失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>人工拦截订单</DialogTitle>
          <DialogDescription>
            当前订单号：{orderNumber}
            <br />
            当前订单状态：{orderStatus}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-order-interception-remark">拦截备注</Label>
            <Textarea
              id="manual-order-interception-remark"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="请输入拦截备注"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '确认拦截'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
