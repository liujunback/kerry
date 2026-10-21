import http from 'k6/http'
import exec from 'k6/execution'
import { check, sleep } from 'k6'

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const API_KEY = __ENV.API_KEY || ''
const CLIENT_CODE = __ENV.CLIENT_CODE || ''
const WAREHOUSE_CODE = __ENV.WAREHOUSE_CODE || ''
const SCENARIO = __ENV.SCENARIO || 'sku-create'
const DATA_PREFIX = __ENV.DATA_PREFIX || `LT${Date.now()}`
const VUS = Number(__ENV.VUS || 20)
const DURATION = __ENV.DURATION || '2m'
const THINK_TIME_MS = Number(__ENV.THINK_TIME_MS || 200)

if (!API_KEY) {
  throw new Error('缺少 API_KEY 环境变量')
}

if (!CLIENT_CODE) {
  throw new Error('缺少 CLIENT_CODE 环境变量')
}

if ((SCENARIO === 'asn-create' || SCENARIO === 'asn-update' || SCENARIO === 'asn-line-add') && !WAREHOUSE_CODE) {
  throw new Error('ASN 场景缺少 WAREHOUSE_CODE 环境变量')
}

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    http_req_duration: ['p(95)<1500'],
  },
}

function requestHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  }
}

function buildUrl(path) {
  return `${BASE_URL}${path}`
}

