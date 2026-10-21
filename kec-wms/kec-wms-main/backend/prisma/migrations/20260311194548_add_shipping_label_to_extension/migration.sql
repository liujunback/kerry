-- AlterTable
ALTER TABLE `outbound_order_extension`
    ADD COLUMN `shipping_label_url` VARCHAR(512) NULL COMMENT '发货面单URL',
    ADD COLUMN `shipping_label_type` VARCHAR(20) NULL COMMENT '发货面单类型：URL-外部链接, FILE-本地文件';
