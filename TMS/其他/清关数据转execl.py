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
    json_list = [{"country":"110","currency":"502","cusName":"L*******K","ebpCode":"无","ebpName":"tk","formType":"B","grossWeight":0.001,"logisticsNo":"YD5110400917872","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":319.20000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917872"},
{"country":"110","currency":"502","cusName":"Q*******A","ebpCode":"无","ebpName":"tk","formType":"B","grossWeight":0.001,"logisticsNo":"YD5110400917871","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":319.20000,"qty":3,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917871"},
{"country":"110","currency":"502","cusName":"M*******S","ebpCode":"无","ebpName":"tk","formType":"B","grossWeight":0.001,"logisticsNo":"YD5110400917870","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":319.20000,"qty":2,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917870"},
{"country":"110","currency":"502","cusName":"O*******T","ebpCode":"无","ebpName":"tk","formType":"B","grossWeight":0.001,"logisticsNo":"YD5110400917867","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":5.46000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917867"},
{"country":"110","currency":"502","cusName":"H*******T","ebpCode":"无","ebpName":"tk","formType":"B","grossWeight":0.001,"logisticsNo":"YD5110400917865","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":5.46000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917865"},
{"country":"110","currency":"502","cusName":"L*******O","ebpCode":"无","ebpName":"tk","formType":"B","grossWeight":0.001,"logisticsNo":"YD5110400917864","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":5.46000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917864"},
{"country":"110","currency":"502","cusName":"S*******R","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"YD110400917831","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":5.46000,"qty":1,"qty1":0.74000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"812221601-5","netWeight":0.700,"price":2.73000,"qty":2,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917831"},
{"country":"110","currency":"502","cusName":"G*******Q","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"YD110400917829","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":5.46000,"qty":1,"qty1":0.74000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"812221601-5","netWeight":0.700,"price":2.73000,"qty":2,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917829"},
{"country":"110","currency":"502","cusName":"M*******V","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"YD110400917828","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"812221601-5","netWeight":0.700,"price":2.73000,"qty":2,"qty1":0.70000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":5.46000,"qty":1,"qty1":0.74000,"unit":"025"}],"referenceNo":"MX5110400917828"},
{"country":"110","currency":"502","cusName":"K*******K","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"YD110400917827","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"812221601-5","netWeight":0.700,"price":2.73000,"qty":2,"qty1":0.70000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":5.46000,"qty":1,"qty1":0.74000,"unit":"025"}],"referenceNo":"MX5110400917827"},
{"country":"110","currency":"502","cusName":"C*******S","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"YD110400917826","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":78.22000,"qty":1,"qty1":0.74000,"unit":"025"}],"referenceNo":"MX5110400917826"},
{"country":"110","currency":"502","cusName":"S*******U","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"YD110400917824","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":5.46000,"qty":1,"qty1":0.74000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"812221601-5","netWeight":0.700,"price":2.73000,"qty":2,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5110400917824"},
{"country":"110","currency":"502","cusName":"E*******M","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"YD110400917823","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":78.22000,"qty":1,"qty1":0.74000,"unit":"025"}],"referenceNo":"MX5110400917823"},
{"country":"110","currency":"502","cusName":"Q*******Y","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"YD110400917822","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":78.22000,"qty":1,"qty1":0.74000,"unit":"025"}],"referenceNo":"MX5110400917822"},
]

    # 调用函数
    merge_jsons_to_excel(json_list, "combi1ned_data.xlsx")