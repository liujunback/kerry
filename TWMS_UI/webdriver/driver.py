from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
import logging


def create_driver():
    """
    创建并返回一个配置好的Chrome WebDriver实例
    返回:
        WebDriver: 成功时返回driver对象，失败时返回None
    """
    driver = None
    try:
        # 配置Chrome选项
        chrome_options = Options()
        chrome_options.binary_location = r'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe'
        chrome_options.add_argument("--start-maximized")  # 更可靠的最大化方式
        chrome_options.add_argument("--disable-extensions")  # 禁用扩展
        chrome_options.add_argument("--disable-infobars")  # 禁用信息栏
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])  # 移除自动化控制提示

        # 自动管理ChromeDriver版本
        service = Service(ChromeDriverManager().install())

        # 创建WebDriver实例
        driver = webdriver.Chrome(service=service, options=chrome_options)

        return driver

    except Exception as e:
        # 使用logging记录异常信息
        logging.error(f"❌ WebDriver初始化失败: {str(e)}", exc_info=True)
        if driver:
            driver.quit()
        return None