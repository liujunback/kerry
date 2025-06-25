
import time
import hmac
import hashlib
import base64
import urllib.parse
def sign():
    timestamp = str(round(time.time() * 1000))
    secret = 'SECa8cc69c816c5bc45850641bc0e42087dbe13d00c3fea1cd38459e6e5dd496ff4'
    secret_enc = secret.encode('utf-8')
    string_to_sign = '{}\n{}'.format(timestamp, secret)
    string_to_sign_enc = string_to_sign.encode('utf-8')
    hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
    return {
        "timestamp":timestamp,
        "sign":sign
    }


import json

import requests
def test(txt):
    url='https://oapi.dingtalk.com/robot/sendBySession?session=b78a019116e1fd88ce036d587154d1ad'

    HEADERS={"Content-Type":"application/json;charset=utf-8"}

    String_textMsg={
        "at": {
                        "atUsers": [
                            "$:LWCP_v1:$z0+7EHxeUjGvBPgtXWw+NjpwctGJWBiu"
                        ],
                        "isAtAll": False
                    },
                    "msgtype":"text",
                    "text":{"content":"tes112e12t"}
    }

    String_textMsg=json.dumps(String_textMsg)

    res=requests.post(url,data=String_textMsg,headers=HEADERS)

    print(res.text)
