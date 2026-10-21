'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface OrderAddress {
  id: string
  shippingName: string | null
  shippingPhone: string | null
  shippingEmail: string | null
  shippingCompany: string | null
  shippingLine1: string | null
  shippingLine2: string | null
  shippingCity: string | null
  shippingProvince: string | null
  shippingPostalCode: string | null
  shippingCountry: string | null
  shippingCountryName: string | null
}

interface OrderAddressInfoProps {
  orderId: string
}

export function OrderAddressInfo({ orderId }: OrderAddressInfoProps) {
  const [address, setAddress] = useState<OrderAddress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAddress()
  }, [orderId])

  const fetchAddress = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/outbound-orders/${orderId}`)
      const data = await res.json()
      if (data.success) {
        setAddress(data.data.outbound_order_address || null)
      }
    } catch (error) {
      console.error('Failed to fetch address:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!address) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        暂无收件人信息
      </div>
    )
  }

  return (
    <div className="rounded-md border p-6">
      <div className="grid grid-cols-4 gap-6">
        <div>
          <p className="text-sm text-muted-foreground">国家</p>
          <p className="font-medium">{address.shippingCountryName || address.shippingCountry || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">州/省</p>
          <p className="font-medium">{address.shippingProvince || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">城市</p>
          <p className="font-medium">{address.shippingCity || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">邮编</p>
          <p className="font-medium">{address.shippingPostalCode || '-'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-muted-foreground">地址行1</p>
          <p className="font-medium">{address.shippingLine1 || '-'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-muted-foreground">地址行2</p>
          <p className="font-medium">{address.shippingLine2 || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">联系人</p>
          <p className="font-medium">{address.shippingName || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">电话</p>
          <p className="font-medium">{address.shippingPhone || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">邮箱</p>
          <p className="font-medium">{address.shippingEmail || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">公司</p>
          <p className="font-medium">{address.shippingCompany || '-'}</p>
        </div>
      </div>
    </div>
  )
}
