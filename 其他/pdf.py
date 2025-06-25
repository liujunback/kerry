import json
import re

import requests

urls=[]
with open('pdf.txt', 'r') as file:
    for line in file:
        urls.append(line.strip())
        print(line.strip())

for url in urls:
    if re.findall(r"Label/(.+?).pdf",url):
        reference_number = re.findall(r"Label/(.+?).pdf",url)[0]
    # url = json.loads(response.text)["data"]["label"]
    # print(url)
    print(reference_number)
    pdf = requests.get(url)
    with open("D:\pdf\\"+reference_number+".pdf", 'wb') as f:
        f.write(pdf.content)