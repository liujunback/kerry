export const PRINT_SCENARIO_TYPES = [
  'SHIPMENT_LABEL',
  'BIN_LOCATION_LABEL',
  'CONTAINER_LABEL',
  'SKU_LABEL',
  'PDA_LOGIN_QR',
  'PUTAWAY_ORDER',
  'PICK_ORDER',
  'WAVE_PICK_LIST',
  'MANIFEST_ORDER',
] as const

export type PrintScenarioType = (typeof PRINT_SCENARIO_TYPES)[number]

export const SYSTEM_LABEL_SPECS = [
  {
    code: 'LABEL_60X40',
    name: '标签 60 × 40 mm',
    widthMm: 60,
    heightMm: 40,
    orientation: 'landscape',
    usage: '库位标签、容器标签、SKU 标签',
  },
  {
    code: 'LABEL_90X130',
    name: '标签 90 × 130 mm',
    widthMm: 90,
    heightMm: 130,
    orientation: 'portrait',
    usage: 'PDA 快捷登录二维码',
  },
  {
    code: 'LABEL_100X150',
    name: '标签 100 × 150 mm',
    widthMm: 100,
    heightMm: 150,
    orientation: 'portrait',
    usage: '发货单、服务商标签、10×15 拣货清单',
  },
  {
    code: 'LABEL_150X100',
    name: '标签 150 × 100 mm',
    widthMm: 150,
    heightMm: 100,
    orientation: 'landscape',
    usage: '上架单',
  },
  {
    code: 'A4_DOCUMENT',
    name: 'A4 单据',
    widthMm: 210,
    heightMm: 297,
    orientation: 'portrait',
    usage: '默认拣货单、波次拣货清单、出库总单',
  },
] as const

export const PRINT_SCENARIO_LABELS: Record<PrintScenarioType, string> = {
  SHIPMENT_LABEL: '发货单/服务商标签',
  BIN_LOCATION_LABEL: '库位标签',
  CONTAINER_LABEL: '容器标签',
  SKU_LABEL: 'SKU 标签',
  PDA_LOGIN_QR: 'PDA 快捷登录二维码',
  PUTAWAY_ORDER: '上架单',
  PICK_ORDER: '拣货单',
  WAVE_PICK_LIST: '波次拣货清单',
  MANIFEST_ORDER: '出库总单',
}

export const PRINT_SCENARIO_DEFAULT_SPEC: Record<PrintScenarioType, string> = {
  SHIPMENT_LABEL: 'LABEL_100X150',
  BIN_LOCATION_LABEL: 'LABEL_60X40',
  CONTAINER_LABEL: 'LABEL_60X40',
  SKU_LABEL: 'LABEL_60X40',
  PDA_LOGIN_QR: 'LABEL_90X130',
  PUTAWAY_ORDER: 'LABEL_150X100',
  PICK_ORDER: 'A4_DOCUMENT',
  WAVE_PICK_LIST: 'A4_DOCUMENT',
  MANIFEST_ORDER: 'A4_DOCUMENT',
}

export const PRINT_SCENARIO_ALLOWED_SPECS: Record<PrintScenarioType, string[]> = {
  SHIPMENT_LABEL: ['LABEL_100X150'],
  BIN_LOCATION_LABEL: ['LABEL_60X40'],
  CONTAINER_LABEL: ['LABEL_60X40'],
  SKU_LABEL: ['LABEL_60X40'],
  PDA_LOGIN_QR: ['LABEL_90X130'],
  PUTAWAY_ORDER: ['LABEL_150X100'],
  PICK_ORDER: ['A4_DOCUMENT', 'LABEL_100X150'],
  WAVE_PICK_LIST: ['A4_DOCUMENT'],
  MANIFEST_ORDER: ['A4_DOCUMENT'],
}
