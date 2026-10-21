import { Page } from '@playwright/test';
import { TEST_API_KEY } from './auth-helpers';

const WAREHOUSE_HEADER = 'X-WMS-Warehouse-Id';
let currentWarehouseId: string | null = null;

function rememberWarehouseId(warehouseId?: string | null) {
  if (warehouseId) {
    currentWarehouseId = warehouseId;
  }
}

function resolveWarehouseIdFromRequest(url: string, data?: any): string | null {
  if (data && typeof data === 'object' && typeof data.warehouseId === 'string' && data.warehouseId.trim()) {
    return data.warehouseId.trim();
  }

  try {
    const parsed = new URL(url, 'http://localhost');
    const warehouseId = parsed.searchParams.get('warehouseId');
    if (warehouseId?.trim()) {
      return warehouseId.trim();
    }
  } catch {
    // Ignore URL parsing errors in tests.
  }

  return currentWarehouseId;
}

/**
 * 判断是否需要使用 API Key
 * 只有外部 API 接口才需要使用 API Key，内部接口使用 Session
 */
function shouldUseApiKey(url: string): boolean {
  // 只有明确的外部 API 路径才需要 API Key
  const apiKeyEndpoints = [
    '/api/external/',
    // 内部 API 不需要 API Key，因为测试使用的是内部 Session 认证
  ];

  return apiKeyEndpoints.some(endpoint => url.includes(endpoint));
}

/**
 * 通用的 API 请求方法
 * 自动根据 URL 和方法决定使用 API Key 还是 Session
 */
