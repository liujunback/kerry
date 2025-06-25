import datetime

track = ['TESTBACK981355121', 'TESTBACK7550571968', 'TESTBACK1749095568', 'TESTBACK2029329218', 'TESTBACK697506948', 'TESTBACK7067612103', 'TESTBACK2112013075', 'TESTBACK7738610084', 'TESTBACK3506253972', 'TESTBACK1660103543']
for i in range(len(track)):
    if i == len(track)-1:
        print(track[i])
a=[[1,2],[3,4]]
[x for b in a for x in b]
jump_item_iter = (j for j in a if 2)
try:
    jump_item = jump_item_iter.next()
    print(jump_item)
except:
    print("")
datetime.datetime.now()+datetime.timedelta(days=1).strftime("%Y-%m-% d %H:%M:%S")