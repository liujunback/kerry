-- AlterTable
ALTER TABLE `receiving_record` ADD COLUMN `is_putaway_allocated` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `putaway_order_line` ADD COLUMN `receiving_record_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `receiving_record_is_putaway_allocated_idx` ON `receiving_record`(`is_putaway_allocated`);

-- CreateIndex
CREATE INDEX `putaway_order_line_receiving_record_id_idx` ON `putaway_order_line`(`receiving_record_id`);

-- AddForeignKey
ALTER TABLE `putaway_order_line` ADD CONSTRAINT `putaway_order_line_receiving_record_id_fkey` FOREIGN KEY (`receiving_record_id`) REFERENCES `receiving_record`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
