
import unittest

from TMS.Api集运.集运下单 import create_cargo
from TMS.拼多多集运.朗信入库 import lagnxing_inbound


class MyTestCase(unittest.TestCase):
    def test_case_order_create(self):
        sc_pickup_tn = create_cargo()["sc_pickup_tn"]
        # lagnxing_inbound(sc_pickup_tn)









if __name__ == '__main__':
    unittest.main()