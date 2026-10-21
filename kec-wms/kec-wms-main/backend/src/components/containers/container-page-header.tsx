'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateContainerDialog } from './create-container-dialog'
import { BatchCreateContainerDialog } from './batch-create-container-dialog'

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
}

interface ContainerPageHeaderProps {
  warehouses: Warehouse[]
}

export function ContainerPageHeader({ warehouses }: ContainerPageHeaderProps) {
  const router = useRouter()
  const t = useTranslations('containers')

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [batchCreateDialogOpen, setBatchCreateDialogOpen] = useState(false)

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('create')}
        </Button>
        <Button variant="outline" onClick={() => setBatchCreateDialogOpen(true)}>
          <Copy className="h-4 w-4 mr-2" />
          {t('batchCreate')}
        </Button>
      </div>

      <CreateContainerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSuccess}
        warehouses={warehouses}
      />

      <BatchCreateContainerDialog
        open={batchCreateDialogOpen}
        onOpenChange={setBatchCreateDialogOpen}
        onSuccess={handleSuccess}
        warehouses={warehouses}
      />
    </>
  )
}
