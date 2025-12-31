import base64

def file_to_base64(file_path):
    """
    读取文件内容并转换成Base64字符串

    参数:
    file_path (str): 要读取并转换的文件路径

    返回:
    str: 文件内容的Base64编码字符串
    """
    try:
        # 以二进制模式打开文件
        with open(file_path, 'rb') as file:
            # 读取文件内容
            file_content = file.read()
            # 将文件内容转换为Base64编码
            base64_encoded_str = base64.b64encode(file_content).decode('utf-8')
            return base64_encoded_str
    except FileNotFoundError:
        print("文件 {file_path} 未找到！")
        return None
    except Exception as e:
        print("读取文件或编码时发生错误: {e}")
        return None

# 假设你的文件名为 k_parcel_api_doc.txt
file_path = 'k_parcel_api_doc.txt'
base64_str = file_to_base64(file_path)

if base64_str:
    print("文件内容的Base64编码字符串:")
    print(base64_str)
else:
    print("未能获取Base64编码字符串。")