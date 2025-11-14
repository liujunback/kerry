import requests
import json
import pandas as pd
import os
from time import sleep
import logging

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def get_punish_data_with_retry(page_no, page_size=100, max_retries=3, retry_delay=5):
    """获取惩罚数据，带有重试机制"""
    url = "https://logistics-eu.temu.com/logisticPortal/api/matt/punishTicketAmount/amount/pageQueryPkgPunishAmount"

    payload = json.dumps({
        "regionId": 210,
        "warehouseId": 924173,
        "settleMonth": "202306",
        "pageSize": page_size,
        "pageNo": page_no
    })

    headers = {
        'accept': '*/*',
        'accept-language': 'zh-CN,zh;q=0.9,es-AR;q=0.8,es;q=0.7,en;q=0.6',
        'anti-content': '0aqAfqcy0jKgjgm9Q0J7UST_uqmqHM-ElbHhEik45J7E52B-9wrSmK-Wpk7JsursyyL1uHT5BCHK5-vVg2TIx7wTEW_TAaCsts0kadJmwBcHuZswW_Wbl0KPBVbQWrNoV5JEEpPNcbneZnWS4GKe7huldWzW8sySIMw6W94XysIvTfzqwvaMoMf6bgYY0WN6GYgWXvHGDVCiR2-eZOopw0d9nR9ONazVCUlXeVx0V9kpBImfhCBA9AN2_L4cNs7bsJa9JCQV9rAZrIYeaZk9tR4UL6o9oC435L2tR9th9IR2uW2pR2H8Bu8OhF8JMM3Z_uH2B89UekDA2SmJVaOjC-th9VSczTR0QJCPXVDJKCvZsEh5nP_sjtSxldNZaiKBnHdKzrPR8k-k7_EZIe-2rxWmIyCVJmPHDjrXcvpJvQW-z5QIEHEBemjpvddIvnvKLtI_s1my5T1G5Z6IYJBiPlZe8DsIKq8-D8dn8recOSGSX2B25xJ80OvOgmqH4ZaTZmG9_7AxekvA9WDLVO86k0e127qmFY-ECKD__EqImX6znOIdoETYwzi0-DQUJFl3mzEq9SnxLDngRkEikAFBUsN180PRI9ZijuOJNCkR19Stk-XoxUYWmua70vip03elsrV3NqeVJSfMVcyHqaX_Ozy14WrFhXso32nhryUJuJYh3V5hu6HWuKIRC8TSoDorl49qaV',
        'cache-control': 'max-age=0',
        'content-type': 'application/json',
        'cookie': 'api_uid=Cox0Y2kS2CKDKzjpjbSnAg==; _nano_fp=XpmjX5CYX5EylpXbXC_o26MTE13ppmXmn7SQ5vjV; SUB_PASS_ID=AH_eyJ0Ijoic2VLY3MwU21Idlp5VDZBaFRPTnFZL2NFeWdHNTZnamQvTXRMQStzY1dqYWxLY0VYSmxxQXYxTU9HYU1ld3lySmUwcSs2R1pvM0RsTEdZSEtPT2dmM1E9PSIsInYiOjEsInMiOjEzLCJ1IjozMTE5MTM0NDAwOTQyLCJtIjoxNDA4MDMyNjgwNDZ9; _bee=5hn7YgeBSyCnmt4QydPCluWa1KZA0apZ; njrpl=5hn7YgeBSyCnmt4QydPCluWa1KZA0apZ; dilx=E6aIum74smPsWtkaN4J9C; hfsc=L3yMeoE06zn80JfEew==',
        'origin': 'https://logistics-eu.temu.com',
        'priority': 'u=1, i',
        'referer': 'https://logistics-eu.temu.com/settlement/payment-details/punishment-details',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'x-b-user-info': 'lang=zh'
    }

    for attempt in range(max_retries):
        try:
            logger.info(f"请求第 {page_no} 页数据，尝试 {attempt + 1}/{max_retries}")
            response = requests.request("POST", url, headers=headers, data=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.warning(f"第 {page_no} 页请求失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:  # 如果不是最后一次尝试
                sleep_time = retry_delay * (attempt + 1)  # 指数退避策略
                logger.info(f"等待 {sleep_time} 秒后重试...")
                sleep(sleep_time)
            else:
                logger.error(f"第 {page_no} 页所有重试均失败")
                return None
        except json.JSONDecodeError as e:
            logger.error(f"第 {page_no} 页JSON解析失败: {e}")
            return None

    return None


def export_to_excel_batch(start_page=1, batch_size=20):
    """分页获取所有数据并分批写入Excel，提高大数量写入效率"""
    desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
    filename = os.path.join(desktop_path, "punish_data_202306.xlsx")

    # 定义表头
    columns = ['packageSn', 'waybillSn', 'deliverWarehouseName', 'regionName',
               'settleMonth', 'punishReason', 'punishAmount', 'currency']

    # 检查文件是否存在
    file_exists = os.path.exists(filename)

    if not file_exists:
        # 创建空的DataFrame
        df = pd.DataFrame(columns=columns)
        # 创建Excel文件
        df.to_excel(filename, index=False, engine='openpyxl')
        logger.info(f"已创建Excel文件: {filename}")
    else:
        logger.info(f"使用现有Excel文件: {filename}")

    page_size = 100
    total_records = 0
    total_pages = 0
    processed_records = 0
    failed_pages = []  # 记录失败的页码

    logger.info(f"开始获取数据，从第 {start_page} 页开始，每 {batch_size} 页写入一次...")

    # 获取第一页数据以获取总记录数
    first_page_data = get_punish_data_with_retry(1, page_size)

    if not first_page_data or not first_page_data.get('success'):
        logger.error("获取第一页数据失败，请检查网络连接或参数配置")
        return

    total_records = first_page_data['result']['total']
    logger.info(f"总记录数: {total_records}")

    # 计算总页数
    total_pages = (total_records + page_size - 1) // page_size
    logger.info(f"总页数: {total_pages}")

    # 如果从第1页开始，处理第一页数据
    if start_page == 1 and first_page_data['result']['list']:
        page_data = []
        for item in first_page_data['result']['list']:
            page_data.append({
                'packageSn': item.get('packageSn', ''),
                'waybillSn': item.get('waybillSn', ''),
                'deliverWarehouseName': item.get('deliverWarehouseName', ''),
                'regionName': item.get('regionName', ''),
                'settleMonth': item.get('settleMonth', ''),
                'punishReason': item.get('punishReason', ''),
                'punishAmount': item.get('punishAmount', ''),
                'currency': item.get('currency', '')
            })

        # 将第一页数据写入Excel
        df_page = pd.DataFrame(page_data)
        with pd.ExcelWriter(filename, mode='a', if_sheet_exists='overlay', engine='openpyxl') as writer:
            # 获取现有数据的最后一行
            existing_df = pd.read_excel(filename)
            start_row = len(existing_df)

            # 写入新数据
            df_page.to_excel(writer, startrow=start_row + 1, index=False, header=False)

        processed_records += len(page_data)
        logger.info(f"第 1 页数据已写入Excel，当前进度: {processed_records}/{total_records}")
        start_page = 2  # 设置下一页为第2页

    # 分批处理数据
    batch_data = []
    current_batch_pages = 0

    for page in range(start_page, total_pages + 1):
        logger.info(f"正在获取第 {page}/{total_pages} 页数据...")

        page_data = get_punish_data_with_retry(page, page_size)

        if page_data and page_data.get('success') and page_data['result']['list']:
            for item in page_data['result']['list']:
                batch_data.append({
                    'packageSn': item.get('packageSn', ''),
                    'waybillSn': item.get('waybillSn', ''),
                    'deliverWarehouseName': item.get('deliverWarehouseName', ''),
                    'regionName': item.get('regionName', ''),
                    'settleMonth': item.get('settleMonth', ''),
                    'punishReason': item.get('punishReason', ''),
                    'punishAmount': item.get('punishAmount', ''),
                    'currency': item.get('currency', '')
                })

            processed_records += len(page_data['result']['list'])
            current_batch_pages += 1
            logger.info(f"第 {page} 页数据已缓存，当前进度: {processed_records}/{total_records}")

            # 如果达到批处理大小，写入Excel
            if current_batch_pages >= batch_size:
                logger.info(f"达到批处理大小，写入 {len(batch_data)} 条记录到Excel...")

                # 将批次数据写入Excel
                df_batch = pd.DataFrame(batch_data)
                with pd.ExcelWriter(filename, mode='a', if_sheet_exists='overlay', engine='openpyxl') as writer:
                    # 获取现有数据的最后一行
                    existing_df = pd.read_excel(filename)
                    start_row = len(existing_df)

                    # 写入新数据
                    df_batch.to_excel(writer, startrow=start_row + 1, index=False, header=False)

                logger.info(f"已写入 {len(batch_data)} 条记录")

                # 重置批处理数据
                batch_data = []
                current_batch_pages = 0

                # 短暂休息，避免频繁写入
                sleep(1)
        else:
            # 记录失败的页码
            failed_pages.append(page)
            logger.error(f"第 {page} 页数据获取失败，已跳过")

        # 添加延迟避免请求过快
        sleep(0.5)

    # 处理剩余的未写入数据
    if batch_data:
        logger.info(f"写入剩余的 {len(batch_data)} 条记录到Excel...")

        # 将剩余数据写入Excel
        df_batch = pd.DataFrame(batch_data)
        with pd.ExcelWriter(filename, mode='a', if_sheet_exists='overlay', engine='openpyxl') as writer:
            # 获取现有数据的最后一行
            existing_df = pd.read_excel(filename)
            start_row = len(existing_df)

            # 写入新数据
            df_batch.to_excel(writer, startrow=start_row + 1, index=False, header=False)

        logger.info(f"已写入剩余的 {len(batch_data)} 条记录")

    logger.info(f"数据导出完成！共 {processed_records} 条记录")
    logger.info(f"文件保存为: {filename}")

    # 显示失败的页码
    if failed_pages:
        logger.warning(f"以下页码的数据获取失败: {failed_pages}")
        # 将失败的页码保存到文件
        failed_pages_file = os.path.join(desktop_path, "failed_pages.txt")
        with open(failed_pages_file, 'w') as f:
            for page in failed_pages:
                f.write(f"{page}\n")
        logger.info(f"失败的页码已保存到: {failed_pages_file}")

    # 显示文件所在目录
    logger.info(f"文件目录: {os.path.dirname(filename)}")


if __name__ == "__main__":
    # 可以在这里指定从哪一页开始和批处理大小
    start_from_page = 1  # 从第100页开始
    batch_size = 20  # 每20页写入一次Excel

    export_to_excel_batch(start_page=start_from_page, batch_size=batch_size)