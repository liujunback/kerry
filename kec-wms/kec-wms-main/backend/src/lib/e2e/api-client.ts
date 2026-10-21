/**
 * E2E 测试 API 客户端
 * 用于调用后端 API 进行测试
 */

export interface ApiClientConfig {
  baseUrl: string
  tenantCode?: string
  username?: string
  password?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: string
}

const AUTH_ERROR_CODE_SEPARATOR = ':'

function buildE2ELoginIp(tenantCode: string, username: string): string {
  const seed = `${tenantCode}:${username}`
  let hash = 0

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return `127.0.0.${(hash % 200) + 1}`
}

function getAuthErrorMessage(error?: string | null, code?: string | null): string {
  if (code) {
    const [key, detail] = code.split(AUTH_ERROR_CODE_SEPARATOR)

    switch (key) {
      case 'pleaseInputComplete':
        return '请填写完整的登录信息'
      case 'tooManyRequests':
        return '请求过于频繁，请稍后再试'
      case 'tenantNotFound':
        return '租户不存在或已禁用'
      case 'userNotFound':
        return '用户名或密码错误'
      case 'accountDisabled':
        return '账号已被禁用'
      case 'accountLocked':
        return '账号已被锁定，请联系管理员'
      case 'accountSuspended':
        return '账号已被暂停，请联系管理员'
      case 'accountLockedMinutes':
        return `账号已被锁定，请${detail ?? '0'}分钟后再试`
      case 'wrongPassword':
        return `用户名或密码错误，还剩${detail ?? '0'}次尝试机会`
      default:
        break
    }
  }

  if (error === 'CredentialsSignin') {
    return '用户名或密码错误'
  }

  return '登录失败'
}

function parseAuthErrorFromLocation(location: string | null, baseUrl: string): string | null {
  if (!location) return null

  const url = new URL(location, baseUrl)
  const error = url.searchParams.get('error')
  const code = url.searchParams.get('code')

  if (!error && !code) return null

  return getAuthErrorMessage(error, code)
}

// 单例模式：复用登录会话，避免重复登录
let sharedClient: E2eApiClient | null = null
let sharedLoginPromise: Promise<boolean> | null = null

