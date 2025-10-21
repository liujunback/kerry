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
    json_list = [{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.840,"logisticsNo":"YTMX5082200794276","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445504-4|||","itemName":"休闲鞋","itemNo":"112445504-4","netWeight":0.730,"price":70.90000,"qty":1,"qty1":0.73000,"unit":"025"}],"referenceNo":"MX5082200794276"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794277","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211140-3|||","itemName":"篮球","itemNo":"1825211140-3","netWeight":1.000,"price":14.91000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5082200794277"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794278","orderItems":[{"gcode":"9004909000","gmodel":"1|0|用途:游泳用|类型:PC镜|品牌: 中文品牌: 安踏 英文品牌: ANTA|型号:1823531305-4|||","itemName":"镀膜泳镜","itemNo":"1823531304-1","netWeight":0.500,"price":9.32000,"qty":1,"qty1":0.50000,"unit":"007"}],"referenceNo":"MX5082200794278"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.900,"logisticsNo":"YTMX5082200794279","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-5|||","itemName":"沙滩凉鞋","itemNo":"912428502-5","netWeight":0.500,"price":37.72000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794279"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794280","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-4|||","itemName":"沙滩凉鞋","itemNo":"912428502-4","netWeight":1.050,"price":38.19000,"qty":1,"qty1":1.05000,"unit":"025"}],"referenceNo":"MX5082200794280"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.050,"logisticsNo":"YTMX5082200794281","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-3|||","itemName":"沙滩凉鞋","itemNo":"912428502-3","netWeight":0.500,"price":35.07000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794281"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794282","orderItems":[{"gcode":"9004909000","gmodel":"1|0|用途:游泳用|类型:PC镜|品牌: 中文品牌: 安踏 英文品牌: ANTA|型号:1823531305-3|||","itemName":"成人泳镜","itemNo":"1825332712-1","netWeight":0.500,"price":7.49000,"qty":1,"qty1":0.50000,"unit":"007"}],"referenceNo":"MX5082200794282"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.652,"logisticsNo":"YTMX5082200794283","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:1125B5576-1|||","itemName":"跑鞋","itemNo":"1125B5576-1","netWeight":0.500,"price":283.91000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794283"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794284","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-4|||","itemName":"沙滩凉鞋","itemNo":"912428502-4","netWeight":1.050,"price":38.19000,"qty":1,"qty1":1.05000,"unit":"025"}],"referenceNo":"MX5082200794284"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794285","orderItems":[{"gcode":"9004909000","gmodel":"1|0|用途:游泳用|类型:PC镜|品牌: 中文品牌: 安踏 英文品牌: ANTA|型号:1823531305-2|||","itemName":"成人泳镜","itemNo":"1825332715-2","netWeight":0.500,"price":10.24000,"qty":1,"qty1":0.50000,"unit":"007"}],"referenceNo":"MX5082200794285"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794286","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211140-2|||","itemName":"篮球","itemNo":"1825211140-2","netWeight":1.000,"price":13.56000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5082200794286"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794288","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:1124F1606-2|||","itemName":"篮球鞋","itemNo":"1124F1606-2","netWeight":1.000,"price":51.36000,"qty":1,"qty1":1.00000,"unit":"025"}],"referenceNo":"MX5082200794288"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794289","orderItems":[{"gcode":"6110300090","gmodel":"4|3|针织|不是起绒|男式|不为背心|聚酯纤维100%|安踏|D0112NKT01-RD","itemName":"男短袖针织衫","itemNo":"952428112-5","netWeight":0.500,"price":16.35000,"qty":1,"qty1":1.00000,"unit":"011"}],"referenceNo":"MX5082200794289"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794290","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211141-2|||","itemName":"篮球","itemNo":"1825211141-2","netWeight":1.000,"price":16.77000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5082200794290"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794291","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211141-1|||","itemName":"篮球","itemNo":"1825211141-1","netWeight":1.000,"price":16.77000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5082200794291"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794292","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211141-1|||","itemName":"篮球","itemNo":"1825211141-1","netWeight":1.000,"price":16.77000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5082200794292"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794293","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122437726U-4|||","itemName":"综训鞋","itemNo":"122437726U-4","netWeight":0.500,"price":43.68000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794293"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.840,"logisticsNo":"YTMX5082200794294","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912427702-2|||","itemName":"沙滩凉鞋","itemNo":"912427702-2","netWeight":0.500,"price":38.05000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794294"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.050,"logisticsNo":"YTMX5082200794296","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-5|||","itemName":"沙滩凉鞋","itemNo":"912428502-5","netWeight":0.500,"price":37.72000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794296"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.931,"logisticsNo":"YTMX5082200794297","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912425588-1|||","itemName":"跑鞋","itemNo":"912425588-1","netWeight":0.500,"price":71.40000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794297"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794298","orderItems":[{"gcode":"9004909000","gmodel":"1|0|用途:游泳用|类型:PC镜|品牌: 中文品牌: 安踏 英文品牌: ANTA|型号:1823531305-4|||","itemName":"成人近视泳镜","itemNo":"1825332709-1","netWeight":0.500,"price":10.10000,"qty":1,"qty1":0.50000,"unit":"007"}],"referenceNo":"MX5082200794298"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794300","orderItems":[{"gcode":"6110300090","gmodel":"4|3|针织|不是起绒|男式|不为背心|聚酯纤维100%|安踏|D0112NKT00-RD","itemName":"男针织运动上衣","itemNo":"952527706-7","netWeight":0.294,"price":33.94000,"qty":1,"qty1":1.00000,"unit":"011"}],"referenceNo":"MX5082200794300"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794302","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:A312411108-3|||","itemName":"篮球鞋","itemNo":"A312411108-3","netWeight":1.000,"price":37.72000,"qty":1,"qty1":1.00000,"unit":"025"}],"referenceNo":"MX5082200794302"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794303","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-4|||","itemName":"沙滩凉鞋","itemNo":"912428502-4","netWeight":1.050,"price":40.85000,"qty":1,"qty1":1.05000,"unit":"025"}],"referenceNo":"MX5082200794303"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.816,"logisticsNo":"YTMX5082200794304","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445504-6|||","itemName":"休闲鞋","itemNo":"112445504-6","netWeight":0.750,"price":70.90000,"qty":1,"qty1":0.75000,"unit":"025"}],"referenceNo":"MX5082200794304"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.900,"logisticsNo":"YTMX5082200794306","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-5|||","itemName":"沙滩凉鞋","itemNo":"912428502-5","netWeight":0.500,"price":35.07000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794306"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794307","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211132-1|||","itemName":"篮球","itemNo":"1825211132-1","netWeight":1.000,"price":19.72000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5082200794307"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.037,"logisticsNo":"YTMX5082200794308","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912528504-2|||","itemName":"沙滩凉鞋","itemNo":"912528504-2","netWeight":0.500,"price":56.55000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794308"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.543,"logisticsNo":"YTMX5082200794309","orderItems":[{"gcode":"6117809000","gmodel":"1|0|织造方法:针织|成分含量:尼龙73.5%氨纶26.5%|品牌:中文品牌:安踏 英文品牌:ANTA|||","itemName":"冰袖","itemNo":"1825272580R-2","netWeight":0.500,"price":0.01000,"qty":1,"qty1":0.50000,"unit":"025"},{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122437726U-1|||","itemName":"综训鞋","itemNo":"122437726U-1","netWeight":0.500,"price":40.73000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794309"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.930,"logisticsNo":"YTMX5082200794310","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445570-5|||","itemName":"跑鞋","itemNo":"112445570-5","netWeight":0.500,"price":118.92000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794310"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794311","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211141-1|||","itemName":"篮球","itemNo":"1825211141-1","netWeight":1.000,"price":16.77000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5082200794311"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":1.500,"logisticsNo":"YTMX5082200794312","orderItems":[{"gcode":"9506621000","gmodel":"1|0|种类:篮球|品牌:中文品牌:安踏 英文品牌:ANTA|型号:1825211140-3|||","itemName":"篮球","itemNo":"1825211140-3","netWeight":1.000,"price":14.91000,"qty":1,"qty1":1.00000,"unit":"007"}],"referenceNo":"MX5082200794312"}
            ,{"country":"110","currency":"142","cusName":"test","ebcCode":"","ebcName":"","ebpCode":"无","ebpName":"Tiktok-an","formType":"B","grossWeight":0.900,"logisticsNo":"YTMX5082200794313","orderItems":[{"gcode":"6404199000","gmodel":"1|0|款式:过踝但低于小腿|鞋面材料:橡塑材料/网布/合成革|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912428502-3|||","itemName":"沙滩凉鞋","itemNo":"912428502-3","netWeight":0.500,"price":35.07000,"qty":1,"qty1":0.50000,"unit":"025"}],"referenceNo":"MX5082200794313"}
            ,]

    # 调用函数
    merge_jsons_to_excel(json_list, "combi1ned_data.xlsx")