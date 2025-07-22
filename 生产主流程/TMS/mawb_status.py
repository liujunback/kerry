import datetime

import requests
import json


def mawb_status(idList, statu, token, properties):
    url = properties['tms_url'] + "/tms-saas-web/tms/oawbtrack/add2"

    # 固定的事件模板
    event_template = [
        {"id": None, "apiCode": "middlemile_uplift", "scanCode": "MU", "scanCodeName": "Middlemile departed",
         "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "middlemile_in_transit", "scanCode": "MT", "scanCodeName": "Middlemile in transit",
         "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "middlemile_arrived", "scanCode": "MA", "scanCodeName": "Middlemile arrived",
         "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "linehaul_pickup", "scanCode": "DT", "scanCodeName": "Linehaul pickup",
         "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "export_customs_clearance_start", "scanCode": "ES",
         "scanCodeName": "Export customs clearance start", "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "export_customs_clearance_success", "scanCode": "FX",
         "scanCodeName": "Export Custom Cleared", "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "air_freight_uplift", "scanCode": "OC", "scanCodeName": "Departure From Origin Port",
         "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "lh_in_transit", "scanCode": "LT", "scanCodeName": "LH In Transit",
         "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "air_freight_arrived", "scanCode": "OF", "scanCodeName": "Arrive Destination Port",
         "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "import_customs_clearance_noa", "scanCode": "NOA",
         "scanCodeName": "Cargo ready at terminal", "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "import_customs_clearance_start", "scanCode": "OS",
         "scanCodeName": "Import customs clearance start", "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "import_customs_clearance_success", "scanCode": "OQ",
         "scanCodeName": "Successful import clearance", "scanDatetime": None, "scanStation": None, "remark": None},
        {"id": None, "apiCode": "import_customs_handover_to_lastmile", "scanCode": "HL",
         "scanCodeName": "Handover to Lastmile", "scanDatetime": None, "scanStation": None, "remark": None}
    ]

    new_events = []
    for event in event_template:
        if event["scanCode"] == statu:
            updated_event = event.copy()
            updated_event["scanDatetime"] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            updated_event["scanStation"] = properties.get('station_code', 'CN')  # 默认使用CN
            new_events.append(updated_event)
        else:
            new_events.append(event)

    data = {
        "oldFormStr": json.dumps(event_template),
        "newFormStr": json.dumps(new_events),
        "codeType": "1",
        "isValidateLastSdDate": "1",
        "isValidateInputDate": "1",
        "isValidateFrontTrace": "0",
        "idList": str(idList),
        "token": token
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        response = requests.post(
            url=url,
            data=data,
            headers=headers,
            timeout=10
        )
        # 检查响应状态
        response.raise_for_status()

        # 解析JSON响应
        response_data = response.json()

        # 检查操作是否成功
        if  response_data.get("result_code") == 0:
            print(f"总运单 {idList} 状态更新成功 ({statu})")
            return True
        else:
            error_msg = response_data.get("msg") or response.text
            print(f"状态更新失败: {error_msg}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"请求异常: {str(e)}")
    except json.JSONDecodeError:
        print(f"响应解析失败: {response.text}")
    except Exception as e:
        print(f"未预期错误: {str(e)}")

    return False