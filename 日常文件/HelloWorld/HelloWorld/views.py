import re
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
import json
import requests




@csrf_exempt
def hello(request):
    name = request.body.decode()
    #print(str(name))
    try:
        pro = request.POST['notifyBizEventDTO']
        print(pro)
    except Exception as e:
        print(name)
    import os
    path = os.getcwd()#获取当前路径
    open(path+"\HelloWorld\logs\log.log",'ab').write(str(name+"\n").encode('utf-8'))
    result = {"success":"true","message":"successfully.","code":0,"errorCode":"","errorMsg":""}
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def create(request):
    ctx={}
    if request.POST:
        from HelloWorld.public.login import login
        token=login()
        print(token)
        ctx["rt"] = token
    return render(request, "create.html", ctx)

@csrf_exempt
def search_post(request):

    from HelloWorld.public.login import login
    from HelloWorld.public.create import create_order
    from HelloWorld.public.inbound import inbound
    from HelloWorld.public.outbound import outbound
    from HelloWorld.public.close_box import close_box
    from HelloWorld.public.check_weight import check_weight
    from HelloWorld.public.shipment_add import shipment_add
    from HelloWorld.public.shipment_close import shipment_close
    from HelloWorld.public.shipment_num_scan import shipment_scan
    from HelloWorld.public.bag_create import date

    ctx ={}
    if request.POST:
        x  = int(request.POST['q'])
        country = request.POST['w']
        big = request.POST['a']
        token=login()
        tra_num_list = []

        if x>=1:
            if big =="big":
                data = date(2,country)
                ctx['tracking_number'] = data

            else:
                response = create_order(token,country)
                tracking_number = response["data"]["tracking_number"]
                tra_num_list.append(tracking_number)
                ctx['tracking_number'] = tracking_number
                ctx['rlt'] = json.dumps(response)

            if x>=2:
                import time
                time.sleep(20)
                inbound_text = inbound(tracking_number)
                ctx['inbound'] = inbound_text
                
                if x>=3:
                    outbound_text = outbound(tracking_number)
                    box_num = outbound_text['出库成功:箱号']
                    ctx['outbound'] = outbound_text

                    if x>=4:
                        close_box_text = close_box(box_num,tra_num_list)
                        check_weight(box_num,tra_num_list)
                        ctx['close_box'] = close_box_text

                        if x>=4:
                            time.sleep(15)
                            shipment_num = shipment_add()
                            shipment_num_ids = shipment_scan(box_num,shipment_num)
                            shipment_close_text = shipment_close(shipment_num_ids,shipment_num)
                            ctx['shipment_close'] = shipment_close_text

    return render(request, "post.html", ctx)

@csrf_exempt
def hello2(request):
    name = request.body.decode()
    print(str(name))
    result = {"response":{"result_type":"G-02-00-0-1-11-006","request_action":"StatusUpdate","request_time":"2021-12-01 18:08:44","records":{"new":"178","total":"188"},"success":"false","request_id":"1638353324","result_reason":"CODE: CNGFC_G_COMMON_DAL_ERROR, MESSAGE: please retry for network problems. 因网络抖动而处理失败，请重试, traceId:21329c3d16383533247583318edcbd"}}
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def hello1(request):
    name = request.body.decode()
    print(str(name))
    result = {"success":"true","message":"successfully.","code":0,"errorCode":"","errorMsg":""}
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def jdtest(request):
    from HelloWorld.public.JD.JD_create import JD_data
    name = request.body.decode()
    print(str(name))
    result = JD_data()
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response



