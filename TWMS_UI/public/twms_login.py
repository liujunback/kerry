import time

from selenium.webdriver.support import expected_conditions as EC

from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait

from TWMS_UI.webdriver.driver import create_driver




def login(web_driver, username, password,properties, wait_time=10):
    """
    执行登录操作
    :param web_driver: WebDriver实例
    :param username: 用户名
    :param password: 密码
    :param wait_time: 显式等待时间(秒)
    :return: (success, message) 元组，登录是否成功及状态信息
    """
    try:
        web_driver.get(properties["TWMS_URL"] +  "/admin/login")

        # 输入用户名
        username_input = WebDriverWait(web_driver, wait_time).until(
            EC.presence_of_element_located((By.ID, "username")))
        username_input.send_keys(username)

        # 输入密码
        password_input = WebDriverWait(web_driver, wait_time).until(
            EC.presence_of_element_located((By.ID, "password")))
        password_input.send_keys(password)

        # 点击登录按钮
        login_button = WebDriverWait(web_driver, wait_time).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.btn.btn-times[type='submit']")))
        login_button.click()

        # 验证登录成功 - 等待SEARCH菜单出现
        WebDriverWait(web_driver, wait_time).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//a[contains(@class, 'nav-dropdown-toggle') and contains(text(),'SEARCH')]"))
        )
        return (True, "登录成功")

    except Exception as e:
        # 捕获登录过程中的任何异常
        error_msg = f"登录失败: {str(e)}"

        # 尝试捕获具体的错误提示信息
        try:
            error_element = web_driver.find_element(By.CSS_SELECTOR, ".alert.alert-danger")
            error_msg += f" | 系统提示: {error_element.text}"
        except:
            pass

        return (False, error_msg)

    # # 显式等待菜单展开
    # search_toggle = WebDriverWait(web_driver, 10).until(
    #     EC.element_to_be_clickable((By.XPATH,"//a[contains(@class, 'nav-dropdown-toggle') and contains(text(),'SEARCH')]"))
    # )
    # search_toggle.click()
    # asn_link = WebDriverWait(web_driver, 10).until(
    #     EC.element_to_be_clickable((By.LINK_TEXT, "ASN"))
    # )
    # asn_link.click()
    # time.sleep(15)