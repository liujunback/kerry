import requests
import json
import pandas as pd


def clean_phone_number(phone):
    """清理电话号码，移除浮点数的小数部分"""
    if pd.isna(phone):
        return ""

    # 转换为字符串并移除可能的.0后缀
    phone_str = str(phone)
    if phone_str.endswith('.0'):
        phone_str = phone_str[:-2]

    # 移除所有非数字字符（除了+号）
    cleaned = ''.join(filter(str.isdigit, phone_str))

    return cleaned


def get_schedule_for_day(row, day_patterns):
    """获取指定天的营业时间，处理列名中的空格差异"""
    for pattern in day_patterns:
        if pattern in row.index:
            schedule = row[pattern]
            if pd.isna(schedule) or schedule == "Closed" or schedule == "":
                return None
            return str(schedule)
    return None


# 读取Excel文件
file_path = "test.xlsx"
sheet_spain = pd.read_excel(file_path, sheet_name="Spain Leads")
sheet_portugal = pd.read_excel(file_path, sheet_name="Portugal Leads")

# 合并两个sheet
df = pd.concat([sheet_spain, sheet_portugal], ignore_index=True)


# 遍历每一行
for index, row in df.iterrows():
    # 定义每个星期几可能的列名模式（处理空格差异）
    day_patterns = {
        "Monday": ["Horario del establecimiento [Lunes]", "Horario del establecimiento [Lunes] "],
        "Tuesday": ["Horario del establecimiento [Martes]", "Horario del establecimiento [Martes] "],
        "Wednesday": ["Horario del establecimiento [Miercoles]", "Horario del establecimiento [Miercoles] "],
        "Thursday": ["Horario del establecimiento [Jueves]", "Horario del establecimiento [Jueves] "],
        "Friday": ["Horario del establecimiento [Viernes]", "Horario del establecimiento [Viernes] "],
        "Saturday": ["Horario del establecimiento [Sabado]", "Horario del establecimiento [Sabado] "],
        "Sunday": ["Horario del establecimiento [Domingo]", "Horario del establecimiento [Domingo] "]
    }

    enhanced_business_hours = []
    business_hours = []

    for eng_day, patterns in day_patterns.items():
        schedule = get_schedule_for_day(row, patterns)

        if schedule is None:
            # 如果当天不营业，添加一个空的时间段到enhanced_business_hours
            enhanced_business_hours.append({
                "day": eng_day,
                "timeSlots": ""
            })
            continue

        # 解析多个时间段（例如 "09:00 - 13:00 ; 16:00 - 20:00"）
        time_slots = []
        all_open_times = []
        all_close_times = []

        for slot in schedule.split(";"):
            slot = slot.strip()
            if " - " in slot:
                try:
                    open_time, close_time = slot.split(" - ")
                    open_time = open_time.strip()
                    close_time = close_time.strip()
                except Exception as e:
                    print(index)

                # 确保时间格式正确（添加前导零）
                if len(open_time) == 4:  # 如"9:00"变成"09:00"
                    open_time = "0" + open_time
                if len(close_time) == 4:
                    close_time = "0" + close_time

                time_slots.append(f"{open_time}-{close_time}")
                all_open_times.append(open_time)
                all_close_times.append(close_time)

        if time_slots:
            enhanced_business_hours.append({
                "day": eng_day,
                "timeSlots": ",".join(time_slots)
            })

            # 为business_hours添加合并后的时间段（最早开门时间和最晚关门时间）
            if all_open_times and all_close_times:
                earliest_open = min(all_open_times)
                latest_close = max(all_close_times)
                business_hours.append({
                    "day": eng_day,
                    "open": earliest_open,
                    "close": latest_close
                })
        else:
            # 如果没有有效时间段，添加一个空的时间段到enhanced_business_hours
            enhanced_business_hours.append({
                "day": eng_day,
                "timeSlots": ""
            })

    # 获取联系电话（优先使用固定电话，如果没有则使用手机）
    telefono = clean_phone_number(row.get("Teléfono", ""))
    movil = clean_phone_number(row.get("Móvil", ""))
    contact_phone = telefono if telefono else movil

    # 处理员工数 - 使用门牌号，但需要确保是整数
    try:
        numero_empleados = int(float(row["Número"])) if pd.notna(row["Número"]) else 0
    except (ValueError, TypeError):
        numero_empleados = 0

    # 处理邮政编码 - 保留前导零
    postal_code = ""
    if pd.notna(row["Código postal"]):
        # 转换为字符串并处理浮点数情况
        postal_str = str(row["Código postal"])
        if '.' in postal_str:
            # 如果是浮点数，去掉小数部分
            postal_str = postal_str.split('.')[0]

        # 补齐前导零到5位（西班牙和葡萄牙邮政编码通常是5位）
        postal_code = postal_str.zfill(5)

    # 构造请求体
    payload = {
        "language": "es" if row["Provincia"] in sheet_spain["Provincia"].values else "pt",
        "businessName": str(row["Nombre del establecimiento"]),
        "vatNumber": str(row["CIF/NIF/NIE"]).replace('.0', '') if pd.notna(row["CIF/NIF/NIE"]) else "",
        "address": f"{row['Calle']} {row['Número']}",
        "postalCode": postal_code,  # 使用处理后的邮政编码
        "city": str(row["Ciudad"]),
        "province": str(row["Provincia"]),
        "country": "es" if row["Provincia"] in sheet_spain["Provincia"].values else "pt",
        "businessActivity": "other",
        "numberOfEmployees": numero_empleados,
        "availableStorageArea": 20,  # 固定值20
        "contactFirstName": str(row["Nombre"]),
        "contactLastName": f"{row['Apellido 1']} {row.get('Apellido 2', '')}".strip(),
        "contactEmail": str(row["Correo electrónico"]),
        "contactPhone": contact_phone,
        "facilities": [],
        "resources": "1",
        "businessHours": business_hours,  # 使用合并后的时间段
        "enhancedBusinessHours": enhanced_business_hours,  # 使用Excel中的详细时间段
        "privacyConsent": True,
        "marketingConsent": True,
        "commercialConsent": True,
        "skip_captcha": True,
        "recaptchaToken": "test"
    }

    # 打印调试信息
    # print(f"Processing row {index + 1}: {row['Nombre del establecimiento']}")
    # print(f"Business hours: {json.dumps(business_hours, indent=2)}")
    # print(f"Enhanced business hours: {json.dumps(enhanced_business_hours, indent=2)}")

    # 发送请求
    headers = {"Content-Type": "application/json"}
    try:
        # print(json.dumps(payload))
        # API端点
        url = "https://pudo-portal.parcelbox.net/api/pudo/register"
        response = requests.post(url, headers=headers, data=json.dumps(payload, ensure_ascii=False))
        if response.status_code == 201:
            print("成功：" + str(index))
            df.at[index, '结果'] = '成功'
            df.at[index, '失败原因'] = ''
        else:
            print(json.dumps(payload))
            print(response.text)
            df.at[index, '结果'] = '失败'
            df.at[index, '失败原因'] = response.text

    except Exception as e:
        print(json.dumps(payload))
        print(response.text)
        df.at[index, '结果'] = '失败'
        df.at[index, '失败原因'] = str(e)
    output_file = "test_processed.xlsx"
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        # 分离西班牙和葡萄牙的数据
        spain_mask = df['Provincia'].isin(sheet_spain['Provincia'].values)
        portugal_mask = ~spain_mask

        # 写入西班牙数据
        df[spain_mask].to_excel(writer, sheet_name='Spain Leads', index=False)
        # 写入葡萄牙数据
        df[portugal_mask].to_excel(writer, sheet_name='Portugal Leads', index=False)

    # print(f"处理完成！结果已保存到文件: {output_file}")

    # print("-" * 50)