@csrf_exempt
def robot(request):
    from HelloWorld.ICBU.order_inquire import Order_Inquire
    from HelloWorld.ICBU.Icbu_create import Icbu_Create
    from HelloWorld.ICBU.icbu_return import icbu_return
    from HelloWorld.ICBU.notifypaid import notifypaid
    from HelloWorld.public.login import login
    from HelloWorld.public.create import create_order
    from HelloWorld.robot.phone import phone
    from HelloWorld.ICBU.package_scan import package_scan
    from HelloWorld.public.inbound import inbound
    from HelloWorld.public.outbound import outbound
    from HelloWorld.public.close_box import close_box
    from HelloWorld.public.check_weight import check_weight
    from HelloWorld.public.shipment_add import shipment_add
    from HelloWorld.public.shipment_close import shipment_close
    from HelloWorld.public.shipment_num_scan import shipment_scan
    from HelloWorld.ICBU.status import state
    from HelloWorld.public.box_number_find import box_number_find
    from HelloWorld.public.Wish.Wish_Create import Wish_Create
    from HelloWorld.public.Wish.bag_create import bag_creat
    from HelloWorld.public.create_Mawb import create_mawb
    from HelloWorld.public.close_Mawb import  scan_box
    from HelloWorld.public.close_Mawb import close_mawb
    from HelloWorld.public.order_box import order_box
    from HelloWorld.public.box_scan import Box_scan
    from HelloWorld.public.cainiao.CaiNiao import CaiNiao_create

    token=login()
    ruquests = request.body.decode()
    url = json.loads(ruquests)["sessionWebhook"]
    data = json.loads(ruquests)["text"]["content"]
    print(data)
    name = json.loads(ruquests)["senderNick"]
    HEADERS={"Content-Type":"application/json;charset=utf-8"}
    String_textMsg={
        "at": {
                        "atMobiles": [
                            phone(name)
                        ],
                        "isAtAll": False
                    },
                    "msgtype":"text",
                    "text":{"content":"收到指令，异步执行中，稍后将给出结果。"}
    }
    res=requests.post(url,data=json.dumps(String_textMsg),headers=HEADERS)
    if "下个单" in data:
        country = re.findall(r"下个单，目的国代码：(.*)", data)
        response = create_order(token,country[0])
        String_textMsg["text"]["content"] = response
    elif "支付" in data:
        ref_num = re.findall(r"支付(.*)", data)[0]
        response = notifypaid(ref_num)
        String_textMsg["text"]["content"] = response
    elif "退货" in data:
        ref_num = re.findall(r"退货(.*)", data)[0]
        response = icbu_return(ref_num)
        String_textMsg["text"]["content"] = response
    elif "ICBU订单" in data:
        response = Icbu_Create()
        String_textMsg["text"]["content"] = response
    elif "WISH订单" in data:
        order_list=[]
        for i in range(1):
            data = Wish_Create()
            order_list.append(data[0])
        box_num = bag_creat(order_list)
        String_textMsg["text"]["content"] = {"tracking_number":order_list,"box_num":box_num}
    elif "菜鸟订单" in data:
        for i in range(1):
            data = CaiNiao_create()
        String_textMsg["text"]["content"] = data
    elif "揽收" in data:
        ref_num = re.findall(r"揽收(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = package_scan(ref_num)
        else:
            response = package_scan(tracking_number)
        String_textMsg["text"]["content"] = response
    elif "大包收货" in data:
        box_num = re.findall(r"大包收货(.*)", data)[0]
        response = Box_scan(box_num)
        String_textMsg["text"]["content"] = response
    elif "入库" in data:
        ref_num = re.findall(r"入库(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = inbound(ref_num)
        else:
            response = inbound(tracking_number)
        String_textMsg["text"]["content"] = response
    elif "出库" in data:
        ref_num = re.findall(r"出库(.*)", data)[0]
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = outbound(ref_num)
            box_num = response
            tra_list = []
            tra_list.append(ref_num)
            response = close_box(box_num,tra_list)
            check_weight(box_num,tra_list)
        else:
            response = outbound(tracking_number)
            box_num = response
            tra_list = []
            tra_list.append(ref_num)
            response = close_box(box_num,tra_list)
            check_weight(box_num,tra_list)
        String_textMsg["text"]["content"] = response
    elif "移交" in data:
        ref_num = re.findall(r"移交(.*)", data)[0]
        box_num = box_number_find(ref_num)
        shipment_num = shipment_add()
        shipment_num_ids = shipment_scan(box_num,shipment_num)
        shipment_close_text = shipment_close(shipment_num_ids,shipment_num)
        String_textMsg["text"]["content"] = shipment_close_text
    elif "干线" in data:
        ref_num = re.findall(r"干线(.*)", data)[0]
        mawb_data = create_mawb()
        box_num = order_box(ref_num)
        if box_num != '订单没有出库':
            scan_box(box_num,mawb_data['mawb'],mawb_data['id'])
            mawb_rep = close_mawb(mawb_data["mawb"],mawb_data["id"])
            String_textMsg["text"]["content"] = mawb_rep
        else:
            String_textMsg["text"]["content"] = box_num
    elif "补录货态" in data:
        ref_num = re.findall(r"补录货态(.+?)，", data)[0]
        statu = re.findall(r"，(.*)", data)[0]
        status_maping = {
                        "FX":"出口清关成功",
                        "OC":"航班起飞",
                        "OF":"航班抵达",
                        "OQ":"⽬的地清关完成",
                        "HL":"到达转运中心",
                        "ZY":"到达转运中心",
                        "IT":"离开转运中⼼",
                        "SP":"安排投递",
                        "RJ":"收件⼈拒绝签收",
                        "OK":"快件已签收",
                        "RN":"包裹退回到发件⼈",
                        "PD":"运输过程中出现异常",
                        "LS":"货物丢失",
                        "XH":"货物销毁",
                        "DM":"货物损坏"}
        tracking_number = Order_Inquire(ref_num)#查询运单号
        if tracking_number == "没有订单":
            response = state(ref_num,statu,status_maping[statu])
        else:
            response = state(tracking_number,statu,status_maping[statu])
        String_textMsg["text"]["content"] = response
    else:
        String_textMsg["text"]["content"] = "改功能暂时不支持。"
    requests.post(url,data=json.dumps(String_textMsg),headers=HEADERS)#发送给机器人
    result = {"code":0,"msg":"Success"}
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    return response


@csrf_exempt
def shopee(request):
    name = request.body.decode()
    print(str(name))
    import os
    path = os.getcwd()#获取当前路径
    open(path+"\HelloWorld\logs\log.log",'ab').write(str(name+"\n").encode('utf-8'))
    result = {
                "message": "this is a test message, detail [this is a test detail]",
                "data": {
                "error_list": [{
                    "error_message": "asfdsfsdf",
                    "error_code": "0000",
                    "sls_tn": "sfsdfsdf"
                }]
                },
                "retcode": 1
            }
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def shopee2(request):
    name = request.body.decode()
    print(str(name))
    import os
    path = os.getcwd()#获取当前路径
    open(path+"\HelloWorld\logs\log.log",'ab').write(str(name+"\n").encode('utf-8'))
    result = {
                "message":"this is a test message, detail [this is a test detail]",
                "retcode":1
            }
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response

@csrf_exempt
def shopee3(request):
    name = request.body.decode()
    print(str(name))
    import os
    path = os.getcwd()#获取当前路径
    open(path+"\HelloWorld\logs\log.log",'ab').write(str(name+"\n").encode('utf-8'))
    result = {
                "message":"this is a test message, detail [this is a test detail]",
                "retcode":1
                }
    response =  HttpResponse(json.dumps(result), content_type="application/json")
    response.status_code==200
    return response















