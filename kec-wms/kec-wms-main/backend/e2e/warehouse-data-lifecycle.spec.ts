import { expect,Page,test } from '@playwright/test';

/**
 * 登录为管理员
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');

  // 填写登录信息
  await page.fill('input#tenantCode', 'DEFAULT');
  await page.fill('input#username', 'admin');
  await page.fill('input#password', 'Admin@123');

  // 点击登录按钮
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // 等待跳转到仪表板
  await page.waitForURL(/.*dashboard/, { timeout: 10000 });
}

test.describe.serial('仓库基础数据生命周期', () => {
  let warehouseId: string;
  let zoneId: string;
  let binLocationId: string;
  const timestamp = Date.now();

  const testData = {
    warehouseCode: `E2E-WH-${timestamp}`,
    warehouseName: `E2E测试仓库-${timestamp}`,
    warehouseNameUpdated: `E2E测试仓库-更新-${timestamp}`,
    zoneCode: `E2E-ZONE-${timestamp}`,
    zoneName: `E2E测试库区-${timestamp}`,
    zoneNameUpdated: `E2E测试库区-更新-${timestamp}`,
    locationCode: `E2E-LOC-${timestamp}`,
    locationCodeUpdated: `E2E-LOC-UPD-${timestamp}`,
  };

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('应该成功创建仓库', async ({ page }) => {
    // 导航到创建仓库页面
    await page.goto('/warehouses/create');
    await page.waitForURL(/.*warehouses\/create/, { timeout: 5000 });

    // 填写表单
    await page.fill('input#warehouseCode', testData.warehouseCode);
    await page.fill('input#warehouseName', testData.warehouseName);

    // 选择仓库类型
    await page.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: '自建仓' }).click();

    // 监听API响应以获取创建的仓库ID
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/warehouses') &&
                  response.request().method() === 'POST' &&
                  response.status() === 200,
      { timeout: 10000 }
    );

    // 提交表单
    await page.locator('button[type="submit"]').click();

    // 等待响应并提取ID
    const response = await responsePromise;
    const result = await response.json();
    expect(result.success).toBe(true);
    warehouseId = result.data.id;

    // 验证成功提示
    await expect(page.getByText(/创建成功|成功/)).toBeVisible({ timeout: 5000 });

    // 验证重定向到列表页
    await page.waitForURL(/.*warehouses$/, { timeout: 5000 });
  });

  test('应该成功创建库区', async ({ page }) => {
    // 导航到创建库区页面
    await page.goto('/zones/create');
    await page.waitForURL(/.*zones\/create/, { timeout: 5000 });

    // 选择仓库
    await page.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: new RegExp(`${testData.warehouseCode}.*${testData.warehouseName}`) }).click();

    // 填写库区代码
    await page.fill('input#zoneCode', testData.zoneCode);
    await page.fill('input#zoneName', testData.zoneName);

    // 选择库区类型（默认STORAGE）
    const zoneTypeButton = page.locator('button[role="combobox"]').nth(1);
    await zoneTypeButton.click();
    await page.getByRole('option', { name: '存储区' }).click();

    // 选择质量类型（默认GOOD）
    const qualityTypeButton = page.locator('button[role="combobox"]').nth(2);
    await qualityTypeButton.click();
    await page.getByRole('option', { name: '良品' }).click();

    // 监听API响应
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/zones') &&
                  response.request().method() === 'POST' &&
                  response.status() === 200,
      { timeout: 10000 }
    );

    // 提交表单
    await page.locator('button[type="submit"]').click();

    // 获取库区ID
    const response = await responsePromise;
    const result = await response.json();
    expect(result.success).toBe(true);
    zoneId = result.data.id;

    // 验证成功提示
    await expect(page.getByText(/创建成功|成功/)).toBeVisible({ timeout: 5000 });

    // 验证重定向
    await page.waitForURL(/.*zones$/, { timeout: 5000 });
  });

  test('应该成功创建库位', async ({ page }) => {
    // 导航到创建库位页面
    await page.goto('/bin-locations/create');
    await page.waitForURL(/.*bin-locations\/create/, { timeout: 5000 });

    // 选择仓库
    await page.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: new RegExp(`${testData.warehouseCode}.*${testData.warehouseName}`) }).click();

    // 等待库区选择器加载
    await page.waitForTimeout(500);

    // 选择库区
    await page.locator('button[role="combobox"]').nth(1).click();
    await page.getByRole('option', { name: new RegExp(`${testData.zoneCode}.*${testData.zoneName}`) }).click();

    // 填写库位信息
    await page.fill('input#locationCode', testData.locationCode);
    await page.fill('input#aisle', 'A');
    await page.fill('input#rack', '01');
    await page.fill('input#shelf', '02');
    await page.fill('input#bin', '03');

    // 勾选可拣货和可收货
    await page.locator('#isPickable').click();
    await page.locator('#isReceivable').click();

    // 监听API响应
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/bin-locations') &&
                  response.request().method() === 'POST' &&
                  response.status() === 200,
      { timeout: 10000 }
    );

    // 提交表单
    await page.locator('button[type="submit"]').click();

    // 获取库位ID
    const response = await responsePromise;
    const result = await response.json();
    expect(result.success).toBe(true);
    binLocationId = result.data.id;

    // 验证成功提示
    await expect(page.getByText(/创建成功|成功/)).toBeVisible({ timeout: 5000 });

    // 验证重定向
    await page.waitForURL(/.*bin-locations$/, { timeout: 5000 });
  });

  test('应该成功更新仓库信息', async ({ page }) => {
    // 导航到编辑页面
    await page.goto(`/warehouses/${warehouseId}/edit`);
    await page.waitForURL(new RegExp(`.*warehouses/${warehouseId}/edit`), { timeout: 5000 });

    // 更新仓库名称
    await page.fill('input#warehouseName', testData.warehouseNameUpdated);

    // 监听API响应
    const responsePromise = page.waitForResponse(
      response => response.url().includes(`/api/v1/warehouses/${warehouseId}`) &&
                  response.request().method() === 'PUT' &&
                  response.status() === 200,
      { timeout: 10000 }
    );

    // 提交表单
    await page.locator('button[type="submit"]').click();

    // 验证响应
    const response = await responsePromise;
    const result = await response.json();
    expect(result.success).toBe(true);

    // 验证成功提示
    await expect(page.getByText(/更新成功|成功/)).toBeVisible({ timeout: 5000 });
  });

  test('应该成功更新库区信息', async ({ page }) => {
    // 导航到编辑页面
    await page.goto(`/zones/${zoneId}/edit`);
    await page.waitForURL(new RegExp(`.*zones/${zoneId}/edit`), { timeout: 5000 });

    // 更新库区名称
    await page.fill('input#zoneName', testData.zoneNameUpdated);

    // 监听API响应
    const responsePromise = page.waitForResponse(
      response => response.url().includes(`/api/v1/zones/${zoneId}`) &&
                  response.request().method() === 'PUT' &&
                  response.status() === 200,
      { timeout: 10000 }
    );

    // 提交表单
    await page.locator('button[type="submit"]').click();

    // 验证响应
    const response = await responsePromise;
    const result = await response.json();
    expect(result.success).toBe(true);

    // 验证成功提示
    await expect(page.getByText(/更新成功|成功/)).toBeVisible({ timeout: 5000 });
  });

  test('应该成功更新库位信息', async ({ page }) => {
    // 导航到编辑页面
    await page.goto(`/bin-locations/${binLocationId}/edit`);
    await page.waitForURL(new RegExp(`.*bin-locations/${binLocationId}/edit`), { timeout: 5000 });

    // 更新库位编码
    await page.fill('input#locationCode', testData.locationCodeUpdated);

    // 监听API响应
    const responsePromise = page.waitForResponse(
      response => response.url().includes(`/api/v1/bin-locations/${binLocationId}`) &&
                  response.request().method() === 'PUT' &&
                  response.status() === 200,
      { timeout: 10000 }
    );

    // 提交表单
    await page.locator('button[type="submit"]').click();

    // 验证响应
    const response = await responsePromise;
    const result = await response.json();
    expect(result.success).toBe(true);

    // 验证成功提示
    await expect(page.getByText(/更新成功|成功/)).toBeVisible({ timeout: 5000 });
  });

  test('应该成功删除库位', async ({ page }) => {
    // 导航到库位列表页
    await page.goto('/bin-locations');
    await page.waitForURL(/.*bin-locations$/, { timeout: 5000 });

    // 搜索刚创建的库位
    await page.fill('input[placeholder*="搜索"]', testData.locationCodeUpdated);
    await page.keyboard.press('Enter');

    // 等待搜索结果加载
    await page.waitForTimeout(2000);

    // 确保表格中有数据
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // 点击第一行最后一列的操作按钮（三个点）
    const firstRow = page.locator('table tbody tr').first();
    const actionButton = firstRow.locator('td').last().locator('button').first();
    await actionButton.click();

    // 点击删除选项
    await page.getByRole('menuitem', { name: /删除/ }).click();

    // 确认删除
    await page.getByRole('button', { name: '确认' }).click();

    // 验证成功提示
    await expect(page.getByText(/删除成功|成功/)).toBeVisible({ timeout: 5000 });
  });

  test('应该成功删除库区', async ({ page }) => {
    // 导航到库区列表页
    await page.goto('/zones');
    await page.waitForURL(/.*zones$/, { timeout: 5000 });

    // 搜索刚创建的库区
    await page.fill('input[placeholder*="搜索"]', testData.zoneCode);
    await page.keyboard.press('Enter');

    // 等待搜索结果加载
    await page.waitForTimeout(2000);

    // 确保表格中有数据
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // 点击第一行最后一列的操作按钮（三个点）
    const firstRow = page.locator('table tbody tr').first();
    const actionButton = firstRow.locator('td').last().locator('button').first();
    await actionButton.click();

    // 点击删除选项
    await page.getByRole('menuitem', { name: /删除/ }).click();

    // 确认删除
    await page.getByRole('button', { name: '确认' }).click();

    // 验证成功提示
    await expect(page.getByText(/删除成功|成功/)).toBeVisible({ timeout: 5000 });
  });

  test('应该成功删除仓库', async ({ page }) => {
    // 导航到仓库列表页
    await page.goto('/warehouses');
    await page.waitForURL(/.*warehouses$/, { timeout: 5000 });

    // 搜索刚创建的仓库
    await page.fill('input[placeholder*="搜索"]', testData.warehouseCode);
    await page.keyboard.press('Enter');

    // 等待搜索结果加载
    await page.waitForTimeout(2000);

    // 确保表格中有数据
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // 点击第一行最后一列的操作按钮（三个点）
    const firstRow = page.locator('table tbody tr').first();
    const actionButton = firstRow.locator('td').last().locator('button').first();
    await actionButton.click();

    // 点击删除选项
    await page.getByRole('menuitem', { name: /删除/ }).click();

    // 确认删除
    await page.getByRole('button', { name: '确认' }).click();

    // 验证成功提示
    await expect(page.getByText(/删除成功|成功/)).toBeVisible({ timeout: 5000 });
  });

  // 清理残留数据（如果测试失败）
  test.afterAll(async ({ request }) => {
    try {
      if (binLocationId) {
        await request.delete(`/api/v1/bin-locations/${binLocationId}`);
      }
    } catch (error) {
      console.log('清理库位失败（可能已删除）:', error);
    }

    try {
      if (zoneId) {
        await request.delete(`/api/v1/zones/${zoneId}`);
      }
    } catch (error) {
      console.log('清理库区失败（可能已删除）:', error);
    }

    try {
      if (warehouseId) {
        await request.delete(`/api/v1/warehouses/${warehouseId}`);
      }
    } catch (error) {
      console.log('清理仓库失败（可能已删除）:', error);
    }
  });
});
