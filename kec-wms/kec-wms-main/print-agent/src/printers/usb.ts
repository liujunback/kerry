import { execFile } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { print as printPdf } from 'pdf-to-printer'
import { BasePrinter } from './base'

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function execFilePromise(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { encoding: 'utf8' }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr?.trim() || stdout?.trim() || err.message))
        return
      }
      resolve()
    })
  })
}

function getBundledSumatraPath(): string | undefined {
  if (process.pkg) {
    const exeDirPath = path.join(path.dirname(process.execPath), 'SumatraPDF-3.4.6-32.exe')
    return fs.existsSync(exeDirPath) ? exeDirPath : undefined
  }

  try {
    return require.resolve('pdf-to-printer/dist/SumatraPDF-3.4.6-32.exe')
  } catch {
    return undefined
  }
}

// USB 打印机：通过系统打印队列发送 PDF；printerName 为空时使用系统默认打印机。
export class UsbPrinter extends BasePrinter {
  constructor(private readonly printerName?: string) {
    super()
  }

  async print(pdfBuffer: Buffer, copies: number): Promise<void> {
    const tmpFile = path.join(os.tmpdir(), `print_${Date.now()}.pdf`)
    fs.writeFileSync(tmpFile, pdfBuffer)

    try {
      for (let i = 0; i < copies; i++) {
        await this.sendToSystemPrinter(tmpFile)
      }
    } finally {
      fs.unlinkSync(tmpFile)
    }
  }

  private sendToSystemPrinter(filePath: string): Promise<void> {
    const isWindows = os.platform() === 'win32'

    if (isWindows) {
      return printPdf(filePath, {
        printer: this.printerName,
        copies: 1,
        scale: 'fit',
        silent: true,
        sumatraPdfPath: getBundledSumatraPath(),
      })
    }

    const args = this.printerName ? ['-d', this.printerName, filePath] : [filePath]
    return execFilePromise('lp', args)
  }

  async testConnection(): Promise<number> {
    if (!this.printerName) {
      // 未指定队列名时只能验证本地打印命令路径，实际设备由系统默认打印机决定。
      return 0
    }

    const start = Date.now()

    if (os.platform() === 'win32') {
      await execFilePromise('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `$printerName = ${psQuote(this.printerName)}; $printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue; if (-not $printer) { Write-Error '找不到打印机队列'; exit 1 }; $escaped = [Regex]::Escape($printerName); $device = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { ($_.Class -in @('Printer', 'PrintQueue', 'USB')) -and (($_.FriendlyName -match $escaped) -or ($_.InstanceId -match $escaped) -or ($_.InstanceId -match 'USBPRINT')) } | Select-Object -First 1; if (-not $device) { Write-Error '未检测到已连接的 USB 打印机设备'; exit 1 }`,
      ])
      return Date.now() - start
    }

    await execFilePromise('lpstat', ['-p', this.printerName])
    return Date.now() - start
  }
}
