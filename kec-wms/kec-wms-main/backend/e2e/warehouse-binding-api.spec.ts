import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './fixtures/auth-helpers'
import { createWarehouse } from './fixtures/api-helpers'

test.describe.serial('用户仓库绑定 API', () => {
  const timestamp = Date.now()
  const username = `wh_bind_${timestamp}`
  let userId = ''
  let warehouseAId = ''
  let warehouseBId = ''

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('应返回绑定仓库并支持设置默认仓库', async ({ page }) => {
    const createUserResponse = await page.request.post('/api/v1/users', {
      data: {
        username,
        password: 'Admin@123',
        fullName: `仓库绑定测试用户-${timestamp}`,
        userType: 'INTERNAL',
      },
    })
    const createdUser = await createUserResponse.json()
    expect(createdUser.success).toBe(true)
    userId = createdUser.data.id

    const warehouseA = await createWarehouse(page, {
      warehouseCode: `WB-A-${timestamp}`,
      warehouseName: `绑定测试仓A-${timestamp}`,
    })
    expect(warehouseA.success).toBe(true)
    warehouseAId = warehouseA.data.id

    const warehouseB = await createWarehouse(page, {
      warehouseCode: `WB-B-${timestamp}`,
      warehouseName: `绑定测试仓B-${timestamp}`,
    })
    expect(warehouseB.success).toBe(true)
    warehouseBId = warehouseB.data.id

    const bindAResponse = await page.request.post(`/api/v1/users/${userId}/warehouses`, {
      data: {
        warehouseId: warehouseAId,
        isDefault: true,
      },
    })
    const bindAResult = await bindAResponse.json()
    expect(bindAResult.success).toBe(true)

    const bindBResponse = await page.request.post(`/api/v1/users/${userId}/warehouses`, {
      data: {
        warehouseId: warehouseBId,
      },
    })
    const bindBResult = await bindBResponse.json()
    expect(bindBResult.success).toBe(true)

    const listResponse = await page.request.get(`/api/v1/users/${userId}/warehouses`)
    const listResult = await listResponse.json()
    expect(listResult.success).toBe(true)
    expect(listResult.data).toHaveLength(2)
    expect(listResult.meta.defaultWarehouseId).toBe(warehouseAId)

    const setDefaultResponse = await page.request.patch(`/api/v1/users/${userId}/warehouses/default`, {
      data: {
        warehouseId: warehouseBId,
      },
    })
    const setDefaultResult = await setDefaultResponse.json()
    expect(setDefaultResult.success).toBe(true)

    const listAfterDefaultResponse = await page.request.get(`/api/v1/users/${userId}/warehouses`)
    const listAfterDefaultResult = await listAfterDefaultResponse.json()
    expect(listAfterDefaultResult.success).toBe(true)
    expect(listAfterDefaultResult.meta.defaultWarehouseId).toBe(warehouseBId)

    const unbindResponse = await page.request.delete(`/api/v1/users/${userId}/warehouses/${warehouseAId}`)
    const unbindResult = await unbindResponse.json()
    expect(unbindResult.success).toBe(true)

    const listAfterUnbindResponse = await page.request.get(`/api/v1/users/${userId}/warehouses`)
    const listAfterUnbindResult = await listAfterUnbindResponse.json()
    expect(listAfterUnbindResult.success).toBe(true)
    expect(listAfterUnbindResult.data).toHaveLength(1)
    expect(listAfterUnbindResult.meta.defaultWarehouseId).toBe(warehouseBId)

    const loginResponse = await page.request.post('/api/v1/auth/login', {
      data: {
        tenantCode: 'E2E-TEST',
        username,
        password: 'Admin@123',
      },
    })
    const loginResult = await loginResponse.json()
    expect(loginResult.success).toBe(true)

    const token = loginResult.data.token as string
    const authMeResponse = await page.request.get('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-WMS-Terminal-Type': 'PDA',
      },
    })
    const authMeResult = await authMeResponse.json()
    expect(authMeResult.success).toBe(true)
    expect(authMeResult.data.defaultWarehouseId).toBe(warehouseBId)
    expect(authMeResult.data.warehouseBindings).toHaveLength(1)
    expect(authMeResult.data.warehouseBindings[0].warehouseId).toBe(warehouseBId)

    const forbiddenWarehouseResponse = await page.request.get('/api/v1/bin-locations?page=1&pageSize=10', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-WMS-Terminal-Type': 'PDA',
        'X-WMS-Warehouse-Id': warehouseAId,
      },
    })
    const forbiddenWarehouseResult = await forbiddenWarehouseResponse.json()
    expect(forbiddenWarehouseResponse.status()).toBe(403)
    expect(forbiddenWarehouseResult.success).toBe(false)
  })

  test('仓库域请求缺少当前仓库头时应被拒绝', async ({ page }) => {
    const response = await page.request.get('/api/v1/bin-locations?page=1&pageSize=10', {
      headers: {
        'X-WMS-Terminal-Type': 'WEB',
      },
    })
    const result = await response.json()

    expect(response.status()).toBe(400)
    expect(result.success).toBe(false)
  })
})
