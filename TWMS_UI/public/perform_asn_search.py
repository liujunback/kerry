from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


def perform_asn_search(driver, asn_number="ASNMannings22025062500008"):
    """
    执行ASN搜索的完整流程：
    1. 展开SEARCH菜单
    2. 点击ASN链接
    3. 输入ASN号码
    4. 回车执行查询

    参数:
    driver: WebDriver实例
    asn_number: 要查询的ASN号码 (默认值: ASNMannings22025062500008)

    返回:
    bool: 操作是否成功
    """
    try:
        # 设置显式等待
        wait = WebDriverWait(driver, 10)

        print("正在展开SEARCH菜单...")
        # 定位并点击SEARCH菜单
        search_toggle = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//a[contains(@class, 'nav-dropdown-toggle') and contains(text(),'SEARCH')]")
            )
        )
        # 高亮显示菜单元素（可选）
        driver.execute_script("arguments[0].style.border='2px solid blue';", search_toggle)
        search_toggle.click()
        print("SEARCH菜单已展开")

        print("正在定位ASN链接...")
        # 定位并点击ASN链接
        asn_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "ASN"))
        )
        # 高亮显示链接元素（可选）
        driver.execute_script("arguments[0].style.border='2px solid green';", asn_link)
        asn_link.click()
        print("已进入ASN查询页面")

        print("正在定位ASN输入框...")
        # 定位ASN输入框
        asn_num_sel = wait.until(
            EC.element_to_be_clickable((By.NAME, "asn_number"))
        )
        # 高亮显示输入框（可选）
        driver.execute_script("arguments[0].style.border='2px solid red';", asn_num_sel)

        # 清空输入框（防止已有内容）
        asn_num_sel.clear()

        # 输入ASN号码
        print(f"正在输入ASN号码: {asn_number}")
        asn_num_sel.send_keys(asn_number)

        # 添加回车键执行查询
        print("正在执行查询...")
        asn_num_sel.send_keys(Keys.ENTER)
        print("已发送回车键执行查询")

        # 返回成功状态
        return True

    except TimeoutException:
        print("错误：操作超时！可能的原因：")
        print("1. 页面元素加载过慢 - 尝试增加等待时间")
        print("2. 元素定位失败 - 检查XPath或链接文本是否正确")
        print("3. 菜单结构可能已变更 - 需要更新定位策略")
        return False

    except NoSuchElementException:
        print("错误：未能找到页面元素！")
        return False

    except Exception as e:
        print(f"发生未知错误: {str(e)}")
        return False


