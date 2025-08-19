
import time
import unittest

from 生产主流程.OPS.Check_Weight import Check_Weight
from 生产主流程.OPS.Close_Box import Close_Box
from 生产主流程.OPS.Inbound import OPS_Inbound
from 生产主流程.OPS.Outbound import Outbound_Scan
from 生产主流程.TMS.export_packing_list import export_packing_list, check_file_urls
from 生产主流程.TMS.mawb import create, scan_box, close_mawb
from 生产主流程.TMS.mawb_status import mawb_status
from 生产主流程.TMS.shipment import shipment_add, shipment_scan, shipment_close
from 生产主流程.TMS.status import status
from 生产主流程.order.Big_Bag_Create import Big_Bag_Create
from 生产主流程.order.Order_Create import Order_Create
from 生产主流程.properties.GetProperties import getProperties
from 生产主流程.public.Ops_Login import Ops_Login
from 生产主流程.public.Pos_Login import Pos_Login
from 生产主流程.public.tms_Login import tms_login


class MyTestCase(unittest.TestCase):
    import time
    import openpyxl

    def test_case_order(self):
        fail = 0
        company = "KEC-备用"  # KEC-备用
        properties = getProperties(company)
        print(f"当前公司: {company}")

        # 测试流程控制
        x = 2  # 控制测试阶段：1=创建订单, 2=完整流程

        trak_List = []  # 存储生成的运单号
        pos_token = Pos_Login(properties)
        ops_token = Ops_Login(properties)
        tms_token = tms_login(properties)
        print(f"POS Token: {pos_token}")
        # print(f"OPS Token: {ops_token}")
        # print(f"TMS Token: {tms_token}")
        box_num = 0  # 存储箱号

        try:
            # 第一阶段：创建订单
            if x >= 1:
                print("\n===== 开始创建订单 =====")
                for i in range(1):  # 创建1个订单
                    try:
                        # 从Excel读取订单（备用方案）
                        # wb = openpyxl.load_workbook('../main/test.xlsx')
                        # ws = wb.active
                        # tracking_number = str(ws['A'+str(i)].value)

                        # 创建新订单
                        tracking_number = Order_Create(properties, pos_token)
                        # tracking_number = "KPBOGT2025071501"

                        if "失败" in tracking_number:
                            fail += 1
                            print(f"订单创建失败: {tracking_number}")
                            continue

                        trak_List.append(tracking_number)
                        time.sleep(1)  # 避免请求过快

                    except Exception as e:
                        print(f"创建订单时出错: {str(e)}")
                        fail += 1

                print(f"订单创建完成, 失败数: {fail}")

            # 第二阶段：处理订单流程
            if x >= 2 and trak_List:
                print("\n===== 开始处理订单流程 =====")
                for i, tracking_number in enumerate(trak_List):
                    try:
                        if i == 0:  # 第一个订单特殊处理
                            print(f"处理首单: {tracking_number}")
                            time.sleep(30)
                            OPS_Inbound(tracking_number, properties, ops_token)
                            time.sleep(10)
                            box_num = Outbound_Scan(tracking_number, properties, ops_token)
                        else:  # 后续订单
                            OPS_Inbound(tracking_number, properties, ops_token)
                            time.sleep(10)
                            Outbound_Scan(tracking_number, properties, ops_token, box_num)

                    except Exception as e:
                        print(f"处理订单 {tracking_number} 时出错: {str(e)}")
                        fail += 1

                # 后续流程处理
                try:
                    print("\n===== 开始后续流程 =====")
                    # 关闭箱子
                    Close_Box(box_num, trak_List, properties, ops_token)

                    time.sleep(10)

                    # 检查重量
                    print(f"检查箱子重量 {box_num}...")
                    Check_Weight(box_num, properties, ops_token, len(trak_List))
                    time.sleep(30)
                    shipment_num = shipment_add(properties, tms_token)
                    mawb_data = create(tms_token, properties)
                    shipmentbatchId = shipment_scan(box_num, shipment_num, properties, tms_token)
                    time.sleep(10)
                    shipment_close(shipmentbatchId, shipment_num, properties, tms_token)
                    time.sleep(5)
                    scan_box(box_num, mawb_data["mawb"], mawb_data["id"], tms_token, properties)
                    time.sleep(5)
                    close_mawb(mawb_data["mawb"], mawb_data["id"], tms_token, properties)
                    time.sleep(5)
                    mawb_status(mawb_data["id"], "OF", tms_token, properties)
                    # time.sleep(5)
                    # status(tracking_number, "OK", tms_token, properties, "签收成功")
                    # export_packing_list(tracking_number, tms_token,properties)
                    # time.sleep(10)
                    # check_file_urls(tms_token, properties)
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
                    print("\n===== 所有流程完成 =====")

                except Exception as e:
                    print(f"后续流程出错: {str(e)}")
                    fail += 1

            print(f"\n测试完成, 总失败数: {fail}")

        except Exception as e:
            print(f"测试发生未预期错误: {str(e)}")
            return False
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