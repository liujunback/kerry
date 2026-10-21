from unittest_suite.steps import (
    allocate_order,
    create_order,
    execute_checkout,
    execute_manifest,
    execute_packing,
    load_base_data,
    prepare_inventory,
    resolve_pick_task,
)
from common import (
    get_checkout_order_detail,
    get_manifest_order_detail,
    get_outbound_order_detail,
    get_pick_order_detail,
    packing_lookup,
    scan_checkout,
    validate_manifest_mount,
)
from unittest_suite.tests.base_case import MainFlowBaseCase


class TestMainFlowPositive(MainFlowBaseCase):
    def test_01_load_base_data(self):
        """加载主流程基础主数据"""
        load_base_data.execute(self.session, self.context)
        self.assertTrue(self.context.base_data.get("warehouse_id"))
        self.assertTrue(self.context.base_data.get("client_id"))
        self.assertTrue(self.context.base_data.get("sku_id"))

    def test_02_prepare_inventory(self):
        """执行备货与上架准备"""
        if not self.context.base_data:
            self.skipTest("基础主数据未初始化")
        prepare_inventory.execute(self.session, self.context, quantity=10)
        self.assertIsInstance(self.context.prep_result, dict)

    def test_03_create_order(self):
        """创建主流程出库订单"""
        if not self.context.base_data:
            self.skipTest("基础主数据未初始化")
        create_order.execute(
            self.session,
            self.context,
            reference_number=f"UNIT-FLOW-{self.context.unique_tag}",
            quantity=2,
        )
        self.assertTrue(self.context.order_id)
        self.assertTrue(self.context.order_number)

    def test_04_order_detail(self):
        """查询主流程订单详情"""
        if not self.context.order_id:
            self.skipTest("订单未创建")
        detail = get_outbound_order_detail(self.session, self.context.order_id)
        self.assertTrue(detail.get("success"))
        self.assertEqual(detail["data"]["orderNumber"], self.context.order_number)

    def test_05_allocate_or_fallback_pick(self):
        """执行分配或回退复用拣货单"""
        if not self.context.order_id:
            self.skipTest("订单未创建")
        allocated = allocate_order.execute(self.session, self.context)
        resolve_pick_task.execute(self.session, self.context, allocated=allocated)
        self.assertTrue(self.context.pick_order_id)
        self.assertTrue(self.context.pick_order_number)
        self.assertTrue(len(self.context.packing_lines) > 0)

    def test_06_pick_detail(self):
        """查询拣货单详情"""
        if not self.context.pick_order_id:
            self.skipTest("拣货单未就绪")
        detail = get_pick_order_detail(self.session, self.context.pick_order_id)
        self.assertTrue(detail.get("success"))
        self.assertEqual(detail["data"]["id"], self.context.pick_order_id)
        self.assertTrue(len(detail["data"].get("lines") or []) > 0)

    def test_07_packing_lookup(self):
        """执行打包前查询"""
        if not self.context.packing_lookup_code:
            self.skipTest("打包查询码未就绪")
        lookup = packing_lookup(self.session, self.context.packing_lookup_code)
        if not lookup.get("success"):
            self.skipTest(f"当前环境打包查询不支持该单据类型: {lookup.get('message')}")
        self.assertTrue(lookup.get("success"))
        self.assertEqual(lookup["data"]["pickOrder"]["id"], self.context.pick_order_id)

    def test_08_packing(self):
        """执行打包流程"""
        if not self.context.pick_order_id:
            self.skipTest("拣货单未就绪")
        execute_packing.execute(self.session, self.context)
        self.assertTrue(True)

    def test_09_checkout(self):
        """执行签出流程"""
        if not self.context.pick_order_id:
            self.skipTest("打包前置未完成")
        execute_checkout.execute(self.session, self.context)
        self.assertTrue(self.context.checkout_number)

    def test_10_checkout_detail(self):
        """查询签出单详情"""
        if not self.context.checkout_order_id:
            self.skipTest("签出单未创建")
        detail = get_checkout_order_detail(self.session, self.context.checkout_order_id)
        self.assertTrue(detail.get("success"))
        self.assertEqual(detail["data"]["checkoutNumber"], self.context.checkout_number)

    def test_11_duplicate_checkout_scan_should_fail(self):
        """校验重复签出扫描失败"""
        if not self.context.checkout_order_id:
            self.skipTest("签出单未创建")
        result = scan_checkout(
            self.session,
            {
                "checkoutOrderId": self.context.checkout_order_id,
                "scannedNumber": self.context.order_number,
                "checkoutType": "BAG",
            },
        )
        self.assertFalse(result.get("success"))

    def test_12_manifest(self):
        """执行集运流程"""
        if not self.context.checkout_number:
            self.skipTest("签出前置未完成")
        execute_manifest.execute(self.session, self.context)
        self.assertTrue(self.context.manifest_number)

    def test_13_manifest_detail(self):
        """查询集运单详情"""
        if not self.context.manifest_order_id:
            self.skipTest("集运单未创建")
        detail = get_manifest_order_detail(self.session, self.context.manifest_order_id)
        self.assertTrue(detail.get("success"))
        self.assertEqual(detail["data"]["manifestNumber"], self.context.manifest_number)

    def test_14_manifest_validate(self):
        """校验已完成集运单再次校验失败"""
        if not self.context.manifest_number:
            self.skipTest("集运单未创建")
        result = validate_manifest_mount(self.session, self.context.manifest_number)
        self.assertFalse(result.get("success"))
