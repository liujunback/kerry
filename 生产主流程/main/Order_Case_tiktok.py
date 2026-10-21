
import time
import unittest

from 生产主流程.OPS.Check_Weight import Check_Weight
from 生产主流程.OPS.Close_Box import Close_Box
from 生产主流程.OPS.Inbound import OPS_Inbound
from 生产主流程.OPS.Outbound import Outbound_Scan
from 生产主流程.TMS.export_packing_list import export_packing_list, check_file_urls
from 生产主流程.TMS.mawb import create, scan_box, close_mawb
from 生产主流程.TMS.mawb_status import mawb_status
from 生产主流程.TMS.shipment import shipment_add, shipment_scan, shipment_close
from 生产主流程.TMS.status import status
from 生产主流程.order.Big_Bag_Create import Big_Bag_Create
from 生产主流程.order.Order_Create import Order_Create
from 生产主流程.order.order_status import order_status
from 生产主流程.order.spider_order_status import send_tracking
from 生产主流程.order.tiktok下单 import create_tiktok_order
from 生产主流程.properties.GetProperties import getProperties
from 生产主流程.public.Ops_Login import Ops_Login
from 生产主流程.public.Pos_Login import Pos_Login
from 生产主流程.public.tms_Login import tms_login
import os
os.environ["NO_PROXY"] ="test-tms-kec-eng.kec-app.com,test-ops-eng.kec-app.com,test-pos-kec-eng.kec-app.com,spider.kec-app.com,cb-tms-kp-de.kec-app.com,tms-eng.kec.kln.cn,cb-pos-kp-de.kec-app.com,cb-ops-kp-de.kec-app.com,pos-eng.kec.kln.cn,pos.jp.kec-app.com,ops-eng.kec.kln.cn,tms.jp.kec-app.com"

class MyTestCase(unittest.TestCase):

    def test_case_order_create12(self):
        """tiktok下单"""
        company = "KP2"  # KEC-备用
        properties = getProperties(company)
        tracking_number = create_tiktok_order(properties)
        pos_token = Pos_Login(properties)
        ops_token = Ops_Login(properties)
        tms_token = tms_login(properties)
        # print(f"POS Token: {pos_token}")
        # print(f"OPS Token: {ops_token}")
        print(f"TMS Token: {tms_token}")
        time.sleep(30)
        OPS_Inbound(tracking_number, properties, ops_token)
        box_num = Outbound_Scan(tracking_number, properties, ops_token)
        Close_Box(box_num, [tracking_number], properties, ops_token)
        Check_Weight(box_num, properties, ops_token, len(1))
        shipment_num = shipment_add(properties, tms_token)
        mawb_data = create(tms_token, properties)
        shipmentbatchId = shipment_scan(box_num, shipment_num, properties, tms_token)
        time.sleep(10)
        shipment_close(shipmentbatchId, shipment_num, properties, tms_token)
        time.sleep(5)
        scan_box(box_num, mawb_data["mawb"], mawb_data["id"], tms_token, properties)
        time.sleep(5)
        close_mawb(mawb_data["mawb"], mawb_data["id"], tms_token, properties)
        time.sleep(5)
        mawb_status(mawb_data["id"], "OF", tms_token, properties)
        time.sleep(5)
        status(tracking_number,"OS",tms_token,properties,"进口清关开始")
        # time.sleep(1)
        # status(tracking_number,"OG",tms_token,properties,"进口清关查件")
        # time.sleep(1)
        # status(tracking_number,"ON",tms_token,properties,"进口清关销毁")
        time.sleep(1)
        status(tracking_number,"OQ",tms_token,properties,"进口清关完成")




if __name__ == '__main__':
    unittest.main()