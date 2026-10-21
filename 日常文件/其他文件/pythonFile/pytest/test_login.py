
import pytest
import json
import requests


class Test_Login():

    @pytest.mark.parametrize('payload',[{"username": "999666_KERRYCN","password": "b05b41732aac4fa491723669c35f10d3"},
                                        {"username": "9900009_KERRYCN","password": "77e0fd2a56444da1849c714bff1bbc5f"}])
    def test_login(self,payload):
        url = "http://47.119.120.7:8000/pos-web/token/get"#测试
        #url = "http://120.78.66.231:8000/pos-web/token/get" #生产
        # payload={
        #             "username": "860416_KERRYCN",
        #             "password": "433198736ea248388f4779e57ba7df20"
        #         }

        headers = {
          'Content-Type': 'application/json'
        }
        print(payload)
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        assert json.loads(response.text)['body']['token'] !=""
        print(json.loads(response.text)['body']['token'])
        return json.loads(response.text)['body']['token']

if __name__ == "__main__":
    pytest.main('test_login.py')