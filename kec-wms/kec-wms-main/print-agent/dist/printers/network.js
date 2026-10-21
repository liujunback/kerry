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
exports.NetworkPrinter = void 0;
const net = __importStar(require("net"));
const base_1 = require("./base");
class NetworkPrinter extends base_1.BasePrinter {
    constructor(ipAddress, port, timeoutMs = 10000) {
        super();
        this.ipAddress = ipAddress;
        this.port = port;
        this.timeoutMs = timeoutMs;
    }
    // 通过 TCP socket 发送原始数据到打印机（JetDirect / RAW 协议）
    sendRaw(data) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const timer = setTimeout(() => {
                socket.destroy();
                reject(new Error(`连接超时 (${this.timeoutMs}ms)`));
            }, this.timeoutMs);
            socket.connect(this.port, this.ipAddress, () => {
                socket.write(data, (err) => {
                    if (err) {
                        clearTimeout(timer);
                        socket.destroy();
                        reject(err);
                        return;
                    }
                    // 等待数据发送完毕后关闭
                    socket.end(() => {
                        clearTimeout(timer);
                        resolve();
                    });
                });
            });
            socket.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }
    async print(pdfBuffer, copies) {
        for (let i = 0; i < copies; i++) {
            await this.sendRaw(pdfBuffer);
        }
    }
    async testConnection() {
        const start = Date.now();
        await new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const timer = setTimeout(() => {
                socket.destroy();
                reject(new Error('连接超时'));
            }, 5000);
            socket.connect(this.port, this.ipAddress, () => {
                clearTimeout(timer);
                socket.destroy();
                resolve();
            });
            socket.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
        return Date.now() - start;
    }
}
exports.NetworkPrinter = NetworkPrinter;
