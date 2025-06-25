# import pytest
#
#
#
# @pytest.mark.parametrize('x',[(1),(2),(6)])
# def test_login(x):
#     print(x)
#     assert x==6
#
#
# # def test(test_data):
# #     print(test_data())
# #     test_data()
# #     print(test_data())
# #
# # @test
# # def test1():
# #     print(12)
#
#
#
# import time
#
# def time_it(func):
#     def inner():
#         start = time.time()
#         func()
#         end = time.time()
#         print('用时:{}秒'.format(end-start))
#     return inner


class Person:
    def __init__(self,name,age):
        self.name = name
        if type(age) is int:
            self.__age = age
        else:
            print( '你输入的年龄的类型有误,请输入数字')
    @property
    def age(self):
        return self.__age

    @age.setter
    def age(self,a):
        '''判断,你修改的年龄必须是数字'''
        print("123")
        if type(a) is int:
            self.__age = a
        else:
            print('你输入的1年龄的类型有误,请输入数字')

    @age.deleter
    def age(self):
        del self.__age


p1 = Person('帅哥',10)

print(p1.age)
p1.age=124
# del p1.age


