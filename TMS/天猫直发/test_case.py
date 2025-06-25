import unittest
from time import sleep

from TMS.ICBU.package_scan import package_scan
from TMS.ICBU.status import status
from TMS.public.Inbaound import inbound
from TMS.public.Mawb import scan_box, close_mawb, create
from TMS.public.check_weight import check_weight
from TMS.public.close_box_scan import close_Box_Scan, close_Box
from TMS.public.shipment import shipment_add, shipment_scan, shipment_close
from TMS.天猫直发.create import CaiNiao


class MyTestCase(unittest.TestCase):
    def test_case_order_create(self):
        # tracking_number = CaiNiao.create(1)
        tracking_number = "L7778917878787"
        # box_num = "THCAKE0T012204000003M"
        trak = [].append(tracking_number)
        # sleep(30)
        package_scan(tracking_number)#仓库揽收
        inbound(tracking_number)
        sleep(30)
        box_num = close_Box_Scan(tracking_number)#装包
        close_Box(box_num,trak)#关箱
        sleep(5)
        check_weight(box_num,trak)#核重
        shipment_num = shipment_add()#创建出货批次
        sleep(20)
        shipmentbatchId = shipment_scan(box_num,shipment_num)#关联箱子出货信息
        shipment_close(shipmentbatchId,shipment_num)#出货
        mawb_data = create()#总运单
        sleep(5)
        scan_box(box_num,mawb_data["mawb"],mawb_data["id"])
        close_mawb(mawb_data["mawb"],mawb_data["id"])#总运单
        # sleep(10)
        tracking_number = "L777891787"
        status(tracking_number,"DT","干线交接")#"EH", "EN", "OG", "ON", "SP3F", "SP2F", "XH", "LS", "DM"
        sleep(10)
        status(tracking_number,"ES","出口报关开始")#CAINIAO_GLOBAL_CCEX_START_CALLBACK
        sleep(10)
        # status(tracking_number,"EH","出口清关查件")
        # sleep(10)
        # status(tracking_number,"EN","出口清关扣件不放行")
        # sleep(10)
        status(tracking_number,"FX","出口清关完成")
        sleep(10)
        status(tracking_number,"OC","干线出发")#CAINIAO_GLOBAL_LINEHAUL_DEPARTURE_CALLBACK
        sleep(10)
        status(tracking_number,"OF","干线到达")
        sleep(10)
        status(tracking_number,"OS","进口清关开始")
        # sleep(10)
        # status(tracking_number,"OG","进口清关查件")
        # sleep(10)
        # status(tracking_number,"ON","进口清关扣件不放行")
        sleep(10)
        status(tracking_number,"OQ","进口清关完成")
        sleep(10)
        status(tracking_number,"HL","干配交接")
        sleep(10)
        status(tracking_number,"ZY","到达站点")
        sleep(10)
        status(tracking_number,"SP","站点发出")
        # sleep(10)
        # status(tracking_number,"SP1F","首次派送失败")
        # sleep(10)
        # status(tracking_number,"SP2","站点发出")
        # status(tracking_number,"SP2F","二次派送失败")
        # # status(tracking_number,"SP3F","三次派送失败")
        sleep(10)
        status(tracking_number,"OK","用户签收")
        # status(tracking_number,"RJ","拒收")
        # status(tracking_number,"RN","lastmile_eturn")
        # status(tracking_number,"XH","DESTORY")
        # status(tracking_number,"LS","丢失")
        # status(tracking_number,"TH","退回")
        # status(tracking_number,"DM","DAMAGE")
        # status(tracking_number,"RC","退回")
        # status(tracking_number,"RHW","RHW")






if __name__ == '__main__':
    unittest.main()