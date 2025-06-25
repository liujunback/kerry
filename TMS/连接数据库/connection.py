import pymysql
def select_address(country):
    host='localhost'
    user='root'
    password='root'
    database='address'
    charset='utf8'
    db = pymysql.connect(host = host,user = user,password = password,database = database,charset = charset)
    # 查询语句
    address = []
    try:
        # 使用 cursor() 方法创建一个游标对象 cursor
        cursor = db.cursor()
        sql = "SELECT * FROM address.random_address where country = '"+country+"'"
        cursor.execute(sql)
        result = cursor.fetchall()
        for data in result:
            address.append({
                "country":data[0],
                "province":data[1],
                "city":data[2],
                "district":data[3],
                "address":data[4],
                "post_code":data[5],
                "location_code":data[6],
            })
    except Exception:
        print("查询失败")
    return address
    db.close()


print(select_address("MY"))