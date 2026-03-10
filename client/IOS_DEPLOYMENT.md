# iOS 部署指南

## 问题描述
由于应用使用了多个 Expo 原生模块（相机、相册、麦克风、音频等），这些功能在 Expo Go 中可能不完全支持。要在 iPhone 上完整使用所有功能，需要创建开发构建（Development Build）或独立构建。

## 解决方案

### 方案一：使用 Expo Development Build（推荐用于开发测试）

#### 前置要求
- macOS 电脑
- Xcode 15.0 或更高版本
- iOS 设备（iPhone 或 iPad）
- Apple Developer 账号（可以使用免费个人账号）

#### 步骤 1：配置项目

确保 `app.config.ts` 中已正确配置所有权限（已配置）：

```typescript
plugins: [
  'expo-router',
  "expo-splash-screen",
  "expo-image-picker",
  "expo-location",
  "expo-camera",
  "expo-av",
  "expo-media-library"
]
```

#### 步骤 2：安装 EAS CLI

```bash
npm install -g eas-cli
```

#### 步骤 3：登录 Expo

```bash
eas login
```

#### 步骤 4：配置 EAS 项目

```bash
eas build:configure
```

#### 步骤 5：创建 iOS 开发构建

**选项 A：云端构建（推荐）**

```bash
# 构建 iOS 开发版本
eas build --platform ios --profile development

# 构建 iOS 预览版本
eas build --platform ios --profile preview
```

**选项 B：本地构建（需要 Mac）**

```bash
# 安装依赖
npm install -g expo-dev-client

# 本地构建 iOS
eas build --platform ios --profile development --local
```

#### 步骤 6：安装到 iPhone

云端构建完成后，你会收到一个二维码或下载链接：

1. 用 iPhone 相机扫描二维码
2. 点击"安装"按钮
3. 在"设置" > "通用" > "VPN 与设备管理"中信任开发者证书

#### 步骤 7：运行应用

安装完成后，使用 Expo Go 扫描项目二维码，或直接打开应用。

---

### 方案二：使用 iOS 模拟器（仅限开发，无摄像头）

#### 前置要求
- macOS 电脑
- Xcode

#### 步骤

```bash
# 启动开发服务器
npm start

# 按 'i' 键在 iOS 模拟器中打开
```

**注意**：模拟器不支持摄像头、麦克风等硬件功能。

---

### 方案三：发布到 App Store（生产环境）

#### 步骤 1：准备应用图标和启动屏

确保 `assets/images/` 目录中有：
- `icon.png` (1024x1024)
- `adaptive-icon.png`
- `splash-icon.png`

#### 步骤 2：更新版本号

在 `app.config.ts` 中更新版本号：

```typescript
"version": "1.0.1",
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.yourcompany.qiuzhenjiaoan"
}
```

#### 步骤 3：构建生产版本

```bash
eas build --platform ios --profile production
```

#### 步骤 4：提交到 App Store

```bash
eas submit --platform ios --latest
```

---

## 常见问题

### 1. Expo Go 不支持的功能

在 Expo Go 中，以下功能可能受限或不可用：
- ✅ 完整支持：expo-image-picker（相册）、expo-file-system
- ⚠️ 部分支持：expo-av（播放）、expo-camera（部分限制）
- ❌ 不支持：expo-av（录音）、expo-media-library（保存到相册）

### 2. 权限问题

首次使用以下功能时，系统会请求权限：
- 相机：`expo-camera`、`expo-image-picker`
- 麦克风：`expo-av`（录音）、`expo-camera`（视频）
- 相册：`expo-media-library`、`expo-image-picker`
- 位置：`expo-location`

### 3. 构建失败

如果构建失败，检查：
- Xcode 版本是否 >= 15.0
- 是否已登录 Apple Developer 账号
- bundleIdentifier 是否正确配置
- 依赖是否已安装：`npm install`

### 4. 证书问题

使用免费 Apple 账号时：
- 应用每 7 天需要重新安装
- 不能用于发布到 App Store
- 仅限最多 3 台设备

---

## 测试清单

在 iPhone 上测试以下功能：

- [ ] 应用正常启动
- [ ] 创建教案功能
- [ ] 语音输入功能（需要麦克风权限）
- [ ] 拍照/选择图片功能（需要相机/相册权限）
- [ ] 预览教案功能
- [ ] 生成 PPT 功能
- [ ] 导出 PPT 功能
- [ ] 保存教育金句卡片（需要相册权限）

---

## 推荐流程

**开发阶段：**
1. 使用 Expo Go 测试基础功能
2. 创建 Development Build 测试原生功能
3. 在真机上完整测试

**测试阶段：**
1. 构建 Preview 分发给测试人员
2. 收集反馈并修复问题

**发布阶段：**
1. 构建 Production 版本
2. 提交到 App Store 审核
3. 发布到 App Store

---

## 参考资源

- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [EAS Submit 文档](https://docs.expo.dev/submit/introduction/)
- [Expo Modules 文档](https://docs.expo.dev/versions/latest/introduction/)

---

## 快速开始命令

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录
eas login

# 配置项目
eas build:configure

# 构建 iOS 开发版本（云端）
eas build --platform ios --profile development

# 构建 iOS 预览版本（云端）
eas build --platform ios --profile preview

# 构建 iOS 生产版本（提交 App Store）
eas build --platform ios --profile production
```
