from collections import defaultdict

def process_data(data):
    # 用于存储结果的字典，键是(bin_code, bin_type)元组，值是一个字典，该字典的键是sku，值是该sku的total_qty总和
    result = defaultdict(lambda: defaultdict(int))

    for item in data:
        if item['total_qty'] > 0:  # 筛选条件
            bin_code = item['bin_code']
            bin_type = item['bin_type']
            sku = item['sku']
            # 增加或更新sku在(bin_code, bin_type)下的total_qty总和
            result[(bin_code, bin_type)][sku] += item['total_qty']

    # 转换结果格式以便于阅读（可选）
    formatted_result = []
    for (bin_code, bin_type), sku_totals in result.items():
        formatted_sku_totals = [{'sku': sku, 'total_qty': total_qty} for sku, total_qty in sku_totals.items()]
        formatted_result.append({
            'bin_code': bin_code,
            'bin_type': bin_type,
            'sku_totals': formatted_sku_totals
        })

    return formatted_result

# 示例数据（注意：这里的数据集中的total_qty都是0，所以结果将是一个空列表）
data = [
        {
            "sku": "TRWMS2024032802",
            "message": "Missing sku",
            "bin_code": "TEST9001",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "TRWMS2024032802",
            "message": "Missing sku",
            "bin_code": "TEST_FAN",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "TRWMS2024032802",
            "message": "Missing sku",
            "bin_code": "Crystal03",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "TRWMS2024032803",
            "message": "Missing sku",
            "bin_code": "Crystal01",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "TRWMS2024032804",
            "message": "Missing sku",
            "bin_code": "Crystal02",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "TRWMS2024032804",
            "message": "Missing sku",
            "bin_code": "TEST_FAN",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "TRWMS2024032805",
            "message": "Missing sku",
            "bin_code": "Hold010004",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406205683357",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406201561695",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406209375950",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406207167082",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406205003372",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406202724318",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406206033168",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406209817767",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU20240620184006",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406218527909",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406213207193",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406218933731",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU20240623666480",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406278493405",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406274636659",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202406275833651",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU20240628512978",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407021574966",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407049014137",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU20240704614279",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407041535310",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU20240704788105",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407058711519",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407057946196",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407095286916",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407114049905",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407117014745",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407258608015",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407258608015",
            "message": "Missing sku",
            "bin_code": "TESTTR001",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202407258608015",
            "message": "Missing sku",
            "bin_code": "farfetch1",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202408155065013",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202408155760185",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU20240815716859",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 30
        },
        {
            "sku": "BACK_SKU202408204656773",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 144
        },
        {
            "sku": "BACK_SKU202408204656773",
            "message": "",
            "bin_code": "farfetch3",
            "bin_type": "bin",
            "total_qty": 50
        },
        {
            "sku": "BACK_SKU2024082230360741",
            "message": "Missing sku",
            "bin_code": "farfetch1",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU20241018627021",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 122
        },
        {
            "sku": "BACK_SKU202409137711019",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 3
        },
        {
            "sku": "BACK_SKU202410244555867",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 50
        },
        {
            "sku": "BACK_SKU202410241094149",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 50
        },
        {
            "sku": "BACK_SKU202410257986081",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 91
        },
        {
            "sku": "BACK_SKU202409137711019",
            "message": "",
            "bin_code": "TEST71601",
            "bin_type": "bin",
            "total_qty": 3
        },
        {
            "sku": "BACK_SKU20241018627021",
            "message": "",
            "bin_code": "TEST71601",
            "bin_type": "bin",
            "total_qty": 2
        },
        {
            "sku": "BACK_SKU202411185500747",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 189
        },
        {
            "sku": "BACK_SKU202411182407414",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 50
        },
        {
            "sku": "BACK_SKU202412122828041",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202412124482484",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202412127512027",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202412166953351",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202412232840132",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 10
        },
        {
            "sku": "BACK_SKU20241223414858233",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202412267679607",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 28
        },
        {
            "sku": "BACKASN202501109352405",
            "message": "Missing sku",
            "bin_code": "farfetch4",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACKASN202501109180675",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACKASN202501104093626",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU20250110240415",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202501108354053",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202501107801717",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202501103998610",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202501179600325",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 6
        },
        {
            "sku": "BACK_SKU202501207372182",
            "message": "Missing sku",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 0
        },
        {
            "sku": "BACK_SKU202501211737388",
            "message": "",
            "bin_code": "INT00013",
            "bin_type": "bin",
            "total_qty": 28
        },
        {
            "sku": "BACK_SKU202501211737388",
            "message": "",
            "bin_code": "TEST1122",
            "bin_type": "pallet",
            "total_qty": 198
        }
    ]

# 调用函数并打印结果
processed_data = process_data(data)
for entry in processed_data:
    # print(f"Bin Code: {entry['bin_code']}, Bin Type: {entry['bin_type']}")
    for sku_total in entry['sku_totals']:
        pass
        # print(f"  SKU: {sku_total['sku']}, Total Quantity: {sku_total['total_qty']}")