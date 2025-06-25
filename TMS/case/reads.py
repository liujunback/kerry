import json

x=[]
i=1
def test():
    global x
    with open('../request_data/failed_data.txt') as filename:
        for line in filename:
            tracking=line.rstrip()
            x.append(tracking)
            #print(x[i])
def test1():
    global i
    test()
    print(x[i])
    i=i+1


with open("../../TMS/case/KEC_order.txt", 'r',encoding= 'utf-8') as f:
    param2 = json.loads(f.read())#转换成字典
    f.close()