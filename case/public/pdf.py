import os
import urllib.request

import requests


def pdf(url,a):#传入地址，文件存储的名字
    pdf= urllib.request.urlopen(url)#用于打开一个远程的url连接,并且向这个连接发出请求,获取响应结果
    result = pdf.read()
    with open("D:\pdf\\"+a+".pdf", 'wb') as f:#打开文件并且写入读取到的数据
        f.write(result)
# pdf("http://stg.timespss.com/storage/labels/parcel/KECTH00000963_20200911165633.pdf","1213")
# pdf("https://spider.tec-api.com//package/d64e11ba-3e67-1d52-61ba-3691d74d1bf4/label","123")
#pdf("http://stg.timesoms.com/storage/labels/label-B200928111822271.pdf",1234)


