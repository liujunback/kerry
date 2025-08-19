import pandas as pd
import json
from collections import defaultdict


def merge_jsons_to_excel(json_list, output_file):
    """
    将多个JSON对象合并写入Excel文件

    参数:
        json_list: JSON对象列表 (字典或字符串列表)
        output_file: 输出的Excel文件名 (带.xlsx后缀)
    """
    # 用于收集所有记录的列表
    all_records = []

    # 收集所有可能的字段
    all_fields = set()

    # 处理每个JSON对象
    for json_data in json_list:
        # 如果输入是字符串，转换为字典
        if isinstance(json_data, str):
            data = json.loads(json_data)
        else:
            data = json_data

        # 处理嵌套的orderItems结构
        if "orderItems" in data and isinstance(data["orderItems"], list):
            # 提取父级数据
            parent_data = {k: v for k, v in data.items() if k != "orderItems"}

            # 为每个订单项创建完整记录
            for item in data["orderItems"]:
                record = parent_data.copy()
                record.update(item)
                all_records.append(record)
                all_fields.update(record.keys())
        else:
            all_records.append(data)
            all_fields.update(data.keys())

    # 创建有序字段列表 (按字母顺序排序)
    sorted_fields = sorted(all_fields)

    # 创建最终数据列表，确保字段顺序一致
    final_data = []
    for record in all_records:
        ordered_record = {field: record.get(field, "") for field in sorted_fields}
        final_data.append(ordered_record)

    # 创建DataFrame并保存为Excel
    df = pd.DataFrame(final_data)

    # 保存到Excel
    df.to_excel(output_file, index=False)
    print(f"成功写入 {len(all_records)} 条记录到 {output_file}")


