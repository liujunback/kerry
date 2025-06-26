from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import ElementClickInterceptedException, NoSuchElementException
import time

def safe_click(driver, element, description="", max_retries=3):
    """安全的元素点击方法"""
    for attempt in range(max_retries):
        try:
            driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
            element.click()
            print(f"成功点击: {description}")
            return True
        except (ElementClickInterceptedException, NoSuchElementException) as e:
            print(f"点击失败 ({attempt + 1}/{max_retries}): {description} - {str(e)}")
            time.sleep(1)
            if attempt == max_retries - 1:
                print(f"最终点击失败: {description}")
                return False
    return False
