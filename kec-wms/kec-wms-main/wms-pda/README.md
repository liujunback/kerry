# WMS PDA Android应用

基于Kotlin + Jetpack Compose开发的仓储管理系统PDA应用。

## 技术栈

- **语言**: Kotlin
- **UI框架**: Jetpack Compose + Material Design 3
- **架构**: MVVM + Clean Architecture
- **依赖注入**: Hilt
- **网络**: Retrofit + OkHttp
- **异步**: Kotlin Coroutines + Flow
- **Cookie管理**: PersistentCookieJar

## 项目结构

```
app/src/main/java/com/kec/wms/pda/
├── data/                    # 数据层
│   ├── api/                 # API接口定义
│   ├── model/               # 数据模型
│   └── repository/          # 数据仓库
├── domain/                  # 业务逻辑层
│   ├── model/               # 领域模型
│   └── usecase/             # 用例
├── presentation/            # 表现层
│   ├── login/               # 登录模块
│   ├── receiving/           # 收货模块（待实现）
│   ├── common/              # 通用UI组件
│   └── theme/               # 主题样式
├── di/                      # 依赖注入模块
└── util/                    # 工具类
```

## 已实现功能

### ✅ 第一阶段（已完成）
1. 项目架构搭建（MVVM + Clean Architecture）
2. 网络层实现（Retrofit + Cookie认证）
3. 依赖注入配置（Hilt）
4. 登录功能
   - 多租户登录（租户编码 + 用户名 + 密码）
   - Cookie持久化
   - 用户信息获取

### 🚧 待实现功能
1. ASN扫描和加载
2. SKU收货流程
3. 批次号和效期输入
4. 质量状态选择
5. 扫码枪集成（ZXing）
6. 离线支持（Room数据库）

## 构建和运行

### 前置要求
- Android Studio Hedgehog (2023.1.1) 或更高版本
- JDK 17
- Android SDK API 34
- 最低支持Android 7.0 (API 24)

### 配置后端地址

在 `app/build.gradle.kts` 中修改API地址：

```kotlin
buildConfigField("String", "API_BASE_URL", "\"http://your-server-ip:3000/\"")
```

**注意**:
- 如果使用Android模拟器，后端地址应为 `http://10.0.2.2:3000/`（10.0.2.2是模拟器访问宿主机的特殊IP）
- 如果使用真实设备，需要使用局域网IP地址

### 构建步骤

1. 在Android Studio中打开项目
2. 等待Gradle同步完成
3. 点击 "Build" → "Make Project"
4. 连接Android设备或启动模拟器
5. 点击 "Run" 按钮

### 命令行构建

```bash
# 构建Debug版本
./gradlew assembleDebug

# 构建Release版本
./gradlew assembleRelease

# 安装到设备
./gradlew installDebug
```

## 测试账号

默认测试账号（需要后端已启动）：
- 租户编码: `DEFAULT`
- 用户名: `admin`
- 密码: `Admin@123`

## API接口

应用调用以下后端API：

### 认证
- `POST /api/auth/callback/credentials` - 登录
- `GET /api/v1/auth/me` - 获取用户信息

### 入库（待实现）
- `GET /api/v1/asn/lookup` - 查询ASN
- `POST /api/v1/asn/{id}/receiving/sku` - 提交收货
- `POST /api/v1/asn/{id}/receiving/complete` - 完成收货

## 开发说明

### 添加新功能

1. 在 `data/model/` 创建数据模型
2. 在 `data/api/` 定义API接口
3. 在 `data/repository/` 实现数据仓库
4. 在 `domain/usecase/` 创建用例
5. 在 `presentation/` 创建ViewModel和UI

### 代码规范

- 使用Kotlin官方代码风格
- 遵循MVVM架构模式
- UI组件使用Jetpack Compose
- 异步操作使用Coroutines
- 依赖注入使用Hilt

## 常见问题

### 1. 无法连接后端
- 检查后端服务是否启动
- 检查API_BASE_URL配置是否正确
- 确保设备/模拟器与后端在同一网络

### 2. Gradle同步失败
- 检查网络连接
- 清理项目: Build → Clean Project
- 重新同步: File → Sync Project with Gradle Files

### 3. 编译错误
- 确保使用JDK 17
- 更新Android Studio到最新版本
- 清理并重新构建项目

## 下一步开发计划

1. 实现ASN扫描界面
2. 实现SKU收货流程
3. 集成ZXing扫码库
4. 添加离线支持
5. 性能优化和测试

## 许可证

内部项目，仅供KEC WMS使用。
