
import unittest



from TWMS.properties.GetProperties import getProperties
from TWMS.public.Asn_Confirm import select_asn_id, asn_confirm
from TWMS.public.TWMS_Inventory import inventory

from TWMS.public.TWMS_Login import Twms_login
from TWMS.public.api.create_asn_api import api_create_asn
from TWMS.public.api.create_order_api import create_order_api
from TWMS.public.api.create_sku_api import api_create_sku
from TWMS.public.Asn_receive import asn_receive
from TWMS.public.Select_Order_id import Select_Order_Id

import unittest


class MyTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """在所有测试开始前执行的设置"""
        company = "test"
        cls.shared_data = {}
        cls.sku_list = [{'sku': 'SKU202509031144011979', 'sku_barcodes': 'SKU202509031144011979'}]  # 类级别的SKU列表，所有测试方法共享
        cls.properties = getProperties(company)

    def setUp(self):
        """在每个测试方法执行前的设置"""
        self.twms_login = Twms_login(self.properties)
        # 如果需要实例级别的SKU列表，可以在这里初始化
        # self.sku_list = []
    #
    # def test_00_create_sku(self):
    #     """测试创建SKU"""
    #     # 使用类属性来存储SKU数据，确保所有测试方法都能访问
    #     sku_data = api_create_sku(self.properties)
    #     self.assertIsNotNone(sku_data, "SKU创建失败")
    #     self.assertIn('sku', sku_data, "SKU数据缺少sku字段")
    #     self.assertIn('sku_barcodes', sku_data, "SKU数据缺少sku_barcodes字段")
    #
    #     # 添加到类属性列表
    #     MyTestCase.sku_list.append(sku_data)
    #     print(f"创建的SKU: {sku_data}")
    #
    # def test_01_create_asn(self):
    #     """测试创建ASN"""
    #     # 检查是否有SKU数据可用
    #     self.assertTrue(len(MyTestCase.sku_list) > 0, "没有可用的SKU数据，请先运行test_00_create_sku")
    #
    #     # 执行创建ASN的操作
    #     asn_data = api_create_asn(self.properties, MyTestCase.sku_list)
    #
    #     # 验证ASN数据
    #     self.assertIsNotNone(asn_data, "ASN创建失败")
    #     self.assertIn('asn_number', asn_data, "ASN数据缺少asn_number字段")
    #     self.assertIn('items', asn_data, "ASN数据缺少items字段")
    #     self.assertTrue(len(asn_data['items']) > 0, "ASN中没有包含任何物品")
    #
    #     # 验证ASN中的SKU和数量是否与创建的SKU匹配
    #     for i, item in enumerate(asn_data['items']):
    #         self.assertEqual(item['code'], MyTestCase.sku_list[i]['sku'],
    #                          f"ASN中第{i}个SKU代码不匹配")
    #         self.assertEqual(item['barcode'], MyTestCase.sku_list[i]['sku_barcodes'],
    #                          f"ASN中第{i}个SKU条形码不匹配")
    #
    #     print(f"创建的ASN: {asn_data}")
    #
    #     # 将值存储到类属性中
    #     MyTestCase.shared_data['asn_data'] = asn_data
    #
    #
    #
    # def test_02_receive_asn(self):
    #     """测试收货ASN"""
    #     # 从类属性中获取值
    #     asn_data = MyTestCase.shared_data.get('asn_data')
    #     asn_receive(self.properties, self.twms_login, asn_data)
    #     print("收货成功："+ asn_data['asn_number'])
    #     # 断言收货成功
    #     self.assertIsNotNone(asn_data)
    #
    # def test_03_confirm_asn(self):
    #     """测试确认ASN"""
    #     # 从类属性中获取值
    #     asn_data = MyTestCase.shared_data.get('asn_data')
    #     asn_confirm(self.properties, self.twms_login, asn_data)
    #     print("收货确认成功：" + asn_data['asn_number'])
    #     # 断言确认成功
    #     self.assertIsNotNone(asn_data)
    # #
    # def test_04_inventory(self):
    #     asn_data = MyTestCase.shared_data.get('asn_data')
    #     # asn_data = {'asn_number': 'ASN202509011512294562', 'items': [{'code': 'SKU202509011454282929', 'barcode': 'SKU202509011454282929', 'unit_price': 5, 'currency': 'HKD', 'qty': 10, 'po_number': 'PO20250901151229'},{'code': 'SKU202508281755598040', 'barcode': 'SKU202508281755598040', 'unit_price': 5, 'currency': 'HKD', 'qty': 1, 'po_number': 'PO20250901151229'}]}
    #     inventory_data = inventory(self.properties, self.twms_login, asn_data)
    #     # print(inventory_data)
    #     inventory_result = inventory(
    #         self.properties,
    #         self.twms_login,  # 假设Twms_login有这个方法返回登录信息
    #         asn_data
    #     )
    #
    #     self.assertTrue(inventory_result['success'],
    #                     f"库存核对失败: {inventory_result.get('message', '未知错误')}")
    #
    #     # 打印库存核对详情
    #     print("库存核对结果:")
    #     for sku, detail in inventory_result['details'].items():
    #         print(f"  SKU {sku}: {detail['status']} - {detail['message']}")

    def test_05_create_order(self):
        order_data = create_order_api(self.properties, self.sku_list)
        # print(order_data)
        order_number = "BACKOR202509031144113507"
        order_id = Select_Order_Id(self.properties,  self.twms_login,order_number)




























    # def test_case_order_create(self):
    #
    #
    #     #
    #     #
    #     # sku_data = sku_list.append(api_create_sku(properties))
    #     sku_data = [{"sku":"SKU202508281755598040",
    #                     "sku_barcodes":"SKU202508281755598040"},{"sku": "SKU202509011010473378","sku_barcodes": "SKU202509011010473378"}]
    #
    #
    #     asn_receive(self.properties, self.twms_login, asn_data)
    #
    #     asn_confirm(self.properties,self.twms_login,asn_data)
        # order_number = create_order_api(properties,[sku_data["sku"]])






if __name__ == '__main__':
    unittest.main()