-- CreateTable
CREATE TABLE `tenant` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_code` VARCHAR(32) NOT NULL COMMENT '租户编码（唯一标识）',
    `tenant_name` VARCHAR(128) NOT NULL COMMENT '租户名称',
    `contact_person` VARCHAR(64) NULL COMMENT '联系人姓名',
    `contact_phone` VARCHAR(32) NULL COMMENT '联系电话',
    `contact_email` VARCHAR(128) NULL COMMENT '联系邮箱',
    `address` TEXT NULL COMMENT '地址',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-启用, INACTIVE-停用',
    `config` JSON NOT NULL COMMENT '租户配置（JSON格式）',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    UNIQUE INDEX `tenant_tenant_code_key`(`tenant_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='租户表 - 多租户系统的租户信息';

-- CreateTable
CREATE TABLE `user` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `username` VARCHAR(64) NOT NULL COMMENT '用户名（登录账号）',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希值',
    `email` VARCHAR(128) NULL COMMENT '邮箱地址',
    `phone` VARCHAR(32) NULL COMMENT '手机号码',
    `full_name` VARCHAR(128) NOT NULL COMMENT '用户全名',
    `employee_id` VARCHAR(64) NULL COMMENT '员工工号',
    `department` VARCHAR(128) NULL COMMENT '所属部门',
    `position` VARCHAR(64) NULL COMMENT '职位',
    `avatar_url` VARCHAR(512) NULL COMMENT '头像URL',
    `user_type` VARCHAR(32) NOT NULL DEFAULT 'INTERNAL' COMMENT '用户类型：INTERNAL-内部用户, EXTERNAL-外部用户',
    `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-启用, INACTIVE-停用, LOCKED-锁定',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否激活',
    `last_login_at` DATETIME(3) NULL COMMENT '最后登录时间',
    `last_login_ip` VARCHAR(45) NULL COMMENT '最后登录IP',
    `password_changed_at` DATETIME(3) NULL COMMENT '密码修改时间',
    `password_expires_at` DATETIME(3) NULL COMMENT '密码过期时间',
    `failed_login_count` INTEGER NOT NULL DEFAULT 0 COMMENT '登录失败次数',
    `locked_at` DATETIME(3) NULL COMMENT '锁定时间',
    `locked_until` DATETIME(3) NULL COMMENT '锁定截止时间',
    `config` JSON NOT NULL COMMENT '用户配置（JSON格式）',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `user_tenant_id_idx`(`tenant_id`),
    INDEX `user_email_idx`(`email`),
    INDEX `user_phone_idx`(`phone`),
    INDEX `user_status_idx`(`status`),
    INDEX `user_employee_id_idx`(`employee_id`),
    UNIQUE INDEX `user_tenant_id_username_key`(`tenant_id`, `username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='用户表 - 系统用户账户信息';

