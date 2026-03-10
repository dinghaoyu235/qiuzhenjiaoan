# 网页端部署指南

## 概述

本项目基于 Expo 54 + React Native，原生支持 Web 端。通过简单的配置，就可以将应用部署为网页版本，用户可以在浏览器中访问和使用。

## 功能对比

| 功能 | 移动端 | Web 端 | 说明 |
|------|--------|--------|------|
| 基础 UI | ✅ | ✅ | 完全兼容 |
| 网络请求 | ✅ | ✅ | 完全兼容 |
| 创建教案 | ✅ | ✅ | 完全兼容 |
| AI 生成 | ✅ | ✅ | 完全兼容 |
| 语音输入 | ✅ | ✅ | 使用 Web Audio API |
| 选择图片 | ✅ | ✅ | 使用 File API |
| 拍照 | ✅ | ❌ | Web 不支持直接拍照 |
| 保存到相册 | ✅ | ✅ | 触发浏览器下载 |
| PPT 预览 | ✅ | ✅ | 完全兼容 |
| PPT 导出 | ✅ | ✅ | 触发浏览器下载 |
| 分享功能 | ✅ | ⚠️ | 使用 Web Share API（部分支持） |

## 本地开发

### 启动 Web 开发服务器

```bash
cd client
npm run start:web
```

访问 http://localhost:8081

### 构建 Web 静态文件

```bash
cd client
npm run build:web
```

构建完成后，静态文件会输出到 `dist` 目录。

---

## 部署方式

### 方式一：Vercel 部署（推荐）

#### 前置要求
- Vercel 账号（免费）
- GitHub 仓库

#### 步骤

