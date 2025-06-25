
import unittest

import time

from TMS.public.Mawb import create, scan_box, close_mawb
from TMS.public.big_bag_inbound import big_bag_inbound
from TMS.public.boxOutBound import box_out_bound
from TMS.public.check_weight import check_weight
from TMS.public.shipment import shipment_add, shipment_scan, shipment_close
from TMS.shopee_V2.create_BOX import create_BOX
from TMS.shopee_V2.create_order_shopee import create_order_shopee


class MyTestCase(unittest.TestCase):
    def test_case_order_shopee_create(self):
        for i in range(1):
            time.sleep(1)
            box_da = create_BOX()#大包下单
            create_order_shopee(box_da["carrier_tn"],box_da["ilh_shopee_no"],box_da["parcel_list"])
            big_bag_num = box_da["carrier_tn"]
            # big_bag_num = "TWYW20230714110302"
            time.sleep(100)
            time_start = time.time()
            big_bag_inbound(big_bag_num)
        time_end = time.time()
        print('下单耗时：', round(time_end - time_start, 2), 's')
        box_out_bound(big_bag_num)
        check_weight(big_bag_num,"1")
        shipment_num = shipment_add()
        time.sleep(10)
        shipmentbatchId = shipment_scan(big_bag_num,shipment_num)
        shipment_close(shipmentbatchId,shipment_num)
        mawb_data = create()
        time.sleep(10)
        scan_box(big_bag_num,mawb_data["mawb"],mawb_data["id"])
        close_mawb(mawb_data["mawb"],mawb_data["id"])


if __name__ == '__main__':
    unittest.main()