-- CreateTable
CREATE TABLE `role` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `role_code` VARCHAR(32) NOT NULL COMMENT '角色编码（唯一标识）',
    `role_name` VARCHAR(64) NOT NULL COMMENT '角色名称',
    `description` TEXT NULL COMMENT '角色描述',
    `role_level` INTEGER NOT NULL DEFAULT 3 COMMENT '角色级别（1-最高级，数字越大级别越低）',
    `parent_role_id` CHAR(36) NULL COMMENT '父角色ID（用于角色继承）',
    `is_system` BOOLEAN NOT NULL DEFAULT false COMMENT '是否系统内置角色',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `sort_order` INTEGER NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `role_tenant_id_idx`(`tenant_id`),
    INDEX `role_role_level_idx`(`role_level`),
    INDEX `role_parent_role_id_idx`(`parent_role_id`),
    INDEX `role_is_active_idx`(`is_active`),
    UNIQUE INDEX `role_tenant_id_role_code_key`(`tenant_id`, `role_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='角色表 - 系统角色定义';

-- CreateTable
CREATE TABLE `permission` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `permission_code` VARCHAR(128) NOT NULL COMMENT '权限编码（唯一标识）',
    `permission_name` VARCHAR(128) NOT NULL COMMENT '权限名称',
    `description` TEXT NULL COMMENT '权限描述',
    `resource_type` VARCHAR(32) NOT NULL COMMENT '资源类型：MENU-菜单, BUTTON-按钮, API-接口',
    `action` VARCHAR(32) NOT NULL COMMENT '操作类型：CREATE-创建, READ-读取, UPDATE-更新, DELETE-删除',
    `category` VARCHAR(64) NOT NULL COMMENT '权限分类',
    `parent_id` CHAR(36) NULL COMMENT '父权限ID（用于权限层级）',
    `is_system` BOOLEAN NOT NULL DEFAULT true COMMENT '是否系统内置权限',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `sort_order` INTEGER NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    UNIQUE INDEX `permission_permission_code_key`(`permission_code`),
    INDEX `permission_resource_type_idx`(`resource_type`),
    INDEX `permission_action_idx`(`action`),
    INDEX `permission_category_idx`(`category`),
    INDEX `permission_parent_id_idx`(`parent_id`),
    INDEX `permission_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='权限表 - 系统权限定义';

-- CreateTable
CREATE TABLE `user_role` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `user_id` CHAR(36) NOT NULL COMMENT '用户ID',
    `role_id` CHAR(36) NOT NULL COMMENT '角色ID',
    `scope_type` VARCHAR(32) NOT NULL DEFAULT 'GLOBAL' COMMENT '作用域类型：GLOBAL-全局, WAREHOUSE-仓库级, ZONE-库区级',
    `scope_id` CHAR(36) NULL COMMENT '作用域ID（对应仓库或库区ID）',
    `is_primary` BOOLEAN NOT NULL DEFAULT false COMMENT '是否主要角色',
    `assigned_by` CHAR(36) NOT NULL COMMENT '分配人ID',
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '分配时间',
    `effective_date` DATE NULL COMMENT '生效日期',
    `expires_at` DATETIME(3) NULL COMMENT '过期时间',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `user_role_tenant_id_idx`(`tenant_id`),
    INDEX `user_role_user_id_idx`(`user_id`),
    INDEX `user_role_role_id_idx`(`role_id`),
    INDEX `user_role_scope_type_scope_id_idx`(`scope_type`, `scope_id`),
    INDEX `user_role_is_active_idx`(`is_active`),
    UNIQUE INDEX `user_role_user_id_role_id_scope_type_scope_id_key`(`user_id`, `role_id`, `scope_type`, `scope_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='用户角色关联表 - 用户与角色的多对多关系';

-- CreateTable
CREATE TABLE `role_permission` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `role_id` CHAR(36) NOT NULL COMMENT '角色ID',
    `permission_id` CHAR(36) NOT NULL COMMENT '权限ID',
    `limitation` JSON NULL COMMENT '权限限制条件（JSON格式）',
    `is_granted` BOOLEAN NOT NULL DEFAULT true COMMENT '是否授予权限',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `role_permission_tenant_id_idx`(`tenant_id`),
    INDEX `role_permission_role_id_idx`(`role_id`),
    INDEX `role_permission_permission_id_idx`(`permission_id`),
    UNIQUE INDEX `role_permission_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='角色权限关联表 - 角色与权限的多对多关系';

-- CreateTable
CREATE TABLE `login_history` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `user_id` CHAR(36) NOT NULL COMMENT '用户ID',
    `username` VARCHAR(64) NOT NULL COMMENT '用户名',
    `login_type` VARCHAR(32) NOT NULL DEFAULT 'PASSWORD' COMMENT '登录类型：PASSWORD-密码登录, SSO-单点登录, TOKEN-令牌登录',
    `login_result` VARCHAR(32) NOT NULL COMMENT '登录结果：SUCCESS-成功, FAILED-失败',
    `failure_reason` VARCHAR(128) NULL COMMENT '失败原因',
    `ip_address` VARCHAR(45) NULL COMMENT '登录IP地址',
    `user_agent` TEXT NULL COMMENT '用户代理（浏览器信息）',
    `device_type` VARCHAR(32) NULL COMMENT '设备类型：PC-电脑, MOBILE-手机, TABLET-平板',
    `device_id` VARCHAR(128) NULL COMMENT '设备ID',
    `location` VARCHAR(256) NULL COMMENT '登录地点',
    `session_id` VARCHAR(128) NULL COMMENT '会话ID',
    `login_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '登录时间',
    `logout_at` DATETIME(3) NULL COMMENT '登出时间',

    INDEX `login_history_tenant_id_idx`(`tenant_id`),
    INDEX `login_history_user_id_idx`(`user_id`),
    INDEX `login_history_login_result_idx`(`login_result`),
    INDEX `login_history_login_at_idx`(`login_at`),
    INDEX `login_history_ip_address_idx`(`ip_address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='登录历史表 - 用户登录记录';

-- CreateTable
CREATE TABLE `password_history` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `user_id` CHAR(36) NOT NULL COMMENT '用户ID',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希值',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',

    INDEX `password_history_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='密码历史表 - 用户密码变更记录';

-- CreateTable
CREATE TABLE `warehouse` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_code` VARCHAR(32) NOT NULL COMMENT '仓库编码（唯一标识）',
    `warehouse_name` VARCHAR(128) NOT NULL COMMENT '仓库名称',
    `warehouse_type` VARCHAR(32) NOT NULL DEFAULT 'SELF_BUILT' COMMENT '仓库类型：SELF_BUILT-自建仓, THIRD_PARTY-第三方仓',
    `address` VARCHAR(255) NULL COMMENT '详细地址',
    `city` VARCHAR(64) NULL COMMENT '所在城市',
    `country` VARCHAR(2) NULL COMMENT '国家代码',
    `zip_code` VARCHAR(20) NULL COMMENT '邮政编码',
    `latitude` DECIMAL(10, 7) NULL COMMENT '纬度',
    `longitude` DECIMAL(10, 7) NULL COMMENT '经度',
    `region` VARCHAR(32) NULL COMMENT '所属区域',
    `warehouse_area` DECIMAL(10, 2) NULL COMMENT '仓库面积（平方米）',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-启用, INACTIVE-停用',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `warehouse_tenant_id_idx`(`tenant_id`),
    INDEX `warehouse_status_idx`(`status`),
    UNIQUE INDEX `warehouse_tenant_id_warehouse_code_key`(`tenant_id`, `warehouse_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='仓库表 - 仓库基本信息';

-- CreateTable
CREATE TABLE `zone` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `zone_code` VARCHAR(32) NOT NULL COMMENT '库区编码',
    `zone_name` VARCHAR(128) NULL COMMENT '库区名称',
    `zone_type` VARCHAR(32) NOT NULL COMMENT '库区类型：STORAGE-存储区, PICKING-拣货区, STAGING-暂存区, RECEIVING-收货区, SHIPPING-发货区',
    `quality_type` VARCHAR(20) NOT NULL DEFAULT 'GOOD' COMMENT '质量类型：GOOD-良品, DEFECTIVE-次品, DAMAGED-损坏',
    `capacity_units` INTEGER NULL COMMENT '容量上限（单位数）',
    `current_units` INTEGER NOT NULL DEFAULT 0 COMMENT '当前使用量',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-启用, INACTIVE-停用',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `zone_tenant_id_idx`(`tenant_id`),
    INDEX `zone_warehouse_id_idx`(`warehouse_id`),
    INDEX `zone_zone_type_idx`(`zone_type`),
    UNIQUE INDEX `zone_warehouse_id_zone_code_key`(`warehouse_id`, `zone_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库区表 - 仓库内的区域划分';

-- CreateTable
CREATE TABLE `bin_location` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `zone_id` CHAR(36) NOT NULL COMMENT '库区ID',
    `location_code` VARCHAR(32) NOT NULL COMMENT '库位编码',
    `aisle` VARCHAR(8) NULL COMMENT '巷道号',
    `rack` VARCHAR(8) NULL COMMENT '货架号',
    `shelf` VARCHAR(8) NULL COMMENT '层号',
    `bin` VARCHAR(8) NULL COMMENT '格号',
    `location_type` VARCHAR(32) NULL COMMENT '库位类型：STORAGE-存储位, PICKING-拣货位, STAGING-暂存位',
    `lock_status` VARCHAR(20) NOT NULL DEFAULT 'UNLOCKED' COMMENT '锁定状态：UNLOCKED-未锁定, LOCKED-已锁定',
    `is_pickable` BOOLEAN NOT NULL DEFAULT false COMMENT '是否可拣货',
    `is_receivable` BOOLEAN NOT NULL DEFAULT false COMMENT '是否可收货',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-启用, INACTIVE-停用',
    `last_counted_at` DATETIME(3) NULL COMMENT '最后盘点时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `bin_location_tenant_id_idx`(`tenant_id`),
    INDEX `bin_location_warehouse_id_idx`(`warehouse_id`),
    INDEX `bin_location_zone_id_idx`(`zone_id`),
    INDEX `bin_location_location_type_idx`(`location_type`),
    INDEX `bin_location_status_idx`(`status`),
    UNIQUE INDEX `bin_location_warehouse_id_location_code_key`(`warehouse_id`, `location_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库位表 - 仓库内的具体存储位置';

-- CreateTable
CREATE TABLE `container` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `container_code` VARCHAR(32) NOT NULL COMMENT '容器编码',
    `container_type` VARCHAR(32) NOT NULL COMMENT '容器类型：PALLET-托盘, CARTON-纸箱, TOTE-周转箱',
    `usage` VARCHAR(20) NOT NULL COMMENT '用途：INBOUND-入库, OUTBOUND-出库',
    `enabled_status` VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT '启用状态：ENABLED-启用, DISABLED-停用',
    `work_status` VARCHAR(20) NOT NULL DEFAULT 'IDLE' COMMENT '工作状态：IDLE-空闲, OCCUPIED-占用中',
    `last_occupied_time` DATETIME(3) NULL COMMENT '最后占用时间',
    `weight_capacity_kg` DECIMAL(10, 2) NULL COMMENT '承重上限（千克）',
    `length_cm` DECIMAL(10, 2) NULL COMMENT '长度（厘米）',
    `width_cm` DECIMAL(10, 2) NULL COMMENT '宽度（厘米）',
    `height_cm` DECIMAL(10, 2) NULL COMMENT '高度（厘米）',
    `remarks` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',
    `current_asn_id` CHAR(36) NULL COMMENT '当前关联的ASN ID（收货时使用）',
    `current_batch_number` VARCHAR(64) NULL COMMENT '当前批次号（收货时使用）',
    `current_quality_status` VARCHAR(32) NULL COMMENT '当前质量状态（收货时使用）：GOOD-良品, DAMAGED-破损',
    `current_sku_id` CHAR(36) NULL COMMENT '当前关联的SKU ID（收货时使用）',
    `source_type` VARCHAR(32) NOT NULL DEFAULT 'INTERNAL_MANAGED' COMMENT '容器来源类型：INTERNAL_MANAGED-内部管理容器, INTERNAL_TEMP-内部临时容器, EXTERNAL_ASN-外部ASN原箱',
    `closed_at` DATETIME(3) NULL COMMENT '关箱时间',

    INDEX `container_tenant_id_idx`(`tenant_id`),
    INDEX `container_warehouse_id_idx`(`warehouse_id`),
    INDEX `container_container_type_idx`(`container_type`),
    INDEX `container_usage_idx`(`usage`),
    INDEX `container_enabled_status_idx`(`enabled_status`),
    INDEX `container_work_status_idx`(`work_status`),
    UNIQUE INDEX `container_tenant_id_container_code_key`(`tenant_id`, `container_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='容器表 - 入库/出库使用的容器信息';

-- CreateTable
CREATE TABLE `client` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_code` VARCHAR(32) NOT NULL COMMENT '客户编码（唯一标识）',
    `client_name` VARCHAR(128) NOT NULL COMMENT '客户名称',
    `short_name` VARCHAR(64) NULL COMMENT '客户简称',
    `client_type` VARCHAR(32) NOT NULL DEFAULT 'STANDARD' COMMENT '客户类型：STANDARD-标准客户, VIP-VIP客户',
    `contact_person` VARCHAR(64) NULL COMMENT '联系人姓名',
    `contact_phone` VARCHAR(32) NULL COMMENT '联系电话',
    `contact_email` VARCHAR(128) NULL COMMENT '联系邮箱',
    `address` TEXT NULL COMMENT '详细地址',
    `city` VARCHAR(64) NULL COMMENT '所在城市',
    `province` VARCHAR(64) NULL COMMENT '省份',
    `country` VARCHAR(64) NOT NULL DEFAULT 'CN' COMMENT '国家',
    `postal_code` VARCHAR(20) NULL COMMENT '邮政编码',
    `tax_number` VARCHAR(64) NULL COMMENT '税号',
    `bank_name` VARCHAR(128) NULL COMMENT '开户银行',
    `bank_account` VARCHAR(64) NULL COMMENT '银行账号',
    `credit_limit` DECIMAL(15, 2) NULL COMMENT '信用额度',
    `payment_terms` INTEGER NOT NULL DEFAULT 30 COMMENT '账期（天）',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `config` JSON NOT NULL COMMENT '客户配置（JSON格式）',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `client_tenant_id_idx`(`tenant_id`),
    INDEX `client_client_type_idx`(`client_type`),
    INDEX `client_is_active_idx`(`is_active`),
    INDEX `client_city_idx`(`city`),
    UNIQUE INDEX `client_tenant_id_client_code_key`(`tenant_id`, `client_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='客户表 - 货主/客户基本信息';

-- CreateTable
CREATE TABLE `client_warehouse` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `is_default` BOOLEAN NOT NULL DEFAULT false COMMENT '是否默认仓库',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `effective_date` DATE NULL COMMENT '生效日期',
    `expiry_date` DATE NULL COMMENT '失效日期',
    `config` JSON NOT NULL COMMENT '配置信息（JSON格式）',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `client_warehouse_tenant_id_idx`(`tenant_id`),
    INDEX `client_warehouse_client_id_idx`(`client_id`),
    INDEX `client_warehouse_warehouse_id_idx`(`warehouse_id`),
    INDEX `client_warehouse_is_active_idx`(`is_active`),
    UNIQUE INDEX `client_warehouse_client_id_warehouse_id_key`(`client_id`, `warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='客户仓库关联表 - 客户与仓库的多对多关系';

-- CreateTable: 库存事件表（事件溯源）
CREATE TABLE `inventory_event` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `batch_number` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '批次号（空字符串表示无批次）',
    `lpn` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'LPN容器编号（空字符串表示无LPN）',
    `event_number` VARCHAR(32) NOT NULL COMMENT '事件编号',
    `event_type` VARCHAR(32) NOT NULL COMMENT '事件类型:PUTAWAY/ALLOCATE/DEALLOCATE/PICK/UNPICK/SHIP等',
    `event_sub_type` VARCHAR(32) NULL COMMENT '事件子类型',
    `bucket_type` VARCHAR(32) NOT NULL COMMENT '桶类型:AVAILABLE/ALLOCATED/FROZEN/DEFECTIVE/PICKING/QC_HOLD/COUNT_HOLD',
    `quantity_delta` INTEGER NOT NULL COMMENT '数量变化(正增负减)',
    `quantity_before` INTEGER NOT NULL COMMENT '变动前数量',
    `quantity_after` INTEGER NOT NULL COMMENT '变动后数量',
    `reference_type` VARCHAR(32) NULL COMMENT '关联单据类型',
    `reference_id` CHAR(36) NULL COMMENT '关联单据ID',
    `reference_number` VARCHAR(64) NULL COMMENT '关联单据编号',
    `reference_line_id` CHAR(36) NULL COMMENT '关联单据行ID',
    `idempotency_key` VARCHAR(128) NOT NULL COMMENT '幂等键(防重复)',
    `parent_event_id` CHAR(36) NULL COMMENT '父事件ID',
    `reason_code` VARCHAR(32) NULL COMMENT '原因代码',
    `reason_desc` VARCHAR(255) NULL COMMENT '原因说明',
    `unit_cost` DECIMAL(18, 4) NULL COMMENT '单位成本',
    `total_cost` DECIMAL(18, 4) NULL COMMENT '总成本',
    `operator_id` CHAR(36) NULL COMMENT '操作人ID',
    `event_date` DATETIME(3) NOT NULL COMMENT '事件日期',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',

    UNIQUE INDEX `inventory_event_event_number_key`(`event_number`),
    UNIQUE INDEX `inventory_event_idempotency_key_key`(`idempotency_key`),
    INDEX `inventory_event_tenant_warehouse_sku_location_idx`(`tenant_id`, `warehouse_id`, `sku_id`, `location_id`),
    INDEX `inventory_event_event_type_date_idx`(`event_type`, `event_date`),
    INDEX `inventory_event_reference_idx`(`reference_type`, `reference_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存事件表-记录所有库存变动';

-- CreateTable: 库存桶表（按业务类型分离）
CREATE TABLE `inventory_bucket` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `zone_id` CHAR(36) NOT NULL COMMENT '库区ID',
    `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `batch_number` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '批次号（空字符串表示无批次）',
    `lpn` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'LPN容器编号（空字符串表示无LPN）',
    `asn_number` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'ASN单号（追溯来源批次）',
    `bucket_type` VARCHAR(32) NOT NULL COMMENT '桶类型:AVAILABLE/ALLOCATED/FROZEN/DEFECTIVE/PICKING/QC_HOLD/COUNT_HOLD',
    `quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '数量',
    `version` BIGINT NOT NULL DEFAULT 0 COMMENT '版本号(乐观锁)',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `production_date` DATE NULL COMMENT '生产日期',
    `fifo_date` DATETIME(3) NULL COMMENT 'FIFO日期(先进先出排序)',
    `last_event_id` CHAR(36) NULL COMMENT '最后事件ID',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    UNIQUE INDEX `inv_bucket_unique_with_asn`(`location_id`, `sku_id`, `batch_number`, `lpn`, `expiry_date`, `bucket_type`, `asn_number`),
    INDEX `inventory_bucket_tenant_warehouse_sku_idx`(`tenant_id`, `warehouse_id`, `sku_id`),
    INDEX `inventory_bucket_bucket_type_qty_idx`(`bucket_type`, `quantity`),
    INDEX `inventory_bucket_expiry_date_idx`(`expiry_date`),
    INDEX `inventory_bucket_fifo_date_idx`(`fifo_date`),
    INDEX `inventory_bucket_asn_number_idx`(`asn_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存桶表-按业务类型分离的库存数量';

-- CreateTable: 库存快照表（库位级汇总视图）
CREATE TABLE `inventory_snapshot` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `zone_id` CHAR(36) NOT NULL COMMENT '库区ID',
    `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `batch_number` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '批次号（空字符串表示无批次）',
    `lpn` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'LPN容器编号（空字符串表示无LPN）',
    `qty_available` INTEGER NOT NULL DEFAULT 0 COMMENT '可用数量',
    `qty_allocated` INTEGER NOT NULL DEFAULT 0 COMMENT '已分配数量',
    `qty_frozen` INTEGER NOT NULL DEFAULT 0 COMMENT '冻结数量',
    `qty_defective` INTEGER NOT NULL DEFAULT 0 COMMENT '不良品数量',
    `qty_picking` INTEGER NOT NULL DEFAULT 0 COMMENT '拣货中数量',
    `qty_qc_hold` INTEGER NOT NULL DEFAULT 0 COMMENT '质检暂扣数量',
    `qty_count_hold` INTEGER NOT NULL DEFAULT 0 COMMENT '盘点冻结数量',
    `total_on_hand` INTEGER NOT NULL DEFAULT 0 COMMENT '在库总数量',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `production_date` DATE NULL COMMENT '生产日期',
    `fifo_date` DATETIME(3) NULL COMMENT 'FIFO日期',
    `received_date` DATETIME(3) NULL COMMENT '收货日期',
    `asn_number` VARCHAR(64) NULL COMMENT 'ASN单号(追溯来源)',
    `snapshot_version` BIGINT NOT NULL DEFAULT 0 COMMENT '快照版本号',
    `last_event_id` CHAR(36) NULL COMMENT '最后事件ID',
    `last_movement_at` DATETIME(3) NULL COMMENT '最后移动时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    UNIQUE INDEX `inventory_snapshot_loc_sku_batch_lpn_expiry_key`(`location_id`, `sku_id`, `batch_number`, `lpn`, `expiry_date`),
    INDEX `inventory_snapshot_tenant_warehouse_sku_idx`(`tenant_id`, `warehouse_id`, `sku_id`),
    INDEX `inventory_snapshot_expiry_date_idx`(`expiry_date`),
    INDEX `inventory_snapshot_fifo_date_idx`(`fifo_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存快照表-库位级库存汇总视图';

-- CreateTable: SKU库存汇总表
CREATE TABLE `sku_inventory_summary` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `qty_receiving` INTEGER NOT NULL DEFAULT 0 COMMENT '收货中数量',
    `qty_available` INTEGER NOT NULL DEFAULT 0 COMMENT '可用数量',
    `qty_allocated` INTEGER NOT NULL DEFAULT 0 COMMENT '已分配数量',
    `qty_frozen` INTEGER NOT NULL DEFAULT 0 COMMENT '冻结数量',
    `qty_defective` INTEGER NOT NULL DEFAULT 0 COMMENT '不良品数量',
    `qty_picking` INTEGER NOT NULL DEFAULT 0 COMMENT '拣货中数量',
    `qty_shipped` INTEGER NOT NULL DEFAULT 0 COMMENT '已发货数量',
    `total_on_hand` INTEGER NOT NULL DEFAULT 0 COMMENT '在库总数量',
    `earliest_expiry_date` DATE NULL COMMENT '最早到期日期',
    `location_count` INTEGER NOT NULL DEFAULT 0 COMMENT '库位数量',
    `summary_version` BIGINT NOT NULL DEFAULT 0 COMMENT '汇总版本号',
    `last_event_id` CHAR(36) NULL COMMENT '最后事件ID',
    `last_movement_at` DATETIME(3) NULL COMMENT '最后移动时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    UNIQUE INDEX `sku_inventory_summary_warehouse_client_sku_key`(`warehouse_id`, `client_id`, `sku_id`),
    INDEX `sku_inventory_summary_tenant_idx`(`tenant_id`),
    INDEX `sku_inventory_summary_earliest_expiry_idx`(`earliest_expiry_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='SKU库存汇总表-按仓库+客户+SKU维度汇总';

-- CreateTable: 分配明细表
CREATE TABLE `allocation_detail` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `bucket_id` CHAR(36) NOT NULL COMMENT '库存桶ID',
    `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `batch_number` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '批次号（空字符串表示无批次）',
    `lpn` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'LPN容器编号（空字符串表示无LPN）',
    `allocated_qty` INTEGER NOT NULL COMMENT '分配数量',
    `picked_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已拣货数量',
    `shipped_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已发货数量',
    `reference_type` VARCHAR(32) NOT NULL COMMENT '关联单据类型',
    `reference_id` CHAR(36) NOT NULL COMMENT '关联单据ID',
    `reference_number` VARCHAR(64) NOT NULL COMMENT '关联单据编号',
    `reference_line_id` CHAR(36) NULL COMMENT '关联单据行ID',
    `allocation_type` VARCHAR(32) NOT NULL DEFAULT 'SOFT' COMMENT '分配类型:SOFT软分配/HARD硬分配',
    `status` VARCHAR(32) NOT NULL DEFAULT 'ALLOCATED' COMMENT '状态:ALLOCATED/PICKING/PICKED/SHIPPED/RELEASED/CANCELLED',
    `allocated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '分配时间',
    `expires_at` DATETIME(3) NULL COMMENT '过期时间',
    `released_at` DATETIME(3) NULL COMMENT '释放时间',
    `picked_at` DATETIME(3) NULL COMMENT '拣货时间',
    `shipped_at` DATETIME(3) NULL COMMENT '发货时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `allocation_detail_tenant_idx`(`tenant_id`),
    INDEX `allocation_detail_bucket_idx`(`bucket_id`),
    INDEX `allocation_detail_reference_idx`(`reference_type`, `reference_id`),
    INDEX `allocation_detail_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='分配明细表-跟踪库存分配到发货全流程';

-- CreateTable
CREATE TABLE `serial_number` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `serial_number` VARCHAR(128) NOT NULL COMMENT '序列号',
    `status` VARCHAR(32) NOT NULL DEFAULT 'IN_STOCK' COMMENT '状态：IN_STOCK-在库, SHIPPED-已发货, RETURNED-已退货',
    `warehouse_id` CHAR(36) NULL COMMENT '仓库ID',
    `received_at` DATETIME(3) NULL COMMENT '收货时间',
    `received_asn_id` CHAR(36) NULL COMMENT '收货ASN ID',
    `shipped_at` DATETIME(3) NULL COMMENT '发货时间',
    `shipped_order_id` CHAR(36) NULL COMMENT '发货订单ID',
    `putaway_order_id` CHAR(36) NULL COMMENT '上架单ID',
    `putaway_at` DATETIME(3) NULL COMMENT '上架时间',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `serial_number_tenant_id_idx`(`tenant_id`),
    INDEX `serial_number_client_id_idx`(`client_id`),
    INDEX `serial_number_sku_id_idx`(`sku_id`),
    INDEX `serial_number_status_idx`(`status`),
    INDEX `serial_number_serial_number_idx`(`serial_number`),
    INDEX `serial_number_putaway_order_id_idx`(`putaway_order_id`),
    UNIQUE INDEX `serial_number_shipped_at_serial_number_status_warehouse_id_key`(`shipped_at`, `serial_number`, `status`, `warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='序列号表 - 序列号管理';

-- CreateTable
CREATE TABLE `inventory_adjustment` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `adjustment_number` VARCHAR(32) NOT NULL COMMENT '调整单号',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `warehouse_name` VARCHAR(64) NOT NULL COMMENT '仓库名称',
    `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态：DRAFT-草稿, PENDING-待审批, APPROVED-已审批, EXECUTED-已执行, REJECTED-已拒绝',
    `adjustment_type` VARCHAR(32) NOT NULL COMMENT '调整类型：INCREASE-盘盈, DECREASE-盘亏, DAMAGE-损坏, EXPIRY-过期',
    `reason` VARCHAR(256) NOT NULL COMMENT '调整原因',
    `total_items` INTEGER NOT NULL DEFAULT 0 COMMENT '总项数',
    `total_quantity_change` INTEGER NOT NULL DEFAULT 0 COMMENT '总数量变化',
    `request_user_id` CHAR(36) NOT NULL COMMENT '申请人ID',
    `request_user_name` VARCHAR(64) NOT NULL COMMENT '申请人姓名',
    `execute_user_id` CHAR(36) NULL COMMENT '执行人ID',
    `execute_user_name` VARCHAR(64) NULL COMMENT '执行人姓名',
    `execute_time` DATETIME(3) NULL COMMENT '执行时间',
    `client_id` CHAR(36) NULL COMMENT '客户ID',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `inventory_adjustment_tenant_id_idx`(`tenant_id`),
    INDEX `inventory_adjustment_warehouse_id_idx`(`warehouse_id`),
    INDEX `inventory_adjustment_status_idx`(`status`),
    INDEX `inventory_adjustment_adjustment_type_idx`(`adjustment_type`),
    INDEX `inventory_adjustment_client_id_fkey`(`client_id`),
    UNIQUE INDEX `inventory_adjustment_tenant_id_adjustment_number_key`(`tenant_id`, `adjustment_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存调整单表 - 库存调整单主表';

-- CreateTable
CREATE TABLE `inventory_adjustment_line` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `adjustment_id` CHAR(36) NOT NULL COMMENT '调整单ID',
    `inventory_id` CHAR(36) NOT NULL COMMENT '库存ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
    `location_code` VARCHAR(32) NOT NULL COMMENT '库位编码',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `quantity_before` INTEGER NOT NULL COMMENT '调整前数量',
    `quantity_change` INTEGER NOT NULL COMMENT '调整数量',
    `quantity_after` INTEGER NOT NULL COMMENT '调整后数量',
    `reason_notes` VARCHAR(256) NULL COMMENT '原因备注',
    `lpn` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'LPN容器编号（空字符串表示无LPN）',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `production_date` DATE NULL COMMENT '生产日期',
    `bucket_type` VARCHAR(32) NULL COMMENT '桶类型',
    `from_bucket_type` VARCHAR(32) NULL COMMENT '调整前桶类型',
    `to_bucket_type` VARCHAR(32) NULL COMMENT '调整后桶类型',
    `from_location_id` CHAR(36) NULL COMMENT '调整前库位ID',
    `from_location_code` VARCHAR(32) NULL COMMENT '调整前库位编码',
    `to_location_id` CHAR(36) NULL COMMENT '调整后库位ID',
    `to_location_code` VARCHAR(32) NULL COMMENT '调整后库位编码',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `inventory_adjustment_line_adjustment_id_idx`(`adjustment_id`),
    INDEX `inventory_adjustment_line_inventory_id_idx`(`inventory_id`),
    INDEX `inventory_adjustment_line_sku_id_idx`(`sku_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存调整单明细表 - 库存调整单明细';

-- CreateTable
CREATE TABLE `sku_category` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NULL COMMENT '客户ID',
    `category_code` VARCHAR(32) NOT NULL COMMENT '分类编码',
    `category_name` VARCHAR(128) NOT NULL COMMENT '分类名称',
    `parent_id` CHAR(36) NULL COMMENT '父分类ID',
    `level` INTEGER NOT NULL DEFAULT 1 COMMENT '层级（1-一级分类，2-二级分类...）',
    `path` VARCHAR(512) NULL COMMENT '路径（如：/1/2/3/）',
    `sort_order` INTEGER NOT NULL DEFAULT 0 COMMENT '排序序号',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `description` TEXT NULL COMMENT '描述',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `sku_category_tenant_id_idx`(`tenant_id`),
    INDEX `sku_category_client_id_idx`(`client_id`),
    INDEX `sku_category_parent_id_idx`(`parent_id`),
    INDEX `sku_category_path_idx`(`path`),
    INDEX `sku_category_is_active_idx`(`is_active`),
    UNIQUE INDEX `sku_category_tenant_id_category_code_key`(`tenant_id`, `category_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='SKU分类表 - 商品分类层级结构';

-- CreateTable
CREATE TABLE `sku` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `sku_name` VARCHAR(256) NOT NULL COMMENT 'SKU名称',
    `barcode` VARCHAR(64) NULL COMMENT '条码',
    `category_id` CHAR(36) NULL COMMENT '分类ID',
    `unit` VARCHAR(32) NOT NULL DEFAULT 'PCS' COMMENT '基本单位',
    `length_cm` DECIMAL(10, 2) NULL COMMENT '长度（厘米）',
    `width_cm` DECIMAL(10, 2) NULL COMMENT '宽度（厘米）',
    `height_cm` DECIMAL(10, 2) NULL COMMENT '高度（厘米）',
    `volume_cbm` DECIMAL(12, 6) NULL COMMENT '体积（立方米）',
    `unit_price` DECIMAL(15, 4) NULL COMMENT '单价',
    `currency` VARCHAR(3) NULL DEFAULT 'CNY' COMMENT '币种',
    `origin_country` VARCHAR(64) NULL COMMENT '原产国',
    `hs_code` VARCHAR(32) NULL COMMENT '海关编码',
    `shelf_life_warning_days` INTEGER NULL COMMENT '保质期预警天数',
    `is_batch_managed` BOOLEAN NOT NULL DEFAULT false COMMENT '是否批次管理',
    `is_serial_managed` BOOLEAN NOT NULL DEFAULT false COMMENT '是否序列号管理',
    `is_lot_managed` BOOLEAN NOT NULL DEFAULT false COMMENT '是否批号管理',
    `is_expiry_managed` BOOLEAN NOT NULL DEFAULT false COMMENT '是否效期管理',
    `storage_condition` VARCHAR(32) NULL DEFAULT 'NORMAL' COMMENT '存储条件：NORMAL-常温, COLD-冷藏, FROZEN-冷冻',
    `abc_class` VARCHAR(1) NULL COMMENT 'ABC分类：A-高价值, B-中价值, C-低价值',
    `has_battery` BOOLEAN NOT NULL DEFAULT false COMMENT '是否含电池',
    `battery_type` VARCHAR(32) NULL COMMENT '电池类型',
    `battery_count` INTEGER NULL COMMENT '电池数量',
    `is_dangerous` BOOLEAN NOT NULL DEFAULT false COMMENT '是否危险品',
    `is_first_receiving` BOOLEAN NOT NULL DEFAULT true COMMENT '是否首次收货（用于首次收货质检）',
    `image_url` VARCHAR(512) NULL COMMENT '图片URL',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-启用, INACTIVE-停用',
    `config` JSON NOT NULL COMMENT '扩展配置（JSON格式）',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',
    `is_self_packaged` BOOLEAN NOT NULL DEFAULT false COMMENT '是否自带物流包装',
    `weight_kg` DECIMAL(10, 3) NULL COMMENT '重量（千克）',

    INDEX `sku_tenant_id_idx`(`tenant_id`),
    INDEX `sku_client_id_idx`(`client_id`),
    INDEX `sku_category_id_idx`(`category_id`),
    INDEX `sku_barcode_idx`(`barcode`),
    INDEX `sku_status_idx`(`status`),
    INDEX `sku_abc_class_idx`(`abc_class`),
    INDEX `sku_sku_name_idx`(`sku_name`),
    INDEX `sku_is_first_receiving_idx`(`is_first_receiving`),
    UNIQUE INDEX `sku_client_id_sku_code_key`(`client_id`, `sku_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='SKU主表 - 商品主数据';

-- CreateTable
CREATE TABLE `sku_uom` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `uom_code` VARCHAR(32) NOT NULL COMMENT '单位编码',
    `uom_name` VARCHAR(64) NOT NULL COMMENT '单位名称',
    `conversion_factor` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000 COMMENT '换算系数（相对于基本单位）',
    `barcode` VARCHAR(64) NULL COMMENT '条码',
    `length_cm` DECIMAL(10, 2) NULL COMMENT '长度（厘米）',
    `width_cm` DECIMAL(10, 2) NULL COMMENT '宽度（厘米）',
    `height_cm` DECIMAL(10, 2) NULL COMMENT '高度（厘米）',
    `volume_cbm` DECIMAL(12, 6) NULL COMMENT '体积（立方米）',
    `is_base_uom` BOOLEAN NOT NULL DEFAULT false COMMENT '是否基本单位',
    `is_receiving_uom` BOOLEAN NOT NULL DEFAULT false COMMENT '是否收货单位',
    `is_shipping_uom` BOOLEAN NOT NULL DEFAULT false COMMENT '是否发货单位',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `sort_order` INTEGER NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',
    `weight_kg` DECIMAL(10, 3) NULL COMMENT '重量（千克）',

    INDEX `sku_uom_tenant_id_idx`(`tenant_id`),
    INDEX `sku_uom_sku_id_idx`(`sku_id`),
    INDEX `sku_uom_barcode_idx`(`barcode`),
    UNIQUE INDEX `sku_uom_sku_id_uom_code_key`(`sku_id`, `uom_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='SKU包装单位表 - SKU的多包装单位定义';

-- CreateTable
CREATE TABLE `sku_barcode` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `barcode` VARCHAR(64) NOT NULL COMMENT '条码',
    `barcode_type` VARCHAR(32) NOT NULL DEFAULT 'EAN13' COMMENT '条码类型：EAN13, UPC, CODE128等',
    `uom_id` CHAR(36) NULL COMMENT '关联单位ID',
    `is_primary` BOOLEAN NOT NULL DEFAULT false COMMENT '是否主条码',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `sku_barcode_tenant_id_idx`(`tenant_id`),
    INDEX `sku_barcode_sku_id_idx`(`sku_id`),
    INDEX `sku_barcode_barcode_idx`(`barcode`),
    INDEX `sku_barcode_uom_id_fkey`(`uom_id`),
    UNIQUE INDEX `sku_barcode_tenant_id_barcode_key`(`tenant_id`, `barcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='SKU条码表 - SKU的多条码管理';

-- CreateTable
CREATE TABLE `sku_image` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `image_url` VARCHAR(512) NOT NULL COMMENT '图片URL',
    `thumbnail_url` VARCHAR(512) NULL COMMENT '缩略图URL',
    `image_type` VARCHAR(32) NOT NULL DEFAULT 'MAIN' COMMENT '图片类型：MAIN-主图, DETAIL-详情图, PACKAGE-包装图',
    `is_primary` BOOLEAN NOT NULL DEFAULT false COMMENT '是否主图',
    `sort_order` INTEGER NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `sku_image_tenant_id_idx`(`tenant_id`),
    INDEX `sku_image_sku_id_idx`(`sku_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='SKU图片表 - SKU的多图片管理';

-- CreateTable
CREATE TABLE `sku_attribute` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `attribute_name` VARCHAR(64) NOT NULL COMMENT '属性名称',
    `attribute_value` VARCHAR(512) NULL COMMENT '属性值',
    `attribute_type` VARCHAR(32) NOT NULL DEFAULT 'STRING' COMMENT '属性类型：STRING-字符串, NUMBER-数字, DATE-日期, BOOLEAN-布尔',
    `sort_order` INTEGER NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `sku_attribute_tenant_id_idx`(`tenant_id`),
    INDEX `sku_attribute_sku_id_idx`(`sku_id`),
    UNIQUE INDEX `sku_attribute_sku_id_attribute_name_key`(`sku_id`, `attribute_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='SKU扩展属性表 - SKU的自定义属性';

-- CreateTable
CREATE TABLE `combo_product` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `combo_code` VARCHAR(64) NOT NULL COMMENT '组合商品编码',
    `combo_name` VARCHAR(256) NOT NULL COMMENT '组合商品名称',
    `combo_barcode` VARCHAR(64) NULL COMMENT '组合商品条码',
    `description` TEXT NULL COMMENT '描述',
    `category_id` CHAR(36) NULL COMMENT '分类ID',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-启用, INACTIVE-停用',
    `effective_date` DATE NULL COMMENT '生效日期',
    `expiry_date` DATE NULL COMMENT '失效日期',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `combo_product_tenant_id_idx`(`tenant_id`),
    INDEX `combo_product_client_id_idx`(`client_id`),
    INDEX `combo_product_status_idx`(`status`),
    UNIQUE INDEX `combo_product_tenant_id_combo_code_key`(`tenant_id`, `combo_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='组合商品表 - 组合商品/套装主表';

-- CreateTable
CREATE TABLE `combo_component` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `combo_product_id` CHAR(36) NOT NULL COMMENT '组合商品ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `quantity` DECIMAL(10, 4) NOT NULL DEFAULT 1.0000 COMMENT '数量',
    `unit` VARCHAR(32) NOT NULL DEFAULT 'EA' COMMENT '单位',
    `sort_order` INTEGER NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `combo_component_tenant_id_idx`(`tenant_id`),
    INDEX `combo_component_combo_product_id_idx`(`combo_product_id`),
    INDEX `combo_component_sku_id_idx`(`sku_id`),
    UNIQUE INDEX `combo_component_combo_product_id_sku_id_key`(`combo_product_id`, `sku_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='组合商品组件表 - 组合商品的组成SKU';

-- CreateTable
CREATE TABLE `asn` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `asn_number` VARCHAR(32) NOT NULL COMMENT 'ASN单号',
    `external_number` VARCHAR(64) NULL COMMENT '外部单号',
    `asn_type` VARCHAR(32) NOT NULL DEFAULT 'NORMAL' COMMENT 'ASN类型：NORMAL-普通入库, RETURN-退货入库, TRANSFER-调拨入库',
    `receiving_method` VARCHAR(255) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'CREATED' COMMENT '状态：CREATED-已创建, ARRIVED-已到货, RECEIVING-收货中, PUTAWAY-上架中, COMPLETED-已完成, CANCELLED-已取消',
    `expected_arrival_date` DATE NULL COMMENT '预计到货日期',
    `expected_arrival_time` VARCHAR(8) NULL COMMENT '预计到货时间',
    `expected_putaway_date` DATETIME(3) NULL COMMENT '预计上架完成时间',
    `actual_arrival_at` DATETIME(3) NULL COMMENT '实际到货时间',
    `signed_at` DATETIME(3) NULL COMMENT '签收时间',
    `signed_by` CHAR(36) NULL COMMENT '签收人ID',
    `receiving_start_at` DATETIME(3) NULL COMMENT '收货开始时间',
    `receiving_end_at` DATETIME(3) NULL COMMENT '收货结束时间',
    `putaway_start_at` DATETIME(3) NULL COMMENT '上架开始时间',
    `putaway_end_at` DATETIME(3) NULL COMMENT '上架结束时间',
    `completed_at` DATETIME(3) NULL COMMENT '完成时间',
    `total_expected_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '预期总数量',
    `total_received_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已收货总数量',
    `total_putaway_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已上架总数量',
    `total_expected_lines` INTEGER NOT NULL DEFAULT 0 COMMENT '预期总行数',
    `total_received_lines` INTEGER NOT NULL DEFAULT 0 COMMENT '已收货行数',
    `total_expected_volume_cbm` DECIMAL(12, 4) NULL COMMENT '预期总体积（立方米）',
    `total_expected_weight_kg` DECIMAL(12, 3) NULL COMMENT '预期总重量（千克）',
    `receiving_dock_id` CHAR(36) NULL COMMENT '收货月台ID',
    `notes` TEXT NULL COMMENT '备注',
    `config` JSON NOT NULL COMMENT '配置信息（JSON格式）',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `asn_tenant_id_idx`(`tenant_id`),
    INDEX `asn_client_id_idx`(`client_id`),
    INDEX `asn_warehouse_id_idx`(`warehouse_id`),
    INDEX `asn_status_idx`(`status`),
    INDEX `asn_asn_type_idx`(`asn_type`),
    INDEX `asn_expected_arrival_date_idx`(`expected_arrival_date`),
    INDEX `asn_expected_putaway_date_idx`(`expected_putaway_date`),
    INDEX `asn_external_number_idx`(`external_number`),
    UNIQUE INDEX `asn_tenant_id_asn_number_key`(`tenant_id`, `asn_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='ASN主表 - 预到货通知单主表';

-- CreateTable
CREATE TABLE `asn_line` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `asn_id` CHAR(36) NOT NULL COMMENT 'ASN ID',
    `line_number` INTEGER NOT NULL COMMENT '行号',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `carton` VARCHAR(64) NULL,
    `sku_name` VARCHAR(256) NULL COMMENT 'SKU名称',
    `expected_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '预期数量',
    `received_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已收货数量',
    `putaway_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已上架数量',
    `uom_id` CHAR(36) NULL COMMENT '单位ID',
    `uom_code` VARCHAR(32) NULL COMMENT '单位编码',
    `udf` VARCHAR(64) NULL,
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `serial_numbers` JSON NULL COMMENT '序列号列表（JSON格式）',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'CNY' COMMENT '币种',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待收货, RECEIVING-收货中, RECEIVED-已收货, PUTAWAY-上架中, COMPLETED-已完成',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',
    `received_damaged_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已收货破损数量',
    `received_good_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已收货良品数量',

    INDEX `asn_line_tenant_id_idx`(`tenant_id`),
    INDEX `asn_line_asn_id_idx`(`asn_id`),
    INDEX `asn_line_sku_id_idx`(`sku_id`),
    INDEX `asn_line_status_idx`(`status`),
    INDEX `asn_line_batch_number_idx`(`batch_number`),
    UNIQUE INDEX `asn_line_asn_id_line_number_key`(`asn_id`, `line_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='ASN明细表 - 预到货通知单明细';

-- CreateTable
CREATE TABLE `sorting_wall` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `wall_code` VARCHAR(32) NOT NULL COMMENT '分拣墙编码',
    `wall_name` VARCHAR(64) NOT NULL COMMENT '分拣墙名称',
    `workstation_code` VARCHAR(32) NOT NULL COMMENT '工作站编码',
    `horizontal_cells` INTEGER NOT NULL COMMENT '水平格口数',
    `vertical_cells` INTEGER NOT NULL COMMENT '垂直格口数',
    `total_cells` INTEGER NOT NULL COMMENT '总格口数',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `sort_status` VARCHAR(20) NOT NULL DEFAULT 'IDLE' COMMENT '分拣状态：IDLE-空闲, SORTING-分拣中',
    `location_code` VARCHAR(32) NOT NULL DEFAULT '999.99.99' COMMENT '库位编码',
    `remarks` VARCHAR(256) NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `sorting_wall_tenant_id_idx`(`tenant_id`),
    INDEX `sorting_wall_warehouse_id_idx`(`warehouse_id`),
    INDEX `sorting_wall_workstation_code_idx`(`workstation_code`),
    INDEX `sorting_wall_is_active_idx`(`is_active`),
    INDEX `sorting_wall_sort_status_idx`(`sort_status`),
    UNIQUE INDEX `sorting_wall_tenant_id_wall_code_key`(`tenant_id`, `wall_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='分拣墙表 - 分拣墙配置信息';

-- CreateTable
CREATE TABLE `sorting_task` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `task_number` VARCHAR(32) NOT NULL COMMENT '任务编号',
    `pick_order_id` CHAR(36) NOT NULL COMMENT '关联拣货单ID',
    `sorting_wall_id` CHAR(36) NOT NULL COMMENT '关联播种墙ID',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待执行, IN_PROGRESS-执行中, COMPLETED-已完成, CANCELLED-已取消',
    `total_items` INTEGER NOT NULL DEFAULT 0 COMMENT '总分拣件数',
    `completed_items` INTEGER NOT NULL DEFAULT 0 COMMENT '已完成件数',
    `assigned_user_id` CHAR(36) NULL COMMENT '分配操作员ID',
    `started_at` DATETIME(3) NULL COMMENT '开始时间',
    `completed_at` DATETIME(3) NULL COMMENT '完成时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `sorting_task_tenant_id_idx`(`tenant_id`),
    INDEX `sorting_task_warehouse_id_idx`(`warehouse_id`),
    INDEX `sorting_task_pick_order_id_idx`(`pick_order_id`),
    INDEX `sorting_task_sorting_wall_id_idx`(`sorting_wall_id`),
    INDEX `sorting_task_status_idx`(`status`),
    INDEX `sorting_task_assigned_user_id_idx`(`assigned_user_id`),
    UNIQUE INDEX `sorting_task_tenant_id_task_number_key`(`tenant_id`, `task_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='分拣任务主表 - 二次分拣任务';

-- CreateTable
CREATE TABLE `sorting_task_line` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `sorting_task_id` CHAR(36) NOT NULL COMMENT '分拣任务ID',
    `order_id` CHAR(36) NOT NULL COMMENT '目标订单ID',
    `order_number` VARCHAR(64) NOT NULL COMMENT '订单号',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `cell_code` VARCHAR(16) NOT NULL COMMENT '分配的格口号',
    `expected_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '需分拣数量',
    `sorted_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已分拣数量',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待分拣, SORTED-已分拣',
    `sorted_at` DATETIME(3) NULL COMMENT '分拣完成时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `sorting_task_line_tenant_id_idx`(`tenant_id`),
    INDEX `sorting_task_line_sorting_task_id_idx`(`sorting_task_id`),
    INDEX `sorting_task_line_order_id_idx`(`order_id`),
    INDEX `sorting_task_line_sku_id_idx`(`sku_id`),
    INDEX `sorting_task_line_cell_code_idx`(`cell_code`),
    INDEX `sorting_task_line_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='分拣任务明细 - 分拣任务行项目';

-- CreateTable
CREATE TABLE `sorting_cell_allocation` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `sorting_wall_id` CHAR(36) NOT NULL COMMENT '播种墙ID',
    `cell_code` VARCHAR(16) NOT NULL COMMENT '格口编码 (如 A1, B2)',
    `sorting_task_id` CHAR(36) NOT NULL COMMENT '分拣任务ID',
    `order_id` CHAR(36) NOT NULL COMMENT '绑定的订单ID',
    `order_number` VARCHAR(64) NOT NULL COMMENT '订单号',
    `expected_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '需分拣总数',
    `sorted_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已分拣数量',
    `status` VARCHAR(32) NOT NULL DEFAULT 'ALLOCATED' COMMENT '状态：ALLOCATED-已分配, SORTING-分拣中, COMPLETED-已完成, RELEASED-已释放',
    `allocated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '分配时间',
    `completed_at` DATETIME(3) NULL COMMENT '完成时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `sorting_cell_allocation_tenant_id_idx`(`tenant_id`),
    INDEX `sorting_cell_allocation_sorting_wall_id_idx`(`sorting_wall_id`),
    INDEX `sorting_cell_allocation_sorting_task_id_idx`(`sorting_task_id`),
    INDEX `sorting_cell_allocation_order_id_idx`(`order_id`),
    INDEX `sorting_cell_allocation_status_idx`(`status`),
    UNIQUE INDEX `sorting_cell_allocation_sorting_wall_id_cell_code_sorting_ta_key`(`sorting_wall_id`, `cell_code`, `sorting_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='格口分配记录 - 播种墙格口与订单的绑定关系';

-- CreateTable
CREATE TABLE `outbound_order` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `order_number` VARCHAR(32) NOT NULL COMMENT '订单号',
    `reference_number` VARCHAR(64) NULL COMMENT '外部参考号',
    `platform` VARCHAR(32) NOT NULL DEFAULT 'MANUAL' COMMENT '来源平台：SHOPIFY, AMAZON, MANUAL, OTHER',
    `platform_order_id` VARCHAR(64) NULL COMMENT '平台原始订单ID',
    `order_source` VARCHAR(32) NOT NULL DEFAULT 'MANUAL' COMMENT '订单来源：MANUAL-手工创建, API-API导入, IMPORT-批量导入, PLATFORM-平台同步',
    `order_business_type` VARCHAR(32) NOT NULL DEFAULT 'STANDARD' COMMENT '出库业务类型：STANDARD=标准出库, RETURN_WAREHOUSE=退仓出库, SCRAP=下架销毁, OTHER=其他出库',
    `order_type` VARCHAR(32) NOT NULL DEFAULT 'SINGLE_ITEM_SINGLE' COMMENT '订单结构类型：SINGLE_ITEM_SINGLE=单品单件, SINGLE_ITEM_MULTI=单品多件, MULTI_ITEM=多品订单',
    `status` VARCHAR(32) NOT NULL DEFAULT 'CREATED' COMMENT '状态：CREATED/PENDING/ALLOCATED/PENDING_WAVE/IN_WAVE/WAVED/PICKING/PICKED/SORTING/SORTED/PACKING/PACKED/READY_SHIP/SHIPPED/DELIVERED/CANCELLED/ON_HOLD/EXCEPTION',
    `outbound_address_id` CHAR(36) NULL,
    `shipping_method` VARCHAR(64) NULL COMMENT '配送方式',
    `tracking_number` VARCHAR(64) NULL COMMENT '运单号',
    `total_ordered_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '订购总数量',
    `total_allocated_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已分配总数量',
    `total_picked_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已拣货总数量',
    `total_packed_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已打包总数量',
    `total_shipped_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已发货总数量',
    `total_sku_count` INTEGER NOT NULL DEFAULT 0 COMMENT 'SKU种类数',
    `total_weight_kg` DECIMAL(12, 3) NULL COMMENT '总重量（千克）',
    `total_volume_cbm` DECIMAL(12, 4) NULL COMMENT '总体积（立方米）',
    `wave_id` CHAR(36) NULL COMMENT '波次ID',
    `need_consolidation` BOOLEAN NOT NULL DEFAULT false COMMENT '是否需要合单',
    `is_combined` BOOLEAN NOT NULL DEFAULT false COMMENT '是否已合单',
    `combined_order_id` CHAR(36) NULL COMMENT '合单后的订单ID',
    `interception_status` VARCHAR(32) NOT NULL DEFAULT 'NOT_INTERCEPTED' COMMENT '拦截状态：NOT_INTERCEPTED, PENDING_INTERCEPTION, INTERCEPTED',
    `intercepted_reason` VARCHAR(255) NULL COMMENT '拦截原因',
    `intercepted_by` CHAR(36) NULL COMMENT '拦截操作员ID',
    `intercepted_at` DATETIME(3) NULL COMMENT '拦截时间',
    `number_change_status` VARCHAR(16) NOT NULL DEFAULT 'NONE' COMMENT '换号状态：SUCCESS=换号成功, FAILED=换号失败, NONE=不换号',
    `has_serial_items` BOOLEAN NOT NULL DEFAULT false COMMENT '是否含序列号商品',
    `manifest_order_id` CHAR(36) NULL COMMENT '发货总单ID',
    `notes` TEXT NULL COMMENT '备注',
    `config` JSON NOT NULL COMMENT '配置信息（JSON格式）',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `outbound_order_tenant_id_idx`(`tenant_id`),
    INDEX `outbound_order_client_id_idx`(`client_id`),
    INDEX `outbound_order_warehouse_id_idx`(`warehouse_id`),
    INDEX `outbound_order_status_idx`(`status`),
    INDEX `outbound_order_order_business_type_idx`(`order_business_type`),
    INDEX `outbound_order_order_type_idx`(`order_type`),
    INDEX `outbound_order_platform_idx`(`platform`),
    INDEX `outbound_order_wave_id_idx`(`wave_id`),
    INDEX `outbound_order_reference_number_idx`(`reference_number`),
    INDEX `outbound_order_interception_status_idx`(`interception_status`),
    INDEX `outbound_order_number_change_status_idx`(`number_change_status`),
    INDEX `outbound_order_address_id_fkey`(`outbound_address_id`),
    UNIQUE INDEX `outbound_order_tenant_id_order_number_key`(`tenant_id`, `order_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='出库订单主表 - 出库订单信息';

-- CreateTable
CREATE TABLE `outbound_order_line` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `order_id` CHAR(36) NOT NULL COMMENT '订单ID',
    `line_number` INTEGER NOT NULL COMMENT '行号',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `sku_name` VARCHAR(256) NULL COMMENT 'SKU名称',
    `quality_type` VARCHAR(20) NOT NULL DEFAULT 'GOOD' COMMENT '质量类型',
    `ordered_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '订购数量',
    `allocated_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已分配数量',
    `picked_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已拣货数量',
    `packed_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已打包数量',
    `shipped_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已发货数量',
    `cancelled_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '取消数量',
    `short_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '缺货数量',
    `uom_id` CHAR(36) NULL COMMENT '单位ID',
    `uom_code` VARCHAR(32) NULL COMMENT '单位编码',
    `unit_price` DECIMAL(15, 4) NULL COMMENT '单价',
    `line_amount` DECIMAL(15, 2) NULL COMMENT '行金额',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `udf` VARCHAR(64) NULL COMMENT 'UDF',
    `serial_numbers` JSON NULL COMMENT '序列号列表（JSON格式）',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待处理, ALLOCATED-已分配, PICKING-拣货中, PICKED-已拣货, PACKED-已打包, SHIPPED-已发货',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `outbound_order_line_tenant_id_idx`(`tenant_id`),
    INDEX `outbound_order_line_order_id_idx`(`order_id`),
    INDEX `outbound_order_line_sku_id_idx`(`sku_id`),
    INDEX `outbound_order_line_status_idx`(`status`),
    UNIQUE INDEX `outbound_order_line_order_id_line_number_key`(`order_id`, `line_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='出库订单明细表 - 出库订单明细';

-- CreateTable
CREATE TABLE `outbound_order_extension` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `order_id` CHAR(36) NOT NULL COMMENT '订单ID（唯一，1:1关系）',
    `total_amount` DECIMAL(12, 2) NULL COMMENT '订单总金额',
    `currency` VARCHAR(3) NULL DEFAULT 'CNY' COMMENT '币种',
    `channel` VARCHAR(50) NULL COMMENT '渠道',
    `logistics_tracking_number` VARCHAR(64) NULL COMMENT '物流单号（换号后的新单号）',
    `check_out_weight_kg` DECIMAL(8, 3) NULL COMMENT '签出重量（千克）',
    `recommended_packaging_model` VARCHAR(100) NULL COMMENT '推荐包材型号',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    UNIQUE INDEX `outbound_order_extension_order_id_key`(`order_id`),
    INDEX `outbound_order_extension_tenant_id_idx`(`tenant_id`),
    INDEX `outbound_order_extension_channel_idx`(`channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='出库订单扩展表 - 存放非核心字段，与订单1:1关系';

-- CreateTable
CREATE TABLE `outbound_order_address` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `shipping_name` VARCHAR(128) NULL,
    `shipping_phone` VARCHAR(32) NULL,
    `shipping_email` VARCHAR(128) NULL,
    `shipping_company` VARCHAR(128) NULL,
    `shipping_line1` VARCHAR(256) NULL,
    `shipping_line2` VARCHAR(256) NULL,
    `shipping_city` VARCHAR(64) NULL,
    `shipping_province` VARCHAR(64) NULL,
    `shipping_postal_code` VARCHAR(20) NULL,
    `shipping_country` VARCHAR(2) NULL DEFAULT 'CN',
    `shipping_country_name` VARCHAR(64) NULL,
    `shipping_full_address` TEXT NULL,
    `sender_name` VARCHAR(128) NULL,
    `sender_phone` VARCHAR(32) NULL,
    `sender_email` VARCHAR(128) NULL,
    `sender_company` VARCHAR(128) NULL,
    `sender_line1` VARCHAR(256) NULL,
    `sender_line2` VARCHAR(256) NULL,
    `sender_city` VARCHAR(64) NULL,
    `sender_province` VARCHAR(64) NULL,
    `sender_postal_code` VARCHAR(20) NULL,
    `sender_country` VARCHAR(2) NULL,
    `sender_country_name` VARCHAR(64) NULL,
    `sender_full_address` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `outbound_order_address_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outbound_order_timeline` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `expected_ship_date` DATE NULL,
    `expected_delivery_date` DATE NULL,
    `expected_outbound_time` DATETIME(3) NULL,
    `allocated_at` DATETIME(3) NULL,
    `allocated_by` CHAR(36) NULL,
    `waved_at` DATETIME(3) NULL,
    `waved_by` CHAR(36) NULL,
    `pending_pick_at` DATETIME(3) NULL,
    `picking_start_at` DATETIME(3) NULL,
    `picked_at` DATETIME(3) NULL,
    `picked_by` CHAR(36) NULL,
    `sorting_start_at` DATETIME(3) NULL,
    `sorted_at` DATETIME(3) NULL,
    `sorted_by` CHAR(36) NULL,
    `packing_start_at` DATETIME(3) NULL,
    `packed_at` DATETIME(3) NULL,
    `packed_by` CHAR(36) NULL,
    `checkout_pending_at` DATETIME(3) NULL,
    `checked_out_at` DATETIME(3) NULL,
    `checked_out_by` CHAR(36) NULL,
    `delivered_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancelled_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `outbound_order_timeline_order_id_key`(`order_id`),
    INDEX `outbound_order_timeline_tenant_id_idx`(`tenant_id`),
    INDEX `outbound_order_timeline_allocated_at_idx`(`allocated_at`),
    INDEX `outbound_order_timeline_picked_at_idx`(`picked_at`),
    INDEX `outbound_order_timeline_packed_at_idx`(`packed_at`),
    INDEX `outbound_order_timeline_checked_out_at_idx`(`checked_out_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wave` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `wave_number` VARCHAR(32) NOT NULL COMMENT '波次号',
    `wave_type` VARCHAR(32) NOT NULL DEFAULT 'STANDARD' COMMENT '波次类型：STANDARD-标准波次, EXPRESS-加急波次',
    `status` VARCHAR(32) NOT NULL DEFAULT 'CREATED' COMMENT '状态：CREATED-已创建, RELEASED-已释放, PICKING-拣货中, COMPLETED-已完成, CANCELLED-已取消',
    `priority` INTEGER NOT NULL DEFAULT 5 COMMENT '优先级（1-10，数字越小优先级越高）',
    `total_orders` INTEGER NOT NULL DEFAULT 0 COMMENT '订单总数',
    `order_ids` JSON NULL COMMENT '订单ID列表（JSON格式）',
    `total_lines` INTEGER NOT NULL DEFAULT 0 COMMENT '总行数',
    `total_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '总数量',
    `total_sku_count` INTEGER NOT NULL DEFAULT 0 COMMENT 'SKU种类数',
    `picked_orders` INTEGER NOT NULL DEFAULT 0 COMMENT '已拣货订单数',
    `picked_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已拣货数量',
    `planned_start_at` DATETIME(3) NULL COMMENT '计划开始时间',
    `actual_start_at` DATETIME(3) NULL COMMENT '实际开始时间',
    `actual_end_at` DATETIME(3) NULL COMMENT '实际结束时间',
    `pick_strategy` VARCHAR(32) NOT NULL DEFAULT 'ORDER' COMMENT '拣货策略：ORDER-按单拣货, SKU-按SKU拣货, ZONE-按库区拣货',
    `zone_ids` JSON NULL COMMENT '库区ID列表（JSON格式）',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `wave_tenant_id_idx`(`tenant_id`),
    INDEX `wave_warehouse_id_idx`(`warehouse_id`),
    INDEX `wave_status_idx`(`status`),
    INDEX `wave_wave_type_idx`(`wave_type`),
    UNIQUE INDEX `wave_tenant_id_wave_number_key`(`tenant_id`, `wave_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='波次表 - 出库波次管理';

-- CreateTable
CREATE TABLE `pick_order` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `task_number` VARCHAR(32) NOT NULL COMMENT '任务编号',
    `wave_id` CHAR(36) NULL COMMENT '波次ID',
    `task_type` VARCHAR(32) NOT NULL DEFAULT 'SINGLE_SKU_SINGLE' COMMENT '拣货单类型：SINGLE_SKU_SINGLE-单品单件(同款), MULTI_SKU_SINGLE-单品单件(不同款), SINGLE_SKU_MULTI-单品多件, MULTI_SKU_MULTI-多品多件',
    `order_business_type` VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待执行, IN_PROGRESS-执行中, COMPLETED-已完成, CANCELLED-已取消',
    `priority` INTEGER NOT NULL DEFAULT 5 COMMENT '优先级（1-10，数字越小优先级越高）',
    `assigned_user_id` CHAR(36) NULL COMMENT '分配人ID',
    `assigned_at` DATETIME(3) NULL COMMENT '分配时间',
    `started_at` DATETIME(3) NULL COMMENT '开始时间',
    `completed_at` DATETIME(3) NULL COMMENT '完成时间',
    `total_lines` INTEGER NOT NULL DEFAULT 0 COMMENT '总行数',
    `total_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '总数量',
    `picked_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已拣货数量',
    `pick_sequence` INTEGER NULL COMMENT '拣货顺序',
    `target_container` VARCHAR(64) NULL COMMENT '目标容器编号',
    `device_id` VARCHAR(64) NULL COMMENT '设备ID',
    `pick_method` VARCHAR(32) NULL COMMENT '拣货方式：PAPER-纸质单, PDA-PDA, RF-RF枪',
    `notes` TEXT NULL COMMENT '备注',
    `pick_mode` VARCHAR(32) NULL COMMENT '拣货模式',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `pick_order_tenant_id_idx`(`tenant_id`),
    INDEX `pick_order_warehouse_id_idx`(`warehouse_id`),
    INDEX `pick_order_wave_id_idx`(`wave_id`),
    INDEX `pick_order_status_idx`(`status`),
    INDEX `pick_order_assigned_user_id_idx`(`assigned_user_id`),
    INDEX `pick_order_pick_sequence_idx`(`pick_sequence`),
    UNIQUE INDEX `pick_order_tenant_id_task_number_key`(`tenant_id`, `task_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='拣货单表 - 拣货单主表';

-- CreateTable
CREATE TABLE `pick_order_line` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `pick_order_id` CHAR(36) NOT NULL COMMENT '拣货单ID',
    `line_number` INTEGER NOT NULL COMMENT '行号',
    `order_id` CHAR(36) NOT NULL COMMENT '订单ID',
    `order_line_id` CHAR(36) NOT NULL COMMENT '订单行ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
    `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
    `bucket_id` CHAR(36) NOT NULL COMMENT '库存桶ID',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `lpn` VARCHAR(64) NULL COMMENT 'LPN容器编号',
    `expected_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '预期数量',
    `picked_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已拣货数量',
    `packed_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已打包数量',
    `shipped_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已发货数量',
    `short_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '缺货数量',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待拣货, PICKED-已拣货, SHORT-缺货',
    `picked_at` DATETIME(3) NULL COMMENT '拣货时间',
    `picked_by` CHAR(36) NULL COMMENT '拣货人ID',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `pick_order_line_tenant_id_idx`(`tenant_id`),
    INDEX `pick_order_line_pick_order_id_idx`(`pick_order_id`),
    INDEX `pick_order_line_order_id_idx`(`order_id`),
    INDEX `pick_order_line_order_line_id_idx`(`order_line_id`),
    INDEX `pick_order_line_sku_id_idx`(`sku_id`),
    INDEX `pick_order_line_bucket_id_idx`(`bucket_id`),
    INDEX `pick_order_line_status_idx`(`status`),
    INDEX `pick_order_line_location_id_fkey`(`location_id`),
    UNIQUE INDEX `pick_order_line_pick_order_id_line_number_key`(`pick_order_id`, `line_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='拣货单明细表 - 拣货单明细';

-- CreateTable
CREATE TABLE `shipment` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `shipment_number` VARCHAR(32) NOT NULL COMMENT '发货单号',
    `order_id` CHAR(36) NOT NULL COMMENT '订单ID',
    `status` VARCHAR(32) NOT NULL DEFAULT 'CREATED' COMMENT '状态：CREATED-已创建, READY-待发货, SHIPPED-已发货, DELIVERED-已送达, CANCELLED-已取消',
    `carrier_id` CHAR(36) NULL COMMENT '承运商ID',
    `carrier_code` VARCHAR(32) NULL COMMENT '承运商编码',
    `carrier_name` VARCHAR(128) NULL COMMENT '承运商名称',
    `tracking_number` VARCHAR(64) NULL COMMENT '运单号',
    `shipping_method` VARCHAR(64) NULL COMMENT '配送方式',
    `package_count` INTEGER NOT NULL DEFAULT 1 COMMENT '包裹数',
    `total_weight_kg` DECIMAL(12, 3) NULL COMMENT '总重量（千克）',
    `total_volume_cbm` DECIMAL(12, 4) NULL COMMENT '总体积（立方米）',
    `shipping_fee` DECIMAL(15, 2) NULL COMMENT '运费',
    `insurance_fee` DECIMAL(15, 2) NULL COMMENT '保险费',
    `outbound_address_id` CHAR(36) NOT NULL,
    `shipped_at` DATETIME(3) NULL COMMENT '发货时间',
    `shipped_by` CHAR(36) NULL COMMENT '发货人ID',
    `delivered_at` DATETIME(3) NULL COMMENT '送达时间',
    `dock_id` CHAR(36) NULL COMMENT '月台ID',
    `label_printed` BOOLEAN NOT NULL DEFAULT false COMMENT '是否已打印面单',
    `label_printed_at` DATETIME(3) NULL COMMENT '面单打印时间',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `shipment_tenant_id_idx`(`tenant_id`),
    INDEX `shipment_warehouse_id_idx`(`warehouse_id`),
    INDEX `shipment_order_id_idx`(`order_id`),
    INDEX `shipment_status_idx`(`status`),
    INDEX `shipment_tracking_number_idx`(`tracking_number`),
    INDEX `shipment_carrier_code_idx`(`carrier_code`),
    INDEX `shipment_address_id_fkey`(`outbound_address_id`),
    UNIQUE INDEX `shipment_tenant_id_shipment_number_key`(`tenant_id`, `shipment_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='发货单表 - 发货单信息';

-- CreateTable
CREATE TABLE `inventory_alert` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `alert_type` VARCHAR(32) NOT NULL COMMENT '预警类型：LOW_STOCK-库存不足, OVERSTOCK-库存过剩, EXPIRY-临期预警, SLOW_MOVING-滞销预警',
    `severity` VARCHAR(20) NOT NULL COMMENT '严重程度：INFO-信息, WARNING-警告, CRITICAL-严重',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE-生效中, ACKNOWLEDGED-已确认, RESOLVED-已解决',
    `message` VARCHAR(500) NOT NULL COMMENT '预警消息',
    `threshold` INTEGER NULL COMMENT '阈值',
    `current_quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '当前数量',
    `acknowledged_by_user_id` CHAR(36) NULL COMMENT '确认人ID',
    `acknowledged_at` DATETIME(3) NULL COMMENT '确认时间',
    `resolved_at` DATETIME(3) NULL COMMENT '解决时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `inventory_alert_tenant_id_idx`(`tenant_id`),
    INDEX `inventory_alert_warehouse_id_idx`(`warehouse_id`),
    INDEX `inventory_alert_sku_id_idx`(`sku_id`),
    INDEX `inventory_alert_alert_type_idx`(`alert_type`),
    INDEX `inventory_alert_severity_idx`(`severity`),
    INDEX `inventory_alert_status_idx`(`status`),
    INDEX `inventory_alert_created_at_idx`(`created_at`),
    INDEX `inventory_alert_acknowledged_by_user_id_fkey`(`acknowledged_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存预警表 - 库存预警记录';

-- CreateTable
CREATE TABLE `inventory_transfer` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `transfer_number` VARCHAR(32) NOT NULL COMMENT '转移单号',
    `transfer_type` VARCHAR(32) NOT NULL COMMENT '转移类型：LOCATION-库位转移, ZONE-库区转移, STATUS-状态转移',
    `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态：DRAFT-草稿, PENDING-待审批, APPROVED-已审批, EXECUTING-执行中, COMPLETED-已完成, REJECTED-已拒绝',
    `reason` VARCHAR(500) NOT NULL COMMENT '转移原因',
    `notes` TEXT NULL COMMENT '备注',
    `total_items` INTEGER NOT NULL DEFAULT 0 COMMENT '总项数',
    `total_quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '总数量',
    `created_by_user_id` CHAR(36) NULL COMMENT '创建人ID',
    `approved_by_user_id` CHAR(36) NULL COMMENT '审批人ID',
    `approved_at` DATETIME(3) NULL COMMENT '审批时间',
    `rejected_by_user_id` CHAR(36) NULL COMMENT '拒绝人ID',
    `rejected_at` DATETIME(3) NULL COMMENT '拒绝时间',
    `reject_reason` VARCHAR(500) NULL COMMENT '拒绝原因',
    `executed_by_user_id` CHAR(36) NULL COMMENT '执行人ID',
    `executed_at` DATETIME(3) NULL COMMENT '执行时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `inventory_transfer_tenant_id_idx`(`tenant_id`),
    INDEX `inventory_transfer_warehouse_id_idx`(`warehouse_id`),
    INDEX `inventory_transfer_status_idx`(`status`),
    INDEX `inventory_transfer_transfer_type_idx`(`transfer_type`),
    INDEX `inventory_transfer_created_at_idx`(`created_at`),
    UNIQUE INDEX `inventory_transfer_tenant_id_transfer_number_key`(`tenant_id`, `transfer_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存转移单表 - 库存转移单主表';

-- CreateTable
CREATE TABLE `inventory_transfer_line` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `transfer_id` CHAR(36) NOT NULL COMMENT '转移单ID',
    `line_number` INTEGER NOT NULL COMMENT '行号',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `source_location_id` CHAR(36) NOT NULL COMMENT '源库位ID',
    `target_location_id` CHAR(36) NOT NULL COMMENT '目标库位ID',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '计划转移数量',
    `transferred_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已转移数量',
    `reason` VARCHAR(500) NULL COMMENT '转移原因',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待执行, COMPLETED-已完成, CANCELLED-已取消',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `inventory_transfer_line_tenant_id_idx`(`tenant_id`),
    INDEX `inventory_transfer_line_transfer_id_idx`(`transfer_id`),
    INDEX `inventory_transfer_line_sku_id_idx`(`sku_id`),
    INDEX `inventory_transfer_line_status_idx`(`status`),
    INDEX `inventory_transfer_line_source_location_id_fkey`(`source_location_id`),
    INDEX `inventory_transfer_line_target_location_id_fkey`(`target_location_id`),
    UNIQUE INDEX `inventory_transfer_line_transfer_id_line_number_key`(`transfer_id`, `line_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存转移单明细表 - 库存转移单明细';

-- CreateTable
CREATE TABLE `packaging_material` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NULL COMMENT '仓库ID',
    `material_code` VARCHAR(32) NOT NULL COMMENT '包材编码',
    `material_name` VARCHAR(128) NOT NULL COMMENT '包材名称',
    `material_type` VARCHAR(32) NOT NULL COMMENT '包材类型：CARTON-纸箱, BAG-袋子, TAPE-胶带, FILLER-填充物, LABEL-标签',
    `specification` VARCHAR(256) NULL COMMENT '规格',
    `length_cm` DECIMAL(10, 2) NULL COMMENT '长度（厘米）',
    `width_cm` DECIMAL(10, 2) NULL COMMENT '宽度（厘米）',
    `height_cm` DECIMAL(10, 2) NULL COMMENT '高度（厘米）',
    `volume_cbm` DECIMAL(12, 6) NULL COMMENT '体积（立方米）',
    `weight_kg` DECIMAL(10, 3) NULL COMMENT '重量（千克）',
    `max_load_weight_kg` DECIMAL(10, 2) NULL COMMENT '最大承重（千克）',
    `unit` VARCHAR(32) NOT NULL DEFAULT 'PCS' COMMENT '单位',
    `unit_price` DECIMAL(15, 4) NULL COMMENT '单价',
    `currency` VARCHAR(3) NULL DEFAULT 'CNY' COMMENT '币种',
    `supplier_id` CHAR(36) NULL COMMENT '供应商ID',
    `supplier_name` VARCHAR(128) NULL COMMENT '供应商名称',
    `barcode` VARCHAR(64) NULL COMMENT '条码',
    `image_url` VARCHAR(512) NULL COMMENT '图片URL',
    `source` VARCHAR(32) NOT NULL DEFAULT 'PURCHASE' COMMENT '来源：PURCHASE-采购, RECYCLE-回收',
    `is_reusable` BOOLEAN NOT NULL DEFAULT false COMMENT '是否可重复使用',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `packaging_material_tenant_id_idx`(`tenant_id`),
    INDEX `packaging_material_warehouse_id_idx`(`warehouse_id`),
    INDEX `packaging_material_material_type_idx`(`material_type`),
    INDEX `packaging_material_barcode_idx`(`barcode`),
    INDEX `packaging_material_is_active_idx`(`is_active`),
    UNIQUE INDEX `packaging_material_tenant_id_material_code_key`(`tenant_id`, `material_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='包材主表 - 包装材料主数据';

-- CreateTable
CREATE TABLE `packaging_material_inventory` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `material_id` CHAR(36) NOT NULL COMMENT '包材ID',
    `material_code` VARCHAR(32) NOT NULL COMMENT '包材编码',
    `material_name` VARCHAR(128) NOT NULL COMMENT '包材名称',
    `total_quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '总数量',
    `available_quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '可用数量',
    `allocated_quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '已分配数量',
    `on_order_quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '在途数量',
    `safety_stock` INTEGER NOT NULL DEFAULT 0 COMMENT '安全库存',
    `minimum_stock` INTEGER NOT NULL DEFAULT 0 COMMENT '最小库存',
    `maximum_stock` INTEGER NULL COMMENT '最大库存',
    `unit` VARCHAR(32) NOT NULL DEFAULT 'PCS' COMMENT '单位',
    `status` VARCHAR(32) NOT NULL DEFAULT 'NORMAL' COMMENT '状态：NORMAL-正常, LOW-库存不足, OUT-缺货',
    `last_movement_at` DATETIME(3) NULL COMMENT '最后移动时间',
    `last_count_at` DATETIME(3) NULL COMMENT '最后盘点时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `packaging_material_inventory_tenant_id_idx`(`tenant_id`),
    INDEX `packaging_material_inventory_warehouse_id_idx`(`warehouse_id`),
    INDEX `packaging_material_inventory_material_id_idx`(`material_id`),
    INDEX `packaging_material_inventory_status_idx`(`status`),
    INDEX `packaging_material_inventory_material_code_idx`(`material_code`),
    UNIQUE INDEX `packaging_material_inventory_warehouse_id_material_id_key`(`warehouse_id`, `material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='包材库存表 - 包装材料库存';

-- CreateTable
CREATE TABLE `packaging_material_transaction` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `material_id` CHAR(36) NOT NULL COMMENT '包材ID',
    `material_code` VARCHAR(32) NOT NULL COMMENT '包材编码',
    `material_name` VARCHAR(128) NOT NULL COMMENT '包材名称',
    `transaction_type` VARCHAR(32) NOT NULL COMMENT '事务类型：RECEIVE-入库, CONSUME-消耗, ADJUST-调整, RETURN-退回',
    `quantity_change` INTEGER NOT NULL DEFAULT 0 COMMENT '数量变化',
    `quantity_before` INTEGER NOT NULL DEFAULT 0 COMMENT '变动前数量',
    `quantity_after` INTEGER NOT NULL DEFAULT 0 COMMENT '变动后数量',
    `reference_type` VARCHAR(32) NULL COMMENT '关联单据类型',
    `reference_id` CHAR(36) NULL COMMENT '关联单据ID',
    `reference_number` VARCHAR(64) NULL COMMENT '关联单据编号',
    `reference_detail` VARCHAR(256) NULL COMMENT '关联单据明细',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `unit_cost` DECIMAL(15, 4) NULL COMMENT '单位成本',
    `total_cost` DECIMAL(15, 4) NULL COMMENT '总成本',
    `operator_id` CHAR(36) NOT NULL COMMENT '操作人ID',
    `operator_name` VARCHAR(64) NOT NULL COMMENT '操作人姓名',
    `operation_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '操作时间',
    `audit_status` VARCHAR(32) NOT NULL DEFAULT 'UNAUDITED' COMMENT '审核状态：UNAUDITED-未审核, AUDITED-已审核',
    `audited_at` DATETIME(3) NULL COMMENT '审核时间',
    `audited_by` CHAR(36) NULL COMMENT '审核人ID',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',

    INDEX `packaging_material_transaction_tenant_id_idx`(`tenant_id`),
    INDEX `packaging_material_transaction_warehouse_id_idx`(`warehouse_id`),
    INDEX `packaging_material_transaction_material_id_idx`(`material_id`),
    INDEX `packaging_material_transaction_transaction_type_idx`(`transaction_type`),
    INDEX `packaging_material_transaction_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `packaging_material_transaction_operation_time_idx`(`operation_time`),
    INDEX `packaging_material_transaction_operator_id_idx`(`operator_id`),
    INDEX `packaging_material_transaction_audit_status_idx`(`audit_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='包材库存流水表 - 包装材料库存变动记录';

-- CreateTable
CREATE TABLE `packaging_material_usage` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `order_id` CHAR(36) NOT NULL COMMENT '订单ID',
    `order_number` VARCHAR(64) NOT NULL COMMENT '订单号',
    `shipment_id` CHAR(36) NULL COMMENT '发货单ID',
    `material_id` CHAR(36) NOT NULL COMMENT '包材ID',
    `material_code` VARCHAR(32) NOT NULL COMMENT '包材编码',
    `material_name` VARCHAR(128) NOT NULL COMMENT '包材名称',
    `quantity` INTEGER NOT NULL DEFAULT 1 COMMENT '使用数量',
    `unit_cost` DECIMAL(15, 4) NULL COMMENT '单位成本',
    `total_cost` DECIMAL(15, 4) NULL COMMENT '总成本',
    `packing_station_id` CHAR(36) NULL COMMENT '打包台ID',
    `packed_by` CHAR(36) NOT NULL COMMENT '打包人ID',
    `packed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '打包时间',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',

    INDEX `packaging_material_usage_tenant_id_idx`(`tenant_id`),
    INDEX `packaging_material_usage_warehouse_id_idx`(`warehouse_id`),
    INDEX `packaging_material_usage_order_id_idx`(`order_id`),
    INDEX `packaging_material_usage_shipment_id_idx`(`shipment_id`),
    INDEX `packaging_material_usage_material_id_idx`(`material_id`),
    INDEX `packaging_material_usage_packed_at_idx`(`packed_at`),
    INDEX `packaging_material_usage_packed_by_idx`(`packed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='包材使用记录表 - 包装材料使用记录';

-- CreateTable
CREATE TABLE `audits` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `operation_type` VARCHAR(20) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(36) NOT NULL,
    `entity_name` VARCHAR(255) NULL,
    `old_data` JSON NULL,
    `new_data` JSON NULL,
    `changed_fields` JSON NULL,
    `operator_id` CHAR(36) NULL,
    `operator_name` VARCHAR(100) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `request_path` VARCHAR(255) NULL,
    `request_method` VARCHAR(10) NULL,
    `description` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audits_tenant_id_idx`(`tenant_id`),
    INDEX `audits_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audits_operator_id_idx`(`operator_id`),
    INDEX `audits_created_at_idx`(`created_at`),
    INDEX `audits_operation_type_idx`(`operation_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_logs` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `entity_type` VARCHAR(32) NOT NULL,
    `entity_id` CHAR(36) NOT NULL,
    `entity_number` VARCHAR(64) NOT NULL,
    `operation_type` VARCHAR(32) NOT NULL,
    `operation_name` VARCHAR(64) NOT NULL,
    `before_status` VARCHAR(32) NULL,
    `after_status` VARCHAR(32) NULL,
    `remark` VARCHAR(500) NULL,
    `operator_id` CHAR(36) NULL,
    `operator_name` VARCHAR(100) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `operation_logs_tenant_id_idx`(`tenant_id`),
    INDEX `operation_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `operation_logs_entity_id_idx`(`entity_id`),
    INDEX `operation_logs_operation_type_idx`(`operation_type`),
    INDEX `operation_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `background_job` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `job_number` VARCHAR(32) NOT NULL COMMENT '任务编号',
    `bull_job_id` VARCHAR(64) NULL COMMENT 'BullMQ任务ID',
    `job_type` VARCHAR(32) NOT NULL COMMENT '任务类型：INVENTORY_ALLOCATION, REPORT_EXPORT, DATA_UPLOAD, SHIPMENT_STATUS_PUSH',
    `job_sub_type` VARCHAR(32) NULL COMMENT '任务子类型：ASN, ORDER, SKU（用于DATA_UPLOAD）',
    `job_name` VARCHAR(128) NOT NULL COMMENT '任务名称',
    `description` VARCHAR(512) NULL COMMENT '任务描述',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待处理, PROCESSING-处理中, COMPLETED-已完成, FAILED-失败, CANCELLED-已取消',
    `priority` INTEGER NOT NULL DEFAULT 5 COMMENT '优先级：1-最高, 10-最低',
    `input_data` JSON NOT NULL COMMENT '输入参数（JSON格式）',
    `result_data` JSON NULL COMMENT '处理结果（JSON格式）',
    `error_message` TEXT NULL COMMENT '错误信息',
    `error_stack` TEXT NULL COMMENT '错误堆栈',
    `progress` INTEGER NOT NULL DEFAULT 0 COMMENT '进度百分比（0-100）',
    `progress_message` VARCHAR(512) NULL COMMENT '进度消息',
    `processed_count` INTEGER NOT NULL DEFAULT 0 COMMENT '已处理数量',
    `total_count` INTEGER NOT NULL DEFAULT 0 COMMENT '总数量',
    `success_count` INTEGER NOT NULL DEFAULT 0 COMMENT '成功数量',
    `failed_count` INTEGER NOT NULL DEFAULT 0 COMMENT '失败数量',
    `result_file_path` VARCHAR(512) NULL COMMENT '结果文件路径',
    `result_file_name` VARCHAR(256) NULL COMMENT '结果文件名',
    `result_file_size` INTEGER NULL COMMENT '结果文件大小（字节）',
    `result_expires_at` DATETIME(3) NULL COMMENT '结果文件过期时间',
    `retry_count` INTEGER NOT NULL DEFAULT 0 COMMENT '重试次数',
    `max_retries` INTEGER NOT NULL DEFAULT 3 COMMENT '最大重试次数',
    `scheduled_at` DATETIME(3) NULL COMMENT '计划执行时间',
    `started_at` DATETIME(3) NULL COMMENT '开始执行时间',
    `completed_at` DATETIME(3) NULL COMMENT '完成时间',
    `warehouse_id` CHAR(36) NULL COMMENT '仓库ID（可选，用于仓库级任务）',
    `client_id` CHAR(36) NULL COMMENT '客户ID（可选，用于客户级任务）',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `background_job_tenant_id_idx`(`tenant_id`),
    INDEX `background_job_job_type_idx`(`job_type`),
    INDEX `background_job_status_idx`(`status`),
    INDEX `background_job_created_at_idx`(`created_at`),
    INDEX `background_job_created_by_idx`(`created_by`),
    INDEX `background_job_warehouse_id_idx`(`warehouse_id`),
    INDEX `background_job_client_id_idx`(`client_id`),
    UNIQUE INDEX `background_job_tenant_id_job_number_key`(`tenant_id`, `job_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='后台任务表 - 异步任务队列记录';

-- CreateTable
CREATE TABLE `api_key` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `name` VARCHAR(64) NOT NULL COMMENT '密钥名称',
    `description` VARCHAR(256) NULL COMMENT '密钥描述',
    `key_hash` VARCHAR(128) NOT NULL COMMENT 'API Key（哈希存储）',
    `key_prefix` VARCHAR(16) NOT NULL COMMENT 'Key前缀（用于显示，如 wms_xxx...）',
    `client_id` CHAR(36) NULL COMMENT '客户ID（可选，限制只能访问特定客户数据）',
    `warehouse_id` CHAR(36) NULL COMMENT '仓库ID（可选，限制只能访问特定仓库数据）',
    `scopes` JSON NOT NULL COMMENT '权限范围（JSON格式，如 ["asn:read", "asn:write", "sku:read"]）',
    `rate_limit` INTEGER NOT NULL DEFAULT 100 COMMENT '速率限制（每分钟请求数）',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `expires_at` DATETIME(3) NULL COMMENT '过期时间（可选）',
    `last_used_at` DATETIME(3) NULL COMMENT '最后使用时间',
    `last_used_ip` VARCHAR(45) NULL COMMENT '最后使用IP',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `api_key_tenant_id_idx`(`tenant_id`),
    INDEX `api_key_key_hash_idx`(`key_hash`),
    INDEX `api_key_client_id_idx`(`client_id`),
    INDEX `api_key_warehouse_id_idx`(`warehouse_id`),
    INDEX `api_key_is_active_idx`(`is_active`),
    UNIQUE INDEX `api_key_tenant_id_name_key`(`tenant_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='API密钥表 - 外部系统集成认证密钥';

-- CreateTable
CREATE TABLE `container_item` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `container_id` CHAR(36) NOT NULL COMMENT '容器ID',
    `asn_id` CHAR(36) NOT NULL COMMENT 'ASN ID',
    `asn_line_id` CHAR(36) NULL COMMENT 'ASN行ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(32) NOT NULL COMMENT 'SKU编码',
    `sku_name` VARCHAR(255) NULL COMMENT 'SKU名称',
    `quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '数量',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `lot_number` VARCHAR(64) NULL COMMENT '批号',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `production_date` DATE NULL COMMENT '生产日期',
    `quality_type` VARCHAR(20) NOT NULL DEFAULT 'GOOD' COMMENT '质量类型：GOOD-良品, DAMAGED-破损',
    `serial_numbers` JSON NULL COMMENT '序列号列表（JSON格式）',
    `received_at` DATETIME(3) NOT NULL COMMENT '收货时间',
    `received_by` CHAR(36) NOT NULL COMMENT '收货人ID',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `container_item_tenant_id_idx`(`tenant_id`),
    INDEX `container_item_container_id_idx`(`container_id`),
    INDEX `container_item_asn_id_idx`(`asn_id`),
    INDEX `container_item_sku_code_idx`(`sku_code`),
    INDEX `container_item_asn_line_id_fkey`(`asn_line_id`),
    INDEX `container_item_sku_id_fkey`(`sku_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='容器明细表 - 记录容器内的SKU明细';

-- CreateTable
CREATE TABLE `receiving_record` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `record_number` VARCHAR(32) NOT NULL COMMENT '收货记录编号',
    `asn_id` CHAR(36) NOT NULL COMMENT 'ASN ID',
    `asn_line_id` CHAR(36) NULL COMMENT 'ASN行ID',
    `container_id` CHAR(36) NULL COMMENT '容器ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(32) NOT NULL COMMENT 'SKU编码',
    `sku_name` VARCHAR(255) NULL COMMENT 'SKU名称',
    `expected_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '预期数量',
    `received_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '收货数量',
    `good_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '良品数量',
    `damaged_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '破损数量',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `lot_number` VARCHAR(64) NULL COMMENT '批号',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `production_date` DATE NULL COMMENT '生产日期',
    `serial_numbers` JSON NULL COMMENT '序列号列表（JSON格式）',
    `receiving_mode` VARCHAR(20) NOT NULL DEFAULT 'SKU' COMMENT '收货模式：SKU-按SKU收货, CONTAINER-按容器收货',
    `device_type` VARCHAR(20) NOT NULL DEFAULT 'PDA' COMMENT '设备类型：PDA, PC',
    `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' COMMENT '状态：DRAFT-草稿, COMPLETED-已完成',
    `received_at` DATETIME(3) NOT NULL COMMENT '收货时间',
    `received_by` CHAR(36) NOT NULL COMMENT '收货人ID',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    UNIQUE INDEX `receiving_record_record_number_key`(`record_number`),
    INDEX `receiving_record_tenant_id_idx`(`tenant_id`),
    INDEX `receiving_record_asn_id_idx`(`asn_id`),
    INDEX `receiving_record_warehouse_id_idx`(`warehouse_id`),
    INDEX `receiving_record_received_at_idx`(`received_at`),
    INDEX `receiving_record_asn_line_id_fkey`(`asn_line_id`),
    INDEX `receiving_record_client_id_fkey`(`client_id`),
    INDEX `receiving_record_container_id_fkey`(`container_id`),
    INDEX `receiving_record_sku_id_fkey`(`sku_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='收货记录表 - 记录每次收货操作';

-- CreateTable
CREATE TABLE `putaway_order` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `putaway_order_number` VARCHAR(32) NOT NULL COMMENT '上架单编号',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `asn_id` CHAR(36) NOT NULL COMMENT 'ASN ID',
    `asn_type` VARCHAR(20) NOT NULL COMMENT 'ASN类型：NORMAL-普通入库, TRANSFER-调拨入库, RETURN-退货入库',
    `putaway_mode` VARCHAR(20) NOT NULL DEFAULT 'CONTAINER_MODE' COMMENT '上架模式：CONTAINER_MODE-容器模式, TASK_MODE-任务模式, MIXED_MODE-混合模式',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待处理, PARTIAL-部分完成, COMPLETED-已完成, CANCELLED-已取消',
    `total_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '总数量',
    `putaway_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已上架数量',
    `pending_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '待上架数量',
    `container_count` INTEGER NOT NULL DEFAULT 0 COMMENT '容器数量',
    `sku_count` INTEGER NOT NULL DEFAULT 0 COMMENT 'SKU种类数',
    `line_count` INTEGER NOT NULL DEFAULT 0 COMMENT '行数',
    `putaway_start_time` DATETIME(3) NULL COMMENT '上架开始时间',
    `putaway_end_time` DATETIME(3) NULL COMMENT '上架结束时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    UNIQUE INDEX `putaway_order_putaway_order_number_key`(`putaway_order_number`),
    INDEX `putaway_order_tenant_id_idx`(`tenant_id`),
    INDEX `putaway_order_warehouse_id_idx`(`warehouse_id`),
    INDEX `putaway_order_asn_id_idx`(`asn_id`),
    INDEX `putaway_order_status_idx`(`status`),
    INDEX `putaway_order_client_id_fkey`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='上架单表 - 组织上架任务的单据';

-- CreateTable
CREATE TABLE `putaway_order_line` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `putaway_order_id` CHAR(36) NOT NULL COMMENT '上架单ID',
    `line_number` INTEGER NOT NULL COMMENT '行号',
    `asn_id` CHAR(36) NOT NULL COMMENT 'ASN ID',
    `asn_line_id` CHAR(36) NULL COMMENT 'ASN行ID',
    `container_id` CHAR(36) NULL COMMENT '容器ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(32) NOT NULL COMMENT 'SKU编码',
    `sku_name` VARCHAR(255) NULL COMMENT 'SKU名称',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `lot_number` VARCHAR(64) NULL COMMENT '批号',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `quality_type` VARCHAR(20) NOT NULL DEFAULT 'GOOD' COMMENT '质量类型：GOOD-良品, DAMAGED-破损',
    `quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '需上架数量',
    `putaway_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '已上架数量',
    `remaining_qty` INTEGER NOT NULL DEFAULT 0 COMMENT '剩余数量',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待上架, IN_PROGRESS-上架中, COMPLETED-已完成, CANCELLED-已取消',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' COMMENT '优先级：LOW-低, MEDIUM-中, HIGH-高',
    `source_location` VARCHAR(32) NULL COMMENT '源库位',
    `target_location` VARCHAR(32) NULL COMMENT '推荐目标库位',
    `assigned_to` CHAR(36) NULL COMMENT '分配给用户ID',
    `assigned_by` CHAR(36) NULL COMMENT '分配人ID',
    `assigned_at` DATETIME(3) NULL COMMENT '分配时间',
    `started_at` DATETIME(3) NULL COMMENT '开始执行时间',
    `completed_at` DATETIME(3) NULL COMMENT '完成时间',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `putaway_order_line_tenant_id_idx`(`tenant_id`),
    INDEX `putaway_order_line_putaway_order_id_idx`(`putaway_order_id`),
    INDEX `putaway_order_line_asn_id_idx`(`asn_id`),
    INDEX `putaway_order_line_asn_line_id_idx`(`asn_line_id`),
    INDEX `putaway_order_line_container_id_idx`(`container_id`),
    INDEX `putaway_order_line_sku_id_idx`(`sku_id`),
    INDEX `putaway_order_line_status_idx`(`status`),
    INDEX `putaway_order_line_assigned_to_idx`(`assigned_to`),
    UNIQUE INDEX `putaway_order_line_putaway_order_id_line_number_key`(`putaway_order_id`, `line_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='上架单行表 - 表示需要上架什么';

-- CreateTable
CREATE TABLE `putaway_detail` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `detail_number` VARCHAR(32) NOT NULL COMMENT '详情编号',
    `putaway_order_id` CHAR(36) NOT NULL COMMENT '上架单ID',
    `putaway_line_id` CHAR(36) NOT NULL COMMENT '上架单行ID',
    `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(32) NOT NULL COMMENT 'SKU编码',
    `sku_name` VARCHAR(255) NULL COMMENT 'SKU名称',
    `batch_number` VARCHAR(64) NULL COMMENT '批次号',
    `lot_number` VARCHAR(64) NULL COMMENT '批号',
    `expiry_date` DATE NULL COMMENT '到期日期',
    `quality_type` VARCHAR(20) NOT NULL DEFAULT 'GOOD' COMMENT '质量类型：GOOD-良品, DAMAGED-破损',
    `quantity` INTEGER NOT NULL DEFAULT 0 COMMENT '本次上架数量',
    `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
    `location_code` VARCHAR(32) NOT NULL COMMENT '库位编码',
    `bucket_id` CHAR(36) NULL COMMENT '库存桶ID',
    `container_id` CHAR(36) NULL COMMENT '容器ID',
    `container_code` VARCHAR(32) NULL COMMENT '容器编码',
    `serial_numbers` JSON NULL COMMENT '序列号列表',
    `putaway_at` DATETIME(3) NOT NULL COMMENT '上架时间',
    `putaway_by` CHAR(36) NOT NULL COMMENT '上架人ID',
    `device_type` VARCHAR(20) NOT NULL DEFAULT 'PDA' COMMENT '设备类型：PDA-手持设备, WEB-网页端',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    UNIQUE INDEX `putaway_detail_detail_number_key`(`detail_number`),
    INDEX `putaway_detail_tenant_id_idx`(`tenant_id`),
    INDEX `putaway_detail_putaway_order_id_idx`(`putaway_order_id`),
    INDEX `putaway_detail_putaway_line_id_idx`(`putaway_line_id`),
    INDEX `putaway_detail_sku_id_idx`(`sku_id`),
    INDEX `putaway_detail_location_id_idx`(`location_id`),
    INDEX `putaway_detail_putaway_at_idx`(`putaway_at`),
    INDEX `putaway_detail_putaway_by_idx`(`putaway_by`),
    INDEX `putaway_detail_container_id_fkey`(`container_id`),
    INDEX `putaway_detail_bucket_id_fkey`(`bucket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='上架详情表 - 记录每次实际上架操作';

-- CreateTable
CREATE TABLE `short_receive_reason_code` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `reason_code` VARCHAR(32) NOT NULL COMMENT '原因码',
    `reason_name` VARCHAR(128) NOT NULL COMMENT '原因名称',
    `description` VARCHAR(255) NULL COMMENT '描述',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `sort_order` INTEGER NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    INDEX `short_receive_reason_code_tenant_id_idx`(`tenant_id`),
    UNIQUE INDEX `short_receive_reason_code_tenant_id_reason_code_key`(`tenant_id`, `reason_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='短收原因码表 - 短收原因配置';

-- CreateTable
CREATE TABLE `receiving_discrepancy` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `discrepancy_number` VARCHAR(32) NOT NULL COMMENT '差异编号',
    `asn_id` CHAR(36) NOT NULL COMMENT 'ASN ID',
    `asn_line_id` CHAR(36) NULL COMMENT 'ASN行ID',
    `container_id` CHAR(36) NULL COMMENT '容器ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
    `discrepancy_type` VARCHAR(32) NOT NULL COMMENT '差异类型：QTY_SHORT-数量短收, WRONG_SKU-SKU错误, QUALITY_ISSUE-质量问题, PACKAGING_ISSUE-包装问题, BATCH_MISMATCH-批次不符, DOC_MISMATCH-单据不符',
    `sku_id` CHAR(36) NULL COMMENT 'SKU ID',
    `sku_code` VARCHAR(32) NOT NULL COMMENT 'SKU编码',
    `expected_value` VARCHAR(255) NULL COMMENT '预期值',
    `actual_value` VARCHAR(255) NULL COMMENT '实际值',
    `qty_difference` INTEGER NULL COMMENT '数量差异（负值表示短收）',
    `severity` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' COMMENT '严重程度：LOW-低, MEDIUM-中, HIGH-高, CRITICAL-严重',
    `status` VARCHAR(32) NOT NULL DEFAULT 'REPORTED' COMMENT '状态：REPORTED-已报告, INVESTIGATING-调查中, PENDING_SUPPLIER-等待供应商, RESOLVED-已解决, AUTO_RESOLVED-自动解决, CLAIM_CREATED-已创建索赔, CLAIM_SETTLED-索赔已结算, CLOSED-已关闭',
    `short_receive_reason_id` CHAR(36) NULL COMMENT '短收原因ID',
    `resolution_type` VARCHAR(32) NULL COMMENT '处理方式：ACCEPT-接受, REJECT-拒收, ADJUST-调整, CLAIM-索赔, RETURN_TO_VENDOR-退回供应商, PENDING_RECEIPT-待后续收货, WRITE_OFF-核销',
    `resolution_note` TEXT NULL COMMENT '处理备注',
    `claim_id` VARCHAR(32) NULL COMMENT '索赔单ID',
    `reported_by` CHAR(36) NOT NULL COMMENT '报告人ID',
    `reported_at` DATETIME(3) NOT NULL COMMENT '报告时间',
    `resolved_by` CHAR(36) NULL COMMENT '处理人ID',
    `resolved_at` DATETIME(3) NULL COMMENT '处理时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',

    UNIQUE INDEX `receiving_discrepancy_discrepancy_number_key`(`discrepancy_number`),
    INDEX `receiving_discrepancy_tenant_id_idx`(`tenant_id`),
    INDEX `receiving_discrepancy_asn_id_idx`(`asn_id`),
    INDEX `receiving_discrepancy_status_idx`(`status`),
    INDEX `receiving_discrepancy_discrepancy_type_idx`(`discrepancy_type`),
    INDEX `receiving_discrepancy_asn_line_id_fkey`(`asn_line_id`),
    INDEX `receiving_discrepancy_client_id_fkey`(`client_id`),
    INDEX `receiving_discrepancy_container_id_fkey`(`container_id`),
    INDEX `receiving_discrepancy_short_receive_reason_id_fkey`(`short_receive_reason_id`),
    INDEX `receiving_discrepancy_sku_id_fkey`(`sku_id`),
    INDEX `receiving_discrepancy_warehouse_id_fkey`(`warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='收货差异表 - 记录收货差异';

-- CreateTable
CREATE TABLE `scheduled_task` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `task_code` VARCHAR(64) NOT NULL COMMENT '任务编码（唯一标识）',
    `task_name` VARCHAR(128) NOT NULL COMMENT '任务名称',
    `description` TEXT NULL COMMENT '任务描述',
    `cron_expression` VARCHAR(64) NOT NULL COMMENT 'Cron表达式',
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai' COMMENT '时区',
    `handler` VARCHAR(64) NOT NULL COMMENT '处理器名称',
    `params` JSON NULL COMMENT '任务参数（JSON格式）',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `last_run_at` DATETIME(3) NULL COMMENT '上次执行时间',
    `last_run_status` VARCHAR(20) NULL COMMENT '上次执行状态',
    `last_run_message` TEXT NULL COMMENT '上次执行消息',
    `last_run_duration` INTEGER NULL COMMENT '上次执行耗时（毫秒）',
    `next_run_at` DATETIME(3) NULL COMMENT '下次执行时间',
    `run_count` INTEGER NOT NULL DEFAULT 0 COMMENT '执行次数',
    `fail_count` INTEGER NOT NULL DEFAULT 0 COMMENT '失败次数',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    UNIQUE INDEX `scheduled_task_task_code_key`(`task_code`),
    INDEX `scheduled_task_tenant_id_idx`(`tenant_id`),
    INDEX `scheduled_task_is_active_idx`(`is_active`),
    INDEX `scheduled_task_handler_idx`(`handler`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='定时任务表 - 可配置的定时任务';

-- CreateTable
CREATE TABLE `scheduled_task_log` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `task_id` CHAR(36) NOT NULL COMMENT '任务ID',
    `task_code` VARCHAR(64) NOT NULL COMMENT '任务编码',
    `status` VARCHAR(20) NOT NULL COMMENT '执行状态：RUNNING-执行中, SUCCESS-成功, FAILED-失败',
    `message` TEXT NULL COMMENT '执行消息',
    `error_stack` TEXT NULL COMMENT '错误堆栈',
    `duration` INTEGER NULL COMMENT '执行耗时（毫秒）',
    `started_at` DATETIME(3) NOT NULL COMMENT '开始时间',
    `completed_at` DATETIME(3) NULL COMMENT '完成时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',

    INDEX `scheduled_task_log_tenant_id_idx`(`tenant_id`),
    INDEX `scheduled_task_log_task_id_idx`(`task_id`),
    INDEX `scheduled_task_log_status_idx`(`status`),
    INDEX `scheduled_task_log_started_at_idx`(`started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='定时任务执行日志表';

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role` ADD CONSTRAINT `role_parent_role_id_fkey` FOREIGN KEY (`parent_role_id`) REFERENCES `role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role` ADD CONSTRAINT `role_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission` ADD CONSTRAINT `permission_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `permission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_history` ADD CONSTRAINT `login_history_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_history` ADD CONSTRAINT `login_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_history` ADD CONSTRAINT `password_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse` ADD CONSTRAINT `warehouse_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zone` ADD CONSTRAINT `zone_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zone` ADD CONSTRAINT `zone_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bin_location` ADD CONSTRAINT `bin_location_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bin_location` ADD CONSTRAINT `bin_location_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bin_location` ADD CONSTRAINT `bin_location_zone_id_fkey` FOREIGN KEY (`zone_id`) REFERENCES `zone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container` ADD CONSTRAINT `container_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container` ADD CONSTRAINT `container_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_warehouse` ADD CONSTRAINT `client_warehouse_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_warehouse` ADD CONSTRAINT `client_warehouse_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_warehouse` ADD CONSTRAINT `client_warehouse_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: inventory_event
ALTER TABLE `inventory_event` ADD CONSTRAINT `inventory_event_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_event` ADD CONSTRAINT `inventory_event_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `bin_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_event` ADD CONSTRAINT `inventory_event_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_event` ADD CONSTRAINT `inventory_event_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_event` ADD CONSTRAINT `inventory_event_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: inventory_bucket
ALTER TABLE `inventory_bucket` ADD CONSTRAINT `inventory_bucket_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_bucket` ADD CONSTRAINT `inventory_bucket_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `bin_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_bucket` ADD CONSTRAINT `inventory_bucket_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_bucket` ADD CONSTRAINT `inventory_bucket_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_bucket` ADD CONSTRAINT `inventory_bucket_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_bucket` ADD CONSTRAINT `inventory_bucket_zone_id_fkey` FOREIGN KEY (`zone_id`) REFERENCES `zone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: inventory_snapshot
ALTER TABLE `inventory_snapshot` ADD CONSTRAINT `inventory_snapshot_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_snapshot` ADD CONSTRAINT `inventory_snapshot_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `bin_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_snapshot` ADD CONSTRAINT `inventory_snapshot_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_snapshot` ADD CONSTRAINT `inventory_snapshot_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_snapshot` ADD CONSTRAINT `inventory_snapshot_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_snapshot` ADD CONSTRAINT `inventory_snapshot_zone_id_fkey` FOREIGN KEY (`zone_id`) REFERENCES `zone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: sku_inventory_summary
ALTER TABLE `sku_inventory_summary` ADD CONSTRAINT `sku_inventory_summary_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_inventory_summary` ADD CONSTRAINT `sku_inventory_summary_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_inventory_summary` ADD CONSTRAINT `sku_inventory_summary_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_inventory_summary` ADD CONSTRAINT `sku_inventory_summary_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: allocation_detail
ALTER TABLE `allocation_detail` ADD CONSTRAINT `allocation_detail_bucket_id_fkey` FOREIGN KEY (`bucket_id`) REFERENCES `inventory_bucket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `allocation_detail` ADD CONSTRAINT `allocation_detail_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_number` ADD CONSTRAINT `serial_number_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_number` ADD CONSTRAINT `serial_number_putaway_order_id_fkey` FOREIGN KEY (`putaway_order_id`) REFERENCES `putaway_order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_number` ADD CONSTRAINT `serial_number_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `serial_number` ADD CONSTRAINT `serial_number_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_adjustment` ADD CONSTRAINT `inventory_adjustment_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_adjustment` ADD CONSTRAINT `inventory_adjustment_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_adjustment` ADD CONSTRAINT `inventory_adjustment_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_adjustment_line` ADD CONSTRAINT `inventory_adjustment_line_adjustment_id_fkey` FOREIGN KEY (`adjustment_id`) REFERENCES `inventory_adjustment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_category` ADD CONSTRAINT `sku_category_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_category` ADD CONSTRAINT `sku_category_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `sku_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_category` ADD CONSTRAINT `sku_category_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku` ADD CONSTRAINT `sku_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `sku_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku` ADD CONSTRAINT `sku_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku` ADD CONSTRAINT `sku_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_uom` ADD CONSTRAINT `sku_uom_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_uom` ADD CONSTRAINT `sku_uom_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_barcode` ADD CONSTRAINT `sku_barcode_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_barcode` ADD CONSTRAINT `sku_barcode_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_barcode` ADD CONSTRAINT `sku_barcode_uom_id_fkey` FOREIGN KEY (`uom_id`) REFERENCES `sku_uom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_image` ADD CONSTRAINT `sku_image_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_image` ADD CONSTRAINT `sku_image_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_attribute` ADD CONSTRAINT `sku_attribute_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_attribute` ADD CONSTRAINT `sku_attribute_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `combo_product` ADD CONSTRAINT `combo_product_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `combo_product` ADD CONSTRAINT `combo_product_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `combo_component` ADD CONSTRAINT `combo_component_combo_product_id_fkey` FOREIGN KEY (`combo_product_id`) REFERENCES `combo_product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `combo_component` ADD CONSTRAINT `combo_component_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `combo_component` ADD CONSTRAINT `combo_component_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asn` ADD CONSTRAINT `asn_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asn` ADD CONSTRAINT `asn_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asn` ADD CONSTRAINT `asn_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asn_line` ADD CONSTRAINT `asn_line_asn_id_fkey` FOREIGN KEY (`asn_id`) REFERENCES `asn`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asn_line` ADD CONSTRAINT `asn_line_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asn_line` ADD CONSTRAINT `asn_line_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_wall` ADD CONSTRAINT `sorting_wall_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_wall` ADD CONSTRAINT `sorting_wall_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_task` ADD CONSTRAINT `sorting_task_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_task` ADD CONSTRAINT `sorting_task_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_task` ADD CONSTRAINT `sorting_task_pick_order_id_fkey` FOREIGN KEY (`pick_order_id`) REFERENCES `pick_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_task` ADD CONSTRAINT `sorting_task_sorting_wall_id_fkey` FOREIGN KEY (`sorting_wall_id`) REFERENCES `sorting_wall`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_task_line` ADD CONSTRAINT `sorting_task_line_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_task_line` ADD CONSTRAINT `sorting_task_line_sorting_task_id_fkey` FOREIGN KEY (`sorting_task_id`) REFERENCES `sorting_task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_task_line` ADD CONSTRAINT `sorting_task_line_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_task_line` ADD CONSTRAINT `sorting_task_line_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_cell_allocation` ADD CONSTRAINT `sorting_cell_allocation_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_cell_allocation` ADD CONSTRAINT `sorting_cell_allocation_sorting_wall_id_fkey` FOREIGN KEY (`sorting_wall_id`) REFERENCES `sorting_wall`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_cell_allocation` ADD CONSTRAINT `sorting_cell_allocation_sorting_task_id_fkey` FOREIGN KEY (`sorting_task_id`) REFERENCES `sorting_task`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sorting_cell_allocation` ADD CONSTRAINT `sorting_cell_allocation_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order` ADD CONSTRAINT `outbound_order_address_id_fkey` FOREIGN KEY (`outbound_address_id`) REFERENCES `outbound_order_address`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order` ADD CONSTRAINT `outbound_order_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order` ADD CONSTRAINT `outbound_order_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order` ADD CONSTRAINT `outbound_order_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order` ADD CONSTRAINT `outbound_order_wave_id_fkey` FOREIGN KEY (`wave_id`) REFERENCES `wave`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order_line` ADD CONSTRAINT `outbound_order_line_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order_line` ADD CONSTRAINT `outbound_order_line_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order_line` ADD CONSTRAINT `outbound_order_line_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order_extension` ADD CONSTRAINT `outbound_order_extension_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order_extension` ADD CONSTRAINT `outbound_order_extension_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order_address` ADD CONSTRAINT `outbound_order_address_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order_timeline` ADD CONSTRAINT `outbound_order_timeline_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_order_timeline` ADD CONSTRAINT `outbound_order_timeline_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wave` ADD CONSTRAINT `wave_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wave` ADD CONSTRAINT `wave_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order` ADD CONSTRAINT `pick_order_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order` ADD CONSTRAINT `pick_order_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order` ADD CONSTRAINT `pick_order_wave_id_fkey` FOREIGN KEY (`wave_id`) REFERENCES `wave`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order_line` ADD CONSTRAINT `pick_order_line_bucket_id_fkey` FOREIGN KEY (`bucket_id`) REFERENCES `inventory_bucket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order_line` ADD CONSTRAINT `pick_order_line_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `bin_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order_line` ADD CONSTRAINT `pick_order_line_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order_line` ADD CONSTRAINT `pick_order_line_order_line_id_fkey` FOREIGN KEY (`order_line_id`) REFERENCES `outbound_order_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order_line` ADD CONSTRAINT `pick_order_line_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order_line` ADD CONSTRAINT `pick_order_line_pick_order_id_fkey` FOREIGN KEY (`pick_order_id`) REFERENCES `pick_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pick_order_line` ADD CONSTRAINT `pick_order_line_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment` ADD CONSTRAINT `shipment_address_id_fkey` FOREIGN KEY (`outbound_address_id`) REFERENCES `outbound_order_address`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment` ADD CONSTRAINT `shipment_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment` ADD CONSTRAINT `shipment_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment` ADD CONSTRAINT `shipment_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_alert` ADD CONSTRAINT `inventory_alert_acknowledged_by_user_id_fkey` FOREIGN KEY (`acknowledged_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_alert` ADD CONSTRAINT `inventory_alert_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_alert` ADD CONSTRAINT `inventory_alert_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_alert` ADD CONSTRAINT `inventory_alert_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer` ADD CONSTRAINT `inventory_transfer_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer` ADD CONSTRAINT `inventory_transfer_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer_line` ADD CONSTRAINT `inventory_transfer_line_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer_line` ADD CONSTRAINT `inventory_transfer_line_source_location_id_fkey` FOREIGN KEY (`source_location_id`) REFERENCES `bin_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer_line` ADD CONSTRAINT `inventory_transfer_line_target_location_id_fkey` FOREIGN KEY (`target_location_id`) REFERENCES `bin_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer_line` ADD CONSTRAINT `inventory_transfer_line_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfer_line` ADD CONSTRAINT `inventory_transfer_line_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `inventory_transfer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_material` ADD CONSTRAINT `packaging_material_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_material_inventory` ADD CONSTRAINT `packaging_material_inventory_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `packaging_material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_material_inventory` ADD CONSTRAINT `packaging_material_inventory_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_material_transaction` ADD CONSTRAINT `packaging_material_transaction_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `packaging_material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_material_transaction` ADD CONSTRAINT `packaging_material_transaction_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_material_usage` ADD CONSTRAINT `packaging_material_usage_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `packaging_material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packaging_material_usage` ADD CONSTRAINT `packaging_material_usage_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audits` ADD CONSTRAINT `audits_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operation_logs` ADD CONSTRAINT `operation_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `background_job` ADD CONSTRAINT `background_job_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_key` ADD CONSTRAINT `api_key_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_key` ADD CONSTRAINT `api_key_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_key` ADD CONSTRAINT `api_key_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_item` ADD CONSTRAINT `container_item_asn_id_fkey` FOREIGN KEY (`asn_id`) REFERENCES `asn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_item` ADD CONSTRAINT `container_item_asn_line_id_fkey` FOREIGN KEY (`asn_line_id`) REFERENCES `asn_line`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_item` ADD CONSTRAINT `container_item_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_item` ADD CONSTRAINT `container_item_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_item` ADD CONSTRAINT `container_item_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_record` ADD CONSTRAINT `receiving_record_asn_id_fkey` FOREIGN KEY (`asn_id`) REFERENCES `asn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_record` ADD CONSTRAINT `receiving_record_asn_line_id_fkey` FOREIGN KEY (`asn_line_id`) REFERENCES `asn_line`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_record` ADD CONSTRAINT `receiving_record_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_record` ADD CONSTRAINT `receiving_record_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_record` ADD CONSTRAINT `receiving_record_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_record` ADD CONSTRAINT `receiving_record_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_record` ADD CONSTRAINT `receiving_record_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order` ADD CONSTRAINT `putaway_order_asn_id_fkey` FOREIGN KEY (`asn_id`) REFERENCES `asn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order` ADD CONSTRAINT `putaway_order_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order` ADD CONSTRAINT `putaway_order_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order` ADD CONSTRAINT `putaway_order_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order_line` ADD CONSTRAINT `putaway_order_line_asn_id_fkey` FOREIGN KEY (`asn_id`) REFERENCES `asn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order_line` ADD CONSTRAINT `putaway_order_line_asn_line_id_fkey` FOREIGN KEY (`asn_line_id`) REFERENCES `asn_line`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order_line` ADD CONSTRAINT `putaway_order_line_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order_line` ADD CONSTRAINT `putaway_order_line_putaway_order_id_fkey` FOREIGN KEY (`putaway_order_id`) REFERENCES `putaway_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order_line` ADD CONSTRAINT `putaway_order_line_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_order_line` ADD CONSTRAINT `putaway_order_line_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_detail` ADD CONSTRAINT `putaway_detail_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_detail` ADD CONSTRAINT `putaway_detail_bucket_id_fkey` FOREIGN KEY (`bucket_id`) REFERENCES `inventory_bucket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_detail` ADD CONSTRAINT `putaway_detail_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `bin_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_detail` ADD CONSTRAINT `putaway_detail_putaway_line_id_fkey` FOREIGN KEY (`putaway_line_id`) REFERENCES `putaway_order_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_detail` ADD CONSTRAINT `putaway_detail_putaway_order_id_fkey` FOREIGN KEY (`putaway_order_id`) REFERENCES `putaway_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_detail` ADD CONSTRAINT `putaway_detail_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `putaway_detail` ADD CONSTRAINT `putaway_detail_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `short_receive_reason_code` ADD CONSTRAINT `short_receive_reason_code_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_discrepancy` ADD CONSTRAINT `receiving_discrepancy_asn_id_fkey` FOREIGN KEY (`asn_id`) REFERENCES `asn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_discrepancy` ADD CONSTRAINT `receiving_discrepancy_asn_line_id_fkey` FOREIGN KEY (`asn_line_id`) REFERENCES `asn_line`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_discrepancy` ADD CONSTRAINT `receiving_discrepancy_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_discrepancy` ADD CONSTRAINT `receiving_discrepancy_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_discrepancy` ADD CONSTRAINT `receiving_discrepancy_short_receive_reason_id_fkey` FOREIGN KEY (`short_receive_reason_id`) REFERENCES `short_receive_reason_code`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_discrepancy` ADD CONSTRAINT `receiving_discrepancy_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_discrepancy` ADD CONSTRAINT `receiving_discrepancy_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_discrepancy` ADD CONSTRAINT `receiving_discrepancy_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_task` ADD CONSTRAINT `scheduled_task_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_task_log` ADD CONSTRAINT `scheduled_task_log_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `scheduled_task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_task_log` ADD CONSTRAINT `scheduled_task_log_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 签出单表 - 包裹签出/发货记录
-- ============================================================
CREATE TABLE `checkout_order` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `manifest_order_id` CHAR(36) NULL COMMENT '出库总单ID',
    `checkout_number` VARCHAR(64) NOT NULL COMMENT '签出单号',
    `checkout_type` VARCHAR(16) NOT NULL COMMENT '签出类型：PALLET-托盘, BAG-袋子',
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING-待签出, CHECKED_OUT-已签出',
    `channel_name` VARCHAR(128) NULL COMMENT '渠道名称',
    `channel_code` VARCHAR(64) NULL COMMENT '渠道编码',
    `order_count` INTEGER NOT NULL DEFAULT 0 COMMENT '订单数量',
    `parcel_count` INTEGER NOT NULL DEFAULT 0 COMMENT '包裹数量',
    `checked_out_at` DATETIME(3) NULL COMMENT '签出时间',
    `checked_out_by` CHAR(36) NULL COMMENT '签出人ID',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `checkout_order_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `checkout_order_warehouse_id_idx`(`warehouse_id`),
    INDEX `checkout_order_manifest_order_id_idx`(`manifest_order_id`),
    UNIQUE INDEX `checkout_order_tenant_id_checkout_number_key`(`tenant_id`, `checkout_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='签出单表 - 包裹签出/发货记录';

-- ============================================================
-- 签出记录表 - 签出单扫描明细
-- ============================================================
CREATE TABLE `checkout_record` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `checkout_order_id` CHAR(36) NOT NULL COMMENT '签出单ID',
    `sequence_number` INTEGER NOT NULL COMMENT '序号',
    `scanned_number` VARCHAR(64) NOT NULL COMMENT '扫描号（订单号/物流单号）',
    `number_type` VARCHAR(16) NOT NULL COMMENT '号码类型：ORDER-订单号, TRACKING-物流单号',
    `order_id` CHAR(36) NOT NULL COMMENT '出库订单ID',
    `order_number` VARCHAR(32) NOT NULL COMMENT '订单号',
    `shipment_id` CHAR(36) NULL COMMENT '发货单ID',
    `tracking_number` VARCHAR(64) NULL COMMENT '物流单号',
    `channel_name` VARCHAR(128) NULL COMMENT '渠道名称',
    `channel_code` VARCHAR(64) NULL COMMENT '渠道编码',
    `scanned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '扫描时间',
    `scanned_by` CHAR(36) NULL COMMENT '扫描人ID',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',

    INDEX `checkout_record_tenant_id_checkout_order_id_idx`(`tenant_id`, `checkout_order_id`),
    INDEX `checkout_record_order_id_idx`(`order_id`),
    INDEX `checkout_record_tracking_number_idx`(`tracking_number`),
    UNIQUE INDEX `checkout_record_checkout_order_id_scanned_number_key`(`checkout_order_id`, `scanned_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='签出记录表 - 签出单扫描明细';

-- ============================================================
-- 出库总单表 - 出库总单管理
-- ============================================================
CREATE TABLE `manifest_order` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `manifest_number` VARCHAR(64) NOT NULL COMMENT '出库总单号',
    `status` VARCHAR(32) NOT NULL DEFAULT 'CREATED' COMMENT '状态：CREATED-已创建, COMPLETED-已完结, CANCELLED-已取消',
    `channel_code` VARCHAR(64) NULL COMMENT '渠道编码',
    `channel_name` VARCHAR(128) NULL COMMENT '渠道名称',
    `client_id` CHAR(36) NULL COMMENT '客户ID',
    `order_count` INTEGER NOT NULL DEFAULT 0 COMMENT '订单数量',
    `parcel_count` INTEGER NOT NULL DEFAULT 0 COMMENT '包裹数量',
    `container_count` INTEGER NOT NULL DEFAULT 0 COMMENT '板数/袋数',
    `total_weight_kg` DECIMAL(12, 3) NULL COMMENT '总重量（千克）',
    `completed_at` DATETIME(3) NULL COMMENT '完结时间',
    `completed_by` CHAR(36) NULL COMMENT '完结人ID',
    `notes` TEXT NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `manifest_order_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `manifest_order_warehouse_id_idx`(`warehouse_id`),
    INDEX `manifest_order_channel_code_idx`(`channel_code`),
    INDEX `manifest_order_client_id_idx`(`client_id`),
    INDEX `manifest_order_created_at_idx`(`created_at`),
    INDEX `manifest_order_completed_at_idx`(`completed_at`),
    UNIQUE INDEX `manifest_order_tenant_id_manifest_number_key`(`tenant_id`, `manifest_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='出库总单表 - 出库总单管理';

-- AddForeignKey (签出单)
ALTER TABLE `checkout_order` ADD CONSTRAINT `checkout_order_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkout_order` ADD CONSTRAINT `checkout_order_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkout_order` ADD CONSTRAINT `checkout_order_manifest_order_id_fkey` FOREIGN KEY (`manifest_order_id`) REFERENCES `manifest_order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (签出记录)
ALTER TABLE `checkout_record` ADD CONSTRAINT `checkout_record_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkout_record` ADD CONSTRAINT `checkout_record_checkout_order_id_fkey` FOREIGN KEY (`checkout_order_id`) REFERENCES `checkout_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkout_record` ADD CONSTRAINT `checkout_record_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checkout_record` ADD CONSTRAINT `checkout_record_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `shipment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (出库总单)
ALTER TABLE `manifest_order` ADD CONSTRAINT `manifest_order_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manifest_order` ADD CONSTRAINT `manifest_order_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manifest_order` ADD CONSTRAINT `manifest_order_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 迁移内容整合 (Migrations Consolidated)
-- 以下是后续迁移中新增的表、字段和索引
-- ============================================================================

-- ============================================================================
-- 打印管理相关表 (来自 20260302100404_add_print_settings)
-- ============================================================================

-- 打印模板表
CREATE TABLE `print_template` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `label_type` VARCHAR(32) NOT NULL,
    `width_mm` DECIMAL(8, 2) NOT NULL,
    `height_mm` DECIMAL(8, 2) NOT NULL,
    `orientation` VARCHAR(16) NOT NULL DEFAULT 'portrait',
    `margins` JSON NULL,
    `template_content` TEXT NULL,
    `field_mappings` JSON NULL,
    `default_device_id` CHAR(36) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,

    INDEX `print_template_tenant_id_label_type_idx`(`tenant_id`, `label_type`),
    INDEX `print_template_default_device_id_idx`(`default_device_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='打印模板表';

-- 打印设备表
CREATE TABLE `print_device` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `device_type` VARCHAR(32) NOT NULL,
    `connection_type` VARCHAR(16) NOT NULL,
    `ip_address` VARCHAR(64) NULL,
    `port` INTEGER NULL,
    `location` VARCHAR(128) NULL,
    `charset` VARCHAR(16) NOT NULL DEFAULT 'UTF-8',
    `dpi` INTEGER NOT NULL DEFAULT 203,
    `is_online` BOOLEAN NOT NULL DEFAULT false,
    `last_online_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,

    INDEX `print_device_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='打印设备表';

-- 打印历史表
CREATE TABLE `print_history` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `device_id` CHAR(36) NULL,
    `template_id` CHAR(36) NULL,
    `label_type` VARCHAR(32) NOT NULL,
    `related_id` CHAR(36) NULL,
    `related_type` VARCHAR(32) NULL,
    `page_count` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(16) NOT NULL,
    `error_message` TEXT NULL,
    `printed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `printed_by_id` CHAR(36) NULL,

    INDEX `print_history_tenant_id_printed_at_idx`(`tenant_id`, `printed_at`),
    INDEX `print_history_device_id_idx`(`device_id`),
    INDEX `print_history_template_id_idx`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='打印历史表';

-- 打印相关外键约束
ALTER TABLE `print_template` ADD CONSTRAINT `print_template_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `print_template` ADD CONSTRAINT `print_template_default_device_id_fkey` FOREIGN KEY (`default_device_id`) REFERENCES `print_device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `print_device` ADD CONSTRAINT `print_device_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `print_history` ADD CONSTRAINT `print_history_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `print_history` ADD CONSTRAINT `print_history_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `print_device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `print_history` ADD CONSTRAINT `print_history_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `print_template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `print_history` ADD CONSTRAINT `print_history_printed_by_id_fkey` FOREIGN KEY (`printed_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 新增字段 (来自各个迁移)
-- ============================================================================

-- 出库订单行添加必需效期字段
ALTER TABLE `outbound_order_line` ADD COLUMN `required_expiry_date` DATE NULL COMMENT '必需效期日期';

-- 容器项添加上架订单行关联
ALTER TABLE `container_item` ADD COLUMN `putaway_order_line_id` CHAR(36) NULL COMMENT '上架订单行ID';
CREATE INDEX `container_item_putaway_order_line_id_idx` ON `container_item`(`putaway_order_line_id`);
ALTER TABLE `container_item` ADD CONSTRAINT `container_item_putaway_order_line_id_fkey` FOREIGN KEY (`putaway_order_line_id`) REFERENCES `putaway_order_line`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 库存快照 ASN 索引 (来自 20260305192500_add_asn_to_snapshot_unique)
-- ============================================================================

-- 创建包含 asn_number 的唯一索引
CREATE UNIQUE INDEX `inv_snapshot_unique_with_asn` ON `inventory_snapshot`(`location_id`, `sku_id`, `batch_number`, `lpn`, `expiry_date`, `asn_number`);

-- 创建 asn_number 索引
CREATE INDEX `inventory_snapshot_asn_number_idx` ON `inventory_snapshot`(`asn_number`);