export class E2eApiClient {
  private baseUrl: string
  private cookies: string[] = []
  private isLoggedIn = false
  private loginTime: number = 0
  private currentTenantCode: string | null = null  // 记录当前登录的租户
  private currentUsername: string | null = null    // 记录当前登录的用户
  private static SESSION_TIMEOUT = 30 * 60 * 1000 // 30 分钟

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000'
  }

  // 获取共享客户端实例（单例模式）
  static getSharedClient(baseUrl = 'http://localhost:3000'): E2eApiClient {
    if (!sharedClient) {
      sharedClient = new E2eApiClient({ baseUrl })
    }
    return sharedClient
  }

  // 重置共享客户端
  static resetSharedClient(): void {
    sharedClient = null
    sharedLoginPromise = null
  }

  // 检查会话是否仍然有效
  private isSessionValid(): boolean {
    if (!this.isLoggedIn) return false
    const elapsed = Date.now() - this.loginTime
    return elapsed < E2eApiClient.SESSION_TIMEOUT
  }

  // 登录获取 Session（带防重入锁）
  async login(tenantCode: string, username: string, password: string): Promise<boolean> {
    // 检查是否需要重新登录：
    // 1. 会话已过期
    // 2. 租户或用户不匹配（切换账号场景）
    const needsRelogin = !this.isSessionValid() ||
      this.currentTenantCode !== tenantCode ||
      this.currentUsername !== username

    if (!needsRelogin) {
      return true
    }

    // 如果切换了租户/用户，重置状态
    if (this.currentTenantCode !== tenantCode || this.currentUsername !== username) {
      console.log(`🔄 切换租户/用户: ${this.currentTenantCode}/${this.currentUsername} -> ${tenantCode}/${username}`)
      this.cookies = []
      this.isLoggedIn = false
    }

    // 如果有正在进行的登录，等待其完成
    if (sharedLoginPromise && this === sharedClient) {
      return sharedLoginPromise
    }

    const loginPromise = this.doLogin(tenantCode, username, password)
    if (this === sharedClient) {
      sharedLoginPromise = loginPromise
    }

    try {
      return await loginPromise
    } finally {
      if (this === sharedClient) {
        sharedLoginPromise = null
      }
    }
  }

  private async doLogin(tenantCode: string, username: string, password: string): Promise<boolean> {
    const forwardedFor = buildE2ELoginIp(tenantCode, username)

    try {
      // 重置 cookies（避免旧 cookie 干扰）
      this.cookies = []

      // 先获取 CSRF token（如果需要）
      const csrfRes = await fetch(`${this.baseUrl}/api/auth/csrf`)
      const csrfData = await csrfRes.json()
      const csrfToken = csrfData.csrfToken

      // 获取 cookies
      const csrfCookies = csrfRes.headers.getSetCookie?.() || []
      this.cookies = [...csrfCookies]

      // 执行登录
      const loginRes = await fetch(`${this.baseUrl}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: this.cookies.join('; '),
          'x-forwarded-for': forwardedFor,
          'x-real-ip': forwardedFor,
        },
        body: new URLSearchParams({
          csrfToken,
          tenantCode,
          username,
          password,
          callbackUrl: `${this.baseUrl}/dashboard`,
          json: 'true',
        }),
        redirect: 'manual',
      })
      const loginError = parseAuthErrorFromLocation(loginRes.headers.get('location'), this.baseUrl)

      // 获取 session cookies（替换而非追加）
      const loginCookies = loginRes.headers.getSetCookie?.() || []
      // 合并 cookies，相同名称的用新值替换
      const cookieMap = new Map<string, string>()
      for (const cookie of [...this.cookies, ...loginCookies]) {
        const name = cookie.split('=')[0]
        cookieMap.set(name, cookie)
      }
      this.cookies = Array.from(cookieMap.values())

      // 验证登录成功
      const sessionRes = await fetch(`${this.baseUrl}/api/auth/session`, {
        headers: { Cookie: this.cookies.join('; ') },
      })
      const session = await sessionRes.json()

      this.isLoggedIn = !!session?.user
      if (!this.isLoggedIn) {
        throw new Error(loginError || 'E2E 自动登录未建立会话')
      }

      this.loginTime = Date.now()
      this.currentTenantCode = tenantCode
      this.currentUsername = username
      return true
    } catch (error) {
      this.isLoggedIn = false
      this.currentTenantCode = null
      this.currentUsername = null
      const message = error instanceof Error ? error.message : String(error)
      console.error('Login failed:', message)
      throw new Error(message)
    }
  }

  // 通用 API 请求
  async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.cookies.length > 0) {
      headers.Cookie = this.cookies.join('; ')
    }

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      const text = await res.text()
      try {
        return JSON.parse(text)
      } catch {
        // 非 JSON 响应
        return { success: false, message: text || `HTTP ${res.status}` } as ApiResponse<T>
      }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) } as ApiResponse<T>
    }
  }

  // GET 请求
  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path)
  }

  // POST 请求
  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body)
  }

  // PUT 请求
  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body)
  }

  // ==================== ASN 相关 API ====================

  // 创建 ASN
  async createAsn(data: {
    clientId: string
    warehouseId: string
    asnType: string
    expectedArrivalDate?: string
    lines: Array<{
      skuId: string
      skuCode: string
      skuName?: string
      expectedQty: number
      batchNumber?: string
      expiryDate?: string
    }>
  }) {
    return this.post<{ id: string; asnNumber: string }>('/api/v1/asn', data)
  }

  // 签收 ASN
  async signInAsn(asnId: string) {
    return this.post(`/api/v1/asn/${asnId}/sign-in`)
  }

  // 提交 SKU 收货
  async submitReceiving(
    asnId: string,
    data: {
      asnLineId: string
      receivedQty: number
      qualityStatus: 'GOOD' | 'DAMAGED'
      batchNumber?: string
      expiryDate?: string
      serialNumbers?: string[]
      receivingMode?: 'SKU' | 'CONTAINER'
      containerCode?: string
      containerId?: string
    }
  ) {
    return this.post(`/api/v1/asn/${asnId}/receiving/sku`, data)
  }

  // 完成收货
  async completeReceiving(asnId: string, forceComplete?: boolean) {
    return this.post(`/api/v1/asn/${asnId}/receiving/complete`, { forceComplete })
  }

  // 取消 ASN
  async cancelAsn(asnId: string) {
    return this.post(`/api/v1/asn/${asnId}/cancel`, { reason: 'E2E测试取消' })
  }

  // 取消 ASN（不传原因，用于测试参数验证）
  async cancelAsnWithoutReason(asnId: string) {
    return this.post(`/api/v1/asn/${asnId}/cancel`, {})
  }

  // 回滚 ASN（清零收货数量）
  async rollbackAsn(asnId: string, reason = 'E2E测试回滚') {
    return this.post(`/api/v1/asn/${asnId}/rollback`, { reason })
  }

  // 获取 ASN 详情
  async getAsn(asnId: string) {
    return this.get(`/api/v1/asn/${asnId}`)
  }

  // 获取 ASN 行项目
  async getAsnLines(asnId: string) {
    return this.get(`/api/v1/asn/${asnId}/lines`)
  }

  // ==================== 容器相关 API ====================

  // 根据容器编码查找容器
  async getContainerByCode(containerCode: string, warehouseId: string) {
    return this.get<{ id: string; containerCode: string }>(`/api/v1/containers/lookup?containerCode=${encodeURIComponent(containerCode)}&warehouseId=${warehouseId}`)
  }

  // ==================== 出库订单相关 API ====================

  // 创建出库订单
  async createOutboundOrder(data: {
    clientId: string
    warehouseId: string
    referenceNumber?: string
    priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
    address: {
      contactName: string
      contactPhone?: string
      addressLine: string
      city?: string
      province?: string
      country?: string
      postalCode?: string
    }
    lines: Array<{
      skuId: string
      skuCode: string
      orderedQty: number
      batchNumber?: string
    }>
  }) {
    return this.post<{ id: string; orderNumber: string }>('/api/v1/outbound-orders', data)
  }

  // 获取出库订单详情
  async getOutboundOrder(orderId: string) {
    return this.get<{
      id: string
      orderNumber: string
      status: string
      lines: Array<{
        id: string
        skuId: string
        skuCode: string
        orderedQty: number
        allocatedQty: number
        pickedQty: number
        packedQty: number
      }>
    }>(`/api/v1/outbound-orders/${orderId}`)
  }

  // 批量分配库存
  async batchAllocateInventory(orderIds: string[]) {
    return this.post('/api/v1/outbound-orders/batch-allocate', { orderIds })
  }

  // 回退分配
  async rollbackAllocation(orderId: string) {
    return this.post(`/api/v1/outbound-orders/${orderId}/rollback`, {})
  }

  // 取消出库订单
  async cancelOutboundOrder(orderId: string, reason?: string) {
    return this.post(`/api/v1/outbound-orders/${orderId}/cancel`, { reason: reason || 'E2E测试取消' })
  }

  // ==================== 拣货单相关 API ====================

  // 创建拣货单
  async createPickOrder(data: {
    warehouseId: string
    orderIds: string[]
    priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | number
  }) {
    const priority = typeof data.priority === 'number'
      ? data.priority
      : data.priority === 'URGENT'
        ? 10
        : data.priority === 'HIGH'
          ? 8
          : data.priority === 'LOW'
            ? 3
            : 5

    // API 返回 taskNumber 字段，转换为统一的 pickOrderNumber
    const result = await this.post<{ id: string; taskNumber: string }>('/api/v1/pick-orders', {
      ...data,
      priority,
    })
    if (result.success && result.data) {
      return {
        ...result,
        data: {
          ...result.data,
          pickOrderNumber: result.data.taskNumber,
        },
      }
    }
    return result as unknown as ApiResponse<{ id: string; pickOrderNumber: string }>
  }

  // 获取拣货单详情
  async getPickOrderDetail(pickOrderId: string) {
    return this.get<{
      id: string
      pickOrderNumber: string
      status: string
      lines: Array<{
        id: string
        skuId: string
        skuCode: string
        quantity: number
        pickedQty: number
        binCode: string
        orderId: string
      }>
    }>(`/api/v1/pick-orders/${pickOrderId}`)
  }

  // 打印拣货单（开始拣货）
  async printPickOrder(pickOrderId: string) {
    return this.post(`/api/v1/pick-orders/${pickOrderId}/print`, {})
  }

  // ==================== 打包相关 API ====================

  // 开始打包
  async startPacking(pickOrderId: string) {
    const result = await this.post(`/api/v1/packing/${pickOrderId}/start`, {})
    // 这个 API 返回格式不标准，需要特殊处理
    // 成功: { data: { message: '...' } }，失败: { message: '...' }
    if (result.data || (result as any).success !== false) {
      return { success: true, data: result.data, message: (result.data as any)?.message }
    }
    return { success: false, message: (result as any).message || '开始打包失败' }
  }

  // 扫描 SKU 打包
  async scanSkuForPacking(data: {
    pickOrderId: string
    orderId: string
    skuCode: string  // 实际上 API 用 barcode 字段，可以传 skuCode
    quantity: number
    serialNumbers?: string[]
  }) {
    const result = await this.post(`/api/v1/packing/${data.pickOrderId}/scan-sku`, {
      barcode: data.skuCode,  // API 接受 barcode 或 skuCode
      quantity: data.quantity,
      orderId: data.orderId,
      serialNumbers: data.serialNumbers,
    })
    // 这个 API 返回格式不标准，需要特殊处理
    if (result.data || (result as any).success !== false) {
      return { success: true, data: result.data, message: (result.data as any)?.message }
    }
    return { success: false, message: (result as any).message || '扫描打包失败' }
  }

  // 完成单个订单打包
  async completeOrderPacking(data: {
    pickOrderId: string
    orderId: string
    weightKg?: number
    packagingMaterialId?: string  // 包材 ID
  }) {
    // 如果没有指定包材，先获取一个可用的包材
    let materialId = data.packagingMaterialId
    if (!materialId) {
      const materialsResult = await this.get<Array<{ id: string }>>('/api/v1/packaging-materials?pageSize=1')
      if (materialsResult.success && materialsResult.data?.length) {
        materialId = (materialsResult.data as any)[0]?.id || materialsResult.data[0]?.id
      }
    }

    if (!materialId) {
      return { success: false, message: '没有可用的包材' }
    }

    const result = await this.post(`/api/v1/packing/${data.pickOrderId}/complete-order`, {
      orderId: data.orderId,
      weight: data.weightKg || 1.0,
      packagingMaterials: [{ materialId, quantity: 1 }],
    })
    // 处理非标准返回格式
    if (result.data || (result as any).success !== false) {
      return { success: true, data: result.data, message: (result.data as any)?.message }
    }
    return { success: false, message: (result as any).message || '完成打包失败' }
  }

  // 完成全部打包
  async completeAllPacking(pickOrderId: string) {
    const result = await this.post(`/api/v1/packing/${pickOrderId}/complete`, {})
    // 处理非标准返回格式
    if (result.data || (result as any).success !== false) {
      return { success: true, data: result.data, message: (result.data as any)?.message }
    }
    return { success: false, message: (result as any).message || '完成全部打包失败' }
  }

  // ==================== 签出相关 API ====================

  // 验证/创建签出单
  async validateCheckout(data: {
    containerNumber: string  // 板号/袋号
    checkoutType: 'PALLET' | 'BAG'
    warehouseId: string
  }) {
    const result = await this.post<{ id: string; containerNumber: string; status: string }>('/api/v1/checkout/validate', {
      containerNumber: data.containerNumber,
      checkoutType: data.checkoutType,
      warehouseId: data.warehouseId,
    })
    if (result.success && result.data) {
      // API 直接返回 data.id，不是 data.checkoutOrder.id
      return { success: true, data: result.data, checkoutOrderId: (result.data as any).id }
    }
    return { success: false, message: (result as any).message || '验证签出失败' }
  }

  // 扫描签出
  async scanCheckout(data: {
    scanCode: string  // 订单号或单号
    checkoutType: 'PALLET' | 'BAG'
    warehouseId: string
    checkoutOrderId: string  // 签出单 ID（必填）
  }) {
    const result = await this.post<{ checkoutOrderId: string }>('/api/v1/checkout/scan', {
      checkoutOrderId: data.checkoutOrderId,
      scannedNumber: data.scanCode,
      checkoutType: data.checkoutType,
    })
    // 处理非标准返回格式
    if (result.data || (result as any).success !== false) {
      return { success: true, data: result.data, message: (result.data as any)?.message }
    }
    return { success: false, message: (result as any).message || '扫描签出失败' }
  }

  // 确认签出
  async confirmCheckout(data: {
    checkoutOrderId?: string
    checkoutType: 'PALLET' | 'BAG'
    createMode: 'PRE_CREATE' | 'AUTO_GENERATE'
    warehouseId?: string
    records?: Array<{
      scannedNumber: string
      orderNumber: string
      orderId: string
    }>
  }) {
    return this.post('/api/v1/checkout/confirm', data)
  }

  // ==================== 库存查询 API ====================

  // 查询库存
  async getInventory(params: {
    skuCode?: string
    warehouseId: string
    batchNumber?: string
  }) {
    const query = new URLSearchParams()
    if (params.skuCode) query.set('skuCode', params.skuCode)
    query.set('warehouseId', params.warehouseId)
    if (params.batchNumber) query.set('batchNumber', params.batchNumber)
    return this.get<{
      items: Array<{
        skuCode: string
        quantity: number
        availableQty: number
        allocatedQty: number
        binCode: string
      }>
    }>(`/api/v1/inventory?${query.toString()}`)
  }

  // 查询可用库存数量（简化版）
  async getAvailableInventoryQty(params: {
    skuCode: string
    warehouseId: string
  }): Promise<number> {
    const result = await this.getInventory(params)
    if (!result.success || !result.data?.items) return 0
    return result.data.items.reduce((sum, item) => sum + (item.availableQty || 0), 0)
  }

  // ==================== 出库订单扩展 API ====================

  // 更新出库订单
  async updateOutboundOrder(
    orderId: string,
    data: {
      notes?: string
      priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
      address?: {
        contactName?: string
        contactPhone?: string
        addressLine?: string
        city?: string
        province?: string
        country?: string
        postalCode?: string
      }
    }
  ) {
    return this.put(`/api/v1/outbound-orders/${orderId}`, data)
  }

  // 删除出库订单
  async deleteOutboundOrder(orderId: string) {
    return this.request('DELETE', `/api/v1/outbound-orders/${orderId}`)
  }

  // ==================== 波次管理 API ====================

  // 创建波次
  async createWave(data: {
    warehouseId: string
    orderIds: string[]
    waveType?: 'STANDARD' | 'EXPRESS' | 'BATCH'
    pickStrategy?: 'ORDER' | 'SKU' | 'ZONE'
    priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  }) {
    return this.post<{ id: string; waveNumber: string }>('/api/v1/waves', data)
  }

  // 获取波次详情
  async getWaveDetail(waveId: string) {
    return this.get<{
      id: string
      waveNumber: string
      status: string
      orders: Array<{ id: string; orderNumber: string; status: string }>
    }>(`/api/v1/waves/${waveId}`)
  }

  // 取消波次
  async cancelWave(waveId: string) {
    return this.request('DELETE', `/api/v1/waves/${waveId}`)
  }

  // ==================== 拣货单扩展 API ====================

  // 取消拣货单
  async cancelPickOrder(pickOrderId: string) {
    return this.request('DELETE', `/api/v1/pick-orders/${pickOrderId}`)
  }

  // ==================== 分拣 API ====================

  // 开始分拣
  async startSorting(data: {
    scanCode: string
    sortingWallId: string
  }) {
    return this.post<{
      sortingTaskId: string
      cells: Array<{ cellId: string; orderId: string }>
    }>('/api/v1/sorting/start', data)
  }

  // 分拣扫描 SKU
  async scanSkuForSorting(data: {
    sortingTaskId: string
    skuCode: string
    quantity: number
  }) {
    return this.post('/api/v1/sorting/scan-sku', data)
  }

  // 完成单个格口分拣
  async completeSortingCell(data: {
    sortingTaskId: string
    cellId: string
  }) {
    return this.post('/api/v1/sorting/complete-cell', data)
  }

  // 完成分拣任务
  async completeSorting(sortingTaskId: string) {
    return this.post('/api/v1/sorting/complete', { sortingTaskId })
  }

  // 获取活跃分拣任务
  async getActiveSortingTask(sortingWallId: string) {
    return this.get<{
      sortingTaskId: string
      status: string
      cells: Array<{ cellId: string; orderId: string; completed: boolean }>
    }>(`/api/v1/sorting/active-task?sortingWallId=${sortingWallId}`)
  }

  // ==================== 集运单 API ====================

  // 创建集运单
  async createManifestOrder(data: {
    warehouseId: string
    channelCode: string
    notes?: string
  }) {
    return this.post<{ id: string; manifestNumber: string }>('/api/v1/manifest-orders', data)
  }

  // 获取集运单详情
  async getManifestOrderDetail(manifestOrderId: string) {
    return this.get<{
      id: string
      manifestNumber: string
      status: string
      checkoutOrders: Array<{ id: string; containerNumber: string }>
    }>(`/api/v1/manifest-orders/${manifestOrderId}`)
  }

  // 挂载签出单到集运单
  async mountCheckoutToManifest(data: {
    manifestOrderId: string
    checkoutOrderId: string
  }) {
    return this.post('/api/v1/manifest-mount/scan', {
      manifestNumber: data.manifestOrderId,
      scannedNumber: data.checkoutOrderId,
    })
  }

  // 完成集运单
  async completeManifestOrder(manifestOrderId: string) {
    return this.post(`/api/v1/manifest-orders/${manifestOrderId}/complete`, {})
  }

  // ==================== 签出单扩展 API ====================

  // 获取签出单列表
  async getCheckoutOrders(params: {
    warehouseId: string
    status?: string
  }) {
    const query = new URLSearchParams()
    query.set('warehouseId', params.warehouseId)
    if (params.status) query.set('status', params.status)
    return this.get<{
      items: Array<{
        id: string
        containerNumber: string
        status: string
        checkoutType: string
      }>
    }>(`/api/v1/checkout?${query.toString()}`)
  }

  // 获取签出单详情
  async getCheckoutOrderDetail(checkoutOrderId: string) {
    return this.get<{
      id: string
      containerNumber: string
      status: string
      records: Array<{
        orderId: string
        orderNumber: string
      }>
    }>(`/api/v1/checkout/${checkoutOrderId}`)
  }
}
