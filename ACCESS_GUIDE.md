# 🌐 求真教案 - 网页版访问说明

## 当前状态

应用已在开发环境中成功运行！

✅ **前端服务**: http://localhost:5000
✅ **后端 API**: http://localhost:9091
✅ **服务状态**: 正常运行

---

## 访问方式

### 方式一：本地访问（如果你在当前开发环境中）

直接在浏览器中打开：
```
http://localhost:5000
```

### 方式二：快速部署到公网（推荐）

由于当前环境是沙箱，无法直接公网访问。你可以通过以下步骤在 5 分钟内部署到公网：

#### 部署到 Vercel（完全免费）

**步骤 1：推送到 GitHub**
```bash
git add .
git commit -m "feat: deploy web version"
git push
```

**步骤 2：连接到 Vercel**
1. 访问 [vercel.com](https://vercel.com) 并登录（支持 GitHub 账号）
2. 点击 "Add New Project"
3. 选择你的 GitHub 仓库

**步骤 3：配置**
```
Framework Preset: Expo
Build Command: npm run build:web
Output Directory: dist
Install Command: pnpm install
```

**步骤 4：设置环境变量**
在 Environment Variables 中添加：
```
EXPO_PUBLIC_BACKEND_BASE_URL=https://你的后端域名
```

**步骤 5：部署**
点击 "Deploy" 按钮，等待 2-3 分钟即可完成！

完成后你会获得一个 `https://你的项目名.vercel.app` 的网址，可以分享给任何人访问。

---

## 如果需要在当前环境访问

如果你当前就在开发环境中，请执行：

```bash
# 确认服务运行状态
curl -I http://localhost:5000
curl -I http://localhost:9091/api/v1/health
```

然后在浏览器打开：http://localhost:5000

---

## 功能测试清单

部署后，可以测试以下功能：

- [ ] 创建教案
- [ ] AI 生成教案
- [ ] 语音输入（需要麦克风权限）
- [ ] 选择图片
- [ ] 预览教案
- [ ] 生成 PPT
- [ ] 导出 PPT（自动下载）

---

## 技术支持

遇到问题？查看详细文档：
- [快速部署指南](./client/WEB_QUICKSTART.md)
- [完整部署文档](./client/WEB_DEPLOYMENT.md)
- [部署对比](./DEPLOYMENT_COMPARISON.md)

---

## 下一步

1. **快速预览**: 如果你在当前环境中，直接访问 http://localhost:5000
2. **公网部署**: 按照 Vercel 部署步骤操作，5分钟即可获得公网访问链接
3. **分享链接**: 部署完成后，分享生成的 `.vercel.app` 链接给其他用户

---

## 成本说明

- ✅ **Vercel 免费额度**: 100GB/月 流量，足够个人和小团队使用
- ✅ **无需服务器**: Vercel 提供全球 CDN 加速
- ✅ **自动 HTTPS**: 自动配置 SSL 证书
- ✅ **自动部署**: 每次推送代码自动重新部署

**总成本**: ¥0/月（完全免费！）
