import unittest
import time

from FOMS测试.TWMS.Asn_Confirm import select_asn_id, asn_confirm
from FOMS测试.TWMS.Asn_receive import asn_receive
from FOMS测试.TWMS.Box_By_Order import box_by_order
from FOMS测试.TWMS.Close_Box import close_box
from FOMS测试.TWMS.Order_Handover import order_handover
from FOMS测试.TWMS.Pick_Wave import select_centre_id_OR_client_ids, create_pick_wave
from FOMS测试.TWMS.Pick_add_order import pick_add_order
from FOMS测试.TWMS.TWMS_Login import Twms_CN_login
from FOMS测试.properties.GetProperties import getProperties
from FOMS测试.public.cancel_Order import Cancel_Order
from FOMS测试.public.cancel_asn import cancel_asn
from FOMS测试.public.create_ASN import create_ASN
from FOMS测试.public.create_Order import create_Order
from FOMS测试.public.create_SKU import create_SKU
from FOMS测试.public.foms_login import foms_login
from FOMS测试.public.sku_update import update_sku
from FOMS测试.接收TWMS状态.ASN_status import ASN_Status
from FOMS测试.接收TWMS状态.Order_status import Order_status


class MyTestCase(unittest.TestCase):

    def test_case_order(self):

        properties = getProperties("test")
        # twms_login = Twms_CN_login(properties)

        foms_token = foms_login(properties)

        print(foms_token)
        # 创建sku
        # for i in range(1):
        #     sku_number = create_SKU(properties,foms_token)
        sku_number = "BACK_SKU202507103113505"


         # 完结入库单
        # asn_number = create_ASN(sku_number,properties,foms_token)
        # asn_number = "BACKASN20250417752693"
        # time.sleep(30)
        # asn_data = select_asn_id(properties,twms_login,asn_number)
        # asn_receive(properties,twms_login,asn_data,sku_number)
        # asn_confirm(properties,twms_login,asn_data)

        # # 订单主流程
        order = []
        for i in range(1):
            time_start = time.time()
            order_numbers = create_Order(sku_number,properties,foms_token)
            # order_numbers = "BACK_OR202505307885470"
            order.append(order_numbers)
        #
            time_end = time.time()
        print('下单耗时：', round(time_end - time_start, 2), 's')
        time.sleep(60)
        for order_number in order:
            # Order_status(properties,order_number)
            wave_data = select_centre_id_OR_client_ids(properties,twms_login,order_number)
            pick_wave_data = create_pick_wave(properties,twms_login,wave_data)
            pick_add_order(properties,twms_login,pick_wave_data)

            box_by_order(properties,twms_login,order_number,sku_number,pick_wave_data)
            tracking_number = close_box(properties,twms_login,order_number,pick_wave_data)
        order_handover(properties,twms_login,tracking_number,wave_data)
        # Order_status(properties,order_number)





        #
        # # 更新SKU
        # update_sku(properties,foms_token,sku_number)
        #
        #
        # #取消ASN
        # cancel_asn_number = create_ASN(sku_number,properties,foms_token)
        # cancel_asn(properties,foms_token,cancel_asn_number)
        #
        #
        # #取消订单
        # cancel_order = create_Order(sku_number,properties,foms_token)
        # Cancel_Order(properties,foms_token,cancel_order)







        #
        # 接受twms货态接口
        # time.sleep(5)
        # # ASN_Status(properties,asn_number,sku_number)
        # time.sleep(5)
        # order_number = "BACK_OR2024061401011"
        # Order_status(properties,order_number)



if __name__ == '__main__':
    unittest.main()