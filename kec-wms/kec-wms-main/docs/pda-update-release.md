# PDA 更新发布说明

## 发布方式

- 当前方案不使用宿主机目录挂载。
- `pda.apk` 和 `pda-release.json` 直接放在 `backend/public/downloads/`。
- 构建 `Docker（容器）` 镜像时，`public` 目录会被复制进镜像，容器启动后即可通过现有接口下载。

## 目录文件

- `backend/public/downloads/pda.apk`
- `backend/public/downloads/pda-release.json`

可参考仓库里的示例文件：

- `backend/public/downloads/pda-release.example.json`

`pda-release.json` 示例：

```json
{
  "versionCode": 2,
  "versionName": "1.0.1",
  "minSupportedVersionCode": 1,
  "forceUpdate": false,
  "downloadUrl": "/pda-download",
  "releaseNotes": [
    "修复登录后偶发的网络重试问题",
    "优化首页更新提示和版本展示"
  ],
  "fileSize": 12345678,
  "fileSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "publishedAt": "2026-04-01T12:00:00+08:00"
}
```

## 发布步骤

1. 构建 `Release APK（正式安装包）`
2. 计算 `APK（安卓安装包）` 的文件大小和 `SHA-256（文件摘要）`
3. 将 `pda.apk` 复制到 `backend/public/downloads/`
4. 按实际版本信息生成 `backend/public/downloads/pda-release.json`
5. 重新构建 `backend（后端）` 镜像
6. 重新部署容器

## 注意事项

- 如果构建镜像时 `backend/public/downloads/pda.apk` 不存在，容器里的 `/pda-download` 会返回 `404`
- 如果构建镜像时 `backend/public/downloads/pda-release.json` 不存在或格式错误，`/api/v1/pda/app-version` 会返回失败
- 这种方式下，每次更新 `PDA（手持终端）` 安装包都需要重新构建并重新部署 `backend（后端）`

## 接口

- 下载地址：`GET /pda-download`
- 版本检查：`GET /api/v1/pda/app-version`
