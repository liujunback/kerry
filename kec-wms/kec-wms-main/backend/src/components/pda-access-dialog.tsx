'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Download, Loader2, Printer, QrCode, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PdaAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    username: string
    fullName: string
  }
}

interface DownloadQrData {
  downloadUrl: string
  qrCodeImage: string
}

interface LoginTokenData {
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

export function PdaAccessDialog({
  open,
  onOpenChange,
  user,
}: PdaAccessDialogProps) {
  const t = useTranslations('users')
  const tCommon = useTranslations('common')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadData, setDownloadData] = useState<DownloadQrData | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginData, setLoginData] = useState<LoginTokenData | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [expired, setExpired] = useState(false)
  const [printingPdf, setPrintingPdf] = useState(false)

  const getRemainingSeconds = (expiresAt: string) => {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  }

  const loadDownloadQr = useCallback(async () => {
    setDownloadLoading(true)

    try {
      const response = await fetch('/api/v1/pda/download-link')
      const result = await response.json()

      if (result.success) {
        setDownloadData(result.data)
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setDownloadLoading(false)
    }
  }, [tCommon])

  const generateLoginToken = useCallback(async () => {
    setLoginLoading(true)
    setExpired(false)

    try {
      const response = await fetch(`/api/v1/users/${user.id}/pda-login-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()

      if (result.success) {
        setLoginData(result.data)
        setRemainingSeconds(getRemainingSeconds(result.data.expiresAt))
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoginLoading(false)
    }
  }, [tCommon, user.id])

  useEffect(() => {
    if (open && !downloadData && !downloadLoading) {
      loadDownloadQr()
    }

    if (open && !loginData && !loginLoading) {
      generateLoginToken()
    }
  }, [open, downloadData, downloadLoading, loginData, loginLoading, loadDownloadQr, generateLoginToken])

  useEffect(() => {
    if (!open) {
      setDownloadData(null)
      setLoginData(null)
      setRemainingSeconds(0)
      setExpired(false)
    }
  }, [open])

  const printLoginQrPdf = useCallback(async () => {
    if (!loginData || expired) return

    setPrintingPdf(true)
    try {
      const response = await fetch(`/api/v1/users/${user.id}/pda-login-token/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeData: loginData.qrCodeData,
          expiresAt: loginData.expiresAt,
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
  }, [expired, loginData, t, user.id])

  useEffect(() => {
    if (!open || !loginData || remainingSeconds <= 0) {
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
  }, [open, loginData, remainingSeconds])

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
      <DialogContent className="sm:max-w-[920px]">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t('pdaQrcodeDialog.accessTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('pdaQrcodeDialog.accessDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid items-stretch gap-4 py-4 md:grid-cols-2">
          <section className="flex min-h-[516px] flex-col rounded-xl border bg-muted/20 p-4">
            <div className="mb-4 min-h-[64px] space-y-1">
              <div className="flex items-center gap-2 text-base font-semibold">
                <Download className="h-4 w-4" />
                {t('pdaQrcodeDialog.downloadTitle')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('pdaQrcodeDialog.downloadDescription')}
              </p>
            </div>

            <div className="flex flex-1 flex-col items-center gap-4">
              <div className="relative flex h-64 w-64 items-center justify-center rounded-lg border bg-white">
                {downloadLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {t('pdaQrcodeDialog.generating')}
                    </p>
                  </div>
                ) : downloadData ? (
                  <Image
                    src={downloadData.qrCodeImage}
                    alt="PDA Download QR Code"
                    fill
                    unoptimized
                    className="object-contain p-2"
                  />
                ) : (
                  <p className="px-6 text-center text-sm text-muted-foreground">
                    {t('pdaQrcodeDialog.downloadUnavailable')}
                  </p>
                )}
              </div>

              {downloadData && (
                <>
                  <Button asChild className="gap-2">
                    <a href={downloadData.downloadUrl} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4" />
                      {t('pdaQrcodeDialog.openDownloadLink')}
                    </a>
                  </Button>
                  <div className="w-full rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
                    <div className="mb-1 font-medium text-foreground">
                      {t('pdaQrcodeDialog.publicDownloadLink')}
                    </div>
                    <a
                      href={downloadData.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-primary underline-offset-2 hover:underline"
                    >
                      {downloadData.downloadUrl}
                    </a>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="flex min-h-[516px] flex-col rounded-xl border bg-muted/20 p-4">
            <div className="mb-4 min-h-[64px] space-y-1">
              <div className="flex items-center gap-2 text-base font-semibold">
                <QrCode className="h-4 w-4" />
                {t('pdaQrcodeDialog.loginTitle')}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('pdaQrcodeDialog.loginDescription')}
              </p>
            </div>

            <div className="flex flex-1 flex-col items-center gap-4">
              <div className="relative flex h-64 w-64 items-center justify-center rounded-lg border bg-white">
                {loginLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {t('pdaQrcodeDialog.generating')}
                    </p>
                  </div>
                ) : expired ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-destructive">
                      {t('pdaQrcodeDialog.expired')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateLoginToken}
                      className="gap-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('pdaQrcodeDialog.regenerate')}
                    </Button>
                  </div>
                ) : loginData ? (
                  <Image
                    src={loginData.qrCodeImage}
                    alt="PDA Login QR Code"
                    fill
                    unoptimized
                    className="object-contain p-2"
                  />
                ) : null}
              </div>

              {!loginLoading && !expired && loginData && (
                <>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('pdaQrcodeDialog.user')}
                    </p>
                    <p className="font-medium">
                      {user.fullName} ({user.username})
                    </p>
                  </div>
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
                  <p className="text-center text-sm text-muted-foreground">
                    {t('pdaQrcodeDialog.scanToLogin')}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={printingPdf}
                    onClick={printLoginQrPdf}
                  >
                    {printingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    {printingPdf ? t('pdaQrcodeDialog.printingPdf') : t('pdaQrcodeDialog.printPdf')}
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
