from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, ElementClickInterceptedException, NoSuchElementException
import datetime
import time


def create_asn(driver, client_name="backtest", asn_number=None, items=None, max_retries=3):
    """
    在 ASN 创建页面填写并提交表单（优化版）

    参数:
    driver: WebDriver 实例
    client_name: 要选择的客户名称 (默认为 backtest)
    asn_number: 自定义 ASN 编号 (可选)
    items: SKU 项目列表，格式 [{"sku": "SKU001", "qty": 10, "po": "PO123"}]
    max_retries: 失败重试次数 (默认3次)
    """

    def highlight(element, color="red", width="2px"):
        """高亮显示元素（调试用）"""
        driver.execute_script(f"arguments[0].style.border='{width} solid {color}';", element)

    def safe_click(element, description=""):
        """安全的元素点击方法"""
        for attempt in range(max_retries):
            try:
                driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
                highlight(element, "blue")
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
        return False

    def select_option(dropdown_id, search_value, option_text, description=""):
        """选择下拉框选项"""
        try:
            # 点击下拉框触发器
            dropdown_trigger = wait.until(
                EC.element_to_be_clickable((By.ID, f"select2-{dropdown_id}-container"))
            )
            safe_click(dropdown_trigger, f"打开{description}下拉框")

            # 输入搜索值
            search_input = wait.until(
                EC.visibility_of_element_located((By.CLASS_NAME, "select2-search__field"))
            )
            search_input.clear()
            search_input.send_keys(search_value)
            print(f"已输入搜索词: {search_value}")

            # 等待结果出现
            results_container = wait.until(
                EC.visibility_of_element_located((By.CLASS_NAME, "select2-results"))
            )

            # 检查结果状态
            no_results_elements = results_container.find_elements(
                By.XPATH, ".//li[contains(@class, 'select2-results__message')]"
            )

            # 检查是否有实际结果选项
            result_options = results_container.find_elements(
                By.XPATH,
                ".//li[contains(@class, 'select2-results__option') and not(contains(@class, 'select2-results__message'))]"
            )

            # 判断结果是否存在
            if no_results_elements and "No results found" in no_results_elements[0].text:
                print(f"❌ 未找到匹配的{description}选项: {option_text}")
                # 关闭下拉框
                driver.find_element(By.TAG_NAME, "body").click()
                return False

            elif not result_options:
                print(f"❌ 未找到任何{description}选项: {option_text}")
                return False

            matching_option = None
            for option in result_options:
                if option_text in option.text:
                    matching_option = option
                    break

            if matching_option:
                print(f"找到匹配的{description}选项: {option_text}")
                return safe_click(matching_option, f"选择{description}选项")
            else:
                print(f"❌ 未找到精确匹配的{description}选项，尝试模糊匹配: {option_text}")
                # 构造模糊匹配的XPath（不区分大小写）
                escaped_text = option_text.replace('"', '\\"').replace("'", "\\'")
                fuzzy_xpath = (
                    f"//li[contains(@class, 'select2-results__option') and "
                    f"contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
                    f"translate('{escaped_text}', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))]"
                )

                try:
                    # 等待模糊匹配选项出现
                    fuzzy_option = WebDriverWait(driver, 3).until(
                        EC.presence_of_element_located((By.XPATH, fuzzy_xpath))
                    )
                    actual_text = fuzzy_option.text.split(' - ')[0]  # 提取主要部分
                    print(f"⚠️ 找到模糊匹配项: {actual_text} (原始: {option_text})")
                    return safe_click(fuzzy_option, f"模糊匹配的{description}选项")
                except TimeoutException:
                    print(f"❌ 未找到任何匹配的{description}选项: {option_text}")
                    # 列出所有可用选项
                    available_options = [opt.text for opt in result_options]
                    print(f"可用选项: {available_options}")
                    return False
        except TimeoutException:
            print(f"选择{description}选项超时")
            return False

    def check_select2_results(sku_value):
        """检查Select2下拉框结果状态并选择匹配项"""
        try:
            # 等待结果容器出现
            results_container = wait.until(
                EC.visibility_of_element_located(
                    (By.CLASS_NAME, "select2-results")
                )
            )

            # 检查是否有 "No results found" 消息
            no_results_elements = results_container.find_elements(
                By.XPATH, ".//li[contains(@class, 'select2-results__message')]"
            )

            # 检查是否有实际结果选项
            result_options = results_container.find_elements(
                By.XPATH,
                ".//li[contains(@class, 'select2-results__option') and not(contains(@class, 'select2-results__message'))]"
            )

            # 判断结果状态
            if no_results_elements and "No results found" in no_results_elements[0].text:
                print(f"❌ SKU 不存在: {sku_value}")
                # 关闭下拉框
                driver.find_element(By.TAG_NAME, "body").click()
                # driver.save_screenshot(f"sku_not_found_{sku_value}.png")
                return False

            elif not result_options:
                print(f"❌ 未找到任何选项: {sku_value}")
                # driver.save_screenshot(f"no_options_{sku_value}.png")
                return False

            else:
                # 查找匹配的SKU选项
                matching_option = None
                for option in result_options:
                    if sku_value in option.text:
                        matching_option = option
                        break
                if matching_option:
                    print(f"找到匹配的SKU选项: {sku_value}")
                    return safe_click(matching_option, f"SKU选项 {sku_value}")
                else:
                    print(f"❌ 精确匹配失败，尝试模糊匹配: {sku_value}")

                    # 构造模糊匹配的XPath（不区分大小写）
                    escaped_sku = sku_value.replace('"', '\\"').replace("'", "\\'")
                    fuzzy_xpath = (
                        f"//li[contains(@class, 'select2-results__option') and "
                        f"contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
                        f"translate('{escaped_sku}', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))]"
                    )

                    try:
                        # 等待模糊匹配选项出现
                        fuzzy_option = WebDriverWait(driver, 3).until(
                            EC.presence_of_element_located((By.XPATH, fuzzy_xpath))
                        )
                        actual_text = fuzzy_option.text.split(' - ')[0]  # 提取SKU部分

                        print(f"⚠️ 找到模糊匹配项: {actual_text} (原始SKU: {sku_value})")
                        return safe_click(fuzzy_option, f"模糊匹配的SKU选项 {sku_value}")

                    except TimeoutException:
                        print(f"❌ SKU存在但未找到任何匹配项: {sku_value}")
                        # driver.save_screenshot(f"sku_no_match_{sku_value}.png")
                        return False

        except TimeoutException:
            print(f"❌ 等待结果超时: {sku_value}")
            # driver.save_screenshot(f"results_timeout_{sku_value}.png")
            return False

    try:
        print("\n" + "=" * 50)
        print(f"开始创建 ASN: 客户={client_name}, 项目数={len(items) if items else 0}")
        print("=" * 50)

        wait = WebDriverWait(driver, 15)

        # 1. 导航到ASN创建页面
        print("导航到ASN创建页面...")
        safe_click(
            wait.until(EC.element_to_be_clickable(
                (By.XPATH, "//a[contains(@class, 'nav-dropdown-toggle') and contains(text(),'SEARCH')]")
            )), "SEARCH菜单"
        )

        safe_click(
            wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "ASN"))),
            "ASN链接"
        )

        create_btn = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//a[contains(@class, 'btn-success') and contains(@href, '/asn/create')]")
            )
        )
        if not safe_click(create_btn, "创建按钮"):
            return False

        # 2. 填写表单
        print("填写ASN表单...")

        # 选择客户
        if not select_option("client_id", client_name.split(" (")[0], client_name, "客户"):
            return False

        # ASN编号
        if asn_number:
            asn_field = wait.until(EC.visibility_of_element_located((By.ID, "asn_number")))
            asn_field.clear()
            asn_field.send_keys(asn_number)
            print(f"设置 ASN 编号: {asn_number}")

        # 日期设置
        today = datetime.date.today()
        tomorrow = today + datetime.timedelta(days=1)

        date_fields = {
            "asn_date": today.strftime("%Y-%m-%d"),
            "eta_at": tomorrow.strftime("%Y-%m-%d")
        }

        for field_id, date_value in date_fields.items():
            field = wait.until(EC.visibility_of_element_located((By.ID, field_id)))
            field.clear()
            field.send_keys(date_value)
            print(f"设置 {field_id}: {date_value}")

        # 3. 添加SKU项目
        if items:
            print(f"添加 {len(items)} 个SKU项目...")
            add_item_btn = wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//span[contains(@class, 'add-item') and contains(., 'Add Item')]")
                )
            )

            for i, item in enumerate(items):
                print(f"添加项目 {i + 1}/{len(items)}: SKU={item['sku']}")

                # 添加新行
                if not safe_click(add_item_btn, "添加项目按钮"):
                    return False

                # 等待新行出现
                item_rows = wait.until(
                    EC.visibility_of_all_elements_located(
                        (By.XPATH, "//div[contains(@class, 'items-container')]//div[contains(@class, 'd-flex')]")
                    )
                )
                current_row = item_rows[-1]  # 获取最新添加的行

                # 输入SKU
                sku_container = current_row.find_element(
                    By.XPATH, ".//span[contains(@class, 'select2-container')]"
                )
                if not safe_click(sku_container, "SKU下拉框"):
                    return False

                # 搜索SKU
                search_input = wait.until(
                    EC.visibility_of_element_located((By.CLASS_NAME, "select2-search__field"))
                )
                search_input.clear()
                search_input.send_keys(item['sku'])

                # 检查结果并选择
                if not check_select2_results(item['sku']):
                    return False

                # 输入数量
                qty_field = current_row.find_element(
                    By.XPATH, ".//input[contains(@name, '[estimated_qty]')]"
                )
                qty_field.clear()
                qty_field.send_keys(str(item['qty']))

                # 输入PO编号
                po_field = current_row.find_element(
                    By.XPATH, ".//input[contains(@name, '[po_number]')]"
                )
                po_field.clear()
                po_field.send_keys(item['po'])

                print(f"项目添加成功: SKU={item['sku']}, QTY={item['qty']}, PO={item['po']}")

        # 4. 提交表单
        submit_btn = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        )
        if not safe_click(submit_btn, "提交按钮"):
            return False

        # 5. 验证结果
        try:
            success_msg = wait.until(
                EC.visibility_of_element_located(
                    (By.XPATH, "//div[contains(@class, 'alert-success') and contains(., 'successfully')]")
                )
            )
            print(f"✅ ASN创建成功: {success_msg.text}")
            return True
        except TimeoutException:
            # 检查是否有错误消息
            try:
                error_msg = driver.find_element(By.CSS_SELECTOR, ".alert-danger")
                print(f"❌ 创建失败: {error_msg.text}")
            except NoSuchElementException:
                print("❌ 未检测到成功或错误消息")
            return False

    except TimeoutException as e:
        print(f"❌ 操作超时: {str(e)}")
        # driver.save_screenshot("asn_creation_timeout.png")
        return False
    except Exception as e:
        print(f"❌ 创建ASN时出错: {str(e)}")
        # driver.save_screenshot("asn_creation_exception.png")
        return False