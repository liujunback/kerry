import json
import pandas as pd

# 示例 JSON 数据

with open("../其他/auto_inventory.txt", 'r',encoding= 'utf-8') as f:
    data = json.loads(f.read())#转换成字典
    f.close()

# # 提取所需字段
# extracted_data = [
#     {
#         "skuCode": item["skuCode"],
#         "location": item["location"],
#         "quantity": item["quantity"],
#         "createdDate": item["createdDate"]
#     }
#     for item in data
# ]
#
# # 转换为 Pandas DataFrame
# df = pd.DataFrame(extracted_data)
#
# # 将 DataFrame 写入 Excel 文件
# output_file = "sku_data.xlsx"
# df.to_excel(output_file, index=False)
#
# print(f"数据已成功保存到 {output_file}")

from openpyxl import Workbook

# 创建一个新的工作簿和工作表
wb = Workbook()
ws = wb.active
ws.title = "SKU Data"

# 写入表头
headers = ["skuCode", "location", "quantity", "createdDate"]
ws.append(headers)

# 写入数据行
for item in data:
    row = [item["skuCode"], item["location"], item["quantity"], item["createdDate"]]
    ws.append(row)

# 保存工作簿到文件
output_file = "sku_data.xlsx"
wb.save(output_file)