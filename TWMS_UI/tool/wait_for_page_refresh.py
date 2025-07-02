from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException
import time


def wait_for_page_refresh(driver, original_element, timeout=30):
    """
    智能等待页面刷新完成（公共方法）

    结合两种检测策略：
    1. 主策略：检测原始元素是否过时（stale）
    2. 备选策略：检测页面加载状态（document.readyState）

    参数:
        driver: WebDriver实例
        original_element: 刷新前定位到的页面元素（作为参照点）
        timeout: 最大等待时间（秒），默认30秒

    返回:
        bool: 刷新成功返回True，超时或失败返回False

    使用示例:
        element = driver.find_element(By.ID, "main-content")
        driver.refresh()
        if wait_for_page_refresh(driver, element):
            print("刷新成功")
    """
    try:
        print(f"⏳ 开始监测页面刷新 (超时={timeout}秒)...")
        start_time = time.time()

        # 主检测策略：等待原始元素变为过时状态（表示DOM已更新）
        WebDriverWait(driver, timeout).until(
            EC.staleness_of(original_element))
        elapsed = time.time() - start_time
        print(f"✅ 页面刷新检测成功 - 元素已过时 ({elapsed:.2f}秒)")
        return True

    except TimeoutException:
        # 备选策略：检查页面加载状态
        try:
            # 快速检查页面是否已完成加载
            WebDriverWait(driver, 3).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
            elapsed = time.time() - start_time
            print(f"⚠️ 使用备选策略检测到页面加载完成 ({elapsed:.2f}秒)")
            return True
        except TimeoutException:
            elapsed = time.time() - start_time
            print(f"❌ 页面刷新检测超时 ({elapsed:.2f}秒)")
            return False

    except StaleElementReferenceException:
        # 原始元素在检测前已消失，直接视为刷新成功
        elapsed = time.time() - start_time
        print(f"✅ 元素已提前过时，直接确认刷新 ({elapsed:.2f}秒)")
        return True

    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ 检测过程中发生意外错误: {type(e).__name__} - {str(e)} ({elapsed:.2f}秒)")
        return False