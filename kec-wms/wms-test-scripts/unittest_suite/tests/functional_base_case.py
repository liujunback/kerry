import json
import time
import unittest

from common import WmsSession, get_config, resolve_base_data


class FunctionalBaseCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.session = WmsSession(get_config())
        cls.session.login()
        cls.base_data = resolve_base_data(cls.session)
        cls.unique_tag = str(int(time.time() * 1000))

    def build_report_json_data(self):
        payload = {
            "base_data": getattr(self.__class__, "base_data", {}) or {},
            "unique_tag": getattr(self.__class__, "unique_tag", ""),
        }
        for attr_name in ("REUSABLE_USERNAME", "REUSABLE_EMAIL", "REUSABLE_EMPLOYEE_ID"):
            value = getattr(self.__class__, attr_name, "")
            if value:
                payload[attr_name.lower()] = value
        return payload

    def build_repro_steps(
        self,
        title,
        method,
        path,
        *,
        query=None,
        data=None,
        warehouse_scoped=False,
        actual_message="",
        stage="接口调用",
    ):
        lines = [
            f"复现步骤: {title}",
            f"1. 登录环境: {self.session.config['base_url']}",
            f"2. 租户/用户: {self.session.config['tenant_code']} / {self.session.config['username']}",
        ]
        step_no = 3
        if warehouse_scoped:
            lines.append(f"{step_no}. 仓库上下文: {self.base_data.get('warehouse_code')} ({self.base_data.get('warehouse_id')})")
            step_no += 1
        lines.append(f"{step_no}. 执行阶段: {stage}")
        step_no += 1
        lines.append(f"{step_no}. 请求方法: {method}")
        step_no += 1
        lines.append(f"{step_no}. 请求路径: {path}")
        step_no += 1
        if query:
            lines.append(f"{step_no}. Query: {json.dumps(query, ensure_ascii=False)}")
            step_no += 1
        if data:
            lines.append(f"{step_no}. Body: {json.dumps(data, ensure_ascii=False)}")
            step_no += 1
        lines.append(f"{step_no}. 实际结果: {actual_message or '接口返回不符合预期'}")
        return "\n".join(lines)

    def tearDown(self) -> None:
        payload = self.build_report_json_data()
        if payload:
            print("[REPORT_JSON]")
            print(json.dumps(payload, ensure_ascii=False, indent=2))
