'use client'

import { useTranslations } from 'next-intl'
import { EntitySelect } from '@/components/list-filters'
import { useCachedOptions } from '@/lib/hooks/use-cached-options'
import { formatCodeNameLabel } from '@/lib/filters/readable-filter-value'

interface Client {
  id: string
  clientCode: string
  clientName: string
}

interface ClientSelectProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  showAll?: boolean
}

export function ClientSelect({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  showAll = false,
}: ClientSelectProps) {
  const t = useTranslations('client')
  const tCommon = useTranslations('common')
  const { options: clients, loading } = useCachedOptions<Client>({
    cacheKey: 'clients:active:list',
    fetcher: async () => {
      const response = await fetch('/api/v1/clients?pageSize=100&isActive=true')
      const result = await response.json()
      return result.success ? (result.data || []) : []
    },
  })

  return (
    <EntitySelect
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      loading={loading}
      showAll={showAll}
      className={className}
      placeholder={placeholder || t('selectClient')}
      allLabel={tCommon('allClients')}
      searchPlaceholder={t('searchClient')}
      emptyText={t('noClientFound')}
      options={clients.map((client) => ({
        value: client.id,
        label: formatCodeNameLabel(client.clientCode, client.clientName),
        keywords: [client.clientCode, client.clientName],
      }))}
    />
  )
}
