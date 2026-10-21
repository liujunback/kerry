import { BasePrinter } from './base'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 虚拟打印机 - 用于开发和测试环境
 * 不实际打印，而是将 PDF 保存到本地目录
 */
export class VirtualPrinter extends BasePrinter {
  private readonly outputDir: string

  constructor() {
    super()
    // 输出目录：print-agent/virtual-prints/
    this.outputDir = path.join(process.cwd(), 'virtual-prints')
    this.ensureOutputDir()
  }

  /**
   * 确保输出目录存在
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
      console.log(`[虚拟打印机] 创建输出目录: ${this.outputDir}`)
    }
  }

  /**
   * 模拟打印 - 将 PDF 保存到本地
   */
  async print(pdfBuffer: Buffer, copies: number): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `print_${timestamp}.pdf`
    const filepath = path.join(this.outputDir, filename)

    // 保存 PDF 文件
    fs.writeFileSync(filepath, pdfBuffer)

    console.log(`[虚拟打印机] 打印成功`)
    console.log(`  - 文件: ${filename}`)
    console.log(`  - 份数: ${copies}`)
    console.log(`  - 大小: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
    console.log(`  - 路径: ${filepath}`)

    // 模拟打印延迟
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * 测试连接 - 虚拟打印机始终在线
   */
  async testConnection(): Promise<number> {
    console.log('[虚拟打印机] 连接测试成功')
    // 模拟 1ms 延迟
    return 1
  }
}
