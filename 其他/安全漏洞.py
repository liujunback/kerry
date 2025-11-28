from time import sleep

import requests




for i in range(30):
    url = "https://oms-eng.kec.kln.cn//tms-saas-oms/user/sendverificationcode?"
    phoneNumber = 131123421112 + i
    url = url + "phoneNumber=" + str(phoneNumber)

    payload = ""
    headers = {
      'token': 'eyJ0-W1l#3RhbXAiOjE3$TI4OT$zNDk0NTAsIm5vbmNlIjoiY3NoRVlR$kgiLCJ0b2tlbiI6IjJmZDFhYjVjLTBl$jgtND#wNC1iOGUwLWRkY2Uz$W$^ZGViNiJ9'
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    print(url)
    print(response.text)
    sleep(1)
