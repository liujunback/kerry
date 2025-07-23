import json

import requests



def export_packing_list(jobno: str, token: str,properties, timeout: int = 30):

    # 构建请求URL
    endpoint = "/tms-saas-web/tms/oawb/packinglist/export2"
    url = properties['tms_url'] + endpoint
    # 结构化请求参数
    params = {
    "token": token,
        "tempId": properties['temp_Id'],
        "exportType": "desig",
        "typeId": 44,
        "isSave": 0,
        "tempName": properties['temp_Name'],  # 中文无需手动编码
        "isAsynch": 1,
        "colStr": "",
        "fileType": "excel",
        "paramStr": json.dumps({"codeType":"5","jobnoStr":jobno,"isDecryptData":0,"jobnoList":[jobno]})
    }

    # 准备请求头
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    try:
        # 发送请求 - 自动处理URL编码
        response = requests.post(
            url,
            data=params,
            headers=headers,
            timeout=timeout
        )
        # 处理响应
        response.raise_for_status()  # 检查HTTP错误

        if  response.get("result_code") == 0:
            print(f"异步导出报表成功：{properties['temp_Name']}")
            return True
        else:
            error_msg = response.get("msg") or response.text
            print(f"异步导出报表失败: {error_msg}")
            return False


    except requests.exceptions.RequestException as e:
        return False


import requests
from typing import Dict, List, Any, Union

import json
import requests
from typing import Dict, Any, List


