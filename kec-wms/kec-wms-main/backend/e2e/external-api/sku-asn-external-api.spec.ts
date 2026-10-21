import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000'
const apiKey = process.env.TEST_API_KEY || process.env.NEXT_PUBLIC_DEFAULT_API_KEY || ''
const apiKeyWithoutReturnCreate = process.env.TEST_API_KEY_WITHOUT_RETURN_CREATE || ''
const clientCode = process.env.TEST_CLIENT_CODE || ''
const warehouseCode = process.env.TEST_WAREHOUSE_CODE || ''

test.describe('SKU / ASN 外部 API', () => {
  test.skip(!apiKey || !clientCode || !warehouseCode, '缺少外部 API 验证所需环境变量')

  function headers() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    }
  }

  function uniqueToken(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  }

  test('SKU 列表支持 clientCode 查询，重复创建返回业务错误', async ({ request }) => {
    const skuCode = uniqueToken('EXT-SKU')
    const payload = {
      skuCode,
      skuName: `压测商品-${skuCode}`,
      clientCode,
      unit: 'PCS',
      storageCondition: 'NORMAL',
    }

    const createResponse = await request.post(`${baseURL}/api/v1/skus`, {
      headers: headers(),
      data: payload,
    })

    expect(createResponse.status()).toBe(200)

    const listResponse = await request.get(
      `${baseURL}/api/v1/skus?clientCode=${encodeURIComponent(clientCode)}&search=${encodeURIComponent(skuCode)}&pageSize=10`,
      {
        headers: headers(),
      }
    )

    expect(listResponse.status()).toBe(200)
    const listBody = await listResponse.json()
    expect(listBody.success).toBe(true)
    expect(listBody.data.some((item: { skuCode: string }) => item.skuCode === skuCode)).toBe(true)

    const duplicateResponse = await request.post(`${baseURL}/api/v1/skus`, {
      headers: headers(),
      data: payload,
    })

    expect(duplicateResponse.status()).toBe(400)
    const duplicateBody = await duplicateResponse.json()
    expect(duplicateBody.success).toBe(false)
    expect(duplicateBody.code).toBe('SKU_CODE_EXISTS')
  })

  test('ASN 加行后主表汇总与明细保持一致', async ({ request }) => {
    const baseSkuCode = uniqueToken('EXT-ASN-SKU-A')
    const lineSkuCode = uniqueToken('EXT-ASN-SKU-B')
    const externalNumber = uniqueToken('EXT-ASN')

    for (const skuCode of [baseSkuCode, lineSkuCode]) {
      const skuResponse = await request.post(`${baseURL}/api/v1/skus`, {
        headers: headers(),
        data: {
          skuCode,
          skuName: `压测商品-${skuCode}`,
          clientCode,
          unit: 'PCS',
          storageCondition: 'NORMAL',
        },
      })

      expect(skuResponse.status()).toBe(200)
    }

    const createAsnResponse = await request.post(`${baseURL}/api/v1/asn`, {
      headers: headers(),
      data: {
        clientCode,
        warehouseCode,
        externalNumber,
        asnType: 'NORMAL',
        lines: [
          {
            skuCode: baseSkuCode,
            expectedQty: 2,
            uomCode: 'PCS',
          },
        ],
      },
    })

    expect(createAsnResponse.status()).toBe(200)

    const addLineResponse = await request.post(
      `${baseURL}/api/v1/asn/by-number/${encodeURIComponent(externalNumber)}/lines`,
      {
        headers: headers(),
        data: {
          clientCode,
          skuCode: lineSkuCode,
          expectedQty: 3,
          uomCode: 'PCS',
        },
      }
    )

    expect(addLineResponse.status()).toBe(200)

    const detailResponse = await request.get(
      `${baseURL}/api/v1/asn/by-number/${encodeURIComponent(externalNumber)}?clientCode=${encodeURIComponent(clientCode)}`,
      {
        headers: headers(),
      }
    )

    expect(detailResponse.status()).toBe(200)
    const detailBody = await detailResponse.json()
    expect(detailBody.success).toBe(true)
    expect(detailBody.data.totalExpectedQty).toBe(5)
    expect(detailBody.data.totalExpectedLines).toBe(2)

    const lineNumbers = detailBody.data.asnLines.map((line: { lineNumber: number }) => line.lineNumber)
    expect(new Set(lineNumbers).size).toBe(lineNumbers.length)
    expect(lineNumbers).toEqual([1, 2])
  })

  test('退件预报只能通过外部 API 下发并校验 SKU 与重复物流单号', async ({ request }) => {
    const skuCode = uniqueToken('EXT-RET-SKU')
    const preReturnNo = uniqueToken('EXT-RET')
    const logisticsNo = uniqueToken('EXT-RET-LG')

    const skuResponse = await request.post(`${baseURL}/api/v1/skus`, {
      headers: headers(),
      data: {
        skuCode,
        skuName: `退件预报商品-${skuCode}`,
        clientCode,
        unit: 'PCS',
        storageCondition: 'NORMAL',
      },
    })

    expect(skuResponse.status()).toBe(200)

    const createPayload = {
      clientCode,
      warehouseCode,
      preReturnNo,
      logisticsNo,
      lines: [
        {
          skuCode,
          expectedQty: 2,
        },
      ],
    }

    const createResponse = await request.post(`${baseURL}/api/v1/returns`, {
      headers: headers(),
      data: createPayload,
    })

    expect(createResponse.status()).toBe(200)
    const createBody = await createResponse.json()
    expect(createBody.success).toBe(true)
    expect(createBody.data.returnType).toBe('BUYER_RETURN')
    expect(createBody.data.status).toBe('PENDING_SIGN')
    expect(createBody.data.preReturnNo).toBe(preReturnNo)
    expect(createBody.data.logisticsNo).toBe(logisticsNo)

    const earlyDispositionResponse = await request.post(
      `${baseURL}/api/v1/returns/by-number/${encodeURIComponent(preReturnNo)}/dispositions`,
      {
        headers: headers(),
        data: {
          clientCode,
          warehouseCode,
          items: [
            {
              returnLineNo: `${createBody.data.returnNo}-001`,
              action: 'GOOD_PUTAWAY',
              quantity: 1,
            },
          ],
        },
      }
    )

    expect(earlyDispositionResponse.status()).toBe(400)
    const earlyDispositionBody = await earlyDispositionResponse.json()
    expect(earlyDispositionBody.success).toBe(false)
    expect(earlyDispositionBody.message).toContain('状态')

    const duplicateResponse = await request.post(`${baseURL}/api/v1/returns`, {
      headers: headers(),
      data: {
        ...createPayload,
        preReturnNo: `${preReturnNo}-DUP`,
      },
    })

    expect(duplicateResponse.status()).toBe(400)
    const duplicateBody = await duplicateResponse.json()
    expect(duplicateBody.success).toBe(false)
    expect(duplicateBody.message).toContain('物流单号')

    const invalidSkuResponse = await request.post(`${baseURL}/api/v1/returns`, {
      headers: headers(),
      data: {
        ...createPayload,
        preReturnNo: `${preReturnNo}-BAD-SKU`,
        logisticsNo: `${logisticsNo}-BAD-SKU`,
        lines: [{ skuCode: `${skuCode}-MISSING`, expectedQty: 1 }],
      },
    })

    expect(invalidSkuResponse.status()).toBe(400)
    const invalidSkuBody = await invalidSkuResponse.json()
    expect(invalidSkuBody.success).toBe(false)
    expect(invalidSkuBody.code).toBe('SKU_NOT_FOUND')

    const noApiKeyResponse = await request.post(`${baseURL}/api/v1/returns`, {
      data: {
        ...createPayload,
        preReturnNo: `${preReturnNo}-NO-KEY`,
        logisticsNo: `${logisticsNo}-NO-KEY`,
      },
    })

    expect(noApiKeyResponse.status()).toBe(401)
  })

  test('退件预报缺少 return:create scope 时返回 403', async ({ request }) => {
    test.skip(!apiKeyWithoutReturnCreate, '缺少 TEST_API_KEY_WITHOUT_RETURN_CREATE')

    const response = await request.post(`${baseURL}/api/v1/returns`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKeyWithoutReturnCreate,
      },
      data: {
        clientCode,
        warehouseCode,
        preReturnNo: uniqueToken('EXT-RET-NO-SCOPE'),
        logisticsNo: uniqueToken('EXT-RET-LG-NO-SCOPE'),
        lines: [{ skuCode: uniqueToken('EXT-RET-SKU-NO-SCOPE'), expectedQty: 1 }],
      },
    })

    expect(response.status()).toBe(403)
  })
})
