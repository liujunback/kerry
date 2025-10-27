import random
import json
import time
from locust import HttpUser, task, between


class TMSPackageQueryUser(HttpUser):
    host = "https://cb-tms-kp-de.kec-app.com"
    wait_time = between(1, 3)  # 等待时间1-3秒

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 准备测试用的订单号和跟踪号列表
        self.test_orders = [
            {"provider_order_id": "ITTEST20250827002", "tracking_no": "PQARRG0400918250108018B"}
        ]

    def on_start(self):
        """用户启动时执行"""
        print("开始包裹轨迹查询压测")

    def generate_query_data(self):
        """生成查询数据，随机选择一个测试订单"""
        order_data = random.choice(self.test_orders)
        return order_data

    @task(1)
    def query_package_trace(self):
        """查询包裹轨迹"""
        # 生成查询数据
        query_data = self.generate_query_data()

        # 准备请求头
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        # 准备表单数据
        data = {
            "param_json": json.dumps(query_data)
        }

        # 发送请求
        with self.client.post(
                "/tms-saas-web/logistics/provider/cross_border/package_query_trace",
                data=data,
                headers=headers,
                catch_response=True,
                name="查询包裹轨迹"
        ) as response:
            try:
                # 解析响应
                response_data = response.json()
                # print(response.text)
                # 检查请求是否成功
                if response.status_code == 200:
                    # 根据实际接口响应结构调整成功判断条件
                    # 常见的成功标志可能是 success=true 或 code=200 等
                    if (response_data.get("success") or
                            response_data.get("code") == 0):
                        response.success()
                        print(f"轨迹查询成功: 订单{query_data['provider_order_id']}, 运单{query_data['tracking_no']}")
                    else:
                        error_msg = response_data.get("message", "未知错误")
                        response.failure(f"业务逻辑失败: {error_msg}")
                        print(f"轨迹查询失败: 订单{query_data['provider_order_id']}, 错误: {error_msg}")
                else:
                    response.failure(f"HTTP错误: {response.status_code}")
                    print(f"HTTP错误: {response.status_code}, 订单: {query_data['provider_order_id']}")

            except json.JSONDecodeError:
                response.failure(f"响应解析失败: {response.text}")
                print(f"响应解析失败: {response.text}")
            except Exception as e:
                response.failure(f"处理响应时发生错误: {e}")
                print(f"处理响应时发生错误: {e}")


class HighFrequencyQueryUser(TMSPackageQueryUser):
    """高频查询用户类"""

    @task(3)
    def query_package_trace_high_freq(self):
        """高频次查询包裹轨迹"""
        self.query_package_trace()


class MixedWorkloadUser(HttpUser):
    """混合工作负载用户，同时执行创建订单和查询轨迹"""
    host = "https://cb-tms-kp-de.kec-app.com"
    wait_time = between(1, 5)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.query_user = TMSPackageQueryUser(self)
        # 注意：创建订单需要另一个host和token，这里只是示例结构
        # 实际使用时需要根据创建订单接口调整

    @task(2)
    def query_trace(self):
        """查询轨迹任务（权重较高）"""
        self.query_user.query_package_trace()

    @task(1)
    def create_order(self):
        """创建订单任务（权重较低）"""
        # 这里可以调用创建订单的方法
        # 由于host和认证不同，实际实现需要调整
        pass


# 单独查询轨迹的测试类
class SimpleQueryUser(HttpUser):
    """简化版查询用户，只做轨迹查询"""
    host = "https://cb-tms-kp-de.kec-app.com"
    wait_time = between(1, 3)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.test_orders = [
            {"provider_order_id": "ITTEST20250827002", "tracking_no": "PQARRG0400918250108018B"},
            {"provider_order_id": "ITTEST20250827003", "tracking_no": "PQARRG0400918250108019C"},
        ]

    @task(1)
    def query_trace(self):
        """查询包裹轨迹"""
        query_data = random.choice(self.test_orders)

        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {"param_json": json.dumps(query_data)}

        with self.client.post(
                "/tms-saas-web/logistics/provider/cross_border/package_query_trace",
                data=data,
                headers=headers,
                catch_response=True,
                name="查询包裹轨迹"
        ) as response:
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    # 简化的成功判断逻辑
                    if response_data.get("success") or response_data.get("code") == 200:
                        response.success()
                    else:
                        response.failure(f"业务失败: {response_data.get('message', '未知错误')}")
                except:
                    response.failure("响应解析失败")
            else:
                response.failure(f"HTTP错误: {response.status_code}")