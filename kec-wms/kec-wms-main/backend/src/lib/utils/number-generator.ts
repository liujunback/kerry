import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

type AsnSequenceClient = Pick<typeof prisma, 'asnSequence'>
type PickOrderSequenceClient = Pick<typeof prisma, 'pickOrderSequence'>

const OUTBOUND_ORDER_SEQUENCE_MAX_CONFLICT_RETRIES = 3

function getUniqueConstraintTargets(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = (error.meta as { target?: unknown } | undefined)?.target
  if (Array.isArray(target)) {
    return target.map((item) => String(item).toLowerCase())
  }
  if (typeof target === 'string') {
    return [target.toLowerCase()]
  }
  return []
}

function isOutboundOrderSequenceConflict(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false
  }

  const targets = getUniqueConstraintTargets(error)
  return (
    targets.includes('uq_outbound_order_sequence_scope') ||
    (targets.includes('tenant_id') &&
      targets.includes('warehouse_code') &&
      targets.includes('date_key')) ||
    error.message.includes('uq_outbound_order_sequence_scope')
  )
}

/**
 * 生成ASN单号
 * 格式: ASN-{仓库代码}-{日期YYMMDD}-{4位流水号}
 * 例如: ASN-WH01-260204-0001
 */
export async function generateAsnNumber(
  tenantId: string,
  warehouseCode: string,
  db: AsnSequenceClient = prisma
): Promise<string> {
  const today = new Date()
  const dateKey = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `ASN-${warehouseCode}-${dateStr}-`
  const sequence = await db.asnSequence.upsert({
    where: {
      tenantId_warehouseCode_dateKey: {
        tenantId,
        warehouseCode,
        dateKey,
      },
    },
    create: {
      tenantId,
      warehouseCode,
      dateKey,
      currentValue: 1,
    },
    update: {
      currentValue: {
        increment: 1,
      },
    },
    select: {
      currentValue: true,
    },
  })

  return `${prefix}${sequence.currentValue.toString().padStart(4, '0')}`
}

/**
 * 生成收货任务单号
 * 格式: RT-{仓库代码}-{日期YYMMDD}-{4位流水号}
 * 例如: RT-WH01-260204-0001
 */
export async function generateReceivingTaskNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `RT-${warehouseCode}-${dateStr}-`

  // 这里需要在实现收货任务表后补充查询逻辑
  // 暂时返回基础格式
  const timestamp = Date.now().toString().slice(-4)
  return `${prefix}${timestamp}`
}

/**
 * 生成上架详情编号
 * 格式: PD-{仓库代码}-{日期YYMMDD}-{4位流水号}
 * 例如: PD-WH01-260204-0001
 */
