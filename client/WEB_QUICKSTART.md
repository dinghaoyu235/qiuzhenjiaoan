# 网页版快速部署

## 5分钟部署到 Vercel

### 1. 准备工作
确保代码已推送到 GitHub 仓库。

### 2. 连接 Vercel
1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 选择你的 GitHub 仓库

### 3. 配置
```
Framework: Expo
Build Command: npm run build:web
Output Directory: dist
Install Command: pnpm install
```

### 4. 设置环境变量
在环境变量中添加：
```
EXPO_PUBLIC_BACKEND_BASE_URL=https://你的后端域名
```

### 5. 部署
点击 "Deploy" 按钮，等待 2-3 分钟即可完成。

### 6. 完成
你将获得一个 `https://你的项目名.vercel.app` 的网址！

---

## 本地运行 Web 版

```bash
cd client
npm run start:web
```

访问 http://localhost:8081

---

## 功能说明

✅ **完全支持的功能**:
- 创建教案
- AI 生成教案
- 语音输入（浏览器麦克风）
- 选择图片（文件选择）
- 预览教案
- 生成 PPT
- 导出 PPT（自动下载）

⚠️ **有限制**:
- 拍照（Web 不支持，但可以选图片）
- 分享（使用浏览器分享菜单）

❌ **不支持**:
- 保存到相册（改为下载到本地）
- 推送通知（Web 不支持）

---

## 常见问题

### Q: 部署后无法访问？
A: 检查环境变量 `EXPO_PUBLIC_BACKEND_BASE_URL` 是否正确设置。

### Q: 语音输入不工作？
A: 确保使用 HTTPS 协议，浏览器要求安全上下文才能访问麦克风。

### Q: 文件下载失败？
A: 检查后端 CORS 配置，确保允许跨域请求。

---

## 更新部署

每次推送到主分支，Vercel 会自动重新部署。无需手动操作！

详细文档请参考 [WEB_DEPLOYMENT.md](./WEB_DEPLOYMENT.md)
