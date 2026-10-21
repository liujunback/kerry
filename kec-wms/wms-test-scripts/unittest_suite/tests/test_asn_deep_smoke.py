from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestAsnDeepSmoke(FunctionalBaseCase):
    def _list_asns(self, extra_query=None):
        query = {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}
        if extra_query:
            query.update(extra_query)
        return normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/asn",
                query=query,
                warehouse_id=self.base_data["warehouse_id"],
            )
        )

    def _pick_asn(self):
        listed = self._list_asns()
        self.assertTrue(listed.get("success"), listed.get("error") or listed.get("message"))
        items = (listed.get("data") or {}).get("items") or []
        if not items:
            self.skipTest("当前环境没有可用 ASN 数据")
        return items[0]

    def _pick_asn_line(self, asn_id: str):
        lines = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/asn/{asn_id}/lines",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(lines.get("success"), lines.get("error") or lines.get("message"))
        data = lines.get("data") or []
        if not data:
            self.skipTest("当前 ASN 没有可用行项目")
        return data[0]

    def test_01_asn_detail_should_succeed(self):
        """ASN深度-详情查询成功"""
        asn = self._pick_asn()
        detail = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(detail.get("success"), detail.get("error") or detail.get("message"))

    def test_02_asn_lines_should_succeed(self):
        """ASN深度-行项目查询成功"""
        asn = self._pick_asn()
        lines = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}/lines", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(lines.get("success"), lines.get("error") or lines.get("message"))

    def test_03_asn_line_update_invalid_should_fail(self):
        """ASN深度-非法行项目更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/asn/{INVALID_UUID}/lines/{INVALID_UUID}",
                data={"expectedQty": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_asn_line_delete_invalid_should_fail(self):
        """ASN深度-非法行项目删除失败"""
        result = normalize_result(
            self.session.api_request(
                "DELETE",
                f"/api/v1/asn/{INVALID_UUID}/lines/{INVALID_UUID}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_asn_carton_summary_should_succeed(self):
        """ASN深度-箱汇总查询成功"""
        asn = self._pick_asn()
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}/carton-summary", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_06_asn_receiving_details_should_succeed(self):
        """ASN深度-收货明细查询成功"""
        asn = self._pick_asn()
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}/receiving-details", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_07_asn_receiving_records_should_succeed(self):
        """ASN深度-收货记录查询成功"""
        asn = self._pick_asn()
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}/receiving-records", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_08_asn_logs_should_succeed(self):
        """ASN深度-日志查询成功"""
        asn = self._pick_asn()
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}/logs", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_09_asn_operation_logs_should_succeed(self):
        """ASN深度-操作日志查询成功"""
        asn = self._pick_asn()
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}/operation-logs", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_10_asn_sku_summary_should_succeed(self):
        """ASN深度-SKU汇总查询成功"""
        asn = self._pick_asn()
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}/sku-summary", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_11_asn_serial_numbers_should_succeed(self):
        """ASN深度-序列号列表查询成功"""
        asn = self._pick_asn()
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/asn/{asn['id']}/serial-numbers", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_12_asn_lookup_sku_should_succeed_or_skip(self):
        """ASN深度-收货SKU查找成功或环境兼容跳过"""
        listed = self._list_asns({"status": "PENDING_RECEIVING"})
        self.assertTrue(listed.get("success"), listed.get("error") or listed.get("message"))
        items = (listed.get("data") or {}).get("items") or []
        if not items:
            self.skipTest("当前环境没有待收货 ASN")
        asn = items[0]
        line = self._pick_asn_line(asn["id"])
        barcode = line.get("sku", {}).get("barcode") or line.get("skuCode")
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/asn/{asn['id']}/receiving/lookup-sku",
                query={"barcode": barcode},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_13_asn_cancel_invalid_should_fail(self):
        """ASN深度-非法取消失败"""
        result = normalize_result(
            self.session.api_request("POST", f"/api/v1/asn/{INVALID_UUID}/cancel", data={}, warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_14_asn_status_invalid_should_fail(self):
        """ASN深度-非法状态修改失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/asn/{INVALID_UUID}/status",
                data={"status": "RECEIVING"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_15_asn_rollback_invalid_should_fail(self):
        """ASN深度-非法回滚失败"""
        result = normalize_result(
            self.session.api_request("POST", f"/api/v1/asn/{INVALID_UUID}/rollback", data={}, warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_16_asn_force_complete_receiving_invalid_should_fail(self):
        """ASN深度-非法强制完成收货失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/asn/{INVALID_UUID}/force-complete-receiving",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_17_asn_force_complete_putaway_invalid_should_fail(self):
        """ASN深度-非法强制完成上架失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/asn/{INVALID_UUID}/force-complete-putaway",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
