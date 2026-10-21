/**
 * E2E 测试租户初始化脚本
 * 创建专用的测试租户和基础数据，与生产/开发数据完全隔离
 */

import { prisma } from '@/lib/db/prisma'
import { clearLoginFailures } from '@/lib/security'
import { hash } from 'bcryptjs'

// E2E 测试租户常量
export const E2E_TENANT_CODE = 'E2E-TEST'
export const E2E_CLIENT_CODE = 'E2E-C001'
export const E2E_WAREHOUSE_CODE = 'E2E-WH-001'
export const E2E_ADMIN_USERNAME = 'e2e-admin'
export const E2E_ADMIN_PASSWORD = 'Admin@123'

// SKU 模板编码
export const E2E_SKU_CODES = {
  normal: 'E2E-SKU-NORMAL-001',
  batch: 'E2E-SKU-BATCH-001',
  expiry: 'E2E-SKU-EXPIRY-001',
  serial: 'E2E-SKU-SERIAL-001',
  full: 'E2E-SKU-FULL-001',
}

// 容器编码（通用容器 + 特殊测试容器）
export const E2E_CONTAINER_CODES = {
  // 通用容器
  general: ['E2E-CONT-001', 'E2E-CONT-002', 'E2E-CONT-003', 'E2E-CONT-004', 'E2E-CONT-005'],
  // 特殊测试容器
  disabled: 'E2E-CT-DISABLED',    // 禁用容器
  occupied: 'E2E-CT-OCCUPIED',    // 已占用容器
  empty: 'E2E-CT-EMPTY',          // 空容器（测试清空）
  overqty: 'E2E-CT-OVERQTY',      // 超量测试容器
  append: 'E2E-CT-APPEND',        // 追加测试容器
  partial: 'E2E-CT-PARTIAL',      // 部分上架测试容器
}

// 旧容器编码到新 E2E 容器编码的映射
export const CONTAINER_CODE_MAPPING: Record<string, string> = {
  'CONT-001': 'E2E-CONT-001',
  'CONT-002': 'E2E-CONT-002',
  'CT-TEST-001': 'E2E-CONT-001',
  'CT-TEST-004': 'E2E-CONT-004',
  'CT-CBF': 'E2E-CONT-003',
  'CT-CQZF': 'E2E-CONT-003',
  'CT-DISABLED-001': 'E2E-CT-DISABLED',
  'CT-OCCUPIED-001': 'E2E-CT-OCCUPIED',
  'CT-EMPTY-TEST': 'E2E-CT-EMPTY',
  'CT-OVERQTY': 'E2E-CT-OVERQTY',
  'CT-TEST-APPEND': 'E2E-CT-APPEND',
  'CT-PARTIAL-DEDUCT': 'E2E-CT-PARTIAL',
}

// 库位编码
export const E2E_BIN_CODES = {
  receiving: 'E2E-RCV-01',       // 收货区
  staging: 'E2E-STG-01',         // 暂存区
  storage: [
    'E2E-A01-01', 'E2E-A01-02', 'E2E-A01-03',  // A 排 01 组
    'E2E-A02-01', 'E2E-A02-02', 'E2E-A02-03',  // A 排 02 组
    'E2E-A03-01', 'E2E-A03-02', 'E2E-A03-03',  // A 排 03 组（新增）
    'E2E-A04-01', 'E2E-A04-02', 'E2E-A04-03',  // A 排 04 组（新增）
    'E2E-B01-01', 'E2E-B01-02', 'E2E-B01-03',  // B 排 01 组（新增）
    'E2E-B02-01', 'E2E-B02-02', 'E2E-B02-03',  // B 排 02 组（新增）
  ],  // 存储区
  damage: 'E2E-DMG-01',          // 残品区
  shipping: 'E2E-SHP-01',        // 发货区
  picking: 'E2E-PCK-01',         // 拣货区
  locked: 'E2E-LOCKED-01',       // 已锁定库位（测试用）
  notReceivable: 'E2E-NOREC-01', // 不可上架库位（测试用）
}

