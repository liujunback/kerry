/**
 * 库存事件溯源测试脚本
 * 测试收货上架、库存写入是否正常
 */

import { PrismaClient } from '@prisma/client'
import { getBucket,summarizeSkuInventory } from '../src/lib/services/inventory-bucket-service'
import { BucketType,getEventHistory } from '../src/lib/services/inventory-event-service'
import { putaway } from '../src/lib/services/inventory-operation-service'

const prisma = new PrismaClient()

async function main() {
  console.log('=== 库存事件溯源测试 ===\n')

  // 1. 获取测试数据
  console.log('1. 获取测试数据...')

  const tenant = await prisma.tenant.findFirst()
  if (!tenant) {
    console.error('❌ 未找到租户数据，请先运行 seed')
    return
  }
  console.log(`   租户: ${tenant.tenantName}`)

  const warehouse = await prisma.warehouse.findFirst({
    where: { tenantId: tenant.id },
  })
  if (!warehouse) {
    console.error('❌ 未找到仓库数据')
    return
  }
  console.log(`   仓库: ${warehouse.warehouseName}`)

  const location = await prisma.binLocation.findFirst({
    where: { tenantId: tenant.id, warehouseId: warehouse.id },
  })
  if (!location) {
    console.error('❌ 未找到库位数据')
    return
  }
  console.log(`   库位: ${location.locationCode}`)

  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id },
  })
  if (!client) {
    console.error('❌ 未找到客户数据')
    return
  }
  console.log(`   客户: ${client.clientName}`)

  let sku = await prisma.sku.findFirst({
    where: { tenantId: tenant.id },
  })
  if (!sku) {
    // 创建测试 SKU
    sku = await prisma.sku.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        skuCode: 'SKU001',
        skuName: '测试商品',
        barcode: '1234567890123',
        status: 'ACTIVE',
        config: {},
      },
    })
    console.log(`   SKU: ${sku.skuCode} (新创建)\n`)
  } else {
    console.log(`   SKU: ${sku.skuCode}\n`)
  }

  // 2. 测试上架操作
  console.log('2. 测试上架操作...')
  const testQuantity = 100
  const testBatchNumber = `TEST-${Date.now()}`

  try {
    // 直接调用 putaway，不使用外部事务包装
    const result = await putaway({
      tenantId: tenant.id,
      clientId: client.id,
      warehouseId: warehouse.id,
      locationId: location.id,
      skuId: sku.id,
      skuCode: sku.skuCode,
      quantity: testQuantity,
      batchNumber: testBatchNumber,
      referenceType: 'TEST',
      referenceNumber: `TEST-${Date.now()}`,
      operatorId: 'test-user',
    })

    console.log(`   ✅ 上架成功`)
    console.log(`   事件ID: ${result.eventId}`)
    console.log(`   事件编号: ${result.eventNumber}\n`)
  } catch (error) {
    console.error('   ❌ 上架失败:', error)
    return
  }

  // 3. 验证库存桶
  console.log('3. 验证库存桶...')
  const bucket = await getBucket({
    tenantId: tenant.id,
    warehouseId: warehouse.id,
    locationId: location.id,
    skuId: sku.id,
    batchNumber: testBatchNumber,
    lpn: null,
    bucketType: BucketType.AVAILABLE,
  })

  if (bucket) {
    console.log(`   ✅ 库存桶已创建`)
    console.log(`   桶ID: ${bucket.id}`)
    console.log(`   数量: ${bucket.quantity}`)
    console.log(`   桶类型: ${bucket.bucketType}`)
    console.log(`   批次号: ${bucket.batchNumber}\n`)
  } else {
    console.error('   ❌ 库存桶未找到\n')
  }

  // 4. 验证库存汇总
  console.log('4. 验证库存汇总...')
  const summary = await summarizeSkuInventory(
    tenant.id,
    warehouse.id,
    sku.id,
    client.id
  )

  console.log(`   可用库存: ${summary.available}`)
  console.log(`   已分配: ${summary.allocated}`)
  console.log(`   拣货中: ${summary.picking}`)
  console.log(`   冻结: ${summary.frozen}`)
  console.log(`   总计: ${summary.total}\n`)

  // 5. 验证事件记录
  console.log('5. 验证事件记录...')
  const events = await getEventHistory({
    tenantId: tenant.id,
    warehouseId: warehouse.id,
    skuId: sku.id,
    limit: 5,
  })

  console.log(`   最近 ${events.events.length} 条事件:`)
  for (const event of events.events) {
    console.log(`   - ${event.eventNumber}: ${event.eventType} ${event.bucketType} ${event.quantityDelta > 0 ? '+' : ''}${event.quantityDelta}`)
  }

  console.log('\n=== 测试完成 ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
