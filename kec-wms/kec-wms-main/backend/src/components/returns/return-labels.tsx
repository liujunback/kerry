import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const returnTypeCodes = ['BUYER_RETURN', 'COURIER_RETURN'] as const

export const returnStatusCodes = [
  'PENDING_SIGN',
  'SIGNED',
  'COUNTING',
  'WAIT_DISPOSITION',
  'DISPOSITION_RECEIVED',
  'PENDING_PUTAWAY',
  'PUTAWAYING',
  'COMPLETED',
] as const

export const dispositionCodes = ['GOOD_PUTAWAY', 'DAMAGED_PUTAWAY', 'DESTROY'] as const

export function useReturnLabels() {
  const t = useTranslations('returns')
  const returnTypeLabels = Object.fromEntries(returnTypeCodes.map((code) => [code, t(`types.${code}`)]))
  const returnStatusLabels = Object.fromEntries(returnStatusCodes.map((code) => [code, t(`statuses.${code}`)]))
  const dispositionLabels = Object.fromEntries(dispositionCodes.map((code) => [code, t(`dispositions.${code}`)]))
  const qualityLabels = {
    GOOD: t('quality.GOOD'),
    DAMAGED: t('quality.DAMAGED'),
  }

  return {
    returnTypeLabels,
    returnStatusLabels,
    dispositionLabels,
    qualityLabels,
  }
}

const statusClassName: Record<string, string> = {
  PENDING_SIGN: 'bg-slate-100 text-slate-700',
  SIGNED: 'bg-blue-100 text-blue-700',
  COUNTING: 'bg-amber-100 text-amber-700',
  WAIT_DISPOSITION: 'bg-orange-100 text-orange-700',
  DISPOSITION_RECEIVED: 'bg-cyan-100 text-cyan-700',
  PENDING_PUTAWAY: 'bg-indigo-100 text-indigo-700',
  PUTAWAYING: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

export function ReturnStatusBadge({ status, className }: { status: string; className?: string }) {
  const { returnStatusLabels } = useReturnLabels()

  return (
    <Badge variant="secondary" className={cn(statusClassName[status] || 'bg-slate-100 text-slate-700', className)}>
      {returnStatusLabels[status] || status}
    </Badge>
  )
}

export function ReturnTypeBadge({ type, className }: { type: string; className?: string }) {
  const { returnTypeLabels } = useReturnLabels()

  return (
    <Badge variant="outline" className={cn('border-orange-200 bg-orange-50 text-orange-700', className)}>
      {returnTypeLabels[type] || type}
    </Badge>
  )
}

export function QualityBadge({ quality, className }: { quality?: string | null; className?: string }) {
  const { qualityLabels } = useReturnLabels()

  if (!quality) return <span className="text-muted-foreground">-</span>
  return (
    <Badge
      variant="secondary"
      className={cn(quality === 'DAMAGED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700', className)}
    >
      {quality === 'DAMAGED' ? qualityLabels.DAMAGED : qualityLabels.GOOD}
    </Badge>
  )
}