def check_file_urls(token: str, properties: Dict[str, str], timeout: int = 10) -> Dict[str, Any]:
    """
    检查文件列表中所有文件URL的有效性

    :param token: 认证token
    :param properties: 系统配置参数
    :param timeout: 请求超时时间（秒）
    :return: 包含检查结果的字典
    """
    # 1. 获取文件列表
    try:
        print("\n" + "=" * 50)
        print("开始获取文件列表...")
        endpoint = "/tms-saas-web/cmn/excel/list"
        url = properties['tms_url'] + endpoint + f"?token={token}"

        response = requests.get(url, timeout=timeout)
        response.raise_for_status()

        # 检查API响应结构
        try:
            response_json = response.json()
        except json.JSONDecodeError:
            print("错误: 响应不是有效的JSON格式")
            return {
                "success": False,
                "error": "Response is not valid JSON"
            }

        if "body" not in response_json or not isinstance(response_json["body"], list):
            print("错误: 响应结构无效 - 'body'字段缺失或不是列表")
            return {
                "success": False,
                "error": "Invalid API response structure: 'body' field is missing or not a list"
            }

        file_list = response_json["body"]
        print(f"成功获取 {len(file_list)} 个文件信息")

        # 打印文件列表摘要
        if file_list:
            print("\n文件列表摘要:")
            for i, file_info in enumerate(file_list[:3]):  # 只显示前3个
                print(
                    f"  {i + 1}. ID:{file_info.get('id')} 文件名:{file_info.get('excelName')} 状态:{file_info.get('status')}")
            if len(file_list) > 3:
                print(f"  ... 还有 {len(file_list) - 3} 个文件未显示")
        else:
            print("警告: 文件列表为空")

    except requests.exceptions.RequestException as e:
        error_msg = f"API请求失败: {str(e)}"
        print(error_msg)
        return {
            "success": False,
            "error": error_msg,
            "status_code": getattr(e.response, 'status_code', None)
        }
    except (json.JSONDecodeError, ValueError) as e:
        error_msg = f"响应解析失败: {str(e)}"
        print(error_msg)
        return {
            "success": False,
            "error": error_msg
        }

    # 2. 检查每个文件的URL
    print("\n" + "=" * 50)
    print(f"开始检查 {len(file_list)} 个文件的URL...")

    results = []
    valid_count = 0
    invalid_count = 0

    for idx, file_info in enumerate(file_list, 1):
        file_id = file_info.get("id")
        file_name = file_info.get("excelName")
        file_url = file_info.get("fileUrl")
        file_status = file_info.get("status", -1)

        print(f"\n检查文件 {idx}/{len(file_list)}:")
        print(f"  ID: {file_id}, 文件名: {file_name}")
        print(f"  文件状态: {file_status}, URL: {file_url}")

        # 检查是否存在URL字段
        if not file_url:
            reason = "响应中缺少fileUrl字段"
            print(f"  ❌ 无效: {reason}")
            result = {
                "file_id": file_id,
                "file_name": file_name,
                "status": "invalid",
                "reason": reason,
                "http_status": None
            }
            invalid_count += 1
            results.append(result)
            continue

        # 验证URL格式
        if not file_url.startswith("http"):
            reason = "URL格式无效 (缺少http/https)"
            print(f"  ❌ 无效: {reason}")
            result = {
                "file_id": file_id,
                "file_name": file_name,
                "status": "invalid",
                "reason": reason,
                "http_status": None
            }
            invalid_count += 1
            results.append(result)
            continue

        # 3. 检查URL可访问性
        try:
            print(f"  正在检查URL可访问性...")

            # 使用HEAD方法检查
            head_response = requests.head(
                file_url,
                headers={"User-Agent": "FileURLValidator/1.0"},
                timeout=timeout,
                allow_redirects=True
            )

            http_status = head_response.status_code
            print(f"  HEAD请求状态码: {http_status}")

            # 判断状态码
            if 200 <= http_status < 300:
                status = "valid"
                reason = "HEAD请求成功"
                valid_count += 1
                url = properties['tms_url'] + "/tms-saas-web/cmn/excel/update"
                payload = f'id={file_id}&token={token}'
                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
                response = requests.request("POST", url, headers=headers, data=payload)
                if response.json().get("result_code") == 0:
                    print(f"更新文件状态成功：下载成功")
                    return True
                print(f"  ✅ 有效: {reason}")
            else:
                # 尝试GET方法获取更多信息（当HEAD不被支持时）
                if http_status == 405:
                    print("  HEAD方法不被支持，尝试GET请求...")
                    get_response = requests.get(
                        file_url,
                        headers={"User-Agent": "FileURLValidator/1.0", "Range": "bytes=0-0"},
                        timeout=timeout
                    )
                    http_status = get_response.status_code
                    print(f"  GET请求状态码: {http_status}")

                    if 200 <= http_status < 300:
                        status = "valid"
                        reason = "GET请求成功"
                        valid_count += 1
                        print(f"  ✅ 有效: {reason}")
                    else:
                        status = "invalid"
                        reason = f"GET请求失败 (HTTP {http_status})"
                        invalid_count += 1
                        print(f"  ❌ 无效: {reason}")
                else:
                    status = "invalid"
                    reason = f"HEAD请求失败 (HTTP {http_status})"
                    invalid_count += 1
                    print(f"  ❌ 无效: {reason}")

            result = {
                "file_id": file_id,
                "file_name": file_name,
                "status": status,
                "reason": reason,
                "http_status": http_status,
                "url": file_url
            }

        except requests.exceptions.RequestException as e:
            status = "invalid"
            http_status = getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None
            reason = f"连接错误: {str(e)}"

            print(f"  ❌ 无效: {reason}")
            result = {
                "file_id": file_id,
                "file_name": file_name,
                "status": status,
                "reason": reason,
                "http_status": http_status,
                "url": file_url
            }
            invalid_count += 1

        results.append(result)

    # 4. 返回汇总结果
    print("\n" + "=" * 50)
    print("文件URL检查完成!")
    print(f"总文件数: {len(file_list)}")
    print(f"有效文件: {valid_count} ({valid_count / len(file_list) * 100:.1f}%)")
    print(f"无效文件: {invalid_count} ({invalid_count / len(file_list) * 100:.1f}%)")

    # 打印无效文件的详细信息
    if invalid_count > 0:
        print("\n无效文件详情:")
        for res in results:
            if res["status"] == "invalid":
                print(f"  ID: {res['file_id']}, 文件名: {res['file_name']}")
                print(f"    原因: {res['reason']}")
                print(f"    URL: {res['url']}")

    print("=" * 50 + "\n")

    return {
        "success": True,
        "total_files": len(file_list),
        "valid_files": valid_count,
        "invalid_files": invalid_count,
        "file_results": results,
        "all_valid": invalid_count == 0
    }


