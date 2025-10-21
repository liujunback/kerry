import json

# 你的JSON字符串列表
json_strings = [
    '{"incidentalFee": 19.48933, "shippingFeeCurrency": "USD", "incidentalFeeCurrency": "USD"}',
    '{"incidentalFee": 28.40717, "shippingFeeCurrency": "USD", "incidentalFeeCurrency": "USD"}',
    '{"incidentalFee": 0.03642, "shippingFeeCurrency": "USD", "incidentalFeeCurrency": "USD"}',
    '{"incidentalFee": 0.00807, "shippingFeeCurrency": "USD", "incidentalFeeCurrency": "USD"}',
    '{"incidentalFee": 0.00585, "shippingFeeCurrency": "USD", "incidentalFeeCurrency": "USD"}',
    '{"incidentalFee": 0.01011, "shippingFeeCurrency": "USD", "incidentalFeeCurrency": "USD"}',
    '{"incidentalFee": 7.28031, "shippingFeeCurrency": "USD", "incidentalFeeCurrency": "USD"}',
    '{"incidentalFee": 3.36097, "shippingFeeCurrency": "USD", "incidentalFeeCurrency": "USD"}'
]

for i, json_str in enumerate(json_strings, 1):
    data = json.loads(json_str)
    print(f"{data['incidentalFee']}")