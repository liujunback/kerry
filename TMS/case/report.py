# -*- coding: utf-8 -*-
import unittest
from BeautifulReport import BeautifulReport
import os
# 用例存放位置
test_case_path=os.getcwd()
# 测试报告存放位置
log_path='D:\pythonFile\kerry\TMS\\report'
# 测试报告名称
filename='测试报告_order'
#用例名称
description='下单模块'
# 需要执行哪些用例，如果目录下的全部，可以改为"*.py"，如果是部分带test后缀的，可以改为"*test.py"
pattern="create_order.py"

if __name__ == '__main__':
    test_suite = unittest .defaultTestLoader.discover(test_case_path, pattern=pattern)
    result = BeautifulReport(test_suite)
    result.report(filename=filename,description=description,report_dir=log_path)