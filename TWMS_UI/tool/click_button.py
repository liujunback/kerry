
import logging

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

from selenium.common.exceptions import TimeoutException, ElementClickInterceptedException, NoSuchElementException

import time



def click_button(driver, locator=None, locator_type="id", timeout=10, description="", element=None):
    """
    安全地点击页面元素（增强版，支持Select2）
    """
    max_retries= 3
    try:
        if locator_type == "element":
            for attempt in range(max_retries):
                try:
                    driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});",
                                          element)
                    element.click()
                    print(f"成功点击: {description}")
                    return True
                except (ElementClickInterceptedException, NoSuchElementException) as e:
                    print(f"点击失败 ({attempt + 1}/{max_retries}): {description} - {str(e)}")
                    time.sleep(1)
                    if attempt == max_retries - 1:
                        print(f"最终点击失败: {description}")
                        # driver.save_screenshot(f"click_failed_{description.replace(' ', '_')}.png")
                        return False
        else:
            locator_map = {
                "id": By.ID,
                "xpath": By.XPATH,
                "css": By.CSS_SELECTOR,
                "name": By.NAME,
                "class": By.CLASS_NAME,
                "link_text": By.LINK_TEXT
            }

            if locator_type not in locator_map:
                logging.error(f"❌ 不支持的定位器类型: {locator_type}")
                return False

            target_element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((locator_map[locator_type], locator)))

        # 特殊处理Select2下拉框 - 使用click_button自身处理
        if "select2" in target_element.get_attribute("class"):
            return handle_select2_dropdown(driver, target_element, description)

        # 通用点击逻辑
        driver.execute_script(
            "arguments[0].scrollIntoView({behavior: 'auto', block: 'center', inline: 'center'});",
            target_element
        )

        try:
            target_element.click()
            logging.info(f"✅ 成功点击: {description}")
            return True
        except ElementClickInterceptedException:
            logging.warning(f"⚠️ 标准点击被拦截，尝试JavaScript点击: {description}")
            driver.execute_script("arguments[0].click();", target_element)
            logging.info(f"✅ JavaScript点击成功: {description}")
            return True

    except TimeoutException:
        logging.error(f"⌛ 超时: 在{timeout}秒内未找到可点击元素 ({description})")
    except NoSuchElementException:
        logging.error(f"🔍 元素不存在: {description}")
    except ElementClickInterceptedException:
        logging.error(f"🛑 点击被拦截: {description} 被其他元素遮挡")
    except Exception as e:
        logging.error(f"❌ 点击失败: {description} - {str(e)}", exc_info=True)

    return False


def handle_select2_dropdown(driver, dropdown_element, description):
    """
    特殊处理Select2下拉框点击 - 使用click_button方法统一处理
    """
    logging.info(f"🔄 处理Select2下拉框: {description}")

    # 检查是否已展开
    body_class = driver.find_element(By.TAG_NAME, "body").get_attribute("class")
    if "select2-container--open" in body_class:
        logging.info("🔽 下拉框已展开，无需再次点击")
        return True

    # 尝试点击不同部分的策略
    click_strategies = [
        {"locator": ".select2-selection__arrow", "type": "css", "desc": "箭头图标"},
        {"locator": ".select2-selection__rendered", "type": "css", "desc": "文本区域"},
        {"element": dropdown_element, "desc": "整个元素"}
    ]

    for strategy in click_strategies:
        try:
            # 使用click_button统一处理点击操作
            if "element" in strategy:
                success = click_button(
                    driver,
                    element=strategy["element"],
                    description=f"Select2-{strategy['desc']}"
                )
            else:
                success = click_button(
                    driver,
                    locator=strategy["locator"],
                    locator_type=strategy["type"],
                    element=dropdown_element,  # 限定在父元素内查找
                    description=f"Select2-{strategy['desc']}"
                )

            if success:
                # 验证下拉框是否成功打开
                WebDriverWait(driver, 2).until(
                    EC.visibility_of_element_located((By.CLASS_NAME, "select2-dropdown"))
                )
                logging.info(f"✅ Select2下拉框成功展开: {strategy['desc']}")
                return True

        except (NoSuchElementException, TimeoutException):
            continue

    # 所有策略失败后尝试最终手段
    logging.warning("⚠️ 标准策略失败，尝试最终JavaScript点击")
    try:
        driver.execute_script("arguments[0].click();", dropdown_element)
        WebDriverWait(driver, 2).until(
            EC.visibility_of_element_located((By.CLASS_NAME, "select2-dropdown"))
        )
        return True
    except Exception as e:
        logging.error(f"❌ Select2点击完全失败: {description} - {str(e)}")
        return False