// 旧库位编码到新 E2E 库位编码的映射（用于更新场景配置）
export const BIN_CODE_MAPPING: Record<string, string> = {
  'A-01-01-01': 'E2E-A01-01',
  'A-01-01-02': 'E2E-A01-02',
  'A-01-02-01': 'E2E-A01-03',
  'A-01-02-02': 'E2E-A02-01',
  'D-01-01-01': 'E2E-DMG-01',
  'DA-001': 'E2E-DMG-01',
  'P-01-01-01': 'E2E-PCK-01',
  'LOCKED-BIN-001': 'E2E-LOCKED-01',
  'NOT-RECEIVABLE-BIN': 'E2E-NOREC-01',
}

/**
 * 初始化 E2E 测试租户和基础数据
 */
export async function setupE2eTenant(): Promise<{
  tenantId: string
  clientId: string
  warehouseId: string
  skus: Record<string, { id: string; code: string }>
  bins: Record<string, { id: string; code: string; zoneId: string }>
  containers: Array<{ id: string; code: string }>
}> {
  console.log('🚀 初始化 E2E 测试租户...')

  // 1. 创建测试租户
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode: E2E_TENANT_CODE },
    update: {},
    create: {
      tenantCode: E2E_TENANT_CODE,
      tenantName: 'E2E 测试租户',
      contactPerson: 'E2E Test',
      contactEmail: 'e2e@test.com',
      status: 'ACTIVE',
      config: {},
    },
  })
  console.log(`  ✅ 租户: ${tenant.tenantCode}`)

  // 2. 创建测试用户
  const passwordHash = await hash(E2E_ADMIN_PASSWORD, 10)
  const user = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: E2E_ADMIN_USERNAME } },
    update: {
      email: 'e2e-admin@test.com',
      passwordHash,
      status: 'ACTIVE',
      isActive: true,
      failedLoginCount: 0,
      lockedAt: null,
      lockedUntil: null,
      config: {},
    },
    create: {
      tenantId: tenant.id,
      username: E2E_ADMIN_USERNAME,
      email: 'e2e-admin@test.com',
      passwordHash,
      fullName: 'E2E 测试管理员',
      status: 'ACTIVE',
      config: {},
    },
  })
  console.log(`  ✅ 用户: ${user.username}`)

  const e2eAdminRole = await prisma.role.upsert({
    where: { tenantId_roleCode: { tenantId: tenant.id, roleCode: 'E2E_ADMIN' } },
    update: {
      roleName: 'E2E 测试管理员',
      description: 'E2E 自动化测试账号使用的管理员角色',
      roleLevel: 1,
      isSystem: true,
      isActive: true,
      updatedBy: user.id,
    },
    create: {
      tenantId: tenant.id,
      roleCode: 'E2E_ADMIN',
      roleName: 'E2E 测试管理员',
      description: 'E2E 自动化测试账号使用的管理员角色',
      roleLevel: 1,
      isSystem: true,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    },
  })
  console.log(`  ✅ 角色: ${e2eAdminRole.roleCode}`)

  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: e2eAdminRole.id,
      scopeType: 'GLOBAL',
      scopeId: null,
    },
    select: { id: true },
  })

  if (existingUserRole) {
    await prisma.userRole.update({
      where: { id: existingUserRole.id },
      data: {
        isPrimary: true,
        isActive: true,
        assignedBy: user.id,
      },
    })
  } else {
    await prisma.userRole.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: e2eAdminRole.id,
        scopeType: 'GLOBAL',
        isPrimary: true,
        isActive: true,
        assignedBy: user.id,
      },
    })
  }
  console.log(`  ✅ 角色绑定: ${user.username} -> ${e2eAdminRole.roleCode}`)

  const permissions = await prisma.permission.findMany({
    select: { id: true },
  })

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: e2eAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {
        isGranted: true,
        updatedBy: user.id,
      },
      create: {
        tenantId: tenant.id,
        roleId: e2eAdminRole.id,
        permissionId: permission.id,
        isGranted: true,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })
  }
  console.log(`  ✅ 角色权限: ${permissions.length} 个`)

  // 3. 创建测试客户
  await clearLoginFailures(tenant.id, E2E_ADMIN_USERNAME)

  const client = await prisma.client.upsert({
    where: { tenantId_clientCode: { tenantId: tenant.id, clientCode: E2E_CLIENT_CODE } },
    update: {},
    create: {
      tenantId: tenant.id,
      clientCode: E2E_CLIENT_CODE,
      clientName: 'E2E 测试客户',
      contactPerson: 'E2E Test',
      contactPhone: '13800000000',
      isActive: true,
      config: {},
    },
  })
  console.log(`  ✅ 客户: ${client.clientCode}`)

  // 4. 创建测试仓库
  const warehouse = await prisma.warehouse.upsert({
    where: { tenantId_warehouseCode: { tenantId: tenant.id, warehouseCode: E2E_WAREHOUSE_CODE } },
    update: {},
    create: {
      tenantId: tenant.id,
      warehouseCode: E2E_WAREHOUSE_CODE,
      warehouseName: 'E2E 测试仓库',
      address: 'E2E Test Address',
      status: 'ACTIVE',
    },
  })
  console.log(`  ✅ 仓库: ${warehouse.warehouseCode}`)

  // 5. 创建库区
  const zones = await Promise.all([
    prisma.zone.upsert({
      where: { warehouseId_zoneCode: { warehouseId: warehouse.id, zoneCode: 'E2E-RECV' } },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        zoneCode: 'E2E-RECV',
        zoneName: 'E2E 收货区',
        zoneType: 'RECEIVING',
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { warehouseId_zoneCode: { warehouseId: warehouse.id, zoneCode: 'E2E-STG' } },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        zoneCode: 'E2E-STG',
        zoneName: 'E2E 暂存区',
        zoneType: 'STAGING',
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { warehouseId_zoneCode: { warehouseId: warehouse.id, zoneCode: 'E2E-STORAGE' } },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        zoneCode: 'E2E-STORAGE',
        zoneName: 'E2E 存储区',
        zoneType: 'STORAGE',
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { warehouseId_zoneCode: { warehouseId: warehouse.id, zoneCode: 'E2E-DMG' } },
      update: { qualityType: 'DAMAGED' },  // 确保残品区的质量类型正确
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        zoneCode: 'E2E-DMG',
        zoneName: 'E2E 残品区',
        zoneType: 'DAMAGE',
        qualityType: 'DAMAGED',  // 残品区质量类型为 DAMAGED
        status: 'ACTIVE',
      },
    }),
    prisma.zone.upsert({
      where: { warehouseId_zoneCode: { warehouseId: warehouse.id, zoneCode: 'E2E-SHIP' } },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        zoneCode: 'E2E-SHIP',
        zoneName: 'E2E 发货区',
        zoneType: 'SHIPPING',
        status: 'ACTIVE',
      },
    }),
  ])
  console.log(`  ✅ 库区: ${zones.length} 个`)

  // 6. 创建库位
  const zoneMap = new Map(zones.map(z => [z.zoneType, z]))
  const bins: Record<string, { id: string; code: string; zoneId: string }> = {}

  // 收货区库位
  const recvBin = await prisma.binLocation.upsert({
    where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: E2E_BIN_CODES.receiving } },
    update: {},
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      zoneId: zoneMap.get('RECEIVING')!.id,
      locationCode: E2E_BIN_CODES.receiving,
      locationType: 'RECEIVING',
      status: 'ACTIVE',
      isReceivable: true,
      isPickable: false,
    },
  })
  bins[E2E_BIN_CODES.receiving] = { id: recvBin.id, code: recvBin.locationCode, zoneId: recvBin.zoneId }

  // 暂存区库位
  const stgBin = await prisma.binLocation.upsert({
    where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: E2E_BIN_CODES.staging } },
    update: {},
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      zoneId: zoneMap.get('STAGING')!.id,
      locationCode: E2E_BIN_CODES.staging,
      locationType: 'STAGING',
      status: 'ACTIVE',
      isReceivable: true,
      isPickable: true,
    },
  })
  bins[E2E_BIN_CODES.staging] = { id: stgBin.id, code: stgBin.locationCode, zoneId: stgBin.zoneId }

  // 存储区库位
  for (const binCode of E2E_BIN_CODES.storage) {
    const bin = await prisma.binLocation.upsert({
      where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: binCode } },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        zoneId: zoneMap.get('STORAGE')!.id,
        locationCode: binCode,
        locationType: 'STORAGE',
        status: 'ACTIVE',
        isReceivable: true,
        isPickable: true,
      },
    })
    bins[binCode] = { id: bin.id, code: bin.locationCode, zoneId: bin.zoneId }
  }

  // 残品区库位
  const dmgBin = await prisma.binLocation.upsert({
    where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: E2E_BIN_CODES.damage } },
    update: {},
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      zoneId: zoneMap.get('DAMAGE')!.id,
      locationCode: E2E_BIN_CODES.damage,
      locationType: 'DAMAGE',
      status: 'ACTIVE',
      isReceivable: true,
      isPickable: false,
    },
  })
  bins[E2E_BIN_CODES.damage] = { id: dmgBin.id, code: dmgBin.locationCode, zoneId: dmgBin.zoneId }

  // 发货区库位
  const shipBin = await prisma.binLocation.upsert({
    where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: E2E_BIN_CODES.shipping } },
    update: {},
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      zoneId: zoneMap.get('SHIPPING')!.id,
      locationCode: E2E_BIN_CODES.shipping,
      locationType: 'SHIPPING',
      status: 'ACTIVE',
      isReceivable: false,
      isPickable: true,
    },
  })
  bins[E2E_BIN_CODES.shipping] = { id: shipBin.id, code: shipBin.locationCode, zoneId: shipBin.zoneId }

  // 拣货区库位
  const pickBin = await prisma.binLocation.upsert({
    where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: E2E_BIN_CODES.picking } },
    update: {},
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      zoneId: zoneMap.get('STORAGE')!.id,
      locationCode: E2E_BIN_CODES.picking,
      locationType: 'PICKING',
      status: 'ACTIVE',
      isReceivable: true,
      isPickable: true,
    },
  })
  bins[E2E_BIN_CODES.picking] = { id: pickBin.id, code: pickBin.locationCode, zoneId: pickBin.zoneId }

  // 已锁定库位（测试用）
  const lockedBin = await prisma.binLocation.upsert({
    where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: E2E_BIN_CODES.locked } },
    update: { lockStatus: 'LOCKED' },
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      zoneId: zoneMap.get('STORAGE')!.id,
      locationCode: E2E_BIN_CODES.locked,
      locationType: 'STORAGE',
      status: 'ACTIVE',
      lockStatus: 'LOCKED',
      isReceivable: true,
      isPickable: true,
    },
  })
  bins[E2E_BIN_CODES.locked] = { id: lockedBin.id, code: lockedBin.locationCode, zoneId: lockedBin.zoneId }

  // 不可上架库位（测试用）
  const notRecBin = await prisma.binLocation.upsert({
    where: { warehouseId_locationCode: { warehouseId: warehouse.id, locationCode: E2E_BIN_CODES.notReceivable } },
    update: { isReceivable: false },
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      zoneId: zoneMap.get('STORAGE')!.id,
      locationCode: E2E_BIN_CODES.notReceivable,
      locationType: 'STORAGE',
      status: 'ACTIVE',
      isReceivable: false,
      isPickable: true,
    },
  })
  bins[E2E_BIN_CODES.notReceivable] = { id: notRecBin.id, code: notRecBin.locationCode, zoneId: notRecBin.zoneId }

  console.log(`  ✅ 库位: ${Object.keys(bins).length} 个`)

  // 7. 创建 SKU 模板
  const skus: Record<string, { id: string; code: string }> = {}
  const skuConfigs = [
    { type: 'normal', code: E2E_SKU_CODES.normal, name: 'E2E 普通商品', batchManaged: false, expiryManaged: false, serialManaged: false },
    { type: 'batch', code: E2E_SKU_CODES.batch, name: 'E2E 批次商品', batchManaged: true, expiryManaged: false, serialManaged: false },
    { type: 'expiry', code: E2E_SKU_CODES.expiry, name: 'E2E 效期商品', batchManaged: true, expiryManaged: true, serialManaged: false },
    { type: 'serial', code: E2E_SKU_CODES.serial, name: 'E2E 序列号商品', batchManaged: true, expiryManaged: false, serialManaged: true },
    { type: 'full', code: E2E_SKU_CODES.full, name: 'E2E 全管理商品', batchManaged: true, expiryManaged: true, serialManaged: true },
  ]

  for (const cfg of skuConfigs) {
    const sku = await prisma.sku.upsert({
      where: { clientId_skuCode: { clientId: client.id, skuCode: cfg.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        clientId: client.id,
        skuCode: cfg.code,
        skuName: cfg.name,
        barcode: cfg.code,
        unit: 'PCS',
        weightKg: 1.0,
        volumeCbm: 0.001,
        isBatchManaged: cfg.batchManaged,
        isExpiryManaged: cfg.expiryManaged,
        isSerialManaged: cfg.serialManaged,
        status: 'ACTIVE',
        config: {},
      },
    })
    skus[cfg.type] = { id: sku.id, code: sku.skuCode }
  }
  console.log(`  ✅ SKU: ${Object.keys(skus).length} 个`)

  // 8. 创建容器
  const containers: Array<{ id: string; code: string }> = []

  // 8.1 创建通用容器
  for (const containerCode of E2E_CONTAINER_CODES.general) {
    const container = await prisma.container.upsert({
      where: { tenantId_containerCode: { tenantId: tenant.id, containerCode } },
      update: {
        workStatus: 'IDLE',
        enabledStatus: 'ENABLED',
        currentAsnId: null,
      },
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        containerCode,
        containerType: 'PALLET',
        usage: 'RECEIVING',
        workStatus: 'IDLE',
        enabledStatus: 'ENABLED',
      },
    })
    containers.push({ id: container.id, code: container.containerCode })
  }

  // 8.2 创建特殊测试容器
  // 禁用容器
  const disabledContainer = await prisma.container.upsert({
    where: { tenantId_containerCode: { tenantId: tenant.id, containerCode: E2E_CONTAINER_CODES.disabled } },
    update: { enabledStatus: 'DISABLED' },
    create: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      containerCode: E2E_CONTAINER_CODES.disabled,
      containerType: 'PALLET',
      usage: 'RECEIVING',
      workStatus: 'IDLE',
      enabledStatus: 'DISABLED',
    },
  })
  containers.push({ id: disabledContainer.id, code: disabledContainer.containerCode })

  // 其他特殊容器（正常状态，用于特定测试场景）
  const specialContainers = [
    E2E_CONTAINER_CODES.occupied,
    E2E_CONTAINER_CODES.empty,
    E2E_CONTAINER_CODES.overqty,
    E2E_CONTAINER_CODES.append,
    E2E_CONTAINER_CODES.partial,
  ]
  for (const containerCode of specialContainers) {
    const container = await prisma.container.upsert({
      where: { tenantId_containerCode: { tenantId: tenant.id, containerCode } },
      update: {
        workStatus: 'IDLE',
        enabledStatus: 'ENABLED',
        currentAsnId: null,
      },
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        containerCode,
        containerType: 'PALLET',
        usage: 'RECEIVING',
        workStatus: 'IDLE',
        enabledStatus: 'ENABLED',
      },
    })
    containers.push({ id: container.id, code: container.containerCode })
  }

  console.log(`  ✅ 容器: ${containers.length} 个`)

  // 9. 创建包材
  console.log('  📦 创建包材...')
  const packagingMaterials = await Promise.all([
    prisma.packagingMaterial.upsert({
      where: { tenantId_materialCode: { tenantId: tenant.id, materialCode: 'E2E-BOX-S' } },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        materialCode: 'E2E-BOX-S',
        materialName: 'E2E 小号纸箱',
        materialType: 'CARTON',
        specification: '200x150x100mm',
        weightKg: 0.1,
        unitPrice: 1.0,
        currency: 'CNY',
        isActive: true,
      },
    }),
    prisma.packagingMaterial.upsert({
      where: { tenantId_materialCode: { tenantId: tenant.id, materialCode: 'E2E-BAG-M' } },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        materialCode: 'E2E-BAG-M',
        materialName: 'E2E 中号快递袋',
        materialType: 'BAG',
        specification: '300x400mm',
        weightKg: 0.02,
        unitPrice: 0.5,
        currency: 'CNY',
        isActive: true,
      },
    }),
  ])
  console.log(`  ✅ 包材: ${packagingMaterials.length} 个`)

  console.log('✨ E2E 测试租户初始化完成!')

  return {
    tenantId: tenant.id,
    clientId: client.id,
    warehouseId: warehouse.id,
    skus,
    bins,
    containers,
  }
}

