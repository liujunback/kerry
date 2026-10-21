'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Column {
  key: string
  header: string
}

interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename: string
  columns: Column[]
  disabled?: boolean
}

export function ExportButton({ data, filename, columns, disabled }: ExportButtonProps) {
  const t = useTranslations('reports')
  const [loading, setLoading] = useState(false)

  const exportToExcel = () => {
    setLoading(true)
    try {
      const exportData = data.map((row) => {
        const newRow: Record<string, unknown> = {}
        columns.forEach((col) => {
          newRow[col.header] = row[col.key]
        })
        return newRow
      })

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      XLSX.writeFile(wb, `${filename}.xlsx`)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    setLoading(true)
    try {
      const headers = columns.map((col) => col.header).join(',')
      const rows = data.map((row) =>
        columns.map((col) => {
          const value = row[col.key]
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return value ?? ''
        }).join(',')
      )
      const csv = [headers, ...rows].join('\n')

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${filename}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || loading || data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          {loading ? t('exporting') : t('export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToExcel}>
          {t('exportExcel')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          {t('exportCSV')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
