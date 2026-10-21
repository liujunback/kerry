# 未覆盖接口清单

生成时间: 2026-05-14  
范围: `C:\Users\bliuj\Desktop\kerry\kec-wms\kec-wms-main\backend\src\app\api\v1`

说明:
- 这是按“当前测试代码里显式出现的 `/api/v1/...` 路径”做的覆盖差集。
- 一部分接口已被主流程间接覆盖，但如果测试代码里没有显式引用，仍会出现在这份清单里。
- 这份清单主要用于后续补自动化，不代表这些接口完全没有被业务链路执行过。

## P0 高优先级

### `asn`
- `/api/v1/asn/[id]`
- `/api/v1/asn/[id]/cancel`
- `/api/v1/asn/[id]/carton-summary`
- `/api/v1/asn/[id]/force-complete-putaway`
- `/api/v1/asn/[id]/force-complete-receiving`
- `/api/v1/asn/[id]/lines`
- `/api/v1/asn/[id]/lines/[lineId]`
- `/api/v1/asn/[id]/logs`
- `/api/v1/asn/[id]/operation-logs`
- `/api/v1/asn/[id]/receiving-details`
- `/api/v1/asn/[id]/receiving-records`
- `/api/v1/asn/[id]/receiving/complete`
- `/api/v1/asn/[id]/receiving/lookup-sku`
- `/api/v1/asn/[id]/receiving/sku`
- `/api/v1/asn/[id]/rollback`
- `/api/v1/asn/[id]/serial-numbers`
- `/api/v1/asn/[id]/sign-in`
- `/api/v1/asn/[id]/sku-summary`
- `/api/v1/asn/[id]/status`
- `/api/v1/asn/by-number/[externalNumber]`
- `/api/v1/asn/by-number/[externalNumber]/cancel`
- `/api/v1/asn/by-number/[externalNumber]/lines`
- `/api/v1/asn/by-number/[externalNumber]/lines/[lineNumber]`
- `/api/v1/asn/by-number/[externalNumber]/status`

### `outbound-orders`
- `/api/v1/outbound-orders/[id]`
- `/api/v1/outbound-orders/[id]/rollback`
- `/api/v1/outbound-orders/[id]/serial-numbers`
- `/api/v1/outbound-orders/batch-allocate`
- `/api/v1/outbound-orders/by-number/[externalNumber]`
- `/api/v1/outbound-orders/by-number/[externalNumber]/cancel`

### `inventory`
- `/api/v1/inventory/adjustments/[id]`
- `/api/v1/inventory/adjustments/[id]/approve`
- `/api/v1/inventory/adjustments/[id]/execute`
- `/api/v1/inventory/adjustments/[id]/reject`
- `/api/v1/inventory/adjustments/[id]/submit`
- `/api/v1/inventory/alerts/[id]`
- `/api/v1/inventory/alerts/[id]/acknowledge`
- `/api/v1/inventory/alerts/[id]/resolve`
- `/api/v1/inventory/counts/[id]`
- `/api/v1/inventory/counts/[id]/batches/[batchId]/assignee`
- `/api/v1/inventory/counts/[id]/batches/[batchId]/complete`
- `/api/v1/inventory/counts/[id]/batches/[batchId]/lines/submit`
- `/api/v1/inventory/counts/[id]/batches/[batchId]/start`
- `/api/v1/inventory/counts/[id]/batches/assignees`
- `/api/v1/inventory/counts/[id]/cancel`
- `/api/v1/inventory/counts/[id]/differences/confirm`
- `/api/v1/inventory/counts/[id]/disposals/[disposalId]/complete`
- `/api/v1/inventory/counts/[id]/disposals/[disposalId]/start`
- `/api/v1/inventory/counts/[id]/generate`
- `/api/v1/inventory/counts/[id]/lines/submit`
- `/api/v1/inventory/counts/[id]/recounts/generate`
- `/api/v1/inventory/counts/[id]/settle`
- `/api/v1/inventory/freezes/[id]`
- `/api/v1/inventory/freezes/[id]/release`
- `/api/v1/inventory/transfers/[id]`
- `/api/v1/inventory/transfers/[id]/approve`
- `/api/v1/inventory/transfers/[id]/execute`
- `/api/v1/inventory/transfers/[id]/reject`
- `/api/v1/inventory/transfers/[id]/submit`

