'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { QrCode, RefreshCw, Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PdaLoginQrcodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    username: string
    fullName: string
  }
}

interface TokenData {
  token: string
  expiresAt: string
  qrCodeData: string
  qrCodeImage: string
  user: {
    id: string
    username: string
    fullName: string
  }
}

export function PdaLoginQrcodeDialog({
  open,
  onOpenChange,
  user,
}: PdaLoginQrcodeDialogProps) {
  const t = useTranslations('users')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [expired, setExpired] = useState(false)
  const [printingPdf, setPrintingPdf] = useState(false)

  const getRemainingSeconds = (expiresAt: string) => {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  }

  // 生成令牌
  const generateToken = useCallback(async () => {
    setLoading(true)
    setExpired(false)

    try {
      const response = await fetch(`/api/v1/users/${user.id}/pda-login-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (result.success) {
        setTokenData(result.data)
        setRemainingSeconds(getRemainingSeconds(result.data.expiresAt))
      } else {
        toast.error(result.message || tCommon('error'))
        onOpenChange(false)
      }
    } catch {
      toast.error(tCommon('error'))
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [user.id, tCommon, onOpenChange])

  // 打开对话框时生成令牌
  useEffect(() => {
    if (open && !tokenData && !loading) {
      generateToken()
    }
  }, [open, tokenData, loading, generateToken])

  // 关闭对话框时清理状态
  useEffect(() => {
    if (!open) {
      setTokenData(null)
      setRemainingSeconds(0)
      setExpired(false)
    }
  }, [open])

  const handlePrintPdf = useCallback(async () => {
    if (!tokenData || expired) return

    setPrintingPdf(true)
    try {
      const response = await fetch(`/api/v1/users/${user.id}/pda-login-token/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeData: tokenData.qrCodeData,
          expiresAt: tokenData.expiresAt,
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.message || t('pdaQrcodeDialog.printFailed'))
      }

      const pdfBlob = await response.blob()
      const printResult = await printPdfWithAgentFallback({
        pdfBlob,
        jobIdPrefix: 'pda-login-qrcode',
        scenarioType: 'PDA_LOGIN_QR',
        relatedIds: [user.id],
        relatedType: 'PDA_LOGIN_QR',
        pageCount: 1,
      })

      if (printResult.mode === 'agent') {
        toast.success(t('pdaQrcodeDialog.printSent'))
      } else {
        toast.warning(t('pdaQrcodeDialog.printFallback'))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('pdaQrcodeDialog.printFailed')
      toast.error(message)
    } finally {
      setPrintingPdf(false)
    }
  }, [expired, t, tokenData, user.id])

  // 倒计时
  useEffect(() => {
    if (!open || !tokenData || remainingSeconds <= 0) {
      return
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open, tokenData, remainingSeconds])

  // 格式化剩余时间
  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (days > 0) {
      return t('pdaQrcodeDialog.remainingDays', { days, hours, minutes: mins })
    }

    if (hours > 0) {
      return t('pdaQrcodeDialog.remainingHours', { hours, minutes: mins, seconds: secs })
    }

    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t('pdaQrcodeDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('pdaQrcodeDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* 用户信息 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t('pdaQrcodeDialog.user')}
            </p>
            <p className="font-medium">
              {user.fullName} ({user.username})
            </p>
          </div>

          {/* 二维码区域 */}
          <div className="relative w-64 h-64 flex items-center justify-center border rounded-lg bg-white">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t('pdaQrcodeDialog.generating')}
                </p>
              </div>
            ) : expired ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-destructive font-medium">
                  {t('pdaQrcodeDialog.expired')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateToken}
                  className="gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('pdaQrcodeDialog.regenerate')}
                </Button>
              </div>
            ) : tokenData ? (
              <Image
                src={tokenData.qrCodeImage}
                alt="PDA Login QR Code"
                fill
                unoptimized
                className="object-contain p-2"
              />
            ) : null}
          </div>

          {/* 倒计时 */}
          {!loading && !expired && tokenData && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t('pdaQrcodeDialog.validFor')}
              </p>
              <p
                className={`${remainingSeconds >= 3600 ? 'text-xl' : 'text-2xl'} font-mono font-bold ${
                  remainingSeconds <= 60 ? 'text-destructive' : 'text-primary'
                }`}
              >
                {formatTime(remainingSeconds)}
              </p>
            </div>
          )}

          {/* 扫码提示 */}
          {!loading && !expired && tokenData && (
            <p className="text-sm text-muted-foreground text-center">
              {t('pdaQrcodeDialog.scanToLogin')}
            </p>
          )}

          {!loading && !expired && tokenData && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={printingPdf}
              onClick={handlePrintPdf}
            >
              {printingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {printingPdf ? t('pdaQrcodeDialog.printingPdf') : t('pdaQrcodeDialog.printPdf')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
