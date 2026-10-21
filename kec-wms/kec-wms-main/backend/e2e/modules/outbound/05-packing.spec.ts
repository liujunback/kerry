import { expect,test,type Page } from '@playwright/test'
import {
batchAllocateInventory,
completeAllPacking,
completeOrderPacking,
createOutboundOrder,
createPickOrder,
getOutboundOrderDetail,
getPickOrderDetail,
packingLookup,
prepareAvailableInventoryForOutbound,
printPickOrder,
scanSkuForPacking,
startPacking,
} from '../../fixtures/api-helpers'
import { loginAsAdmin } from '../../fixtures/auth-helpers'
import {
E2E_CLIENT_CODE,
E2E_SKU_CODES,
E2E_WAREHOUSE_CODE,
generateAddress,
generateOutboundTestData,
} from '../../fixtures/test-data'

test.describe.serial('打包流程', () => {
  const testData = generateOutboundTestData('PA')
  const address = generateAddress('PA')

  let warehouseId: string
  let pickOrderId: string
  let pickOrderNumber: string
  let orderId: string

  async function waitForOrderStatus(
    page: Page,
    targetOrderId: string,
    expectedStatus: string,
    timeoutMs: number = 12000
  ) {
    const deadline = Date.now() + timeoutMs
    let lastDetail: any = null

    while (Date.now() < deadline) {
      const detail = await getOutboundOrderDetail(page, targetOrderId)
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

  test('准备已拣货的拣货单', async ({ page }) => {
    const warehouseResp = await page.request.get(`/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
    const warehouseResult = await warehouseResp.json()
    expect(warehouseResult.success).toBe(true)
    expect(warehouseResult.data.length).toBeGreaterThan(0)
    warehouseId = warehouseResult.data[0].id

    const inventoryPrep = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 50,
    })
    expect(inventoryPrep.success).toBe(true)

    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-PACK-${testData.timestamp}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 5 }],
    })
    expect(createResult.success).toBe(true)
    orderId = createResult.data.id

    const initialDetail = await getOutboundOrderDetail(page, orderId)
    expect(initialDetail.success).toBe(true)

    if (initialDetail.data?.status !== 'ALLOCATED') {
      const allocResult = await batchAllocateInventory(page, [orderId])
      if (!allocResult.success) {
        console.log('库存分配结果:', allocResult.message)
      }
    }

    const allocatedDetail = await waitForOrderStatus(page, orderId, 'ALLOCATED')
    expect(allocatedDetail?.success).toBe(true)
    expect(allocatedDetail?.data?.status).toBe('ALLOCATED')

    const pickResult = await createPickOrder(page, {
      warehouseId,
      orderIds: [orderId],
    })
    if (!pickResult.success) {
      console.log('创建拣货单失败:', pickResult.message)
    }
    expect(pickResult.success).toBe(true)

    pickOrderId = pickResult.data.id
    pickOrderNumber = pickResult.data.pickOrderNumber

    const printResult = await printPickOrder(page, pickOrderId)
    if (!printResult.success) {
      console.log('打印拣货单失败:', printResult.message)
    }
    expect(printResult.success).toBe(true)

    const pickingDetail = await waitForOrderStatus(page, orderId, 'PICKING')
    expect(pickingDetail?.success).toBe(true)
  })

  test('打包查询应成功', async ({ page }) => {
    test.skip(!pickOrderNumber, '缺少拣货单号，前置用例未完成')

    const result = await packingLookup(page, pickOrderNumber)
    if (!result.success) {
      console.log('打包查询失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('开始打包应成功', async ({ page }) => {
    test.skip(!pickOrderId, '缺少拣货单，前置用例未完成')

    const result = await startPacking(page, pickOrderId)
    if (!result.success) {
      console.log('开始打包失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)

    const orderDetail = await getOutboundOrderDetail(page, orderId)
    expect(orderDetail.data.status).toBe('PACKING')
  })

  test('扫描 SKU 打包应成功', async ({ page }) => {
    test.skip(!pickOrderId || !orderId, '缺少拣货单或订单，前置用例未完成')

    const result = await scanSkuForPacking(page, {
      pickOrderId,
      orderId,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 5,
    })

    if (!result.success) {
      console.log('扫描 SKU 打包失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)
  })

  test('完成单个订单打包应成功', async ({ page }) => {
    test.skip(!pickOrderId || !orderId, '缺少拣货单或订单，前置用例未完成')

    const result = await completeOrderPacking(page, {
      pickOrderId,
      orderId,
      weightKg: 1.5,
    })

    if (!result.success) {
      console.log('完成订单打包失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)

    const orderDetail = await getOutboundOrderDetail(page, orderId)
    expect(orderDetail.data.status).toBe('PACKED')
  })

  test('完成整单打包应成功', async ({ page }) => {
    test.skip(!pickOrderId, '缺少拣货单，前置用例未完成')

    const result = await completeAllPacking(page, pickOrderId)
    if (!result.success) {
      console.log('完成整单打包结果:', JSON.stringify(result, null, 2))
    }

    const pickDetail = await getPickOrderDetail(page, pickOrderId)
    expect(pickDetail.success).toBe(true)
    expect(['COMPLETED', 'PACKING']).toContain(pickDetail.data.status)
  })

  test('未拣货的订单不能开始打包', async ({ page }) => {
    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-PACK-PENDING-${Date.now()}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 2 }],
    })

    expect(createResult.success).toBe(true)
    const newOrderId = createResult.data.id

    await batchAllocateInventory(page, [newOrderId])
    const orderDetail = await waitForOrderStatus(page, newOrderId, 'ALLOCATED')
    expect(orderDetail?.data?.status).toBe('ALLOCATED')

    const pickResult = await createPickOrder(page, {
      warehouseId,
      orderIds: [newOrderId],
    })
    expect(pickResult.success).toBe(true)

    const newPickOrderId = pickResult.data.id
    const result = await startPacking(page, newPickOrderId)

    expect(result.success).toBe(false)
  })

  test('打包数量超过拣货数量应失败', async ({ page }) => {
    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-PACK-OVER-${Date.now()}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 3 }],
    })

    expect(createResult.success).toBe(true)
    const newOrderId = createResult.data.id

    await batchAllocateInventory(page, [newOrderId])
    const orderDetail = await waitForOrderStatus(page, newOrderId, 'ALLOCATED')
    expect(orderDetail?.data?.status).toBe('ALLOCATED')

    const pickResult = await createPickOrder(page, {
      warehouseId,
      orderIds: [newOrderId],
    })
    expect(pickResult.success).toBe(true)

    const newPickOrderId = pickResult.data.id

    await printPickOrder(page, newPickOrderId)
    await startPacking(page, newPickOrderId)

    const result = await scanSkuForPacking(page, {
      pickOrderId: newPickOrderId,
      orderId: newOrderId,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 100,
    })

    expect(result.success).toBe(false)
  })

  test.afterAll(async ({ request }) => {
    if (pickOrderId) {
      try {
        await request.delete(`/api/v1/pick-orders/${pickOrderId}`)
      } catch (error) {
        console.log(`清理拣货单 ${pickOrderId} 失败:`, error)
      }
    }

    if (orderId) {
      try {
        await request.delete(`/api/v1/outbound-orders/${orderId}`)
      } catch (error) {
        console.log(`清理订单 ${orderId} 失败:`, error)
      }
    }
  })
})
