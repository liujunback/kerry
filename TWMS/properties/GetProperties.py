def getProperties(API = "test"):
    if API == "test":
        file_name = "../../TWMS/data/TWMS_测试_params.properties"
    else:
        file_name = "../../TWMS/data/TWMS_测试_params.properties"
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
