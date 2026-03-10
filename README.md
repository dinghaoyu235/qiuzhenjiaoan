# 求真教案 - AI 教案生成应用

一个基于 Expo 54 + React Native + Express 的智能教案生成应用，支持移动端（iOS/Android）和 Web 端。

## 快速开始

### 本地开发

```bash
# 安装依赖
pnpm i

# 启动前后端服务
coze dev
```

访问 http://localhost:5000

---

## 部署选项

### 🌐 网页端（推荐，5分钟部署）

使用 Vercel 或 Netlify 免费部署到云端：

```bash
# 1. 推送到 GitHub
git push

# 2. 连接到 Vercel (https://vercel.com)
# 3. 点击 Deploy 即可
```

**查看详情**:
- [网页版快速部署](./client/WEB_QUICKSTART.md) - 5分钟指南
- [网页版完整文档](./client/WEB_DEPLOYMENT.md) - 详细部署指南

### 📱 移动端

#### iOS
```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录并构建
eas login
eas build --platform ios --profile development
```

**查看详情**: [iOS 部署指南](./client/IOS_QUICKSTART.md)

#### Android
```bash
# 构建开发版本
eas build --platform android --profile development
```

### 🐳 Docker 部署

```bash
# 一键启动前后端
docker-compose up -d
```

---

## 目录结构规范（严格遵循）

当前仓库是一个 monorepo（基于 pnpm 的 workspace）

- Expo 代码在 client 目录，Express.js 代码在 server 目录
- 本模板默认无 Tab Bar，可按需改造

目录结构说明

├── server/                     # 服务端代码根目录 (Express.js)
|   ├── src/
│   │   └── index.ts            # Express 入口文件
|   └── package.json            # 服务端 package.json
├── client/                     # React Native 前端代码
│   ├── app/                    # Expo Router 路由目录（仅路由配置）
│   │   ├── _layout.tsx         # 根布局文件（必需，务必阅读）
│   │   ├── home.tsx            # 首页
│   │   └── index.tsx           # re-export home.tsx
│   ├── screens/                # 页面实现目录（与 app/ 路由对应）
│   │   └── demo/               # demo 示例页面
│   │       ├── index.tsx       # 页面组件实现
│   │       └── styles.ts       # 页面样式
│   ├── components/             # 可复用组件
│   │   └── Screen.tsx          # 页面容器组件（必用）
│   ├── hooks/                  # 自定义 Hooks
│   ├── contexts/               # React Context 代码
│   ├── constants/              # 常量定义（如主题配置）
│   ├── utils/                  # 工具函数
│   ├── assets/                 # 静态资源
|   └── package.json            # Expo 应用 package.json
├── package.json
├── .cozeproj                   # 预置脚手架脚本（禁止修改）
└── .coze                       # 配置文件（禁止修改）

## 安装依赖

### 命令

```bash
pnpm i
```

### 新增依赖约束

如果需要新增依赖，需在 client 和 server 各自的目录添加（原因：隔离前后端的依赖），禁止在根目录直接安装依赖

### 新增依赖标准流程

- 编辑 `client/package.json` 或 `server/package.json`
- 在根目录执行 `pnpm i`

## Expo 开发规范

### 路径别名

Expo 配置了 `@/` 路径别名指向 `client/` 目录：

```tsx
// 正确
import { Screen } from '@/components/Screen';

// 避免相对路径
import { Screen } from '../../../components/Screen';
```

## 本地开发

运行 coze dev 可以同时启动前端和后端服务，如果端口已占用，该命令会先杀掉占用端口的进程再启动，也可以用来重启前端和后端服务

```bash
coze dev
```

## iOS 部署指南

⚠️ **重要提示**: 由于应用使用了相机、麦克风、相册等原生功能，在 Expo Go 中可能无法完整使用所有功能。要在 iPhone 上正常使用，需要创建 Development Build。

### 快速开始

1. **安装 EAS CLI**

```bash
npm install -g eas-cli
```

2. **登录并配置**

```bash
eas login
eas build:configure
```

3. **构建并安装到 iPhone**

```bash
# 云端构建（推荐，无需 Mac）
eas build --platform ios --profile development
```

构建完成后，用 iPhone 扫描二维码安装应用，然后在「设置」→「通用」→「VPN 与设备管理」中信任证书。

### 详细文档

- [iOS 快速部署指南](./client/IOS_QUICKSTART.md) - 3步快速部署
- [iOS 完整部署文档](./client/IOS_DEPLOYMENT.md) - 详细的部署流程

### 功能对比

| 功能 | Expo Go | Development Build |
|------|---------|-------------------|
| 基础 UI | ✅ | ✅ |
| 相册选择 | ✅ | ✅ |
| 相机拍照 | ⚠️ 限制 | ✅ |
| 语音录音 | ❌ 不支持 | ✅ |
| 保存到相册 | ❌ 不支持 | ✅ |

**推荐**: 开发测试使用 Development Build，确保所有功能正常。

---

## 网页端部署指南

✅ **好消息**: 本项目原生支持 Web 端，可以直接在浏览器中访问和使用，无需额外开发！

### 快速部署到 Vercel（5分钟）

1. **推送到 GitHub**
   ```bash
   git add .
   git commit -m "feat: add web deployment"
   git push
   ```

2. **连接 Vercel**
   - 访问 [vercel.com](https://vercel.com) 并登录
   - 点击 "Add New Project"
   - 选择你的 GitHub 仓库

3. **配置**
   ```
   Framework: Expo
   Build Command: npm run build:web
   Output Directory: dist
   Install Command: pnpm install
   ```

4. **设置环境变量**
   ```
   EXPO_PUBLIC_BACKEND_BASE_URL=https://你的后端域名
   ```

5. **部署**
   点击 "Deploy" 按钮，等待 2-3 分钟即可完成！

### 本地运行 Web 版

```bash
cd client
npm run start:web
```

访问 http://localhost:8081

### Web 端功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 创建教案 | ✅ | 完全支持 |
| AI 生成 | ✅ | 完全支持 |
| 语音输入 | ✅ | 使用浏览器麦克风 |
| 选择图片 | ✅ | 使用文件选择 |
| 预览教案 | ✅ | 完全支持 |
| 生成 PPT | ✅ | 完全支持 |
| 导出 PPT | ✅ | 自动下载 |
| 拍照 | ❌ | Web 不支持（可替代为选图片） |
| 保存相册 | ✅ | 改为下载到本地 |

### 详细文档

- [网页版快速部署](./client/WEB_QUICKSTART.md) - 5分钟部署指南
- [网页版完整文档](./client/WEB_DEPLOYMENT.md) - 详细的部署和优化指南

### 其他部署平台

- **Netlify**: 参考 [WEB_DEPLOYMENT.md](./client/WEB_DEPLOYMENT.md)
- **自建服务器**: 支持 Nginx、Apache 等
- **Docker**: 支持容器化部署
