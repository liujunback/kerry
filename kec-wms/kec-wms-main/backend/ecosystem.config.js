module.exports = {
  apps: [
    // ============================================
    // Next.js 主应用
    // ============================================
    {
      name: 'kec-wms',
      script: 'server.js',
      instances: 2, // 固定 2 实例，避免连接数过多
      exec_mode: 'cluster', // 集群模式，实现负载均衡
      watch: false,
      max_memory_restart: '1G', // 内存超过 1G 自动重启
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/app/logs/wms-error.log',
      out_file: '/app/logs/wms-out.log',
      merge_logs: true,
      // 重启策略
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    // ============================================
    // 审计日志 Worker
    // ============================================
    {
      name: 'audit-worker',
      script: 'node',
      args: 'node_modules/tsx/dist/cli.mjs src/lib/queue/audit-worker.ts',
      instances: 1, // 单实例即可
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/audit-worker-error.log',
      out_file: './logs/audit-worker-out.log',
      merge_logs: true,
      // 重启策略
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      // 优雅关闭
      kill_timeout: 5000,
    },
  ],
};
