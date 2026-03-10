# 部署方式对比

## 各平台部署方式对比

| 方式 | 平台 | 难度 | 成本 | 时间 | 优势 | 劣势 |
|------|------|------|------|------|------|------|
| **Vercel** | Web | ⭐ 简单 | 免费 | 5分钟 | 自动部署、全球CDN、自定义域名 | 构建时间限制 |
| **Netlify** | Web | ⭐ 简单 | 免费 | 5分钟 | 功能丰富、表单处理、函数支持 | 免费构建次数少 |
| **自建服务器** | Web | ⭐⭐⭐ 中等 | ¥50-200/月 | 30分钟 | 完全控制、可定制 | 需要维护 |
| **Docker** | Web + API | ⭐⭐ 中等 | 服务器费用 | 15分钟 | 一键部署、环境隔离 | 需要 Docker 知识 |
| **Expo Go** | iOS/Android | ⭐ 简单 | 免费 | 1分钟 | 快速测试 | 功能受限 |
| **EAS Build** | iOS/Android | ⭐⭐ 中等 | 免费/付费 | 15-30分钟 | 功能完整、自动更新 | 需要构建时间 |

---

## 功能对比

### Web 端 vs 移动端

| 功能 | Web 端 | iOS | Android | 说明 |
|------|--------|-----|---------|------|
| **核心功能** |
| 创建教案 | ✅ | ✅ | ✅ | 完全支持 |
| AI 生成 | ✅ | ✅ | ✅ | 完全支持 |
| 预览教案 | ✅ | ✅ | ✅ | 完全支持 |
| **输入方式** |
| 文本输入 | ✅ | ✅ | ✅ | 完全支持 |
| 语音输入 | ✅ | ✅ | ✅ | Web 用麦克风 API |
| **媒体功能** |
| 选择图片 | ✅ | ✅ | ✅ | Web 用 File API |
| 拍照 | ❌ | ✅ | ✅ | Web 不支持相机 |
| 保存到相册 | ⚠️ 下载 | ✅ | ✅ | Web 改为下载 |
| **导出功能** |
| 导出 PPT | ✅ | ✅ | ✅ | Web 自动下载 |
| 分享 | ⚠️ 浏览器分享 | ✅ | ✅ | Web 用分享菜单 |
| **其他** |
| 离线使用 | ❌ | ✅ | ✅ | Web 需要网络 |
| 推送通知 | ❌ | ✅ | ✅ | Web 不支持 |

---

## 推荐方案

### 个人项目/原型验证

**推荐**: Vercel (Web) + Expo Go (移动)

**原因**:
- 零成本
- 快速部署
- 功能够用

**步骤**:
1. Web 部署到 Vercel（5分钟）
2. 移动端用 Expo Go 测试（1分钟）

### 小型团队项目

**推荐**: Netlify (Web) + EAS Build (移动)

**原因**:
- 免费额度大
- 功能丰富
- 支持团队协作

**步骤**:
1. Web 部署到 Netlify
2. iOS 构建 EAS Development Build
3. Android 构建 EAS Preview Build

### 企业级应用

**推荐**: 自建服务器 + Docker + EAS Production Build

**原因**:
- 完全控制
- 可定制化
- 数据安全

**步骤**:
1. 使用 Docker 部署前后端
2. iOS 构建 Production 版本并提交 App Store
3. Android 构建 Production 版本并提交 Google Play

---

## 成本对比

### 免费方案（全年成本：¥0）

| 组件 | 平台 | 免费额度 | 限制 |
|------|------|----------|------|
| Web 前端 | Vercel | 100GB/月 | 3个项目/团队 |
| 后端 API | Vercel/Render | 免费实例 | 休眠后启动慢 |
| 数据库 | Supabase | 500MB | 限制连接数 |
| iOS 构建 | EAS | 免费 | 7天有效期，最多3台设备 |
| Android 构建 | EAS | 免费 | 需要签名配置 |
| 域名 | - | - | 使用 .vercel.app 免费域名 |

### 付费方案（全年成本：¥99-500）

| 组件 | 平台 | 价格 | 说明 |
|------|------|------|------|
| Apple Developer | Apple | $99/年 | 发布到 App Store |
| 服务器 | 阿里云/腾讯云 | ¥50-200/月 | 自建后端和 Web |
| 域名 | 阿里云/腾讯云 | ¥50-100/年 | 自定义域名 |
| CDN | 阿里云/腾讯云 | ¥20-50/月 | 加速访问 |

---

## 快速决策树

```
需要什么？
├─ 只想快速测试
│  └─ Web: Vercel (5分钟)
│     Mobile: Expo Go (1分钟)
│
├─ 需要完整功能
│  └─ Web: Vercel/Netlify
│     iOS: EAS Development Build
│     Android: EAS Preview Build
│
├─ 需要发布到应用商店
│  └─ Web: 自建服务器
│     iOS: EAS Production + Apple Developer ($99/年)
│     Android: EAS Production
│
└─ 企业级应用
   └─ Web: Docker + 自建服务器
      iOS: EAS Production + Apple Developer
      Android: EAS Production
      后端: Docker + 自建服务器
      数据库: 自建/云数据库
```

---

## 常见问题

### Q1: 能同时部署到多个平台吗？

**A**: 可以！推荐组合：
- **开发阶段**: Web (Vercel) + iOS (Expo Go) + Android (Expo Go)
- **测试阶段**: Web (Vercel) + iOS (EAS Dev) + Android (EAS Preview)
- **生产阶段**: Web (自建) + iOS (App Store) + Android (Google Play)

### Q2: 不同平台需要维护不同代码吗？

**A**: 不需要！代码库是统一的，只是构建输出不同：
- Web: 构建为静态 HTML/CSS/JS
- iOS: 构建为 .ipa 文件
- Android: 构建为 .apk 文件

### Q3: 数据会同步吗？

**A**: 是的！所有平台共享同一个后端 API 和数据库，数据实时同步。

### Q4: Web 端能使用所有功能吗？

**A**: 几乎所有功能都能使用，少数功能有替代方案：
- 拍照 → 改为选择图片
- 保存相册 → 改为下载到本地
- 推送通知 → 改为浏览器通知

### Q5: 哪个平台应该优先部署？

**A**: 推荐优先级：
1. **Web 端** (5分钟) - 快速验证功能
2. **iOS Development Build** (15分钟) - 完整功能测试
3. **Android Preview Build** (15分钟) - 兼容性测试

---

## 部署检查清单

### Web 部署前检查
- [ ] 环境变量 `EXPO_PUBLIC_BACKEND_BASE_URL` 已配置
- [ ] 后端 API 已部署并可访问
- [ ] 代码已推送到 Git 仓库
- [ ] 构建脚本 `npm run build:web` 可正常运行

### iOS 部署前检查
- [ ] `app.config.ts` 中 bundleIdentifier 已配置
- [ ] EAS CLI 已安装和登录
- [ ] Apple Developer 账号已注册
- [ ] 测试设备已添加到开发者账号

### Android 部署前检查
- [ ] `app.config.ts` 中 package 已配置
- [ ] EAS CLI 已安装和登录
- [ ] Android 签名配置已完成
- [ ] 测试设备已准备

---

## 下一步

1. **选择部署平台**: 根据上面的决策树选择最适合你的方案
2. **阅读详细文档**: 查看对应平台的详细部署指南
3. **开始部署**: 按照指南逐步操作
4. **测试验证**: 在目标平台上测试所有功能
5. **发布推广**: 分享给你的用户使用

祝你部署顺利！🚀
