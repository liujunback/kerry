'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Package, Boxes } from 'lucide-react'
import { useShelvingStore } from '@/stores/shelving-store'

export function ContainerInfoCard() {
  const t = useTranslations('shelving')
  const { currentContainer, containerItems, currentLocation } = useShelvingStore()

  if (!currentContainer) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('container.empty')}</p>
        </CardContent>
      </Card>
    )
  }

  const totalQty = containerItems.reduce((sum, item) => sum + item.quantity, 0)
  const skuCount = new Set(containerItems.map(item => item.skuId)).size

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            {t('containerInfo.title')}
          </CardTitle>
          <Badge variant="outline">{currentContainer.containerCode}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 容器信息 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t('containerInfo.type')}:</span>
            <span className="ml-2 font-medium">{currentContainer.containerType}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('containerInfo.status')}:</span>
            <Badge variant="secondary" className="ml-2">
              {currentContainer.workStatus}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">{t('containerInfo.skuCount')}:</span>
            <span className="ml-2 font-medium">{skuCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('containerInfo.totalQty')}:</span>
            <span className="ml-2 font-medium">{totalQty}</span>
          </div>
        </div>

        {/* 当前货位 */}
        {currentLocation && (
          <div className="p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">{t('containerInfo.targetLocation')}:</span>
            <span className="ml-2 font-medium">{currentLocation.locationCode}</span>
            {currentLocation.zoneName && (
              <span className="ml-2 text-sm text-muted-foreground">
                ({currentLocation.zoneName})
              </span>
            )}
          </div>
        )}

        {/* 容器物品列表 */}
        {containerItems.length > 0 && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('containerInfo.table.skuCode')}</TableHead>
                  <TableHead>{t('containerInfo.table.skuName')}</TableHead>
                  <TableHead className="text-right">{t('containerInfo.table.quantity')}</TableHead>
                  <TableHead>{t('containerInfo.table.quality')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containerItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.skuCode}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {item.skuName || '-'}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.qualityStatus === 'GOOD' ? 'default' : 'destructive'}
                      >
                        {item.qualityStatus === 'GOOD' ? t('quality.good') : t('quality.damaged')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
