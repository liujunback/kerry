# WMS Python Test Scripts

目录位置：

`C:\Users\bliuj\Desktop\kerry\kec-wms\wms-test-scripts`

这套脚本与项目源码分离，单独放在 `kec-wms-main` 同层级目录。

## 文件

- `common.py`
- `01_api_regression.py`
- `02_main_flow.py`
- `unittest_suite/`

## Python 环境

当前脚本依赖：

- `requests`

如果没有安装：

```powershell
pip install requests
```

## 默认配置

- `WMS_BASE_URL=https://stg-kec-wms.kec-app.com`
- `WMS_TENANT_CODE=DEFAULT`
- `WMS_USERNAME=admin`
- `WMS_PASSWORD=Admin@123`
- `WMS_WAREHOUSE_CODE=WH-SH-001`
- `WMS_CLIENT_CODE=C001`
- `WMS_SKU_CODE=` 留空时自动选该客户下第一个 SKU

## 运行

接口回归：

```powershell
cd C:\Users\bliuj\Desktop\kerry\kec-wms\wms-test-scripts
python .\01_api_regression.py
```

主流程：

```powershell
cd C:\Users\bliuj\Desktop\kerry\kec-wms\wms-test-scripts
python .\02_main_flow.py
```

双击运行 `unittest` 主流程：

```text
C:\Users\bliuj\Desktop\kerry\kec-wms\wms-test-scripts\unittest_suite\run_main_flow_suite.bat
```

功能回归统一入口：

```powershell
cd C:\Users\bliuj\Desktop\kerry\kec-wms\wms-test-scripts\unittest_suite
python .\run_functional_regression_suite.py
```

双击运行功能回归：

```text
C:\Users\bliuj\Desktop\kerry\kec-wms\wms-test-scripts\unittest_suite\run_functional_regression_suite.bat
```

## unittest 版主流程

统一入口：

```powershell
cd C:\Users\bliuj\Desktop\kerry\kec-wms\wms-test-scripts\unittest_suite
python .\run_main_flow_suite.py
```

结构：

```text
unittest_suite/
  context.py
  steps/
    load_base_data.py
    prepare_inventory.py
    create_order.py
    allocate_order.py
    resolve_pick_task.py
    execute_packing.py
    execute_checkout.py
    execute_manifest.py
    verify_invalid_sku.py
  tests/
    base_case.py
    test_main_flow_positive.py
    test_main_flow_negative.py
  run_main_flow_suite.py
```

## 自定义环境变量

```powershell
$env:WMS_BASE_URL='https://stg-kec-wms.kec-app.com'
$env:WMS_TENANT_CODE='DEFAULT'
$env:WMS_USERNAME='admin'
$env:WMS_PASSWORD='Admin@123'
$env:WMS_WAREHOUSE_CODE='WH-SH-001'
$env:WMS_CLIENT_CODE='C001'
$env:WMS_SKU_CODE='SKU029'
python .\01_api_regression.py
```
