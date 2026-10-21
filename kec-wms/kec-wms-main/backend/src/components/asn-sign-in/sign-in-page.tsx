'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Scan, CheckCircle, Package, User } from 'lucide-react'
import { toast } from 'sonner'
import { format } from '@/lib/utils/date-formatter'

interface AsnInfo {
  id: string
  asnNumber: string
  status: string
  client: { clientCode: string; clientName: string }
  warehouse: { warehouseCode: string; warehouseName: string }
  totalExpectedQty: number
  totalExpectedLines: number
  signedAt: string
}

export function SignInPage() {
  const t = useTranslations('asnSignIn')
  const tMenu = useTranslations('menu')
  const tMenuGroup = useTranslations('menuGroup')
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signedList, setSignedList] = useState<AsnInfo[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const asnNumber = inputValue.trim()
    if (!asnNumber) return

    // 检查是否已在列表中
    if (signedList.some(asn => asn.asnNumber === asnNumber)) {
      toast.warning(t('alreadyInList'))
      setInputValue('')
      setTimeout(() => inputRef.current?.focus(), 0)
      return
    }

    setIsLoading(true)
    try {
      // 先查询ASN（精确匹配）
      const searchRes = await fetch(`/api/v1/asn?asnNumber=${encodeURIComponent(asnNumber)}&pageSize=1`)
      const searchData = await searchRes.json()

      if (!searchData.success || !searchData.data?.items?.length) {
        toast.error(t('asnNotFound'))
        setInputValue('')
        setTimeout(() => inputRef.current?.focus(), 0)
        return
      }

      const asn = searchData.data.items[0]

      // 执行签收
      const signRes = await fetch(`/api/v1/asn/${asn.id}/sign-in`, { method: 'POST' })
      const signData = await signRes.json()

      if (signData.success) {
        setSignedList(prev => [signData.data, ...prev])
        toast.success(`${asnNumber} ${t('signInSuccess')}`)
        setInputValue('')
        setTimeout(() => inputRef.current?.focus(), 0)
      } else {
        toast.error(signData.message || t('signInFailed'))
        setInputValue('')
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    } catch {
      toast.error(t('signInFailed'))
      setInputValue('')
      setTimeout(() => inputRef.current?.focus(), 0)
    } finally {
      setIsLoading(false)
    }
  }

  const totalQty = signedList.reduce((sum, asn) => sum + asn.totalExpectedQty, 0)

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: tMenuGroup('inbound'), href: '/asn' },
          { label: tMenu('asnSignIn') },
        ]}
      />

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧扫码区 1/3 */}
        <div className="col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                {t('title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t('scanPlaceholder')}
                  disabled={isLoading}
                  autoComplete="off"
                  className="font-mono text-lg h-12"
                />
                <p className="text-sm text-muted-foreground">{t('scanHint')}</p>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 右侧结果区 2/3 */}
        <div className="col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {t('signedList')} ({signedList.length})
              </CardTitle>
              {signedList.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {t('totalQty')}: {totalQty}
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {signedList.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  {t('noSignedAsn')}
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {signedList.map((asn) => (
                    <div
                      key={asn.id}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-mono font-medium">{asn.asnNumber}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {asn.client.clientName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {asn.totalExpectedQty} / {asn.totalExpectedLines} {t('lines')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(asn.signedAt), 'HH:mm:ss')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
