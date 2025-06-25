#!/usr/bin/python3
# coding=utf-8
# 导入包
import random
# 全局变量
# 函数
# 类
# 调用函数或者类
# 装所以数据的列表
class StudentSys(object):
    def __init__(self):
        # 实例属性
        self.names = []
        self.infos = "1:增加|2:删除|3:修改|4:查找|5:显示|6:退出系统"

    # 打印提示信息(菜单)
    def print_menu(self):
        "打印提示菜单信息"
        print("=" * 25)
        print("\t~学生管理系统版本~")
        print("\t1:添加学生信息")
        print("\t2:删除学生信息")
        print("\t3:修改学生信息")
        print("\t4:查找学生信息")
        print("\t5:显示学生信息")
        print("\t6:退出学生信息系统")
        print("=" * 25)

    def add_info(self):
        "添加信息"
        self.student = {}
        name = input("请添加新同学的姓名:")
        phone = input("请添加新同学的手机号:")
        wechat = input("请输入新同学的微信号:")
        self.student["name"] = name
        self.student["phone"] = phone
        self.student["wechat"] = wechat

        # 把学生信息(字典里面)添加到列表
        self.names.append(self.student)
        self.show_info()
        self.save_info()

    def delete_info(self):
        '删除信息'
        # 根据下标删除和内容删除和末尾删除
        del_name = input("请输入删除的学生的姓名:")
        for name in self.names:
            # name:{"name":"曹操"....}
            if del_name == name.get("name"):
                self.names.remove(name)

        self.show_info()
        self.save_info()

    def modify_info(self):
        """修改信息"""
        # 根据下标修改index是列表的方法
        find_name = input("请输入您需要修改学生的姓名: ")
        flag = 0  # 0,没有找到,1找到了
        for name in self.names:

            if find_name == name["name"]:
                new_name = input("请输入新的名字: ")
                name["name"] = new_name
                flag = 1
                break

        if flag == 0:
            print("该名学生%s不存在" % find_name)

        else:
            self.show_info()
        self.save_info()

    def find_info(self):
        '''查找信息'''
        find_name = input("请输入你要查找的姓名:")
        flag = 0  # 0,没有找到,1找到了
        for name in self.names:
            for value in name.values():
                if find_name == value:
                    flag = 1
                    print("找到了:{}".format(find_name))
                    break

        if flag == 0:
            print("没有找到:{}".format(find_name))

    def show_info(self):
        "表格方式显示所以信息"
        print("\n")
        print("当前学生信息")
        print("~" * 50)
        print("\t姓名\t\t\t电话\t\t\t微信\t")
        for name in self.names:
            msg = "\t" + name.get("name") + "\t\t" + name.get("phone") + "\t\t" + name.get("wechat") + "\t\t"
            print("~" * 50)
            print(msg)
        print("~" * 50)
        print("\n")

    # 程序的主要逻辑和程序入口
    def start(self):
        self.print_menu()
        # 加载文件中保存的信息,加载到内存中
        self.load_info()
        while True:
            print("\n\n")
            print("操作指令")
            print("~" * 50)
            print(self.infos)
            print("~" * 50)
            number = input("请按照上面的提示输入相应指令:")

            # 判断是否输入是纯的数字
            if number.isdigit():
                number = int(number)
                if number == 1:
                    # 添加信息
                    self.add_info()
                elif number == 2:
                    # 删除信息
                    self.delete_info()
                elif number == 3:  # 修改
                    # 修改信息
                    self.modify_info()
                elif number == 4:  # 查找
                    # 查找信息
                    self.find_info()
                elif number == 5:
                    # 显示信息
                    self.show_info()
                elif number == 6:
                    break

            else:
                print("请输入正确的编号!")

    # 运行的时候,读取保存在文件的信息,并且赋值给names,第一次读文件,文件不存在,"r"会报错,"a+"
    def load_info(self):
        f = open("students.txt", "a+")
        f.seek(0, 0)
        content = f.read()
        # print("content==",content)
        if len(content) > 0:
            self.names = eval(content)

    # 每次删除或者修改或者增加都重新保存数据,覆盖保存w
    def save_info(self):
        f = open("students.txt", "w")
        f.write(str(self.names))
        f.close()


s = StudentSys()
s.start()