/**
 * 清理 E2E 测试租户的所有业务数据（保留基础数据）
 */
export async function cleanupE2eTestData(): Promise<void> {
  console.log('🧹 清理 E2E 测试数据...')

  const tenant = await prisma.tenant.findUnique({
    where: { tenantCode: E2E_TENANT_CODE },
  })

  if (!tenant) {
    console.log('  ⚠️ E2E 测试租户不存在，无需清理')
    return
  }

  // 按依赖关系顺序删除
  const deleteOperations = [
    // 出库相关
    prisma.checkoutRecord.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.checkoutOrder.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.pickOrderLine.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.pickOrder.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.wave.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.allocationDetail.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.outboundOrderLine.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.outboundOrder.deleteMany({ where: { tenantId: tenant.id } }),

    // 入库相关
    prisma.putawayDetail.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.putawayOrderLine.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.putawayOrder.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.containerItem.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.receivingRecord.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.asnLine.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.asn.deleteMany({ where: { tenantId: tenant.id } }),

    // 库存相关
    prisma.serialNumber.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.inventoryEvent.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.inventoryBucket.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.inventorySnapshot.deleteMany({ where: { tenantId: tenant.id } }),
  ]

  for (const op of deleteOperations) {
    try {
      await op
    } catch (e) {
      // 忽略删除错误（可能表不存在等）
    }
  }

  // 重置容器状态
  await prisma.container.updateMany({
    where: { tenantId: tenant.id },
    data: {
      workStatus: 'IDLE',
      currentAsnId: null,
    },
  })

  console.log('✨ E2E 测试数据清理完成!')
}

