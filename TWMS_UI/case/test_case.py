import time
from datetime import datetime
import unittest

from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from TWMS_UI.properties.GetProperties import getProperties
from TWMS_UI.public.create_asn import create_asn
from TWMS_UI.public.perform_asn_search import perform_asn_search
from TWMS_UI.public.receive_asn import receive_asn
from TWMS_UI.public.twms_login import login
from TWMS_UI.public.verify_asn_result import check_asn_search_results
from TWMS_UI.webdriver.driver import create_driver

def priority(level):
    """测试方法优先级装饰器"""
    def decorator(func):
        func._priority = level
        return func
    return decorator
class MyTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        self.pro = getProperties("test")

    @priority(1)
    def test_case_successful_login(self):
        """验证正常登录功能"""
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
    @priority(2)
    def test_case_failed_login_scenarios(self):
        """验证异常登录功能"""
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
        driver = create_driver()
        for case in test_cases:

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

    @priority(4)
    def test_case_asn_select(self):
        """验证搜索功能是否正常（用例描述：检查首页搜索框能否正常返回结果）"""
        driver = create_driver()
        login(
            web_driver=driver,
            username=self.pro["username"],
            password=self.pro["password"],
            properties = self.pro
        )
        asn_number = "BACKTEST202506300959"
        success = perform_asn_search(driver,asn_number)
        if success:
            success, found = check_asn_search_results(driver, asn_number)
            if success:
                if found:
                    print("✅ 搜索成功且找到匹配结果")
                else:
                    print("✅ 搜索成功但未找到匹配结果")
            else:
                print("❌ 搜索操作失败")

            return success, found

    @priority(3)
    def test_case_create_asn(self):
        """验证正常创建ASN"""
        driver = create_driver()
        result, message = login(
            web_driver=driver,
            username=self.pro["username"],
            password=self.pro["password"],
            properties=self.pro
        )
        try:
            test_items = [
                {"sku": self.pro["sku"], "qty": 50, "po": "PO" +str((datetime.now()).strftime('%Y%m%d'))}
            ]

            # 创建ASN
            asn_number = "BACKTEST" + str((datetime.now()).strftime('%Y%m%d%H%M'))
            success = create_asn(
                driver,
                client_name=self.pro["client_name"],
                asn_number=asn_number,
                items=test_items
            )

            if success:
                self.asn_number=asn_number
                print("ASN创建测试通过")
            else:
                print("ASN创建测试失败")
        finally:
            driver.quit()
    def test_case_create_asn_invalid_sku(self):
        """验证测试使用无效SKU时的错误处理"""
        driver = create_driver()
        result, message = login(
            web_driver=driver,
            username=self.pro["username"],
            password=self.pro["password"],
            properties=self.pro
        )
        items = [{"sku": "INVALID_SKU_123", "qty": 10, "po": "PO-001"}]
        result = create_asn(driver,
                            client_name=self.pro["client_name"],
                            asn_number="BACKTEST" + str((datetime.now()).strftime('%Y%m%d%H%M')),
                            items=items
                            )
        assert result is False
    def test_case_create_asn_invalid_lient(self):
        """验证测试使用无效客户时的错误处理"""
        driver = create_driver()
        result, message = login(
            web_driver=driver,
            username=self.pro["username"],
            password=self.pro["password"],
            properties=self.pro
        )
        items = [{"sku": self.pro["sku"], "qty": 10, "po": "PO-001"}]
        result = create_asn(driver,
                            client_name="client_name",
                            asn_number="BACKTEST" + str((datetime.now()).strftime('%Y%m%d%H%M')),
                            items=items
                            )
        assert result is False

    @priority(5)
    def test_case_asn_receive(self):
        """验证收货功能是否"""
        driver = create_driver()
        login(
            web_driver=driver,
            username=self.pro["username"],
            password=self.pro["password"],
            properties = self.pro
        )
        asn_number = "BACKTEST202506300959"
        success = perform_asn_search(driver,asn_number)
        if success:
            success, found = check_asn_search_results(driver, asn_number)
            if success:
                if found:
                    print("✅ 搜索成功且找到匹配结果")
                    receive_asn(driver,self.pro['location'],self.pro['sku'])
                else:
                    print("✅ 搜索成功但未找到匹配结果")
            else:
                print("❌ 搜索操作失败")

if __name__ == '__main__':
    unittest.main()


