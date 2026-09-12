# 图片加水印 · Node.js 24

基于 [dxcweb/watermark](https://github.com/dxcweb/watermark) 的纯前端 Canvas 水印工具。为证件或其他图片添加用途说明，所有图片处理都在浏览器本地完成。

本项目已将旧 roadhog / webpack / dva 构建链迁移为 **Vite 8 + React 19**，支持 **Node.js 24.x、npm 11+**，不需要降级 Node，也不需要 `--openssl-legacy-provider` 或 `--legacy-peer-deps`。

## 启动

先安装 Node.js 24，重新打开终端，并检查版本：

```sh
node --version
npm --version
```

应分别为 `v24.x.x` 和 `11.x` 或更高的 npm 版本。安装依赖后启动：

```sh
npm ci
npm start
```

浏览器打开 **http://127.0.0.1:8000/**。`npm run dev` 与 `npm start` 等价。开发服务器默认只监听本机；端口已占用时会直接报错，也可运行 `npm start -- --port 8001`。

### 从旧版本切换

迁移已合并到 `master`。先保存本地修改，再更新主分支。仓库已提交新 `package-lock.json`，请保留它。`npm ci` 会清理现有 `node_modules` 并按锁文件安装，不要继续使用旧的 `yarn.lock` 或从旧目录复制依赖。

```sh
git fetch origin
git switch master
git pull --ff-only origin master
npm ci
npm start
```

Windows 的 PowerShell 如限制 `npm.ps1`，使用 `npm.cmd ci`、`npm.cmd start`，不必修改系统执行策略。也可以直接使用 CMD。

## 构建与预览

```sh
npm run build
npm run preview
```

构建产物位于 `dist/`，预览地址为 **http://127.0.0.1:4173/**。`dist/` 可以部署到普通静态 Web 服务器，构建后的应用运行时不需要 Node.js。`vite preview` 用于本地验证，不作为生产服务。

资源路径使用 `base: './'`，支持部署在子目录中。请通过 HTTP(S) 访问，不要直接双击 `dist/index.html`。

## GitHub Pages 部署

仓库已包含 `.github/workflows/pages.yml`。该工作流在推送到 `master` 时触发，也支持手动运行；使用 Node.js 24 安装锁定依赖，执行单元测试、生产构建、Chromium 浏览器测试和依赖审计，再发布测试过的 `dist/` 产物。

首次启用需要仓库管理员完成以下设置：

1. 打开 [Settings → Pages](https://github.com/AngKernel/watermark/settings/pages)，将 **Build and deployment → Source** 设为 **GitHub Actions**，不是 Deploy from a branch。
2. 打开 [Actions → Deploy to GitHub Pages](https://github.com/AngKernel/watermark/actions/workflows/pages.yml)，点击 **Run workflow**，选择 **master** 并运行。
3. 确认 **Publish GitHub Pages** 成功后，通过部署结果中的地址访问网站。

未启用 Pages 时，工作流只完成构建和验证，并在 Summary 中提示启用方法；发布任务会显示 **Skipped**，不代表站点已经上线。完成设置后重新运行工作流即可。正常使用不需要额外配置个人访问令牌或仓库 Secret。

未配置自定义域名时，本仓库发布成功后的默认地址为 **https://angkernel.github.io/watermark/**。请保留末尾的 `/`。现有 `base: './'` 使生成的脚本、样式和图片使用相对资源路径，不影响本地启动，也适用于 `/watermark/` 子目录。

GitHub Pages 只托管页面和静态资源，不提供图片上传接口；水印处理仍在访问者的浏览器中完成。后续推送到 `master` 后，通过上述测试的构建会自动发布。

## 功能与边界

- 选择本地 PNG、JPEG、WebP、GIF、BMP 图片；默认保留原项目示例图片。
- 修改水印文案、颜色、不透明度、字体大小、水印框宽高，实时预览。
- 每次顺时针旋转 90 度，导出 `watermark.jpg`。
- 沿用原项目的宽度上限：加载时超过 2000 像素则等比例缩小，不放大小图；旋转后宽高交换。
- JPEG 不支持透明背景，透明区域导出为白色；动图只处理一帧，不保留动画。
- 数值输入会按有效范围处理；无效或损坏的图片会显示错误，不覆盖此前已成功加载的预览。

颜色控件改为浏览器原生选择器，不再依赖旧 `react-color`。保留原作者署名及捐助图片，放在可展开的“支持原作者”区域。

## 隐私

不上传所选图片，不在浏览器存储中保存图片；本页面不再加载原版的百度统计和 QQ 分享脚本，也没有外部字体或 CDN 脚本。选择文件使用临时 `blob:` URL，读取和下载后释放。安装 npm 依赖需要联网，但不是图片上传。

水印只是用途提示，不代表图片无法被修改；分享前仍应检查实际需要提供的信息范围。

## 测试

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Linux 缺少浏览器系统依赖时使用 `npx playwright install --with-deps chromium`。浏览器准备好后，`npm run check` 可顺序运行单元测试、生产构建和浏览器测试。

GitHub Actions 使用 Node.js 24，在 Windows 和 Ubuntu 上执行 `npm ci`、单元测试、生产构建、Chromium 端到端测试及依赖审计。浏览器测试覆盖示例加载、本地选择、实时编辑、四次旋转、JPEG 下载、损坏图片、缩放与移动端布局，同时检查处理过程中没有外部网络请求。

## 迁移说明

移除 roadhog、dva、旧 Babel / ESLint / Husky 配置及未使用的脚手架代码，避免旧开发服务器依赖内部 `http_parser` 引发启动异常。React 使用 `createRoot`，入口改为根目录 `index.html` 与 `src/index.jsx`；Canvas 导出改用标准 `toBlob()` 与下载链接。

依赖版本由 `package-lock.json` 固定。升级依赖后应重新运行测试和 `npm audit`；某次审计通过并不表示未来不会发现新漏洞。

## 原项目与致谢

原作者：**dxcweb**。原项目地址：https://github.com/dxcweb/watermark 。

原项目说明中感谢 Tencent EdgeOne 提供 CDN 加速及安全防护；此处保留致谢，不表示本地运行或本 fork 已配置该服务。
