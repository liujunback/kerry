import json
import unittest
from time import sleep, time

from TMS.ICBU.package_scan import Box_scan
from TMS.ICBU.status import status
from TMS.Wish.Wish_Create import Wish_Create
from TMS.Wish.bag_create import bag_creat
from TMS.public.Inbaound import inbound
from TMS.public.Mawb import create, scan_box, close_mawb
from TMS.public.check_weight import check_weight
from TMS.public.close_box_scan import close_Box_Scan, close_Box
from TMS.public.shipment import shipment_add, shipment_scan, shipment_close


class MyTestCase(unittest.TestCase):
    def test_case_WISH(self):
        # for ai in range(1):
        order_list=[]
        orders = []
        for i in range(1):
            data = Wish_Create()
            order_list.append(data[0])
            sleep(1)
            orders.append(data)
            box_num = bag_creat(order_list)
        # inbound_box=""
        for i in range(len(order_list)):
            if i == 0:
                sleep(10)
                Box_scan(box_num)#
                inbound(order_list[i]['logistics_order_code'])#入库称重
                inbound_box = close_Box_Scan(order_list[i]['logistics_order_code'])#装包
        #         # print(inbound_box)
        #         # print(inbound_box)
                continue
            inbound(order_list[i]['logistics_order_code'])#入库称重
            close_Box_Scan(order_list[i]['logistics_order_code'],inbound_box)#装包
        close_Box(inbound_box,orders)#关箱
        sleep(1)
        check_weight(inbound_box,orders)#核重
        shipment_num = shipment_add()#创建出货批次
        sleep(30)
        shipmentbatchId = shipment_scan(inbound_box,shipment_num)#关联箱子出货信息
        shipment_close(shipmentbatchId,shipment_num)#出货
        mawb_data = create()
        sleep(2)
        scan_box(inbound_box,mawb_data["mawb"],mawb_data["id"])
        close_mawb(mawb_data["mawb"],mawb_data["id"])
        # # # sleep(20)
        tracking_number= "63987600001031301010012"#补录货态
        status(tracking_number,"FX","出口清关成功")
        sleep(70)
        status(tracking_number,"OC","航班起飞")
        sleep(70)
        status(tracking_number,"OF","航班抵达")
        sleep(70)
        status(tracking_number,"OS","入口清关开始清关")
        sleep(70)
        status(tracking_number,"OQ","入口清关成功")
        sleep(70)
        status(tracking_number,"HL","到达转运中心")
        sleep(70)
        status(tracking_number,"ZY","交货到末公里")
        sleep(70)
        status(tracking_number,"IT","离开转运中⼼")
        sleep(70)
        status(tracking_number,"SP","安排投递")
        sleep(70)
        status(tracking_number,"RJ","收件⼈拒绝签收")
        sleep(70)
        status(tracking_number,"OK","快件已签收")
        # status(tracking_number,"RN","包裹退回到发件⼈")
        # status(tracking_number,"PD","运输过程中出现异常")
        # status(tracking_number,"RN","末端派送货物退回仓库中")
        # status(tracking_number,"LS","货物丢失")
        # status(tracking_number,"XH","货物销毁")
        # status(tracking_number,"IS","包裹到达自提点")
        #icbu_return(ref)



if __name__ == '__main__':
    unittest.main()





























