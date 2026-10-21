CREATE TABLE `e2e_scenario_categories` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `e2e_scenario_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `e2e_scenarios` (
    `id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `config` JSON NOT NULL,
    `expected` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `e2e_scenarios_code_key`(`code`),
    INDEX `e2e_scenarios_category_id_idx`(`category_id`),
    INDEX `e2e_scenarios_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `e2e_scenario_results` (
    `id` CHAR(36) NOT NULL,
    `scenario_id` CHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `duration_ms` INTEGER NULL,
    `steps` JSON NULL,
    `actual` JSON NULL,
    `error_message` TEXT NULL,
    `executed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `executed_by` CHAR(36) NULL,

    INDEX `e2e_scenario_results_scenario_id_idx`(`scenario_id`),
    INDEX `e2e_scenario_results_executed_at_idx`(`executed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `e2e_scenarios`
    ADD CONSTRAINT `e2e_scenarios_category_id_fkey`
        FOREIGN KEY (`category_id`) REFERENCES `e2e_scenario_categories`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `e2e_scenario_results`
    ADD CONSTRAINT `e2e_scenario_results_scenario_id_fkey`
        FOREIGN KEY (`scenario_id`) REFERENCES `e2e_scenarios`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;
