import datetime
import json
import requests


def select_order_id(properties, login_data, order_number):
    """优化版订单查询函数"""
    # 基础URL配置
    base_url = properties["TWMS_URL"].rstrip('/') + "/opt/order/ajax/list"

    # 动态参数配置（避免硬编码）
    params = {
            "draw": "2",
            "columns[0][data]": "selection",
            "columns[0][searchable]": "false",
            "columns[0][orderable]": "false",
            "columns[0][search][regex]": "false",
            "columns[1][data]": "id",
            "columns[1][searchable]": "true",
            "columns[1][orderable]": "true",
            "columns[1][search][regex]": "false",
            "columns[2][data]": "centre_name",
            "columns[2][searchable]": "true",
            "columns[2][orderable]": "false",
            "columns[2][search][regex]": "false",
            "columns[3][data]": "client_company_name",
            "columns[3][name]": "client_company_name",
            "columns[3][searchable]": "true",
            "columns[3][orderable]": "false",
            "columns[3][search][regex]": "false",
            "columns[4][data]": "logistics_provider.name",
            "columns[4][name]": "logisticsProvider.name",
            "columns[4][searchable]": "true",
            "columns[4][orderable]": "false",
            "columns[4][search][regex]": "false",
            "columns[5][data]": "logistic_provider_code",
            "columns[5][name]": "logistic_provider_code",
            "columns[5][searchable]": "true",
            "columns[5][orderable]": "false",
            "columns[5][search][regex]": "false",
            "columns[6][data]": "order_number",
            "columns[6][searchable]": "true",
            "columns[6][search][value]": order_number,
            "columns[6][search][regex]": "false",
            "columns[7][data]": "tracking_numbers",
            "columns[7][name]": "tracking_numbers",
            "columns[7][searchable]": "true",
            "columns[7][orderable]": "false",
            "columns[7][search][regex]": "false",
            "columns[8][data]": "shop_order_id",
            "columns[8][searchable]": "true",
            "columns[8][orderable]": "false",
            "columns[8][search][regex]": "false",
            "columns[9][data]": "upload_at",
            "columns[9][searchable]": "true",
            "columns[9][orderable]": "true",
            "columns[9][search][value]": "2025-08-28 00:00:00 - " + (datetime.datetime.now()).strftime('%Y-%m-%d %H:%M:%S'),
            "columns[9][search][regex]": "false",
            "columns[10][data]": "allocate_at",
            "columns[10][searchable]": "true",
            "columns[10][orderable]": "false",
            "columns[10][search][regex]": "false",
            "columns[11][data]": "wave_assign_at",
            "columns[11][name]": "wave_assign_at",
            "columns[11][searchable]": "true",
            "columns[11][orderable]": "false",
            "columns[11][search][regex]": "false",
            "columns[12][data]": "estimated_outbound_date",
            "columns[12][name]": "estimated_outbound_date",
            "columns[12][searchable]": "true"
        }



    # 请求头配置
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': 'XSRF-TOKEN='+login_data['cookies']['XSRF-TOKEN']+'; laravel_session='+login_data['cookies']['laravel_session']
    }

    try:
        # 使用params传参更安全可靠
        response = requests.get(base_url, headers=headers, params=params, timeout=10)
        response.raise_for_status()  # 自动处理HTTP错误

        # 统一解析响应
        result = response.json()

        # 增强错误处理
        if result.get('recordsTotal') == 0:
            print(f"未找到订单: {order_number}")
            return None

        # 支持多订单处理（根据业务需求选择首单或全部）
        orders = result['data']
        order_ids = [str(order['id']) for order in orders]

        # 打印详细信息（实际生产环境可改为日志）
        print(f"找到 {len(order_ids)} 个订单,订单ID: {', '.join(order_ids[:3])}...")

        return  {
            "order_number":order_number,
            "centre_id": int(json.loads(response.text)['data'][0]["centre_id"]),
            "client_id": int(json.loads(response.text)['data'][0]["client_id"]),
            "order_ids": [json.loads(response.text)['data'][0]["id"]],
            "pick_wave":json.loads(response.text)['data'][0]["pick_wave"]
        }

    except requests.exceptions.RequestException as e:
        print(f"请求失败: {str(e)}")
        return None
    except (KeyError, json.JSONDecodeError) as e:
        print(f"响应解析失败: {str(e)}")
        return None





