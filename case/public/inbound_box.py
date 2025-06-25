import json
import time
from case.public.login import login
import requests



# token=login()
# header={"Content-Type":"application/json","Authorization":"Bearer "+token}
header={"Content-Type":"application/json","Authorization":"Bearer tMZcSymJgPQJZaXaENtdPgR0YmQIiMgWdjwWgmuxj8hrxQt8obg8dF9HMBtV"}
def inbound(big_box):
    # start =time.clock()
    # header={"Content-Type":"application/json","Authorization":"Bearer VdvTVVeahg0scVg5yFdCsJCpKmRKff6jTAcWaC35m0VGKuaQnlzQbyCKgGn4"}
    # r1=requests.post("http://stg.timespss.com/client-api/operation/inbound_box?boxid="+str(boxid)+"&token=355b5340ceafd369d8778aa3fbf8be962727a528&client_version=3.6.5",headers=header)
    # end = time.clock()
    # print('Running time: %s Seconds'%(end-start))
    # print(r1.text)
    # time.sleep(2)
    start1 =time.clock()

    r2=requests.post("http://stg.timespss.com/client-api/operation/inbound_box?boxid="+big_box+"&boxLength&boxWidth&boxHeight&boxSelfWeight&boxWeight=0.02&boxidType=formal_boxid&boxType=L&token=355b5340ceafd369d8778aa3fbf8be962727a528&client_version=3.6.5",headers=header)
    end1 = time.clock()
    #print('Running time: %s Seconds'%(end1-start1))
    print("inbound:"+r2.text)
def outbound(big_box):
    # start =time.clock()
    # header={"Content-Type":"application/json","Authorization":"Bearer VdvTVVeahg0scVg5yFdCsJCpKmRKff6jTAcWaC35m0VGKuaQnlzQbyCKgGn4"}
    # r1=requests.post("http://stg.timespss.com/client-api/operation/inbound_box?boxid="+str(boxid)+"&token=355b5340ceafd369d8778aa3fbf8be962727a528&client_version=3.6.5",headers=header)
    # end = time.clock()
    # print('Running time: %s Seconds'%(end-start))
    # print(r1.text)
    # time.sleep(2)
    start1 =time.clock()

    r2=requests.post("http://stg.timespss.com/client-api/operation/outbound_box?boxid="+big_box+"&boxLength&boxWidth&boxHeight&boxSelfWeight&boxWeight=0.02&boxidType=formal_boxid&boxType=L&token=355b5340ceafd369d8778aa3fbf8be962727a528&client_version=3.6.5",headers=header)
    end1 = time.clock()
    #print('Running time: %s Seconds'%(end1-start1))
    print("outbound:"+r2.text)
    return json.loads(r2.text)["boxid"]


