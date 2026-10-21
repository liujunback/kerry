import { expect,test,type Page } from '@playwright/test'
import {
batchAllocateInventory,
cancelWave,
createOutboundOrder,
createWave,
getOutboundOrderDetail,
getWaveDetail,
getWavePickList,
prepareAvailableInventoryForOutbound,
} from '../../fixtures/api-helpers'
import { loginAsAdmin } from '../../fixtures/auth-helpers'
import {
E2E_CLIENT_CODE,
E2E_SKU_CODES,
E2E_WAREHOUSE_CODE,
generateAddress,
generateOutboundTestData,
} from '../../fixtures/test-data'

test.describe.serial('波次管理', () => {
  const testData = generateOutboundTestData('WV')
  const address = generateAddress('WV')

  let warehouseId: string
  let clientId: string
  let allocatedOrderIds: string[] = []
  let createdWaveId: string
  let createdWaveNumber: string

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

    const prepResult = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 100,
    })
    expect(prepResult.success).toBe(true)

    allocatedOrderIds = []
    for (let i = 0; i < 3; i++) {
      const createResult = await createOutboundOrder(page, {
        clientCode: E2E_CLIENT_CODE,
        warehouseCode: E2E_WAREHOUSE_CODE,
        referenceNumber: `REF-WAVE-${testData.timestamp}-${i}`,
        address,
        lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 5 }],
      })
      expect(createResult.success).toBe(true)
      allocatedOrderIds.push(createResult.data.id)
    }

    console.log(`创建了 ${allocatedOrderIds.length} 个订单用于波次测试`)

    for (const orderId of allocatedOrderIds) {
      const initialDetail = await getOutboundOrderDetail(page, orderId)
      expect(initialDetail.success).toBe(true)

      if (initialDetail.data?.status !== 'ALLOCATED') {
        const allocResult = await batchAllocateInventory(page, [orderId])
        if (!allocResult.success) {
          console.log(`订单 ${orderId} 分配结果:`, allocResult.message)
        }
      }

      const detail = await waitForOrderStatus(page, orderId, 'ALLOCATED')
      expect(detail?.success).toBe(true)
      expect(detail?.data?.status).toBe('ALLOCATED')
      console.log(`订单 ${orderId} 状态: ${detail.data?.status}`)
    }
  })

  test('创建波次应该成功', async ({ page }) => {
    expect(allocatedOrderIds.length).toBeGreaterThanOrEqual(2)

    const result = await createWave(page, {
      warehouseId,
      waveType: 'STANDARD',
      pickStrategy: 'ORDER',
      orderIds: allocatedOrderIds.slice(0, 2),
      priority: 'HIGH',
      notes: '测试波次',
    })

    if (!result.success) {
      console.log('波次创建失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.id).toBeDefined()
    expect(result.data.waveNumber).toBeDefined()

    createdWaveId = result.data.id
    createdWaveNumber = result.data.waveNumber

    console.log('创建的波次:', { id: createdWaveId, waveNumber: createdWaveNumber })

    for (const orderId of allocatedOrderIds.slice(0, 2)) {
      const detail = await getOutboundOrderDetail(page, orderId)
      expect(['IN_WAVE', 'PENDING_PICK']).toContain(detail.data.status)
    }
  })

  test('查询波次详情应该返回正确数据', async ({ page }) => {
    test.skip(!createdWaveId, '缺少已创建波次，前置用例未完成')

    const result = await getWaveDetail(page, createdWaveId)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.id).toBe(createdWaveId)
    expect(result.data.waveNumber).toBe(createdWaveNumber)
    expect(result.data.status).toBeDefined()
    expect(result.data.orders).toBeDefined()
    expect(result.data.orders.length).toBeGreaterThan(0)
  })

  test('获取波次拣货清单应该成功', async ({ page }) => {
    test.skip(!createdWaveId, '缺少已创建波次，前置用例未完成')

    const result = await getWavePickList(page, [createdWaveId])
    if (!result.success) {
      console.log('获取拣货清单失败:', JSON.stringify(result, null, 2))
    }

    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
  })

  test('单个新建订单创建波次的行为应符合当前分配策略', async ({ page }) => {
    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-WAVE-PENDING-${Date.now()}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 3 }],
    })
    expect(createResult.success).toBe(true)

    const orderId = createResult.data.id
    const detail = await getOutboundOrderDetail(page, orderId)
    expect(detail.success).toBe(true)

    const result = await createWave(page, {
      warehouseId,
      orderIds: [orderId],
    })

    expect(['PENDING', 'ALLOCATED']).toContain(detail.data?.status)
    expect(result.success).toBe(true)
  })

  test('创建波次使用空订单列表应该失败', async ({ page }) => {
    const result = await createWave(page, {
      warehouseId,
      orderIds: [],
    })

    expect(result.success).toBe(false)
  })

  test('取消不存在的波次应该失败', async ({ page }) => {
    const result = await cancelWave(page, 'non-existent-wave-id')

    expect(result.success).toBe(false)
  })

  test.afterAll(async ({ request }) => {
    if (createdWaveId) {
      try {
        await request.delete(`/api/v1/waves/${createdWaveId}`)
      } catch (error) {
        console.log(`清理波次 ${createdWaveId} 失败:`, error)
      }
    }

    for (const id of allocatedOrderIds) {
      try {
        await request.delete(`/api/v1/outbound-orders/${id}`)
      } catch (error) {
        console.log(`清理订单 ${id} 失败:`, error)
      }
    }
  })
})
