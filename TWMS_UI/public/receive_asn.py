import time
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from TWMS_UI.tool.click_button import click_button

import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException
from TWMS_UI.tool.click_button import click_button
from TWMS_UI.tool.wait_for_page_refresh import wait_for_page_refresh


def receive_asn(driver, location, sku, qty=50, timeout=30):
    """
    增强版ASN收货函数，处理页面刷新

    参数:
        driver: WebDriver实例
        location: 库位代码
        sku: 商品SKU/条码
        qty: 收货数量 (默认为50)
        timeout: 最大等待时间(秒)

    返回:
        bool: 操作是否成功
    """
    try:
        print("\n" + "=" * 50)
        print(f"开始ASN收货: 库位={location}, SKU={sku}, 数量={qty}")
        print("=" * 50)

        wait = WebDriverWait(driver, timeout)

        # === 步骤1: 进入收货页面 ===
        # 获取刷新前的元素作为参考点
        reference_element = driver.find_element(By.TAG_NAME, "body")

        # 点击控制按钮
        if not click_button(
                driver,
                locator="td.dtr-control",
                locator_type="css",
                description="表格控制按钮"
        ):
            print("❌ 无法点击表格控制按钮")
            return False

        # 点击Receive按钮进入收货页面
        if not click_button(
                driver,
                locator="Receive",
                locator_type="link_text",
                description="Receive按钮"
        ):
            print("❌ 无法点击Receive按钮")
            return False

        # 等待页面刷新完成
        if not wait_for_page_refresh(driver, reference_element, timeout):
            print("❌ 进入收货页面失败")
            return False

        print("✅ 已进入收货页面")

        # === 步骤2: 设置收货参数 ===
        # 定位关键元素
        barcode_field = wait.until(
            EC.element_to_be_clickable((By.ID, "barcode")))
        time.sleep(3)
        # 点击Piece Scan按钮
        if not click_button(
                driver,
                locator="//label[contains(text(), 'Piece Scan')]",
                locator_type="xpath",
                description="Piece Scan按钮"
        ):
            print("❌ 无法点击Piece Scan按钮")
            return False
        print("✅ Piece Scan已启用")

        # 输入库位
        location_field = wait.until(
            EC.element_to_be_clickable((By.ID, "location")))
        location_field.clear()
        location_field.send_keys(location)
        location_field.send_keys(Keys.ENTER)
        print(f"✅ 库位 '{location}' 已输入")

        # 输入数量
        qty_field = wait.until(
            EC.element_to_be_clickable((By.ID, "qty")))
        # 移除只读属性
        driver.execute_script("arguments[0].removeAttribute('readonly');", qty_field)
        # 设置数量
        qty_field.clear()
        qty_field.send_keys(str(qty))
        print(f"✅ 数量 {qty} 已设置")

        # 输入条码
        barcode_field.clear()
        barcode_field.send_keys(sku)
        barcode_field.send_keys(Keys.ENTER)
        print(f"✅ 条码 '{sku}' 已输入")

        # 短暂等待条码处理
        time.sleep(1)

        # === 步骤3: 提交并等待结果 ===
        # 获取提交前的参考元素
        submit_button = wait.until(
            EC.element_to_be_clickable((By.ID, "button-submit")))

        # 点击提交按钮
        submit_button.click()
        print("✅ 收货信息已提交")

        # 验证结果
        try:
            # 等待成功消息
            success_msg = wait.until(
                EC.visibility_of_element_located(
                    (By.ID, "toast-container")
                )
            )
            print(f"✅ 收货成功库位: {success_msg.text}")
            return True
        except TimeoutException:
            # 检查错误消息
            try:
                error_msg = driver.find_element(By.CSS_SELECTOR, ".alert-danger")
                print(f"❌ 收货失败: {error_msg.text}")
            except NoSuchElementException:
                print("❌ 未检测到任何结果消息")
            return False

    except Exception as e:
        print(f"❌ ASN收货过程中出错: {str(e)}")
        # 保存截图以便调试
        driver.save_screenshot("asn_receive_error.png")
        return False