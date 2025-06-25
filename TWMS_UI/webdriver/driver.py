from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options


def create_driver():
    driver = None
    try:
        chrome_options = Options()
        chrome_options.binary_location = r'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe'

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.maximize_window()  # 通用最大化方法
        return driver

    except Exception as e:
        print("❌ 初始化失败:", str(e))
        if driver:
            driver.quit()
        return None

