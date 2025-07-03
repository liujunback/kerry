import json
import csv
import sys
import chardet
import re
import os
from io import StringIO
import traceback


def detect_encoding(file_path):
    """检测文件编码"""
    try:
        with open(file_path, 'rb') as f:
            rawdata = f.read(10000)  # 读取前10000字节用于检测编码
            result = chardet.detect(rawdata)
            return result['encoding'] or 'utf-8'
    except Exception as e:
        print(f"❌ 编码检测失败: {str(e)}")
        return 'utf-8'


def clean_nul_chars(content):
    """移除内容中的空字符(NUL)"""
    return re.sub(r'\x00', '', content)


def preprocess_file(file_path, encoding):
    """预处理文件：移除NUL字符并修复常见问题"""
    try:
        # 读取整个文件内容
        with open(file_path, 'rb') as f:
            raw_content = f.read()

        # 移除NUL字符
        cleaned_content = clean_nul_chars(raw_content.decode(encoding, errors='replace'))

        # 修复常见的行尾问题
        cleaned_content = cleaned_content.replace('\r\n', '\n').replace('\r', '\n')

        # 移除尾部的空行
        cleaned_content = cleaned_content.strip()

        return cleaned_content

    except Exception as e:
        print(f"❌ 文件预处理失败: {str(e)}")
        return None


def detect_delimiter(content):
    """从内容中检测分隔符"""
    if not content:
        return ','

    try:
        # 获取第一行
        first_line = content.split('\n', 1)[0]

        # 常见分隔符及其出现频率
        delimiters = {
            ',': first_line.count(','),
            '\t': first_line.count('\t'),
            ';': first_line.count(';'),
            '|': first_line.count('|'),
            ' ': first_line.count(' ')  # 空格分隔符
        }

        # 选择出现次数最多的分隔符
        return max(delimiters, key=delimiters.get)
    except:
        return ','


def safe_strip(value):
    """安全地去除字符串两端的空白字符"""
    if value is None:
        return ""
    return str(value).strip()


