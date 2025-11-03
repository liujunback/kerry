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
    json_list = [{"country":"110","currency":"502","cusName":"A*******A","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102200916214","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":6.26000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5102200916214"},
                {"country":"110","currency":"502","cusName":"H*******J","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102100916185","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/合成革/橡塑材料|外底材料:EVA|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912415523-3|||","itemName":"休闲鞋","itemNo":"912415523-3","netWeight":0.870,"price":0.01000,"qty":1,"qty1":0.87000,"unit":"025"}],"referenceNo":"MX5102100916185"},
                {"country":"110","currency":"502","cusName":"S*******P","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102100916184","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/合成革/橡塑材料|外底材料:EVA|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912415523-3|||","itemName":"休闲鞋","itemNo":"912415523-3","netWeight":0.870,"price":0.01000,"qty":1,"qty1":0.87000,"unit":"025"}],"referenceNo":"MX5102100916184"},
                {"country":"110","currency":"502","cusName":"S*******D","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102100916170","orderItems":[{"districtCode":"35059","gcode":"6117809000","gmodel":"1|0|织造方法:针织|成分含量:锦纶94.5%氨纶5.5%|品牌:中文品牌:安踏 英文品牌:ANTA|||","itemName":"头带","itemNo":"1824572501-1","netWeight":0.020,"price":10.77000,"qty":1,"qty1":0.02000,"unit":"007"},{"districtCode":"35059","gcode":"6117809000","gmodel":"1|0|织造方法:针织|成分含量:锦纶94.5%氨纶5.5%|品牌:中文品牌:安踏 英文品牌:ANTA|||","itemName":"头带","itemNo":"1824572501-1","netWeight":0.020,"price":10.77000,"qty":1,"qty1":0.02000,"unit":"007"}],"referenceNo":"MX5102100916170"},
                {"country":"110","currency":"502","cusName":"F*******A","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102100916165","orderItems":[{"districtCode":"35059","gcode":"6402992900","gmodel":"1|0|款式:未过踝|鞋面材料:合成革/网布|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122418016-2|||","itemName":"休闲鞋","itemNo":"122418016-2","netWeight":0.700,"price":26.42000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5102100916165"},
                {"country":"110","currency":"502","cusName":"M*******E","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102100916164","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":40.02000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5102100916164"},
                {"country":"110","currency":"502","cusName":"H*******S","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102100916163","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":40.02000,"qty":1,"qty1":0.74000,"unit":"025"}],"referenceNo":"MX5102100916163"},
                {"country":"110","currency":"502","cusName":"F*******E","ebpCode":"无","ebpName":"LAZA","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102100916161","orderItems":[{"districtCode":"35059","gcode":"6402992900","gmodel":"1|0|款式:未过踝|鞋面材料:合成革/网布|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122418016-2|||","itemName":"休闲鞋","itemNo":"122418016-2","netWeight":0.700,"price":0.08000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5102100916161"},
                {"country":"110","currency":"502","cusName":"J*******L","ebpCode":"无","ebpName":"LAZA","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102100916159","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":0.03000,"qty":1,"qty1":0.74000,"unit":"025"}],"referenceNo":"MX5102100916159"},
                {"country":"110","currency":"502","cusName":"G*******K","ebpCode":"无","ebpName":"LAZA","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000916126","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445581-5|||","itemName":"休闲鞋","itemNo":"112445581-5","netWeight":0.810,"price":0.02000,"qty":1,"qty1":0.81000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445581-5|||","itemName":"休闲鞋","itemNo":"112445581-5","netWeight":0.810,"price":0.02000,"qty":1,"qty1":0.81000,"unit":"025"}],"referenceNo":"MX5102000916126"},
                {"country":"110","currency":"502","cusName":"I*******P","ebpCode":"无","ebpName":"LAZA","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000916113","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":0.01000,"qty":1,"qty1":0.74000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/TPU|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122415582-9|||","itemName":"休闲鞋","itemNo":"122415582-9","netWeight":0.740,"price":0.01000,"qty":1,"qty1":0.74000,"unit":"025"}],"referenceNo":"MX5102000916113"},
                {"country":"110","currency":"502","cusName":"D*******Z","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000916070","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/合成革/橡塑材料|外底材料:EVA|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912415523-3|||","itemName":"休闲鞋","itemNo":"912415523-3","netWeight":0.870,"price":61.88000,"qty":1,"qty1":0.87000,"unit":"025"}],"referenceNo":"MX5102000916070"},
                {"country":"110","currency":"502","cusName":"I*******C","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000916056","orderItems":[{"districtCode":"35059","gcode":"6117809000","gmodel":"1|0|织造方法:针织|成分含量:锦纶88%氨纶12%|品牌:中文品牌:安踏 英文品牌:ANTA|||","itemName":"护膝","itemNo":"1824472577-1","netWeight":0.150,"price":24.94000,"qty":1,"qty1":0.15000,"unit":"008"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":37.51000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5102000916056"},
                {"country":"110","currency":"502","cusName":"N*******T","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000916032","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":6.26000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5102000916032"},
                {"country":"110","currency":"502","cusName":"U*******S","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000916030","orderItems":[{"districtCode":"35059","gcode":"6117809000","gmodel":"1|0|织造方法:针织|成分含量:锦纶88%氨纶12%|品牌:中文品牌:安踏 英文品牌:ANTA|||","itemName":"护膝","itemNo":"1824472577-1","netWeight":0.150,"price":8742.67000,"qty":1,"qty1":0.15000,"unit":"008"},{"districtCode":"35059","gcode":"6117809000","gmodel":"1|0|织造方法:针织|成分含量:锦纶88%氨纶12%|品牌:中文品牌:安踏 英文品牌:ANTA|||","itemName":"护膝","itemNo":"1824472577-1","netWeight":0.150,"price":8742.67000,"qty":1,"qty1":0.15000,"unit":"008"}],"referenceNo":"MX5102000916030"},
                {"country":"110","currency":"502","cusName":"C*******F","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000916022","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112415582-9|||","itemName":"休闲鞋","itemNo":"112415582-9","netWeight":0.900,"price":7.43000,"qty":1,"qty1":0.90000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112415582-6|||","itemName":"休闲鞋","itemNo":"112415582-6","netWeight":0.870,"price":7.43000,"qty":1,"qty1":0.87000,"unit":"025"}],"referenceNo":"MX5102000916022"},
                {"country":"110","currency":"502","cusName":"X*******T","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000915709","orderItems":[{"districtCode":"35059","gcode":"6402992900","gmodel":"1|0|款式:未过踝|鞋面材料:合成革/网布|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122418016-2|||","itemName":"休闲鞋","itemNo":"122418016-2","netWeight":0.700,"price":37.66000,"qty":1,"qty1":0.70000,"unit":"025"},{"districtCode":"35059","gcode":"6402992900","gmodel":"1|0|款式:未过踝|鞋面材料:合成革/网布|外底材料:EVA/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:122418016-3|||","itemName":"休闲鞋","itemNo":"122418016-3","netWeight":0.700,"price":37.66000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5102000915709"},
                {"country":"110","currency":"502","cusName":"J*******F","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"TN5102000915680","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445581-5|||","itemName":"休闲鞋","itemNo":"112445581-5","netWeight":0.810,"price":107.14000,"qty":1,"qty1":0.81000,"unit":"025"}],"referenceNo":"MX5102000915680"},
                {"country":"110","currency":"502","cusName":"V*******G","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"TN_580621142107719026","orderItems":[{"districtCode":"35059","gcode":"6109909000","gmodel":"1|0|织造方法:针织|类别:女式|是否有领:无领|是否有扣:无扣|是否有拉链:无拉链|成分含量:聚酯纤维100%|品牌:中文品牌:安踏 英文品牌:ANTA|货号:962427101-7|||","itemName":"女式T恤","itemNo":"962427101-7","netWeight":0.100,"price":16.41000,"qty":1,"qty1":1.00000,"unit":"011"},{"districtCode":"35059","gcode":"6109909000","gmodel":"1|0|织造方法:针织|类别:女式|是否有领:无领|是否有扣:无扣|是否有拉链:无拉链|成分含量:聚酯纤维92%氨纶8%|品牌:中文品牌:安踏 英文品牌:ANTA|货号:162537101U-1|||","itemName":"女式T恤","itemNo":"962427101-2","netWeight":0.100,"price":16.41000,"qty":1,"qty1":1.00000,"unit":"011"}],"referenceNo":"CWB_580621142107719026"},
                {"country":"110","currency":"502","cusName":"V*******Y","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"PH234478390772D","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/合成革/橡塑材料|外底材料:EVA|品牌:中文品牌:安踏 英文品牌:ANTA|货号:912415523-3|||","itemName":"休闲鞋","itemNo":"912415523-3","netWeight":0.870,"price":22558.99000,"qty":2,"qty1":0.87000,"unit":"025"},{"districtCode":"35059","gcode":"6117809000","gmodel":"1|0|织造方法:针织|成分含量:锦纶94.5%氨纶5.5%|品牌:中文品牌:安踏 英文品牌:ANTA|||","itemName":"头带","itemNo":"1824572501-1","netWeight":0.020,"price":19735.58000,"qty":1,"qty1":0.02000,"unit":"007"}],"referenceNo":"CWB_580710983291275195"},
                {"country":"110","currency":"502","cusName":"O*******M","ebpCode":"无","ebpName":"SHOPEE","formType":"B","grossWeight":0.001,"logisticsNo":"LXBPH000263888889","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":52.98000,"qty":1,"qty1":0.70000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445581-5|||","itemName":"休闲鞋","itemNo":"112445581-5","netWeight":0.810,"price":103.19000,"qty":1,"qty1":0.81000,"unit":"025"}],"referenceNo":"MX5102400916261"},
                {"country":"110","currency":"502","cusName":"I*******U","ebpCode":"无","ebpName":"LAZA","formType":"B","grossWeight":0.001,"logisticsNo":"LXBPH000263888888","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":0.19000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"MX5102400916260"},
                {"country":"110","currency":"502","cusName":"X*******Q","ebpCode":"无","ebpName":"TK","formType":"B","grossWeight":0.001,"logisticsNo":"LXBMY000107073760","orderItems":[{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|款式:未过踝|鞋面材料:网布/橡塑材料|外底材料:TPU/橡胶|品牌:中文品牌:安踏 英文品牌:ANTA|货号:112445581-5|||","itemName":"休闲鞋","itemNo":"112445581-5","netWeight":0.810,"price":7.82000,"qty":1,"qty1":0.81000,"unit":"025"},{"districtCode":"35059","gcode":"6404199000","gmodel":"1|0|未过踝|鞋面材料:合成革/混纺布/橡塑材料|合成革|安踏|812221601-5","itemName":"鞋","itemNo":"112417718-7","netWeight":0.700,"price":7.82000,"qty":1,"qty1":0.70000,"unit":"025"}],"referenceNo":"CWB_580598436764026792"},
]

    # 调用函数
    merge_jsons_to_excel(json_list, "combi1ned_data.xlsx")