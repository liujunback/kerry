import unittest
from time import sleep, time

from TMS.ICBU.Icbu_create import Icbu_Create
from TMS.ICBU.icbu_return import icbu_return
from TMS.ICBU.notifypaid import notifypaid

from TMS.ICBU.order_inquire import Order_Inquire
from TMS.ICBU.package_scan import package_scan
from TMS.ICBU.status import status
from TMS.public.Inbaound import inbound
from TMS.public.check_weight import check_weight
from TMS.public.close_box_scan import close_Box_Scan, close_Box
from TMS.public.shipment import shipment_add, shipment_scan, shipment_close
from TMS.public.Mawb import scan_box, create, close_mawb


class MyTestCase(unittest.TestCase):

    def test_case_ICBU(self):
        trak=[]
        # for i in range(1,2):
        #     ref = Icbu_Create()
        # sleep(30)
        ref = "1050029437"
        tracking_number = Order_Inquire(ref)#查询运单号
        tracking_number = ref
        trak.append(tracking_number)
        package_scan(tracking_number)#仓库揽收
        inbound(tracking_number)#入库称重
        sleep(6)
        notifypaid(ref)#icbu付费通知
        # icbu_return(ref)
        #
        sleep(15)
        box_num = close_Box_Scan(tracking_number)#装包
        close_Box(box_num,trak)#关箱
        check_weight(box_num,trak)#核重
        shipment_num = shipment_add()#创建出货批次
        sleep(10)
        shipmentbatchId = shipment_scan(box_num,shipment_num)#关联箱子出货信息
        shipment_close(shipmentbatchId,shipment_num)#出货
        mawb_data = create()#总运单

        scan_box(box_num,mawb_data["mawb"],mawb_data["id"])
        close_mawb(mawb_data["mawb"],mawb_data["id"])
        sleep(10)
        for i in range(len(trak)):
            sleep(1)
            status(trak[i], "ES", "出口报关开始")
            sleep(1)
            status(trak[i], "FX", "出口清关完成")
            sleep(1)
            status(trak[i], "OC", "航班起飞")
            sleep(1)
            status(trak[i], "OF", "航班抵达")
            #     time.sleep(1)
            #     status(trak[i],"OR","入口清关收到货")
            sleep(1)
            status(trak[i], "OS", "进口清关开始")
            # time.sleep(1)
            # status(trak[i],"OG","进口清关查件")
            # time.sleep(1)
            # status(trak[i],"ON","进口清关销毁")
            sleep(1)
            status(trak[i], "OQ", "进口清关完成")
            sleep(1)
            status(trak[i],"HL","交货到末公里")
            sleep(1)
            status(trak[i], "ZY", "包裹到达分拣中心")
            # time.sleep(1)
            # status(trak[i], "SP", "站点发出")
            sleep(1)
            status(trak[i], "OK", "用户签收")
            # status(trak[i],"RJ","拒收")
            # status(trak[i],"RN","lastmile_eturn")
            # status(trak[i],"XH","销毁")
            # status(trak[i],"LS","丢失")
            # status(trak[i],"DM",tms_token,properties,"货物损坏")



if __name__ == '__main__':
    unittest.main()





























