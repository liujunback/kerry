import requests
import pdfplumber
import io
import json

def create_package_and_check_address(api_url: str, token: str, payload: dict, address_to_check: str) -> bool:
    """
    调用创建包裹接口，获取 label URL，下载 PDF 并校验地址是否存在。

    Args:
        api_url: 接口地址，例如 https://spider.kec-app.com/package/booking
        token: Bearer token
        payload: 请求体字典（完整的数据）
        address_to_check: 需要校验的地址字符串

    Returns:
        bool: 地址存在于 PDF 中返回 True，否则 False
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    try:
        # 1. 发送请求创建包裹
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        resp_json = response.json()
        # 2. 检查业务返回码
        if resp_json.get("response_code") != 201001:
            print(f"接口返回错误: {resp_json.get('message')}")
            return False
        else:
            print(resp_json.get("data")["tracking_number"])
        # 3. 获取 label URL
        label_url = resp_json.get("data", {}).get("label")
        if not label_url:
            print("响应中未找到 label URL")
            return False

        print(f"获取到 label URL: {label_url}")

        # 4. 下载 PDF 并校验地址
        return check_address_in_pdf(label_url, address_to_check)

    except requests.exceptions.RequestException as e:
        print(f"请求失败: {e}")
        return False
    except Exception as e:
        print(f"处理异常: {e}")
        return False


def check_address_in_pdf(pdf_url: str, target_address: str) -> bool:
    """
    下载 PDF 并检查目标地址是否出现在文本内容中。
    """
    try:
        # 下载 PDF
        resp = requests.get(pdf_url, timeout=30)
        resp.raise_for_status()

        # 使用 pdfplumber 解析文本
        with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                # print(page_text)
                if page_text and target_address in page_text:
                    return True
        return False

    except requests.exceptions.RequestException as e:
        print(f"PDF 下载失败: {e}")
        return False
    except Exception as e:
        print(f"PDF 解析失败: {e}")
        return False
import datetime
import random
import json
import requests
import pdfplumber
import io

def generate_order_number() -> str:
    """生成随机订单号，格式：KECTH + 年月日时分秒 + 随机数(1-300)"""
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    rand_part = random.randint(1, 300)
    return f"KECTH{timestamp}{rand_part}"

def generate_shipper_reference_id() -> str:
    """生成随机 shipper_reference_id，格式：ITTEST + 年月日时分秒 + 随机数(1-300)"""
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    rand_part = random.randint(1, 300)
    return f"ITTEST{timestamp}{rand_part}"


# ==================== 使用示例 ====================
if __name__ == "__main__":
    for i in range(10):
        API_URL = "https://spider.kec-app.com/package/booking"
        TOKEN = "e0J7AjwuDEsNb2sJxTgEZq4cQPXvlyMyL7v8nk4m3vfmgrJk1KKuDl91zfKr"
        # 你提供的完整请求体（注意里面包含 unicode 转义，实际使用时应是原始中文字符串）
        # 这里为了简洁，直接复制你给出的 JSON 字符串并解析
        payload_str = '''
        {
            "shipper": {
                "house_number": "",
                "address1": "北京市朝阳区酒仙桥东路",
                "address2": "",
                "province": "-",
                "city": "北京",
                "district": "-",
                "sub_district": "-",
                "country_code": "CN",
                "email": "",
                "location_id": "",
                "name": "燕文",
                "tax_number": "",
                "company_name": "北京燕文物流股份有限公司",
                "phone": "010-64656790",
                "postcode": "100015",
                "ioss_number": "",
                "ioss_number_country": "",
                "tax_number_type": "",
                "tax_number_country": "",
                "id_card_number": "",
                "id_card_number_type": "",
                "pickup_at": "",
                "pickup_cutoff_at": ""
            },
            "consignee": {
                "house_number": "",
                "address1": "test123123",
                "address2": "",
                "province": "Bangkok",
                "city": "Koh Kaew",
                "district": "-",
                "sub_district": "-",
                "country_code": "TH",
                "email": "mjoneilluk@yahoo.co.uk",
                "location_id": "1231231",
                "name": "Michael John O Neill",
                "tax_number": "0000000",
                "company_name": "Michael John O Neill",
                "phone": "111111111111111111111111111",
                "postcode": "10110",
                "tax_number_type": "",
                "tax_number_country": "CN",
                "id_card_number": "12001",
                "id_card_number_type": "id_card",
                "idcard_name": "12001",
                "idcard_address": "12002",
                "idcard_province": "12003",
                "idcard_city": "12004",
                "idcard_district": "12005",
                "idcard_post_code": "12006"
            },
            "package": {
                "actual_weight": "0.298",
                "estimate_weight": "0.298",
                "weight_unit": "kg",
                "cod_value": "0.00",
                "cod_value_currency": "THB",
                "declared_value": "10.00",
                "declared_value_currency": "THB",
                "dimension_height": "12.000",
                "dimension_length": "100.000",
                "dimension_width": "12.000",
                "dimension_unit": "cm",
                "item_quantity": "1",
                "order_number": "ITTEST20260402002",
                "shipper_reference_id": "ITTEST20260402002",
                "payment_method": "PP",
                "number_of_package": "1",
                "shipment_term": "DDP",
                "insurance_value": "0.00",
                "insurance_currency": "",
                "insurance_type": "",
                "shipping_fee": "0.00",
                "cargo_value": "",
                "package_type": "WPX",
                "is_high_value": "",
                "poa_token": "",
                "reason_of_export": "",
                "excc_declared_value": "10.00000",
                "excc_declared_value_currency": "THB"
            },
            "reference": {
                "track_require": false,
                "delivery_method": "to_door",
                "user_uuid": "times-oms",
                "provider_info": {
                    "fixed_shipper_name": "",
                    "label_show_shipper": "N",
                    "action_code": "U",
                    "label_type": "",
                    "is_enable_insurance_service": "",
                    "fixed_shipper_district": "",
                    "fixed_shipper_postcode": "",
                    "company_slug": "kerryth",
                    "company_account": "KIKEC",
                    "is_local_shipment": "no",
                    "tracking_number": "true",
                    "service_code": "AUTO",
                    "cod_type": "CASH",
                    "company_token": "c2094d39-0e7f-40a8-9816-469d9cb3e9e2",
                    "is_show_item": "N",
                    "is_skip_declaredValue_verify": "N",
                    "show_cod": "true",
                    "show_fob": "true",
                    "fixed_shipper_phone": "",
                    "fixed_shipper_country_code": "",
                    "cs_info": "",
                    "fixed_shipper_address1": "",
                    "fixed_shipper_city": "",
                    "fixed_shipper_address2": "",
                    "fixed_shipper_province": ""
                },
                "extra_response_info": "-",
                "sort_code": "TH-TEST",
                "client_code": "999666",
                "client_name": "BackTest1",
                "ori_pickup_no": "",
                "sale_platform": "shopee",
                "service": {
                    "service_type": "default"
                },
                "origin_consignee": {
                    "house_number": "",
                    "address1": "",
                    "address2": "",
                    "province": "",
                    "city": "",
                    "district": "",
                    "sub_district": "",
                    "country_code": "",
                    "email": "",
                    "location_id": "",
                    "name": "",
                    "tax_number": "",
                    "company_name": "",
                    "phone": "",
                    "postcode": "",
                    "tax_number_type": "",
                    "tax_number_country": "",
                    "id_card_number": "",
                    "id_card_number_type": "",
                    "idcard_name": "",
                    "idcard_address": "",
                    "idcard_province": "",
                    "idcard_city": "",
                    "idcard_district": "",
                    "idcard_post_code": ""
                }
            },
            "items": [
                {
                    "category_id": "",
                    "category_name": "",
                    "brand": "",
                    "model": "",
                    "description": "Plastic bracket",
                    "name": "Plastic bracket",
                    "description_origin_language": "塑料支架",
                    "platform_id": "-",
                    "platform_name": "-",
                    "quantity": "2",
                    "sku": "",
                    "unit_price": "10.00",
                    "currency": "THB",
                    "weight_unit": "kg",
                    "single_weight": "1.000",
                    "dimension_height": "",
                    "dimension_length": "",
                    "dimension_width": "",
                    "sale_platform_url": "",
                    "dimension_unit": "cm",
                    "manufacture_country_code": "",
                    "manufacture_country_name": "",
                    "original_tracking_number": "",
                    "description_destination_language": "",
                    "battery_type": "",
                    "number_of_batteries": "",
                    "platform_product_id": "",
                    "excc_unit_price": "10.00000",
                    "excc_currency": "THB",
                    "excc_hs_code": "10",
                    "measure_unit": "",
                    "measure_unit_value": "",
                    "hts_code": ""
                }
            ]
        }
        '''
        payload = json.loads(payload_str)
        timestamp = datetime.datetime.now().strftime('%Y%m%d%S')
        reference_number = f"ITTEST{timestamp}{random.randint(1, 300)}"
        # 设定要校验的地址：例如使用 consignee 中的 address1
        address_to_check = payload["consignee"]["address1"]  # 这里为 "test123123"
        print(f"需要校验的地址: {address_to_check}")
        payload["package"]["order_number"] = reference_number  # 这里为 "test123123"
        payload["package"]["shipper_reference_id"] = reference_number  #
        # 调用主流程
        result = create_package_and_check_address(API_URL, TOKEN, payload, address_to_check)

        if result:
            print("✅ 地址校验通过：存在于 PDF 中")
        else:
            print("❌ 地址校验失败：不存在于 PDF 中或处理出错")