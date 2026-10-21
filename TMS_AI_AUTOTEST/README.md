# TMS AI AutoTest

这是一个面向物流 TMS 系统的最小可运行自动化测试骨架，技术栈是 `pytest + Playwright + requests`。

## 目录

```text
TMS_AI_AUTOTEST/
  pages/
  tests/
    api/
    ui/
  utils/
  data/
  conftest.py
  pytest.ini
  requirements.txt
  .env.example
```

## 初始化

```bash
pip install -r requirements.txt
playwright install chromium
```

## 环境变量

将 `.env.example` 另存为 `.env`，并填写实际账号密码。

```env
BASE_URL=https://tms-kec-eng-uat.kec-app.com
USERNAME=KEC064
PASSWORD=your_password
HEADLESS=false
TIMEOUT_MS=15000
```

## 运行

执行全部测试：

```bash
pytest
```

执行登录冒烟：

```bash
pytest tests/ui/test_login.py -m smoke
```

## 当前已包含

- 登录页面对象
- 浏览器和页面 fixture
- 失败自动截图
- 登录冒烟测试
- 订单查询测试骨架
- 基础测试数据工厂

## 下一步建议

1. 用 `playwright codegen <login_url>` 补全真实 locator。
2. 先做 3 条主链路：登录、订单查询、轨迹查询。
3. 再接入接口造数，让 UI 脚本只负责校验。

