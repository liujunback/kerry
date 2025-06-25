import json
import threading
import unittest

import time

from case.public.create_big_packge import create_big_box_id


class MyTestCase(unittest.TestCase):
    #@unittest.skip("")#包含WMS的退件入库和上架接口
    def test_case_order_create(self):
        x =2
        trak=[]
        box_list=[]
        token = login()
        box_num = create_big_box_id(300)
        time.sleep(100)


        # shipment_close(shipmentbatchId,shipment_num)
        # status(tracking_num,"FX","出口清关成功")
        # status(tracking_num,"OC","航班起飞")
        # status(tracking_num,"OF","航班抵达")
        # status(tracking_num,"OQ","⽬的地清关完成")
        # status(tracking_num,"HL","到达转运中心")
        # status(tracking_num,"ZY","到达转运中心")
        # tracking_num="KENLNT00184371"
        # status(tracking_num,"IT","离开转运中⼼")
        # status(tracking_num,"SP","安排投递")
        # # status(tracking_num,"RJ","收件⼈拒绝签收")
        # status(tracking_num,"OK","快件已签收")

if __name__ == '__main__':
    unittest.main()