-- AlterTable
ALTER TABLE `checkout_order`
ADD COLUMN `mounted_at` DATETIME(3) NULL,
ADD COLUMN `mounted_by` CHAR(36) NULL,
ADD COLUMN `manifested_at` DATETIME(3) NULL,
ADD COLUMN `manifested_by` CHAR(36) NULL;

-- Update comment for status column (informational only, MySQL doesn't store column comments in this way)
-- Status values: PENDING-待签出, CHECKED_OUT-已签出, MOUNTED-已装运, MANIFESTED-已集运
