
import unittest
from time import sleep

from TWMS.properties.GetProperties import getProperties
from TWMS.public.Asn_Confirm import select_asn_id, asn_confirm
from TWMS.public.Order_Scan_To_Box import box_by_order, box_by_order_S, box_by_order_M_Multiple, \
    box_by_order_S_Multiple, box_by_order_tote
from TWMS.public.Order_Close_Box import close_box
from TWMS.public.Order_Handover import order_handover
from TWMS.public.Order_Create_Pick_Wave import create_pick_wave
from TWMS.public.Order_Pick_Add_Order import pick_add_order
from TWMS.public.Order_handover_pallet import order_handover_pallet
from TWMS.public.TWMS_Batch_Create_Pick_Wave import batch_create_pick_wave
from TWMS.public.TWMS_Inventory import inventory

from TWMS.public.TWMS_Login import Twms_login
from TWMS.public.api.create_asn_api import api_create_asn
from TWMS.public.api.create_order_api import create_order_api
from TWMS.public.api.create_sku_api import api_create_sku
from TWMS.public.Asn_receive import asn_receive
from TWMS.public.TWMS_Select_Order_id import select_order_id

import unittest
import os
os.environ["NO_PROXY"] = "stg-twms.kec-app.com"

class MyTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """在所有测试开始前执行的设置"""
        company = "test"
        cls.shared_data = {}
        cls.sku_list = [{'sku': 'SKU202509031144011979', 'sku_barcodes': 'SKU202509031144011979','sku_qty':2}]  # 类级别的SKU列表，所有测试方法共享{'sku': 'SKU202509031144011979', 'sku_barcodes': 'SKU202509031144011979','sku_qty':2}
        cls.properties = getProperties(company)
        # cls.twms_login = Twms_login(cls.properties)

    def setUp(self):
        """在每个测试方法执行前的设置"""
        self.twms_login = Twms_login(self.properties)
        # 如果需要实例级别的SKU列表，可以在这里初始化
        # self.sku_list = []


    def test_00_create_sku(self):
        """测试创建SKU"""
        print("测试创建SKU-----------------------------------------------------------")
        # 使用类属性来存储SKU数据，确保所有测试方法都能访问
        sku_data = api_create_sku(self.properties)
        self.assertIsNotNone(sku_data, "SKU创建失败")
        self.assertIn('sku', sku_data, "SKU数据缺少sku字段")
        self.assertIn('sku_barcodes', sku_data, "SKU数据缺少sku_barcodes字段")

        # 添加到类属性列表
        MyTestCase.sku_list.append(sku_data)
        print(f"创建的SKU: {sku_data['sku']}  Barcode:{sku_data['sku_barcodes']}")


    def test_01_create_asn(self):
        """测试创建ASN"""
        print("测试创建ASN-----------------------------------------------------------")
        # 检查是否有SKU数据可用
        self.assertTrue(len(MyTestCase.sku_list) > 0, "没有可用的SKU数据，请先运行test_00_create_sku")

        # 执行创建ASN的操作
        asn_data = api_create_asn(self.properties, MyTestCase.sku_list)

        # 验证ASN数据
        self.assertIsNotNone(asn_data, "ASN创建失败")
        self.assertIn('asn_number', asn_data, "ASN数据缺少asn_number字段")
        self.assertIn('items', asn_data, "ASN数据缺少items字段")
        self.assertTrue(len(asn_data['items']) > 0, "ASN中没有包含任何物品")

        # 验证ASN中的SKU和数量是否与创建的SKU匹配
        for i, item in enumerate(asn_data['items']):
            self.assertEqual(item['code'], MyTestCase.sku_list[i]['sku'],
                             f"ASN中第{i}个SKU代码不匹配")
            self.assertEqual(item['barcode'], MyTestCase.sku_list[i]['sku_barcodes'],
                             f"ASN中第{i}个SKU条形码不匹配")

        print(f"创建的ASN: {asn_data}")

        # 将值存储到类属性中
        MyTestCase.shared_data['asn_data'] = asn_data



    def test_02_receive_asn(self):
        """测试收货ASN"""
        print("测试收货ASN-----------------------------------------------------------")
        # 从类属性中获取值
        asn_data = MyTestCase.shared_data.get('asn_data')
        asn_receive(self.properties, self.twms_login, asn_data)
        print("收货成功："+ asn_data['asn_number'])
        # 断言收货成功
        self.assertIsNotNone(asn_data)


    def test_03_confirm_asn(self):
        """测试确认ASN"""
        print("测试确认ASN-----------------------------------------------------------")
        # 从类属性中获取值
        asn_data = MyTestCase.shared_data.get('asn_data')
        asn_confirm(self.properties, self.twms_login, asn_data)
        print("收货确认成功：" + asn_data['asn_number'])
        # 断言确认成功
        self.assertIsNotNone(asn_data)


    def test_04_inventory(self):
        """查询核对库存"""
        print("查询核对库存-----------------------------------------------------------")
        asn_data = MyTestCase.shared_data.get('asn_data')
        # asn_data = {'asn_number': 'ASN202509011512294562', 'items': [{'code': 'SKU202509011454282929', 'barcode': 'SKU202509011454282929', 'unit_price': 5, 'currency': 'HKD', 'qty': 10, 'po_number': 'PO20250901151229'},{'code': 'SKU202508281755598040', 'barcode': 'SKU202508281755598040', 'unit_price': 5, 'currency': 'HKD', 'qty': 1, 'po_number': 'PO20250901151229'}]}
        inventory_data = inventory(self.properties, self.twms_login, asn_data)
        # print(inventory_data)
        inventory_result = inventory(
            self.properties,
            self.twms_login,
            asn_data
        )

        self.assertTrue(inventory_result['success'],
                        f"库存核对失败: {inventory_result.get('message', '未知错误')}")

        # 打印库存核对详情
        print("库存核对结果:")
        for sku, detail in inventory_result['details'].items():
            print(f"  SKU {sku}: {detail['status']} - {detail['message']}")


    def test_05_create_order(self):
        """波次创建（单件）"""
        print("波次创建（单件）-----------------------------------------------------------")
        # sku_data = self.sku_list[0].append(["sku_qty"])
        order_data = create_order_api(self.properties, self.sku_list)
        sleep(50)
        wave_data = select_order_id(self.properties,  self.twms_login,order_data["order_number"])
        # print(pick_wave_data)
        pick_wave_data = create_pick_wave(self.properties,self.twms_login,wave_data)
        pick_order = pick_add_order(self.properties, self.twms_login, pick_wave_data)
        self.assertIsNotNone(pick_order)


    def test_06_batch_create_pick_wave(self):
        """波次创建（批量）"""
        print("波次创建（批量）-----------------------------------------------------------")
        order_data = create_order_api(self.properties, self.sku_list)
        # order_data = {"order_number":"BACKOR202509051722499353"}
        sleep(3)
        wave_data = select_order_id(self.properties, self.twms_login, order_data["order_number"])
        pick_wave_data = batch_create_pick_wave(self.properties,self.twms_login,wave_data)
        print(f'波次数据：{pick_wave_data}')
        self.assertIsNotNone(pick_wave_data)



    def test_07_create_order_S(self):
        """打包类型（S）"""
        print("打包类型（S）-----------------------------------------------------------")
        sku_list = [{'sku': self.sku_list[0]['sku'], 'sku_barcodes': self.sku_list[0]['sku_barcodes'],'sku_qty':1}]
        order_data = create_order_api(self.properties, sku_list)
        sleep(3)
        wave_data = select_order_id(self.properties,  self.twms_login,order_data["order_number"])
        print(wave_data)
        pick_wave_data = create_pick_wave(self.properties,self.twms_login,wave_data)
        pick_add_order(self.properties,self.twms_login,pick_wave_data)
        # sleep(5)
        box=box_by_order_S(self.properties,self.twms_login,sku_list,pick_wave_data)
        self.assertIsNotNone(box)


    def test_08_create_order_M(self):
        """打包类型（M）"""
        print("打包类型（M）-----------------------------------------------------------")
        order_data1 = create_order_api(self.properties, self.sku_list)
        order_data2 = create_order_api(self.properties, self.sku_list)
        sleep(3)
        wave_data = select_order_id(self.properties, self.twms_login, order_data1["order_number"])
        wave_data['order_ids'].extend(select_order_id(self.properties, self.twms_login, order_data2["order_number"])['order_ids'])
        print(wave_data)
        pick_wave_data = batch_create_pick_wave(self.properties, self.twms_login, wave_data)
        box_data1 = box_by_order(self.properties,self.twms_login,order_data1["order_number"],self.sku_list,pick_wave_data)
        box_data2 = box_by_order(self.properties, self.twms_login, order_data2["order_number"], self.sku_list,
                                pick_wave_data)
        tracking_number1 = close_box(self.properties, self.twms_login, order_data1["order_number"], pick_wave_data)
        tracking_number2 = close_box(self.properties, self.twms_login, order_data2["order_number"], pick_wave_data)
        self.assertIsNotNone(tracking_number2)


    def test_09_create_order_L(self):
        """打包类型（L）"""
        print("打包类型（L）-----------------------------------------------------------")
        order_data = create_order_api(self.properties, self.sku_list)
        sleep(3)
        wave_data = select_order_id(self.properties,  self.twms_login,order_data["order_number"])
        pick_wave_data = create_pick_wave(self.properties,self.twms_login,wave_data)
        pick_add_order(self.properties,self.twms_login,pick_wave_data)
        # sleep(5)
        box_data = box_by_order(self.properties,self.twms_login,order_data["order_number"],self.sku_list,pick_wave_data)
        tracking_number = close_box(self.properties,self.twms_login,order_data["order_number"],pick_wave_data)
        # order_handover(self.properties,self.twms_login,tracking_number)
        self.assertIsNotNone(box_data)

    def test_10_create_order_M_Multiple(self):
        """打包类型（M爆款）"""
        print("打包类型（M爆款）-----------------------------------------------------------")
        order_data1 = create_order_api(self.properties, self.sku_list)
        order_data2 = create_order_api(self.properties, self.sku_list)
        wave_data = select_order_id(self.properties, self.twms_login, order_data1["order_number"])
        wave_data['order_ids'].extend(select_order_id(self.properties, self.twms_login, order_data2["order_number"])['order_ids'])
        print(wave_data)
        pick_wave_data = batch_create_pick_wave(self.properties, self.twms_login, wave_data)
        job_id = box_by_order_M_Multiple(self.properties, self.twms_login,self.sku_list,pick_wave_data)
        self.assertIsNotNone(job_id)


    def test_11_create_order_tote(self):
        """打包类型（格口）"""
        # print("打包类型（格口）-----------------------------------------------------------")
        order_data1 = create_order_api(self.properties, self.sku_list)
        order_data2 = create_order_api(self.properties, self.sku_list)
        wave_data = select_order_id(self.properties, self.twms_login, order_data1["order_number"])
        wave_data['order_ids'].extend(select_order_id(self.properties, self.twms_login, order_data2["order_number"])['order_ids'])
        pick_wave_data = batch_create_pick_wave(self.properties, self.twms_login, wave_data)
        # pick_wave_data = {'pick_wave_id': 62843, 'pick_wave_num': 'W000062848', 'client_id': 145, 'centre_id': 37, 'order_ids': ['919598', '919599']}
        tote_data = box_by_order_tote(self.properties, self.twms_login,self.sku_list,pick_wave_data)
        print(tote_data)
        tote_data2 = box_by_order_tote(self.properties, self.twms_login, self.sku_list, pick_wave_data)
        print(tote_data2)
        tracking_number1 = close_box(self.properties, self.twms_login, order_data1["order_number"], pick_wave_data,"tote")
        tracking_number2 = close_box(self.properties, self.twms_login, order_data2["order_number"], pick_wave_data, "tote")
        print(tracking_number2)
        self.assertIsNotNone(tracking_number2)
        # close_box(self.properties, self.twms_login, order_data1["order_number"], pick_wave_data)




    def test_12_create_order_S_Multiple(self):
        """打包类型（S+）"""
        print("打包类型（S+）-----------------------------------------------------------")
        sku_list = [{'sku': self.sku_list[0]['sku'], 'sku_barcodes': self.sku_list[0]['sku_barcodes'], 'sku_qty': 1}]
        order_data1 = create_order_api(self.properties, sku_list)
        order_data2 = create_order_api(self.properties, sku_list)
        order_data3 = create_order_api(self.properties, sku_list)
        order_data4 = create_order_api(self.properties, sku_list)
        order_data5 = create_order_api(self.properties, sku_list)
        wave_data = select_order_id(self.properties, self.twms_login, order_data1["order_number"])
        wave_data['order_ids'].extend(
            select_order_id(self.properties, self.twms_login, order_data2["order_number"])['order_ids'])
        wave_data['order_ids'].extend(
            select_order_id(self.properties, self.twms_login, order_data3["order_number"])['order_ids'])
        wave_data['order_ids'].extend(
            select_order_id(self.properties, self.twms_login, order_data4["order_number"])['order_ids'])
        wave_data['order_ids'].extend(
            select_order_id(self.properties, self.twms_login, order_data5["order_number"])['order_ids'])
        print(wave_data)
        pick_wave_data = batch_create_pick_wave(self.properties, self.twms_login, wave_data,wave_type="s+")
        box_by_order_S_Multiple(self.properties, self.twms_login, sku_list, pick_wave_data)
        close_box(self.properties, self.twms_login,order_data1["order_number"],pick_wave_data)
        box_by_order_S_Multiple(self.properties, self.twms_login, sku_list, pick_wave_data)
        close_box(self.properties, self.twms_login, order_data2["order_number"], pick_wave_data)
        box_by_order_S_Multiple(self.properties, self.twms_login, sku_list, pick_wave_data)
        close_box(self.properties, self.twms_login, order_data3["order_number"], pick_wave_data)
        box_by_order_S_Multiple(self.properties, self.twms_login, sku_list, pick_wave_data)
        close_box(self.properties, self.twms_login, order_data4["order_number"], pick_wave_data)
        box_by_order_S_Multiple(self.properties, self.twms_login, sku_list, pick_wave_data)
        tracking_number = close_box(self.properties, self.twms_login, order_data5["order_number"], pick_wave_data)
        self.assertIsNotNone(tracking_number)

    def test_13_order_handover(self):
        """出库（by tracking number）"""
        print("出库（by tracking number）-----------------------------------------------------------")
        order_data = create_order_api(self.properties, self.sku_list)
        sleep(3)
        wave_data = select_order_id(self.properties,  self.twms_login,order_data["order_number"])
        pick_wave_data = create_pick_wave(self.properties,self.twms_login,wave_data)
        pick_add_order(self.properties,self.twms_login,pick_wave_data)
        # sleep(5)
        box_data = box_by_order(self.properties,self.twms_login,order_data["order_number"],self.sku_list,pick_wave_data)
        tracking_number = close_box(self.properties,self.twms_login,order_data["order_number"],pick_wave_data)
        order_handover(self.properties,self.twms_login,tracking_number)
        self.assertIsNotNone(box_data)


    def test_14_order_handover_pallet(self):
        """出库（通过板）"""
        print("出库（通过板）-----------------------------------------------------------")
        order_data = create_order_api(self.properties, self.sku_list)
        sleep(3)
        wave_data = select_order_id(self.properties,  self.twms_login,order_data["order_number"])
        pick_wave_data = create_pick_wave(self.properties,self.twms_login,wave_data)
        pick_add_order(self.properties,self.twms_login,pick_wave_data)
        # sleep(5)
        box_by_order(self.properties,self.twms_login,order_data["order_number"],self.sku_list,pick_wave_data)
        tracking_number = close_box(self.properties,self.twms_login,order_data["order_number"],pick_wave_data)
        order_handover_pallet(self.properties,self.twms_login,tracking_number)
        self.assertIsNotNone(tracking_number)

















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