export async function apiRequest(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options?: {
    data?: any;
    headers?: Record<string, string>;
  }
) {
  const headers = { ...options?.headers };
  const warehouseId = resolveWarehouseIdFromRequest(url, options?.data);
  if (warehouseId && !headers[WAREHOUSE_HEADER]) {
    headers[WAREHOUSE_HEADER] = warehouseId;
    rememberWarehouseId(warehouseId);
  }

  // 自动添加 API Key（如果需要）
  if (shouldUseApiKey(url)) {
    headers['X-API-Key'] = TEST_API_KEY;
  }

  const requestOptions: any = {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  };

  // 只有非 GET 请求才添加 data
  if (method !== 'GET' && options?.data !== undefined) {
    requestOptions.data = options.data;
  }

  const response = await page.request[method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'](url, requestOptions);

  return response;
}

/**
 * 创建客户
 */
export async function createClient(page: Page, data: {
  clientCode: string;
  clientName: string;
  clientType?: string;
  status?: string;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/clients', {
    data: {
      clientCode: data.clientCode,
      clientName: data.clientName,
      clientType: data.clientType || 'STANDARD',
      status: data.status || 'ACTIVE',
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 创建仓库
 */
export async function createWarehouse(page: Page, data: {
  warehouseCode: string;
  warehouseName: string;
  warehouseType?: string;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/warehouses', {
    data: {
      warehouseCode: data.warehouseCode,
      warehouseName: data.warehouseName,
      warehouseType: data.warehouseType || 'SELF_BUILT',
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 创建 SKU（自动使用 API Key）
 */
export async function createSku(page: Page, data: {
  clientId: string;
  skuCode: string;
  skuName: string;
  unit?: string;
  isBatchManaged?: boolean;
  isExpiryManaged?: boolean;
  isSerialManaged?: boolean;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/skus', {
    data: {
      clientId: data.clientId,
      skuCode: data.skuCode,
      skuName: data.skuName,
      unit: data.unit || 'PCS',
      isBatchManaged: data.isBatchManaged ?? true,
      isExpiryManaged: data.isExpiryManaged ?? false,
      isSerialManaged: data.isSerialManaged ?? false,
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 创建容器
 */
export async function createContainer(page: Page, data: {
  warehouseId: string;
  containerCode?: string;
  containerType?: string;
  usage?: string;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/containers', {
    data: {
      warehouseId: data.warehouseId,
      containerCode: data.containerCode,
      containerType: data.containerType || 'LARGE_BOX',
      usage: data.usage || 'INBOUND',
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 创建 ASN（使用内部 API，Session 认证）
 * 返回完整数据包括 id 和 lines（带 id）
 *
 * 注意：需要提供 clientId 和 warehouseId（可以通过 clientCode/warehouseCode 查询获取）
 */
export async function createAsn(page: Page, data: {
  clientId?: string;
  warehouseId?: string;
  clientCode?: string;
  warehouseCode?: string;
  externalNumber?: string;
  asnType?: string;
  expectedArrivalDate?: string;
  notes?: string;
  lines: Array<{
    skuCode: string;
    skuId?: string;
    expectedQty: number;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
  }>;
}) {
  try {
    // 如果提供 clientCode/warehouseCode，先查询获取 ID
    let clientId = data.clientId;
    let warehouseId = data.warehouseId;

    if (data.clientCode && !clientId) {
      const clientResp = await page.request.get(`/api/v1/clients?search=${data.clientCode}`);
      const clientResult = await clientResp.json();
      if (clientResult.success && clientResult.data?.length > 0) {
        clientId = clientResult.data[0].id;
      } else {
        return { success: false, message: `客户 ${data.clientCode} 不存在` };
      }
    }

    if (data.warehouseCode && !warehouseId) {
      const whResp = await page.request.get(`/api/v1/warehouses?search=${data.warehouseCode}`);
      const whResult = await whResp.json();
      if (whResult.success && whResult.data?.length > 0) {
        warehouseId = whResult.data[0].id;
      } else {
        return { success: false, message: `仓库 ${data.warehouseCode} 不存在` };
      }
    }

    if (!clientId || !warehouseId) {
      return { success: false, message: '缺少 clientId 或 warehouseId' };
    }
    rememberWarehouseId(warehouseId);

    // 查询 SKU IDs（内部 API 需要 skuId）
    const linesWithSkuId = [];
    for (const line of data.lines) {
      let skuId = line.skuId;
      if (!skuId && line.skuCode) {
        const skuResp = await page.request.get(`/api/v1/skus?search=${line.skuCode}&clientId=${clientId}`);
        const skuResult = await skuResp.json();
        if (skuResult.success && skuResult.data?.length > 0) {
          skuId = skuResult.data[0].id;
        } else {
          return { success: false, message: `SKU ${line.skuCode} 不存在` };
        }
      }
      linesWithSkuId.push({
        skuId,
        skuCode: line.skuCode,
        expectedQty: line.expectedQty,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
        notes: line.notes,
      });
    }

    // 使用内部 API 创建 ASN（Session 认证，不使用 API Key）
    const requestData = {
      clientId,
      warehouseId,
      asnType: data.asnType || 'NORMAL',
      externalNumber: data.externalNumber,
      expectedArrivalDate: data.expectedArrivalDate,
      notes: data.notes,
      lines: linesWithSkuId,
    };

    const response = await apiRequest(page, 'POST', '/api/v1/asn', {
      data: requestData,
    });

    const result = await response.json();

    if (!result.success) {
      return result;
    }

    // 内部 API 返回的 asnLines 带有 id，需要转换为 lines 格式
    if (result.data && result.data.asnLines) {
      result.data.lines = result.data.asnLines.map((line: any) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        skuCode: line.skuCode,
        skuName: line.skuName,
        expectedQty: line.expectedQty,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
        status: line.status,
      }));
    }

    return result;
  } catch (e) {
    return {
      success: false,
      message: `ASN 创建失败: ${e instanceof Error ? e.message : '未知错误'}`,
    };
  }
}

/**
 * ASN 签收（先通过 externalNumber 获取 id，再签收）
 * 注意：签收是内部 Web 操作，使用 Session 认证，不使用 API Key
 */
export async function signInAsn(page: Page, externalNumber: string, clientCode?: string) {
  // 先获取 ASN 详情以获得 id
  const detail = await getAsnDetail(page, externalNumber, clientCode);
  if (!detail.success || !detail.data?.id) {
    return { success: false, message: 'ASN不存在或无法获取ID' };
  }

  // 签收使用内部接口，需要 Session 认证，不使用 API Key
  const response = await apiRequest(page, 'POST', `/api/v1/asn/${detail.data.id}/sign-in`, {
    data: {},
  });
  const result = await response.json();
  return result;
}

/**
 * SKU 收货
 */
export async function receiveSkuToAsn(page: Page, data: {
  asnId: string;
  asnLineId: string;
  receivedQty: number;
  qualityStatus: 'GOOD' | 'DAMAGED';
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
  receivingMode?: 'SKU' | 'CONTAINER';
  containerId?: string;
  containerCode?: string;
}) {
  const response = await apiRequest(page, 'POST', `/api/v1/asn/${data.asnId}/receiving/sku`, {
    data: {
      asnLineId: data.asnLineId,
      receivedQty: data.receivedQty,
      qualityStatus: data.qualityStatus,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      serialNumbers: data.serialNumbers,
      receivingMode: data.receivingMode || 'SKU',
      containerId: data.containerId,
      containerCode: data.containerCode,
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 获取 ASN 详情（使用内部接口）
 * 先通过列表接口查找 ASN ID，再获取详情
 */
export async function getAsnDetail(page: Page, asnNumber: string, clientCode?: string) {
  try {
    // 1. 先通过 ASN 编号查找 ID
    const listResponse = await apiRequest(page, 'GET', `/api/v1/asn?asnNumber=${asnNumber}&pageSize=1`);
    const listResult = await listResponse.json();

    const items = Array.isArray(listResult.data)
      ? listResult.data
      : Array.isArray(listResult.data?.items)
        ? listResult.data.items
        : [];

    if (!listResult.success || items.length === 0) {
      return { success: false, message: 'ASN不存在' };
    }

    const asnId = items[0].id;

    // 2. 通过 ID 获取详情
    const detailResponse = await apiRequest(page, 'GET', `/api/v1/asn/${asnId}`);
    const detailResult = await detailResponse.json();
    return detailResult;
  } catch (error) {
    return { success: false, message: `查询ASN详情失败: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

/**
 * 关闭容器（关箱）
 */
export async function closeContainer(page: Page, containerId: string) {
  const response = await apiRequest(page, 'POST', `/api/v1/containers/${containerId}/close`, {
    data: {},
  });
  const result = await response.json();
  return result;
}

/**
 * 重置容器状态（用于测试前清理）
 * 会先尝试正常重置，如果失败则强制更新容器状态为 IDLE
 */
export async function resetContainerForTest(page: Page, containerId: string) {
  try {
    // 先获取容器当前状态
    const detailResp = await apiRequest(page, 'GET', `/api/v1/containers/${containerId}`);
    const detailText = await detailResp.text();

    if (!detailText) {
      return { success: false, message: '获取容器详情失败：空响应' };
    }

    const detailResult = JSON.parse(detailText);

    if (!detailResult.success) {
      return detailResult;
    }

    const container = detailResult.data;

    // 如果已经是 IDLE，检查是否有残留物品需要清理
    // 这样可以确保测试开始时容器是真正干净的
    const itemsResp = await apiRequest(page, 'GET', `/api/v1/containers/${containerId}/items`);
    const itemsText = await itemsResp.text();
    let hasItems = false;

    if (itemsText) {
      const itemsResult = JSON.parse(itemsText);
      if (itemsResult.success && itemsResult.data?.items?.length > 0) {
        hasItems = true;
      }
    }

    // 如果容器有物品，先清空物品
    if (hasItems) {
      const deleteResp = await apiRequest(page, 'DELETE', `/api/v1/containers/${containerId}/items`, {
        data: {},
      });
      const deleteText = await deleteResp.text();

      if (deleteText) {
        const deleteResult = JSON.parse(deleteText);
        if (!deleteResult.success) {
          console.log('清空容器物品失败:', deleteResult.message);
        }
      }
    }

    // 如果已经是 IDLE 且没有物品，直接返回成功
    if (container.workStatus === 'IDLE' && !hasItems) {
      return { success: true, message: '容器已是空闲状态' };
    }

    // 尝试正常重置（清空物品后应该可以重置了）
    const resetResp = await apiRequest(page, 'POST', `/api/v1/containers/${containerId}/reset`, {
      data: {},
    });
    const resetText = await resetResp.text();

    if (resetText) {
      const resetResult = JSON.parse(resetText);
      if (resetResult.success) {
        return resetResult;
      }
    }

    // 如果重置失败，尝试通过 PATCH 更新状态
    const statusResp = await apiRequest(page, 'PATCH', `/api/v1/containers/${containerId}/status`, {
      data: { workStatus: 'IDLE' },
    });
    const statusText = await statusResp.text();

    if (statusText) {
      return JSON.parse(statusText);
    }

    return { success: false, message: '重置容器状态失败' };
  } catch (error) {
    console.error('resetContainerForTest error:', error);
    return { success: false, message: `重置容器状态失败: ${error}` };
  }
}

/**
 * 获取容器详情
 */
export async function getContainerDetail(page: Page, containerId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/containers/${containerId}`);
  const result = await response.json();
  return result;
}

/**
 * 获取容器物品
 */
export async function getContainerItems(page: Page, containerId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/containers/${containerId}/items`);
  const result = await response.json();
  return result;
}

/**
 * 查询库存
 */
export async function getInventory(page: Page, params: {
  skuCode?: string;
  warehouseId?: string;
  batchNumber?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params.skuCode) queryParams.append('skuCode', params.skuCode);
  if (params.warehouseId) queryParams.append('warehouseId', params.warehouseId);
  if (params.batchNumber) queryParams.append('batchNumber', params.batchNumber);

  const response = await apiRequest(page, 'GET', `/api/v1/inventory?${queryParams.toString()}`);
  const result = await response.json();
  return result;
}

// ==================== 出库模块 API 辅助函数 ====================

/**
 * 创建出库订单
 */
export async function createOutboundOrder(page: Page, data: {
  clientId?: string;
  clientCode?: string;
  warehouseId?: string;
  warehouseCode?: string;
  referenceNumber?: string;
  orderType?: string;
  businessType?: string;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  notes?: string;
  address: {
    contactName: string;
    contactPhone?: string;
    addressLine: string;
    city?: string;
    province?: string;
    country?: string;
    postalCode?: string;
  };
  lines: Array<{
    skuId?: string;
    skuCode: string;
    orderedQty: number;
    batchNumber?: string;
  }>;
}) {
  try {
    // 如果提供 clientCode/warehouseCode，先查询获取 ID
    let clientId = data.clientId;
    let warehouseId = data.warehouseId;

    if (data.clientCode && !clientId) {
      const clientResp = await page.request.get(`/api/v1/clients?search=${data.clientCode}`);
      const clientResult = await clientResp.json();
      if (clientResult.success && clientResult.data?.length > 0) {
        clientId = clientResult.data[0].id;
      } else {
        return { success: false, message: `客户 ${data.clientCode} 不存在` };
      }
    }

    if (data.warehouseCode && !warehouseId) {
      const whResp = await page.request.get(`/api/v1/warehouses?search=${data.warehouseCode}`);
      const whResult = await whResp.json();
      if (whResult.success && whResult.data?.length > 0) {
        warehouseId = whResult.data[0].id;
      } else {
        return { success: false, message: `仓库 ${data.warehouseCode} 不存在` };
      }
    }

    if (!clientId || !warehouseId) {
      return { success: false, message: '缺少 clientId 或 warehouseId' };
    }
    rememberWarehouseId(warehouseId);

    // 查询 SKU IDs
    const linesWithSkuId = [];
    for (const line of data.lines) {
      let skuId = line.skuId;
      if (!skuId && line.skuCode) {
        const skuResp = await page.request.get(`/api/v1/skus?search=${line.skuCode}&clientId=${clientId}`);
        const skuResult = await skuResp.json();
        if (skuResult.success && skuResult.data?.length > 0) {
          skuId = skuResult.data[0].id;
        } else {
          return { success: false, message: `SKU ${line.skuCode} 不存在` };
        }
      }
      linesWithSkuId.push({
        skuId,
        skuCode: line.skuCode,
        orderedQty: line.orderedQty,
        batchNumber: line.batchNumber,
      });
    }

    const requestData = {
      clientId,
      warehouseId,
      referenceNumber: data.referenceNumber,
      orderType: data.orderType || 'STANDARD',
      businessType: data.businessType || 'STANDARD',
      priority: data.priority || 'NORMAL',
      notes: data.notes,
      address: data.address,
      lines: linesWithSkuId,
    };

    const response = await apiRequest(page, 'POST', '/api/v1/outbound-orders', {
      data: requestData,
    });

    const result = await response.json();
    return result;
  } catch (e) {
    return {
      success: false,
      message: `出库订单创建失败: ${e instanceof Error ? e.message : '未知错误'}`,
    };
  }
}

/**
 * 获取出库订单详情
 */
export async function getOutboundOrderDetail(page: Page, orderId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/outbound-orders/${orderId}`);
  const result = await response.json();
  return result;
}

/**
 * 获取出库订单列表
 */
export async function getOutboundOrders(page: Page, params?: {
  warehouseId?: string;
  clientId?: string;
  status?: string;
  orderNumber?: string;
  pageSize?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
  if (params?.clientId) queryParams.append('clientId', params.clientId);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.orderNumber) queryParams.append('orderNumber', params.orderNumber);
  queryParams.append('pageSize', String(params?.pageSize || 20));

  const response = await apiRequest(page, 'GET', `/api/v1/outbound-orders?${queryParams.toString()}`);
  const result = await response.json();
  return result;
}

/**
 * 更新出库订单
 */
export async function updateOutboundOrder(page: Page, orderId: string, data: {
  priority?: number;
  notes?: string;
  address?: {
    contactName?: string;
    contactPhone?: string;
    addressLine?: string;
  };
}) {
  const response = await apiRequest(page, 'PUT', `/api/v1/outbound-orders/${orderId}`, {
    data,
  });
  const result = await response.json();
  return result;
}

/**
 * 取消出库订单
 */
export async function cancelOutboundOrder(page: Page, orderId: string, reason?: string) {
  const response = await apiRequest(page, 'DELETE', `/api/v1/outbound-orders/${orderId}`, {
    data: { reason },
  });
  const result = await response.json();
  return result;
}

/**
 * 批量库存分配
 */
export async function batchAllocateInventory(page: Page, orderIds: string[]) {
  const response = await apiRequest(page, 'POST', '/api/v1/outbound-orders/batch-allocate', {
    data: { orderIds },
  });
  const result = await response.json();
  return result;
}

/**
 * 回退库存分配
 */
export async function rollbackAllocation(page: Page, orderId: string, reason: string = 'E2E rollback verification') {
  const response = await apiRequest(page, 'POST', `/api/v1/outbound-orders/${orderId}/rollback`, {
    data: { reason },
  });
  const result = await response.json();
  return result;
}

/**
 * 批量回退库存分配
 */
export async function batchRollbackAllocation(page: Page, orderIds: string[]) {
  const response = await apiRequest(page, 'POST', '/api/v1/outbound-orders/batch-rollback', {
    data: { orderIds },
  });
  const result = await response.json();
  return result;
}

// ==================== 波次管理 API ====================

/**
 * 创建波次
 */
export async function createWave(page: Page, data: {
  warehouseId: string;
  waveType?: string;
  pickStrategy?: string;
  orderIds: string[];
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  notes?: string;
}) {
  rememberWarehouseId(data.warehouseId);
  const priorityMap: Record<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW', number> = {
    URGENT: 1,
    HIGH: 3,
    NORMAL: 5,
    LOW: 8,
  };
  const response = await apiRequest(page, 'POST', '/api/v1/waves', {
    data: {
      warehouseId: data.warehouseId,
      waveType: data.waveType || 'STANDARD',
      pickStrategy: data.pickStrategy || 'ORDER',
      orderIds: data.orderIds,
      priority: priorityMap[data.priority || 'NORMAL'],
      notes: data.notes,
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 获取波次详情
 */
export async function getWaveDetail(page: Page, waveId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/waves/${waveId}`);
  const result = await response.json();
  return result;
}

/**
 * 获取波次列表
 */
export async function getWaves(page: Page, params?: {
  warehouseId?: string;
  status?: string;
  pageSize?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
  if (params?.status) queryParams.append('status', params.status);
  queryParams.append('pageSize', String(params?.pageSize || 20));

  const response = await apiRequest(page, 'GET', `/api/v1/waves?${queryParams.toString()}`);
  const result = await response.json();
  return result;
}

/**
 * 取消波次
 */
export async function cancelWave(page: Page, waveId: string) {
  const response = await apiRequest(page, 'DELETE', `/api/v1/waves/${waveId}`);
  const result = await response.json();
  return result;
}

/**
 * 获取波次拣货清单
 */
export async function getWavePickList(page: Page, waveIds: string[]) {
  const response = await apiRequest(page, 'POST', '/api/v1/waves/pick-list', {
    data: { waveIds },
  });
  const result = await response.json();
  return result;
}

// ==================== 拣货单 API ====================

/**
 * 创建拣货单
 */
export async function createPickOrder(page: Page, data: {
  warehouseId: string;
  orderIds: string[];
  pickType?: string;
  pickMode?: string;
  assignedUserId?: string;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
}) {
  rememberWarehouseId(data.warehouseId);
  const priorityMap: Record<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW', number> = {
    URGENT: 1,
    HIGH: 3,
    NORMAL: 5,
    LOW: 8,
  };
  const response = await apiRequest(page, 'POST', '/api/v1/pick-orders', {
    data: {
      warehouseId: data.warehouseId,
      orderIds: data.orderIds,
      pickType: data.pickType,
      pickMode: data.pickMode,
      assignedUserId: data.assignedUserId,
      priority: priorityMap[data.priority || 'NORMAL'],
    },
  });
  const result = await response.json();
  if (result?.success && result.data?.taskNumber && !result.data.pickOrderNumber) {
    result.data.pickOrderNumber = result.data.taskNumber;
  }
  return result;
}

/**
 * 获取拣货单详情
 */
export async function getPickOrderDetail(page: Page, pickOrderId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/pick-orders/${pickOrderId}`);
  const result = await response.json();
  if (result?.success && result.data?.taskNumber && !result.data.pickOrderNumber) {
    result.data.pickOrderNumber = result.data.taskNumber;
  }
  return result;
}

/**
 * 获取拣货单列表
 */
export async function getPickOrders(page: Page, params?: {
  warehouseId?: string;
  status?: string;
  pageSize?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
  if (params?.status) queryParams.append('status', params.status);
  queryParams.append('pageSize', String(params?.pageSize || 20));

  const response = await apiRequest(page, 'GET', `/api/v1/pick-orders?${queryParams.toString()}`);
  const result = await response.json();
  if (result?.success && Array.isArray(result.data)) {
    result.data = result.data.map((item: any) => ({
      ...item,
      pickOrderNumber: item.pickOrderNumber || item.taskNumber,
    }));
  }
  return result;
}

/**
 * 取消拣货单
 */
export async function cancelPickOrder(page: Page, pickOrderId: string) {
  const response = await apiRequest(page, 'DELETE', `/api/v1/pick-orders/${pickOrderId}`);
  const result = await response.json();
  return result;
}

/**
 * 打印拣货单（开始拣货）
 */
export async function printPickOrder(page: Page, pickOrderId: string) {
  const response = await apiRequest(page, 'POST', `/api/v1/pick-orders/${pickOrderId}/print`, {
    data: {},
  });
  const result = await response.json();
  return result;
}

/**
 * 获取可创建拣货单的订单列表
 */
export async function getAvailableOrdersForPicking(page: Page, warehouseId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/pick-orders/available-orders?warehouseId=${warehouseId}`);
  const result = await response.json();
  return result;
}

// ==================== 分拣 API ====================

/**
 * 获取播种墙列表
 */
export async function getSortingWalls(page: Page, warehouseId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/sorting/walls?warehouseId=${warehouseId}`);
  const result = await response.json();
  return result;
}

/**
 * 开始分拣
 */
export async function startSorting(page: Page, data: {
  scanCode: string;
  sortingWallId: string;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/sorting/start', {
    data,
  });
  const result = await response.json();
  return result;
}

/**
 * 扫描 SKU 分拣
 */
export async function scanSkuForSorting(page: Page, data: {
  sortingTaskId: string;
  skuCode: string;
  quantity: number;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/sorting/scan-sku', {
    data: {
      sortingTaskId: data.sortingTaskId,
      barcode: data.skuCode,
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 完成单个格口分拣
 */
export async function completeSortingCell(page: Page, data: {
  sortingTaskId: string;
  cellId: string;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/sorting/complete-cell', {
    data,
  });
  const result = await response.json();
  return result;
}

/**
 * 完成分拣任务
 */
export async function completeSorting(page: Page, sortingTaskId: string) {
  const response = await apiRequest(page, 'POST', '/api/v1/sorting/complete', {
    data: { sortingTaskId },
  });
  const result = await response.json();
  return result;
}

/**
 * 获取活动中的分拣任务
 */
export async function getActiveSortingTask(page: Page, sortingWallId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/sorting/active-task?wallId=${sortingWallId}`);
  const result = await response.json();
  return result;
}

// ==================== 打包 API ====================

/**
 * 打包查询
 */
export async function packingLookup(page: Page, scanCode: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/packing/lookup?scanCode=${scanCode}`);
  const result = await response.json();
  return {
    success: typeof result?.success === 'boolean' ? result.success : response.ok(),
    ...result,
  };
}

/**
 * 开始打包
 */
export async function startPacking(page: Page, pickOrderId: string) {
  const response = await apiRequest(page, 'POST', `/api/v1/packing/${pickOrderId}/start`, {
    data: {},
  });
  const result = await response.json();
  return {
    success: typeof result?.success === 'boolean' ? result.success : response.ok(),
    ...result,
  };
}

/**
 * 扫描 SKU 打包
 */
export async function scanSkuForPacking(page: Page, data: {
  pickOrderId: string;
  orderId: string;
  skuCode: string;
  quantity: number;
  serialNumbers?: string[];
}) {
  const response = await apiRequest(page, 'POST', `/api/v1/packing/${data.pickOrderId}/scan-sku`, {
    data: {
      orderId: data.orderId,
      barcode: data.skuCode,
      quantity: data.quantity,
      serialNumbers: data.serialNumbers,
    },
  });
  const result = await response.json();
  return {
    success: typeof result?.success === 'boolean' ? result.success : response.ok(),
    ...result,
  };
}

/**
 * 完成单个订单打包
 */
export async function completeOrderPacking(page: Page, data: {
  pickOrderId: string;
  orderId: string;
  packagingMaterialId?: string;
  weightKg?: number;
}) {
  let packagingMaterialId = data.packagingMaterialId;
  if (!packagingMaterialId) {
    const materialResponse = await apiRequest(page, 'GET', '/api/v1/packaging-materials?pageSize=1');
    const materialResult = await materialResponse.json();
    if (materialResult.success && materialResult.data?.length) {
      packagingMaterialId = materialResult.data[0].id;
    }
  }

  const response = await apiRequest(page, 'POST', `/api/v1/packing/${data.pickOrderId}/complete-order`, {
    data: {
      orderId: data.orderId,
      packagingMaterials: packagingMaterialId ? [{ materialId: packagingMaterialId, quantity: 1 }] : [],
      weight: data.weightKg,
    },
  });
  const result = await response.json();
  return {
    success: typeof result?.success === 'boolean' ? result.success : response.ok(),
    ...result,
  };
}

/**
 * 完成整单打包
 */
export async function completeAllPacking(page: Page, pickOrderId: string) {
  const response = await apiRequest(page, 'POST', `/api/v1/packing/${pickOrderId}/complete`, {
    data: {},
  });
  const result = await response.json();
  return {
    success: typeof result?.success === 'boolean' ? result.success : response.ok(),
    ...result,
  };
}

// ==================== 签出 API ====================

/**
 * 获取签出单列表
 */
export async function getCheckoutOrders(page: Page, params?: {
  warehouseId?: string;
  status?: string;
  pageSize?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
  if (params?.status) queryParams.append('status', params.status);
  queryParams.append('pageSize', String(params?.pageSize || 20));

  const response = await apiRequest(page, 'GET', `/api/v1/checkout?${queryParams.toString()}`);
  const result = await response.json();
  return result;
}

/**
 * 获取签出单详情
 */
export async function getCheckoutOrderDetail(page: Page, checkoutOrderId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/checkout/${checkoutOrderId}`);
  const result = await response.json();
  return result;
}

/**
 * 验证签出
 */
export async function validateCheckout(page: Page, data: {
  containerNumber: string;
  checkoutType: 'PALLET' | 'BAG';
  warehouseId: string;
}) {
  rememberWarehouseId(data.warehouseId);
  const response = await apiRequest(page, 'POST', '/api/v1/checkout/validate', {
    data: {
      containerNumber: data.containerNumber,
      checkoutType: data.checkoutType,
      warehouseId: data.warehouseId,
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 扫描签出
 */
export async function scanCheckout(page: Page, data: {
  checkoutOrderId: string;
  scannedNumber: string;
  checkoutType: 'PALLET' | 'BAG';
  currentChannelCode?: string | null;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/checkout/scan', {
    data: {
      checkoutOrderId: data.checkoutOrderId,
      scannedNumber: data.scannedNumber,
      checkoutType: data.checkoutType,
      currentChannelCode: data.currentChannelCode,
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 确认签出
 */
export async function confirmCheckout(page: Page, data: {
  checkoutOrderId?: string;
  checkoutType: 'PALLET' | 'BAG';
  createMode: 'PRE_CREATE' | 'AUTO_GENERATE';
  warehouseId?: string;
  records?: Array<{
    scannedNumber: string;
    orderNumber: string;
    trackingNumber?: string;
    orderId: string;
  }>;
}) {
  const response = await apiRequest(page, 'POST', '/api/v1/checkout/confirm', {
    data,
  });
  const result = await response.json();
  return result;
}

/**
 * 获取待签出订单列表
 */
export async function getPendingCheckoutOrders(page: Page, warehouseId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/checkout/pending?warehouseId=${warehouseId}`);
  const result = await response.json();
  return result;
}

// ==================== 集运单 API ====================

/**
 * 创建集运单
 */
export async function createManifestOrder(page: Page, data: {
  warehouseId: string;
  channelCode: string;
  channelName: string;
  notes?: string;
}) {
  rememberWarehouseId(data.warehouseId);
  const response = await apiRequest(page, 'POST', '/api/v1/manifest-orders', {
    data,
  });
  const result = await response.json();
  return result;
}

/**
 * 获取集运单详情
 */
export async function getManifestOrderDetail(page: Page, manifestOrderId: string) {
  const response = await apiRequest(page, 'GET', `/api/v1/manifest-orders/${manifestOrderId}`);
  const result = await response.json();
  return result;
}

/**
 * 获取集运单列表
 */
export async function getManifestOrders(page: Page, params?: {
  warehouseId?: string;
  status?: string;
  pageSize?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
  if (params?.status) queryParams.append('status', params.status);
  queryParams.append('pageSize', String(params?.pageSize || 20));

  const response = await apiRequest(page, 'GET', `/api/v1/manifest-orders?${queryParams.toString()}`);
  const result = await response.json();
  return result;
}

/**
 * 验证集运单挂载
 */
export async function validateManifestMount(page: Page, manifestNumber: string) {
  const response = await apiRequest(page, 'POST', '/api/v1/manifest-mount/validate', {
    data: { manifestNumber },
  });
  const result = await response.json();
  return result;
}

/**
 * 挂载签出单到集运单
 */
export async function mountCheckoutToManifest(page: Page, data: {
  manifestOrderId: string;
  checkoutNumber?: string;
  checkoutOrderNumber?: string;
}) {
  const checkoutNumber = data.checkoutNumber || data.checkoutOrderNumber;
  if (!checkoutNumber) {
    return {
      success: false,
      message: 'checkoutNumber is required',
    };
  }
  const response = await apiRequest(page, 'POST', '/api/v1/manifest-mount/scan', {
    data: {
      manifestOrderId: data.manifestOrderId,
      checkoutNumber,
    },
  });
  const result = await response.json();
  return result;
}

/**
 * 确认集运挂载
 */
export async function confirmManifestMount(page: Page, manifestOrderId: string) {
  const response = await apiRequest(page, 'POST', '/api/v1/manifest-mount/confirm', {
    data: { manifestOrderId },
  });
  const result = await response.json();
  return result;
}

/**
 * 完成集运单
 */
export async function completeManifestOrder(page: Page, manifestOrderId: string) {
  const response = await apiRequest(page, 'POST', `/api/v1/manifest-orders/${manifestOrderId}/complete`, {
    data: {},
  });
  const result = await response.json();
  return result;
}

// ==================== 库存准备辅助函数 ====================

/**
 * 准备出库测试所需的库存（通过入库流程）
 */
export async function prepareInventoryForOutbound(page: Page, data: {
  clientCode: string;
  warehouseCode: string;
  skuCode: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  qualityStatus?: 'GOOD' | 'DAMAGED';
  locationCode?: string;
}) {
  try {
    // 1. 创建 ASN
    const asnResult = await createAsn(page, {
      clientCode: data.clientCode,
      warehouseCode: data.warehouseCode,
      externalNumber: `PREP-${Date.now()}`,
      lines: [{
        skuCode: data.skuCode,
        expectedQty: data.quantity,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
      }],
    });

    if (!asnResult.success) {
      return { success: false, message: `ASN 创建失败: ${asnResult.message}` };
    }

    // 2. 签收
    const signInResult = await signInAsn(page, asnResult.data.asnNumber, data.clientCode);
    if (!signInResult.success) {
      return { success: false, message: `ASN 签收失败: ${signInResult.message}` };
    }

    // 3. 收货
    const receiveResult = await receiveSkuToAsn(page, {
      asnId: asnResult.data.id,
      asnLineId: asnResult.data.lines[0].id,
      receivedQty: data.quantity,
      qualityStatus: data.qualityStatus || 'GOOD',
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
    });

    if (!receiveResult.success) {
      return { success: false, message: `收货失败: ${receiveResult.message}` };
    }

    return {
      success: true,
      data: {
        asnId: asnResult.data.id,
        asnNumber: asnResult.data.asnNumber,
        asnLineId: asnResult.data.lines[0].id,
      },
    };
  } catch (e) {
    return {
      success: false,
      message: `准备库存失败: ${e instanceof Error ? e.message : '未知错误'}`,
    };
  }
}

/**
 * 准备出库测试所需的可用库存（收货后自动上架）
 */
export async function prepareAvailableInventoryForOutbound(page: Page, data: {
  clientCode: string;
  warehouseCode: string;
  skuCode: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  qualityStatus?: 'GOOD' | 'DAMAGED';
  locationCode?: string;
}) {
  const prepResult = await prepareInventoryForOutbound(page, data);
  if (!prepResult.success || !prepResult.data) {
    return prepResult;
  }
  const prepData = prepResult.data;

  try {
    const clientResp = await page.request.get(`/api/v1/clients?search=${data.clientCode}`);
    const clientResult = await clientResp.json();
    if (!clientResult.success || !clientResult.data?.length) {
      return { success: false, message: `Client ${data.clientCode} not found` };
    }
    const clientId = clientResult.data[0].id;

    const warehouseResp = await page.request.get(`/api/v1/warehouses?search=${data.warehouseCode}`);
    const warehouseResult = await warehouseResp.json();
    if (!warehouseResult.success || !warehouseResult.data?.length) {
      return { success: false, message: `Warehouse ${data.warehouseCode} not found` };
    }
    const warehouseId = warehouseResult.data[0].id;

    const skuResp = await page.request.get(`/api/v1/skus?search=${data.skuCode}&clientId=${clientId}`);
    const skuResult = await skuResp.json();
    if (!skuResult.success || !skuResult.data?.length) {
      return { success: false, message: `SKU ${data.skuCode} not found` };
    }
    const skuId = skuResult.data[0].id;

    const locationQuery = data.locationCode
      ? `/api/v1/bin-locations?warehouseId=${warehouseId}&search=${data.locationCode}`
      : `/api/v1/bin-locations?warehouseId=${warehouseId}&isReceivable=true&pageSize=100`;
    const locationResp = await apiRequest(page, 'GET', locationQuery);
    const locationResult = await locationResp.json();
    if (!locationResult.success || !locationResult.data?.length) {
      return { success: false, message: 'No receivable bin location available for putaway' };
    }
    const candidateLocations = (locationResult.data || []).filter((candidate: any) => {
      if (candidate.isReceivable === false) return false;
      if (candidate.lockStatus && candidate.lockStatus !== 'UNLOCKED') return false;
      if (candidate.status && candidate.status !== 'ACTIVE') return false;
      if (candidate.zone?.qualityType && candidate.zone.qualityType !== 'GOOD') return false;
      if (candidate.locationCode?.startsWith('NOT-')) return false;
      if (candidate.locationCode?.startsWith('LOCKED-')) return false;
      if (candidate.locationCode?.startsWith('DISABLED-')) return false;
      return true;
    });

    if (candidateLocations.length === 0) {
      return { success: false, message: 'No valid receivable bin location available for putaway' };
    }

    let targetLocation = candidateLocations[0];
    let foundTargetLocation = false;

    if (!data.locationCode) {
      for (const candidate of candidateLocations) {
        const inventoryResp = await apiRequest(
          page,
          'GET',
          `/api/v1/inventory?locationId=${candidate.id}&skuId=${skuId}`
        );
        const inventoryResult = await inventoryResp.json();

        if (!inventoryResult.success) {
          continue;
        }

        if (!inventoryResult.data?.length) {
          targetLocation = candidate;
          foundTargetLocation = true;
          break;
        }
      }
    }

    if (!data.locationCode && !foundTargetLocation) {
      const zonesResp = await apiRequest(page, 'GET', `/api/v1/zones?warehouseId=${warehouseId}&pageSize=100`);
      const zonesResult = await zonesResp.json();
      const targetZone = (zonesResult.data || []).find((zone: any) => {
        return zone.zoneType === 'STORAGE' && (!zone.qualityType || zone.qualityType === 'GOOD');
      });

      if (!targetZone?.id) {
        return { success: false, message: 'No suitable storage zone available to create a temporary putaway bin' };
      }

      const tempLocationCode = `E2E-TMP-${Date.now().toString().slice(-8)}`;
      const createLocationResp = await apiRequest(page, 'POST', '/api/v1/bin-locations', {
        data: {
          warehouseId,
          zoneId: targetZone.id,
          locationCode: tempLocationCode,
          locationType: 'RACK',
          isPickable: true,
          isReceivable: true,
          putawayPriority: 100,
          pickPriority: 100,
          pickSequence: 0,
          maxSkuCount: 1,
        },
      });
      const createLocationResult = await createLocationResp.json();
      if (!createLocationResult.success || !createLocationResult.data?.id) {
        return {
          success: false,
          message: `Failed to create temporary putaway bin: ${createLocationResult.message || 'unknown'}`,
        };
      }

      targetLocation = createLocationResult.data;
    }

    const putawayOrderResponse = await apiRequest(page, 'POST', '/api/v1/putaway/orders', {
      data: {
        putawayMode: 'TASK_MODE',
        asnLineIds: [prepData.asnLineId],
      },
    });
    const putawayOrderResult = await putawayOrderResponse.json();
    if (!putawayOrderResult.success || !putawayOrderResult.data?.length) {
      return {
        success: false,
        message: `Failed to create putaway order: ${putawayOrderResult.message || 'unknown'}`,
      };
    }

    const putawayOrderId = putawayOrderResult.data[0].id;
    const putawayDetailResponse = await apiRequest(page, 'GET', `/api/v1/putaway/orders/${putawayOrderId}`);
    const putawayDetailResult = await putawayDetailResponse.json();
    const putawayLineId = putawayDetailResult.success && putawayDetailResult.data?.lines?.length
      ? putawayDetailResult.data.lines[0].id
      : null;

    const shelvingResponse = await apiRequest(page, 'POST', '/api/v1/shelving', {
      data: {
        mode: 'sku',
        locationId: targetLocation.id,
        locationCode: targetLocation.locationCode,
        skuId,
        skuCode: data.skuCode,
        quantity: data.quantity,
        serialNumbers: [],
        warehouseId,
        clientId,
        putawayOrderId,
        ...(putawayLineId ? { putawayLineId } : {}),
        ...(data.batchNumber ? { batchNumber: data.batchNumber } : {}),
        ...(data.expiryDate ? { expiryDate: data.expiryDate } : {}),
        qualityStatus: data.qualityStatus || 'GOOD',
      },
    });
    const shelvingResult = await shelvingResponse.json();
    if (!shelvingResult.success) {
      return { success: false, message: `Shelving failed: ${shelvingResult.message}` };
    }

    return {
      success: true,
      data: {
        ...prepData,
        clientId,
        warehouseId,
        skuId,
        locationId: targetLocation.id,
        locationCode: targetLocation.locationCode,
        putawayOrderId,
      },
    };
  } catch (e) {
    return {
      success: false,
      message: `Failed to prepare available outbound inventory: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

/**
 * 获取可用库存数量
 */
export async function getAvailableInventoryQty(page: Page, params: {
  skuCode: string;
  warehouseId: string;
  batchNumber?: string;
}): Promise<number> {
  const result = await getInventory(page, params);
  if (!result.success || !result.data) {
    return 0;
  }
  return result.data.reduce((sum: number, item: any) => sum + (item.quantityAvailable || 0), 0);
}
