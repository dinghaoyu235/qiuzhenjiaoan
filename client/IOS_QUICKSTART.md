# iOS 快速部署指南

## 为什么不能直接用 Expo Go？

由于应用使用了以下原生功能，在 Expo Go 中可能无法正常工作：

- 🎤 语音录音（需要麦克风权限）
- 📸 拍照/相册访问
- 💾 保存到相册
- 🎵 音频播放

## 快速解决方案（3步）

### 第一步：安装 EAS CLI

```bash
npm install -g eas-cli
```

### 第二步：登录并配置

```bash
eas login
eas build:configure
```

### 第三步：构建并安装

**选项 1：云端构建（推荐，无需 Mac）**

```bash
# 构建开发版本（功能完整，但有效期7天）
eas build --platform ios --profile development
```

构建完成后：
1. 用 iPhone 扫描二维码
2. 安装应用
3. 打开「设置」→「通用」→「VPN 与设备管理」
4. 信任开发者证书

**选项 2：本地构建（需要 Mac）**

```bash
# 在 Mac 上运行
eas build --platform ios --profile development --local
```

---

## 功能对比

| 功能 | Expo Go | Development Build | 生产版本 |
|------|---------|-------------------|----------|
| 基础 UI | ✅ | ✅ | ✅ |
| 网络请求 | ✅ | ✅ | ✅ |
| 相册选择 | ✅ | ✅ | ✅ |
| 相机拍照 | ⚠️ 限制 | ✅ | ✅ |
| 语音录音 | ❌ 不支持 | ✅ | ✅ |
| 保存到相册 | ❌ 不支持 | ✅ | ✅ |
| 音频播放 | ✅ | ✅ | ✅ |
| 分享文件 | ✅ | ✅ | ✅ |

---

## 常见问题

### Q1: 构建需要多长时间？

- **云端构建**: 首次约 10-20 分钟，后续约 5-10 分钟
- **本地构建**: 取决于你的 Mac 性能，通常 5-15 分钟

### Q2: 免费账号有什么限制？

- 应用每 7 天需要重新安装
- 最多 3 台设备
- 不能发布到 App Store

### Q3: 如何发布到 App Store？

```bash
# 构建生产版本
eas build --platform ios --profile production

# 提交审核
eas submit --platform ios --latest
```

需要付费的 Apple Developer 账号（$99/年）。

---

## 测试清单

安装到 iPhone 后，测试以下功能：

- [ ] 应用启动
- [ ] 创建教案
- [ ] 语音输入（麦克风）
- [ ] 选择图片（相册）
- [ ] 预览教案
- [ ] 生成 PPT
- [ ] 导出 PPT

---

## 技术支持

如遇到问题，请检查：

1. **网络问题**: 确保能访问 expo.dev
2. **权限问题**: 首次使用时允许相机、麦克风、相册权限
3. **版本问题**: 确保使用最新版本
4. **证书问题**: 检查是否正确信任开发者证书

详细文档请参考 [IOS_DEPLOYMENT.md](./IOS_DEPLOYMENT.md)
