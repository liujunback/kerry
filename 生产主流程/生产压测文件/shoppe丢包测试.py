import ast
import json
import os
import random

import datetime
import openpyxl
import requests

from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    @task(1)
    def create_order(self):#下单

        payload = json.dumps({
            "JWT": "eyJhbGciOiJIUzI1NiJ9.eyJkYXRhIjp7Im9yZGVyIjp7ImNhcnJpZXJfdG4iOiJUV1NQVEVTVDIwMjUwMTE3MTgzMjQ2IiwiaWxoX3Nob3BlZV9ubyI6IkJBQ0tURVNUMjAyNTAxMTcxODMyNDYifSwicGFyY2VsX2xpc3QiOlt7ImRvbWVzdGljX3RoaXJkX3BhcnR5X25vIjoiVEVTVDIwMjUwMTE3MTgzMjQ2MiIsImludm9pY2VfZGF0ZSI6MTczMTU5NjkwOSwicGFyY2VsX2hlaWdodCI6MSwicGFyY2VsX2xlbmd0aCI6MSwicGFyY2VsX3ZvbHVtZSI6MSwicGFyY2VsX3dlaWdodCI6Mi44NywicGFyY2VsX3dpZHRoIjoxLCJyZWNlaXZlcl9pbmZvIjp7InJlY2VpdmVyX2FkZHJlc3MiOiLguKrguLPguJnguLHguIHguJrguKPguLTguKvguLLguJnguJ7guLfguYnguJnguJfguLXguYjguK3guJnguLjguKPguLHguIHguKnguYzguJfguLXguYggMTYgKCDguYDguIrguLXguKLguIfguYPguKvguKHguYggKSDguJ3guYjguLLguKLguJ7guLHguKrguJTguLjguK8sIDE1MyDguJbguJnguJkg4LmA4LiI4Lij4Li04LiN4Lib4Lij4Liw4LmA4LiX4LioLCDguJXguLPguJrguKUg4LiK4LmJ4Liy4LiH4LiE4Lil4Liy4LiZLCDguK3guLPguYDguKDguK3guYDguKHguLfguK3guIfguYDguIrguLXguKLguIfguYPguKvguKHguYgiLCJyZWNlaXZlcl9jaXR5Ijoi4Lit4Liz4LmA4Lig4Lit4LmA4Lih4Li34Lit4LiH4LmA4LiK4Li14Lii4LiH4LmD4Lir4Lih4LmIIiwicmVjZWl2ZXJfZGlzdHJpY3QiOiLguJXguLPguJrguKXguIrguYnguLLguIfguITguKXguLLguJkiLCJyZWNlaXZlcl9uYW1lIjoi4LiZ4Liy4LiH4Liq4Liy4Lin4LmA4LiB4Lio4Li04LiZ4Li1IOC4m-C4tOC4meC4leC4suC4quC4suC4oSIsInJlY2VpdmVyX3Bob25lIjoiNjYqKioqMTExIiwicmVjZWl2ZXJfcG9zdGFsX2NvZGUiOiI1MDEwMCIsInJlY2VpdmVyX3JlZ2lvbiI6IlRIIiwicmVjZWl2ZXJfc3RhdGUiOiLguIjguLHguIfguKvguKfguLHguJTguYDguIrguLXguKLguIfguYPguKvguKHguYgifSwicmVmZXJlbmNlX25vIjoiVEVTVDIwMjUwMTE3MTgzMjQ2MiIsInNlbmRlcl9pbmZvIjp7InNlbmRlcl9hZGRyZXNzIjoiTG9naXN0aWNzIFNvcnRpbmcgSHViLCBYaSBOaXUgWWkgU3RyZWV0LCBNYWl5dWFuIFZpbGxhZ2UsIENoYW5ncGluZyBUb3duLCBEb25nZ3VhbiBDaXR5Iiwic2VuZGVyX2NpdHkiOiJIb25nS29uZyIsInNlbmRlcl9kaXN0cmljdCI6Iktvd2xvb24iLCJzZW5kZXJfbmFtZSI6IkV2ZXJsZXkiLCJzZW5kZXJfcGhvbmUiOiI2NioqKioxMTEiLCJzZW5kZXJfcG9zdGFsX2NvZGUiOiI5OTkwNzciLCJzZW5kZXJfcmVnaW9uIjoiQ04iLCJzZW5kZXJfc3RhdGUiOiJIb25nS29uZyJ9LCJzaG9wZWVfb3JkZXJfbm8iOiJURVNUMjAyNTAxMTcxODMyNDYyIiwic2t1X2xpc3QiOlt7ImRlY2xhcmVfbmFtZSI6IkhvbWUgJiBMaXZpbmctS2l0Y2hlbndhcmUtQmFrZXdhcmVzICYgRGVjb3JhdGlvbnMiLCJkZWNsYXJlX3ZhbHVlIjoxNDcyLCJkZWNsYXJlX3ZhbHVlX3VzZCI6NDMsImx2Z190YWciOiIyIiwicHJvZHVjdF9uYW1lIjoiS2l0Y2hlbkFpZCA3LXBpZWNlIEJha2luZyBTZXQgLSBFbXBpcmUgUmVkIiwicXVhbnRpdHkiOjF9XX1dfSwidGltZXN0YW1wIjoxNjc2NDQ4MzY0fQ.FrS_IR5hXWZch6Pa8WY2BB42t86aAypA_rukjfbP-6M"
        })
        headers =  {
              'Content-Type': 'application/json'
            }
        with self.client.get('/tms-saas-web/shopee/api/services/ilh_shipment/push_info',data = payload, name = "测试",headers = headers, catch_response = True) as response:
            if "订单已存在！！！" in response.text:
                response.success()



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://tms-kec.kerry-ecommerce.com.cn"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