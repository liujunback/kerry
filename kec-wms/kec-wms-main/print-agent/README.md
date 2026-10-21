# KEC WMS 打印中间件

本地打印中间件服务，通过 WebSocket 接收前端的打印任务并发送到物理打印机设备。

## 系统要求

- Windows 10/11 或 Windows Server 2016+
- Node.js 20.x LTS 或更高版本
- npm 或 yarn 包管理器

## 快速开始

### 方式 1：使用批处理脚本（推荐）

1. 双击 `start.bat` 启动中间件
2. 脚本会自动检查环境并安装依赖
3. 保持窗口打开，中间件将在后台运行
4. 前端页面会自动连接到 `ws://127.0.0.1:12212`

停止服务：
- 在启动窗口按 `Ctrl+C`
- 或双击 `stop.bat` 停止所有相关进程

### 方式 2：使用 PowerShell 脚本

1. 右键点击 `start.ps1`，选择"使用 PowerShell 运行"
2. 如果遇到执行策略限制，以管理员身份运行 PowerShell 并执行：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. 保持窗口打开，中间件将在后台运行

停止服务：
- 在启动窗口按 `Ctrl+C`
- 或运行 `stop.ps1`

### 方式 3：手动启动（开发模式）

```bash
# 安装依赖
npm install

# 启动开发服务器（支持热重载）
npm run dev

# 或编译后启动生产模式
npm run build
npm start
```

## 架构说明

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│   前端 (React)   │ ◄──────────────────────► │  打印中间件       │
│  print-store.ts │    ws://127.0.0.1:12212   │  (print-agent)   │
└─────────────────┘                            └──────────────────┘
         │                                              │
         │ HTTP API                                     │ TCP/USB
         ▼                                              ▼
┌─────────────────┐                            ┌──────────────────┐
│  后端 (Next.js) │                            │  物理打印机设备   │
│  /api/v1/print-*│                            │  (网络/USB/蓝牙)  │
└─────────────────┘                            └──────────────────┘
```

### 工作原理

1. **WebSocket 服务器**：监听 `127.0.0.1:12212`，接收前端打印请求
2. **打印机抽象层**：支持多种连接方式
   - 网络打印机：通过 TCP Socket (JetDirect/RAW 协议，端口 9100)
   - USB 打印机：通过系统打印队列
   - 蓝牙打印机：通过系统打印队列
3. **消息协议**：
   - `PING/PONG`：心跳检测
   - `TEST_DEVICE`：测试设备连接
   - `PRINT`：执行打印任务

## 配置说明

### 端口配置

默认端口：`12212`

如需修改，编辑 [src/server.ts](src/server.ts:5)：
```typescript
const PORT = 12212  // 修改为其他端口
```

### 超时配置

网络打印机默认超时：`10000ms` (10秒)

修改 [src/printers/network.ts](src/printers/network.ts)：
```typescript
private readonly timeoutMs = 10000  // 修改超时时间
```

## 故障排查

### 问题 1：前端显示"未连接"

**原因**：打印中间件未启动或端口被占用

**解决方案**：
1. 确认中间件已启动（双击 `start.bat`）
2. 检查端口是否被占用：
   ```bash
   netstat -ano | findstr :12212
   ```
3. 如果端口被占用，停止占用进程或修改端口配置

### 问题 2：依赖安装失败

**原因**：网络问题或 npm 配置问题

**解决方案**：
1. 使用国内镜像源：
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```
2. 清除缓存后重试：
   ```bash
   npm cache clean --force
   npm install
   ```

### 问题 3：打印失败

**原因**：打印机配置错误或打印机离线

**解决方案**：
1. 在前端点击"测试连接"按钮，检查设备状态
2. 确认打印机 IP 地址和端口正确
3. 检查打印机是否在线：
   ```bash
   ping <打印机IP>
   telnet <打印机IP> 9100
   ```

### 问题 4：PowerShell 脚本无法运行

**原因**：执行策略限制

**解决方案**：
以管理员身份运行 PowerShell：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 开发指南

### 项目结构

```
print-agent/
├── src/
│   ├── index.ts          # 入口文件
│   ├── server.ts         # WebSocket 服务器
│   ├── types.ts          # TypeScript 类型定义
│   └── printers/         # 打印机实现
│       ├── base.ts       # 抽象基类
│       ├── network.ts    # 网络打印机
│       └── usb.ts        # USB/蓝牙打印机
├── dist/                 # 编译输出目录
├── start.bat             # Windows 批处理启动脚本
├── start.ps1             # PowerShell 启动脚本
├── stop.bat              # 批处理停止脚本
├── stop.ps1              # PowerShell 停止脚本
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 本文档
```

### 添加新的打印机类型

1. 在 `src/printers/` 创建新文件，继承 `BasePrinter`
2. 实现 `print()` 和 `testConnection()` 方法
3. 在 `src/server.ts` 中注册新类型

示例：
```typescript
// src/printers/bluetooth.ts
import { BasePrinter } from './base'

export class BluetoothPrinter extends BasePrinter {
  async print(pdfBuffer: Buffer, copies: number): Promise<void> {
    // 实现蓝牙打印逻辑
  }

  async testConnection(): Promise<number> {
    // 实现连接测试
  }
}
```

### 调试模式

启用详细日志：
```bash
# Windows
set DEBUG=print-agent:*
npm run dev

# PowerShell
$env:DEBUG="print-agent:*"
npm run dev
```

## 安全说明

1. **本地监听**：中间件仅绑定 `127.0.0.1`，不对外暴露
2. **无身份验证**：假设本地环境可信，不实现身份验证
3. **防火墙**：无需配置防火墙规则（仅本地访问）

如需局域网访问，需要：
1. 修改监听地址为 `0.0.0.0`
2. 配置 Windows 防火墙允许入站连接
3. 实现 Token 验证机制

## 生产部署

### 方案 A：打包成可执行文件（推荐）

使用 pkg 打包成独立的 `.exe` 文件：

```bash
# 安装 pkg
npm install -g pkg

# 编译 TypeScript
npm run build

# 打包
pkg . --targets node20-win-x64 --output build/print-agent.exe
```

### 方案 B：注册为 Windows 服务

使用 node-windows 注册为系统服务：

```bash
# 安装依赖
npm install node-windows

# 创建服务安装脚本（需要管理员权限）
node scripts/install-service.js
```

服务管理：
- 启动：`sc start "KEC WMS Print Agent"`
- 停止：`sc stop "KEC WMS Print Agent"`
- 查看状态：`sc query "KEC WMS Print Agent"`

## 更新日志

### v1.0.0 (2026-03-03)
- 初始版本
- 支持网络打印机（TCP Socket）
- 支持 USB/蓝牙打印机（系统队列）
- WebSocket 实时通信
- 心跳保活机制
- 设备连接测试

## 许可证

内部项目，仅供 KEC WMS 系统使用。

## 技术支持

如遇问题，请联系开发团队或查看：
- 前端代码：`backend/src/stores/print-store.ts`
- 后端 API：`backend/src/app/api/v1/print-*`
- 需求文档：`requirements/documents/10-打印设置.md`