### `packing`
- `/api/v1/packing/[pickOrderId]/complete`
- `/api/v1/packing/[pickOrderId]/complete-order`
- `/api/v1/packing/[pickOrderId]/scan-sku`
- `/api/v1/packing/[pickOrderId]/start`

### `returns`
- `/api/v1/returns/[id]`
- `/api/v1/returns/[id]/complete-counting`
- `/api/v1/returns/[id]/count-lines`
- `/api/v1/returns/[id]/dispositions`
- `/api/v1/returns/by-number/[preReturnNo]/dispositions`

### `users`
- `/api/v1/users/[id]`
- `/api/v1/users/[id]/password`
- `/api/v1/users/[id]/pda-login-token`
- `/api/v1/users/[id]/pda-login-token/pdf`
- `/api/v1/users/[id]/roles`
- `/api/v1/users/[id]/roles/[roleId]`
- `/api/v1/users/[id]/status`
- `/api/v1/users/[id]/warehouses`
- `/api/v1/users/[id]/warehouses/[warehouseId]`
- `/api/v1/users/[id]/warehouses/default`

### `roles`
- `/api/v1/roles/[id]`
- `/api/v1/roles/[id]/permissions`
- `/api/v1/roles/[id]/permissions/[permissionId]`

## P1 中优先级

### `containers`
- `/api/v1/containers/[id]`
- `/api/v1/containers/[id]/close`
- `/api/v1/containers/[id]/items`
- `/api/v1/containers/[id]/repack`
- `/api/v1/containers/[id]/reset`
- `/api/v1/containers/[id]/status`
- `/api/v1/containers/batch`
- `/api/v1/containers/batch/status`
- `/api/v1/containers/export`
- `/api/v1/containers/generate-code`

### `pick-orders`
- `/api/v1/pick-orders/[id]`
- `/api/v1/pick-orders/[id]/assign`
- `/api/v1/pick-orders/[id]/print`
- `/api/v1/pick-orders/batch/assign`

### `wave-strategies`
- `/api/v1/wave-strategies/[id]`
- `/api/v1/wave-strategies/[id]/copy`
- `/api/v1/wave-strategies/[id]/execute`
- `/api/v1/wave-strategies/[id]/publish`
- `/api/v1/wave-strategies/[id]/rollback`
- `/api/v1/wave-strategies/[id]/simulate`

### `waves`
- `/api/v1/waves/[id]`
- `/api/v1/waves/[id]/release`

### `pick-assignment-rules`
- `/api/v1/pick-assignment-rules/[id]`

### `picker-profiles`
- `/api/v1/picker-profiles/[id]`
- `/api/v1/picker-profiles/options`

### `manifest-orders`
- `/api/v1/manifest-orders/[id]`
- `/api/v1/manifest-orders/[id]/complete`
- `/api/v1/manifest-orders/[id]/print`
- `/api/v1/manifest-orders/export`

### `putaway`
- `/api/v1/putaway/orders/[id]`
- `/api/v1/putaway/orders/[id]/print`

### `warehouses`
- `/api/v1/warehouses/[id]`
- `/api/v1/warehouses/[id]/status`

### `zones`
- `/api/v1/zones/[id]`
- `/api/v1/zones/[id]/status`

### `bin-locations`
- `/api/v1/bin-locations/[id]`
- `/api/v1/bin-locations/[id]/lock`
- `/api/v1/bin-locations/[id]/status`
- `/api/v1/bin-locations/bulk`

### `skus`
- `/api/v1/skus/[id]`
- `/api/v1/skus/[id]/status`
- `/api/v1/skus/by-code/[skuCode]`

### `sku-categories`
- `/api/v1/sku-categories/[id]`

### `clients`
- `/api/v1/clients/[id]`
- `/api/v1/clients/[id]/status`
- `/api/v1/clients/[id]/warehouses`
- `/api/v1/clients/[id]/warehouses/[warehouseId]`

