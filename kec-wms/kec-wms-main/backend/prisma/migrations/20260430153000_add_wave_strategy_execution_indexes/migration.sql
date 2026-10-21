-- Add indexes for wave strategy execution candidate lookup
CREATE INDEX `outbound_order_tenant_warehouse_wave_status_created_idx`
ON `outbound_order` (`tenant_id`, `warehouse_id`, `wave_id`, `status`, `created_at`);

CREATE INDEX `outbound_order_timeline_expected_outbound_time_idx`
ON `outbound_order_timeline` (`expected_outbound_time`);
