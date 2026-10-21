ALTER TABLE `print_template`
  ADD COLUMN `warehouse_id` CHAR(36) NULL AFTER `label_spec_code`,
  ADD INDEX `print_template_warehouse_id_idx`(`warehouse_id`);

ALTER TABLE `print_template`
  ADD CONSTRAINT `print_template_warehouse_id_fkey`
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `print_history`
  ADD COLUMN `warehouse_id` CHAR(36) NULL AFTER `label_spec_code`,
  ADD INDEX `print_history_warehouse_id_idx`(`warehouse_id`);

ALTER TABLE `print_history`
  ADD CONSTRAINT `print_history_warehouse_id_fkey`
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
