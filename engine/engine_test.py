# 1-导入模块文件
from selenium import webdriver
# 2-初始化浏览器为chrome浏览器
brower = webdriver.Chrome()
brower.get('https://www.engine.com/')
# 4-打印下网页标题
# print(brower.title)
# # 5-关闭浏览器
# brower.quit()