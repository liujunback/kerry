import time
import unittest

from 生产主流程.OPS.Check_Weight import Check_Weight
from 生产主流程.OPS.Close_Box import Close_Box
from 生产主流程.OPS.Inbound import OPS_Inbound
from 生产主流程.OPS.Outbound import Outbound_Scan
from 生产主流程.TMS.mawb import create, scan_box, close_mawb
from 生产主流程.TMS.shipment import shipment_add, shipment_scan, shipment_close
from 生产主流程.TMS.status import status
from 生产主流程.order.Order_Create import Order_Create
from 生产主流程.properties.GetProperties import getProperties
from 生产主流程.public.Ops_Login import Ops_Login
from 生产主流程.public.Pos_Login import Pos_Login
from 生产主流程.public.tms_Login import tms_login


class MyTestCase(unittest.TestCase):

    def test_case_order(self):
        fail =0
        company = "DE"#KEC-备用
        properties = getProperties(company)
        print(company)
        x = 2
        trak_List=[]
        pos_token = Pos_Login(properties)
        ops_token = Ops_Login(properties)
        tms_token = tms_login(properties)
        print(tms_token)
        box_num = 0
        box_num_list = []
        if x>=1:
            for i in range(1):
                # wb = openpyxl.load_workbook('../main/test.xlsx')#读取execl订单后入库

                # ws = wb.active
                # tr=str(ws['A'+str(i)].value)
                # tracking_number = tr
                tracking_number = Order_Create(properties,pos_token)
                # tracking_number ="KECTH92000005"
                if "失败" in tracking_number:
                    fail=fail+1
                # tracking_number = "KITME10344230"
                # Big_Bag_Create(2, pos_token, properties)
                # print(tr)
                # time.sleep(1)
                trak_List.append(tracking_number)
            print(fail)
        if x>=2:
            for i in range(len(trak_List)):
                if i == 0:
                    time.sleep(40)
                    # Package_Scan(trak[i])
                    OPS_Inbound(trak_List[i], properties, ops_token)
                    time.sleep(10)
                    box_num = Outbound_Scan(trak_List[i], properties,ops_token)
                else:
                    # Package_Scan(trak[i])#揽收
                    OPS_Inbound(trak_List[i], properties, ops_token)#
                    time.sleep(10)
                    Outbound_Scan(trak_List[i], properties, ops_token, box_num)
            Close_Box(box_num,trak_List, properties, ops_token)
            time.sleep(10)
            Check_Weight(box_num, properties,ops_token,len(trak_List))
            time.sleep(30)
            shipment_num = shipment_add(properties, tms_token)
            mawb_data = create(tms_token,properties)
            shipmentbatchId = shipment_scan(box_num, shipment_num, properties, tms_token)
            time.sleep(10)
            shipment_close(shipmentbatchId, shipment_num, properties, tms_token)
            time.sleep(5)
            scan_box(box_num,mawb_data["mawb"],mawb_data["id"],tms_token,properties)
            time.sleep(5)
            close_mawb(mawb_data["mawb"],mawb_data["id"],tms_token,properties)
        # #
        time.sleep(30)
        # tracking_number = "KITME10170357"
        # status(tracking_number,"DT",tms_token,properties,"干线交接")#"EH", "EN", "OG", "ON", "SP3F", "SP2F", "XH", "LS", "DM"
        time.sleep(1)
        status(tracking_number,"ES",tms_token,properties,"出口报关开始")#CAINIAO_GLOBAL_CCEX_START_CALLBACK
        # time.sleep(1)
        # status(tracking_number,"EH",tms_token,properties,"出口清关查件")
        # time.sleep(1)
        # status(tracking_number,"EN",tms_token,properties,"违禁品")
        # time.sleep(1)
        # status(tracking_number,"FX",tms_token,properties,"出口清关完成")
        # time.sleep(1)
        # status(tracking_number,"OC",tms_token,properties,"航班起飞")#CAINIAO_GLOBAL_LINEHAUL_DEPARTURE_CALLBACK
        # time.sleep(1)
        # status(tracking_number,"OF",tms_token,properties,"航班抵达")
        # time.sleep(1)
        # status(tracking_number,"OS",tms_token,properties,"进口清关开始")
        # time.sleep(1)
        # status(tracking_number,"OG",tms_token,properties,"进口清关查件")
        # time.sleep(1)
        # status(tracking_number,"ON",tms_token,properties,"进口清关销毁")
        # time.sleep(1)
        # status(tracking_number,"OQ",tms_token,properties,"进口清关完成")
        # time.sleep(1)
        # status(tracking_number,"HL",tms_token,properties,"交货到末公里")
        # time.sleep(1)
        # status(tracking_number,"ZY",tms_token,properties,"包裹到达分拣中心")
        # time.sleep(1)
        # status(tracking_number,"SP",tms_token,properties,"站点发出")
        # time.sleep(1)
        # status(tracking_number,"SP1F",tms_token,properties,"首次派送失败")
        # time.sleep(1)
        # status(tracking_number,"SP2",tms_token,properties,"站点发出")
        # time.sleep(1)
        # status(tracking_number,"SP2F",tms_token,properties,"二次派送失败")
        # time.sleep(1)
        # status(tracking_number,"SP3",tms_token,properties,"三次派送")
        # status(tracking_number,"SP3F",tms_token,properties,"三次派送失败")
        # time.sleep(1)
        # status(tracking_number,"OK",tms_token,properties,"用户签收")
        # # status(tracking_number,"RJ",tms_token,properties,"拒收")
        # # status(tracking_number,"RN",tms_token,properties,"lastmile_eturn")
        # time.sleep(1)
        # status(tracking_number,"XH",tms_token,properties,"销毁")
        # status(tracking_number,"LS",tms_token,properties,"丢失")
        # time.sleep(1)
        # status(tracking_number,"TH",tms_token,properties,"退回")
        # status(tracking_number,"DM",tms_token,properties,"DAMAGE")
        #     sleep(1)
        # tracking_number = Order_Create(token)
        # big_bag_number = Big_Bag_Create(2,token)
        # big_bag_number = Big_Bag_Create(3,token)

    @unittest.skip("")
    def test_case_order_create12(self):
        properties = getProperties("1")
        trak_List=[]
        num = 12
        trakings=[]
        box_num_list = []
        shipment_num = shipment_add()
        mawb = create()
        pos_token = Pos_Login(properties)
        ops_token = Ops_Login(properties)
        tms_token = tms_login(properties)
        for i in range(num):
            tracking_num = Order_Create(properties,pos_token)
            trakings.append(tracking_num)
        track_list = [trakings[i:i+10] for i in range(0,len(trakings),10)]
        for x in track_list:
            one = 0
            box_num = 0
            cou= len(x)
            for track in x:
                one = int(x.index(track))
                if one == 0:
                    if one == (cou-1):
                        OPS_Inbound(track, properties, ops_token)
                        box_num = Outbound_Scan(track, properties,ops_token)
                        Close_Box(box_num,trak_List, properties, ops_token)
                        Check_Weight(box_num, properties,ops_token,len(trak_List))
                        box_num_list.append(box_num)
                    else:
                        time.sleep(30)
                        OPS_Inbound(track, properties, ops_token)
                        box_num = Outbound_Scan(track, properties,ops_token)
                elif one == (cou-1):
                    OPS_Inbound(track, properties, ops_token)
                    Outbound_Scan(track, properties,ops_token)
                    Close_Box(box_num,trak_List, properties, ops_token)
                    Check_Weight(box_num, properties,ops_token,len(trak_List))
                    box_num_list.append(box_num)
                else:
                    OPS_Inbound(trak_List[i], properties, ops_token)
                    Outbound_Scan(track, properties,ops_token)
        shipmentbatchId = 0
        for i in range(len(box_num_list)):
            shipmentbatchId = shipment_scan(box_num_list[i],shipment_num,tms_token)
        shipment_close(shipmentbatchId,shipment_num)
        for i in range(len(box_num_list)):
            scan_box(box_num_list[i],mawb["mawb"],mawb["id"])
        close_mawb(mawb["mawb"],mawb["id"])


if __name__ == '__main__':
    unittest.main()