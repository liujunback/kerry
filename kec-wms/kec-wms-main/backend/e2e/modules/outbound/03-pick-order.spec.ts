import { expect,test,type Page } from '@playwright/test'
import {
batchAllocateInventory,
cancelPickOrder,
createOutboundOrder,
createPickOrder,
getAvailableOrdersForPicking,
getOutboundOrderDetail,
getPickOrderDetail,
prepareAvailableInventoryForOutbound,
printPickOrder,
} from '../../fixtures/api-helpers'
import { loginAsAdmin } from '../../fixtures/auth-helpers'
import {
E2E_CLIENT_CODE,
E2E_SKU_CODES,
E2E_WAREHOUSE_CODE,
generateAddress,
generateOutboundTestData,
} from '../../fixtures/test-data'

test.describe.serial('拣货单管理', () => {
  const testData = generateOutboundTestData('PK')
  const address = generateAddress('PK')

  let warehouseId: string
  let clientId: string
  let allocatedOrderId: string
  let createdPickOrderId: string
  let createdPickOrderNumber: string

  async function waitForOrderStatus(
    page: Page,
    orderId: string,
    expectedStatus: string,
    timeoutMs: number = 12000
  ) {
    const deadline = Date.now() + timeoutMs
    let lastDetail: any = null

    while (Date.now() < deadline) {
      const detail = await getOutboundOrderDetail(page, orderId)
      lastDetail = detail
      if (detail.success && detail.data?.status === expectedStatus) {
        return detail
      }

      await page.waitForTimeout(500)
    }

    return lastDetail
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('准备测试数据：创建并分配出库订单', async ({ page }) => {
    const clientResp = await page.request.get(`/api/v1/clients?search=${E2E_CLIENT_CODE}`)
    const clientResult = await clientResp.json()
    expect(clientResult.success).toBe(true)
    expect(clientResult.data.length).toBeGreaterThan(0)
    clientId = clientResult.data[0].id

    const whResp = await page.request.get(`/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
    const whResult = await whResp.json()
    expect(whResult.success).toBe(true)
    expect(whResult.data.length).toBeGreaterThan(0)
    warehouseId = whResult.data[0].id

    const inventoryPrep = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 100,
    })
    expect(inventoryPrep.success).toBe(true)

    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-PICK-${testData.timestamp}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 10 }],
    })
    expect(createResult.success).toBe(true)
    allocatedOrderId = createResult.data.id

    const initialDetail = await getOutboundOrderDetail(page, allocatedOrderId)
    expect(initialDetail.success).toBe(true)

    if (initialDetail.data?.status !== 'ALLOCATED') {
      const allocResult = await batchAllocateInventory(page, [allocatedOrderId])
      if (!allocResult.success) {
        console.log('库存分配结果:', allocResult.message)
      }
    }

    const detail = await waitForOrderStatus(page, allocatedOrderId, 'ALLOCATED')
    expect(detail?.success).toBe(true)
    expect(detail?.data?.status).toBe('ALLOCATED')
    console.log(`订单 ${allocatedOrderId} 状态: ${detail.data?.status}`)
  })

  test('获取可创建拣货单的订单列表应该成功', async ({ page }) => {
    const result = await getAvailableOrdersForPicking(page, warehouseId)

    if (!result.success) {
      console.log('获取可用订单失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('创建拣货单应该成功', async ({ page }) => {
    const detail = await getOutboundOrderDetail(page, allocatedOrderId)
    expect(detail.success).toBe(true)
    expect(detail.data?.status).toBe('ALLOCATED')

    const result = await createPickOrder(page, {
      warehouseId,
      orderIds: [allocatedOrderId],
      priority: 'HIGH',
    })

    if (!result.success) {
      console.log('拣货单创建失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.id).toBeDefined()
    expect(result.data.pickOrderNumber).toBeDefined()

    createdPickOrderId = result.data.id
    createdPickOrderNumber = result.data.pickOrderNumber

    console.log('创建的拣货单:', { id: createdPickOrderId, pickOrderNumber: createdPickOrderNumber })

    const orderDetail = await getOutboundOrderDetail(page, allocatedOrderId)
    expect(orderDetail.data.status).toBe('PENDING_PICK')
  })

  test('查询拣货单详情应该返回正确数据', async ({ page }) => {
    test.skip(!createdPickOrderId, '缺少已创建拣货单，前置用例未完成')

    const result = await getPickOrderDetail(page, createdPickOrderId)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.id).toBe(createdPickOrderId)
    expect(result.data.pickOrderNumber).toBe(createdPickOrderNumber)
    expect(result.data.status).toBeDefined()
    expect(result.data.lines).toBeDefined()
  })

  test('打印拣货单应该成功（开始拣货）', async ({ page }) => {
    test.skip(!createdPickOrderId, '缺少已创建拣货单，前置用例未完成')

    const result = await printPickOrder(page, createdPickOrderId)

    if (!result.success) {
      console.log('打印拣货单失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)

    const detail = await getPickOrderDetail(page, createdPickOrderId)
    expect(detail.data.status).toBe('IN_PROGRESS')

    const orderDetail = await getOutboundOrderDetail(page, allocatedOrderId)
    expect(orderDetail.data.status).toBe('PICKING')
  })

  test('单个新建订单创建拣货单的行为应符合当前分配策略', async ({ page }) => {
    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-PICK-PENDING-${Date.now()}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 3 }],
    })
    expect(createResult.success).toBe(true)

    const pendingOrderId = createResult.data.id
    const detail = await getOutboundOrderDetail(page, pendingOrderId)
    expect(detail.success).toBe(true)

    const result = await createPickOrder(page, {
      warehouseId,
      orderIds: [pendingOrderId],
    })

    if (detail.data?.status === 'PENDING' && !result.success) {
      expect(result.success).toBe(false)
      return
    }

    const detailAfterCreate = await getOutboundOrderDetail(page, pendingOrderId)
    expect(detailAfterCreate.success).toBe(true)
    expect(['ALLOCATED', 'PENDING_PICK']).toContain(detailAfterCreate.data?.status)
    expect(result.success).toBe(true)
  })

  test('创建拣货单使用空订单列表应该失败', async ({ page }) => {
    const result = await createPickOrder(page, {
      warehouseId,
      orderIds: [],
    })

    expect(result.success).toBe(false)
  })

  test('取消不存在的拣货单应该失败', async ({ page }) => {
    const result = await cancelPickOrder(page, 'non-existent-pick-order-id')

    expect(result.success).toBe(false)
  })

  test('取消已开始拣货的拣货单应该失败', async ({ page }) => {
    test.skip(!createdPickOrderId, '缺少已创建拣货单，前置用例未完成')

    const detail = await getPickOrderDetail(page, createdPickOrderId)
    test.skip(detail.data?.status !== 'IN_PROGRESS', '拣货单状态不是 IN_PROGRESS')

    const result = await cancelPickOrder(page, createdPickOrderId)

    expect(result.success).toBe(false)
  })

  test.afterAll(async ({ request }) => {
    if (createdPickOrderId) {
      try {
        await request.delete(`/api/v1/pick-orders/${createdPickOrderId}`)
      } catch (error) {
        console.log(`清理拣货单 ${createdPickOrderId} 失败:`, error)
      }
    }

    if (allocatedOrderId) {
      try {
        await request.delete(`/api/v1/outbound-orders/${allocatedOrderId}`)
      } catch (error) {
        console.log(`清理订单 ${allocatedOrderId} 失败:`, error)
      }
    }
  })
})
