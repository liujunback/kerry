import unittest

import time

from TMS.public.Mawb import create, scan_box, close_mawb
from TMS.public.big_bag_inbound import big_bag_inbound
from TMS.public.big_bag_order import create_big_box_id
from TMS.public.boxOutBound import box_out_bound
from TMS.public.check_weight import check_weight
from TMS.public.shipment import shipment_add, shipment_scan, shipment_close



class MyTestCase(unittest.TestCase):

    def test_case_order_create(self):#下单
        for i in range(1):
            big_bag_num = create_big_box_id(5)#大包下单
        # big_bag_num = "TWYW20230714110302"
        time.sleep(30)
        time_start = time.time()
        # big_bag_inbound(big_bag_num)
        time_end = time.time()
        # print('下单耗时：', round(time_end - time_start, 2), 's')
        # box_out_bound(big_bag_num)
        # check_weight(big_bag_num,"1")
        # shipment_num = shipment_add()
        # time.sleep(10)
        # shipmentbatchId = shipment_scan(big_bag_num,shipment_num)
        # shipment_close(shipmentbatchId,shipment_num)
        # mawb_data = create()
        # time.sleep(10)
        # scan_box(big_bag_num,mawb_data["mawb"],mawb_data["id"])
        # close_mawb(mawb_data["mawb"],mawb_data["id"])




if __name__ == '__main__':
    unittest.main()