import redis

pool = redis.ConnectionPool(host='localhost', port=6379, db = 3)
r = redis.Redis(connection_pool=pool)
keys = r.keys("*")
for i in keys:
    print(r.get(i))