import pymssql


class MSSQL:
    def __init__(self, host, port, user, password, database):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self.connection = self.__create_connection()
        self.cursor = self.__create_cursor()

    def __create_connection(self):
        try:
            self.connection = pymssql.connect(host=self.host, port=self.port, user=self.user, password=self.password,
                                              database=self.database,
                                              charset="utf8", timeout=30,login_timeout=30)

        except Exception as e:
            raise Exception('connect mysql err:' + str(e))

        return self.connection

    def __create_cursor(self):
        # 通过数据库连接建立一个操作游标
        self.cursor = self.connection.cursor()
        return self.cursor

    # 关闭数据库连接
    def __del__(self):
        try:
            if self.connection != None:
                self.cursor.close()
                self.connection.close()
        except Exception as e:
            return e

    # 查询操作，查询单条数据
    def get_one(self, sql):
        res = None
        try:
            self.cursor.execute(sql)
            res = self.cursor.fetchone()
        except Exception:
            res = None
        return res

    # 查询操作，查询多条数据
    def get_all(self, sql):
        # res = ()
        try:
            self.cursor.execute(sql)
            res = self.cursor.fetchall()
        except Exception:
            res = ()
        return res

    # 数据库插入、更新、删除操作
    def insert(self, sql):
        return self.__edit(sql)

    def update(self, sql):
        return self.__edit(sql)

    def delete(self, sql):
        return self.__edit(sql)

    def __edit(self, sql):
        try:
            # self.connect()
            count = self.cursor.execute(sql)
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise Exception('sql exec err:' + str(e))
        return count
