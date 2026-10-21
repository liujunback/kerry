/**
 * 报表导出 Worker
 */

import { Job } from 'bullmq'
import { prismaRead, prisma } from '@/lib/db/prisma'
import { BaseWorker } from './base-worker'
import { JobContext, ReportExportJobData, ReportExportResult } from '../types'
import { FileStorage } from '../utils/file-storage'
import * as XLSX from 'xlsx'

export class ReportExportWorker extends BaseWorker<
  ReportExportJobData,
  ReportExportResult
> {
  private fileStorage = new FileStorage()

  protected async process(
    job: Job<ReportExportJobData, ReportExportResult>,
    context: JobContext
  ): Promise<ReportExportResult> {
    const { reportType, filters, format, columns } = job.data

    // 更新进度
    await this.updateProgress(context.jobId, {
      progress: 10,
      message: '正在获取数据...',
    })

    // 获取报表数据
    const data = await this.fetchReportData(
      reportType,
      context.tenantId,
      filters
    )

    await this.updateProgress(context.jobId, {
      progress: 50,
      message: `正在处理 ${data.length} 条记录...`,
      totalCount: data.length,
    })

    // 生成文件
    const fileName = this.generateFileName(reportType, format)
    const fileBuffer = this.generateFile(data, format, columns)

    await this.updateProgress(context.jobId, {
      progress: 80,
      message: '正在保存文件...',
    })

    // 保存文件
    const filePath = await this.fileStorage.saveFile(
      context.tenantId,
      context.jobId,
      fileName,
      fileBuffer
    )

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7天过期

    // 更新任务文件信息
    await prisma.backgroundJob.update({
      where: { id: context.jobId },
      data: {
        resultFilePath: filePath,
        resultFileName: fileName,
        resultFileSize: fileBuffer.length,
        resultExpiresAt: expiresAt,
      },
    })

    return {
      filePath,
      fileName,
      fileSize: fileBuffer.length,
      rowCount: data.length,
      expiresAt,
    }
  }

  /**
   * 获取报表数据
   */
  private async fetchReportData(
    reportType: string,
    tenantId: string,
    filters: Record<string, unknown>
  ): Promise<unknown[]> {
    const where = { tenantId, ...filters }

    switch (reportType) {
      case 'INVENTORY':
        return prismaRead.inventorySnapshot.findMany({
          where,
          include: {
            warehouse: { select: { warehouseCode: true, warehouseName: true } },
            zone: { select: { zoneCode: true, zoneName: true } },
            location: { select: { locationCode: true } },
          },
        })

      case 'TRANSACTIONS':
        return prismaRead.inventoryEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        })

      case 'ORDERS':
        return prismaRead.outboundOrder.findMany({
          where,
          include: { lines: true },
        })

      case 'ASN':
        return prismaRead.asn.findMany({
          where,
          include: { asnLines: true },
        })

      case 'SHIPMENTS':
        return prismaRead.shipment.findMany({
          where,
          include: { order: true },
        })

      case 'SKU':
        return prismaRead.sku.findMany({
          where,
          include: {
            client: { select: { clientCode: true, clientName: true } },
            category: { select: { categoryName: true } },
          },
        })

      case 'CLIENT':
        return prismaRead.client.findMany({
          where,
        })

      default:
        throw new Error(`未知的报表类型: ${reportType}`)
    }
  }

  /**
   * 生成文件名
   */
  private generateFileName(reportType: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `${reportType.toLowerCase()}_export_${timestamp}.${format}`
  }

  /**
   * 生成文件
   */
  private generateFile(
    data: unknown[],
    format: string,
    columns?: string[]
  ): Buffer {
    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(data as object[])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
      return Buffer.from(
        XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      )
    } else {
      // CSV 格式
      const worksheet = XLSX.utils.json_to_sheet(data as object[])
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      return Buffer.from(csv, 'utf-8')
    }
  }
}
