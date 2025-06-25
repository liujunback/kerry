from _md5 import md5

version = "1.0"
companyToken = "eff980b6-d0d6-4985-b3f4-d2938197b6ec"
companyAccount = "6e4b65df-fa27-4e8f-8095-deb12e553cc5"

import hashlib

str = companyAccount+ companyToken  +version

md5 = hashlib.md5()   				# 创建md5加密对象
md5.update(str.encode('utf-8'))  	# 指定需要加密的字符串
str_md5 = md5.hexdigest()  			# 加密后的字符串

print(str_md5)						# 结果：e10adc3949ba59abbe56e057f20f883e
