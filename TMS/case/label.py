
import random

from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    def on_start(self):
        self.ip_address = []
        with open('../request_data/success_length.txt', 'r') as f1:
            for ip in f1.readlines():
                if ip != None:
                    # 从文件中读取行数据时，会带换行符，使用strip函数去掉 换行符后存入列表
                    self.ip_address.append(ip.strip("\n"))
        f1.close()
    @task(2)
    def label(self):#
        label_url = self.ip_address[random.randint(0,20000)]
        with self.client.get(url=label_url,name = "laber下载", catch_response = True ) as test:
            if test.status_code==200:
                test.success()
            else:
                test.failure(test.text)


class websitUser(HttpUser):

    tasks = [Test]
    #host = "http://172.16.0.52:8001"
    host = "http://120.78.66.231:22900"
    #host= "http://120.78.66.231:8000"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒
