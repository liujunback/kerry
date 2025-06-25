import unittest

from TMS.ICBU中心仓.public.ICBU_create_order import create_order_icbu
from TMS.ICBU中心仓.public.ICBU_sign_in_order import sign_in_order


class MyTestCase(unittest.TestCase):

    def test_case_ICBU_order_create(self):#下单
        aliOrderNo = create_order_icbu()
        # sign_in_order(aliOrderNo)



if __name__ == '__main__':
    unittest.main()