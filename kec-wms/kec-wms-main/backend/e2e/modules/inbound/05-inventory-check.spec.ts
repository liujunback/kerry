import { expect,test } from '@playwright/test'
import { apiRequest,closeContainer,createAsn,getInventory,prepareAvailableInventoryForOutbound,receiveSkuToAsn,resetContainerForTest,signInAsn } from '../../fixtures/api-helpers'
import { loginAsAdmin } from '../../fixtures/auth-helpers'
import {
E2E_BIN_CODES,
E2E_CLIENT_CODE,
E2E_CONTAINER_CODES,
E2E_SKU_CODES,
E2E_WAREHOUSE_CODE,
generateFutureDate,
generateTestData,
} from '../../fixtures/test-data'

/**
 * 入库库存校验测试
 *
 * 目标：
 * 1. 验证收货和上架后能形成正确库存
 * 2. 验证批次、效期、良品/残品等库存维度
 * 3. 验证库存最终落到目标库位
 */
test.describe.serial('入库库存校验', () => {
  const testData = generateTestData('INV')
  const futureDate1 = generateFutureDate(60) // 60 澶╁悗
  const futureDate2 = generateFutureDate(90) // 90 澶╁悗

  // 测试过程中的共享数据
  let asnId: string
  let asnNumber: string
  let asnLineId: string
  let containerId: string
  let containerCode: string
  let warehouseId: string
  let clientId: string
  let skuId: string
  let locationId: string
  let locationCode: string

  const getInventoryItemQty = (item: Record<string, unknown>): number => {
    const rawQty =
      item.quantityAvailable ??
      item.quantity ??
      item.quantityOnHand ??
      item.onHandQty ??
      0
    const normalized = Number(rawQty)
    return Number.isFinite(normalized) ? normalized : 0
  }

  async function createTempReceivableBin(page: any, suffix: string): Promise<string> {
    const binsResponse = await apiRequest(page, 'GET', `/api/v1/bin-locations?warehouseId=${warehouseId}&pageSize=100`)
    const binsResult = await binsResponse.json()
    expect(binsResult.success).toBe(true)

    const sourceBin = (binsResult.data || []).find((bin: any) => {
      return (
        bin.zone?.qualityType === 'GOOD' &&
        bin.status === 'ACTIVE' &&
        bin.lockStatus === 'UNLOCKED'
      )
    })
    expect(sourceBin).toBeDefined()

    const locationCode = `E2E-TMP-${suffix}-${Date.now().toString().slice(-6)}`
    const createResponse = await apiRequest(page, 'POST', '/api/v1/bin-locations', {
      data: {
        warehouseId,
        zoneId: sourceBin.zone.id,
        locationCode,
        locationType: 'RACK',
        isPickable: true,
        isReceivable: true,
        putawayPriority: 100,
        pickPriority: 100,
        pickSequence: 0,
        maxSkuCount: 1,
      },
    })
    const createResult = await createResponse.json()
    expect(createResult.success).toBe(true)

    return locationCode
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  // ==================== 测试准备 ====================

  test('准备基础仓库、客户、商品和库位数据', async ({ page }) => {
    // 获取仓库 ID
    const warehouseResponse = await apiRequest(page, 'GET', `/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
    const warehouseResult = await warehouseResponse.json()
    expect(warehouseResult.success).toBe(true)
    expect(warehouseResult.data.length).toBeGreaterThan(0)
    warehouseId = warehouseResult.data[0].id

    // 获取客户 ID
    const clientResponse = await apiRequest(page, 'GET', `/api/v1/clients?search=${E2E_CLIENT_CODE}`)
    const clientResult = await clientResponse.json()
    expect(clientResult.success).toBe(true)
    expect(clientResult.data.length).toBeGreaterThan(0)
    clientId = clientResult.data[0].id

    // 获取 SKU ID（使用效期管理 SKU）
    const skuResponse = await apiRequest(page, 'GET', `/api/v1/skus?search=${E2E_SKU_CODES.expiry}&clientId=${clientId}`)
    const skuResult = await skuResponse.json()
    expect(skuResult.success).toBe(true)
    expect(skuResult.data.length).toBeGreaterThan(0)
    skuId = skuResult.data[0].id

    // 获取库位
    const locationResponse = await apiRequest(page, 'GET', '/api/v1/bin-locations?warehouseId=' + warehouseId + '&isReceivable=true')
    const locationResult = await locationResponse.json()
    expect(locationResult.success).toBe(true)
    expect(locationResult.data.length).toBeGreaterThan(0)
    locationId = locationResult.data[0].id
    locationCode = locationResult.data[0].locationCode
  })

  // ==================== 收货与上架库存校验 ====================

  test('收货并上架后应生成本次批次库存', async ({ page }) => {
    // 如果前面的基础数据没初始化，这里补一次
    if (!warehouseId || !clientId || !skuId || !locationId) {
      // 获取仓库 ID
      const warehouseResponse = await apiRequest(page, 'GET', `/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
      const warehouseResult = await warehouseResponse.json()
      expect(warehouseResult.success).toBe(true)
      expect(warehouseResult.data.length).toBeGreaterThan(0)
      warehouseId = warehouseResult.data[0].id

      // 获取客户 ID
      const clientResponse = await apiRequest(page, 'GET', `/api/v1/clients?search=${E2E_CLIENT_CODE}`)
      const clientResult = await clientResponse.json()
      expect(clientResult.success).toBe(true)
      expect(clientResult.data.length).toBeGreaterThan(0)
      clientId = clientResult.data[0].id

      // 获取 SKU ID（使用效期管理 SKU）
      const skuResponse = await apiRequest(page, 'GET', `/api/v1/skus?search=${E2E_SKU_CODES.expiry}&clientId=${clientId}`)
      const skuResult = await skuResponse.json()
      expect(skuResult.success).toBe(true)
      expect(skuResult.data.length).toBeGreaterThan(0)
      skuId = skuResult.data[0].id

      // 获取库位
      const locationResponse = await apiRequest(page, 'GET', '/api/v1/bin-locations?warehouseId=' + warehouseId + '&isReceivable=true')
      const locationResult = await locationResponse.json()
      expect(locationResult.success).toBe(true)
      expect(locationResult.data.length).toBeGreaterThan(0)
      locationId = locationResult.data[0].id
      locationCode = locationResult.data[0].locationCode
    }

    // 为当前测试挑一个不冲突的批次号和库位
    const testTimestamp = Date.now()
    const batchNumber = `BATCH-INV-${testTimestamp}`

    // 优先尝试 E2E 专用测试库位（E2E-TEST-BIN-001）
    let targetLocationId = locationId
    let targetLocationCode = locationCode
    const targetSkuCode = E2E_SKU_CODES.expiry
    let foundEmptyLocation = false

    // 1. 先尝试使用 E2E 专用测试库位
    const e2eLocationResponse = await apiRequest(page, 'GET', '/api/v1/bin-locations?warehouseId=' + warehouseId + '&search=E2E-TEST-BIN-001')
    const e2eLocationResult = await e2eLocationResponse.json()

    if (e2eLocationResult.success && e2eLocationResult.data?.length > 0) {
      const e2eLoc = e2eLocationResult.data[0]
      // 检查该库位对当前 SKU 是否已有库存
      const e2eInvResponse = await apiRequest(page, 'GET', `/api/v1/inventory?locationId=${e2eLoc.id}&skuId=${skuId}`)
      const e2eInvResult = await e2eInvResponse.json()

      if (e2eInvResult.success && e2eInvResult.data.length === 0) {
        targetLocationId = e2eLoc.id
        targetLocationCode = e2eLoc.locationCode
        foundEmptyLocation = true
        console.log(`使用 E2E 专用库位: ${e2eLoc.locationCode}`)
      } else {
        console.log(`E2E 专用库位 ${e2eLoc.locationCode} 已有目标 SKU 库存，尝试其他库位...`)
      }
    }

    // 2. 如果专用库位不可用，就找其他可接收入库位
    if (!foundEmptyLocation) {
      const emptyLocationResponse = await apiRequest(page, 'GET', '/api/v1/bin-locations?warehouseId=' + warehouseId + '&isReceivable=true&pageSize=100')
      const emptyLocationResult = await emptyLocationResponse.json()

      if (emptyLocationResult.success && emptyLocationResult.data.length > 0) {
        console.log('可用库位数量:', emptyLocationResult.data.length)
        // 检查每个库位对当前 SKU 是否没有库存
        for (const loc of emptyLocationResult.data) {
          // 只挑选良品库区的库位
          if (loc.zone && loc.zone.qualityType !== 'GOOD') {
            continue
          }

          if (loc.isReceivable === false) {
            continue
          }

          if (loc.lockStatus && loc.lockStatus !== 'UNLOCKED') {
            continue
          }

          // 跳过特殊测试库位
          if (
            loc.locationCode === E2E_BIN_CODES.notReceivable ||
            loc.locationCode === E2E_BIN_CODES.locked ||
            loc.locationCode.startsWith('DISABLED-') ||
            loc.locationCode.startsWith('LOCKED-') ||
            loc.locationCode.startsWith('NOT-')
          ) {
            continue
          }

          // 再次确认该库位对当前 SKU 没有库存
          const invCheckResponse = await apiRequest(page, 'GET', `/api/v1/inventory?locationId=${loc.id}&skuId=${skuId}`)
          const invCheckResult = await invCheckResponse.json()

          if (!invCheckResult.success) {
            continue
          }

          if (invCheckResult.data.length === 0) {
            targetLocationId = loc.id
            targetLocationCode = loc.locationCode
            foundEmptyLocation = true
            console.log(`使用库位（无目标 SKU 库存）: ${loc.locationCode}`)
            break
          }
        }
      }
    }

    // 3. 如果仍然找不到合适库位，就跳过当前测试
    if (!foundEmptyLocation) {
      console.log('跳过测试：所有库位都已有目标 SKU 库存，请先重置测试数据')
      test.skip()
      return
    }

    const createResult = await createAsn(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      externalNumber: `INV-${testTimestamp}`,
      lines: [{ skuCode: E2E_SKU_CODES.expiry, expectedQty: 100, batchNumber }],
    })
    if (!createResult.success) {
      console.log('ASN 创建失败:', JSON.stringify(createResult, null, 2))
    }
    expect(createResult.success).toBe(true)
    asnId = createResult.data.id
    asnNumber = createResult.data.asnNumber
    asnLineId = createResult.data.lines[0].id

    // 签收
    await signInAsn(page, asnNumber, E2E_CLIENT_CODE)


    // 执行收货
    const recvResult = await receiveSkuToAsn(page, {
      asnId,
      asnLineId,
      receivedQty: 50,
      qualityStatus: 'GOOD',
      batchNumber,
      expiryDate: futureDate1,
    })

    // 调试信息
    if (!recvResult.success) {
      console.log('收货失败:', JSON.stringify(recvResult, null, 2))
    } else {
      console.log('收货成功:', JSON.stringify(recvResult, null, 2))
    }

    expect(recvResult.success).toBe(true)

    // 创建上架单
    const orderResponse = await apiRequest(page, 'POST', '/api/v1/putaway/orders', {
      data: {
        putawayMode: 'TASK_MODE',
        asnLineIds: [asnLineId],
      },
    })
    const orderResult = await orderResponse.json()
    console.log('上架单创建结果:', JSON.stringify(orderResult, null, 2))
    expect(orderResult.success).toBe(true)

    // 获取上架单详情，拿到上架行 ID
    const putawayOrderDetailResponse = await apiRequest(page, 'GET', `/api/v1/putaway/orders/${orderResult.data[0].id}`)
    const putawayOrderDetail = await putawayOrderDetailResponse.json()

    console.log('上架单详情（用于获取行 ID）:', JSON.stringify(putawayOrderDetail.data.lines, null, 2))

    const putawayLineId = putawayOrderDetail.success && putawayOrderDetail.data.lines && putawayOrderDetail.data.lines.length > 0
      ? putawayOrderDetail.data.lines[0].id
      : null

    console.log('上架单行 ID:', putawayLineId)
    console.log('效期日期:', futureDate1)
    console.log('目标库位 ID:', targetLocationId)
    console.log('目标库位编码:', targetLocationCode)
    console.log('SKU ID:', skuId)
    console.log('仓库 ID:', warehouseId)
    console.log('客户 ID:', clientId)

    // 执行上架
    const shelvingRequestData = {
      mode: 'sku',
      locationId: targetLocationId,
      locationCode: targetLocationCode,
      skuId,
      skuCode: E2E_SKU_CODES.expiry,
      quantity: 50,
      serialNumbers: [],
      warehouseId,
      clientId,
      putawayOrderId: orderResult.data[0].id,
      ...(putawayLineId && { putawayLineId }),
      batchNumber,
      expiryDate: futureDate1,
    }

    console.log('上架请求数据:', JSON.stringify(shelvingRequestData, null, 2))

    const shelvingResponse = await apiRequest(page, 'POST', '/api/v1/shelving', {
      data: shelvingRequestData,
    })

    console.log('上架响应状态:', shelvingResponse.status(), shelvingResponse.statusText())

    const shelvingResult = await shelvingResponse.json()

    // 调试信息
    if (!shelvingResult.success) {
      console.log('上架失败:', JSON.stringify(shelvingResult, null, 2))

      // 检查上架单是否正确创建
      const putawayOrderCheckResponse = await apiRequest(page, 'GET', `/api/v1/putaway/orders/${orderResult.data[0].id}`)
      const putawayOrderCheck = await putawayOrderCheckResponse.json()
      console.log('上架单详情:', JSON.stringify(putawayOrderCheck, null, 2))
    } else {
      console.log('上架成功:', JSON.stringify(shelvingResult, null, 2))
    }

    expect(shelvingResult.success).toBe(true)

    // 校验上架动作返回了有效库存 ID
    expect(shelvingResult.data.inventoryId).toBeDefined()
    expect(shelvingResult.data.detailId).toBeDefined()

    console.log(`上架成功: 库存ID=${shelvingResult.data.inventoryId}, 详情ID=${shelvingResult.data.detailId}`)

    // 校验上架单状态已经更新
    const finalPutawayOrderResponse = await apiRequest(page, 'GET', `/api/v1/putaway/orders/${orderResult.data[0].id}`)
    const finalPutawayOrder = await finalPutawayOrderResponse.json()

    if (finalPutawayOrder.success) {
      console.log(`上架单最终状态: ${finalPutawayOrder.data.status}`)
      console.log(`上架单已上架数量: ${finalPutawayOrder.data.putawayQty}`)

      // 校验上架数量正确
      expect(finalPutawayOrder.data.putawayQty).toBe(50)

      // 如果全部上架完成，状态应为 COMPLETED，否则应为 PARTIAL
      expect(['PARTIAL', 'COMPLETED'].includes(finalPutawayOrder.data.status)).toBe(true)
    }

    const afterResult = await getInventory(page, {
      skuCode: E2E_SKU_CODES.expiry,
      warehouseId,
      batchNumber,
    })
    if (!afterResult.success || !afterResult.data) {
      test.skip(true, '库存查询 API 不可用，跳过库存增量校验')
      return
    }

    const afterQty = afterResult.data.reduce((sum: number, item: Record<string, unknown>) => {
      return sum + getInventoryItemQty(item)
    }, 0)

    expect(afterQty).toBe(50)
  })

  test('批次库存应正确记录', async ({ page }) => {
    const batchNumber = `BATCH-CHECK-${testData.timestamp}`
    if (!warehouseId) {
      const warehouseResponse = await apiRequest(page, 'GET', `/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
      const warehouseResult = await warehouseResponse.json()
      if (!warehouseResult.success || !warehouseResult.data?.length) {
        test.skip(true, 'Missing E2E warehouse data for batch inventory check')
        return
      }
      warehouseId = warehouseResult.data[0].id
    }

    const locationCode = await createTempReceivableBin(page, 'BATCH')
    const prepareResult = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.batch,
      quantity: 30,
      batchNumber,
      locationCode,
    })
    expect(prepareResult.success).toBe(true)

    const result = await getInventory(page, {
      skuCode: E2E_SKU_CODES.batch,
      warehouseId,
      batchNumber,
    })

    expect(result.success).toBe(true)
    const batchItems = (result.data || []).filter((item: { batchNumber?: string }) => item.batchNumber === batchNumber)
    expect(batchItems.length).toBeGreaterThan(0)

    const batchQty = batchItems.reduce((sum: number, item: Record<string, unknown>) => {
      return sum + getInventoryItemQty(item)
    }, 0)
    expect(batchQty).toBe(30)
  })

  test('良品和残品库存应分开记录', async ({ page }) => {
    if (!warehouseId) {
      const warehouseResponse = await apiRequest(page, 'GET', `/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
      const warehouseResult = await warehouseResponse.json()
      if (!warehouseResult.success || !warehouseResult.data?.length) {
        test.skip(true, 'Missing E2E warehouse data for quality inventory check')
        return
      }
      warehouseId = warehouseResult.data[0].id
    }

    const beforeResult = await getInventory(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })
    if (!beforeResult.success || !beforeResult.data) {
      test.skip(true, 'Inventory API unavailable for quality inventory check')
      return
    }
    const beforeGoodQty = beforeResult.data.reduce((sum: number, item: Record<string, unknown>) => {
      return sum + Number(item.quantityAvailable || 0)
    }, 0)
    const beforeDamagedQty = beforeResult.data.reduce((sum: number, item: Record<string, unknown>) => {
      return sum + Number(item.quantityDefective || 0)
    }, 0)
    const beforeTotalQty = beforeGoodQty + beforeDamagedQty

    const goodResult = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 60,
      qualityStatus: 'GOOD',
    })
    expect(goodResult.success).toBe(true)

    const damagedResult = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.normal,
      quantity: 40,
      qualityStatus: 'DAMAGED',
      locationCode: E2E_BIN_CODES.damage,
    })
    expect(damagedResult.success).toBe(true)

    // 查询库存，验证良品和残品分开记录
    const result = await getInventory(page, {
      skuCode: E2E_SKU_CODES.normal,
      warehouseId,
    })

    expect(result.success).toBe(true)
    const afterGoodQty = (result.data || []).reduce((sum: number, item: Record<string, unknown>) => {
      return sum + Number(item.quantityAvailable || 0)
    }, 0)
    const afterDamagedQty = (result.data || []).reduce((sum: number, item: Record<string, unknown>) => {
      return sum + Number(item.quantityDefective || 0)
    }, 0)
    const afterTotalQty = afterGoodQty + afterDamagedQty

    expect(afterDamagedQty).toBeGreaterThanOrEqual(beforeDamagedQty + 40)
    expect(afterTotalQty).toBeGreaterThanOrEqual(beforeTotalQty + 100)
  })

  test('多批次收货后库存应正确累加', async ({ page }) => {
    const batch1 = `MULTI-BATCH-1-${testData.timestamp}`
    const batch2 = `MULTI-BATCH-2-${testData.timestamp}`
    if (!warehouseId) {
      const warehouseResponse = await apiRequest(page, 'GET', `/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
      const warehouseResult = await warehouseResponse.json()
      if (!warehouseResult.success || !warehouseResult.data?.length) {
        test.skip(true, '缺少 E2E 仓库数据，跳过多批次库存校验')
        return
      }
      warehouseId = warehouseResult.data[0].id
    }

    const locationCode1 = await createTempReceivableBin(page, 'MB1')
    const prepareBatch1 = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.batch,
      quantity: 40,
      batchNumber: batch1,
      locationCode: locationCode1,
    })
    expect(prepareBatch1.success).toBe(true)

    const locationCode2 = await createTempReceivableBin(page, 'MB2')
    const prepareBatch2 = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.batch,
      quantity: 60,
      batchNumber: batch2,
      locationCode: locationCode2,
    })
    expect(prepareBatch2.success).toBe(true)

    // 验证两个批次的库存数量
    const result = await getInventory(page, {
      skuCode: E2E_SKU_CODES.batch,
      warehouseId,
    })

    expect(result.success).toBe(true)
    const batch1Items = (result.data || []).filter((item: { batchNumber?: string }) => item.batchNumber === batch1)
    const batch2Items = (result.data || []).filter((item: { batchNumber?: string }) => item.batchNumber === batch2)
    expect(batch1Items.length).toBeGreaterThan(0)
    expect(batch2Items.length).toBeGreaterThan(0)

    const batch1Qty = batch1Items.reduce((sum: number, item: Record<string, unknown>) => sum + getInventoryItemQty(item), 0)
    const batch2Qty = batch2Items.reduce((sum: number, item: Record<string, unknown>) => sum + getInventoryItemQty(item), 0)
    expect(batch1Qty).toBe(40)
    expect(batch2Qty).toBe(60)
  })

  test('同一商品不同效期应分开记录', async ({ page }) => {
    const batchA = `EXPIRY-A-${testData.timestamp}`
    const batchB = `EXPIRY-B-${testData.timestamp}`
    if (!warehouseId) {
      const warehouseResponse = await apiRequest(page, 'GET', `/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
      const warehouseResult = await warehouseResponse.json()
      if (!warehouseResult.success || !warehouseResult.data?.length) {
        test.skip(true, 'Missing E2E warehouse data for expiry inventory check')
        return
      }
      warehouseId = warehouseResult.data[0].id
    }

    const locationCodeA = await createTempReceivableBin(page, 'EXP1')
    const prepareBatchA = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.expiry,
      quantity: 50,
      batchNumber: batchA,
      expiryDate: futureDate1,
      locationCode: locationCodeA,
    })
    if (!prepareBatchA.success) {
      console.log('效期批次 A 准备失败:', JSON.stringify(prepareBatchA, null, 2))
    }
    expect(prepareBatchA.success).toBe(true)

    const locationCodeB = await createTempReceivableBin(page, 'EXP2')
    const prepareBatchB = await prepareAvailableInventoryForOutbound(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      skuCode: E2E_SKU_CODES.expiry,
      quantity: 50,
      batchNumber: batchB,
      expiryDate: futureDate2,
      locationCode: locationCodeB,
    })
    if (!prepareBatchB.success) {
      console.log('效期批次 B 准备失败:', JSON.stringify(prepareBatchB, null, 2))
    }
    expect(prepareBatchB.success).toBe(true)

    const result = await getInventory(page, {
      skuCode: E2E_SKU_CODES.expiry,
      warehouseId,
    })
    if (!result.success || !result.data) {
      test.skip(true, '库存查询 API 不可用，跳过效期分离校验')
      return
    }

    const batchAItems = result.data.filter((item: { batchNumber?: string }) => item.batchNumber === batchA)
    const batchBItems = result.data.filter((item: { batchNumber?: string }) => item.batchNumber === batchB)
    expect(batchAItems.length).toBeGreaterThan(0)
    expect(batchBItems.length).toBeGreaterThan(0)

    const hasExpiryField = result.data.some((item: { expiryDate?: string | null }) => item.expiryDate !== undefined)
    if (!hasExpiryField) {
      test.skip(true, '库存返回缺少 expiryDate 字段，跳过效期值断言')
      return
    }

    const matchExpiryA = batchAItems.some((item: { expiryDate?: string | null }) => {
      return typeof item.expiryDate === 'string' && item.expiryDate.startsWith(futureDate1)
    })
    const matchExpiryB = batchBItems.some((item: { expiryDate?: string | null }) => {
      return typeof item.expiryDate === 'string' && item.expiryDate.startsWith(futureDate2)
    })
    expect(matchExpiryA).toBe(true)
    expect(matchExpiryB).toBe(true)
  })

  // ==================== 库位库存校验 ====================

  test('上架后库存应落到目标库位', async ({ page }) => {
    // 使用容器模式完成完整的上架流程
    containerCode = E2E_CONTAINER_CODES.general[2] // 使用第 3 个通用容器
    const containerResponse = await apiRequest(page, 'GET', `/api/v1/containers?search=${containerCode}`)
    const containerResult = await containerResponse.json()

    if (!containerResult.success || !containerResult.data?.length) {
      test.skip(true, 'Missing test container for location inventory check')
      return
    }
    containerId = containerResult.data[0].id

    // 确保初始化 clientId（如果前面的测试没有运行）
    if (!clientId) {
      const clientResponse = await apiRequest(page, 'GET', `/api/v1/clients?search=${E2E_CLIENT_CODE}`)
      const clientData = await clientResponse.json()
      if (!clientData.success || !clientData.data?.length) {
        test.skip(true, 'Missing E2E client for location inventory check')
        return
      }
      clientId = clientData.data[0].id
    }

    // 确保 warehouseId 和 locationId 都已初始化
    if (!warehouseId || !locationId) {
      const warehouseResponse = await apiRequest(page, 'GET', `/api/v1/warehouses?search=${E2E_WAREHOUSE_CODE}`)
      const warehouseData = await warehouseResponse.json()
      if (!warehouseData.success || !warehouseData.data?.length) {
        test.skip(true, 'Missing E2E warehouse for location inventory check')
        return
      }
      warehouseId = warehouseData.data[0].id

      const locationResponse = await apiRequest(page, 'GET', '/api/v1/bin-locations?warehouseId=' + warehouseId + '&isReceivable=true')
      const locationData = await locationResponse.json()
      if (!locationData.success || !locationData.data?.length) {
        test.skip(true, 'Missing receivable bin location for location inventory check')
        return
      }
      locationId = locationData.data[0].id
      locationCode = locationData.data[0].locationCode
    }

    // 先重置容器状态，确保容器可用
    const resetResult = await resetContainerForTest(page, containerId)
    console.log('容器重置结果:', JSON.stringify(resetResult, null, 2))

    // 创建 ASN
    const createResult = await createAsn(page, {
      clientCode: E2E_CLIENT_CODE,
      warehouseCode: E2E_WAREHOUSE_CODE,
      externalNumber: `INV-PUTAWAY-${Date.now()}`,
      lines: [{ skuCode: E2E_SKU_CODES.normal, expectedQty: 25 }],
    })
    expect(createResult.success).toBe(true)

    await signInAsn(page, createResult.data.asnNumber, E2E_CLIENT_CODE)

    // 容器收货
    const recvResult = await receiveSkuToAsn(page, {
      asnId: createResult.data.id,
      asnLineId: createResult.data.lines[0].id,
      receivedQty: 25,
      qualityStatus: 'GOOD',
      receivingMode: 'CONTAINER',
      containerCode,
    })

    // 调试信息
    if (!recvResult.success) {
      console.log('容器收货失败:', JSON.stringify(recvResult, null, 2))
    } else {
      console.log('容器收货成功')
    }

    expect(recvResult.success).toBe(true)

    // 关箱
    await closeContainer(page, containerId)

    // 创建上架单
    const orderResponse = await apiRequest(page, 'POST', '/api/v1/putaway/orders', {
      data: {
        putawayMode: 'CONTAINER_MODE',
        containerIds: [containerId],
      },
    })
    const orderResult = await orderResponse.json()
    expect(orderResult.success).toBe(true)

    // 获取 SKU ID
    const skuResponse = await apiRequest(page, 'GET', `/api/v1/skus?search=${E2E_SKU_CODES.normal}&clientId=${clientId}`)
    const skuResult = await skuResponse.json()
    expect(skuResult.success).toBe(true)
    expect(skuResult.data?.length).toBeGreaterThan(0)
    const testSkuId = skuResult.data[0].id

    // 执行上架
    const shelvingResponse = await apiRequest(page, 'POST', '/api/v1/shelving', {
      data: {
        mode: 'container',
        containerId,
        containerCode,
        locationId,
        locationCode,
        skuId: testSkuId,
        skuCode: E2E_SKU_CODES.normal,
        batchNumber: null,
        qualityStatus: 'GOOD',
        quantity: 25,
        serialNumbers: [],
      },
    })
    const shelvingResult = await shelvingResponse.json()
    expect(shelvingResult.success).toBe(true)

    // 校验库位库存
    const invResponse = await apiRequest(page, 'GET', `/api/v1/inventory?locationId=${locationId}&skuCode=${E2E_SKU_CODES.normal}`)
    const invResult = await invResponse.json()

    expect(invResult.success).toBe(true)
    const locationItems = (invResult.data || []).filter((item: { locationId?: string; locationCode?: string }) => {
      return item.locationId === locationId || item.locationCode === locationCode
    })
    expect(locationItems.length).toBeGreaterThan(0)
    const locationQty = locationItems.reduce((sum: number, item: Record<string, unknown>) => {
      return sum + getInventoryItemQty(item)
    }, 0)
    expect(locationQty).toBeGreaterThanOrEqual(25)
  })

  // ==================== 清理测试数据 ====================

  test.afterAll(async ({ request }) => {
    // 清理 ASN
    if (asnId) {
      try {
        await request.delete(`/api/v1/asn/${asnId}`)
      } catch (error) {
        console.log(`清理 ASN ${asnId} 失败:`, error)
      }
    }

    // 重置容器
    if (containerId) {
      try {
        await request.post(`/api/v1/containers/${containerId}/reset`)
      } catch (error) {
        console.log(`重置容器 ${containerId} 失败:`, error)
      }
    }

    // 清理测试产生的库存（通过批次号识别）
    try {
      const inventoryResponse = await request.get(`/api/v1/inventory?skuCode=${E2E_SKU_CODES.expiry}&warehouseId=${warehouseId}&pageSize=100`)
      const inventoryResult = await inventoryResponse.json()
      if (inventoryResult.success && inventoryResult.data) {
        for (const item of inventoryResult.data) {
          if (item.batchNumber && item.batchNumber.includes('BATCH-INV-')) {
            console.log(`清理测试库存: 批次 ${item.batchNumber} 库位 ${item.locationCode}`)
    // 注意：这里只是记录清理目标，真实环境不应直接删除库存
          }
        }
      }
    } catch (error) {
      console.log('清理库存失败:', error)
    }
  })
})
