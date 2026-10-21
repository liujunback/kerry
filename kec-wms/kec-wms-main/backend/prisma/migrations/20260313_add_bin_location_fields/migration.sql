-- AlterTable: Add new fields to bin_location table
ALTER TABLE `bin_location`
  ADD COLUMN `length_cm` DECIMAL(10, 2) NULL,
  ADD COLUMN `width_cm` DECIMAL(10, 2) NULL,
  ADD COLUMN `height_cm` DECIMAL(10, 2) NULL,
  ADD COLUMN `putaway_priority` INT NOT NULL DEFAULT 100,
  ADD COLUMN `pick_priority` INT NOT NULL DEFAULT 100,
  ADD COLUMN `pick_sequence` INT NOT NULL DEFAULT 0,
  ADD COLUMN `max_sku_count` INT NOT NULL DEFAULT 1;
