import json
import re
import requests



#--------------------------------------pss移交-------------------------------------------------

res1 = requests.get('http://stg.timespss.com/admin/login')
c_token=re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
r1=requests.post('http://stg.timespss.com/admin/login?username=testback&password=123456&_token='+c_token,cookies=res1.cookies)
headers={"X-CSRF-TOKEN": c_token}
def HandOver_cerate():

    create=requests.post("http://stg.timespss.com/admin/scan-handover-new/create?create_handover_centre_id=1",cookies=r1.cookies,headers=headers)
    hanover_number=re.findall(r"http://stg.timespss.com/admin/scan-handover-new/operate/(.*)", json.loads(create.text)['url'])[0]
    return hanover_number

def HandOver_boxid(boxid,hanover_number):
    url1=str("http://stg.timespss.com/admin/scan-handover-new/scan?boxid="+boxid+"&handover_number="+hanover_number+"&handover_group=")
    scan=requests.post(url=url1,cookies=r1.cookies,headers=headers)
    #print("scan_box"+scan.text)


def HandOver_close(hanover_number):
    close=requests.post(url="http://stg.timespss.com/admin/scan-handover-new/close?handover_number="+hanover_number+"&printer_qr_code=%7B%22server%22%3A+%22wss%3A%2F%2Fprint.tec-api.com%3A22212%2Fprinter%22%2C+%22type%22%3A+%22-%22%2C+%22id%22%3A+%22-%22%7D",cookies=r1.cookies,headers=headers)
    print(hanover_number)
    #print("close_HandOver："+close.text)
    #print("close_HandOver："+"success")
    files={'_token':(None,c_token),
            'resource_code':(None,'HK-WLF'),
            'driver':(None,'123'),
           'car_plate':(None,'123'),
            'handover_numbers':(None,hanover_number)
           }
    handver_batch=requests.post("http://stg.timespss.com/admin/handover/batch",data=files,cookies=r1.cookies)
    if "繁/简/EN" in handver_batch.text:
        pass
        #print("batch_success")
    else:
        print("绑定失败"+handver_batch.text)