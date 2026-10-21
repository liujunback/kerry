'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Package, Box, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PendingLinesFilter } from './pending-lines-filter'
import { PendingLinesTable, PendingLine } from './pending-lines-table'
import { PendingContainersFilter } from './pending-containers-filter'
import { PendingContainersTable, PendingContainer } from './pending-containers-table'
import { CreatePutawayOrderDialog } from './create-putaway-order-dialog'

export function CreatePutawayPage() {
  const t = useTranslations('putaway')
  const tCommon = useTranslations('common')
  const [activeTab, setActiveTab] = useState('sku')

  // SKU 收货 Tab 状态
  const [lines, setLines] = useState<PendingLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [lineFilters, setLineFilters] = useState({
    search: '',
    asnNumber: '',
  })
  const [linesPagination, setLinesPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [selectedLines, setSelectedLines] = useState<PendingLine[]>([])

  // 容器收货 Tab 状态
  const [containers, setContainers] = useState<PendingContainer[]>([])
  const [containersLoading, setContainersLoading] = useState(false)
  const [containerFilters, setContainerFilters] = useState({
    search: '',
    asnNumber: '',
  })
  const [containersPagination, setContainersPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [selectedContainerItems, setSelectedContainerItems] = useState<PendingContainer[]>([])

  // 创建上架单对话框
  const [dialogOpen, setDialogOpen] = useState(false)

  // 获取待上架 ASN Line
  const fetchLines = useCallback(async () => {
    setLinesLoading(true)
    try {
      const params = new URLSearchParams({
        page: linesPagination.page.toString(),
        pageSize: linesPagination.pageSize.toString(),
        receivingMethod: 'SKU',
      })
      if (lineFilters.search) params.set('search', lineFilters.search)
      if (lineFilters.asnNumber) params.set('asnNumber', lineFilters.asnNumber)

      const response = await fetch(`/api/v1/putaway/pending-lines?${params}`)
      const result = await response.json()

      if (result.success) {
        setLines(result.data)
        setLinesPagination((prev) => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        }))
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(t('fetchPendingLinesFailed'))
    } finally {
      setLinesLoading(false)
    }
  }, [lineFilters, linesPagination.page, linesPagination.pageSize, t, tCommon])

  // 获取待上架容器
  const fetchContainers = useCallback(async () => {
    setContainersLoading(true)
    try {
      const params = new URLSearchParams({
        page: containersPagination.page.toString(),
        pageSize: containersPagination.pageSize.toString(),
        receivingMethod: 'CONTAINER',
      })
      if (containerFilters.search) params.set('search', containerFilters.search)
      if (containerFilters.asnNumber) params.set('asnNumber', containerFilters.asnNumber)

      const response = await fetch(`/api/v1/putaway/pending-containers?${params}`)
      const result = await response.json()

      if (result.success) {
        setContainers(result.data)
        setContainersPagination((prev) => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        }))
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(t('fetchPendingContainersFailed'))
    } finally {
      setContainersLoading(false)
    }
  }, [containerFilters, containersPagination.page, containersPagination.pageSize, t, tCommon])

  // 初始加载和筛选变化时重新获取数据
  useEffect(() => {
    if (activeTab === 'sku') {
      fetchLines()
    }
  }, [activeTab, fetchLines])

  useEffect(() => {
    if (activeTab === 'container') {
      fetchContainers()
    }
  }, [activeTab, fetchContainers])

  // 处理筛选变化
  const handleLineFilterChange = (key: string, value: string) => {
    setLineFilters((prev) => ({ ...prev, [key]: value }))
    setLinesPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleContainerFilterChange = (key: string, value: string) => {
    setContainerFilters((prev) => ({ ...prev, [key]: value }))
    setContainersPagination((prev) => ({ ...prev, page: 1 }))
  }

  // 重置筛选
  const resetLineFilters = () => {
    setLineFilters({ search: '', asnNumber: '' })
    setLinesPagination((prev) => ({ ...prev, page: 1 }))
  }

  const resetContainerFilters = () => {
    setContainerFilters({ search: '', asnNumber: '' })
    setContainersPagination((prev) => ({ ...prev, page: 1 }))
  }

  // 创建上架单
  const handleCreateOrder = () => {
    if (activeTab === 'sku' && selectedLines.length === 0) {
      toast.error(t('selectAtLeastOneLine'))
      return
    }
    if (activeTab === 'container' && selectedContainerItems.length === 0) {
      toast.error(t('selectAtLeastOneContainer'))
      return
    }
    setDialogOpen(true)
  }

  // 创建成功后刷新数据
  const handleCreateSuccess = useCallback(() => {
    setSelectedLines([])
    setSelectedContainerItems([])
    if (activeTab === 'sku') {
      fetchLines()
    } else if (activeTab === 'container') {
      fetchContainers()
    }
  }, [activeTab, fetchLines, fetchContainers])

  return (
    <div className="flex flex-col h-full gap-2">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="sku" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('skuReceiving')}
            {selectedLines.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {selectedLines.length}
              </span>
            )}
          </TabsTrigger>
            <TabsTrigger value="container" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            {t('containerReceiving')}
            {selectedContainerItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {selectedContainerItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sku" className="flex flex-col flex-1 min-h-0 gap-2 mt-2">
          <PendingLinesFilter
            key={`sku-${lineFilters.search}-${lineFilters.asnNumber}`}
            filters={lineFilters}
            onFilterChange={handleLineFilterChange}
            onReset={resetLineFilters}
          />
          <div className="flex items-center gap-4 rounded-lg bg-muted p-3 flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              {tCommon('selectedCount', { count: selectedLines.length })}
            </span>
            <Button size="sm" onClick={handleCreateOrder} disabled={selectedLines.length === 0}>
              <Package className="h-3.5 w-3.5 mr-1" />
              {t('createPutawayOrder')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedLines([])}
              disabled={selectedLines.length === 0}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {tCommon('cancel')}
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <PendingLinesTable
              lines={lines}
              selectedLines={selectedLines}
              onSelectionChange={setSelectedLines}
              isLoading={linesLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="container" className="flex flex-col flex-1 min-h-0 gap-2 mt-2">
          <PendingContainersFilter
            key={`container-${containerFilters.search}-${containerFilters.asnNumber}`}
            filters={containerFilters}
            onFilterChange={handleContainerFilterChange}
            onReset={resetContainerFilters}
          />
          <div className="flex items-center gap-4 rounded-lg bg-muted p-3 flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              {tCommon('selectedCount', { count: selectedContainerItems.length })}
            </span>
            <Button size="sm" onClick={handleCreateOrder} disabled={selectedContainerItems.length === 0}>
              <Package className="h-3.5 w-3.5 mr-1" />
              {t('createPutawayOrder')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedContainerItems([])}
              disabled={selectedContainerItems.length === 0}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {tCommon('cancel')}
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <PendingContainersTable
              containers={containers}
              selectedContainers={selectedContainerItems}
              onSelectionChange={setSelectedContainerItems}
              isLoading={containersLoading}
            />
          </div>
        </TabsContent>
      </Tabs>

      <CreatePutawayOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedLines={selectedLines}
        selectedContainerItems={selectedContainerItems}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
