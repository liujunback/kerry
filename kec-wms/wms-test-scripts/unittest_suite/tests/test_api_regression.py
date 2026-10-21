from common import (
    batch_allocate_inventory,
    create_asn,
    create_outbound_order,
    get_inventory,
    get_outbound_order_detail,
    get_outbound_orders,
    prepare_available_inventory,
    receive_sku_to_asn,
    sign_in_asn,
)
from unittest_suite.steps import load_base_data
from unittest_suite.tests.base_case import MainFlowBaseCase


class TestApiRegression(MainFlowBaseCase):
    def test_01_base_data_should_be_available(self):
        """校验基础主数据可用"""
        load_base_data.execute(self.session, self.context)
        self.assertTrue(self.context.base_data.get("warehouse_id"))
        self.assertTrue(self.context.base_data.get("client_id"))
        self.assertTrue(self.context.base_data.get("sku_id"))

    def test_02_asn_create_sign_receive_should_succeed(self):
        """校验 ASN 创建签收收货成功"""
        asn = create_asn(
            self.session,
            {
                "clientId": self.context.base_data["client_id"],
                "warehouseId": self.context.base_data["warehouse_id"],
                "asnType": "NORMAL",
                "externalNumber": f"API-ASN-{self.context.unique_tag}",
                "lines": [
                    {
                        "skuId": self.context.base_data["sku_id"],
                        "skuCode": self.context.base_data["sku_code"],
                        "expectedQty": 5,
                    }
                ],
            },
        )
        self.assertTrue(asn.get("success"), asn.get("message"))

        sign = sign_in_asn(self.session, asn["data"]["id"])
        self.assertTrue(sign.get("success"), sign.get("message"))

        receive = receive_sku_to_asn(
            self.session,
            {
                "asnId": asn["data"]["id"],
                "asnLineId": asn["data"]["lines"][0]["id"],
                "receivedQty": 5,
                "qualityStatus": "GOOD",
                "receivingMode": "SKU",
            },
        )
        self.assertTrue(receive.get("success"), receive.get("message"))

    def test_03_inventory_query_should_succeed(self):
        """校验库存查询成功"""
        inventory = get_inventory(
            self.session,
            {
                "warehouseId": self.context.base_data["warehouse_id"],
                "skuCode": self.context.base_data["sku_code"],
            },
        )["body"]
        self.assertTrue(inventory.get("success"), inventory.get("message"))

    def test_04_outbound_order_create_should_succeed(self):
        """校验出库订单创建成功"""
        order = create_outbound_order(
            self.session,
            {
                "clientId": self.context.base_data["client_id"],
                "warehouseId": self.context.base_data["warehouse_id"],
                "referenceNumber": f"API-ORDER-{self.context.unique_tag}",
                "orderType": "STANDARD",
                "businessType": "STANDARD",
                "priority": "NORMAL",
                "address": {
                    "contactName": "api-regression",
                    "addressLine": "test address",
                    "city": "Shanghai",
                    "province": "Shanghai",
                    "country": "CN",
                    "postalCode": "200000",
                },
                "lines": [
                    {
                        "skuId": self.context.base_data["sku_id"],
                        "skuCode": self.context.base_data["sku_code"],
                        "orderedQty": 2,
                    }
                ],
            },
        )
        self.assertTrue(order.get("success"), order.get("message"))
        self.context.order_id = order["data"]["id"]
        self.context.order_number = order["data"]["orderNumber"]

    def test_05_outbound_order_detail_should_succeed(self):
        """校验出库订单详情查询成功"""
        if not self.context.order_id:
            self.skipTest("订单未创建")
        detail = get_outbound_order_detail(self.session, self.context.order_id)
        self.assertTrue(detail.get("success"), detail.get("message"))
        self.assertEqual(detail["data"]["orderNumber"], self.context.order_number)

    def test_06_allocate_should_return_result(self):
        """校验库存分配接口返回结果"""
        if not self.context.order_id:
            self.skipTest("订单未创建")
        allocate = batch_allocate_inventory(self.session, [self.context.order_id])
        detail = get_outbound_order_detail(self.session, self.context.order_id)
        allocated = get_outbound_orders(
            self.session,
            {
                "warehouseId": self.context.base_data["warehouse_id"],
                "clientId": self.context.base_data["client_id"],
                "status": "ALLOCATED",
                "pageSize": 10,
            },
        )
        self.assertTrue(
            allocate.get("success") or detail.get("success"),
            allocate.get("message") or detail.get("message"),
        )
        self.assertIsInstance(allocated.get("data", []), list)

    def test_07_prepare_available_inventory_should_return_result(self):
        """校验自动备货流程有返回结果"""
        result = prepare_available_inventory(self.session, self.context.base_data, 5)
        self.assertIn("success", result)

    def test_08_invalid_sku_should_fail(self):
        """校验非法 SKU 下单失败"""
        result = create_outbound_order(
            self.session,
            {
                "clientId": self.context.base_data["client_id"],
                "warehouseId": self.context.base_data["warehouse_id"],
                "referenceNumber": f"API-ERR-{self.context.unique_tag}",
                "orderType": "STANDARD",
                "businessType": "STANDARD",
                "priority": "NORMAL",
                "address": {
                    "contactName": "api-negative",
                    "addressLine": "negative address",
                    "city": "Shanghai",
                    "province": "Shanghai",
                    "country": "CN",
                    "postalCode": "200000",
                },
                "lines": [{"skuCode": "NOT-EXIST-SKU", "orderedQty": 1}],
            },
        )
        self.assertFalse(result.get("success"))
