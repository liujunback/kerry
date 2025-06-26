from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


def verify_asn_result(driver, expected_asn="ASNMannings22025062500008"):
    try:
        # 等待结果行加载（最多10秒）
        result_row = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(
                (By.XPATH, f"//tbody/tr[td[contains(text(), '{expected_asn}')]]")
            )
        )

        # 检查结果行是否可见
        if result_row.is_displayed():
            # 获取整个行的文本内容
            row_text = result_row.text
            # print(row_text)
            # 基本验证点
            checks = [
                expected_asn in row_text,  # ASN号码存在
                "Finished" in row_text  # 状态为Finished
            ]

            # 如果所有基本验证点都通过
            if all(checks):
                print(f"ASN结果验证通过: {expected_asn}")
                return True
            else:
                print(f"基本验证点缺失: {checks}")
                return False
        else:
            print("结果行存在但不可见")
            return False

    except TimeoutException:
        print(f"未找到ASN结果: {expected_asn}")
        return False
    except Exception as e:
        print(f"验证过程中发生错误: {str(e)}")
        return False