export async function generatePutawayDetailNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `PD-${warehouseCode}-${dateStr}-`

  const lastDetail = await prisma.putawayDetail.findFirst({
    where: {
      tenantId,
      detailNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      detailNumber: 'desc',
    },
    select: {
      detailNumber: true,
    },
  })

  let sequence = 1
  if (lastDetail) {
    const lastSequence = parseInt(lastDetail.detailNumber.slice(-4), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

/**
 * 生成上架单号
 * 格式: PO-{仓库代码}-{日期YYMMDD}-{4位流水号}
 * 例如: PO-WH01-260204-0001
 */
export async function generatePutawayOrderNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `PO-${warehouseCode}-${dateStr}-`

  const lastOrder = await prisma.putawayOrder.findFirst({
    where: {
      tenantId,
      putawayOrderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      putawayOrderNumber: 'desc',
    },
    select: {
      putawayOrderNumber: true,
    },
  })

  let sequence = 1
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.putawayOrderNumber.slice(-4), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

/**
 * 生成退件单号
 * 格式: RTN-{仓库代码}-{日期YYMMDD}-{4位流水号}
 */
export async function generateReturnNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `RTN-${warehouseCode}-${dateStr}-`

  const lastOrder = await prisma.returnOrder.findFirst({
    where: {
      tenantId,
      returnNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      returnNo: 'desc',
    },
    select: {
      returnNo: true,
    },
  })

  let sequence = 1
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.returnNo.slice(-4), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

/**
 * 生成退件上架单号
 * 格式: RPO-{仓库代码}-{日期YYMMDD}-{4位流水号}
 */
export async function generateReturnPutawayOrderNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `RPO-${warehouseCode}-${dateStr}-`

  const lastOrder = await prisma.returnPutawayOrder.findFirst({
    where: {
      tenantId,
      putawayOrderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      putawayOrderNumber: 'desc',
    },
    select: {
      putawayOrderNumber: true,
    },
  })

  let sequence = 1
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.putawayOrderNumber.slice(-4), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

/**
 * 生成退件上架详情编号
 * 格式: RPD-{仓库代码}-{日期YYMMDD}-{4位流水号}
 */
export async function generateReturnPutawayDetailNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `RPD-${warehouseCode}-${dateStr}-`

  const lastDetail = await prisma.returnPutawayDetail.findFirst({
    where: {
      tenantId,
      detailNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      detailNumber: 'desc',
    },
    select: {
      detailNumber: true,
    },
  })

  let sequence = 1
  if (lastDetail) {
    const lastSequence = parseInt(lastDetail.detailNumber.slice(-4), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

/**
 * 生成差异记录编号
 * 格式: DIS-{日期YYMMDD}-{6位流水号}
 * 例如: DIS-260204-000001
 */
export async function generateDiscrepancyNumber(
  _tenantId: string
): Promise<string> {
  void _tenantId
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `DIS-${dateStr}-`

  // ReceivingDiscrepancy model not implemented yet
  // Generate a simple timestamp-based number
  const timestamp = Date.now().toString().slice(-6)
  return `${prefix}${timestamp}`
}

/**
 * 生成出库订单号
 * 格式: OB-{仓库代码}-{日期YYMMDD}-{4位流水号}
 * 例如: OB-WH01-260204-0001
 */
export async function generateOutboundOrderNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateKey = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `OB-${warehouseCode}-${dateStr}-`
  const sequenceWhere = {
    tenantId_warehouseCode_dateKey: {
      tenantId,
      warehouseCode,
      dateKey,
    },
  }

  for (let attempt = 0; attempt <= OUTBOUND_ORDER_SEQUENCE_MAX_CONFLICT_RETRIES; attempt++) {
    try {
      const sequence = await prisma.outboundOrderSequence.upsert({
        where: sequenceWhere,
        create: {
          tenantId,
          warehouseCode,
          dateKey,
          currentValue: 1,
        },
        update: {
          currentValue: {
            increment: 1,
          },
        },
        select: {
          currentValue: true,
        },
      })

      return `${prefix}${sequence.currentValue.toString().padStart(4, '0')}`
    } catch (error) {
      if (
        !isOutboundOrderSequenceConflict(error) ||
        attempt === OUTBOUND_ORDER_SEQUENCE_MAX_CONFLICT_RETRIES
      ) {
        throw error
      }

      const sequence = await prisma.outboundOrderSequence.update({
        where: sequenceWhere,
        data: {
          currentValue: {
            increment: 1,
          },
        },
        select: {
          currentValue: true,
        },
      })

      return `${prefix}${sequence.currentValue.toString().padStart(4, '0')}`
    }
  }

  throw new Error('OUTBOUND_ORDER_SEQUENCE_GENERATION_FAILED')
}

/**
 * 生成波次号
 * 格式: WV-{仓库代码}-{日期YYMMDD}-{4位流水号}
 * 例如: WV-WH01-260204-0001
 */
export async function generateWaveNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `WV-${warehouseCode}-${dateStr}-`

  const lastWave = await prisma.wave.findFirst({
    where: {
      tenantId,
      waveNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      waveNumber: 'desc',
    },
    select: {
      waveNumber: true,
    },
  })

  let sequence = 1
  if (lastWave) {
    const lastSequence = parseInt(lastWave.waveNumber.slice(-4), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

/**
 * 生成拣货任务号
 * 格式: PK-{仓库代码}-{日期YYMMDD}-{4位流水号}
 * 例如: PK-WH01-260204-0001
 */
export async function generatePickTaskNumber(
  tenantId: string,
  warehouseCode: string,
  db: PickOrderSequenceClient = prisma
): Promise<string> {
  const today = new Date()
  const dateKey = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `PK-${warehouseCode}-${dateStr}-`

  const sequence = await db.pickOrderSequence.upsert({
    where: {
      tenantId_warehouseCode_dateKey: {
        tenantId,
        warehouseCode,
        dateKey,
      },
    },
    create: {
      tenantId,
      warehouseCode,
      dateKey,
      currentValue: 1,
    },
    update: {
      currentValue: {
        increment: 1,
      },
    },
    select: {
      currentValue: true,
    },
  })

  return `${prefix}${sequence.currentValue.toString().padStart(4, '0')}`
}

export async function generatePickTaskNumbers(
  tenantId: string,
  warehouseCode: string,
  count: number,
  db: PickOrderSequenceClient = prisma
): Promise<string[]> {
  if (count <= 0) {
    return []
  }

  const today = new Date()
  const dateKey = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `PK-${warehouseCode}-${dateStr}-`

  const sequence = await db.pickOrderSequence.upsert({
    where: {
      tenantId_warehouseCode_dateKey: {
        tenantId,
        warehouseCode,
        dateKey,
      },
    },
    create: {
      tenantId,
      warehouseCode,
      dateKey,
      currentValue: count,
    },
    update: {
      currentValue: {
        increment: count,
      },
    },
    select: {
      currentValue: true,
    },
  })

  const end = sequence.currentValue
  const start = end - count + 1

  return Array.from({ length: count }, (_, index) => {
    const value = start + index
    return `${prefix}${value.toString().padStart(4, '0')}`
  })
}

/**
 * 生成发货单号
 * 格式: SH-{仓库代码}-{日期YYMMDD}-{4位流水号}
 * 例如: SH-WH01-260204-0001
 */
export async function generateShipmentNumber(
  tenantId: string,
  warehouseCode: string
): Promise<string> {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  const prefix = `SH-${warehouseCode}-${dateStr}-`

  const lastShipment = await prisma.shipment.findFirst({
    where: {
      tenantId,
      shipmentNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      shipmentNumber: 'desc',
    },
    select: {
      shipmentNumber: true,
    },
  })

  let sequence = 1
  if (lastShipment) {
    const lastSequence = parseInt(lastShipment.shipmentNumber.slice(-4), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

interface GenerateNumberOptions {
  prefix?: string
  dateFormat?: 'YYYYMMDD' | 'YYMMDD' | 'MMDD'
  sequenceLength?: number
}

// 内存中的序列号计数器（用于简单场景）
const sequenceCounters = new Map<string, number>()

/**
 * 通用单号生成器
 * 用于生成各种业务单号
 * @param tenantId 租户ID
 * @param type 单号类型，用于区分不同业务
 * @param options 配置选项
 */
export async function generateNumber(
  _tenantId: string,
  type: string,
  options: GenerateNumberOptions = {}
): Promise<string> {
  const { prefix = type, dateFormat = 'YYYYMMDD', sequenceLength = 6 } = options

  const today = new Date()
  let dateStr: string

  switch (dateFormat) {
    case 'YYYYMMDD':
      dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      break
    case 'YYMMDD':
      dateStr = today.toISOString().slice(2, 10).replace(/-/g, '')
      break
    case 'MMDD':
      dateStr = today.toISOString().slice(5, 10).replace(/-/g, '')
      break
    default:
      dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  }

  const numberPrefix = `${prefix}-${dateStr}-`
  const counterKey = `${type}:${dateStr}`

  // 获取或初始化计数器
  let sequence = sequenceCounters.get(counterKey) || 0
  sequence += 1
  sequenceCounters.set(counterKey, sequence)

  // 添加随机后缀以避免重复（在分布式环境中）
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')

  return `${numberPrefix}${sequence.toString().padStart(sequenceLength - 3, '0')}${randomSuffix}`
}
