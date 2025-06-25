import unittest
from time import sleep

from TMS.ICBU.order_inquire import Order_Inquire
from TMS.ICBU.status import status
from TMS.cainiao.CaiNiao import create


class MyTestCase(unittest.TestCase):

    def test_case_CaiNiao(self):
        for i in range(1,2):
            ref_num = create()
        sleep(60)
        tracking_num = Order_Inquire(ref_num)#查询运单号
        # tracking_num = "621000000000749606639824913"
        # status(tracking_num,"HL","清关移交到末端")
        # sleep(5)
        status(tracking_num,"ZY","末端收到货")
        # status(tracking_num,"OK","快件已签收   ")
        # status(tracking_num,"PD","派送异常")
        # status(tracking_num,"XH","包裹销毁")
        # status(tracking_num,"LS","货物丢失")
        # status(tracking_num,"RJ","收件人拒收")
        # status(tracking_num,"DM","货物损坏")
        # status(tracking_num,"AS","到达末公里最终派送站点")
        # status(tracking_num,"DS","离开分拣仓库")
        # status(tracking_num,"RN","退回海外仓中")



if __name__ == '__main__':
    unittest.main()
