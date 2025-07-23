import os


def getProperties(API="KEC"):
    # 修正文件路径映射，确保使用正确的文件名
    api_file_map = {
        "KEC-备用": "../../生产主流程/data/KEC_params.properties",
        "KP": "../../生产主流程/data/KP_params.properties",
        "JP": "../../生产主流程/data/JP_params.properties",
        "DE": "../../生产主流程/data/DE_params.properties",
        "TH": "../../生产主流程/data/TH_params.properties",
        "KEC": "../../生产主流程/data/kec_备用.properties",  # 确保文件名与实际一致
        "default": "../../生产主流程/data/Test_params.properties"
    }

    file_name = api_file_map.get(API, api_file_map["default"])

    properties = {}
    pro_file = None

    try:
        # 尝试多种可能的编码格式
        for encoding in ['utf-8', 'gbk', 'latin1']:
            try:
                with open(file_name, 'r', encoding=encoding) as pro_file:
                    for line in pro_file:
                        # 跳过空行和注释行
                        if line.strip() and not line.strip().startswith('#') and '=' in line:
                            # 分割键值对时保留值部分的原始空格
                            key, value = line.split('=', 1)
                            properties[key.strip()] = value.strip()
                # 如果成功读取，跳出循环
                break
            except UnicodeDecodeError:
                # 当前编码失败，尝试下一种
                continue
        else:
            # 所有编码都失败
            raise UnicodeDecodeError("fFailed to decode file with any encoding: {file_name}")

    except Exception as e:
        # 添加详细的错误信息
        error_msg = f"Error reading properties file '{file_name}': {str(e)}"
        if os.path.exists(file_name):
            error_msg += f"\nFile size: {os.path.getsize(file_name)} bytes"
        raise RuntimeError(error_msg) from e

    return properties


