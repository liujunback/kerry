# PUDO 测试脚本

这个目录现在分成两层：

- `common.py`
  - 放登录、页面打开、弹窗定位这些公共能力。
- `menu_cases/`
  - 按菜单拆分测试逻辑，后续新增功能时优先往这里加。

当前菜单模块：

- `menu_cases/pudo_shops.py`
  - `PUDO Shops` 相关检查。
- `menu_cases/user_management.py`
  - `User Management` 相关检查。
- `menu_cases/order_queries.py`
  - `Pickup Order`、`Return Order`、`Return Container` 相关检查。

公共运行入口：

- `run_menu_tests.py`
  - 按菜单运行。
- `run_all_pudo_tests.py`
  - 跑当前全部菜单检查。

保留的单项脚本：

- `01_login_visible.py`
- `02_check_shop_detail_buttons.py`
- `03_test_shop_edit.py`
- `04_test_user_management_filters.py`
- `05_test_order_list_pudo_code.py`

默认环境变量：

```powershell
$env:PUDO_BASE_URL='https://pudo-portal-test.parcelbox.net'
$env:PUDO_EMAIL='admin@pudo.com'
$env:PUDO_PASSWORD='yHCwrsu76mZk@2N'
$env:PUDO_SHOP_CODE='ES493276'
$env:PUDO_BOT_TIMEOUT='180'
$env:PUDO_MANUAL_WAIT='300'
```

常用命令：

```powershell
cd 'C:\Users\bliuj\Desktop\kerry\pudo测试环境'
python .\run_menu_tests.py --list
python .\run_menu_tests.py --menu pudo_shops --shop-code ES493276
python .\run_menu_tests.py --menu user_management --contact-name "Rebecca test3 Zhang" --contact-email "Rebecca.RH.Zhang@kln.com3"
python .\run_menu_tests.py --menu order_queries
python .\run_all_pudo_tests.py --shop-code ES493276 --contact-name "Rebecca test3 Zhang" --contact-email "Rebecca.RH.Zhang@kln.com3"
```

后续新增菜单脚本建议：

1. 在 `menu_cases/` 下新增一个对应菜单的模块。
2. 在模块里返回 `MenuCheck` 列表。
3. 在 `menu_cases/registry.py` 里注册这个菜单。
4. 用 `python .\run_menu_tests.py --list` 确认已经被识别。

依赖：

- Python
- Playwright
- Microsoft Edge
