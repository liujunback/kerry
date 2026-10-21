from common import create_manifest_order, create_outbound_order, get_outbound_order_detail, validate_manifest_mount
from unittest_suite.steps import load_base_data, verify_invalid_sku
from unittest_suite.tests.base_case import MainFlowBaseCase


class TestMainFlowNegative(MainFlowBaseCase):
    def test_01_load_base_data(self):
        """加载异常流程基础主数据"""
        load_base_data.execute(self.session, self.context)
        self.assertTrue(self.context.base_data.get("warehouse_id"))

    def test_02_invalid_sku_should_fail(self):
        """校验非法 SKU 创建订单失败"""
        if not self.context.base_data:
            self.skipTest("基础主数据未初始化")
        verify_invalid_sku.execute(self.session, self.context)
        self.assertTrue(True)

    def test_03_invalid_client_should_fail(self):
        """校验非法客户创建订单失败"""
        result = create_outbound_order(
            self.session,
            {
                "clientId": "00000000-0000-0000-0000-000000000000",
                "warehouseId": self.context.base_data["warehouse_id"],
                "referenceNumber": f"NEG-CLIENT-{self.context.unique_tag}",
                "orderType": "STANDARD",
                "businessType": "STANDARD",
                "priority": "NORMAL",
                "address": {
                    "contactName": "negative-client",
                    "addressLine": "negative address",
                    "city": "Shanghai",
                    "province": "Shanghai",
                    "country": "CN",
                    "postalCode": "200000",
                },
                "lines": [{"skuCode": self.context.base_data["sku_code"], "orderedQty": 1}],
            },
        )
        self.assertFalse(result.get("success"))

    def test_04_invalid_manifest_number_should_fail(self):
        """校验不存在的集运单号失败"""
        result = validate_manifest_mount(self.session, f"NOT-EXIST-{self.context.unique_tag}")
        self.assertFalse(result.get("success"))

    def test_05_invalid_manifest_creation_should_fail(self):
        """校验非法集运单创建失败"""
        result = create_manifest_order(
            self.session,
            {
                "warehouseId": self.context.base_data["warehouse_id"],
                "channelCode": "",
                "channelName": "",
                "notes": "negative manifest",
            },
        )
        self.assertFalse(result.get("success"))

    def test_06_query_nonexistent_order_should_fail(self):
        """校验查询不存在订单失败"""
        detail = get_outbound_order_detail(self.session, "00000000-0000-0000-0000-000000000000")
        self.assertFalse(detail.get("success"))
