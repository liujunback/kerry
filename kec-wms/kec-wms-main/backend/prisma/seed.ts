import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { syncScenarioTemplates } from '../src/lib/e2e/sync-scenario-templates'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化数据库...')

  // 创建默认租户
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode: 'DEFAULT' },
    update: {},
    create: {
      tenantCode: 'DEFAULT',
      tenantName: '默认租户',
      contactPerson: '系统管理员',
      contactEmail: 'admin@example.com',
      status: 'ACTIVE',
      config: {},
    },
  })
  console.log('创建租户:', tenant.tenantName)

  // 创建系统管理员角色
  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_roleCode: {
        tenantId: tenant.id,
        roleCode: 'SYSTEM_ADMIN',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      roleCode: 'SYSTEM_ADMIN',
      roleName: '系统管理员',
      description: '系统最高权限管理员',
      roleLevel: 1,
      isSystem: true,
      isActive: true,
    },
  })
  console.log('创建角色:', adminRole.roleName)

  // 创建默认管理员用户
  // 密码: Admin@123
  const passwordHash = await bcrypt.hash('Admin@123', 12)
  const passwordExpiresAt = new Date()
  passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90)

  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username: 'admin',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      username: 'admin',
      passwordHash: passwordHash,
      fullName: '系统管理员',
      email: 'admin@example.com',
      userType: 'SYSTEM',
      status: 'ACTIVE',
      isActive: true,
      passwordChangedAt: new Date(),
      passwordExpiresAt: passwordExpiresAt,
      config: {},
    },
  })
  console.log('创建用户:', adminUser.username)

  // 分配角色给管理员
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,
      roleId: adminRole.id,
      scopeType: 'GLOBAL',
    },
  })

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        tenantId: tenant.id,
        userId: adminUser.id,
        roleId: adminRole.id,
        scopeType: 'GLOBAL',
        isPrimary: true,
        assignedBy: adminUser.id,
      },
    })
  }
  console.log('分配角色: admin -> SYSTEM_ADMIN')

  // 创建基础权限
  const permissions = [
    { code: 'user:read', name: '查看用户', resource: 'user', action: 'read', category: '用户管理' },
    { code: 'user:create', name: '创建用户', resource: 'user', action: 'create', category: '用户管理' },
    { code: 'user:update', name: '更新用户', resource: 'user', action: 'update', category: '用户管理' },
    { code: 'user:delete', name: '删除用户', resource: 'user', action: 'delete', category: '用户管理' },
    { code: 'role:read', name: '查看角色', resource: 'role', action: 'read', category: '角色管理' },
    { code: 'role:create', name: '创建角色', resource: 'role', action: 'create', category: '角色管理' },
    { code: 'role:update', name: '更新角色', resource: 'role', action: 'update', category: '角色管理' },
    { code: 'role:delete', name: '删除角色', resource: 'role', action: 'delete', category: '角色管理' },
    // 仓库权限
    { code: 'warehouse:read', name: '查看仓库', resource: 'warehouse', action: 'read', category: '仓库管理' },
    { code: 'warehouse:create', name: '创建仓库', resource: 'warehouse', action: 'create', category: '仓库管理' },
    { code: 'warehouse:update', name: '更新仓库', resource: 'warehouse', action: 'update', category: '仓库管理' },
    { code: 'warehouse:delete', name: '删除仓库', resource: 'warehouse', action: 'delete', category: '仓库管理' },
    // 库区权限
    { code: 'zone:read', name: '查看库区', resource: 'zone', action: 'read', category: '库区管理' },
    { code: 'zone:create', name: '创建库区', resource: 'zone', action: 'create', category: '库区管理' },
    { code: 'zone:update', name: '更新库区', resource: 'zone', action: 'update', category: '库区管理' },
    { code: 'zone:delete', name: '删除库区', resource: 'zone', action: 'delete', category: '库区管理' },
    // 库位权限
    { code: 'bin:read', name: '查看库位', resource: 'bin', action: 'read', category: '库位管理' },
    { code: 'bin:create', name: '创建库位', resource: 'bin', action: 'create', category: '库位管理' },
    { code: 'bin:update', name: '更新库位', resource: 'bin', action: 'update', category: '库位管理' },
    { code: 'bin:delete', name: '删除库位', resource: 'bin', action: 'delete', category: '库位管理' },
    // 容器权限
    { code: 'container:read', name: '查看容器', resource: 'container', action: 'read', category: '容器管理' },
    { code: 'container:create', name: '创建容器', resource: 'container', action: 'create', category: '容器管理' },
    { code: 'container:update', name: '更新容器', resource: 'container', action: 'update', category: '容器管理' },
    { code: 'container:delete', name: '删除容器', resource: 'container', action: 'delete', category: '容器管理' },
    { code: 'container:print', name: '打印容器条码', resource: 'container', action: 'print', category: '容器管理' },
    { code: 'container:export', name: '导出容器', resource: 'container', action: 'export', category: '容器管理' },
    // 客户权限
    { code: 'client:read', name: '查看客户', resource: 'client', action: 'read', category: '客户管理' },
    { code: 'client:create', name: '创建客户', resource: 'client', action: 'create', category: '客户管理' },
    { code: 'client:update', name: '更新客户', resource: 'client', action: 'update', category: '客户管理' },
    { code: 'client:delete', name: '删除客户', resource: 'client', action: 'delete', category: '客户管理' },
    { code: 'client:warehouse:manage', name: '管理客户仓库', resource: 'client', action: 'warehouse:manage', category: '客户管理' },
    // SKU权限
    { code: 'sku:read', name: '查看SKU', resource: 'sku', action: 'read', category: 'SKU管理' },
    { code: 'sku:create', name: '创建SKU', resource: 'sku', action: 'create', category: 'SKU管理' },
    { code: 'sku:update', name: '更新SKU', resource: 'sku', action: 'update', category: 'SKU管理' },
    { code: 'sku:delete', name: '删除SKU', resource: 'sku', action: 'delete', category: 'SKU管理' },
    { code: 'sku:import', name: '导入SKU', resource: 'sku', action: 'import', category: 'SKU管理' },
    { code: 'sku:export', name: '导出SKU', resource: 'sku', action: 'export', category: 'SKU管理' },
    // SKU分类权限
    { code: 'sku-category:read', name: '查看SKU分类', resource: 'sku-category', action: 'read', category: 'SKU管理' },
    { code: 'sku-category:create', name: '创建SKU分类', resource: 'sku-category', action: 'create', category: 'SKU管理' },
    { code: 'sku-category:update', name: '更新SKU分类', resource: 'sku-category', action: 'update', category: 'SKU管理' },
    { code: 'sku-category:delete', name: '删除SKU分类', resource: 'sku-category', action: 'delete', category: 'SKU管理' },
    // 组合商品权限
    { code: 'combo-product:read', name: '查看组合商品', resource: 'combo-product', action: 'read', category: 'SKU管理' },
    { code: 'combo-product:create', name: '创建组合商品', resource: 'combo-product', action: 'create', category: 'SKU管理' },
    { code: 'combo-product:update', name: '更新组合商品', resource: 'combo-product', action: 'update', category: 'SKU管理' },
    { code: 'combo-product:delete', name: '删除组合商品', resource: 'combo-product', action: 'delete', category: 'SKU管理' },
    // 库存权限
    { code: 'inventory:read', name: '查看库存', resource: 'inventory', action: 'read', category: '库存管理' },
    { code: 'inventory:create', name: '创建库存', resource: 'inventory', action: 'create', category: '库存管理' },
    { code: 'inventory:update', name: '更新库存', resource: 'inventory', action: 'update', category: '库存管理' },
    { code: 'inventory:delete', name: '删除库存', resource: 'inventory', action: 'delete', category: '库存管理' },
    { code: 'inventory:count', name: '盘点管理', resource: 'inventory', action: 'count', category: '库存管理' },
    { code: 'inventory:adjust', name: '库存调整', resource: 'inventory', action: 'adjust', category: '库存管理' },
    { code: 'inventory:transfer', name: '库存转移', resource: 'inventory', action: 'transfer', category: '库存管理' },
    { code: 'inventory:freeze', name: '库存冻结', resource: 'inventory', action: 'freeze', category: '库存管理' },
    { code: 'inventory:export', name: '导出库存', resource: 'inventory', action: 'export', category: '库存管理' },
    // 租户权限 (仅超级管理员)
    { code: 'tenant:read', name: '查看租户', resource: 'tenant', action: 'read', category: '租户管理' },
    { code: 'tenant:create', name: '创建租户', resource: 'tenant', action: 'create', category: '租户管理' },
    { code: 'tenant:update', name: '更新租户', resource: 'tenant', action: 'update', category: '租户管理' },
    { code: 'tenant:delete', name: '删除租户', resource: 'tenant', action: 'delete', category: '租户管理' },
    // ASN权限
    { code: 'asn:read', name: '查看ASN', resource: 'asn', action: 'read', category: '入库管理' },
    { code: 'asn:cancel', name: '取消ASN', resource: 'asn', action: 'cancel', category: '入库管理' },
    { code: 'asn:rollback', name: '回滚ASN', resource: 'asn', action: 'rollback', category: '入库管理' },
    { code: 'asn:force-complete', name: '强制完结ASN', resource: 'asn', action: 'force-complete', category: '入库管理' },
    { code: 'asn:sign-in', name: 'ASN签收', resource: 'asn', action: 'sign-in', category: '入库管理' },
    // 退件权限
    { code: 'return:read', name: '查看退件', resource: 'return', action: 'read', category: '入库管理' },
    { code: 'return:create', name: '创建预报退件', resource: 'return', action: 'create', category: '入库管理' },
    { code: 'return:disposition', name: '退件处理意见', resource: 'return', action: 'disposition', category: '入库管理' },
    { code: 'return:sign-in', name: '退件签收', resource: 'return', action: 'sign-in', category: '入库管理' },
    { code: 'return:count', name: '退件收货/清点', resource: 'return', action: 'count', category: '入库管理' },
    { code: 'return:putaway:create', name: '生成退件上架单', resource: 'return', action: 'putaway:create', category: '入库管理' },
    { code: 'return:putaway:execute', name: '执行退件上架', resource: 'return', action: 'putaway:execute', category: '入库管理' },
    // 收货权限
    { code: 'receiving:read', name: '查看收货', resource: 'receiving', action: 'read', category: '入库管理' },
    { code: 'receiving:execute', name: '执行收货', resource: 'receiving', action: 'execute', category: '入库管理' },
    { code: 'receiving:complete', name: '完成收货', resource: 'receiving', action: 'complete', category: '入库管理' },
    // 上架权限
    { code: 'putaway:read', name: '查看上架', resource: 'putaway', action: 'read', category: '入库管理' },
    { code: 'putaway:create', name: '创建上架单', resource: 'putaway', action: 'create', category: '入库管理' },
    { code: 'putaway:execute', name: '执行上架', resource: 'putaway', action: 'execute', category: '入库管理' },
    { code: 'putaway:complete', name: '完成上架', resource: 'putaway', action: 'complete', category: '入库管理' },
    // 上架作业权限
    { code: 'shelving:execute', name: '执行上架作业', resource: 'shelving', action: 'execute', category: '入库管理' },
    // 出库订单权限
    { code: 'order:read', name: '查看出库订单', resource: 'order', action: 'read', category: '出库管理' },
    { code: 'order:create', name: '创建出库订单', resource: 'order', action: 'create', category: '出库管理' },
    { code: 'order:update', name: '更新出库订单', resource: 'order', action: 'update', category: '出库管理' },
    { code: 'order:delete', name: '删除出库订单', resource: 'order', action: 'delete', category: '出库管理' },
    { code: 'order:cancel', name: '取消出库订单', resource: 'order', action: 'cancel', category: '出库管理' },
    { code: 'order:allocate', name: '分配库存', resource: 'order', action: 'allocate', category: '出库管理' },
    { code: 'order-intercept:read', name: '查看订单拦截', resource: 'order-intercept', action: 'read', category: '出库管理' },
    { code: 'order-intercept:write', name: '执行订单拦截', resource: 'order-intercept', action: 'write', category: '出库管理' },
    // 波次权限
    { code: 'wave:read', name: '查看波次', resource: 'wave', action: 'read', category: '出库管理' },
    { code: 'wave:create', name: '创建波次', resource: 'wave', action: 'create', category: '出库管理' },
    { code: 'wave:update', name: '更新波次', resource: 'wave', action: 'update', category: '出库管理' },
    { code: 'wave:release', name: '释放波次', resource: 'wave', action: 'release', category: '出库管理' },
    // 拣货权限
    { code: 'picking:read', name: '查看拣货任务', resource: 'picking', action: 'read', category: '出库管理' },
    { code: 'picking:create', name: '创建拣货任务', resource: 'picking', action: 'create', category: '出库管理' },
    { code: 'picking:update', name: '更新拣货任务', resource: 'picking', action: 'update', category: '出库管理' },
    { code: 'picking:execute', name: '执行拣货', resource: 'picking', action: 'execute', category: '出库管理' },
    { code: 'picking-exception:read', name: '查看拣货异常', resource: 'picking-exception', action: 'read', category: '出库管理' },
    { code: 'picking-exception:manage', name: '处理拣货异常', resource: 'picking-exception', action: 'manage', category: '出库管理' },
    { code: 'picking-exception:print', name: '打印补拣单', resource: 'picking-exception', action: 'print', category: '出库管理' },
    // 打包权限
    { code: 'packing:read', name: '查看打包', resource: 'packing', action: 'read', category: '出库管理' },
    { code: 'packing:execute', name: '执行打包', resource: 'packing', action: 'execute', category: '出库管理' },
    // 发货权限
    { code: 'shipping:read', name: '查看发货', resource: 'shipping', action: 'read', category: '出库管理' },
    { code: 'shipping:create', name: '创建发货', resource: 'shipping', action: 'create', category: '出库管理' },
    { code: 'shipping:update', name: '更新发货', resource: 'shipping', action: 'update', category: '出库管理' },
    { code: 'shipping:ship', name: '执行发货', resource: 'shipping', action: 'ship', category: '出库管理' },
    // 签出权限
    { code: 'checkout:read', name: '查看签出单', resource: 'checkout', action: 'read', category: '出库管理' },
    { code: 'checkout:execute', name: '执行签出', resource: 'checkout', action: 'execute', category: '出库管理' },
    { code: 'manifest-mount:execute', name: '执行集运挂载', resource: 'manifest-mount', action: 'execute', category: '出库管理' },
    // 出库总单权限
    { code: 'manifest-order:read', name: '查看出库总单', resource: 'manifest-order', action: 'read', category: '出库管理' },
    { code: 'manifest-order:create', name: '创建出库总单', resource: 'manifest-order', action: 'create', category: '出库管理' },
    { code: 'manifest-order:update', name: '更新出库总单', resource: 'manifest-order', action: 'update', category: '出库管理' },
    { code: 'manifest-order:complete', name: '完结出库总单', resource: 'manifest-order', action: 'complete', category: '出库管理' },
    { code: 'manifest-order:print', name: '打印出库总单', resource: 'manifest-order', action: 'print', category: '出库管理' },
    { code: 'manifest-order:export', name: '导出出库总单', resource: 'manifest-order', action: 'export', category: '出库管理' },
    // 分拣墙权限
    { code: 'sorting-wall:read', name: '查看分拣墙', resource: 'sorting-wall', action: 'read', category: '出库管理' },
    { code: 'sorting-wall:create', name: '创建分拣墙', resource: 'sorting-wall', action: 'create', category: '出库管理' },
    { code: 'sorting-wall:update', name: '更新分拣墙', resource: 'sorting-wall', action: 'update', category: '出库管理' },
    { code: 'sorting-wall:delete', name: '删除分拣墙', resource: 'sorting-wall', action: 'delete', category: '出库管理' },
    // 包材权限
    { code: 'packaging-material:read', name: '查看包材', resource: 'packaging-material', action: 'read', category: '包材管理' },
    { code: 'packaging-material:create', name: '创建包材', resource: 'packaging-material', action: 'create', category: '包材管理' },
    { code: 'packaging-material:update', name: '更新包材', resource: 'packaging-material', action: 'update', category: '包材管理' },
    { code: 'packaging-material:delete', name: '删除包材', resource: 'packaging-material', action: 'delete', category: '包材管理' },
    // 包材库存权限
    { code: 'packaging-material-inventory:read', name: '查看包材库存', resource: 'packaging-material-inventory', action: 'read', category: '包材管理' },
    { code: 'packaging-material-inventory:inbound', name: '包材入库', resource: 'packaging-material-inventory', action: 'inbound', category: '包材管理' },
    { code: 'packaging-material-inventory:outbound', name: '包材出库', resource: 'packaging-material-inventory', action: 'outbound', category: '包材管理' },
    // 包材流水权限
    { code: 'packaging-material-transaction:read', name: '查看包材流水', resource: 'packaging-material-transaction', action: 'read', category: '包材管理' },
    { code: 'packaging-material-transaction:audit', name: '审计包材流水', resource: 'packaging-material-transaction', action: 'audit', category: '包材管理' },
    // 报表权限
    { code: 'report:read', name: '查看报表', resource: 'report', action: 'read', category: '报表管理' },
    // 拣货分配配置权限
    { code: 'pick-assignment-rule:read', name: '查看拣货分配规则', resource: 'pick-assignment-rule', action: 'read', category: '系统管理' },
    { code: 'pick-assignment-rule:create', name: '创建拣货分配规则', resource: 'pick-assignment-rule', action: 'create', category: '系统管理' },
    { code: 'pick-assignment-rule:update', name: '更新拣货分配规则', resource: 'pick-assignment-rule', action: 'update', category: '系统管理' },
    { code: 'pick-assignment-rule:delete', name: '删除拣货分配规则', resource: 'pick-assignment-rule', action: 'delete', category: '系统管理' },
    { code: 'picker-profile:read', name: '查看拣货员档案', resource: 'picker-profile', action: 'read', category: '系统管理' },
    { code: 'picker-profile:create', name: '创建拣货员档案', resource: 'picker-profile', action: 'create', category: '系统管理' },
    { code: 'picker-profile:update', name: '更新拣货员档案', resource: 'picker-profile', action: 'update', category: '系统管理' },
    { code: 'picker-profile:delete', name: '删除拣货员档案', resource: 'picker-profile', action: 'delete', category: '系统管理' },
    // 作业管理权限
    { code: 'job:read', name: '查看作业', resource: 'job', action: 'read', category: '系统管理' },
    { code: 'job:create', name: '创建作业', resource: 'job', action: 'create', category: '系统管理' },
    { code: 'job:cancel', name: '取消作业', resource: 'job', action: 'cancel', category: '系统管理' },
    { code: 'job:retry', name: '重试作业', resource: 'job', action: 'retry', category: '系统管理' },
    { code: 'job:download', name: '下载作业结果', resource: 'job', action: 'download', category: '系统管理' },
    // 定时任务权限
    { code: 'scheduled-task:read', name: '查看定时任务', resource: 'scheduled-task', action: 'read', category: '系统管理' },
    { code: 'scheduled-task:update', name: '更新定时任务', resource: 'scheduled-task', action: 'update', category: '系统管理' },
    { code: 'scheduled-task:trigger', name: '触发定时任务', resource: 'scheduled-task', action: 'trigger', category: '系统管理' },
    // 审计日志权限
    { code: 'audit:read', name: '查看审计日志', resource: 'audit', action: 'read', category: '系统管理' },
    { code: 'audit:export', name: '导出审计日志', resource: 'audit', action: 'export', category: '系统管理' },
    // API密钥权限
    { code: 'api-key:read', name: '查看API密钥', resource: 'api-key', action: 'read', category: '系统管理' },
    { code: 'api-key:create', name: '创建API密钥', resource: 'api-key', action: 'create', category: '系统管理' },
    { code: 'api-key:update', name: '更新API密钥', resource: 'api-key', action: 'update', category: '系统管理' },
    { code: 'api-key:delete', name: '删除API密钥', resource: 'api-key', action: 'delete', category: '系统管理' },
    // 打印设置权限
    { code: 'print:settings', name: '打印设置', resource: 'print', action: 'settings', category: '系统管理' },
    { code: 'print:template:read', name: '查看打印模板', resource: 'print-template', action: 'read', category: '系统管理' },
    { code: 'print:template:create', name: '创建打印模板', resource: 'print-template', action: 'create', category: '系统管理' },
    { code: 'print:template:update', name: '更新打印模板', resource: 'print-template', action: 'update', category: '系统管理' },
    { code: 'print:template:delete', name: '删除打印模板', resource: 'print-template', action: 'delete', category: '系统管理' },
    { code: 'print:device:read', name: '查看打印设备', resource: 'print-device', action: 'read', category: '系统管理' },
    { code: 'print:device:create', name: '创建打印设备', resource: 'print-device', action: 'create', category: '系统管理' },
    { code: 'print:device:update', name: '更新打印设备', resource: 'print-device', action: 'update', category: '系统管理' },
    { code: 'print:device:delete', name: '删除打印设备', resource: 'print-device', action: 'delete', category: '系统管理' },
    { code: 'print:history:read', name: '查看打印历史', resource: 'print-history', action: 'read', category: '系统管理' },
  ]

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { permissionCode: perm.code },
      update: {},
      create: {
        permissionCode: perm.code,
        permissionName: perm.name,
        resourceType: perm.resource,
        action: perm.action,
        category: perm.category,
        isSystem: true,
        isActive: true,
      },
    })
  }
  console.log('创建权限:', permissions.length, '个')

  // 为系统管理员角色分配所有权限
  for (const perm of permissions) {
    const permission = await prisma.permission.findUnique({
      where: { permissionCode: perm.code },
    })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          permissionId: permission.id,
          isGranted: true,
        },
      })
    }
  }
  console.log('分配权限给系统管理员:', permissions.length, '个')

  // ==================== 客户基础数据 ====================

  const clientConfigs = [
    {
      clientCode: 'C001',
      clientName: '测试客户A',
      shortName: '客户A',
      clientType: 'STANDARD',
      contactPerson: '张三',
      contactPhone: '13800138001',
      contactEmail: 'zhangsan@example.com',
      city: '上海',
      country: 'CN',
    },
    {
      clientCode: 'C002',
      clientName: '测试客户B',
      shortName: '客户B',
      clientType: 'STANDARD',
      contactPerson: '李四',
      contactPhone: '13800138002',
      contactEmail: 'lisi@example.com',
      city: '北京',
      country: 'CN',
    },
    {
      clientCode: 'C003',
      clientName: '测试客户C',
      shortName: '客户C',
      clientType: 'STANDARD',
      contactPerson: '王五',
      contactPhone: '13800138003',
      contactEmail: 'wangwu@example.com',
      city: '广州',
      country: 'CN',
    },
  ]

  for (const clientConfig of clientConfigs) {
    await prisma.client.upsert({
      where: {
        tenantId_clientCode: {
          tenantId: tenant.id,
          clientCode: clientConfig.clientCode,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...clientConfig,
        isActive: true,
        createdBy: adminUser.id,
        config: {},
      },
    })
  }
  console.log('创建客户:', clientConfigs.length, '个')

  // ==================== 仓库基础数据 ====================

  // 创建仓库
  const warehouse = await prisma.warehouse.upsert({
    where: {
      tenantId_warehouseCode: {
        tenantId: tenant.id,
        warehouseCode: 'WH-SH-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      warehouseCode: 'WH-SH-001',
      warehouseName: '上海仓库',
      warehouseType: 'SELF_BUILT',
      address: '上海市浦东新区物流园区1号',
      city: '上海',
      country: 'CN',
      region: 'APAC',
      warehouseArea: 5000,
      status: 'ACTIVE',
    },
  })
  console.log('创建仓库:', warehouse.warehouseName)

  // 创建库区
  const zoneConfigs = [
    { code: 'RECV-01', name: '收货区', type: 'RECEIVING', capacity: 500, qualityType: 'GOOD' },
    { code: 'STOR-01', name: '存储区', type: 'STORAGE', capacity: 5000, qualityType: 'GOOD' },
    { code: 'PICK-01', name: '拣货区', type: 'PICKING', capacity: 3000, qualityType: 'GOOD' },
    { code: 'PACK-01', name: '打包区', type: 'PACKING', capacity: 500, qualityType: 'GOOD' },
    { code: 'SHIP-01', name: '发货区', type: 'SHIPPING', capacity: 500, qualityType: 'GOOD' },
    // E2E 测试用：残品库区
    { code: 'DAMAGE-01', name: '残品库区', type: 'STORAGE', capacity: 500, qualityType: 'DAMAGED' },
  ]

  const zones: Record<string, { id: string }> = {}
  for (const zoneConfig of zoneConfigs) {
    const zone = await prisma.zone.upsert({
      where: {
        warehouseId_zoneCode: {
          warehouseId: warehouse.id,
          zoneCode: zoneConfig.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        zoneCode: zoneConfig.code,
        zoneName: zoneConfig.name,
        zoneType: zoneConfig.type,
        qualityType: zoneConfig.qualityType,
        capacityUnits: zoneConfig.capacity,
        status: 'ACTIVE',
      },
    })
    zones[zoneConfig.code] = zone
  }
  console.log('创建库区:', zoneConfigs.length, '个')

  // 创建库位
  const binConfigs = [
    // 存储区库位
    { code: 'A-01-01-01', zone: 'STOR-01', type: 'RACK', aisle: 'A', rack: '01', shelf: '01', bin: '01', pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'A-01-01-02', zone: 'STOR-01', type: 'RACK', aisle: 'A', rack: '01', shelf: '01', bin: '02', pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'A-01-02-01', zone: 'STOR-01', type: 'RACK', aisle: 'A', rack: '01', shelf: '02', bin: '01', pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'A-01-02-02', zone: 'STOR-01', type: 'RACK', aisle: 'A', rack: '01', shelf: '02', bin: '02', pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    // 拣货区库位
    { code: 'P-01-01-01', zone: 'PICK-01', type: 'SHELF', aisle: 'P', rack: '01', shelf: '01', bin: '01', pickable: true, receivable: false, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'P-01-01-02', zone: 'PICK-01', type: 'SHELF', aisle: 'P', rack: '01', shelf: '01', bin: '02', pickable: true, receivable: false, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'P-01-02-01', zone: 'PICK-01', type: 'SHELF', aisle: 'P', rack: '01', shelf: '02', bin: '01', pickable: true, receivable: false, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'P-01-02-02', zone: 'PICK-01', type: 'SHELF', aisle: 'P', rack: '01', shelf: '02', bin: '02', pickable: true, receivable: false, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    // 收货区库位
    { code: 'R-01-01', zone: 'RECV-01', type: 'STAGING', aisle: 'R', rack: '01', shelf: '01', bin: null, pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'R-01-02', zone: 'RECV-01', type: 'STAGING', aisle: 'R', rack: '01', shelf: '02', bin: null, pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    // 发货区库位
    { code: 'S-01-01', zone: 'SHIP-01', type: 'STAGING', aisle: 'S', rack: '01', shelf: '01', bin: null, pickable: false, receivable: false, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'S-01-02', zone: 'SHIP-01', type: 'STAGING', aisle: 'S', rack: '01', shelf: '02', bin: null, pickable: false, receivable: false, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    // ========== E2E 测试用特殊库位 ==========
    // 残品库区库位
    { code: 'D-01-01-01', zone: 'DAMAGE-01', type: 'RACK', aisle: 'D', rack: '01', shelf: '01', bin: '01', pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'D-01-01-02', zone: 'DAMAGE-01', type: 'RACK', aisle: 'D', rack: '01', shelf: '01', bin: '02', pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    // 锁定状态库位（测试锁定库位上架失败）
    { code: 'LOCKED-BIN-001', zone: 'STOR-01', type: 'RACK', aisle: 'X', rack: '01', shelf: '01', bin: '01', pickable: false, receivable: true, lockStatus: 'LOCKED', status: 'ACTIVE' },
    // 不可上架库位（测试不可上架库位上架失败）
    { code: 'NOT-RECEIVABLE-BIN', zone: 'STOR-01', type: 'RACK', aisle: 'X', rack: '01', shelf: '02', bin: '01', pickable: false, receivable: false, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    // 禁用状态库位
    { code: 'DISABLED-BIN-001', zone: 'STOR-01', type: 'RACK', aisle: 'X', rack: '01', shelf: '03', bin: '01', pickable: false, receivable: true, lockStatus: 'UNLOCKED', status: 'DISABLED' },
    // E2E 测试专用库位（每次测试前会清理库存）
    { code: 'E2E-TEST-BIN-001', zone: 'STOR-01', type: 'RACK', aisle: 'E', rack: '2E', shelf: '01', bin: '01', pickable: true, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
    { code: 'E2E-TEST-BIN-002', zone: 'STOR-01', type: 'RACK', aisle: 'E', rack: '2E', shelf: '01', bin: '02', pickable: true, receivable: true, lockStatus: 'UNLOCKED', status: 'ACTIVE' },
  ]

  for (const binConfig of binConfigs) {
    await prisma.binLocation.upsert({
      where: {
        warehouseId_locationCode: {
          warehouseId: warehouse.id,
          locationCode: binConfig.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        zoneId: zones[binConfig.zone].id,
        locationCode: binConfig.code,
        locationType: binConfig.type,
        aisle: binConfig.aisle,
        rack: binConfig.rack,
        shelf: binConfig.shelf,
        bin: binConfig.bin,
        isPickable: binConfig.pickable,
        isReceivable: binConfig.receivable,
        lockStatus: binConfig.lockStatus,
        status: binConfig.status,
      },
    })
  }
  console.log('创建库位:', binConfigs.length, '个')

  // ==================== 包材数据 ====================

  const packagingMaterialConfigs = [
    { code: 'PM-BOX-S', name: '小号纸箱', type: 'CARTON', lengthCm: 20, widthCm: 15, heightCm: 10, weightKg: 0.2, unitPrice: 2.5 },
    { code: 'PM-BOX-M', name: '中号纸箱', type: 'CARTON', lengthCm: 35, widthCm: 25, heightCm: 20, weightKg: 0.4, unitPrice: 4.0 },
    { code: 'PM-BOX-L', name: '大号纸箱', type: 'CARTON', lengthCm: 50, widthCm: 40, heightCm: 30, weightKg: 0.6, unitPrice: 6.5 },
    { code: 'PM-BAG-S', name: '小号快递袋', type: 'BAG', lengthCm: 25, widthCm: 20, heightCm: null, weightKg: 0.02, unitPrice: 0.3 },
    { code: 'PM-BAG-M', name: '中号快递袋', type: 'BAG', lengthCm: 35, widthCm: 28, heightCm: null, weightKg: 0.03, unitPrice: 0.5 },
    { code: 'PM-BAG-L', name: '大号快递袋', type: 'BAG', lengthCm: 45, widthCm: 35, heightCm: null, weightKg: 0.04, unitPrice: 0.8 },
    { code: 'PM-TAPE-01', name: '透明胶带', type: 'TAPE', lengthCm: null, widthCm: 4.5, heightCm: null, weightKg: 0.15, unitPrice: 3.0 },
    { code: 'PM-FILL-01', name: '气泡膜', type: 'FILLER', lengthCm: 100, widthCm: 50, heightCm: null, weightKg: 0.1, unitPrice: 1.5 },
  ]

  for (const materialConfig of packagingMaterialConfigs) {
    const material = await prisma.packagingMaterial.upsert({
      where: {
        tenantId_materialCode: {
          tenantId: tenant.id,
          materialCode: materialConfig.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        materialCode: materialConfig.code,
        materialName: materialConfig.name,
        materialType: materialConfig.type,
        lengthCm: materialConfig.lengthCm,
        widthCm: materialConfig.widthCm,
        heightCm: materialConfig.heightCm,
        weightKg: materialConfig.weightKg,
        unitPrice: materialConfig.unitPrice,
        currency: 'CNY',
        isActive: true,
      },
    })

    // 创建包材库存
    await prisma.packagingMaterialInventory.upsert({
      where: {
        warehouseId_materialId: {
          warehouseId: warehouse.id,
          materialId: material.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        materialId: material.id,
        materialCode: materialConfig.code,
        materialName: materialConfig.name,
        totalQuantity: 1000,
        availableQuantity: 1000,
        allocatedQuantity: 0,
        onOrderQuantity: 0,
        safetyStock: 100,
        minimumStock: 50,
        maximumStock: 5000,
        status: 'NORMAL',
      },
    })
  }
  console.log('创建包材:', packagingMaterialConfigs.length, '个')
  console.log('创建包材库存:', packagingMaterialConfigs.length, '个')

  // ==================== E2E 测试用 API Key ====================

  // 测试 API Key: wms_test_key_for_e2e_testing
  // SHA256 哈希值
  const testApiKeyHash = '0ee221fd5773867354382e6af71e50710329e52c3579a0744967ea0a3003d329'

  await prisma.apiKey.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'E2E测试专用Key',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'E2E测试专用Key',
      description: 'Playwright E2E 测试使用的 API Key，拥有完整权限',
      keyHash: testApiKeyHash,
      keyPrefix: 'wms_test_',
      scopes: ['asn:*', 'sku:*', 'order:*', 'return:*', 'inventory:*', 'container:*'],
      rateLimit: 1000,
      isActive: true,
      createdBy: adminUser.id,
    },
  })
  console.log('创建 E2E 测试 API Key')

  // ==================== E2E 测试场景 ====================
  const e2eSyncResult = await syncScenarioTemplates(prisma, {
    cleanupLegacySeedData: true,
  })
  console.log('同步 E2E 模板分类:', e2eSyncResult.categoriesCreated, '个')
  console.log('同步 E2E 模板场景:', e2eSyncResult.scenariosSynced, '个')

  console.log('数据库初始化完成!')
}

main()
  .catch((e) => {
    console.error('初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
