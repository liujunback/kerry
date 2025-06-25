import time
import unittest
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from TWMS_UI.properties.GetProperties import getProperties
from TWMS_UI.public.twms_login import login
from TWMS_UI.webdriver.driver import create_driver


class MyTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        self.pro = getProperties("test")

    def test_case_successful_login(self):
        #正常登录
        driver = create_driver()
        result, message = login(
            web_driver=driver,
            username=self.pro["username"],
            password=self.pro["password"],
            properties = self.pro
        )

        assert result is True, f"正常登录失败: {message}"
        print("✅ 正常登录测试通过")

        # 验证登录后状态
        try:
            user_menu = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((
                    By.XPATH,
                    """
                    //a[
                        contains(@class, 'nav-link') and 
                        contains(@class, 'dropdown-toggle') and 
                        .//i[@class='fa fa-user'] and 
                        .//span[@class='d-md-down-none' and text()='Back Liu']
                    ]
                    """
                ))
            )
            print(f"当前登录用户: {user_menu.text}")
        finally:
            driver.quit()

    # @unittest.skip
    def test_case_failed_login_scenarios(self):
        #异常登录
        test_cases =[
                {
                    "name": "空用户名",
                    "username": "",
                    "password": "0240815.backA",
                    "expected_error": "The Username field is required."
                },
                {
                    "name": "空密码",
                    "username": "back.liu",
                    "password": "",
                    "expected_error": "The Password field is required."
                },
                {
                    "name": "错误用户名",
                    "username": "invalid.user",
                    "password": "0240815.backA",
                    "expected_error": "These credentials do not match our records."
                },
                {
                    "name": "错误密码",
                    "username": "back.liu",
                    "password": "wrong_password",
                    "expected_error": "These credentials do not match our records."
                },
                {
                    "name": "SQL注入尝试",
                    "username": "' OR '1'='1",
                    "password": "any_password",
                    "expected_error": "These credentials do not match our records."
                }
            ]
        for case in test_cases:
            driver = create_driver()
            result, message = login(
                web_driver=driver,
                username=case["username"],
                password=case["password"],
                properties = self.pro
            )

            # 验证登录失败
            assert result is False, f"{case['name']} 测试失败: 意外登录成功"

            # 验证错误提示
            assert case["expected_error"] in message, (
                f"{case['name']} 错误提示不匹配\n"
                f"预期: {case['expected_error']}\n"
                f"实际: {message}"
            )

            print(f"✅ {case['name']} 测试通过")
            driver.quit()

    def test_case_ASN_Select(self):
        #正常登录
        driver = create_driver()
        result, message = login(
            web_driver=driver,
            username=self.pro["username"],
            password=self.pro["password"],
            properties = self.pro
        )
        # 显式等待菜单展开
        search_toggle = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.XPATH,"//a[contains(@class, 'nav-dropdown-toggle') and contains(text(),'SEARCH')]")
            ))
        search_toggle.click()
        asn_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "ASN"))
        )
        asn_link.click()
        time.sleep(15)

if __name__ == '__main__':
    unittest.main()