### `combo-products`
- `/api/v1/combo-products/[id]`

### `print-devices`
- `/api/v1/print-devices/[id]`
- `/api/v1/print-devices/[id]/test`

### `print-label-specs`
- `/api/v1/print-label-specs/[id]`

### `print-templates`
- `/api/v1/print-templates/[id]`

### `packaging-materials`
- `/api/v1/packaging-materials/[id]`
- `/api/v1/packaging-materials/[id]/status`

### `packaging-material-inventory`
- `/api/v1/packaging-material-inventory/[id]`
- `/api/v1/packaging-material-inventory/inbound`
- `/api/v1/packaging-material-inventory/outbound`

### `packaging-material-transactions`
- `/api/v1/packaging-material-transactions/[id]`
- `/api/v1/packaging-material-transactions/[id]/audit`

## P2 较低优先级

### `auth`
- `/api/v1/auth/captcha`
- `/api/v1/auth/login`
- `/api/v1/auth/pda-token-login`

### `pda`
- `/api/v1/pda/asn/sign-in`
- `/api/v1/pda/download-link`

### `api-keys`
- `/api/v1/api-keys/[id]`

### `jobs`
- `/api/v1/jobs/[id]`
- `/api/v1/jobs/[id]/cancel`
- `/api/v1/jobs/[id]/download`
- `/api/v1/jobs/[id]/retry`

### `scheduled-tasks`
- `/api/v1/scheduled-tasks/[id]`
- `/api/v1/scheduled-tasks/[id]/trigger`
- `/api/v1/scheduled-tasks/handlers`

### `files`
- `/api/v1/files/[documentType]/[id]`
- `/api/v1/files/[documentType]/batch`

### `print-url`
- `/api/v1/print-url`

### `operation-logs`
- `/api/v1/operation-logs/[entityType]/[entityId]`

### `order-interceptions`
- `/api/v1/order-interceptions`
- `/api/v1/order-interceptions/[id]/handle`
- `/api/v1/order-interceptions/by-order/[orderId]`

### `e2e`
- `/api/v1/e2e/scenarios/[id]`
- `/api/v1/e2e/scenarios/[id]/execute`
- `/api/v1/e2e/scenarios/execute-batch`
- `/api/v1/e2e/scenarios/export`
- `/api/v1/e2e/scenarios/import`
- `/api/v1/e2e/scenarios/match`

### `sorting`
- `/api/v1/sorting/active-task`
- `/api/v1/sorting/cell-detail`
- `/api/v1/sorting/complete`
- `/api/v1/sorting/complete-cell`
- `/api/v1/sorting/scan-sku`
- `/api/v1/sorting/start`
- `/api/v1/sorting/walls`

### `sorting-cells`
- `/api/v1/sorting-cells/[id]`

### `sorting-walls`
- `/api/v1/sorting-walls/[id]`
- `/api/v1/sorting-walls/[id]/cells`
- `/api/v1/sorting-walls/[id]/cells/print`
- `/api/v1/sorting-walls/[id]/release`
- `/api/v1/sorting-walls/[id]/status`

### `picking-exceptions`
- `/api/v1/picking-exceptions`
- `/api/v1/picking-exceptions/[id]`
- `/api/v1/picking-exceptions/[id]/supplement`

### `supplement-pick-orders`
- `/api/v1/supplement-pick-orders/[id]/manual-complete`
- `/api/v1/supplement-pick-orders/[id]/print`

### `tenants`
- `/api/v1/tenants/[id]`
- `/api/v1/tenants/[id]/reset-password`
- `/api/v1/tenants/[id]/status`

### `sku`
- `/api/v1/sku/[id]/capture-dimensions`

## 当前已开始补充的模块

本轮已经新增测试文件:
- `test_asn_deep_smoke.py`
- `test_outbound_extended_smoke.py`
- `test_inventory_count_deep_smoke.py`
- `test_user_role_binding_smoke.py`
- `test_returns_deep_smoke.py`
- `test_packing_shelving_deep_smoke.py`

当前功能回归套件静态用例总数:
- `381`
