import { expect,test,type Page } from '@playwright/test'
import {
apiRequest,
batchAllocateInventory,
completeSorting,
createOutboundOrder,
createPickOrder,
getActiveSortingTask,
getOutboundOrderDetail,
getSortingWalls,
prepareAvailableInventoryForOutbound,
printPickOrder,
scanSkuForSorting,
startSorting,
} from '../../fixtures/api-helpers'
import { loginAsAdmin } from '../../fixtures/auth-helpers'
import {
E2E_CLIENT_CODE,
E2E_SKU_CODES,
E2E_WAREHOUSE_CODE,
generateAddress,
generateOutboundTestData,
} from '../../fixtures/test-data'

test.describe.serial('二次分拣', () => {
  const testData = generateOutboundTestData('ST')
  const address = generateAddress('ST')

  let warehouseId: string
  let sortingWallId: string
  let createdSortingWallId: string | undefined
  let pickOrderId: string
  let pickOrderNumber: string
  let orderId: string
  let sortingTaskId: string

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

  async function ensureSortingWall(page: Page, warehouseId: string) {
    const wallsResult = await getSortingWalls(page, warehouseId)
    expect(wallsResult.success).toBe(true)

    if (wallsResult.data?.length > 0) {
      sortingWallId = wallsResult.data[0].id
      return
    }

    const response = await apiRequest(page, 'POST', '/api/v1/sorting-walls', {
      data: {
        warehouseId,
        wallCode: `E2E-SW-${Date.now()}`,
        wallName: 'E2E 自动播种墙',
        horizontalCells: 2,
        verticalCells: 2,
      },
    })
    const result = await response.json()
    expect(result.success).toBe(true)

    sortingWallId = result.data.id
    createdSortingWallId = result.data.id
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('准备已拣货的拣货单和可用播种墙', async ({ page }) => {
    const whResp = await page.request.get(`/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
    const whResult = await whResp.json()
    expect(whResult.success).toBe(true)
    expect(whResult.data.length).toBeGreaterThan(0)
    warehouseId = whResult.data[0].id

    const inventoryPrep = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 20,
    })
    expect(inventoryPrep.success).toBe(true)

    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-SORT-${testData.timestamp}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 1 }],
    })
    expect(createResult.success).toBe(true)
    orderId = createResult.data.id

    const orderDetail = await getOutboundOrderDetail(page, orderId)
    expect(orderDetail.success).toBe(true)

    if (orderDetail.data?.status !== 'ALLOCATED') {
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
    expect(pickResult.success).toBe(true)

    pickOrderId = pickResult.data.id
    pickOrderNumber = pickResult.data.pickOrderNumber

    const printResult = await printPickOrder(page, pickOrderId)
    expect(printResult.success).toBe(true)

    await ensureSortingWall(page, warehouseId)

    console.log('测试数据准备完成:', { pickOrderId, pickOrderNumber, orderId, sortingWallId })
  })

  test('获取可用播种墙列表应该成功', async ({ page }) => {
    const result = await getSortingWalls(page, warehouseId)
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
  })

  test('开始分拣任务应该成功', async ({ page }) => {
    test.skip(!pickOrderNumber || !sortingWallId, '缺少拣货单或播种墙，前置用例未完成')

    const result = await startSorting(page, {
      scanCode: pickOrderNumber,
      sortingWallId,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data.task.id).toBeDefined()

    sortingTaskId = result.data.task.id

    const orderDetail = await getOutboundOrderDetail(page, orderId)
    expect(orderDetail.data.status).toBe('SORTING')
  })

  test('扫描 SKU 分拣应该成功', async ({ page }) => {
    test.skip(!sortingTaskId, '缺少分拣任务，前置用例未完成')

    const result = await scanSkuForSorting(page, {
      sortingTaskId,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 1,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('完成分拣任务应该成功', async ({ page }) => {
    test.skip(!sortingTaskId, '缺少分拣任务，前置用例未完成')

    const result = await completeSorting(page, sortingTaskId)
    expect(result.success).toBe(true)

    const orderDetail = await getOutboundOrderDetail(page, orderId)
    expect(orderDetail.data.status).toBe('SORTED')

    const activeTask = await getActiveSortingTask(page, sortingWallId)
    expect(activeTask.success).toBe(true)
  })

  test('未拣货的拣货单不能开始分拣', async ({ page }) => {
    test.skip(!sortingWallId, '缺少播种墙，前置用例未完成')

    const createResult = await createOutboundOrder(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      referenceNumber: `REF-SORT-PENDING-${Date.now()}`,
      address,
      lines: [{ skuCode: E2E_SKU_CODES.normal, orderedQty: 2 }],
    })
    expect(createResult.success).toBe(true)

    const newOrderId = createResult.data.id
    await batchAllocateInventory(page, [newOrderId])
    const allocatedDetail = await waitForOrderStatus(page, newOrderId, 'ALLOCATED')
    expect(allocatedDetail?.data?.status).toBe('ALLOCATED')

    const pickResult = await createPickOrder(page, {
      warehouseId,
      orderIds: [newOrderId],
    })
    expect(pickResult.success).toBe(true)

    const pendingPickOrderNumber = pickResult.data.pickOrderNumber
    const result = await startSorting(page, {
      scanCode: pendingPickOrderNumber,
      sortingWallId,
    })

    expect(result.success).toBe(false)
  })

  test('扫描错误的 SKU 应该失败', async ({ page }) => {
    test.skip(!sortingTaskId, '缺少分拣任务，前置用例未完成')

    const result = await scanSkuForSorting(page, {
      sortingTaskId,
      skuCode: 'NON-EXISTENT-SKU',
      quantity: 1,
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

    if (createdSortingWallId) {
      try {
        await request.delete(`/api/v1/sorting-walls/${createdSortingWallId}`)
      } catch (error) {
        console.log(`清理播种墙 ${createdSortingWallId} 失败:`, error)
      }
    }
  })
})
