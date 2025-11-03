from locust import HttpUser, task, between
import time
import random
import os


class KECUser(HttpUser):
    wait_time = between(1, 3)  # 用户等待时间1-3秒
    host = "https://openapi.kec-app.com"

    # 确保下载目录存在
    def on_start(self):
        self.download_dir = "pdf_downloads"
        if not os.path.exists(self.download_dir):
            os.makedirs(self.download_dir)

    def generate_reference_number(self):
        """生成唯一的reference_number: 时间戳 + 随机数"""
        timestamp = int(time.time() * 1000)  # 毫秒级时间戳
        random_num = random.randint(1000, 9999)
        return f"ITTEST{timestamp}{random_num}"

    def download_pdf(self, reference_number, label_url):
        """下载PDF文件到本地"""
        try:
            # 使用相同的认证头文件
            headers = {
                'Authorization': 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjE5NzEzLCJ1c2VyTmFtZSI6ImtlY3N0cmVzc3Rlc3QuYXBpIiwiaWF0IjoxNzYxNTQ5MjU0LCJleHAiOjE3NjQxNDEyNTR9.1VcvM9Gb15UIxyQRbm3N3d5hUvQCmjs5iissB1V3jD8'
            }

            # 使用Locust的client下载，这样也会被统计在性能数据中
            response = self.client.get(label_url.replace(self.host, ""), headers=headers, name="Download_PDF")

            if response.status_code == 200:
                file_path = os.path.join(self.download_dir, f"{reference_number}.pdf")
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                print(f"PDF下载成功: {file_path}")
                return True
            else:
                print(f"PDF下载失败: {response.status_code}")
                return False

        except Exception as e:
            print(f"PDF下载异常: {str(e)}")
            return False

    @task(1)
    def create_shipment(self):
        """创建运单任务"""
        reference_number = self.generate_reference_number()

        payload = {
            "is_sync": True,
            "service": {
                "channel_code": "LMD",
                "service_type": "HD",
                "delivery_instruction": "-",
                "delivery_time": None
            },
            "package": {
                "reference_number": reference_number,
                "tracking_number": None,
                "total_qty": "1",
                "declared_value": "152.60",
                "declared_value_currency": "USD",
                "shipping_date": "2025-10-24 15:19:40",
                "ead_date": None,
                "payment_method": "PP",
                "actual_weight": "6.000",
                "length": "",
                "width": "",
                "height": "",
                "cod_value": 0,
                "cod_currency": "",
                "remark": "9inch Smart... x2 ...."
            },
            "sender": {
                "name": "张经理",
                "address": "广兴源互联网产业基地A区8栋729-731",
                "distinct": "-",
                "city": "深圳市",
                "country": "CN",
                "phone": "13509698124"
            },
            "receiver": {
                "name": "Mr Wong",
                "company": "Mr Wong",
                "address": "28 Ming Fung Street, Wong Tai Sin,Flat A, 21/F, Phoenext",
                "distinct": "-",
                "city": "Kowloon Downtown District",
                "country": "HK",
                "phone": "67735561"
            },
            "items": [
                {
                    "sku": "",
                    "description": "9inch Smart Robot",
                    "unit_price": "76.30",
                    "currency": "USD",
                    "qty": "2"
                }
            ],
            "parcel": []
        }

        headers = {
            'Authorization': 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjE5NzEzLCJ1c2VyTmFtZSI6ImtlY3N0cmVzc3Rlc3QuYXBpIiwiaWF0IjoxNzYxNTQ5MjU0LCJleHAiOjE3NjQxNDEyNTR9.1VcvM9Gb15UIxyQRbm3N3d5hUvQCmjs5iissB1V3jD8',
            'Content-Type': 'application/json'
        }

        # 发送创建运单请求
        with self.client.post(
                "/lmd/createonedo",
                json=payload,
                headers=headers,
                catch_response=True,
                name="Create_Shipment"
        ) as response:

            if response.status_code == 200:
                try:
                    response_data = response.json()

                    if response_data.get("code") == "200" and response_data.get("message") == "success":
                        # 成功响应，下载PDF
                        data = response_data.get("data", {})
                        label_url = data.get("label_url")
                        # with open("D:\pdf\\" + reference_number + ".pdf", 'wb') as f:
                        #     f.write(label_url.content)
                        if label_url:
                            # 下载PDF
                            self.download_pdf(reference_number, label_url)

                        response.success()
                        print(f"运单创建成功: {reference_number}")
                    else:
                        response.failure(f"API返回错误: {response_data}")

                except ValueError:
                    response.failure("响应不是有效的JSON格式")
            else:
                response.failure(f"HTTP错误: {response.status_code}")