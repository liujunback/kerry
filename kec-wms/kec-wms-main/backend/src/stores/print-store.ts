'use client'

import { create } from 'zustand'

const WS_URL = 'ws://127.0.0.1:12212'

export interface DeviceConfig {
  connectionType: 'NETWORK' | 'USB' | 'BLUETOOTH' | 'VIRTUAL'
  printerName?: string | null
  ipAddress?: string | null
  port?: number | null
}

export interface PrintJobRequest {
  jobId: string
  deviceConfig: DeviceConfig
  pdfBase64: string
  copies?: number
}

type JobStatus = 'QUEUED' | 'PRINTING' | 'SUCCESS' | 'FAILED'

interface JobState {
  status: JobStatus
  error?: string
}

interface PrintStore {
  // 连接状态
  isConnected: boolean
  agentVersion: string | null
  agentUptime: number | null

  // 打印作业状态 Map<jobId, JobState>
  jobs: Map<string, JobState>

  // 内部方法
  _ws: WebSocket | null
  _reconnectTimer: ReturnType<typeof setTimeout> | null
  _reconnectDelay: number
  _statusCallbacks: Map<string, (status: JobStatus, error?: string) => void>

  // 公开方法
  connect: () => void
  disconnect: () => void
  testDevice: (deviceConfig: DeviceConfig) => Promise<{ success: boolean; latencyMs?: number; error?: string }>
  print: (job: PrintJobRequest) => Promise<JobStatus>
}

export const usePrintStore = create<PrintStore>((set, get) => ({
  isConnected: false,
  agentVersion: null,
  agentUptime: null,
  jobs: new Map(),
  _ws: null,
  _reconnectTimer: null,
  _reconnectDelay: 1000,
  _statusCallbacks: new Map(),

  connect() {
    const state = get()
    if (state._ws?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      set({ isConnected: true, _reconnectDelay: 1000 })
      // 发送 PING 获取版本信息
      ws.send(JSON.stringify({ type: 'PING' }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string)

        if (msg.type === 'PONG') {
          set({ agentVersion: msg.version, agentUptime: msg.uptime })
          return
        }

        if (msg.type === 'JOB_STATUS') {
          const { jobId, status, error } = msg
          set((s) => {
            const jobs = new Map(s.jobs)
            jobs.set(jobId, { status, error })
            return { jobs }
          })
          // 触发回调
          const cb = get()._statusCallbacks.get(jobId)
          if (cb) {
            cb(status, error)
            if (status === 'SUCCESS' || status === 'FAILED') {
              get()._statusCallbacks.delete(jobId)
            }
          }
          return
        }

        if (msg.type === 'DEVICE_TEST') {
          // 由 testDevice() 内部的 Promise 处理，通过临时 callback
          const cb = get()._statusCallbacks.get('__device_test__')
          if (cb) {
            cb(msg.success ? 'SUCCESS' : 'FAILED', msg.error)
            get()._statusCallbacks.delete('__device_test__')
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      set({ isConnected: false, agentVersion: null, _ws: null })
      // 指数退避重连
      const delay = get()._reconnectDelay
      const timer = setTimeout(() => {
        set({ _reconnectDelay: Math.min(delay * 2, 30000) })
        get().connect()
      }, delay)
      set({ _reconnectTimer: timer })
    }

    ws.onerror = () => {
      ws.close()
    }

    set({ _ws: ws })
  },

  disconnect() {
    const { _ws, _reconnectTimer } = get()
    if (_reconnectTimer) clearTimeout(_reconnectTimer)
    _ws?.close()
    set({ isConnected: false, _ws: null, _reconnectTimer: null, _reconnectDelay: 1000 })
  },

  testDevice(deviceConfig) {
    return new Promise((resolve) => {
      const { _ws, isConnected } = get()
      if (!isConnected || !_ws) {
        resolve({ success: false, error: 'Print agent not connected, please start print-agent first' })
        return
      }

      const timeout = setTimeout(() => {
        get()._statusCallbacks.delete('__device_test__')
        resolve({ success: false, error: 'Connection test timeout' })
      }, 10000)

      get()._statusCallbacks.set('__device_test__', (status, error) => {
        clearTimeout(timeout)
        resolve({ success: status === 'SUCCESS', error })
      })

      _ws.send(JSON.stringify({ type: 'TEST_DEVICE', deviceConfig }))
    })
  },

  print(job) {
    return new Promise((resolve) => {
      const { _ws, isConnected } = get()
      if (!isConnected || !_ws) {
        resolve('FAILED')
        return
      }

      set((s) => {
        const jobs = new Map(s.jobs)
        jobs.set(job.jobId, { status: 'QUEUED' })
        return { jobs }
      })

      const timeout = setTimeout(() => {
        get()._statusCallbacks.delete(job.jobId)
        resolve('FAILED')
      }, 60000)

      get()._statusCallbacks.set(job.jobId, (status) => {
        if (status === 'SUCCESS' || status === 'FAILED') {
          clearTimeout(timeout)
          resolve(status)
        }
      })

      _ws.send(JSON.stringify({ type: 'PRINT', ...job }))
    })
  },
}))
