import unittest
from time import sleep

from TMS.ICBU.status import status
from TMS.public.Inbaound import inbound
from TMS.public.create_order import file_create_order
from TMS.拼多多集运.拼多多集运下单 import pdd_create_order
from TMS.拼多多集运.拼多多集运集包 import pdd_create_order2
from TMS.拼多多集运.朗信入库 import lagnxing_inbound
from TMS.拼多多集运.朗信集包 import lagnxing_consolidated
from TMS.public.Login import login
from TMS.拼多多集运.轨迹订阅 import tracking_status


class MyTestCase(unittest.TestCase):

    def pdd_test_case_order(self):
        for i in range(1):
            number  = pdd_create_order()
            lagnxing_inbound(number["sc_number"])
            sleep(30)
        # order_numbers = pdd_create_order2(number)
        # sleep(10)

        # token = login()
        # tracking_number = file_create_order(token)
        # lagnxing_consolidated(sc_numbers,tracking_number)
        # sleep(30)
        # tracking_number = "1050017524"
        # inbound(tracking_number)
        # sleep(10)
        # tracking_status(tracking_number)
        # status(tracking_number,"DA","干线")
        # sleep(1)
        # status(tracking_number,"ES","出口报关开始")
        # sleep(1)
        # status(tracking_number,"EH","出口清关扣查")
        sleep(1)
        # status(tracking_number,"FX","出口清关完成")
        # sleep(1)
        # status(tracking_number,"OC","干线出发")#CAINIAO_GLOBAL_LINEHAUL_DEPARTURE_CALLBACK
        # sleep(1)
        # status(tracking_number,"OF","干线到达")
        # sleep(1)
        # status(tracking_number,"OS","进口清关开始")
        # sleep(1)
        # status(tracking_number,"OQ","进口清关完成")
        # sleep(1)
        # status(tracking_number,"OG","进口清关扣查")
        status(tracking_number,"ZY","到达站点")
        # status(tracking_number,"SP","站点发出")
        # sleep(1)
        # status(tracking_number,"SP2","二次派送")
        # sleep(1)
        # status(tracking_number,"OK","用户签收")
        # status(tracking_number,"PD","派送异常")
        # sleep(1)
        # status(tracking_number,"PR","违禁品")
        # status(tracking_number,"RJ","收件人拒收")
        # status(tracking_number,"DM","销毁")
        # status(tracking_number,"RN","退件")





if __name__ == '__main__':
    unittest.main()