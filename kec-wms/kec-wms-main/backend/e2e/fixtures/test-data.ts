// E2E 测试租户常量（与 setup-e2e-tenant.ts 保持一致）
export const E2E_TENANT_CODE = 'E2E-TEST'
export const E2E_CLIENT_CODE = 'E2E-C001'
export const E2E_WAREHOUSE_CODE = 'E2E-WH-001'

// E2E SKU 编码
export const E2E_SKU_CODES = {
  normal: 'E2E-SKU-NORMAL-001',
  batch: 'E2E-SKU-BATCH-001',
  expiry: 'E2E-SKU-EXPIRY-001',
  serial: 'E2E-SKU-SERIAL-001',
  full: 'E2E-SKU-FULL-001',
}

// E2E 容器编码
export const E2E_CONTAINER_CODES = {
  general: ['E2E-CONT-001', 'E2E-CONT-002', 'E2E-CONT-003', 'E2E-CONT-004', 'E2E-CONT-005'],
  disabled: 'E2E-CT-DISABLED',
  occupied: 'E2E-CT-OCCUPIED',
  empty: 'E2E-CT-EMPTY',
  overqty: 'E2E-CT-OVERQTY',
  append: 'E2E-CT-APPEND',
  partial: 'E2E-CT-PARTIAL',
}

// E2E 库位编码
export const E2E_BIN_CODES = {
  receiving: 'E2E-RCV-01',
  staging: 'E2E-STG-01',
  storage: ['E2E-A01-01', 'E2E-A01-02', 'E2E-A01-03', 'E2E-A02-01', 'E2E-A02-02'],
  damage: 'E2E-DMG-01',
  shipping: 'E2E-SHP-01',
  picking: 'E2E-PCK-01',
  locked: 'E2E-LOCKED-01',
  notReceivable: 'E2E-NOREC-01',
}

/**
 * 生成测试数据
 */
export function generateTestData(prefix: string = 'E2E') {
  const timestamp = Date.now();
  // 使用时间戳的后6位，避免生成的代码过长
  const shortTimestamp = timestamp.toString().slice(-6);
  // 使用更短的前缀（取前2个字符）以适应 ASN 单号长度限制
  const shortPrefix = prefix.slice(0, 2);

  return {
    timestamp,
    clientCode: `${shortPrefix}C${shortTimestamp}`,
    clientName: `${prefix}测试客户-${timestamp}`,
    warehouseCode: `${shortPrefix}W${shortTimestamp}`,
    warehouseName: `${prefix}测试仓库-${timestamp}`,
    sku1Code: `${shortPrefix}S1${shortTimestamp}`,
    sku1Name: `${prefix}测试商品1-${timestamp}`,
    sku2Code: `${shortPrefix}S2${shortTimestamp}`,
    sku2Name: `${prefix}测试商品2-${timestamp}`,
    containerCode: `${shortPrefix}CT${shortTimestamp}`,
    batchNumber: `B${shortTimestamp}`,
  };
}

/**
 * 生成未来日期（用于效期）
 */
export function generateFutureDate(daysFromNow: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * 生成序列号列表
 */
export function generateSerialNumbers(prefix: string, count: number): string[] {
  const timestamp = Date.now();
  return Array.from({ length: count }, (_, i) => `${prefix}-SN-${timestamp}-${i + 1}`);
}

/**
 * 生成出库测试数据
 */
export function generateOutboundTestData(prefix: string = 'OUT') {
  const timestamp = Date.now();
  const shortTimestamp = timestamp.toString().slice(-6);
  const shortPrefix = prefix.slice(0, 2);

  return {
    timestamp,
    // 出库订单相关
    orderNumber: `${shortPrefix}O${shortTimestamp}`,
    externalOrderNumber: `EXT${shortPrefix}${shortTimestamp}`,
    // 波次相关
    waveNumber: `${shortPrefix}W${shortTimestamp}`,
    // 拣货单相关
    pickOrderNumber: `${shortPrefix}P${shortTimestamp}`,
    // 集运单相关
    manifestNumber: `${shortPrefix}M${shortTimestamp}`,
    // 物流相关
    trackingNumber: `TRK${shortTimestamp}`,
    channelCode: `CH${shortTimestamp}`,
    channelName: `测试渠道-${timestamp}`,
    // 收货地址
    contactName: `测试收货人-${shortTimestamp}`,
    contactPhone: `138${shortTimestamp}`,
    addressLine: `测试地址-${timestamp}`,
    city: '上海市',
    province: '上海',
    country: 'CN',
    postalCode: '200000',
  };
}

/**
 * 生成收货地址数据
 */
export function generateAddress(prefix: string = 'ADDR') {
  const timestamp = Date.now();
  const shortTimestamp = timestamp.toString().slice(-6);

  return {
    contactName: `收货人-${shortTimestamp}`,
    contactPhone: `139${shortTimestamp}`,
    addressLine: `${prefix}测试街道${shortTimestamp}号`,
    city: '上海市',
    province: '上海',
    country: 'CN',
    postalCode: '200000',
  };
}
