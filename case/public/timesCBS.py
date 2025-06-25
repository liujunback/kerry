import re
from random import *

import requests
import time




res1 = requests.get('http://stg.timescbs.com/admin/login')
c_token=re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
login=requests.post('http://stg.timescbs.com/admin/login?username=back&password=test123&_token='+c_token,cookies=res1.cookies)
mawb=str(randint(100,999))+"-"+str(randint(1000,9999))
def CBS_create_mawb(boxid):#CBS登录

    print("mawb："+mawb)
    files={'_token':(None,c_token),
        'pickup_at':(None,'2021-05-16 20:55:13'),
        'mawb_number':(None,mawb),
        'linehaul_forwarder':(None,'PH-AIRBOX(S)'),
        'customs_clearance_forwarder':(None,'IMCC-Rich'),
        'boxid':(None,boxid)
       }
    handover_batch=requests.post("http://stg.timescbs.com/admin/order/batch-revise/mawb-boxid-post",data=files,cookies=login.cookies)
    if "successfully" in handover_batch.text:
        print("mawb-boxid_success")
    else:
        time.sleep(2)
        retry_handover=requests.post("http://stg.timescbs.com/admin/order/batch-revise/mawb-boxid-post",data=files,cookies=login.cookies)
        if mawb in handover_batch.text:
            print("retry_success")
        else:
            print("mawb_fild"+retry_handover.text)
    return mawb

def close_mawb(mawb):
    flight_at={'_token':(None,c_token),
        'mawb':(None,mawb),
        'file_data':(None,""),
        'export_at':(None,'2021-05-17 10:55:13'),
        'etd_at':(None,'2021-05-17 11:55:13'),
        'eta_at':(None,'2021-05-17 12:55:13'),
        'airline_name':(None,'111'),
        'airline_code':(None,'111'),
        'airport_code_origin':(None,'222'),
        'airport_code_destination':(None,'333'),
        'weight':(None,'11'),
        'mawb_gw':(None,'1111'),
        'mawb_cw':(None,'2222'),
        'flight':(None,'3333'),
        'uplift_at':(None,'2021-05-17 13:55:13'),
        'ata_at':(None,'2021-05-17 14:55:13'),
        'customs_on_hold_at':(None,''),
        'import_at':(None,'2021-05-17 15:55:13'),
        'handover_at':(None,'2021-05-17 16:55:13')
       }
    flight=requests.post("http://stg.timescbs.com/admin/order/batch-revise/post/normal",data=flight_at,cookies=login.cookies)
    if "update success" in flight.text:
        print("Mawb update success")
    else:
        retry_flight=requests.post("http://stg.timescbs.com/admin/order/batch-revise/post/normal",data=flight_at,cookies=login.cookies)
        if "submitted for background processing" in flight.text:
            print('close_mawb_retry_success')
        else:
            print("close_fild"+retry_flight.text)
