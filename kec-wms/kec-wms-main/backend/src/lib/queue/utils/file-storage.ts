/**
 * 文件存储工具
 */

import * as fs from 'fs'
import * as path from 'path'
import { QUEUE_CONFIG } from '../config'

export class FileStorage {
  private basePath: string

  constructor() {
    this.basePath = QUEUE_CONFIG.fileStorage.basePath
    this.ensureDirectory(this.basePath)
  }

  /**
   * 保存文件
   */
  async saveFile(
    tenantId: string,
    jobId: string,
    fileName: string,
    content: Buffer
  ): Promise<string> {
    const dirPath = path.join(this.basePath, tenantId, jobId)
    this.ensureDirectory(dirPath)

    const filePath = path.join(dirPath, fileName)
    await fs.promises.writeFile(filePath, content)

    return filePath
  }

  /**
   * 读取文件
   */
  async readFile(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath)
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath)
    } catch {
      // 忽略删除错误
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(
    filePath: string
  ): Promise<{ size: number; createdAt: Date } | null> {
    try {
      const stats = await fs.promises.stat(filePath)
      return {
        size: stats.size,
        createdAt: stats.birthtime,
      }
    } catch {
      return null
    }
  }

  /**
   * 清理过期文件
   */
  async cleanupExpiredFiles(): Promise<number> {
    const maxAge = QUEUE_CONFIG.fileStorage.maxFileAge
    const now = Date.now()
    let deletedCount = 0

    const tenantDirs = await fs.promises.readdir(this.basePath)

    for (const tenantDir of tenantDirs) {
      const tenantPath = path.join(this.basePath, tenantDir)
      const stat = await fs.promises.stat(tenantPath)

      if (!stat.isDirectory()) continue

      const jobDirs = await fs.promises.readdir(tenantPath)

      for (const jobDir of jobDirs) {
        const jobPath = path.join(tenantPath, jobDir)
        const jobStat = await fs.promises.stat(jobPath)

        if (!jobStat.isDirectory()) continue

        // 检查目录是否过期
        if (now - jobStat.mtimeMs > maxAge) {
          await this.deleteDirectory(jobPath)
          deletedCount++
        }
      }
    }

    return deletedCount
  }

  /**
   * 确保目录存在
   */
  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true })
      } catch (error) {
        // 如果是权限错误，提供更清晰的错误信息
        if ((error as NodeJS.ErrnoException).code === 'EACCES') {
          throw new Error(
            `无法创建目录 ${dirPath}：权限被拒绝。请确保应用有写入权限，或在 Dockerfile 中预先创建此目录。`
          )
        }
        throw error
      }
    }
  }

  /**
   * 删除目录及其内容
   */
  private async deleteDirectory(dirPath: string): Promise<void> {
    await fs.promises.rm(dirPath, { recursive: true, force: true })
  }
}
