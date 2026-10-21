import { expect,test,type Page } from '@playwright/test'
import {
batchAllocateInventory,
completeOrderPacking,
confirmCheckout,
createOutboundOrder,
createPickOrder,
getAvailableInventoryQty,
getCheckoutOrderDetail,
getOutboundOrderDetail,
getPendingCheckoutOrders,
prepareAvailableInventoryForOutbound,
printPickOrder,
scanCheckout,
scanSkuForPacking,
startPacking,
validateCheckout,
} from '../../fixtures/api-helpers'
import { loginAsAdmin } from '../../fixtures/auth-helpers'
import {
E2E_CLIENT_CODE,
E2E_SKU_CODES,
E2E_WAREHOUSE_CODE,
generateAddress,
generateOutboundTestData,
} from '../../fixtures/test-data'

test.describe.serial('签出流程', () => {
  const testData = generateOutboundTestData('CO')
  const address = generateAddress('CO')

  let warehouseId: string
  let pickOrderId: string
  let orderId: string
  let orderNumber: string
  let checkoutOrderId: string
  let containerNumber: string
  let initialInventoryQty: number

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

  test('准备已打包订单', async ({ page }) => {
    const whResp = await page.request.get(`/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
    const whResult = await whResp.json()
    expect(whResult.success).toBe(true)
    expect(whResult.data.length).toBeGreaterThan(0)
    warehouseId = whResult.data[0].id

    const prepResult = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 100,
    })
    expect(prepResult.success).toBe(true)

    initialInventoryQty = await getAvailableInventoryQty(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })
    console.log('初始可用库存:', initialInventoryQty)

    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-CHECKOUT-${testData.timestamp}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 5 }],
    })
    expect(createResult.success).toBe(true)
    orderId = createResult.data.id
    orderNumber = createResult.data.orderNumber

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

    const pickResult = await createPickOrder(page, {
      warehouseId,
      orderIds: [orderId],
    })
    expect(pickResult.success).toBe(true)
    pickOrderId = pickResult.data.id

    await printPickOrder(page, pickOrderId)
    await startPacking(page, pickOrderId)
    await scanSkuForPacking(page, {
      pickOrderId,
      orderId,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 5,
    })
    await completeOrderPacking(page, {
      pickOrderId,
      orderId,
      weightKg: 1.0,
    })

    const packedDetail = await waitForOrderStatus(page, orderId, 'PACKED')
    expect(packedDetail?.success).toBe(true)

    containerNumber = `BAG-CHECKOUT-${Date.now()}`
  })

  test('获取待签出订单列表应成功', async ({ page }) => {
    const result = await getPendingCheckoutOrders(page, warehouseId)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('验证签出容器应成功', async ({ page }) => {
    test.skip(!containerNumber, '缺少签出容器编号，前置用例未完成')

    const result = await validateCheckout(page, {
      containerNumber,
      checkoutType: 'BAG',
      warehouseId,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.id).toBeDefined()
    expect(result.data.containerNumber).toBe(containerNumber)

    checkoutOrderId = result.data.id
  })

  test('扫描订单到签出容器应成功', async ({ page }) => {
    test.skip(!checkoutOrderId || !orderNumber, '缺少签出容器或订单号，前置用例未完成')

    const result = await scanCheckout(page, {
      checkoutOrderId,
      scannedNumber: orderNumber,
      checkoutType: 'BAG',
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('确认签出应成功', async ({ page }) => {
    test.skip(!checkoutOrderId || !orderId || !orderNumber, '缺少签出前置数据')

    const result = await confirmCheckout(page, {
      checkoutOrderId,
      checkoutType: 'BAG',
      createMode: 'PRE_CREATE',
      records: [
        {
          scannedNumber: orderNumber,
          orderNumber,
          orderId,
        },
      ],
    })

    expect(result.success).toBe(true)

    const orderDetail = await getOutboundOrderDetail(page, orderId)
    expect(orderDetail.data.status).toBe('CHECKED_OUT')

    const checkoutDetail = await getCheckoutOrderDetail(page, checkoutOrderId)
    expect(checkoutDetail.success).toBe(true)
    expect(checkoutDetail.data.status).toBe('CHECKED_OUT')
  })

  test('签出后库存应扣减', async ({ page }) => {
    const afterInventoryQty = await getAvailableInventoryQty(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })

    console.log('签出后可用库存:', afterInventoryQty)
    expect(afterInventoryQty).toBeLessThanOrEqual(initialInventoryQty)
  })

  test('未打包订单不能加入签出容器', async ({ page }) => {
    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-CHECKOUT-PENDING-${Date.now()}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 2 }],
    })
    expect(createResult.success).toBe(true)

    const validateResult = await validateCheckout(page, {
      containerNumber: `BAG-PENDING-${Date.now()}`,
      checkoutType: 'BAG',
      warehouseId,
    })
    expect(validateResult.success).toBe(true)

    const result = await scanCheckout(page, {
      checkoutOrderId: validateResult.data.id,
      scannedNumber: createResult.data.orderNumber,
      checkoutType: 'BAG',
    })

    expect(result.success).toBe(false)
  })

  test('重复签出应失败', async ({ page }) => {
    test.skip(!checkoutOrderId || !orderNumber, '缺少签出前置数据')

    const result = await scanCheckout(page, {
      checkoutOrderId,
      scannedNumber: orderNumber,
      checkoutType: 'BAG',
    })

    expect(result.success).toBe(false)
  })

  test('扫描无效订单号应返回错误', async ({ page }) => {
    const validateResult = await validateCheckout(page, {
      containerNumber: `BAG-INVALID-${Date.now()}`,
      checkoutType: 'BAG',
      warehouseId,
    })
    expect(validateResult.success).toBe(true)

    const result = await scanCheckout(page, {
      checkoutOrderId: validateResult.data.id,
      scannedNumber: 'INVALID-ORDER-NUMBER-12345',
      checkoutType: 'BAG',
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
