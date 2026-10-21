import unittest
from time import sleep, time

from HelloWorld.ICBU.Icbu_create import Icbu_Create
from HelloWorld.ICBU.order_inquire import Order_Inquire
from HelloWorld.ICBU.package_scan import package_scan
from HelloWorld.ICBU.status import status
from HelloWorld.public.inbound import inbound


class MyTestCase(unittest.TestCase):

    def test_case_ICBU(self):
        trak=[]
        ref = Icbu_Create()
        sleep(10)
        tracking_number = Order_Inquire(ref)#查询运单号
        trak.append(tracking_number)
        package_scan(tracking_number)#仓库揽收
        sleep(10)
        inbound(tracking_number)#入库称重

        # notifypaid(ref)#icbu付费通知
        # sleep(10)
        # box_num = close_Box_Scan(tracking_number)#装包
        # close_Box(box_num,trak)#关箱
        # check_weight(box_num,trak)#核重
        # shipment_num = shipment_add()#创建出货批次
        # sleep(3)
        # shipmentbatchId = shipment_scan(box_num,shipment_num)#关联箱子出货信息
        # shipment_close(shipmentbatchId,shipment_num)#出货
        # # # sleep(20)
        # tracking_number= "ALS14563445926112 "#补录货态
        # status(tracking_number,"FX","出口清关成功")
        # status(tracking_number,"OC","航班起飞")
        # status(tracking_number,"OF","航班抵达")
        # status(tracking_number,"OQ","⽬的地清关完成")
        # status(tracking_number,"HL","到达转运中心")
        # status(tracking_number,"ZY","到达转运中心")
        # status(tracking_number,"IT","离开转运中⼼")
        # status(tracking_number,"SP","安排投递")
        # status(tracking_number,"RJ","收件⼈拒绝签收")
        # status(tracking_number,"OK","快件已签收")
        # status(tracking_number,"RN","包裹退回到发件⼈")
        # status(tracking_number,"PD","运输过程中出现异常")
        # status(tracking_number,"RN","末端派送货物退回仓库中")
        # status(tracking_number,"LS","货物丢失")
        # status(tracking_number,"XH","货物销毁")
        # status(tracking_number,"DM","货物损坏")
        #icbu_return(ref)



if __name__ == '__main__':
    unittest.main()





























