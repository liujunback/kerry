




def getProperties(API = "KEC"):
    if API == "KEC":
        file_name = "../../生产主流程/data/KEC_params.properties"
    elif API == "KP":
        file_name = "../../生产主流程/data/KP_params.properties"
    elif API == "JP":
        file_name = "../../生产主流程/data/JP_params.properties"
    else:
        file_name = "../../生产主流程/data/Test_params.properties"
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

