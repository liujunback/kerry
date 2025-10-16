def getProperties(API = "test"):
    api_file_map = {
        "虎门": "../../TWMS/properties_data/生产_TWMS_虎门.properties",
        "前海": "../../TWMS/properties_data/生产_TWMS_前海.properties",
        "default": "../../TWMS/properties_data/TWMS_测试_params.properties",  # 确保文件名与实际一致
        "test": "../../TWMS/properties_data/TWMS_测试_params.properties"
    }

    file_name = api_file_map.get(API, api_file_map["default"])
    try:
        pro_file = open(file_name, 'r', encoding='utf-8')
        properties = {}
        for line in pro_file:
            if line.find('=') > 0:
                strs = line.replace('\n', '').replace(' ', '').split('=')
                properties[strs[0]] = strs[1]
    except Exception as e:
        raise e
    else:
        pro_file.close()
    return properties
