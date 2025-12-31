import unittest

from HelloWorld.public.cainiao.CaiNiao import CaiNiao_create


class MyTestCase(unittest.TestCase):

    def test_case_CaiNiao(self):
        for i in range(1,2):
            ref_num = CaiNiao_create()
        tracking_num = "621000000000898995246510601"
        # status(tracking_num,"HL","到达转运中心")
        # status(tracking_num,"ZY","到达转运中心")
        # status(tracking_num,"OK","快件已签收")
        # status(tracking_num,"LS","货物丢失")
        # status(tracking_num,"DM","货物损坏")



if __name__ == '__main__':
    unittest.main()