# 使用示例
if __name__ == "__main__":
    # 示例JSON列表
    json_list = [
        {"country": "110", "currency": "142", "cusName": "test", "ebcCode": "", "ebcName": "", "ebpCode": "无",
         "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.140, "logisticsNo": "YTMX5080600686596",
         "orderItems": [
             {"gcode": "9506621000", "gmodel": "1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211140-3|||",
              "itemName": "篮球", "itemNo": "1825211140-3", "price": 505.0000, "qty": 1, "qty1": 1.00000,
              "unit": "007"}], "referenceNo": "MX5080600686596"},{"country":"110","currency":"142","cusName":"AgV4YcFbdRGPyahWN+WM893qjyervEj3WYf7fTk3UPrkGA8AXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREFra2xSQ2lrSFo1cGtla3lCVVRWeTcwVXMwODgxZ1ZKLy85aUhUT2d0cnhDeVFZQ2wwR0NmQlVWQ204b3U3Q01OUT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAXplmcvEZx+KxxlSZ/ITidoAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxw+gQcrX1J5EgDLZwCARCAO3Es8z68/Ex+tYd9lnyclZ2Rqd6koKx2gZTy6qACjCrCmy97ofkxLJoFQr+JgaeIazhqqpPvl0dZJW3HAgAAEABtFNkQ4rGG61d+zYh/qEaIhszepZQ+aXKxfAfbqJ0647UNHq/CEZ5i0nI3wjMA473/////AAAAAQAAAAAAAAAAAAAAAQAAAAQzRBMSYVA9ms9GwutPNuzG2k6B/wBnMGUCMFW82bO7zdaTPa74YEfOcorlMYPFpD9dz+I/L7dGNDbyme//5Lysv4Y8DRnm+gAZvAIxANR6BQefTn8rOl2x3HIclydmsrUPYWSOpI1tDqrPe3tpTgSR4+UCYLOdLhe2+j5t0A==AWSSECRETDATA","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.140,"logisticsNo":"YTMX5080600686597","orderItems":[{"gcode":"9004909000","gmodel":"1|0|用途:游泳用|类型:PC镜|品牌: 中文品牌: 安踏 英文品牌: ANTA|型号:1823531305-4|||","itemName":"镀膜泳镜","itemNo":"1823531304-1","netWeight":0.500,"price":315.7700,"qty":1,"qty1":0.50000,"unit":"007"}],"referenceNo":"MX5080600686597"},
        {"country": "110", "currency": "142", "cusName": "test", "ebcCode": "", "ebcName": "", "ebpCode": "无",
         "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.900, "logisticsNo": "YTMX5080600686598",
         "orderItems": [{"gcode": "6404199000",
                         "gmodel": "1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-5|||",
                         "itemName": "沙滩凉鞋", "itemNo": "912428502-5", "netWeight": 0.500, "price": 1278.0000,
                         "qty": 1, "qty1": 0.50000, "unit": "025"}], "referenceNo": "MX5080600686598"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.050,"logisticsNo":"YTMX5080600686599","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-4|||","itemName":"沙滩凉鞋","itemNo":"912428502-4","netWeight":1.050,"price":1294.0000,"qty":1,"qty1":1.05000,"unit":"025"}],"referenceNo":"MX5080600686599"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4OA1wqwv+t+MYjAih9mU4qaLDUd4xQx3QpQBV+dkOYIgAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREExNWkrUk9Zc3pxNFNPYVJldDMycC92aS93TzdTYlZyOTRLdVkxTDFYTGl5UnBINjZKaTFsMDB2Tjg4Y1pCd2FVZz09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAU5N0KqfHN/T83ttbXWZrGwAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxQjuWK/XUKiZpoz5ACARCAO1DhDZkjsHCOAefPAmP76tZFyMAlOs18Ekf0u9ZZGPtLmDWL6UkLIkwGOOPUoPfb7MqAomQz5A5lDSXaAgAAEACiV843InK1/a246wqLsRJXzy8GH3BGCKUPrrIEe1IlDvpYtdBxb9tLjOQh50QpP8D/////AAAAAQAAAAAAAAAAAAAAAQAAAATyOsGnfUi4f7kHy6RGJqLJ81GKoABnMGUCMQDT/V0iOF2BuWl2ddk7fFlWmYxVl+PPZNQu0y179ahFn4Nkv3ST/9ArRqTUV6ZhXfkCMA75or5Av7RKbN1Xwl93dMAoMhd79yIwkRUZr40Lyj02C/oERDX4IwaMTvSC90UiCw==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.140,
         "logisticsNo": "YTMX5080600686600", "orderItems": [
            {"gcode": "9506621000", "gmodel": "1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211132-1|||",
             "itemName": "篮球", "itemNo": "1825211132-1", "price": 668.0000, "qty": 1, "qty1": 1.00000,
             "unit": "007"}], "referenceNo": "MX5080600686600"},{"country":"110","currency":"142","cusName":"AgV4AlVVChHTovGIA2DQdxw1+C6FwxqdcZuxhm2uRU2MHjsAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREEvWlIrTUJtM0trczc3ZHM2SkZMVzBwUWNzMzFQN1VFbW1TeVMra1p6YTNaajFNYk11Q3ZFZnZBKytrTGxLZzVRQT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OASvGQJ6kU6naf8YQ6dVC4UsAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAyRb3f55PsV4RP8ygsCARCAO+l8YRyejSvxo6P/ahsfXod68AOhrvWqDQ/LxIRW1o9DRI1i9qhk5n/aY1Qxq+kAifMypbgizm8dth5jAgAAEACspfymZBh5eMZqBxCxQuhxkHssKEIy4ViCtdAZHlFGTXhxeRh9lHw87GzDvcJ7Mln/////AAAAAQAAAAAAAAAAAAAAAQAAAAQRXoqAyagb2D3OldPmnj1cuVbydwBnMGUCMAFGXxr46uDzi5Mh7eWqcp9F+nj3IlxRU4dLdNMgUvBTVICTi8sOocdcVZfosUSXXAIxAKlh49ub4V3r6WyITpKs5rLuhiFyvBevWIgA/WAQbbmGj/Ha031pzFzRsRE4H58Npw==AWSSECRETDATA","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.037,"logisticsNo":"YTMX5080600686601","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912528504-2|||","itemName":"沙滩凉鞋","itemNo":"912528504-2","netWeight":0.500,"price":1916.0000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5080600686601"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4dAepXfGYrs2Chzr0ZKMpM3iXgimRdGTCBYe2M3dOlfwAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREFrbjVra2dPWkY1UjkvSnFwZkJXVDF0Z01abVJSTGh4MmtKMWdSU1BKbnNhQ0FxTzlsSkRmdTM4R2J3aG1YVXhPQT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAatv7ut0xyIy+hc/IGzFItYAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAw4N3WxKIUSv278Oz4CARCAO3sDui5fNHfLq7vzgdgLAgpN9DYhLQv1c2tjMHtQ47FvzcauDqwQNYq1qBCBuFNu791ct4mHgdoeP/h/AgAAEACYxUCx6MeJurALcoeZrqHi5VHPmAUp8JSf+NXRAp/GoZfw0eolLnNtAfkuOqWZgxT/////AAAAAQAAAAAAAAAAAAAAAQAAAAQ3oOSsLwib0LjIX3xbM5XN9lZTQwBnMGUCMQCi4DXc4G5pHVbXZk9Ia+KsbJvtqgGBqYyv+afDBapyJTVvmyxvn8IU/5OAWH1ibWACMDjkbD8o1RfWqlUPIeu0FLbvh/xJjuRHgi0EUUSg6VamzV1zqyGAlZmSSHUMxKQCig==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 1.050,
         "logisticsNo": "YTMX5080600686602", "orderItems": [{"gcode": "6404199000",
                                                             "gmodel": "1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-4|||",
                                                             "itemName": "沙滩凉鞋", "itemNo": "912428502-4",
                                                             "netWeight": 1.050, "price": 1384.0000, "qty": 1,
                                                             "qty1": 1.05000, "unit": "025"}],
         "referenceNo": "MX5080600686602"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4baev59oGNWVtEMrUH4vXDvOfblnR8lbTR822Y5241RcAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREFwOVVXTlRybXRyTEhBTVVjUWpOV2p0a1ZiaENxdDlOeVZhUEV6M0tpQ1FXWVFpaXVrV2dGOHpWV0M5VFMyUS83QT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAVFd1ioNkJa/xEUdG+PZUJ4AAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAyufK8Xu3gvV910rWcCARCAOz6ZQl33W+aZEk6hmouw9AaYxDAgT8Cw6GS9u033DaboNdhHhngia8f1bNkInCksbmjp3rJYxqhnN3ZuAgAAEAAtRLsLL1qMIDzXcmoTSuQKN/xOVxXaCHS7ugXnOSAxZ5PkKxC+LOcD0l2YSUz35Qv/////AAAAAQAAAAAAAAAAAAAAAQAAAAT+56TzGlSHwfExsjpeM/gnrW/9rABnMGUCMChjn4DvI2cvk5DdIQ6ZqW6SZH+y8BR6s9x0Xh213Z+cfoyukTcRrvQwTu91h/W5SwIxALrOOODKH5SIy+UJWEfAau4VnCBnTvym6Drj9QXjdwHrcwUbNAfF3Ni2MKb1c7EEmA==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.816,
         "logisticsNo": "YTMX5080600686603", "orderItems": [{"gcode": "6404199000",
                                                             "gmodel": "1|0|款式:未过踝|鞋面材料:网布/橡塑材料/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445504-6|||",
                                                             "itemName": "休闲鞋", "itemNo": "112445504-6",
                                                             "netWeight": 0.750, "price": 2402.0000, "qty": 1,
                                                             "qty1": 0.75000, "unit": "025"}],
         "referenceNo": "MX5080600686603"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.900,"logisticsNo":"YTMX5080600686605","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-5|||","itemName":"沙滩凉鞋","itemNo":"912428502-5","netWeight":0.500,"price":1188.0000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5080600686605"}
        ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.652,"logisticsNo":"YTMX5080600686606","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:1125B5576-1|||","itemName":"跑鞋","itemNo":"1125B5576-1","netWeight":0.500,"price":9619.0000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5080600686606"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4Wk5X9vDeHXrtXH8Jgb1RLkFbfjO9rHritMK07y7IyWoAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREFrU1hIYmVvN2JkaGNnR2IzZ3A2SEVSdW5NWVZNcFZZb1djN2ExM1ptK21BWGRMZEFkSmdOdE42aVNIcytxRmJaZz09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAczMi7iew3CBdup8e7zZ8ZoAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxu+ssGx5/zq+RUW14CARCAOy34gGImqqYf7GP1Owa3tCtg0Zw257pkLwZqfx0mXZM5VrdXgB22l3sBciU6sN3XgYW2C5H9LXtZBcUNAgAAEAB000cdLTHHG1FH2tExCNewnx2/n8tk7KKFezyNf9SIbM0/BXfScxxhrMihLNmIsHH/////AAAAAQAAAAAAAAAAAAAAAQAAAATRTBK0eNDSxsrPXjoW3VLEk0r+zwBnMGUCMBbsvqcx1c89nAxYY34ptHkR0F92a8FF4zhheh1ROpJZ7x47/fV7m3ejzDZ/qt/LBwIxAJ/L1LVUbkwEOE/DepEp7aaNYG/FAiROf7MFrtCEIVkW9ziNh9TzBd6J3oJ/qTLT3A==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 1.050,
         "logisticsNo": "YTMX5080600686607", "orderItems": [{"gcode": "6404199000",
                                                             "gmodel": "1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-5|||",
                                                             "itemName": "沙滩凉鞋", "itemNo": "912428502-5",
                                                             "netWeight": 0.500, "price": 1278.0000, "qty": 1,
                                                             "qty1": 0.50000, "unit": "025"}],
         "referenceNo": "MX5080600686607"},
        {"country": "110", "currency": "142", "cusName": "test", "ebcCode": "", "ebcName": "", "ebpCode": "无",
         "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.931, "logisticsNo": "YTMX5080600686608",
         "orderItems": [{"gcode": "6404199000",
                         "gmodel": "1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912425588-1|||",
                         "itemName": "跑鞋", "itemNo": "912425588-1", "netWeight": 0.500, "price": 2419.0000, "qty": 1,
                         "qty1": 0.50000, "unit": "025"}], "referenceNo": "MX5080600686608"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4IkWLb49o5pevyMN1cv8uUYh3U9XbLlDY/1RpsZxN7WQAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREF2N1k2OTIwdTUrM2k1Q2ZVbVhrN0RhWnpXa1VMbXJWWllxT3pmeGtZNEJRek5tTnNLUEozQ1BULzRGeVora1FOUT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OASW0yW11xhg69Nl6YZRjbToAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAyMAAeeWbtXx9qrfeoCARCAOzUHzZkrSqRaTg4p7v7uigKbiXt4ZFKKNg43lP7NQ4aeUn4GAb6oEZbyf1yn9Oxz2meAwRQ1fwZXB8/bAgAAEABTzRmDZjFVSRBsR63z4BFYsJafid4tyLGxMsOmVsOQ2dmKFvREit4fW5QmrHF32OX/////AAAAAQAAAAAAAAAAAAAAAQAAAAS25B+DP/fz6LlD1N9Tudkpv8L1ZgBnMGUCMQCPuS5eyI6H9IBFrc4/RYrvyJv9H07Neb2kqk6wxEf13Fw2tQtsLuDzje28dkOaYwwCMFfYzaaEAykdHp2FuKEe96Wr49lo8zf9DbMVGJfUP7wGax6t2jSLDeP+Q4E1g81FAg==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.140,
         "logisticsNo": "YTMX5080600686609", "orderItems": [{"gcode": "9004909000",
                                                             "gmodel": "1|0|用途:游泳用|类型:PC镜|品牌: 中文品牌: 安踏 英文品牌: ANTA|型号:1823531305-4|||",
                                                             "itemName": "成人近视泳镜", "itemNo": "1825332709-1",
                                                             "netWeight": 0.500, "price": 342.1600, "qty": 1,
                                                             "qty1": 0.50000, "unit": "007"}],
         "referenceNo": "MX5080600686609"},
        {"country": "110", "currency": "142", "cusName": "test", "ebcCode": "", "ebcName": "", "ebpCode": "无",
         "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.294, "logisticsNo": "YTMX5080600686611",
         "orderItems": [
             {"gcode": "6110300090", "gmodel": "4|3|针织|不是起绒|男式|不为背心|聚酯纤维100%|安踏|D0112NKT00-RD",
              "itemName": "男针织运动上衣", "itemNo": "952527706-7", "price": 1150.0000, "qty": 1, "qty1": 1.00000,
              "unit": "011"}], "referenceNo": "MX5080600686611"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.151,"logisticsNo":"YTMX5080600686613","orderItems":[{"gcode":"9004909000","gmodel":"1|0|用途:游泳用|类型:PC镜|品牌: 中文品牌: 安踏 英文品牌: ANTA|型号:1823531305-2|||","itemName":"成人泳镜","itemNo":"1825332715-2","netWeight":0.500,"price":347.0000,"qty":1,"qty1":0.50000,"unit":"007"}],"referenceNo":"MX5080600686613"},
        {"country": "110", "currency": "142", "cusName": "test", "ebcCode": "", "ebcName": "", "ebpCode": "无",
         "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.140, "logisticsNo": "YTMX5080600686614",
         "orderItems": [
             {"gcode": "9506621000", "gmodel": "1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211140-2|||",
              "itemName": "篮球", "itemNo": "1825211140-2", "netWeight": 1.000, "price": 459.5500, "qty": 1,
              "qty1": 1.00000, "unit": "007"}], "referenceNo": "MX5080600686614"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.978,"logisticsNo":"YTMX5080600686616","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:1124F1606-2|||","itemName":"篮球鞋","itemNo":"1124F1606-2","netWeight":1.000,"price":1740.0000,"qty":1,"qty1":1.00000,"unit":"025"}],"referenceNo":"MX5080600686616"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4qyC2epzNeNa3fKEuDRqw2mpbEuepRsVZel/8Da+KElYAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREExTXJLencxWEhvMEh3VC9VVTFDQnlIZmFoRnVKMWtYdzl6dHJvbzVvNUFnRWpTNlpGZlFNRi9HUkZydmdHSkUyUT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAdZFk5eh2SlBcu/EmnTS1LoAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAyepfrPgwwGy5bSpuECARCAOy0CSSG4ArBBR/PPaY3BPxVM2s1+FFYXfv3BALVU7SM29kPca3LQxDgg34IboaR68OgYOcnUQCwRzhU5AgAAEACwAopqMiVKdhEospFGhwdTmrmYxlXilGH2ey33hqldeh49jGTQCX4d6Da8YDVU1HD/////AAAAAQAAAAAAAAAAAAAAAQAAAARyvpG1khyaTCgIX0sPDw6GA2fyHQBnMGUCMANal178Vhq20T3XDz4Qo9wiEQIW7DkjQKOBF2xavy9sYqY2CU//6JY1R7KV447UBQIxAOeHTFohY3yn+XccCNl8Obq8F6v1seferI8KO8sZNEl/WIpwyHur7uoI8tEyLYFDyQ==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.984,
         "logisticsNo": "YTMX5080600686617", "orderItems": [{"gcode": "6404199000",
                                                             "gmodel": "1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:A312411108-3|||",
                                                             "itemName": "篮球鞋", "itemNo": "A312411108-3",
                                                             "netWeight": 1.000, "price": 1278.0000, "qty": 1,
                                                             "qty1": 1.00000, "unit": "025"}],
         "referenceNo": "MX5080600686617"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.050,"logisticsNo":"YTMX5080600686618","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-4|||","itemName":"沙滩凉鞋","itemNo":"912428502-4","netWeight":1.050,"price":1294.0000,"qty":1,"qty1":1.05000,"unit":"025"}],"referenceNo":"MX5080600686618"},
        {"country": "110", "currency": "142", "cusName": "test", "ebcCode": "", "ebcName": "", "ebpCode": "无",
         "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.930, "logisticsNo": "YTMX5080600686619",
         "orderItems": [{"gcode": "6404199000",
                         "gmodel": "1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445570-5|||",
                         "itemName": "跑鞋", "itemNo": "112445570-5", "netWeight": 0.500, "price": 4029.0000, "qty": 1,
                         "qty1": 0.50000, "unit": "025"}], "referenceNo": "MX5080600686619"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.140,"logisticsNo":"YTMX5080600686620","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211141-1|||","itemName":"篮球","itemNo":"1825211141-1","price":568.0000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5080600686620"},
        {"country": "110", "currency": "142", "cusName": "test", "ebcCode": "", "ebcName": "", "ebpCode": "无",
         "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.140, "logisticsNo": "YTMX5080600686621",
         "orderItems": [
             {"gcode": "9506621000", "gmodel": "1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211140-3|||",
              "itemName": "篮球", "itemNo": "1825211140-3", "price": 505.0000, "qty": 1, "qty1": 1.00000,
              "unit": "007"}], "referenceNo": "MX5080600686621"},{"country":"110","currency":"142","cusName":"AgV4fh9TfvbvkjaUgeNeTNJfNbLwQ3O5+MFfEKwYOYAw6KIAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREF6R0pLRldnNDNmbVlSaUtSUDcrQkxDZk1Ka3dYT0xRSDdDWVdQVmx0bWNPc3hCWUlyTXV2WGVUQ3NZbHI5bHFHQT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAeNj//HqnTB7hA0QTYHUrAUAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAzPfzT3RRCqFWWL5sgCARCAO6fWzgo99y/cdd+ExrRsBNDOJutGM1s9lgs4dWZxR2zvdPcLHG8NqP6nXxM2d9uPb9e7TXVbinq0UYe2AgAAEABcG2CRPp2IMckfNqk53bhr21T0E4n3IVN67VwUTjv5DLarfSJ502y9XG6drbPuZFr/////AAAAAQAAAAAAAAAAAAAAAQAAAATaqJsrzzzTtoMc8URMlVw9txsdSABnMGUCMEuFuU9IcgHCAkZFtESVNRNZG3kAUcAVeKbtKWiBVJWwPRHaBLagz9OMlock2pHQsAIxAPYkDMX/RuleBVHeQ468bHTqGnGd3swd0xUGy+gBosjG5wRVXCjUQC2awSWBq9631Q==AWSSECRETDATA","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.900,"logisticsNo":"YTMX5080600686622","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-3|||","itemName":"沙滩凉鞋","itemNo":"912428502-3","netWeight":0.500,"price":1188.0000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5080600686622"},
        {"country": "110", "currency": "142", "cusName": "test", "ebcCode": "", "ebcName": "", "ebpCode": "无",
         "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 1.050, "logisticsNo": "YTMX5080600686623",
         "orderItems": [{"gcode": "6404199000",
                         "gmodel": "1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-3|||",
                         "itemName": "沙滩凉鞋", "itemNo": "912428502-3", "netWeight": 0.500, "price": 1188.0000,
                         "qty": 1, "qty1": 0.50000, "unit": "025"}], "referenceNo": "MX5080600686623"},{"country":"110","currency":"142","cusName":"AgV4TqQiznUiNxfIK3dSWjtOMPoLnCsqyHN/Y+ks9K0H44QAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREF4Vmo2REh4dkdZUjRQN08xU2QzY2ptZ1gzU0oyOUVKTE1oWExwOStmWXg4V3E4VFNLU0dmMEMyaFcxUDk2NFRiUT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAc6hrc28Ah8OggruW/dTocIAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwrMMDilLPYQp8zRJICARCAO9/JRZIgB/38A/0mY3T9fRVJ6H5b7be1VIrt3O2Uz+Xv5c8sNE0+MkkfZoEAZbCb9VafO8CT5YPatUnsAgAAEADr2G8a2ERy9QMSvc2fI9hx8hn7O0Jvr3O/42s7+fkGyH7HQO/xSJl5/IqPYpy6R8r/////AAAAAQAAAAAAAAAAAAAAAQAAAATgcGH6g/WpeRQ8wPBx7O15rBsxrQBnMGUCMGUFLmj05SzF7Vnenlcnqkq0+KrcsBacMF1kqMrMEYJxgBXX5qJ1X98kFl2alXs69AIxANY61DTLT/rVfIvJUnFxFQWwEyZX69OT0K63h/GqrPdeD5DgAdgzBqH4hgMZLQgB9Q==AWSSECRETDATA","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.135,"logisticsNo":"YTMX5080600686624","orderItems":[{"gcode":"9004909000","gmodel":"1|0|用途:游泳用|类型:PC镜|品牌: 中文品牌: 安踏 英文品牌: ANTA|型号:1823531305-3|||","itemName":"成人泳镜","itemNo":"1825332712-1","netWeight":0.500,"price":253.8900,"qty":1,"qty1":0.50000,"unit":"007"}],"referenceNo":"MX5080600686624"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4GyweANLNoN0tFJVZnL67CcYMd5GFM98U2/sLESiw5vUAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREExUngvZEErSHNDM1FXZHJKcVhRK0gvTEhOaGJGL1FueS9PdTZUeTdLNWlLWkJlRm9PSEZMZlBlWTZUaExQaGloQT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAXZ1yUdjyK5QhkqTDf0tXY8AAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAw7mxp0IUonYUjTWg0CARCAO5AjuDrrTkStij7x+7D6StHnawgg+a4xhLg8GEW0gmMXbdPYR5fV+l65dErTKzwDgXm/Cwc4oMO8HMNJAgAAEACWUOPjq0WDsgmtgNDduELzT5CUSiGr5QIcp88sDMxm5RE4wX9B1T9OEeQ64OeNIXb/////AAAAAQAAAAAAAAAAAAAAAQAAAASUSg46LwjM8W+bj1EWWsT6nIxBJQBnMGUCMHbSWms+g2ppmXr7LMTXe2VfgD4lKl+DXdwaSNUgwZBt1qlVGbmgXKixm+VTQayKfAIxAOcyaHEPdA3FaYSV+NxMWBoHOoIKrg7sbx8vvQBvezSBfSshEn0Qh801s6F/QQAJ9w==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.194,
         "logisticsNo": "YTMX5080600686625", "orderItems": [
            {"gcode": "6110300090", "gmodel": "4|3|针织|不是起绒|男式|不为背心|聚酯纤维100%|安踏|D0112NKT01-RD",
             "itemName": "男短袖针织衫", "itemNo": "952428112-5", "price": 554.0000, "qty": 1, "qty1": 1.00000,
             "unit": "011"}], "referenceNo": "MX5080600686625"},{"country":"110","currency":"142","cusName":"AgV4JkP84Nq+P2uiZkgC4zDJURAh+hkWwiw/iYMaSuVWigQAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREFxUVFZK0hxTEhrSGRQc2t3SUVvb1FnWit2VGZ0bEFVNThNWjdBanF5cTdIaWZXS3ZjK3A4R2gwWmY2V0FtbGdTQT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAbWApLhfAfogHQlcS7Mtu5YAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAw6AogjVTtg4H+kovgCARCAO8kd95iQIaGMzmCsTFq5lF9sSbk2JIFe4ZDvcTs04bT37H87sdoc/EN9vK/0WP/Okyaano3L10pYZZY8AgAAEAAms6w0DVyJUpsuM6oxhTEhDVyhB2zgj71fq5C5bdAthyRmQc7Us5sxkNTSYCk6KA3/////AAAAAQAAAAAAAAAAAAAAAQAAAARwU17dp1BajZ+Y6iCUUu4BBAB3ugBnMGUCMAvHZnVeUbvpuQJ/me/HPLfmQjR/JXO5uE4bTrESgaE3uHBAOG0WVtH5l+V/7uEypwIxAP5GPbdMVcMOar0NOe5SHzJnQp8EEwyJDstmlxfGrcbp02RhgfDjCyTa+g0KQ6qjqg==AWSSECRETDATA","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.140,"logisticsNo":"YTMX5080600686626","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211141-2|||","itemName":"篮球","itemNo":"1825211141-2","price":568.0000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5080600686626"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.140,"logisticsNo":"YTMX5080600686627","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211141-1|||","itemName":"篮球","itemNo":"1825211141-1","price":568.0000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5080600686627"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4RsisvWJXVPeP+D5vAd7paqwgwPOhqQM0B9qA3f3zXcAAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREEyZzFlL2VURkdJN0ZUWUZNajJzUGp5bGovT0hUYm1NV1BtRUlZY2JxdFp5ckRzT2N1akFSenlJSENtekRwWkltdz09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAeG1yLD7K7lIJIaTHn1OVK0AAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwLGhkUBbJfgeXM4aoCARCAO6PMbJuQDK93rPpj7Bh+aZYUQVSj25eRMq/e7i8+JBj7YKEFcnMbjQ4nvgvCCTAhC1kUgiPTqAGgpeYzAgAAEADFEplFWmyH9AjlVtD1lnr0QwLuhSLYmfWZb6c9VT8jdr5k4YDsJYJiCCTTc3ugMp3/////AAAAAQAAAAAAAAAAAAAAAQAAAARRiDpw3mdvo9KtRGPH2u/YD24MSwBnMGUCMQD57JrvyKU1FebUorEu3MglVc1aWYeM6QbaZQBFUfbWOmWRB0SHLiDlzS19ZFEGvkQCMDmJ4Wh16pGl0FxfSpYe+kVTXq4h1Vr1kOq1+//EGaU6XT2WNQAZ73MQt3LJdvNrJw==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.140,
         "logisticsNo": "YTMX5080600686628", "orderItems": [
            {"gcode": "9506621000", "gmodel": "1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211141-1|||",
             "itemName": "篮球", "itemNo": "1825211141-1", "price": 568.0000, "qty": 1, "qty1": 1.00000,
             "unit": "007"}], "referenceNo": "MX5080600686628"},{"country":"110","currency":"142","cusName":"AgV4a7wTi71zayX0AOs8soJX5UdealbH3LZob+cvdguTfmcAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREF6VFNDSVF4SWh6ZE9COHNNVStjdXVSVDl3eVZWeEtjcG05WDJ3YlVMUFdEQTFBYWRZSWd3TlJKWWE5c1A1dFdJQT09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAaV1PfzpvwGKP43aTPNGUAoAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxpAbQt5K5TgK2D1i0CARCAOz7HLI7VTmwndbCJ3G2HiO5q7vYMqyeJWKv0777jUT8hyhQlaGbjVReediBJUBKuCCYXimReroYP74gdAgAAEAB6rCwVe4beY53Te8TmcvQrOE/9QTh83fthmDffUiPJmiqvfMLPW2hVsZtdkTB78Gb/////AAAAAQAAAAAAAAAAAAAAAQAAAAQQPSsRGfaM/hJGB3v/75ZkpidSgwBnMGUCMEobTp0VooNvCbwUcE5qE1d+nkSX9GgFFoAIlxLxs4JXEe1RZ7MdxLAolxi0zbbHhAIxANEngnQZaR+hlDqD4+FeEBwtYNENl0YVB8IpaVAwQEzlsFHCgnUBV6PZzYdhLsQzaQ==AWSSECRETDATA","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.490,"logisticsNo":"YTMX5080600686629","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122437726U-4|||","itemName":"综训鞋","itemNo":"122437726U-4","netWeight":0.500,"price":1480.0000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5080600686629"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.840,"logisticsNo":"YTMX5080600686630","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912427702-2|||","itemName":"沙滩凉鞋","itemNo":"912427702-2","netWeight":0.500,"price":1289.0000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5080600686630"},
        {"country": "110", "currency": "142",
         "cusName": "AgV4jRj07K1EQXRRthEvWX2UpD59wHQ9SZPWmjpV44MImrYAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREE1U2xIVHFvMFdXeGVKbzNxWldhZ2dqYXFMK25UTUJ4NXAyb1l3T1ZKM1FLZGVPQkhUbW9zZDdNamJXN0hzNm9Mdz09AAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLXNvdXRoZWFzdC0xOjIyNTc5NzgzNjIyNTprZXkvNjA2M2Q3YTEtMWY0ZC00YTIwLTlmNTMtODFiOTFiYzRjMjAzALgBAgEAeLlHTtu21SLWRA+tXsBskRMKYBuvJPyLIkch9Pe6gH8OAccYwdgo6GASRJyAwe5mdZkAAAB+MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAw8G5XQtk9kHw1GwcMCARCAO2ddA69fkD8VyM/xV9ZHC8c+zN70zAvw1Em73Pnub3ZY4ZiG9J4xwYnLMzVCU6px84QKkxxi7L9epwklAgAAEAB4tn78rTZqm/ejQvjDlbqRRuYOsSpC9fync9zc/QsUE4Y1FXHo8PUSQkcPMggG9cX/////AAAAAQAAAAAAAAAAAAAAAQAAAASue9SMLXTnZnpPiGYrAAPulgTHkgBnMGUCMQCyyn64dMu+VXR2vhJGyi9IXGhStspgkIUIrGuJjEOovl+nSq3/lUlQ2aywJuD88b4CMETRahz7gfj+qfFGrCUJnuDty5YhPFP3YRxWcUrfa+hJ+cZQamS7A+1ZJsHys28yfA==AWSSECRETDATA",
         "ebcCode": "", "ebcName": "", "ebpCode": "无", "ebpName": "Tiktok-an", "formType": "B", "grossWeight": 0.543,
         "logisticsNo": "YTMX5080600686632", "orderItems": [{"gcode": "6117809000",
                                                             "gmodel": "1|0|织造方法:针织|成分含量:尼龙73.5%氨纶26.5%|品牌:中文品牌:安踏 英文品牌:ANTA|||",
                                                             "itemName": "冰袖", "itemNo": "1825272580R-2",
                                                             "netWeight": 0.500, "price": 0.0100, "qty": 1,
                                                             "qty1": 0.50000, "unit": "025"}, {"gcode": "6404199000",
                                                                                               "gmodel": "1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122437726U-1|||",
                                                                                               "itemName": "综训鞋",
                                                                                               "itemNo": "122437726U-1",
                                                                                               "netWeight": 0.500,
                                                                                               "price": 1380.0000,
                                                                                               "qty": 1,
                                                                                               "qty1": 0.50000,
                                                                                               "unit": "025"}],
         "referenceNo": "MX5080600686632"},{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.840,"logisticsNo":"YTMX5080600686634","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445504-4|||","itemName":"休闲鞋","itemNo":"112445504-4","netWeight":0.730,"price":2402.0000,"qty":1,"qty1":0.73000,"unit":"025"}],"referenceNo":"MX5080600686634"}
    ]

    # 调用函数
    merge_jsons_to_excel(json_list, "combi1ned_data.xlsx")