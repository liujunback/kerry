import json
import unittest
from time import sleep, time

from HelloWorld.ICBU.package_scan import Box_scan

from HelloWorld.public.Wish.Wish_Create import Wish_Create
from HelloWorld.public.Wish.bag_create import bag_creat
from HelloWorld.public.create_Mawb import create_mawb

from HelloWorld.public.inbound import inbound


class MyTestCase(unittest.TestCase):

    def test_case_WISH(self):
        # for ai in range(100):
        order_list=[]
        orders = []
        for i in range(1):
            data = Wish_Create()
            order_list.append(data[0])
            sleep(1)
            orders.append(data[0]['logistics_order_code'])
        box_num = bag_creat(order_list)

        Box_scan(box_num)#
        mawb_data = create_mawb()

        # # # # sleep(20)
        tracking_number= "KENLNT00184394"#补录货态
        # status(tracking_number,"FX","出口清关成功")
        # status(tracking_number,"OC","航班起飞")
        # status(tracking_number,"OF","航班抵达")
        # status(tracking_number,"OQ","入口清关成功")
        # status(tracking_number,"HL","到达转运中心")
        # status(tracking_number,"ZY","交货到末公里")
        # status(tracking_number,"ZY","交货到末公里")
        # status(tracking_number,"IT","离开转运中⼼")
        # status(tracking_number,"SP","安排投递")
        # status(tracking_number,"RJ","收件⼈拒绝签收")
        # status(tracking_number,"OK","快件已签收")
        # status(tracking_number,"RN","包裹退回到发件⼈")
        # status(tracking_number,"PD","运输过程中出现异常")
        # status(tracking_number,"RN","末端派送货物退回仓库中")
        # status(tracking_number,"LS","货物丢失")
        # status(tracking_number,"XH","货物销毁")
        # status(tracking_number,"IS","包裹到达自提点")
        #icbu_return(ref)



if __name__ == '__main__':
    unittest.main()





























