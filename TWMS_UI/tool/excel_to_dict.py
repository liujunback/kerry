import pandas as pd


def excel_to_dict(file_path, sheet_name=0):
    """
    读取Excel文件并将每行数据转换为字典，使用第一行作为键

    参数:
        file_path: Excel文件路径
        sheet_name: 工作表名称或索引，默认为第一个工作表

    返回:
        list: 包含所有行数据的字典列表
    """
    # 读取Excel文件
    df = pd.read_excel(file_path, sheet_name=sheet_name)

    # 将NaN值替换为None
    df = df.where(pd.notnull(df), None)

    # 转换为字典列表（每行一个字典）
    result = df.to_dict(orient='records')

    return result

