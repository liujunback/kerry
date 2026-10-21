"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
(0, server_1.startServer)();
// 优雅退出
process.on('SIGINT', () => {
    console.log('\n[print-agent] 正在关闭...');
    process.exit(0);
});
