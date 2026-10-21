/**
 * 数据上传 Worker (ASN/订单/SKU)
 */

import { Job } from 'bullmq'
import { prisma } from '@/lib/db/prisma'
import { BaseWorker } from './base-worker'
import { JobContext, DataUploadJobData, DataUploadResult } from '../types'
import { DATA_UPLOAD_SUB_TYPES } from '../config'
import { updateBucketsInTransaction } from '@/lib/services/inventory-bucket-service'
import { BucketType, createAdjustEvent } from '@/lib/services/inventory-event-service'

export class DataUploadWorker extends BaseWorker<
  DataUploadJobData,
  DataUploadResult
> {
  protected async process(
    job: Job<DataUploadJobData, DataUploadResult>,
    context: JobContext
  ): Promise<DataUploadResult> {
    const { subType, warehouseId, clientId, records } = job.data
    const results: DataUploadResult = {
      totalRecords: records.length,
      successCount: 0,
      failedCount: 0,
      createdIds: [],
      errors: [],
    }

    await this.updateProgress(context.jobId, {
      progress: 0,
      message: `开始上传 ${subType} 数据...`,
      totalCount: records.length,
      processedCount: 0,
    })

    // 根据子类型处理不同的上传逻辑
    switch (subType) {
      case DATA_UPLOAD_SUB_TYPES.ASN:
        await this.processAsnUpload(
          records,
          context,
          warehouseId,
          clientId,
          results
        )
        break
      case DATA_UPLOAD_SUB_TYPES.ORDER:
        await this.processOrderUpload(
          records,
          context,
          warehouseId,
          clientId,
          results
        )
        break
      case DATA_UPLOAD_SUB_TYPES.SKU:
        await this.processSkuUpload(records, context, clientId, results)
        break
      case DATA_UPLOAD_SUB_TYPES.INVENTORY:
        await this.processInventoryUpload(
          records,
          context,
          warehouseId,
          clientId,
          results
        )
        break
      case DATA_UPLOAD_SUB_TYPES.LOCATION:
        await this.processLocationUpload(
          records,
          context,
          warehouseId,
          results
        )
        break
      case DATA_UPLOAD_SUB_TYPES.SUPPLIER:
        await this.processSupplierUpload(records, context, results)
        break
      case DATA_UPLOAD_SUB_TYPES.CARRIER:
        await this.processCarrierUpload(records, context, results)
        break
      default:
        throw new Error(`未知的上传子类型: ${subType}`)
    }

    return results
  }

  /**
   * 处理 ASN 上传
   */
  private async processAsnUpload(
    records: unknown[],
    context: JobContext,
    warehouseId: string,
    clientId: string,
    results: DataUploadResult
  ): Promise<void> {
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as {
        externalNumber?: string
        asnType?: string
        supplierName?: string
        expectedArrivalDate?: string
        lines: Array<{
          skuCode: string
          expectedQty: number
          batchNumber?: string
          expiryDate?: string
        }>
      }

      try {
        // 生成 ASN 编号
        const asnNumber = await this.generateAsnNumber(context.tenantId)

        // 创建 ASN
        const asn = await prisma.asn.create({
          data: {
            tenantId: context.tenantId,
            warehouseId,
            clientId,
            asnNumber,
            externalNumber: record.externalNumber,
            asnType: record.asnType || 'NORMAL',
            expectedArrivalDate: record.expectedArrivalDate
              ? new Date(record.expectedArrivalDate)
              : null,
            status: 'CREATED',
            config: {},
            createdBy: context.userId,
          },
        })

        // 创建 ASN 行项目
        if (record.lines && record.lines.length > 0) {
          let lineNumber = 1
          for (const line of record.lines) {
            // 查找 SKU
            const sku = await prisma.sku.findFirst({
              where: {
                tenantId: context.tenantId,
                clientId,
                skuCode: line.skuCode,
              },
            })

            if (sku) {
              await prisma.asnLine.create({
                data: {
                  tenantId: context.tenantId,
                  asnId: asn.id,
                  lineNumber: lineNumber++,
                  skuId: sku.id,
                  skuCode: sku.skuCode,
                  expectedQty: line.expectedQty,
                  batchNumber: line.batchNumber,
                  expiryDate: line.expiryDate
                    ? new Date(line.expiryDate)
                    : null,
                  createdBy: context.userId,
                },
              })
            }
          }
        }

        results.successCount++
        results.createdIds.push(asn.id)
      } catch (error) {
        results.failedCount++
        results.errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误',
        })
      }

      // 更新进度
      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / records.length) * 100),
        message: `正在处理 ASN ${i + 1}/${records.length}`,
        processedCount: i + 1,
        successCount: results.successCount,
        failedCount: results.failedCount,
      })
    }
  }

  /**
   * 处理订单上传
   */
  private async processOrderUpload(
    records: unknown[],
    context: JobContext,
    warehouseId: string,
    clientId: string,
    results: DataUploadResult
  ): Promise<void> {
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as {
        externalNumber?: string
        orderType?: string
        consigneeName?: string
        consigneePhone?: string
        consigneeAddress?: string
        lines: Array<{
          skuCode: string
          orderedQty: number
        }>
      }

      try {
        // 生成订单编号
        const orderNumber = await this.generateOrderNumber(context.tenantId)

        // 先创建地址记录
        let outboundAddressId: string | null = null
        if (record.consigneeName || record.consigneeAddress) {
          const address = await prisma.orderAddress.create({
            data: {
              tenantId: context.tenantId,
              shippingName: record.consigneeName || '',
              shippingPhone: record.consigneePhone || null,
              shippingLine1: record.consigneeAddress || '',
            },
          })
          outboundAddressId = address.id
        }

        // 创建订单
        const order = await prisma.outboundOrder.create({
          data: {
            tenantId: context.tenantId,
            warehouseId,
            clientId,
            orderNumber,
            referenceNumber: record.externalNumber,
            orderType: record.orderType || 'SINGLE_ITEM_SINGLE',
            outbound_address_id: outboundAddressId,
            status: 'CREATED',
            config: {},
            createdBy: context.userId,
          },
        })

        // 创建订单行项目
        if (record.lines && record.lines.length > 0) {
          let lineNumber = 1
          for (const line of record.lines) {
            const sku = await prisma.sku.findFirst({
              where: {
                tenantId: context.tenantId,
                clientId,
                skuCode: line.skuCode,
              },
            })

            if (sku) {
              await prisma.outboundOrderLine.create({
                data: {
                  tenantId: context.tenantId,
                  orderId: order.id,
                  lineNumber: lineNumber++,
                  skuId: sku.id,
                  skuCode: sku.skuCode,
                  orderedQty: line.orderedQty,
                  createdBy: context.userId,
                },
              })
            }
          }
        }

        results.successCount++
        results.createdIds.push(order.id)
      } catch (error) {
        results.failedCount++
        results.errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误',
        })
      }

      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / records.length) * 100),
        message: `正在处理订单 ${i + 1}/${records.length}`,
        processedCount: i + 1,
        successCount: results.successCount,
        failedCount: results.failedCount,
      })
    }
  }

  /**
   * 处理 SKU 上传
   */
  private async processSkuUpload(
    records: unknown[],
    context: JobContext,
    clientId: string,
    results: DataUploadResult
  ): Promise<void> {
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as {
        skuCode: string
        skuName: string
        description?: string
        categoryId?: string
        baseUom?: string
        length?: number
        width?: number
        height?: number
        weight?: number
      }

      try {
        // 检查 SKU 是否已存在
        const existingSku = await prisma.sku.findFirst({
          where: {
            tenantId: context.tenantId,
            clientId,
            skuCode: record.skuCode,
          },
        })

        if (existingSku) {
          // 更新现有 SKU
          await prisma.sku.update({
            where: { id: existingSku.id },
            data: {
              skuName: record.skuName,
              categoryId: record.categoryId,
              unit: record.baseUom || 'PCS',
              lengthCm: record.length,
              widthCm: record.width,
              heightCm: record.height,
              weightKg: record.weight,
              updatedBy: context.userId,
            },
          })
          results.createdIds.push(existingSku.id)
        } else {
          // 创建新 SKU
          const sku = await prisma.sku.create({
            data: {
              tenantId: context.tenantId,
              clientId,
              skuCode: record.skuCode,
              skuName: record.skuName,
              categoryId: record.categoryId,
              unit: record.baseUom || 'PCS',
              lengthCm: record.length,
              widthCm: record.width,
              heightCm: record.height,
              weightKg: record.weight,
              status: 'ACTIVE',
              config: {},
              createdBy: context.userId,
            },
          })
          results.createdIds.push(sku.id)
        }

        results.successCount++
      } catch (error) {
        results.failedCount++
        results.errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误',
        })
      }

      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / records.length) * 100),
        message: `正在处理 SKU ${i + 1}/${records.length}`,
        processedCount: i + 1,
        successCount: results.successCount,
        failedCount: results.failedCount,
      })
    }
  }

  /**
   * 生成 ASN 编号
   */
  private async generateAsnNumber(tenantId: string): Promise<string> {
    const date = new Date()
    const prefix = `ASN${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const count = await prisma.asn.count({
      where: {
        tenantId,
        asnNumber: { startsWith: prefix },
      },
    })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }

  /**
   * 生成订单编号
   */
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const date = new Date()
    const prefix = `ORD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const count = await prisma.outboundOrder.count({
      where: {
        tenantId,
        orderNumber: { startsWith: prefix },
      },
    })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }

  /**
   * 处理库存上传
   */
  private async processInventoryUpload(
    records: unknown[],
    context: JobContext,
    warehouseId: string,
    clientId: string,
    results: DataUploadResult
  ): Promise<void> {
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as {
        locationCode: string
        skuCode: string
        quantity: number
        batchNumber?: string
        expiryDate?: string
      }

      try {
        // 查找货位
        const location = await prisma.binLocation.findFirst({
          where: {
            tenantId: context.tenantId,
            warehouseId,
            locationCode: record.locationCode,
          },
        })

        if (!location) {
          throw new Error(`货位不存在: ${record.locationCode}`)
        }

        // 查找 SKU
        const sku = await prisma.sku.findFirst({
          where: {
            tenantId: context.tenantId,
            clientId,
            skuCode: record.skuCode,
          },
        })

        if (!sku) {
          throw new Error(`SKU不存在: ${record.skuCode}`)
        }

        if (!Number.isFinite(record.quantity) || record.quantity < 0) {
          throw new Error(`库存数量无效: ${record.quantity}`)
        }

        const batchNumber = record.batchNumber || ''
        const expiryDate = record.expiryDate ? new Date(record.expiryDate) : null
        if (record.expiryDate && isNaN(expiryDate!.getTime())) {
          throw new Error(`效期格式无效: ${record.expiryDate}`)
        }

        // 库存上传是初始化/修正场景，按导入的绝对数量计算 delta 后仍走统一库存桶入口。
        const existingBucket = await prisma.inventoryBucket.findFirst({
          where: {
            tenantId: context.tenantId,
            warehouseId,
            locationId: location.id,
            skuId: sku.id,
            batchNumber,
            lpn: '',
            asnNumber: '',
            expiryDate,
            bucketType: BucketType.AVAILABLE,
          },
          select: {
            id: true,
            quantity: true,
          },
        })

        const quantityDelta = record.quantity - (existingBucket?.quantity || 0)
        if (quantityDelta === 0 && existingBucket) {
          results.createdIds.push(existingBucket.id)
        } else {
          await createAdjustEvent({
            tenantId: context.tenantId,
            clientId,
            warehouseId,
            locationId: location.id,
            skuId: sku.id,
            skuCode: sku.skuCode,
            batchNumber,
            lpn: '',
            asnNumber: '',
            bucketType: BucketType.AVAILABLE,
            quantityDelta,
            reasonCode: 'DATA_UPLOAD_INVENTORY',
            reasonDescription: '库存导入初始化/修正',
            expiryDate,
            fifoDate: new Date(),
            operatorId: context.userId,
            metadata: {
              source: 'DATA_UPLOAD',
              uploadedQuantity: record.quantity,
              previousQuantity: existingBucket?.quantity || 0,
            },
          })

          const [bucket] = await updateBucketsInTransaction([
            {
              tenantId: context.tenantId,
              warehouseId,
              clientId,
              zoneId: location.zoneId,
              locationId: location.id,
              skuId: sku.id,
              skuCode: sku.skuCode,
              batchNumber,
              lpn: '',
              asnNumber: '',
              expiryDate,
              bucketType: BucketType.AVAILABLE,
              quantityDelta,
              fifoDate: new Date(),
            },
          ])
          results.createdIds.push(bucket.id)
        }

        results.successCount++
      } catch (error) {
        results.failedCount++
        results.errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误',
        })
      }

      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / records.length) * 100),
        message: `正在处理库存 ${i + 1}/${records.length}`,
        processedCount: i + 1,
        successCount: results.successCount,
        failedCount: results.failedCount,
      })
    }
  }

  /**
   * 处理货位上传
   */
  private async processLocationUpload(
    records: unknown[],
    context: JobContext,
    warehouseId: string,
    results: DataUploadResult
  ): Promise<void> {
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as {
        locationCode: string
        zoneCode: string
        locationType?: string
        aisle?: string
        rack?: string
        shelf?: string
        bin?: string
        isPickable?: boolean
        isReceivable?: boolean
      }

      try {
        // 查找区域
        const zone = await prisma.zone.findFirst({
          where: {
            tenantId: context.tenantId,
            warehouseId,
            zoneCode: record.zoneCode,
          },
        })

        if (!zone) {
          throw new Error(`区域不存在: ${record.zoneCode}`)
        }

        // 检查货位是否已存在
        const existingLocation = await prisma.binLocation.findFirst({
          where: {
            tenantId: context.tenantId,
            warehouseId,
            locationCode: record.locationCode,
          },
        })

        if (existingLocation) {
          // 更新现有货位
          await prisma.binLocation.update({
            where: { id: existingLocation.id },
            data: {
              zoneId: zone.id,
              locationType: record.locationType || 'STORAGE',
              aisle: record.aisle,
              rack: record.rack,
              shelf: record.shelf,
              bin: record.bin,
              isPickable: record.isPickable ?? true,
              isReceivable: record.isReceivable ?? true,
            },
          })
          results.createdIds.push(existingLocation.id)
        } else {
          // 创建新货位
          const location = await prisma.binLocation.create({
            data: {
              tenantId: context.tenantId,
              warehouseId,
              zoneId: zone.id,
              locationCode: record.locationCode,
              locationType: record.locationType || 'STORAGE',
              aisle: record.aisle,
              rack: record.rack,
              shelf: record.shelf,
              bin: record.bin,
              isPickable: record.isPickable ?? true,
              isReceivable: record.isReceivable ?? true,
              status: 'ACTIVE',
            },
          })
          results.createdIds.push(location.id)
        }

        results.successCount++
      } catch (error) {
        results.failedCount++
        results.errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误',
        })
      }

      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / records.length) * 100),
        message: `正在处理货位 ${i + 1}/${records.length}`,
        processedCount: i + 1,
        successCount: results.successCount,
        failedCount: results.failedCount,
      })
    }
  }

  /**
   * 处理供应商上传
   * 注意：供应商模型尚未在数据库中定义，此功能暂不可用
   */
  private async processSupplierUpload(
    records: unknown[],
    context: JobContext,
    results: DataUploadResult
  ): Promise<void> {
    // 供应商模型尚未定义，标记所有记录为失败
    for (let i = 0; i < records.length; i++) {
      results.failedCount++
      results.errors.push({
        index: i,
        error: '供应商上传功能暂未实现，请联系管理员',
      })

      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / records.length) * 100),
        message: `正在处理供应商 ${i + 1}/${records.length}`,
        processedCount: i + 1,
        successCount: results.successCount,
        failedCount: results.failedCount,
      })
    }
  }

  /**
   * 处理承运商上传
   * 注意：承运商模型尚未在数据库中定义，此功能暂不可用
   */
  private async processCarrierUpload(
    records: unknown[],
    context: JobContext,
    results: DataUploadResult
  ): Promise<void> {
    // 承运商模型尚未定义，标记所有记录为失败
    for (let i = 0; i < records.length; i++) {
      results.failedCount++
      results.errors.push({
        index: i,
        error: '承运商上传功能暂未实现，请联系管理员',
      })

      await this.updateProgress(context.jobId, {
        progress: Math.round(((i + 1) / records.length) * 100),
        message: `正在处理承运商 ${i + 1}/${records.length}`,
        processedCount: i + 1,
        successCount: results.successCount,
        failedCount: results.failedCount,
      })
    }
  }
}
