# Glasshaus - Frieren

这是一个基于 **Shader Glass Effect** 制作的交互式 Demo 页面。页面使用 WebGPU Shader 构建玻璃质感视觉效果，并开放了大量 Glass 材质参数，方便实时调整和观察效果。

## Demo 特点

- 使用 `Swirl`、`ChromaFlow`、`FlutedGlass` 和 `FilmGrain` 组合出流动玻璃效果。
- ChromaFlow 光晕会跟随鼠标移动，并通过动量产生拖尾效果。
- 右侧悬浮参数面板支持展开、收起和独立滚动。
- 开放玻璃角度、频率、折射、色散、高光、柔和度、速度等参数。
- 支持上传背景图片或视频，图片和视频会按 `cover` 比例铺满页面。
- 上传视频后支持循环播放、音量调节和一键静音。
- 支持调整 ChromaFlow 晕影透明度，让底图在光晕区域显示。
- 支持参数恢复默认、全部重置和最多 3 个自定义预设。
- 预设和参数会保存在浏览器 `localStorage` 中。

## 技术栈

- Vite
- Plain JavaScript
- Shaders WebGPU
- WebGPU Shader Effects
- CSS Custom Properties

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址即可查看效果。

## 构建生产版本

```bash
npm run build
npm run preview
```

## 提交到 GitHub

本项目已经初始化 Git 仓库，当前分支为 `main`。在 GitHub 创建一个空仓库后，在项目目录执行：

```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

如果已经配置过 `origin`，可以先查看：

```bash
git remote -v
```

## 媒体文件说明

当前项目包含本地视频素材，其中 `Frieren.mov` 大于 GitHub 普通仓库允许的单文件 100MB 限制。推送前建议使用 Git LFS：

```bash
git lfs install
git lfs track "*.mov" "*.mp4"
git add .gitattributes
git lfs migrate import --include="*.mov,*.mp4"
git push -u origin main --force
```

`git lfs migrate import` 会重写本地提交历史；由于当前仓库尚未推送到远程仓库，适合在首次推送前执行。

## 目录结构

```text
├── index.html          # 页面结构和 Shader 控制面板
├── src/
│   ├── main.js         # Shader 初始化、交互和预设逻辑
│   └── style.css       # 页面和控制面板样式
├── Frieren.mov         # 默认背景视频
├── package.json        # 项目依赖和脚本
└── tasks/              # 开发记录和经验记录
```

