import unittest
from time import sleep

from case.public.Hanover_Scan import HandOver_cerate, HandOver_boxid, HandOver_close
from case.public.create_big_packge import create_big_box_id
from case.public.inbound_box import inbound,outbound
from case.public.timesCBS import CBS_create_mawb, close_mawb


class MyTestCase_Big_Box(unittest.TestCase):
    def test_case_big_box_create(self):
        '''创建一个箱子(5个包裹)'''
        big_box=create_big_box_id(2)
        # inbound(big_box)
        # boxid=outbound(big_box)
        # handover_number=HandOver_cerate()
        # HandOver_boxid(boxid,handover_number)
        # HandOver_close(handover_number)
        # sleep(3)
        # mawb=CBS_create_mawb(boxid)
        # close_mawb(mawb)
if __name__ == '__main__':
    unittest.main()
