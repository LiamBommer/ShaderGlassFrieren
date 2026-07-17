# Glass Agency Hero

- [x] 检查空项目状态、参考页与 Shaders 文档能力
- [x] 初始化 Vite + plain JS 项目并安装 shaders 依赖
- [x] 实现 Glass Agency Hero 结构、Shader 堆栈与响应式样式
- [x] 构建验证并修正兼容性问题
- [x] 更新任务记录并交付运行方式
- [x] 新增右侧可独立滚动的实时参数面板
- [x] 新增单项恢复默认和面板级全部重置按钮
- [x] 新增 ChromaFlow 区域底图上传与 opacity 控制
- [x] 新增底图上传成功 Toast 提示
- [x] 修正底图与 ChromaFlow 的合成层关系及面板顺序
- [x] 新增 Default 与最多三个用户预设的保存、切换、删除和本地持久化
- [x] 将 FlutedGlass 折射步进细化到 0.01，并新增独立晕影可见度衰减系数
- [x] 为 Refraction 增加可直接输入的数值框、键盘 0.01 步进和越界回退
- [x] 将现有底图上传入口扩展为图片/视频共用入口，视频循环播放并沿用 cover 与 ChromaFlow Mask
- [x] 在媒体上传章节新增视频音量 0–100 调节和一键静音开关
- [x] 新增右侧参数面板展开/收起按钮，收起时显示右上角汉堡图标
- [x] 修复隐藏 VideoTexture 阻断最终渲染 pass 的问题，恢复无媒体时的完整 Shader 特效
- [x] 将 Preset1 设为首次进入默认配置，并绑定同目录 Frieren 背景视频
- [x] 修复默认媒体音量初始化为 20，并为浏览器有声自动播放拦截增加首次交互恢复
- [x] 将进入页面后的音频状态设为默认静音，并在点击静音按钮或调整音量时自动取消静音
- [x] 初始化 Git 项目并完成构建与仓库状态验证

## Review

已完成：

- 使用 `shaders@3.0.439` 的 plain JS `createShader()` API 接入单 canvas shader stack。
- 依次配置 `Swirl`、内置鼠标跟随的 `ChromaFlow`、`FlutedGlass` 与 `FilmGrain`。
- 实现白底全屏 hero、导航、CTA、headline、client list、断点和 staggered reveal 动画。
- 添加 `prefers-reduced-motion` 支持和 WebGPU 初始化失败时的白底降级。
- `npm run build` 已通过。
- 临时 Vite 服务已启动并成功返回页面入口；验证完成后已关闭。
- 新增 `Swirl`、`ChromaFlow`、`FlutedGlass`、`Main palette`、`FilmGrain` 五个可展开阅读的控制章节，共 24 个控件。
- 每个章节和每个控件均包含灰色影响说明；范围值、颜色值和下拉选项会实时更新 Shader 或 CSS 变量。
- `npm run build` 和 `node --check src/main.js` 均已通过。
- 每个控件现在会自动生成圆形箭头恢复按钮；面板标题旁的圆形箭头按钮会一次性恢复全部 Shader 和主色参数。
- 重置默认值直接读取控件初始值，不在 JS 中重复维护一份默认配置。
- 新增 `ImageTexture` 与 `VideoTexture` 互斥媒体图层，默认无 URL；图片或视频上传后使用 `objectFit: 'cover'` 铺满画面，并通过 ChromaFlow Alpha 只在 hover 区域显示。
- `ChromaFlow` 位于图片层之上，Bloom opacity 控件范围为 0–100，默认 20%；100 会完全遮住区域内底图，0 会完全显示区域内底图，非 hover 区域始终隐藏底图。
- 底图上传章节已移动到标题下的第一个章节。
- 图片文件被接受并提交至 Shader 后，页面顶部显示“底图上传成功”Toast，短暂停留后自动淡出。
- 预设区提供只读 `Default`，以及固定命名的 `Preset1`–`Preset3`；修改参数后可覆盖当前用户预设，或另存为新预设，支持删除，并写入浏览器 `localStorage`。
- `Default` 的参数修改只作为临时编辑态，不能覆盖内置默认值；当三个用户预设已占满时，继续另存会在顶部 Toast 提示“最多只支持保存三个预设”。
- `FlutedGlass.refraction` 的控制步进为 `0.01`；Shaders 当前 `ChromaFlow` API 没有原生 `dissipation` 属性，因此新增的是项目层独立可见度衰减包络，不修改原生 `dt`、鼠标速度、流动速度或注入量。
- Refraction 现在同时保留滑块和数值输入框；数值框使用 `min=0`、`max=8`、`step=0.01`，非法或越界输入会恢复到最近一次有效值。
- ChromaFlow 的实际密度衰减由库内部每帧 `liquidFadeRate = 1 - dt` 控制，当前版本没有将衰减时间作为可调 prop 暴露出来；`momentum` 影响流场平流速度，不是衰减速度。
- 独立衰减系数默认值为 0 以保持原始效果；项目层会在检测到鼠标停止移动后，将 ChromaFlow 的可见度和底图 Alpha Mask 乘以独立的指数衰减包络。
- 现有底图上传入口现在接受 `image/*,video/*`；视频使用 Shaders 原生 `VideoTexture`，设置 `loop: true`，并与图片共用 `cover` 缩放和 ChromaFlow Alpha Mask。
- `VideoTexture` 原生画面保持静音，由项目使用同一个 Blob URL 创建音频代理播放声音；音量和静音开关仅影响视频音频，不影响视频画面，且会纳入预设参数保存。
- 参数面板现在支持展开和收起；收起时右上角显示汉堡按钮，展开时同一位置显示收起按钮，并通过 `aria-expanded`、`aria-hidden` 和显式 `inert` 属性同步可访问性状态。
- 修复了空 `VideoTexture` 参与最终渲染导致画布白屏的问题：无媒体时将视频节点设为 `visible: false`，上传视频后再启用；内置 Swirl、ChromaFlow、FlutedGlass 和 FilmGrain 已通过浏览器实际画面验证恢复。
- 首次进入时自动创建并选中 `Preset1` starter preset，仅为该预设保存同目录 `Frieren.mov` 的本地媒体路径；已有 `Preset2`、`Preset3` 和其他参数值不会被覆盖。
- `Frieren.mov` 通过 `new URL('../Frieren.mov', import.meta.url)` 纳入 Vite 构建，生产构建会复制到 `dist/assets`，避免依赖外部媒体域名。
- 默认视频音量现在为 20，首次加载保持静音；用户取消静音后，初始化会尝试有声播放，若被浏览器策略拦截，则首次点击页面或按键时自动重试。
- 页面进入后的媒体状态现在默认为静音、音量保持 20；点击圆形静音按钮会切换为未静音，用户调整音量滑块时会自动取消静音。已有 Preset1 的旧静音值只迁移一次，不影响其他预设。
- 网页标签标题由 `index.html` 中的 `<title>` 设置为 `Glasshaus — A different light`。
- 已在项目目录初始化 Git 仓库，默认分支为 `main`；添加 `.gitignore` 忽略 `node_modules`、`dist` 和日志，未自动创建首个 commit。
