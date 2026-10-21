/**
 * 发货面单存储服务
 * 处理面单的URL验证和Base64图片转文件存储
 */

import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

export class ShippingLabelStorage {
  private basePath: string

  constructor() {
    this.basePath = path.join(process.cwd(), 'public', 'uploads', 'shipping-labels')
  }

  /**
   * 保存base64图片为文件
   * @param tenantId 租户ID
   * @param orderId 订单ID
   * @param base64Data Base64编码的图片数据（支持data:image/png;base64,前缀或纯base64）
   * @returns 文件的公开访问URL和类型
   */
  async saveBase64Image(
    tenantId: string,
    orderId: string,
    base64Data: string
  ): Promise<{ url: string; type: 'FILE' }> {
    // 解析base64数据（支持 data:image/png;base64,xxx 或纯base64）
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
    const imageData = matches ? matches[2] : base64Data
    const extension = matches ? matches[1] : 'png'

    // 验证是否为有效的base64
    if (!this.isValidBase64(imageData)) {
      throw new Error('无效的Base64数据')
    }

    // 创建目录结构：tenantId/orderId/
    const dirPath = path.join(this.basePath, tenantId, orderId)
    await fs.promises.mkdir(dirPath, { recursive: true })

    // 生成唯一文件名
    const filename = `label-${Date.now()}-${uuidv4()}.${extension}`
    const filePath = path.join(dirPath, filename)

    // 保存文件
    const buffer = Buffer.from(imageData, 'base64')

    // 验证文件大小（限制10MB）
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('面单文件大小超过10MB限制')
    }

    await fs.promises.writeFile(filePath, buffer)

    // 返回公开访问URL（相对路径）
    const publicUrl = `/uploads/shipping-labels/${tenantId}/${orderId}/${filename}`
    return { url: publicUrl, type: 'FILE' }
  }

  /**
   * 验证URL格式
   * @param url URL字符串
   * @returns 是否为有效的URL
   */
  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      // 只允许http和https协议
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * 验证是否为有效的Base64字符串
   * @param str 待验证的字符串
   * @returns 是否为有效的Base64
   */
  private isValidBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str
    } catch {
      return false
    }
  }

  /**
   * 删除面单文件
   * @param url 面单URL（相对路径）
   */
  async deleteFile(url: string): Promise<void> {
    try {
      // 从相对URL转换为绝对路径
      const relativePath = url.replace(/^\/uploads\/shipping-labels\//, '')
      const filePath = path.join(this.basePath, relativePath)

      // 检查文件是否存在
      if (await this.fileExists(filePath)) {
        await fs.promises.unlink(filePath)
      }
    } catch (error) {
      console.error('删除面单文件失败:', error)
      // 不抛出错误，静默失败
    }
  }

  /**
   * 检查文件是否存在
   * @param filePath 文件路径
   * @returns 文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath)
      return true
    } catch {
      return false
    }
  }
}

// 导出单例
export const shippingLabelStorage = new ShippingLabelStorage()

