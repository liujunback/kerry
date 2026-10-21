"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsbPrinter = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const pdf_to_printer_1 = require("pdf-to-printer");
const base_1 = require("./base");
function psQuote(value) {
    return `'${value.replace(/'/g, "''")}'`;
}
function execFilePromise(file, args) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(file, args, { encoding: 'utf8' }, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(stderr?.trim() || stdout?.trim() || err.message));
                return;
            }
            resolve();
        });
    });
}
function getBundledSumatraPath() {
    if (process.pkg) {
        const exeDirPath = path.join(path.dirname(process.execPath), 'SumatraPDF-3.4.6-32.exe');
        return fs.existsSync(exeDirPath) ? exeDirPath : undefined;
    }
    try {
        return require.resolve('pdf-to-printer/dist/SumatraPDF-3.4.6-32.exe');
    }
    catch {
        return undefined;
    }
}
// USB 打印机：通过系统打印队列发送 PDF；printerName 为空时使用系统默认打印机。
class UsbPrinter extends base_1.BasePrinter {
    constructor(printerName) {
        super();
        this.printerName = printerName;
    }
    async print(pdfBuffer, copies) {
        const tmpFile = path.join(os.tmpdir(), `print_${Date.now()}.pdf`);
        fs.writeFileSync(tmpFile, pdfBuffer);
        try {
            for (let i = 0; i < copies; i++) {
                await this.sendToSystemPrinter(tmpFile);
            }
        }
        finally {
            fs.unlinkSync(tmpFile);
        }
    }
    sendToSystemPrinter(filePath) {
        const isWindows = os.platform() === 'win32';
        if (isWindows) {
            return (0, pdf_to_printer_1.print)(filePath, {
                printer: this.printerName,
                copies: 1,
                scale: 'fit',
                silent: true,
                sumatraPdfPath: getBundledSumatraPath(),
            });
        }
        const args = this.printerName ? ['-d', this.printerName, filePath] : [filePath];
        return execFilePromise('lp', args);
    }
    async testConnection() {
        if (!this.printerName) {
            // 未指定队列名时只能验证本地打印命令路径，实际设备由系统默认打印机决定。
            return 0;
        }
        const start = Date.now();
        if (os.platform() === 'win32') {
            await execFilePromise('powershell.exe', [
                '-NoProfile',
                '-ExecutionPolicy',
                'Bypass',
                '-Command',
                `$printerName = ${psQuote(this.printerName)}; $printer = Get-Printer -Name $printerName -ErrorAction SilentlyContinue; if (-not $printer) { Write-Error '找不到打印机队列'; exit 1 }; $escaped = [Regex]::Escape($printerName); $device = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { ($_.Class -in @('Printer', 'PrintQueue', 'USB')) -and (($_.FriendlyName -match $escaped) -or ($_.InstanceId -match $escaped) -or ($_.InstanceId -match 'USBPRINT')) } | Select-Object -First 1; if (-not $device) { Write-Error '未检测到已连接的 USB 打印机设备'; exit 1 }`,
            ]);
            return Date.now() - start;
        }
        await execFilePromise('lpstat', ['-p', this.printerName]);
        return Date.now() - start;
    }
}
exports.UsbPrinter = UsbPrinter;
