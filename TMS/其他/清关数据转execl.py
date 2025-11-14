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
        {"country": "110", "currency": "502", "cusName": "P*******B", "ebpCode": "无", "ebpName": "LAZA",
         "formType": "B", "grossWeight": 0.001, "logisticsNo": "YD11100928387", "orderItems": [
            {"districtCode": "35059", "gcode": "6404199000",
             "gmodel": "1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||",
             "itemName": "休闲鞋", "itemNo": "122415582-9", "netWeight": 0.740, "price": 7.74000, "qty": 1,
             "qty1": 0.74000, "unit": "025"}], "referenceNo": "MX5111100928387"},
        {"country": "110", "currency": "502", "cusName": "Z*******Y", "ebpCode": "无", "ebpName": "LAZA",
         "formType": "B", "grossWeight": 0.001, "logisticsNo": "YD11100928389", "orderItems": [
            {"districtCode": "35059", "gcode": "6404199000",
             "gmodel": "1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||",
             "itemName": "休闲鞋", "itemNo": "122415582-9", "netWeight": 0.740, "price": 31.17000, "qty": 1,
             "qty1": 0.74000, "unit": "025"}], "referenceNo": "MX5111100928389"}

    ]

    # 调用函数
    merge_jsons_to_excel(json_list, "combi1ned_data.xlsx")