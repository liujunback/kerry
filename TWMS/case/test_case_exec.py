import unittest
import json
import requests
from datetime import datetime


class TWMSApiTest(unittest.TestCase):
    """TWMS API 测试用例"""

    # 基础配置
    BASE_URL = "https://stg-twms.kec-app.com"  # 请替换为实际域名
    HEADERS = {"Content-Type": "application/json"}

    def setUp(self):
        """测试前置设置"""
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)

    def tearDown(self):
        """测试后置清理"""
        self.session.close()

    # ==================== SKU 模块测试用例 ====================

    def test_sku_001_normal_create_sku(self):
        """正常创建SKU"""
        url = f"{self.BASE_URL}/api/sku"

        # 生成随机SKU编码
        import random
        import string
        random_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        random_barcode = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))

        payload = {
            "sku_list": [{
                "client_code": "TEST-PY",
                "code": random_code,
                "barcodes": [random_barcode],
                "name": "Strepsils使立消橙味維他命C喉糖 24粒",
                "model": "TEST TORI",
                "description": "Strepsils使立消橙味維他命C喉糖 24粒",
                "origin_country": "TH",
                "declare_name": "Strepsils使立消橙味維他命C喉糖 24粒",
                "queue_order": "FIFO",
                "is_fragile": "N",
                "sku_images": [{
                    "url": "https://stg.hk.timeswms.com/storage/sku/5265df844a9e452d834ed5bc27d1818a8b62121195bdefc6e58d3ff219b08cb4.jpg",
                    "extension": ".jpg"
                }],
                "is_batch_required": "N",
                "is_expire_date_required": "N",
                "is_manufacture_date_required": "N",
                "is_udf1_required": "N",
                "is_udf2_required": "N",
                "is_udf3_required": "N",
                "is_packing_material": "N",
                "packingMaterialType": "test",
                "temperature_control_factor": "room_temperature",
                "is_serial_number_required": "N",
                "validate_serial_number_by": "FORMAT",
                "capture_serial_number_in": "INBOUND_AND_PACK",
                "validate_serial_number_in": "INBOUND_AND_PACK",
                "serial_number_formats": [{
                    "serial_number_format": "XXXXXXXXXXX"
                }],
                "length": "12",
                "width": "12",
                "height": "12",
                "weight": "0.79",
                "currency": "HKD",
                "declare_price": 100.9,
                "color": "TEST1",
                "size": "TEST2",
                "line": "TEST3",
                "storage_unit": [{
                    "unit_level": "3",
                    "qty_of_previous_level": "2",
                    "barcode": f"{random_code}-04"
                }, {
                    "unit_level": "2",
                    "qty_of_previous_level": "3",
                    "barcode": f"{random_code}-07"
                }]
            }]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        self.assertEqual(response.status_code, 201)
        response_data = response.json()
        self.assertEqual(response_data.get("message"), "success")

        # 保存创建的SKU编码供后续测试使用
        if hasattr(self, 'created_skus'):
            self.created_skus.append(random_code)
        else:
            self.created_skus = [random_code]

    def test_sku_002_create_existing_sku(self):
        """创建已存在的SKU"""
        url = f"{self.BASE_URL}/api/sku"

        # 使用已存在的SKU编码（假设已存在）
        existing_sku_code = "TRSKU2025092501"

        payload = {
            "sku_list": [{
                "client_code": "TEST-PY",
                "code": existing_sku_code,
                "barcodes": [existing_sku_code],
                "name": "Strepsils使立消橙味維他命C喉糖 24粒",
                "model": "TEST TORI",
                "description": "Strepsils使立消橙味維他命C喉糖 24粒",
                "origin_country": "TH",
                "declare_name": "Strepsils使立消橙味維他命C喉糖 24粒",
                "queue_order": "FIFO",
                "is_fragile": "N",
                "sku_images": [{
                    "url": "https://stg.hk.timeswms.com/storage/sku/5265df844a9e452d834ed5bc27d1818a8b62121195bdefc6e58d3ff219b08cb4.jpg",
                    "extension": ".jpg"
                }],
                # ... 其他字段与test_sku_001相同
                "is_batch_required": "N",
                "is_expire_date_required": "N",
                "is_manufacture_date_required": "N",
                "is_udf1_required": "N",
                "is_udf2_required": "N",
                "is_udf3_required": "N",
                "is_packing_material": "N",
                "packingMaterialType": "test",
                "temperature_control_factor": "room_temperature",
                "is_serial_number_required": "N",
                "validate_serial_number_by": "FORMAT",
                "capture_serial_number_in": "INBOUND_AND_PACK",
                "validate_serial_number_in": "INBOUND_AND_PACK",
                "serial_number_formats": [{
                    "serial_number_format": "XXXXXXXXXXX"
                }],
                "length": "12",
                "width": "12",
                "height": "12",
                "weight": "0.79",
                "currency": "HKD",
                "declare_price": 100.9,
                "color": "TEST1",
                "size": "TEST2",
                "line": "TEST3",
                "storage_unit": [{
                    "unit_level": "3",
                    "qty_of_previous_level": "2",
                    "barcode": f"{existing_sku_code}-04"
                }, {
                    "unit_level": "2",
                    "qty_of_previous_level": "3",
                    "barcode": f"{existing_sku_code}-07"
                }]
            }]
        }
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 2uU0bOqwHfAOW7yrkE2wLPzbIWeaLgltCCwt8ILLM843d55McSaUskghMF55'
        }
        response = self.session.post(url, json=payload,headers=headers)
        # 验证响应
        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertEqual(response_data.get("message"), "failed")

    # ==================== ASN 模块测试用例 ====================

    def test_asn_001_normal_create_asn(self):
        """正常创建ASN"""
        url = f"{self.BASE_URL}/api/asn"

        # 生成随机ASN编号
        import random
        import string
        random_asn = f"ASNQH{''.join(random.choices(string.digits, k=11))}"
        current_date = datetime.now().strftime("%Y-%m-%d")

        payload = {
            "centre_code": "ITTEST",
            "client_code": "TEST-PY",
            "asn_number": random_asn,
            "is_require_piece_scan": 0,
            "asn_date": current_date,
            "eta_at": current_date,
            "is_return_asn": "N",
            "remarks": "remarks",
            "items": [{
                "code": "TRS2025092501",
                "unit_price": 5,
                "currency": "HKD",
                "qty": 100,
                "po_number": "2025-06-11",
                "lot_no": "CN",
                "line_item_id": "67568321"
            }]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        self.assertEqual(response.status_code, 201)
        response_data = response.json()
        self.assertEqual(response_data.get("message"), "success")

        # 保存创建的ASN编号供后续测试使用
        if hasattr(self, 'created_asns'):
            self.created_asns.append(random_asn)
        else:
            self.created_asns = [random_asn]

    def test_asn_002_create_existing_asn(self):
        """创建已存在的ASN"""
        url = f"{self.BASE_URL}/api/asn"

        # 使用已存在的ASN编号
        existing_asn = "ASNQH00020250925001"
        current_date = datetime.now().strftime("%Y-%m-%d")

        payload = {
            "centre_code": "ITTEST",
            "client_code": "TEST-PY",
            "asn_number": existing_asn,
            "is_require_piece_scan": 0,
            "asn_date": current_date,
            "eta_at": current_date,
            "is_return_asn": "N",
            "remarks": "remarks",
            "items": [{
                "code": "TRS2025092501",
                "unit_price": 5,
                "currency": "HKD",
                "qty": 100,
                "po_number": "2025-06-11",
                "lot_no": "CN",
                "line_item_id": "67568321"
            }]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertEqual(response_data.get("message"), "failed")

    def test_asn_003_create_asn_with_nonexistent_sku(self):
        """创建ASN，SKU不存在或不属于该客户"""
        url = f"{self.BASE_URL}/api/asn"

        import random
        import string
        random_asn = f"ASNQH{''.join(random.choices(string.digits, k=11))}"
        current_date = datetime.now().strftime("%Y-%m-%d")

        payload = {
            "centre_code": "ITTEST",
            "client_code": "TEST-PY",
            "asn_number": random_asn,
            "is_require_piece_scan": 0,
            "asn_date": current_date,
            "eta_at": current_date,
            "is_return_asn": "N",
            "remarks": "remarks",
            "items": [{
                "code": "123423",  # 不存在的SKU
                "unit_price": 5,
                "currency": "HKD",
                "qty": 100,
                "po_number": "2025-06-11",
                "lot_no": "CN",
                "line_item_id": "67568321"
            }]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        self.assertEqual(response.status_code, 404)
        response_data = response.json()
        self.assertIn("Not found SKU", response_data.get("message", ""))

    # ==================== 收货模块测试用例 ====================

    def test_receive_001_normal_receive(self):
        """正常收货"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/batch_submit"

        payload = {
            "asn_number": "ASN001",
            "po_number": "124345",
            "location": "TEST0341",
            "qty": "10",
            "barcode": "TEST01",
            "condition": "GOOD"
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        # 注意：这里需要根据实际接口响应调整验证逻辑
        response_data = response.json()
        # 假设成功响应包含status=0
        self.assertEqual(response_data.get("status"), 0)

    def test_receive_002_location_not_belong_to_warehouse(self):
        """货位不属于仓库"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/batch_submit"

        payload = {
            "asn_number": "ASN001",
            "po_number": "124345",
            "location": "001",  # 不存在的货位
            "qty": "10",
            "barcode": "TEST01"
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        response_data = response.json()
        self.assertIn("Location [bin] not exist or centre not match", response_data.get("message", ""))

    def test_receive_003_quantity_exceeds_demand(self):
        """数量大于需求数量"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/batch_submit"

        payload = {
            "asn_number": "ASN001",
            "po_number": "124345",
            "location": "TEST0341",
            "qty": "20",  # 大于需求数量
            "barcode": "TEST01"
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        response_data = response.json()
        self.assertEqual(response_data.get("status"), 1)
        self.assertIn("過多", response_data.get("message", ""))

    def test_receive_004_location_condition_mismatch(self):
        """正常收货，货位属性和condition不匹配，收货失败"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/batch_submit"

        payload = {
            "asn_number": "ASN001",
            "po_number": "124345",
            "location": "TEST0001",  # 临时/损坏货位
            "qty": "10",
            "barcode": "TEST01",
            "condition": "GOOD"
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        response_data = response.json()
        self.assertEqual(response_data.get("status"), 1)
        self.assertIn("Bin type is Temporary/Damaged", response_data.get("message", ""))

    def test_receive_005_asn_not_exist(self):
        """ASN不存在，收货失败"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/batch_submit"

        payload = {
            "asn_number": "ASN002",  # 不存在的ASN
            "po_number": "124345",
            "location": "TEST0341",
            "qty": "10",
            "barcode": "TEST01",
            "condition": "GOOD"
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        response_data = response.json()
        self.assertIn("ASN Number [ASN002] not found", response_data.get("message", ""))

    def test_receive_006_sku_not_belong_to_asn(self):
        """ASN存在，扫描的商品不属于该ASN，收货失败"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/batch_submit"

        payload = {
            "asn_number": "ASN001",
            "po_number": "124345",
            "location": "TEST0341",
            "qty": "10",
            "barcode": "TEST03",  # 不属于该ASN的SKU
            "condition": "GOOD"
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        response_data = response.json()
        self.assertIn("SKU [TEST03] Not found", response_data.get("message", ""))

    # ==================== 批量收货测试用例 ====================

    def test_batch_receive_001_normal_batch_receive(self):
        """正常批量收货"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/batch_submit"

        # 批量收货可能需要不同的数据结构，这里使用与普通收货相同的结构
        payload = {
            "asn_number": "ASN001",
            "po_number": "124345",
            "location": "TEST0341",
            "qty": "10",
            "barcode": "TEST01",
            "condition": "GOOD"
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        response_data = response.json()
        self.assertEqual(response_data.get("status"), 0)

    # 批量收货的其他测试用例与普通收货类似，这里省略...

    # ==================== 序列号收货测试用例 ====================

    def test_sn_receive_001_normal_serial_number_receive(self):
        """正常序列号收货"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/submit"

        payload = {
            "asn_number": "ASN001",
            "po_number": "124345",
            "location": "TEST0341",
            "qty": "2",
            "barcode": "TEST01",
            "condition": "GOOD",
            "serial_number": ["TEST0089901", "TEGSYY001"]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        # 注意：这里需要根据实际接口响应调整验证逻辑
        response_data = response.json()
        # 假设成功响应
        self.assertEqual(response_data.get("status"), 0)

    def test_sn_receive_002_serial_number_already_exists(self):
        """SN存在，ASN收货失败"""
        url = f"{self.BASE_URL}/opt/asn/receive/ajax/submit"

        payload = {
            "asn_number": "ASN001",
            "po_number": "124345",
            "location": "TEST0341",
            "qty": "2",
            "barcode": "TEST01",
            "condition": "GOOD",
            "serial_number": ["TEST00234111", "TEGSYY001"]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        response_data = response.json()
        self.assertEqual(response_data.get("status"), 1)
        self.assertFalse(response_data.get("keep_input", True))

    # ==================== 订单创建测试用例 ====================

    def test_order_001_normal_create_order(self):
        """正常创建订单"""
        url = f"{self.BASE_URL}/api/order"

        # 生成随机订单号
        import random
        import string
        random_order = f"TEST{''.join(random.choices(string.digits, k=7))}"

        payload = {
            "centre_code": "QT",
            "client_code": "QTST",
            "real_time_response": False,
            "created_at": "2025-06-25",
            "trade_mode": "B2B2C",
            "order_brand": "TEST617",
            "order_type": "B2B",
            "sale_platform_create_at": "2025-06-25 09:00:07",
            "foms_create_at": "2025-06-25 09:00:07",
            "estimated_outbound_date": "2025-07-03 17:09:23",
            "logistics_provider": {
                "code": "SELFPICK"
            },
            "package": {
                "order_number": random_order,
                "declared_value": 10,
                "declared_value_currency": "HKD",
                "height": 50,
                "length": 10,
                "width": 25,
                "is_block": "",
                "actual_weight": 544,
                "shipment_term": "DDP",
                "payment_method": "PP",
                "remarks": "TEST THYL"
            },
            "sender": {
                "name": "IT Support Team",
                "company": "TIMES-TEC",
                "address": "Hong Kong Xi Jiu Long A-001",
                "city": "Hong Kong",
                "province": "Hong Kong",
                "country_code": "HK",
                "post_code": "123456",
                "phone": "+85215811123456",
                "email": "Test@163.com",
                "district": "yutj"
            },
            "receiver": {
                "name": "JOEY TEST",
                "company": "JOEY CHAN",
                "address": "香港特别行政区油尖旺区尖沙咀金马伦道22-24号东丽中心",
                "city": "HK",
                "province": "NE",
                "country_code": "TH",
                "post_code": "21000",
                "phone": "7717698000",
                "email": "juan@gmail.com",
                "selfpick_store_1": "易碎",
                "district": "987yutj",
                "hs_code": "888888888888"
            },
            "items": [{
                "sku": "TRQHTS2025081803",
                "description": "YUGundam Barbatos Lupus Model87812",
                "category": "shoe",
                "unit_price": 10,
                "currency": "HKD",
                "qty": 2,
                "country_of_origin": "US",
                "hs_code": "68964335",
                "condition": "GOOD"
            }]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        self.assertEqual(response.status_code, 201)
        response_data = response.json()
        self.assertEqual(response_data.get("message"), "success")

    def test_order_002_create_existing_order(self):
        """创建已存在的订单"""
        url = f"{self.BASE_URL}/api/order"

        # 使用已存在的订单号
        existing_order = "SAM257081802"

        payload = {
            "centre_code": "QT",
            "client_code": "QTST",
            "real_time_response": False,
            "created_at": "2025-06-25",
            "trade_mode": "B2B2C",
            "order_brand": "TEST617",
            "order_type": "B2B",
            "sale_platform_create_at": "2025-06-25 09:00:07",
            "foms_create_at": "2025-06-25 09:00:07",
            "estimated_outbound_date": "2025-07-03 17:09:23",
            "logistics_provider": {
                "code": "SELFPICK"
            },
            "package": {
                "order_number": existing_order,
                "declared_value": 10,
                "declared_value_currency": "HKD",
                "height": 50,
                "length": 10,
                "width": 25,
                "is_block": "",
                "actual_weight": 544,
                "shipment_term": "DDP",
                "payment_method": "PP",
                "remarks": "TEST THYL"
            },
            # ... 其他字段与test_order_001相同
            "sender": {
                "name": "IT Support Team",
                "company": "TIMES-TEC",
                "address": "Hong Kong Xi Jiu Long A-001",
                "city": "Hong Kong",
                "province": "Hong Kong",
                "country_code": "HK",
                "post_code": "123456",
                "phone": "+85215811123456",
                "email": "Test@163.com",
                "district": "yutj"
            },
            "receiver": {
                "name": "JOEY TEST",
                "company": "JOEY CHAN",
                "address": "香港特别行政区油尖旺区尖沙咀金马伦道22-24号东丽中心",
                "city": "HK",
                "province": "NE",
                "country_code": "TH",
                "post_code": "21000",
                "phone": "7717698000",
                "email": "juan@gmail.com",
                "selfpick_store_1": "易碎",
                "district": "987yutj",
                "hs_code": "888888888888"
            },
            "items": [{
                "sku": "TRQHTS2025081803",
                "description": "YUGundam Barbatos Lupus Model87812",
                "category": "shoe",
                "unit_price": 10,
                "currency": "HKD",
                "qty": 2,
                "country_of_origin": "US",
                "hs_code": "68964335",
                "condition": "GOOD"
            }]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        self.assertEqual(response.status_code, 403)
        response_data = response.json()
        self.assertEqual(response_data.get("message"), "Same order number of same client already exists!")

    def test_order_005_logistics_provider_not_bound_to_client(self):
        """物流渠道代码未绑定客户"""
        url = f"{self.BASE_URL}/api/order"

        import random
        import string
        random_order = f"TEST{''.join(random.choices(string.digits, k=7))}"

        payload = {
            "centre_code": "QT",
            "client_code": "QTST",
            "real_time_response": False,
            "created_at": "2025-06-25",
            "trade_mode": "B2B2C",
            "order_brand": "TEST617",
            "order_type": "B2B",
            "sale_platform_create_at": "2025-06-25 09:00:07",
            "foms_create_at": "2025-06-25 09:00:07",
            "estimated_outbound_date": "2025-07-03 17:09:23",
            "logistics_provider": {
                "code": "SHUNYOU"  # 未绑定给客户的物流渠道
            },
            "package": {
                "order_number": random_order,
                "declared_value": 10,
                "declared_value_currency": "HKD",
                "height": 50,
                "length": 10,
                "width": 25,
                "is_block": "",
                "actual_weight": 544,
                "shipment_term": "DDP",
                "payment_method": "PP",
                "remarks": "TEST THYL"
            },
            "sender": {
                "name": "IT Support Team",
                "company": "TIMES-TEC",
                "address": "Hong Kong Xi Jiu Long A-001",
                "city": "Hong Kong",
                "province": "Hong Kong",
                "country_code": "HK",
                "post_code": "123456",
                "phone": "+85215811123456",
                "email": "Test@163.com",
                "district": "yutj"
            },
            "receiver": {
                "name": "JOEY TEST",
                "company": "JOEY CHAN",
                "address": "香港特别行政区油尖旺区尖沙咀金马伦道22-24号东丽中心",
                "city": "HK",
                "province": "NE",
                "country_code": "TH",
                "post_code": "21000",
                "phone": "7717698000",
                "email": "juan@gmail.com",
                "selfpick_store_1": "易碎",
                "district": "987yutj",
                "hs_code": "888888888888"
            },
            "items": [{
                "sku": "TRQHTS2025081803",
                "description": "YUGundam Barbatos Lupus Model87812",
                "category": "shoe",
                "unit_price": 10,
                "currency": "HKD",
                "qty": 2,
                "country_of_origin": "US",
                "hs_code": "68964335",
                "condition": "GOOD"
            }]
        }

        response = self.session.post(url, json=payload)

        # 验证响应
        self.assertEqual(response.status_code, 403)
        response_data = response.json()
        self.assertIn("The Logistics Provider [SHUNYOU] cannot be selected by Client", response_data.get("message", ""))


if __name__ == "__main__":
    unittest.main()