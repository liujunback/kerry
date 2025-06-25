
from locust import HttpUser,TaskSet,task


class Test(TaskSet):



    @task()
    def create_order(self):#下单

        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" 947e8e98-9cb1-489f-be9e-acbd1c45c36e"
            }

        with self.client.get('pos-web/shipment/label?tracking_number=PH9ERA0431234590114013S', headers = header, name = "测试", catch_response = True) as response:
            if "success" in response.text:
                response.success()
            else:
                response.failure("fail")
                print(response.text)
class websitUser(HttpUser):
    tasks = [Test]
    host = " http://47.119.160.122:8097/"
