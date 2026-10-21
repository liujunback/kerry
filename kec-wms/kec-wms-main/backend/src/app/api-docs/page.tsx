'use client'

import 'swagger-ui-react/swagger-ui.css'
import { useCallback, useEffect, useState } from 'react'
import { SwaggerUiHost } from '@/components/api-docs/swagger-ui-host'

type ApiModule = 'sku' | 'asn' | 'inventory' | 'outbound' | 'returns'

interface ApiEndpoint {
  method: string
  path: string
  summary: string
}

interface ModuleInfo {
  id: ApiModule
  name: string
  description: string
  file: string
  icon: string
  endpoints: ApiEndpoint[]
}

interface SwaggerSystem {
  preauthorizeApiKey?: (authDefinitionKey: string, apiKeyValue: string) => void
}

const modules: ModuleInfo[] = [
  {
    id: 'sku',
    name: 'SKU 管理',
    description: '商品信息管理',
    file: '/openapi-sku.yaml',
    icon: '📦',
    endpoints: [
      { method: 'POST', path: '/skus', summary: '创建SKU' },
      { method: 'GET', path: '/skus', summary: '查询SKU列表' }
    ]
  },
  {
    id: 'asn',
    name: 'ASN 入库',
    description: '入库通知单管理',
    file: '/openapi-asn.yaml',
    icon: '📥',
    endpoints: [
      { method: 'POST', path: '/asn', summary: '创建ASN' }
    ]
  },
  {
    id: 'inventory',
    name: '库存管理',
    description: '库存明细、库存流水与 Webhook',
    file: '/openapi-inventory.yaml',
    icon: '📊',
    endpoints: [
      { method: 'GET', path: '/inventory', summary: '查询库存明细' },
      { method: 'GET', path: '/inventory/transactions', summary: '查询库存流水' }
    ]
  },
  {
    id: 'outbound',
    name: '出库订单',
    description: '出库订单管理',
    file: '/openapi-outbound.yaml',
    icon: '📤',
    endpoints: [
      { method: 'POST', path: '/outbound-orders', summary: '创建出库订单' },
      { method: 'GET', path: '/outbound-orders/by-number/{externalOrderNo}', summary: '获取出库订单详情' },
      { method: 'POST', path: '/outbound-orders/by-number/{externalOrderNo}/cancel', summary: '取消出库订单/转拦截' }
    ]
  },
  {
    id: 'returns',
    name: '退件管理',
    description: '退件预报与处理方式',
    file: '/openapi-returns.yaml',
    icon: '↩️',
    endpoints: [
      { method: 'POST', path: '/returns', summary: '创建退件预报单' },
      { method: 'POST', path: '/returns/by-number/{preReturnNo}/dispositions', summary: '下发退件处理方式' }
    ]
  }
]

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<string | null>(null)
  const [activeModule, setActiveModule] = useState<ApiModule>('sku')
  const [loading, setLoading] = useState(false)
  const [serverUrl, setServerUrl] = useState('http://localhost:3000/api/v1')

  const loadModule = (moduleId: ApiModule) => {
    setLoading(true)
    const selectedModule = modules.find(m => m.id === moduleId)
    if (!selectedModule) return

    fetch(selectedModule.file)
      .then(res => res.text())
      .then(text => {
        // 动态替换 server URL
        const updatedSpec = text.replace(
          /servers:\s*\n\s*-\s*url:\s*http:\/\/localhost:3000\/api\/v1/,
          `servers:\n  - url: ${serverUrl}`
        )
        setSpec(updatedSpec)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load OpenAPI spec:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadModule(activeModule)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule, serverUrl])

  const handleSwaggerComplete = useCallback((system: unknown) => {
    const swaggerSystem = system as SwaggerSystem | null | undefined
    const defaultApiKey = process.env.NEXT_PUBLIC_DEFAULT_API_KEY
    const savedAuth = localStorage.getItem('swagger-ui-authorization')

    if (!savedAuth && defaultApiKey && swaggerSystem?.preauthorizeApiKey) {
      swaggerSystem.preauthorizeApiKey('ApiKeyAuth', defaultApiKey)
    }
  }, [])

  if (!spec || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载 API 文档中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">WMS 外部 API</h2>
          <p className="mt-1 text-xs text-gray-500">供 ERP、OMS 等系统集成</p>

          {/* Auth Info - 只显示一次 */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs">
              <div className="font-semibold text-blue-900 mb-1">认证方式</div>
              <code className="block bg-blue-100 px-2 py-1 rounded text-[10px] font-mono text-blue-800">
                X-API-Key: wms_xxx...
              </code>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {modules.map(module => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeModule === module.id
                  ? 'bg-blue-50 border-2 border-blue-500 text-blue-900'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{module.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold">{module.name}</div>
                  <div className="text-xs text-gray-500">{module.description}</div>
                </div>
              </div>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
              v1.2.0
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              OAS 3.0
            </span>
          </div>
          <p className="text-xs text-gray-500">© 2026 KEC WMS</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {modules.find(m => m.id === activeModule)?.name}
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {modules.find(m => m.id === activeModule)?.description}
                </p>
              </div>

              {/* Server Selector - 统一位置 */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">环境:</label>
                <select
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="http://localhost:3000/api/v1">开发环境 (localhost:3000)</option>
                  <option value="https://api-staging.example.com/api/v1">测试环境</option>
                  <option value="https://api.example.com/api/v1">生产环境</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Swagger UI */}
        <div className="flex-1 overflow-auto px-8 py-8">
          {activeModule === 'inventory' && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Webhook 推送说明</h3>
              <div className="mt-2 text-sm text-amber-800 space-y-1">
                <p>1. 在 API Key 管理页面配置 `webhookUrl`、`webhookSecret`、`webhookEvents`。</p>
                <p>2. 当前支持事件：`inventory.event.created`。</p>
                <p>3. 系统会按 API Key 的租户、客户、仓库作用域筛选匹配的推送配置。</p>
                <p>4. 建议接收方使用 `eventNumber` 或 `X-Event-ID` 做幂等去重。</p>
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <SwaggerUiHost specText={spec} onComplete={handleSwaggerComplete} />
          </div>
        </div>
      </div>
    </div>
  )
}
