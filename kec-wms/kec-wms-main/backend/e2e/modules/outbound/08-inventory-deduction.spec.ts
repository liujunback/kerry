import { expect,test,type Page } from '@playwright/test'
import {
batchAllocateInventory,
completeOrderPacking,
confirmCheckout,
createOutboundOrder,
createPickOrder,
getAvailableInventoryQty,
getInventory,
getOutboundOrderDetail,
prepareAvailableInventoryForOutbound,
printPickOrder,
rollbackAllocation,
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

test.describe.serial('出库库存扣减', () => {
  const testData = generateOutboundTestData('IV')
  const address = generateAddress('IV')

  let warehouseId: string
  let clientId: string
  let initialInventoryQty: number
  let testOrderId: string
  let testOrderNumber: string
  let testPickOrderId: string

  const ORDER_STATUS_POLL_INTERVAL_MS = 500
  const ORDER_STATUS_TIMEOUT_MS = 12000

  async function waitForOrderStatus(
    page: Page,
    orderId: string,
    expectedStatus: string,
    timeoutMs: number = ORDER_STATUS_TIMEOUT_MS
  ): Promise<{ matched: boolean; detail: any; lastStatus?: string }> {
    const deadline = Date.now() + timeoutMs
    let lastDetail: any = null
    let lastStatus: string | undefined

    while (Date.now() < deadline) {
      const detail = await getOutboundOrderDetail(page, orderId)
      lastDetail = detail

      if (detail.success && detail.data?.status) {
        lastStatus = detail.data.status
        if (detail.data.status === expectedStatus) {
          return { matched: true, detail, lastStatus }
        }
      }

      await page.waitForTimeout(ORDER_STATUS_POLL_INTERVAL_MS)
    }

    return { matched: false, detail: lastDetail, lastStatus }
  }

  async function waitForAvailableInventoryQty(
    page: Page,
    expectedQty: number,
    timeoutMs: number = ORDER_STATUS_TIMEOUT_MS
  ): Promise<number> {
    const deadline = Date.now() + timeoutMs
    let lastQty = -1

    while (Date.now() < deadline) {
      lastQty = await getAvailableInventoryQty(page, {
        skuCode: E2E_SKU_CODES.normal,
        warehouseId,
      })

      if (lastQty === expectedQty) {
        return lastQty
      }

      await page.waitForTimeout(ORDER_STATUS_POLL_INTERVAL_MS)
    }

    return lastQty
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('准备可用库存', async ({ page }) => {
    const clientResp = await page.request.get(`/api/v1/clients?search=${E2E_CLIENT_CODE}`)
    const clientResult = await clientResp.json()
    expect(clientResult.success).toBe(true)
    expect(clientResult.data.length).toBeGreaterThan(0)
    clientId = clientResult.data[0].id

    const warehouseResp = await page.request.get(`/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
    const warehouseResult = await warehouseResp.json()
    expect(warehouseResult.success).toBe(true)
    expect(warehouseResult.data.length).toBeGreaterThan(0)
    warehouseId = warehouseResult.data[0].id

    const prepResult = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 200,
    })

    if (!prepResult.success) {
      console.log('库存准备提示:', 'message' in prepResult ? prepResult.message : 'unknown')
    }

    initialInventoryQty = await getAvailableInventoryQty(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })

    console.log('初始可用库存:', initialInventoryQty)
    expect(initialInventoryQty).toBeGreaterThan(0)
  })

  test('分配后可用库存应减少', async ({ page }) => {
    const orderQty = 10

    const beforeQty = await getAvailableInventoryQty(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })
    console.log('分配前可用库存:', beforeQty)
    expect(beforeQty).toBeGreaterThanOrEqual(orderQty)

    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-INV-ALLOC-${testData.timestamp}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: orderQty }],
    })
    expect(createResult.success).toBe(true)
    testOrderId = createResult.data.id
    testOrderNumber = createResult.data.orderNumber

    const allocResult = await batchAllocateInventory(page, [testOrderId])
    if (!allocResult.success) {
      console.log('库存分配结果:', allocResult.message)
    }

    const allocationState = await waitForOrderStatus(page, testOrderId, 'ALLOCATED')
    expect(allocationState.matched).toBe(true)

    const afterQty = await waitForAvailableInventoryQty(page, beforeQty - orderQty)
    console.log('分配后可用库存:', afterQty)

    expect(afterQty).toBeLessThan(beforeQty)
    expect(beforeQty - afterQty).toBe(orderQty)
  })

  test('回退分配后可用库存应恢复', async ({ page }) => {
    test.skip(!testOrderId, '缺少上一条用例创建的测试订单，无法执行回退验证')

    const orderDetail = await getOutboundOrderDetail(page, testOrderId)
    expect(orderDetail.success).toBe(true)
    test.skip(orderDetail.data?.status !== 'ALLOCATED', `订单状态不是 ALLOCATED，当前为 ${orderDetail.data?.status}`)

    const beforeQty = await getAvailableInventoryQty(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })
    console.log('回退前可用库存:', beforeQty)

    const rollbackResult = await rollbackAllocation(page, testOrderId)
    if (!rollbackResult.success) {
      console.log('回退分配失败:', JSON.stringify(rollbackResult, null, 2))
    }
    expect(rollbackResult.success).toBe(true)

    const rollbackState = await waitForOrderStatus(page, testOrderId, 'PENDING')
    expect(rollbackState.matched).toBe(true)

    const afterQty = await getAvailableInventoryQty(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })
    console.log('回退后可用库存:', afterQty)

    expect(afterQty).toBeGreaterThanOrEqual(beforeQty)
  })

  test('完整出库流程后库存应正确扣减', async ({ page }) => {
    const orderQty = 5

    const startQty = await getAvailableInventoryQty(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })
    console.log('流程开始前可用库存:', startQty)
    expect(startQty).toBeGreaterThanOrEqual(orderQty)

    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-INV-FULL-${Date.now()}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: orderQty }],
    })
    expect(createResult.success).toBe(true)
    const fullTestOrderId = createResult.data.id
    const fullTestOrderNumber = createResult.data.orderNumber

    const initialDetail = await getOutboundOrderDetail(page, fullTestOrderId)
    expect(initialDetail.success).toBe(true)

    if (initialDetail.data?.status !== 'ALLOCATED') {
      const allocResult = await batchAllocateInventory(page, [fullTestOrderId])
      if (!allocResult.success) {
        console.log('完整流程分配结果:', allocResult.message)
      }
    }

    const allocatedState = await waitForOrderStatus(page, fullTestOrderId, 'ALLOCATED')
    expect(allocatedState.matched).toBe(true)

    const afterAllocQty = await waitForAvailableInventoryQty(page, startQty - orderQty)
    console.log('分配后可用库存:', afterAllocQty)
    expect(startQty - afterAllocQty).toBe(orderQty)

    const pickResult = await createPickOrder(page, {
      warehouseId,
      orderIds: [fullTestOrderId],
    })
    if (!pickResult.success) {
      console.log('创建拣货单失败:', pickResult.message)
    }
    expect(pickResult.success).toBe(true)
    testPickOrderId = pickResult.data.id

    const printResult = await printPickOrder(page, testPickOrderId)
    expect(printResult.success).toBe(true)

    const startPackingResult = await startPacking(page, testPickOrderId)
    expect(startPackingResult.success).toBe(true)

    const scanPackingResult = await scanSkuForPacking(page, {
      pickOrderId: testPickOrderId,
      orderId: fullTestOrderId,
      skuCode: E2E_SKU_CODES.normal,
      quantity: orderQty,
    })
    expect(scanPackingResult.success).toBe(true)

    const completeOrderPackingResult = await completeOrderPacking(page, {
      pickOrderId: testPickOrderId,
      orderId: fullTestOrderId,
      weightKg: 0.5,
    })
    expect(completeOrderPackingResult.success).toBe(true)

    const packedState = await waitForOrderStatus(page, fullTestOrderId, 'PACKED')
    expect(packedState.matched).toBe(true)

    const confirmResult = await confirmCheckout(page, {
      checkoutType: 'BAG',
      createMode: 'AUTO_GENERATE',
      warehouseId,
      records: [
        {
          scannedNumber: fullTestOrderNumber,
          orderNumber: fullTestOrderNumber,
          orderId: fullTestOrderId,
        },
      ],
    })
    if (!confirmResult.success) {
      console.log('确认签出失败:', confirmResult.message)
    }
    expect(confirmResult.success).toBe(true)

    const checkedOutState = await waitForOrderStatus(page, fullTestOrderId, 'CHECKED_OUT')
    expect(checkedOutState.matched).toBe(true)

    const finalQty = await getAvailableInventoryQty(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })
    console.log('流程完成后可用库存:', finalQty)

    expect(finalQty).toBe(startQty - orderQty)
  })

  test('库存明细查询应返回有效数据', async ({ page }) => {
    test.skip(!warehouseId, '缺少仓库 ID，前置用例未完成')

    const result = await getInventory(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })

    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)

    console.log('库存详情:', JSON.stringify(result.data, null, 2))
  })

  test.afterAll(async ({ request }) => {
    if (testPickOrderId) {
      try {
        await request.delete(`/api/v1/pick-orders/${testPickOrderId}`)
      } catch (error) {
        console.log(`清理拣货单 ${testPickOrderId} 失败:`, error)
      }
    }

    if (testOrderId) {
      try {
        await request.delete(`/api/v1/outbound-orders/${testOrderId}`)
      } catch (error) {
        console.log(`清理订单 ${testOrderId} 失败:`, error)
      }
    }
  })
})
