import requests
import json



def Cancel_Order(properties,foms_token,cancel_order):

    url = properties["url"] + "/api/foms/v2/order/delete"

    payload = json.dumps({
      "order_number": cancel_order
    })
    headers = {
      'Authorization': 'Bearer ' + foms_token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)['code'] in [202,201]:
        print("取消订单成功：" + cancel_order)
        print("")
        # return  cancel_order
    else:
        print(response.text)
