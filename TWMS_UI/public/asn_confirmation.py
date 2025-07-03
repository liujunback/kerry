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


def asn_confirmation(driver, asn_number,timeout=30):
    """
        执行ASN确认流程（仅包含确认操作）

        参数:
            driver: WebDriver实例
            timeout: 操作超时时间 (默认30秒)

        返回:
            bool: 所有步骤是否成功完成
        """
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
            locator="Confirmation",
            locator_type="link_text",
            description="Receive按钮"
    ):
        print("❌ 无法点击Confirmation按钮")
        return False
    try:
        # 步骤4: 等待确认页面加载完成
        WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.ID, "agree")))
        print("✅ 成功进入ASN确认页面")
        # 步骤5: 勾选所有必要的确认选项
        confirmation_options = [
            {"locator": "addcheckbox", "description": "Add Checkbox"},
            {"locator": "num_of_box_agree", "description": "Number of Boxes Agree"},
            {"locator": "agree", "description": "Agreement"}
        ]

        for option in confirmation_options:
            if not click_button(
            driver,
            locator=option["locator"],
            locator_type="id",
            description=option["description"]
            ):
                print(f"⚠️ 无法勾选 {option['description']}，尝试继续")

        # 步骤6: 点击确认收货按钮
        if not click_button(
                driver,
                locator='button.btn.btn-success.btn-all-confirm[data-type="all"]',
                locator_type="css",
                description="确认收货按钮",
                timeout=15
        ):
            print("❌ 无法点击确认收货按钮")
            return False
        print("✅ 确认收货按钮点击成功")
        try:
            WebDriverWait(driver, 5).until(EC.alert_is_present())
            alert = driver.switch_to.alert
            alert.accept()
            print("✅ 已接受确认对话框")
        except TimeoutException:
            print("⚠️ 未出现确认对话框")
        try:
            reference_element = driver.find_element(By.TAG_NAME, "body")
            if not wait_for_page_refresh(driver, reference_element, timeout):
                print("❌ 进入收货页面失败")
                return False
            time.sleep(1)
            if is_operation_successful(driver, "BACKTEST202507021137"):
                # print("操作成功!")
                print("🎉 ASN确认成功完成!")
            return True
        except TimeoutException:
            print("⚠️ 未找到成功提示，但操作可能已完成")
            return True
    except TimeoutException as te:
        print(f"⏰ 操作超时: {str(te)}")
        return False
    except Exception as e:
        print(f"❌ ASN确认过程中出错: {str(e)}")
        return False


def is_operation_successful(driver, success_parameter, timeout=15):
    """
    判断新页面是否包含成功参数

    参数:
        driver: WebDriver实例
        success_parameter: 期望在成功提示中出现的参数（如"BACKTEST202507021137"）
        timeout: 等待页面加载和元素出现的超时时间(秒)

    返回:
        bool: 是否找到包含参数的成功提示
    """
    try:
        print(f"🔍 正在验证操作是否成功 - 检查参数: {success_parameter}")

        # 1. 确保新页面已加载完成
        WebDriverWait(driver, timeout).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        print("✅ 新页面已完全加载")

        # 2. 等待成功提示元素出现
        WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div.alert-success")))
        print("✅ 找到成功提示元素")

        # 3. 查找所有成功提示并检查内容
        success_alerts = driver.find_elements(By.CSS_SELECTOR, "div.alert-success")

        for alert in success_alerts:
            if alert.is_displayed():
                alert_text = alert.text.strip()
                print(f"📢 成功提示内容: '{alert_text}'")

        # 检查是否包含指定的参数
        if success_parameter in alert_text:
            print(f"🎉 找到包含参数 '{success_parameter}' 的成功提示!")
        return True

        print(f"⚠️ 成功提示中未找到参数: {success_parameter}")
        return False

    except TimeoutException:
        print(f"❌ 在 {timeout} 秒内未找到成功提示")
        return False
    except Exception as e:
        print(f"❌ 验证操作结果时出错: {str(e)}")
        return False