/**
 * 迁移场景配置中的库位编码和容器编码到 E2E 格式
 */
export async function migrateScenarioCodes(): Promise<void> {
  console.log('🔄 迁移场景编码（库位 + 容器）...')

  const scenarios = await prisma.e2eScenario.findMany({
    select: { id: true, code: true, config: true }
  })

  let updatedBin = 0
  let updatedContainer = 0
  let updatedTotal = 0

  for (const scenario of scenarios) {
    const config = scenario.config as Record<string, unknown>
    let configStr = JSON.stringify(config)
    let changedBin = false
    let changedContainer = false

    // 替换所有旧库位编码
    for (const [oldCode, newCode] of Object.entries(BIN_CODE_MAPPING)) {
      if (configStr.includes(oldCode)) {
        configStr = configStr.split(oldCode).join(newCode)
        changedBin = true
      }
    }

    // 替换所有旧容器编码
    for (const [oldCode, newCode] of Object.entries(CONTAINER_CODE_MAPPING)) {
      if (configStr.includes(oldCode)) {
        configStr = configStr.split(oldCode).join(newCode)
        changedContainer = true
      }
    }

    if (changedBin || changedContainer) {
      const newConfig = JSON.parse(configStr)
      await prisma.e2eScenario.update({
        where: { id: scenario.id },
        data: { config: newConfig }
      })

      const changes: string[] = []
      if (changedBin) {
        changes.push('库位')
        updatedBin++
      }
      if (changedContainer) {
        changes.push('容器')
        updatedContainer++
      }
      console.log(`  ✅ ${scenario.code} (${changes.join(' + ')})`)
      updatedTotal++
    }
  }

  console.log(`✨ 迁移完成!`)
  console.log(`   - 更新场景总数: ${updatedTotal}`)
  console.log(`   - 库位编码更新: ${updatedBin}`)
  console.log(`   - 容器编码更新: ${updatedContainer}`)
}

// 保留旧函数名作为别名（向后兼容）
export const migrateScenarioBinCodes = migrateScenarioCodes

// 允许直接运行此脚本
if (require.main === module) {
  const arg = process.argv[2]

  if (arg === 'migrate') {
    // 运行迁移：npx tsx src/lib/e2e/setup-e2e-tenant.ts migrate
    migrateScenarioBinCodes()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e)
        process.exit(1)
      })
  } else {
    // 默认：初始化租户
    setupE2eTenant()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e)
        process.exit(1)
      })
  }
}
