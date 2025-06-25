
import unittest
from time import sleep

from OMS2.public.Big_List import BOX
from OMS2.public.Box_operation import BOX_OPERATION
from OMS2.public.Shipment import Shipment
from TMS.public.Login import login

class MyTestCase(unittest.TestCase):

    def test_case_box_create(self):
        box_num_list=[]
        for list in range(1):
            bag_id = BOX.create_big_box_id(3,login())
        #     sleep(100)
        #     BOX_OPERATION.big_id_inbound(bag_id)
        #     BOX_OPERATION.big_id_outbound(bag_id)
        #     box_num = BOX_OPERATION.big_id_box_num(bag_id)
        #     box_num_list.append(box_num)
        #     BOX_OPERATION.big_id_check(box_num)
        # shipment_num = Shipment.shipment_add("test")
        # for box in box_num_list:
        #     sleep(15)
        #     shipmentbatchId = Shipment.shipment_scan(box,shipment_num)
        # Shipment.shipment_close(shipmentbatchId,shipment_num)







if __name__ == '__main__':
    unittest.main()