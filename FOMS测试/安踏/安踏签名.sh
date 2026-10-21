 CLIENT_KEY="KEC_WMS_HK"
  CLIENT_SECRET="1fM=^wJGYX32L9tg"
  URL="https://stg-foms-api.kec-app.com/platform/anta/sku/create"
  BODY='{
              "skus": [
                {
                  "sku": "Anta003",
                  "skuName": "Basketball Shoes",
                  "barcode": "840419901601",
                  "brandCode": "1001",
                  "brandName": "安踏大货",
                  "categoryCode": "10",
                  "categoryName": "鞋类",
                  "mclassCode": "ZX001",
                  "mclassName": "篮球鞋",
                  "sclassCode": "PX003",
                  "sclassName": "篮球鞋",
                  "color": "Grey/White",
                  "englishName": "Basketball Shoes",
                  "grossWeight": 0.01,
                  "netWeight": 0.01,
                  "volume": 0.01,
                  "year": "2024",
                  "season": "Q2",
                  "artNo": "8124B1102S-6",
                  "sizeKey": "15",
                  "countryCode": "US",
                  "isRfid": 0,
                  "priceList": [
                    {
                      "countryCode": "US",
                      "currency": "USD",
                      "amount": 125.00
                    },
                    {
                      "countryCode": "CN",
                      "currency": "CNY",
                      "amount": 899.00
                    }
                  ]
                }
              ]
            }'


  NONCE=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]')
  TS=$(date +%s)000
  SIG=$(echo -n "${CLIENT_KEY}|${CLIENT_SECRET}|${NONCE}|${TS}|${BODY}" | md5)

  echo ""
  echo "========== 生成的 curl 命令 =========="
  echo ""
  echo "curl -X POST '${URL}' \\"
  echo "-H 'Content-Type: application/json' \\"
  echo "-H 'clientKey: ${CLIENT_KEY}' \\"
  echo "-H 'nonceStr: ${NONCE}' \\"
  echo "-H 'timestamp: ${TS}' \\"
  echo "-H 'signature: ${SIG}' \\"
  echo "-d '${BODY}'"
  echo ""
