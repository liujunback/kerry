import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

import time

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


def check_asn_search_results(driver, asn_number, timeout=15):
    """
    精确检查ASN搜索结果
    返回: (操作是否成功, 是否找到匹配结果)
    """
    time.sleep(1)
    try:
        # 等待结果表格加载完成
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.ID, "dataTables"))
        )

        # 获取所有可见的行元素
        all_rows = driver.find_elements(
            By.CSS_SELECTOR, "#dataTables tbody tr"
        )

        # 过滤出包含实际数据的行
        result_rows = []
        for row in all_rows:
            try:
                # 检查第一列是否有内容（ID列）
                first_cell = row.find_element(By.XPATH, "./td[2]")
                if first_cell.text.strip():  # 如果有文本内容
                    result_rows.append(row)
            except:
                continue

        print(f"实际有效数据行数: {len(result_rows)}")

        if not result_rows:
            # 检查无数据提示
            try:
                no_data_div = driver.find_element(
                    By.XPATH, "//div[contains(@class, 'dataTables_empty') and contains(text(), 'No data')]"
                )
                if no_data_div.is_displayed():
                    print("ℹ️ 未找到匹配记录")
                    return True, False
            except NoSuchElementException:
                print("⚠️ 结果表格为空")
                return True, False

        # 检查是否有匹配的ASN号码
        for i, row in enumerate(result_rows, 1):
            try:
                # 获取ASN号码单元格 - 第三列
                asn_cell = row.find_element(By.XPATH, "./td[3]")
                cell_text = asn_cell.text.strip()

                # 精确匹配
                if cell_text == asn_number:
                    print(f"✅ 找到精确匹配: {asn_number} (第{i}行)")
                    # 高亮显示匹配行
                    driver.execute_script(
                        "arguments[0].style.backgroundColor='#e6ffe6';",
                        row
                    )
                    return True, True

            except NoSuchElementException:
                continue

        print(f"⚠️ 未找到匹配项 (搜索值: {asn_number})")
        return True, False

    except TimeoutException:
        print("⌛ 结果加载超时")
        return False, False
    except Exception as e:
        print(f"❌ 结果检查失败: {str(e)}")
        return False, False

