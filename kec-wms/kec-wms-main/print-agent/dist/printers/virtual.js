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
exports.VirtualPrinter = void 0;
const base_1 = require("./base");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 虚拟打印机 - 用于开发和测试环境
 * 不实际打印，而是将 PDF 保存到本地目录
 */
class VirtualPrinter extends base_1.BasePrinter {
    constructor() {
        super();
        // 输出目录：print-agent/virtual-prints/
        this.outputDir = path.join(process.cwd(), 'virtual-prints');
        this.ensureOutputDir();
    }
    /**
     * 确保输出目录存在
     */
    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            console.log(`[虚拟打印机] 创建输出目录: ${this.outputDir}`);
        }
    }
    /**
     * 模拟打印 - 将 PDF 保存到本地
     */
    async print(pdfBuffer, copies) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `print_${timestamp}.pdf`;
        const filepath = path.join(this.outputDir, filename);
        // 保存 PDF 文件
        fs.writeFileSync(filepath, pdfBuffer);
        console.log(`[虚拟打印机] 打印成功`);
        console.log(`  - 文件: ${filename}`);
        console.log(`  - 份数: ${copies}`);
        console.log(`  - 大小: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`  - 路径: ${filepath}`);
        // 模拟打印延迟
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    /**
     * 测试连接 - 虚拟打印机始终在线
     */
    async testConnection() {
        console.log('[虚拟打印机] 连接测试成功');
        // 模拟 1ms 延迟
        return 1;
    }
}
exports.VirtualPrinter = VirtualPrinter;