def convert_to_json(input_file, output_file=None, delimiter=None):
    """
    将文本文件转换为 JSON 格式

    参数:
        input_file: 输入文件路径
        output_file: 输出文件路径（可选，不指定则返回列表）
        delimiter: 字段分隔符（可选，自动检测）

    返回:
        如果未指定输出文件，则返回 JSON 对象列表
    """
    try:
        # 1. 检测文件编码
        encoding = detect_encoding(input_file)
        print(f"🔍 检测到文件编码: {encoding}")

        # 2. 预处理文件（移除NUL字符等）
        print("🧹 正在清理文件中的无效字符...")
        content = preprocess_file(input_file, encoding)
        if content is None:
            raise ValueError("文件预处理失败")

        # 3. 检测分隔符
        if delimiter is None:
            delimiter = detect_delimiter(content)
            print(f"🔍 检测到分隔符: {repr(delimiter)}")

        # 4. 使用StringIO创建类似文件的对象
        content_io = StringIO(content)

        # 5. 读取字段名
        first_line = content_io.readline()
        if not first_line:
            raise ValueError("文件为空或第一行为空")

        # 安全处理标题行
        fieldnames = [safe_strip(field) for field in first_line.split(delimiter)]
        print(f"📋 检测到字段: {fieldnames}")

        # 6. 重置指针
        content_io.seek(0)

        # 7. 创建CSV字典读取器
        reader = csv.DictReader(content_io, fieldnames=fieldnames, delimiter=delimiter)

        # 跳过标题行（因为我们已经手动处理了）
        next(reader, None)

        # 8. 收集所有行数据
        json_data = []
        line_count = 0

        for row in reader:
            line_count += 1
            try:
                cleaned_row = {}
                for key in fieldnames:
                    # 安全处理每个值
                    value = row.get(key, "")
                    safe_value = safe_strip(value)

                    # 尝试转换为数字
                    try:
                        # 如果值看起来像数字，尝试转换
                        if safe_value.replace('.', '', 1).isdigit():
                            if '.' in safe_value:
                                safe_value = float(safe_value)
                            else:
                                safe_value = int(safe_value)
                    except (ValueError, TypeError):
                        pass

                    cleaned_row[key] = safe_value

                json_data.append(cleaned_row)

                if line_count % 1000 == 0:
                    print(f"📊 已处理 {line_count} 行数据...")

            except Exception as e:
                print(f"⚠️ 处理第 {line_count} 行时出错: {str(e)}")
                print(f"问题行内容: {row}")
                traceback.print_exc()

        print(f"✅ 成功转换 {line_count} 行数据")

        # 9. 如果指定了输出文件
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as out_f:
                json.dump(json_data, out_f, indent=4, ensure_ascii=False)
            print(f"💾 数据已保存到: {output_file}")
            return True
        else:
            return json_data

    except Exception as e:
        print(f"❌ 转换失败: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        return None


def backup_file(file_path):
    """创建文件备份"""
    backup_path = file_path + ".bak"
    try:
        import shutil
        shutil.copyfile(file_path, backup_path)
        print(f"📂 已创建文件备份: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"⚠️ 备份失败: {str(e)}")
        return None


def manual_parse(content, delimiter, fieldnames):
    """手动解析CSV内容（当标准方法失败时使用）"""
    lines = content.split('\n')
    data = []
    line_count = 0

    # 跳过标题行（索引0）
    for line in lines[1:]:
        line_count += 1
        try:
            if not line.strip():
                continue

            # 安全分割行
            values = [safe_strip(v) for v in line.split(delimiter)]

            # 如果字段数量不匹配，尝试处理
            if len(values) != len(fieldnames):
                # 尝试更智能的分割（处理包含分隔符的引号字段）
                values = [safe_strip(v) for v in re.split(f'(?<!\\\\){delimiter}', line)]

                # 如果仍然不匹配，跳过或部分处理
                if len(values) > len(fieldnames):
                    values = values[:len(fieldnames)]
                elif len(values) < len(fieldnames):
                    values += [''] * (len(fieldnames) - len(values))

            # 创建行字典
            row = {}
            for i, header in enumerate(fieldnames):
                if i < len(values):
                    row[header] = values[i]
                else:
                    row[header] = ""

            data.append(row)

        except Exception as e:
            print(f"⚠️ 手动解析第 {line_count} 行时出错: {str(e)}")
            print(f"问题行内容: {line}")

    return data


# 使用示例
if __name__ == "__main__":
    # 输入文件路径
    input_file = "D:\谷歌下载文件\KEC upload order template(Multi-item Multi line).xlsx"  # 替换为您的文件路径

    # 输出文件路径（可选）
    output_file = "D:\谷歌下载文件\output.json"

    # 创建文件备份
    backup_file(input_file)

    try:
        # 转换文件
        result = convert_to_json(
            input_file=input_file,
            output_file=output_file
        )

        # 如果不输出到文件，打印结果
        if not output_file and result:
            print("转换后的 JSON 数据:")
            print(json.dumps(result, indent=4, ensure_ascii=False))

    except Exception as e:
        print(f"❌ 处理过程中出错: {str(e)}", file=sys.stderr)

        # 尝试手动解析
        print("🛠️ 尝试手动解析文件...")
        try:
            encoding = detect_encoding(input_file)
            content = preprocess_file(input_file, encoding)

            if content:
                # 检测分隔符和字段名
                delimiter = detect_delimiter(content)
                first_line = content.split('\n', 1)[0]
                fieldnames = [safe_strip(field) for field in first_line.split(delimiter)]

                # 手动解析
                json_data = manual_parse(content, delimiter, fieldnames)

                if json_data:
                    if output_file:
                        with open(output_file, 'w', encoding='utf-8') as out_f:
                            json.dump(json_data, out_f, indent=4, ensure_ascii=False)
                        print(f"💾 手动解析数据已保存到: {output_file}")
                    else:
                        print("手动解析的 JSON 数据:")
                        print(json.dumps(json_data, indent=4, ensure_ascii=False))
                else:
                    print("❌ 手动解析失败，未生成有效数据")
            else:
                print("❌ 无法读取文件内容进行手动解析")
        except Exception as e2:
            print(f"❌ 手动解析也失败: {str(e2)}")