# -*- coding: utf-8 -*-
import unittest
from datetime import datetime

from BeautifulReport import BeautifulReport
import os
# 用例存放位置
test_case_path=os.getcwd()
# 测试报告存放位置
log_path='C:\\Users\\bliuj\Desktop\kerry\TWMS\\report'
# 测试报告名称
filename='测试报告_' + str((datetime.now()).strftime('%Y_%m_%d_%H_%M'))
#用例名称
description='TWMS'
# 需要执行哪些用例，如果目录下的全部，可以改为"*.py"，如果是部分带test后缀的，可以改为"*test.py"

API = "test"

api_file_map = {
    "虎门": "test_case_CN_twms.py",
    "前海": "test_case_QH_twms.py",
    "香港": "test_case_HK_twms.py",
    "泰国": "test_case_TH_twms.py",
    "test": "test_case_twms.py"
}

pattern = api_file_map.get(API, api_file_map["default"])


if __name__ == '__main__':
    test_suite = unittest .defaultTestLoader.discover(test_case_path, pattern=pattern)
    result = BeautifulReport(test_suite)
    result.report(filename=filename,description=description,report_dir=log_path)