function uniqueSuffix() {
  return `${Date.now()}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
}

function createSkuPayload(skuCode, overrides = {}) {
  return {
    skuCode,
    skuName: `压测SKU-${skuCode}`,
    clientCode: CLIENT_CODE,
    barcode: `BC-${skuCode}`,
    unit: 'PCS',
    storageCondition: 'NORMAL',
    isBatchManaged: false,
    isSerialManaged: false,
    isExpiryManaged: false,
    notes: 'k6 load test',
    ...overrides,
  }
}

function createAsnPayload(externalNumber, skuCode, overrides = {}) {
  return {
    clientCode: CLIENT_CODE,
    warehouseCode: WAREHOUSE_CODE,
    externalNumber,
    asnType: 'NORMAL',
    notes: 'k6 load test',
    lines: [
      {
        skuCode,
        expectedQty: 1,
        uomCode: 'PCS',
      },
    ],
    ...overrides,
  }
}

function ensureStatus(response, label) {
  const ok = check(response, {
    [`${label} status is 200`]: (res) => res.status === 200,
  })

  if (!ok) {
    console.error(`[${label}] failed`, response.status, response.body)
  }

  return ok
}

function postJson(path, payload, tags = {}) {
  return http.post(buildUrl(path), JSON.stringify(payload), {
    headers: requestHeaders(),
    tags,
  })
}

function putJson(path, payload, tags = {}) {
  return http.put(buildUrl(path), JSON.stringify(payload), {
    headers: requestHeaders(),
    tags,
  })
}

function createBaseSku(prefix) {
  const skuCode = `${prefix}-SKU-BASE`
  const response = postJson('/api/v1/skus', createSkuPayload(skuCode), { scenario: 'setup-sku' })
  ensureStatus(response, 'setup-sku-create')
  return skuCode
}

function createBaseAsn(prefix, skuCode) {
  const externalNumber = `${prefix}-ASN-BASE`
  const response = postJson('/api/v1/asn', createAsnPayload(externalNumber, skuCode), { scenario: 'setup-asn' })
  ensureStatus(response, 'setup-asn-create')
  return externalNumber
}

export function setup() {
  const prefix = `${DATA_PREFIX}-${Date.now()}`
  const baseSkuCode = createBaseSku(prefix)
  const data = {
    prefix,
    baseSkuCode,
    baseAsnExternalNumber: null,
  }

  if (SCENARIO === 'asn-update' || SCENARIO === 'asn-line-add') {
    data.baseAsnExternalNumber = createBaseAsn(prefix, baseSkuCode)
  }

  return data
}

export default function runScenario(data) {
  switch (SCENARIO) {
    case 'sku-create':
      runSkuCreate(data)
      break
    case 'sku-update':
      runSkuUpdate(data)
      break
    case 'asn-create':
      runAsnCreate(data)
      break
    case 'asn-update':
      runAsnUpdate(data)
      break
    case 'asn-line-add':
      runAsnLineAdd(data)
      break
    default:
      throw new Error(`不支持的场景: ${SCENARIO}`)
  }

  sleep(THINK_TIME_MS / 1000)
}

function runSkuCreate(data) {
  const skuCode = `${data.prefix}-SKU-${uniqueSuffix()}`
  const response = postJson('/api/v1/skus', createSkuPayload(skuCode), {
    scenario: 'sku-create',
    endpoint: 'POST /api/v1/skus',
  })

  ensureStatus(response, 'sku-create')
}

function runSkuUpdate(data) {
  const response = putJson(
    `/api/v1/skus/by-code/${encodeURIComponent(data.baseSkuCode)}`,
    {
      clientCode: CLIENT_CODE,
      notes: `sku-update-${uniqueSuffix()}`,
      storageCondition: exec.scenario.iterationInTest % 2 === 0 ? 'NORMAL' : 'CONTROLLED',
    },
    {
      scenario: 'sku-update',
      endpoint: 'PUT /api/v1/skus/by-code/{skuCode}',
    }
  )

  ensureStatus(response, 'sku-update')
}

function runAsnCreate(data) {
  const externalNumber = `${data.prefix}-ASN-${uniqueSuffix()}`
  const response = postJson('/api/v1/asn', createAsnPayload(externalNumber, data.baseSkuCode), {
    scenario: 'asn-create',
    endpoint: 'POST /api/v1/asn',
  })

  ensureStatus(response, 'asn-create')
}

function runAsnUpdate(data) {
  const response = putJson(
    `/api/v1/asn/by-number/${encodeURIComponent(data.baseAsnExternalNumber)}`,
    {
      clientCode: CLIENT_CODE,
      notes: `asn-update-${uniqueSuffix()}`,
      expectedArrivalTime: '10:00:00',
    },
    {
      scenario: 'asn-update',
      endpoint: 'PUT /api/v1/asn/by-number/{externalNumber}',
    }
  )

  ensureStatus(response, 'asn-update')
}

function runAsnLineAdd(data) {
  const skuCode = `${data.prefix}-LINE-SKU-${uniqueSuffix()}`
  const skuResponse = postJson('/api/v1/skus', createSkuPayload(skuCode), {
    scenario: 'asn-line-add',
    endpoint: 'POST /api/v1/skus',
  })

  if (!ensureStatus(skuResponse, 'asn-line-add-create-sku')) {
    return
  }

  const lineResponse = postJson(
    `/api/v1/asn/by-number/${encodeURIComponent(data.baseAsnExternalNumber)}/lines`,
    {
      clientCode: CLIENT_CODE,
      skuCode,
      expectedQty: 1,
      uomCode: 'PCS',
    },
    {
      scenario: 'asn-line-add',
      endpoint: 'POST /api/v1/asn/by-number/{externalNumber}/lines',
    }
  )

  ensureStatus(lineResponse, 'asn-line-add')
}

export function handleSummary(data) {
  const summary = {
    scenario: SCENARIO,
    vus: VUS,
    duration: DURATION,
    metrics: {
      http_req_duration_p95: data.metrics.http_req_duration.values['p(95)'],
      http_req_failed_rate: data.metrics.http_req_failed.values.rate,
      checks_rate: data.metrics.checks.values.rate,
      iterations: data.metrics.iterations.values.count,
    },
  }

  const outputs = {
    stdout: `${JSON.stringify(summary, null, 2)}\n`,
  }

  if (__ENV.SUMMARY_JSON_PATH) {
    outputs[__ENV.SUMMARY_JSON_PATH] = JSON.stringify(summary, null, 2)
  }

  return outputs
}
