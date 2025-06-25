import sys
import unittest
from time import sleep

from case.public.Hanover_Scan import HandOver_cerate, HandOver_boxid, HandOver_close
# from case.order.timesCBS import CBS_create_mawb
# from case.order.timesCBS import close_mawb

sys.path.append("..")
import ddt

from case.public.login import login
from case.public.order import order,create_mawb,batch_revise
from case.public.client_login import client_login,client_sort_in,client_sort_out,client_close_box


class MyTestCase(unittest.TestCase):


    #@unittest.skip("test")
    def test_case_order_create(self):
        '''创建一个订单'''
        x=1
        # token="mCeTnvHLdkeNVjywF9KJXuxm0RW2xutelLAZWr6Ph6ZNaGHrcN4Gn42fcpNg"
        # token2="01a6a2cb2950de4d5b88f0451a664a6d5ff91205"
        
        token=login()
        token2=client_login()
        #token = "DaPgyEP4xsAn2hMBTL6VGUEeHTDQigeXpyxhVHwYcVP2KsABc4CguFwdup2h"
        for i in range(1):#整个流程次数循环
            if x>=1:
                tracking_number=order(token)
                #tracking_number = "617710711251560013"
                if x>=2:
                    client_sort_in(token2,tracking_number)
                    if x>=3:
                        boxid=client_sort_out(token2,tracking_number)
                        client_close_box(token2,boxid)
                        sleep(3)
                        if x>=4:
                            handover_number=HandOver_cerate()
                            HandOver_boxid(boxid,handover_number)
                            HandOver_close(handover_number)

                            if x>=5:
                                mawb_num = create_mawb(boxid)
                                sleep(50)
                                batch_revise(mawb_num)
                                # sleep(30)
                                # batch_revise(mawb_num)
                                #mawb=CBS_create_mawb(boxid)
                                # sleep(3)
                                # close_mawb(mawb)

        # #
        # tracking_number=order(token)
        # client_sort_in(token2,tracking_number)
        # boxid=client_sort_out(token2,tracking_number)
        # client_close_box(token2,boxid)
        # handover_number=HandOver_cerate()
        # HandOver_boxid(boxid,handover_number)
        # HandOver_close(handover_number)
        # sleep(2)
        # mawb=CBS_create_mawb(boxid)
        # close_mawb(mawb)

            # token=login()

            #token2=client_login()

        # array=[]
        # box=[]
        # for x in range(1):#箱子个数
        #     for i in range(5):#箱子内订单个数
        #         tracking_number=order(token)
        #         array.append(tracking_number)
        #         client_sort_in(token2,tracking_number)
        #     for a in range(len(array)):
        #         boxid=client_sort_out(token2,array[a])
        #     box.append(boxid)
        #     client_close_box(token2,boxid)
            # # sleep(2)
            # handover_number=HandOver_cerate()
            # for a in range(len(box)):
            #     HandOver_boxid(boxid,handover_number)
            # HandOver_close(handover_number)
            # sleep(2)



        # boxid=client_sort_out("b8c1a3021c7c19e3fa09b61f0e2cde7e74ad7567","KECTH00001012")
        # boxid=client_sort_out("b8c1a3021c7c19e3fa09b61f0e2cde7e74ad7567","KECTH00001011")
        # boxid=client_sort_out("b8c1a3021c7c19e3fa09b61f0e2cde7e74ad7567","KECTH00001010")
        # client_close_box("b8c1a3021c7c19e3fa09b61f0e2cde7e74ad7567",boxid)

        #sort_in(tracking_number,"sort_in")#oms修改状态
        #sort_out(tracking_number,"sort_out","345345")
        #sort_out(tracking_number,"close_box","12313112")

        # token=login()
        #     #
        # token2=client_login()
        # tracking_number="KECTH00001340"
        #
        # client_sort_in(token2,tracking_number)
        # boxid=client_sort_out(token2,tracking_number)
    @unittest.skip("")
    def test_case_order_create2(self):
        for x in range(1):
            token = "NHx78vc56NueLQOJleWa3AojERGpiTwl2YXndXQVG0rUC4lcMJxxVqxITE0G"
            token2 = "3544e6274fa94b6b5cb9c944a16f588f7b3d3397"
            token=login()
            token2=client_login()
            box_list=[]
            for x in range(2):#箱子个数
                array=[]
                for i in range(5):#箱子内订单数量
                    #Thread1=threading.Thread(target=order, args=(token))
                    #Thread2=threading.Thread(target=order, args=(token))
                    # Thread1.start()
                    # Thread2.start()
                    tracking_number=order(token)
                    array.append(tracking_number)
                    client_sort_in(token2,tracking_number)
                boxid=""
                for a in range(len(array)):
                    try:
                        boxid=client_sort_out(token2,array[a])
                    except:
                        pass
                try:
                    client_close_box(token2,boxid)
                    box_list.append(boxid)
                except:
                    pass
            handover_number=HandOver_cerate()
            for a in range(len(box_list)):
                HandOver_boxid(box_list[a],handover_number)
            HandOver_close(handover_number)
            sleep(3)

        # sleep(5)
        # mawb=CBS_create_mawb('\r\n'.join(box_list))
        # close_mawb(mawb)

if __name__ == '__main__':
    unittest.main()