1. **连接 GitHub 仓库**
   - 登录 [Vercel](https://vercel.com)
   - 点击 "Add New Project"
   - 选择你的 GitHub 仓库

2. **配置项目**
   ```
   Framework Preset: Expo
   Build Command: npm run build:web
   Output Directory: dist
   Install Command: pnpm install
   ```

3. **环境变量**
   在项目设置中添加：
   ```
   EXPO_PUBLIC_BACKEND_BASE_URL=https://your-backend-domain.com
   ```

4. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成（约 2-3 分钟）
   - 获得一个 `.vercel.app` 域名

5. **自定义域名**（可选）
   - 在项目设置中添加自定义域名
   - 配置 DNS 记录

#### 自动部署
- 每次推送到主分支，Vercel 会自动重新构建和部署

---

### 方式二：Netlify 部署

#### 前置要求
- Netlify 账号（免费）
- GitHub 仓库

#### 步骤

1. **连接 GitHub 仓库**
   - 登录 [Netlify](https://netlify.com)
   - 点击 "New site from Git"
   - 选择你的 GitHub 仓库

2. **配置构建设置**
   ```
   Build command: pnpm run build:web
   Publish directory: dist
   Node version: 20
   ```

3. **环境变量**
   在 Site settings > Environment variables 中添加：
   ```
   EXPO_PUBLIC_BACKEND_BASE_URL=https://your-backend-domain.com
   ```

4. **部署**
   - 点击 "Deploy site"
   - 等待构建完成

---

### 方式三：传统 Web 服务器部署

#### 前置要求
- 任意 Web 服务器（Nginx、Apache、Caddy 等）
- 服务器访问权限

#### 步骤

1. **构建静态文件**
   ```bash
   cd client
   npm run build:web
   ```

2. **上传到服务器**
   ```bash
   # 使用 scp 上传
   scp -r dist/* user@server:/var/www/html/
   
   # 或使用 rsync
   rsync -avz dist/ user@server:/var/www/html/
   ```

3. **配置 Nginx**（示例）
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /var/www/html;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # 代理后端 API
       location /api/ {
           proxy_pass https://your-backend-domain.com/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. **重启 Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

---

### 方式四：Docker 部署

#### 创建 Dockerfile

项目已包含 `Dockerfile`，直接使用即可。

#### 构建和运行

```bash
# 构建 Docker 镜像
docker build -t qiuzhenjiaoan-web .

# 运行容器
docker run -p 80:80 qiuzhenjiaoan-web
```

#### 使用 Docker Compose

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:80"
    environment:
      - EXPO_PUBLIC_BACKEND_BASE_URL=https://your-backend-domain.com
```

---

## Web 端特殊功能实现

### 1. 文件下载

Web 端使用浏览器原生下载功能：

```typescript
import { downloadFileWeb } from '@/utils/webCompatibility';

// 下载 PPT 文件
await downloadFileWeb(pptUrl, 'presentation.pptx');
```

### 2. 图片上传

Web 端使用 File API：

```typescript
import { uploadImageWeb } from '@/utils/webCompatibility';

// 选择并上传图片
const base64 = await pickImageWeb();
```

### 3. 音频录制

Web 端使用 MediaRecorder API：

```typescript
import { WebAudioRecorder } from '@/utils/webCompatibility';

const recorder = new WebAudioRecorder();

// 开始录制
await recorder.startRecording();

// 停止录制
const audioBase64 = await recorder.stopRecording();
```

---

## 环境变量配置

### 必需的环境变量

```bash
# 后端 API 地址（必需）
EXPO_PUBLIC_BACKEND_BASE_URL=https://your-backend-domain.com
```

### 可选的环境变量

```bash
# 其他配置
NODE_ENV=production
```

---

## 性能优化

### 1. 启用 CDN

在 Vercel 或 Netlify 中启用 CDN 自动加速。

### 2. 图片优化

使用 Expo Image 组件的自动优化功能：

```typescript
import { Image } from 'expo-image';

<Image 
  source={{ uri: imageUrl }} 
  style={styles.image}
  contentFit="cover"
/>
```

### 3. 代码分割

使用动态导入减少初始加载时间：

```typescript
const LazyComponent = React.lazy(() => import('@/components/HeavyComponent'));
```

---

## SEO 优化

### 配置 meta 标签

在 `app/_layout.tsx` 中添加：

```typescript
<Stack.Screen 
  options={{
    title: '求真教案',
    headerShown: false,
  }}
/>
```

### 生成 sitemap

创建 `public/sitemap.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-domain.com/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

---

## 浏览器兼容性

### 支持的浏览器

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Polyfill

如果需要支持旧浏览器，可以添加 polyfill：

```bash
npm install core-js
```

在 `app/_layout.tsx` 中导入：

```typescript
import 'core-js/stable';
```

---

## 监控和日志

### Vercel Analytics

```bash
npm install @vercel/analytics
```

在 `app/_layout.tsx` 中添加：

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout() {
  return (
    <>
      {/* 你的应用 */}
      <Analytics />
    </>
  );
}
```

---

## 常见问题

### Q1: Web 端无法录音？

**解决方案**: 确保使用 HTTPS 协议，浏览器只允许在安全上下文中访问麦克风。

### Q2: 文件下载失败？

**解决方案**: 
- 检查 CORS 配置
- 确保后端返回正确的 Content-Type
- 使用 `downloadFileWeb` 工具函数

### Q3: 路由刷新 404？

**解决方案**: 配置服务器使用 SPA 路由模式（如 Nginx 的 `try_files`）。

### Q4: 图片加载慢？

**解决方案**:
- 使用 CDN
- 启用图片压缩
- 使用 WebP 格式

### Q5: 构建失败？

**解决方案**:
- 检查 Node 版本（需要 Node 20）
- 清除缓存：`rm -rf dist node_modules`
- 重新安装依赖：`pnpm install`

---

## 成本估算

### Vercel 免费额度

- **带宽**: 100 GB/月
- **构建次数**: 6,000 分钟/月
- **团队**: 无限制
- **项目**: 无限制

### Netlify 免费额度

- **带宽**: 100 GB/月
- **构建次数**: 300 分钟/月
- **团队**: 无限制
- **项目**: 无限制

### 自建服务器

- **服务器**: 约 ¥50-200/月
- **域名**: 约 ¥50-100/年
- **SSL 证书**: 免费（Let's Encrypt）

---

## 推荐方案

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 个人项目 | Vercel | 免费额度大，部署简单 |
| 团队项目 | Netlify | 功能丰富，支持团队协作 |
| 企业项目 | 自建服务器 | 完全控制，可定制 |
| 高流量项目 | CDN + 自建 | 性能最优，成本可控 |

---

## 快速开始

```bash
# 1. 本地测试
cd client
npm run start:web

# 2. 构建
npm run build:web

# 3. 部署到 Vercel
# - 推送到 GitHub
# - 连接到 Vercel
# - 点击 Deploy

# 完成！访问你的域名
```

---

## 参考资源

- [Expo Web 文档](https://docs.expo.dev/versions/latest/workflow/web/)
- [React Native Web 文档](https://necolas.github.io/react-native-web/)
- [Vercel 文档](https://vercel.com/docs)
- [Netlify 文档](https://docs.netlify.com/)
