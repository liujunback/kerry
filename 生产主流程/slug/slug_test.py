import json
import datetime
import os
import random
import time
import requests

def slug_test():
    # 配置路径和参数
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(script_dir, "../../生产主流程/slug/data_slug.txt")
    service_url = os.getenv("SERVICE_URL", "https://spider.kec-app.com")
    token = os.getenv("API_TOKEN", "e0J7AjwuDEsNb2sJxTgEZq4cQPXvlyMyL7v8nk4m3vfmgrJk1KKuDl91zfKr")

    # 读取负载数据
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            payload = json.loads(f.read())
    except FileNotFoundError:
        print(f"Error: Data file not found at {data_file}")
        return
    except json.JSONDecodeError:
        print("Error: Failed to parse JSON data.")
        return

    # 发送请求
    for i in range(1):
        ref = f"ITTEST{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}{i}"
        payload['package']['shipper_reference_id'] = ref
        payload['package']['order_number'] = f"ITTEST{datetime.datetime.now().strftime('%m%d%H%M%S')}{i}"

        url = f"{service_url}/package/booking"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        time_start = time.time()
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        time_end = time.time()
        print('下单耗时：', round(time_end - time_start, 2), 's')

        if "201001" in response.text:
            try:
                pdf_url = response.json()['data']['label']
                pdf_response = requests.get(pdf_url)

                if pdf_response.status_code == 200:
                    output_dir = r"D:\pdf"
                    os.makedirs(output_dir, exist_ok=True)
                    filepath = os.path.join(output_dir, f"{ref}.pdf")

                    with open(filepath, 'wb') as f:
                        f.write(pdf_response.content)
                    print(f"{ref} 面单下载成功: {pdf_url}")
                else:
                    print(f"PDF 下载失败，HTTP 状态码: {pdf_response.status_code}")
            except requests.exceptions.RequestException as e:
                print(f"网络错误: {e}")
            except KeyError:
                print("错误: 响应中未找到 'data.label' 字段")
        else:
            print(f"{ref} 下单失败: {response.text}")

if __name__ == "__main__":
    slug_test()