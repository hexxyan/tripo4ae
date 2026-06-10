# Tripo4AE

[中文教程](docs/tutorial-zh.md) | [English Tutorial](docs/tutorial-en.md) | [中文文档](#中文)

A first-party Adobe After Effects CEP extension integrating [Tripo AI](https://platform.tripo3d.ai/)'s full 3D generation pipeline — text/image-to-3D, animation, texturing, and seamless timeline interaction — without leaving After Effects.

**Built for AE 2024+ / 2025 / 2026** with full Advanced 3D (Mercury 3D Engine) support.

---

## Features

### 21 Tripo API Endpoints Covered

| Category | Endpoints |
|----------|-----------|
| **Generation** | `text_to_model`, `image_to_model`, `multiview_to_model`, `refine_model` |
| **Image Gen** | `generate_image`, `text_to_image`, `generate_multiview_image`, `edit_multiview_image` |
| **Texture** | `texture_model` (PBR, part-based, bake) |
| **Animation** | `animate_prerigcheck`, `animate_rig`, `animate_retarget` (100+ presets) |
| **Post-Process** | `convert_model` (FBX/OBJ/GLTF/USDZ/STL/3MF), `stylize_model` (7 styles) |
| **Mesh Edit** | `mesh_segmentation`, `mesh_completion`, `highpoly_to_lowpoly` |
| **Import** | `import_model` |

### 5 UI Tabs

| Tab | Function |
|-----|----------|
| **Generate** | Text / image / multiview → 3D model, with version/quality/seed parameters |
| **Refine & Texture** | Refine draft models, apply PBR textures with prompt/image/style |
| **Animation** | Tripo rig + retarget (100+ presets), plus AE keyframe/camera/loop expressions |
| **Transform** | Stylize, mesh edit (segment/complete/simplify), format conversion |
| **Library** | Model history, re-import, animation templates, external model import |

### AE 2026 Advanced 3D Integration

- **ThreeDModelLayer** detection (AE 24.4+) for script-level 3D model identification
- **Adobe Standard Material** — 12 PBR properties (metal, transmission, reflection, IOR, etc.) via match names, plus a new **Advanced PBR Material Options** slider panel to read and apply 10 core PBR properties.
- **Embedded Animation** — select and loop GLB/FBX embedded animations via Time Remap
- **Environment Light** — HDRI image-based lighting creation
- **8 Material Presets** — default, metallic, glass, plastic, rubber, ceramic, gold, clay
- **Automatic Advanced 3D renderer** activation on import

### Pipeline & Persistence

- **Pipeline Stepper** — visual step-by-step progress across all tabs
- **Zustand + localStorage** — state survives CEP panel reloads (docking/undocking)
- **Auto-resume** — incomplete generation tasks automatically resume after panel reload
- **Adaptive polling** — uses `running_left_time` with 5s max interval cap

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Tripo4AE Plugin                    │
├─────────────────────────┬────────────────────────────┤
│   CEP Panel (React)     │   ExtendScript (.jsx)      │
│   ────────────────      │   ────────────────         │
│   • API Key management  │   • Import 3D model        │
│   • Prompt / image      │   • Create 3D layer        │
│   • Generation progress │   • Keyframe animation     │
│   • Animation presets   │   • Camera / light setup   │
│   • Model library       │   • PBR material control   │
│   • Node.js HTTP/Tripo  │   • Environment light      │
│   • Zustand state mgmt  │   • Embedded animation     │
│   • State persistence   │   • Expression loops       │
├─────────────────────────┴────────────────────────────┤
│               CSInterface.js (bridge)                 │
└──────────────────────────────────────────────────────┘
         ↕ HTTP (REST API)               ↕ AE DOM
         Tripo API v2               After Effects
```

**Key rule**: All long-running work (HTTP, polling, file downloads) happens in the CEP/React/Node layer. ExtendScript only performs short AE DOM operations to avoid UI freezes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| CEP Panel | React 19 + TypeScript + Vite |
| State | Zustand with localStorage persist |
| ExtendScript | ES3 via Babel + Rollup, `types-for-adobe` |
| Build | Bolt CEP (`vite-cep-plugin`) |
| API | Tripo OpenAPI v2 (`https://api.tripo3d.ai/v2/openapi`) |
| Auth | Bearer API Key |

---

## Project Structure

```
tripo4ae/
├── src/
│   ├── client/                  # CEP Panel (React)
│   │   ├── components/
│   │   │   ├── GenerateTab/     # Tab 1: Text/image/multiview generation
│   │   │   ├── RefineTextureTab/# Tab 2: Refine + texture + PBR
│   │   │   ├── AnimationTab/    # Tab 3: Rig + retarget + AE animation
│   │   │   ├── TransformTab/    # Tab 4: Stylize + mesh edit + convert
│   │   │   ├── LibraryTab/      # Tab 5: Model library + templates
│   │   │   ├── PipelineStepper/ # Pipeline step indicator
│   │   │   └── common/          # Shared UI components
│   │   ├── hooks/
│   │   │   └── useCsInterface.ts    # CSInterface bridge hook
│   │   ├── services/
│   │   │   ├── httpClient.ts    # Tripo HTTP client with retry
│   │   │   ├── tripoApi.ts      # Core API calls + download/upload
│   │   │   └── taskPoller.ts    # Adaptive status polling
│   │   └── stores/
│   │       └── useStore.ts      # Zustand + localStorage persist
│   ├── jsx/                     # ExtendScript entry (compiled to JSX bundle)
│   │   ├── aeft/
│   │   │   └── aeft.ts          # All 12 host functions
│   │   └── index.ts             # JSX entry point + host registration
│   ├── host/                    # ExtendScript source modules (reference)
│   │   ├── importModel.ts
│   │   ├── animation.ts
│   │   ├── camera.ts
│   │   ├── lights.ts
│   │   ├── materials.ts
│   │   ├── environmentLight.ts
│   │   ├── expressions.ts
│   │   ├── e3d.ts
│   │   └── projectInfo.ts
│   └── shared/
│       ├── types.ts             # All TypeScript interfaces
│       └── constants.ts         # API versions, presets, enums
├── __tests__/                   # Jest test suites (6 suites, 73 tests)
├── CSXS/
│   └── manifest.xml             # CEP extension manifest
├── cep.config.ts                # Bolt CEP configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- **After Effects** 2024+ (tested on AE 2026)
- **Node.js** 18+
- **npm** 9+
- **Tripo API Key** — get one at [platform.tripo3d.ai](https://platform.tripo3d.ai/)

### Install

```bash
git clone <repo-url> tripo4ae
cd tripo4ae
npm install
```

### Development

```bash
# 1. Enable unsigned CEP extensions (macOS)
#    Adjust CSXS version number for your AE version:
#    AE 2024 → CSXS.11, AE 2025 → CSXS.11, AE 2026 → CSXS.12
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

# 2. Build & symlink to Adobe CEP extensions directory
npm run build
npm run symlink

# 3. (Re)start After Effects
#    Open panel: Window → Extensions → Tripo4AE
```

For hot-reload development:

```bash
npm run dev
# Panel loads from Vite dev server at localhost:3000
```

### Production Build

```bash
npm run build          # Build to dist/cep/
npm run zxp            # Package as .zxp for distribution
```

### Testing

```bash
npx jest --runInBand   # 6 suites, 73 tests
```

---

## Usage

### 1. Set API Key

Enter your Tripo API key in the header input. The key is persisted in localStorage across sessions.

### 2. Generate a 3D Model

- Select **Text**, **Image**, or **Multiview** input mode
- Enter a prompt or drag-drop images
- Adjust parameters (model version, face limit, PBR, quality, seeds)
- Click **Generate** and watch the progress bar

### 3. Import to After Effects

When generation completes, click **Import to AE** (the plugin automatically handles the import workflow according to your settings):

- **Native Advanced 3D Workflow**:
  - The model is downloaded to `~/Documents/Tripo4AE/Models/`
  - A 3D model layer is created in the active composition
  - Advanced 3D renderer is automatically activated
  - Time Remap is enabled for embedded animation access
  - If no comp is open, a new 1920×1080 comp is created automatically
- **Element 3D Workflow**:
  - The plugin automatically calls Tripo API's `convert_model` to convert the GLB to OBJ
  - Downloads the OBJ model to `~/Documents/VideoCopilot/Models/Tripo4AE/`
  - Creates a solid layer named `Tripo4AE_E3D` in the active composition
  - Applies Video Copilot Element 3D effect to the solid layer

### 4. Post-Process Pipeline

Use the pipeline stepper or individual tabs to:

- **Refine** → upgrade draft models to higher quality
- **Texture** → apply new PBR textures with text/image prompts
- **Rig & Animate** → check riggability, rig, then apply 100+ animation presets
- **Convert** → export to FBX/OBJ/USDZ/STL/3MF
- **Stylize** → lego, voxel, voronoi, minecraft, keyring, etc.

### 5. AE Animation

Apply built-in AE animations to imported models:

- **Camera presets**: Orbit, Push, Track, Jib
- **Model presets**: Fade-in, Scale Pop, Flip, Slide-in
- **Loop expressions**: Spin (X/Y/Z), Float, Breathe
- **Easing**: Linear, Ease In/Out, Bounce, Elastic
- **Material presets**: Metallic, Glass, Plastic, Rubber, Ceramic, Gold, Clay

---

## ExtendScript API Reference

All 12 host functions are registered as `host["tripo4ae"]` and available via `evalScript('tripo4ae.functionName(args)')`:

| Function | Signature | Description |
|----------|-----------|-------------|
| `getActiveCompInfo` | `() → JSON` | Returns active comp name, dimensions, frame rate, duration |
| `importModel` | `(path: string, config?: JSON) → JSON` | Import 3D model with Advanced 3D, auto-center, time remap |
| `applyAnimation` | `(config: JSON) → JSON` | Apply keyframe presets + loop expressions to selected layer |
| `selectEmbeddedAnimation` | `(config: JSON) → JSON` | Select/loop embedded GLB animations via Animation Options |
| `createCamera` | `(config: JSON) → JSON` | Create camera with orbit/push/track/jib preset |
| `createLights` | `(config?: JSON) → JSON` | Create three-point lighting setup |
| `setupE3D` | `(modelPath: string) → JSON` | Set up Element 3D layer (legacy, AE 2024 only) |
| `setMaterialProperties` | `(config: JSON) → JSON` | Set PBR material properties via match names |
| `getMaterialProperties` | `(layerIndex?: number) → JSON` | Read current material properties |
| `createEnvironmentLight` | `(config?: JSON) → JSON` | Create HDRI environment light with optional HDR file |
| `getExpression` | `(type: string, params?: JSON) → string` | Get AE expression string (spin/float/breathe) |

All functions return `JSON.stringify({ ok: true, data: {...} })` on success or `JSON.stringify({ ok: false, error: "..." })` on failure.

---

## Supported Model Versions

| Version | Label | Description |
|---------|-------|-------------|
| `v3.1-20260211` | v3.1 | Latest high-quality |
| `P1-20260311` | P1 | Low-poly optimized (limited params) |
| `Turbo-v1.0-20250506` | Turbo | Fast draft |
| `v3.0-20250812` | v3.0 | Stable v3 |
| `v2.5-20250123` | v2.5 | Legacy default |

**Note**: P1 version does not support `quad`, `geometry_quality`, `texture_quality`, or `style` parameters. These are automatically filtered when P1 is selected.

---

## Model Download Priority

When importing, the plugin selects the best available model URL:

```
pbr_model > model > base_model
```

Models are downloaded to `~/Documents/Tripo4AE/Models/` before importing to AE, since ExtendScript requires local file paths.

---

## Key Technical Decisions

1. **CEP over UXP** — AE 2026 does not support UXP panels. CEP is the path. React UI is reusable if UXP arrives.
2. **AE Native 3D primary** — AE 2024+ supports GLB import with Mercury 3D. E3D deferred (only supports AE 2024).
3. **Long ops in CEP, short ops in ExtendScript** — HTTP/polling/download in CEP async. ExtendScript only touches AE DOM for quick operations.
4. **GLB as primary format** — Single-file, embedded PBR + animations. Tripo outputs GLB by default.
5. **Runtime require() for Node.js** — CEP provides Node.js via `require()`. Using runtime require instead of static `import fs` avoids Vite externalization issues.
6. **Zustand + persist** — Lightweight, no provider, easy localStorage persistence for panel reload resilience.
7. **Bolt CEP** — Proven scaffolding with hot reload, JSX compilation, and ZXP packaging.

---

## References & Credits

### API & Services

- **[Tripo AI OpenAPI v2](https://platform.tripo3d.ai/)** — 3D generation API providing text-to-model, image-to-model, rigging, animation retargeting, texturing, and format conversion. 21 endpoints integrated.
- **[Tripo API Documentation](https://platform.tripo3d.ai/docs)** — Official API reference for request/response schemas, task types, and credit consumption.

### Adobe After Effects

- **[AE Scripting Guide](https://ae-scripting.docsforadobe.dev/)** — ExtendScript API reference for After Effects DOM (CompItem, Layer, Property, etc.). Source of all verified match names used in material, camera, and light control.
- **[AE Match Names](https://ae-scripting.docsforadobe.dev/matchnames/)** — Property match names for Camera Options (`ADBE Camera Options Group`), Light Options (`ADBE Light Options Group`), Material Options (`ADBE Material Options Group`), Plane Geometry, and Extrusion.
- **[ThreeDModelLayer (AE 24.4+)](https://ae-scripting.docsforadobe.dev/layers/threedmodellayer/)** — Subclass of AVLayer for imported 3D model files (GLB, GLTF, OBJ, FBX).
- **[ParametricMeshLayer (AE 26.3+ Beta)](https://ae-scripting.docsforadobe.dev/layers/parametricmeshlayer/)** — Procedural geometry primitives (Sphere, Plane, Cylinder, Cone, Torus, Cube).
- **[Adobe CEP (Common Extensibility Platform)](https://github.com/niclas-niclas/adobe-cep-starter)** — HTML5 + Node.js panel framework for Adobe host applications.
- **[CSInterface.js](https://github.com/AdobeDocs/CEP-Resources)** — Adobe's JavaScript bridge between CEP panels and ExtendScript host.

### Build Toolchain

- **[Bolt CEP (`vite-cep-plugin`)](https://github.com/niclas-niclas/bolt-cep)** — Vite-based build system for CEP extensions. Provides hot-reload, JSX (ExtendScript) compilation via Babel + Rollup, ZXP packaging, and symlink management.
- **[types-for-adobe](https://github.com/niclas-niclas/types-for-adobe)** — TypeScript type definitions for Adobe ExtendScript host objects (app, CompItem, Layer, Property, etc.).
- **[Vite](https://vitejs.dev/)** — Next-generation frontend build tool powering the CEP panel's React development server and production builds.
- **[Rollup](https://rollupjs.org/)** — Module bundler used for compiling ExtendScript (JSX) bundle targeting ES3/ES5.
- **[Babel](https://babeljs.io/)** — JavaScript transpiler that downlevels TypeScript/ES6+ ExtendScript code to ES3 compatible output.

### Frontend Stack

- **[React 19](https://react.dev/)** — UI library for the CEP panel. Functional components with hooks.
- **[Zustand](https://zustand.docs.pmnd.rs/)** — Lightweight state management with `persist` middleware for localStorage survival across panel reloads.
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe development for both CEP panel and shared types.

### Testing

- **[Jest](https://jestjs.io/)** — Test framework. 4 suites covering HTTP client, API service, task poller, and store.
- **[Testing Library](https://testing-library.com/)** — React component testing utilities.

### Third-Party Plugins (Referenced)

- **[Element 3D (Video Copilot)](https://www.videocopilot.net/products/element3d/)** — Commercial AE plugin for 3D model rendering (legacy, AE 2024 only). No public scripting API available — integration via solid layer + effect application.

---

## License

Private project. All rights reserved.

---

<a id="中文"></a>

# 中文

一个 Adobe After Effects CEP 扩展插件，集成 [Tripo AI](https://platform.tripo3d.ai/) 完整的 3D 生成管线——文本/图片转 3D、动画、纹理贴图、无缝时间线交互——全程无需离开 After Effects。

**针对 AE 2024+ / 2025 / 2026 构建**，完整支持 Advanced 3D（Mercury 3D 引擎）。

---

## 功能亮点

### 覆盖 21 个 Tripo API 端点

| 分类 | 端点 |
|------|------|
| **生成** | `text_to_model`、`image_to_model`、`multiview_to_model`、`refine_model` |
| **图片生成** | `generate_image`、`text_to_image`、`generate_multiview_image`、`edit_multiview_image` |
| **纹理** | `texture_model`（PBR、分部件、烘焙） |
| **动画** | `animate_prerigcheck`、`animate_rig`、`animate_retarget`（100+ 预设） |
| **后处理** | `convert_model`（FBX/OBJ/GLTF/USDZ/STL/3MF）、`stylize_model`（7 种风格） |
| **网格编辑** | `mesh_segmentation`、`mesh_completion`、`highpoly_to_lowpoly` |
| **导入** | `import_model` |

### 5 个功能标签页

| 标签页 | 功能 |
|--------|------|
| **生成** | 文本/图片/多视图 → 3D 模型，支持版本/面数/质量/种子参数 |
| **精修与纹理** | 精修草稿模型，通过文本/图片/风格图应用 PBR 纹理 |
| **动画** | Tripo 绑定 + 重定向（100+ 预设），以及 AE 关键帧/摄像机/循环表达式 |
| **变换** | 风格化、网格编辑（分割/补全/简化）、格式转换 |
| **模型库** | 模型历史、重新导入、动画模板、外部模型导入 |

### AE 2026 高级 3D 集成

- **ThreeDModelLayer 检测**（AE 24.4+）— 脚本级 3D 模型图层识别
- **Adobe Standard Material** — 12 项 PBR 属性（金属、透射、反射、IOR 等）通过 match name 控制，面板新增 **Advanced PBR Material Options** 调节滑块，支持读取并一键回写 10 项核心参数
- **嵌入动画** — 通过 Time Remap 选择并循环 GLB/FBX 中的嵌入动画
- **环境光** — 创建 HDRI 图像照明
- **8 种材质预设** — 默认、金属、玻璃、塑料、橡胶、陶瓷、黄金、陶土
- **自动激活 Advanced 3D 渲染器**

### 管线与持久化

- **管线步骤指示器** — 跨标签页的可视化步骤进度
- **Zustand + localStorage** — 面板重载（吸附/取消吸附）后状态不丢失
- **自动恢复** — 面板重载后自动继续未完成的生成任务
- **自适应轮询** — 根据 `running_left_time` 智能调整，最大间隔 5 秒

---

## 架构

```
┌──────────────────────────────────────────────────────┐
│                    Tripo4AE 插件                      │
├─────────────────────────┬────────────────────────────┤
│   CEP 面板 (React)      │   ExtendScript (.jsx)      │
│   ────────────────      │   ────────────────         │
│   • API Key 管理        │   • 导入 3D 模型           │
│   • 提示词/图片输入     │   • 创建 3D 图层           │
│   • 生成进度显示        │   • 关键帧动画             │
│   • 动画预设选择        │   • 摄像机/灯光设置        │
│   • 模型库管理          │   • PBR 材质控制           │
│   • Node.js HTTP/Tripo  │   • 环境光                 │
│   • Zustand 状态管理    │   • 嵌入动画控制           │
│   • 状态持久化          │   • 表达式循环             │
├─────────────────────────┴────────────────────────────┤
│               CSInterface.js（桥接层）                │
└──────────────────────────────────────────────────────┘
         ↕ HTTP (REST API)               ↕ AE DOM
         Tripo API v2               After Effects
```

**核心原则**：所有耗时操作（HTTP、轮询、文件下载）在 CEP/React/Node 异步层执行。ExtendScript 只进行简短的 AE DOM 操作，避免 UI 冻结。

---

## 技术栈

| 层 | 技术 |
|---|------|
| CEP 面板 | React 19 + TypeScript + Vite |
| 状态管理 | Zustand + localStorage 持久化 |
| ExtendScript | ES3 经 Babel + Rollup 编译，`types-for-adobe` |
| 构建 | Bolt CEP (`vite-cep-plugin`) |
| API | Tripo OpenAPI v2 (`https://api.tripo3d.ai/v2/openapi`) |
| 认证 | Bearer API Key |

---

## 快速开始

### 前置条件

- **After Effects** 2024+（在 AE 2026 上测试）
- **Node.js** 18+
- **npm** 9+
- **Tripo API Key** — 在 [platform.tripo3d.ai](https://platform.tripo3d.ai/) 获取

### 安装

```bash
git clone <仓库地址> tripo4ae
cd tripo4ae
npm install
```

### 开发

```bash
# 1. 开启 CEP 未签名插件支持（macOS）
#    根据 AE 版本选择 CSXS 版本号：
#    AE 2024 → CSXS.11, AE 2025 → CSXS.11, AE 2026 → CSXS.12
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

# 2. 构建并符号链接到 Adobe CEP 扩展目录
npm run build
npm run symlink

# 3. 重启 After Effects
#    打开面板：窗口 → 扩展 → Tripo4AE
```

热重载开发模式：

```bash
npm run dev
# 面板从 Vite 开发服务器加载，地址 localhost:3000
```

### 生产构建

```bash
npm run build          # 构建到 dist/cep/
npm run zxp            # 打包为 .zxp 用于分发
```

### 测试

```bash
npx jest --runInBand   # 6 个测试套件，73 个测试
```

---

## 使用流程

### 1. 设置 API Key

在面板顶部输入你的 Tripo API Key。密钥会持久化到 localStorage，跨会话保留。

### 2. 生成 3D 模型

- 选择**文本**、**图片**或**多视图**输入模式
- 输入提示词或拖拽上传图片
- 调整参数（模型版本、面数限制、PBR、质量、种子值）
- 点击**生成**，观察进度条

### 3. 导入 After Effects

生成完成后点击 **Import to AE**（插件会根据当前选择的工作流自动处理）：

- **Native Advanced 3D 模式**：
  - 模型自动下载到 `~/Documents/Tripo4AE/Models/`
  - 在当前合成中创建 3D 模型图层并自动激活 Advanced 3D 渲染器
  - 自动居中放置并启用 Time Remap
  - 如果没有打开的合成，自动创建 1920×1080 合成
- **Element 3D 模式**：
  - 自动调用 Tripo API 将 GLB 转换为 OBJ 格式
  - 下载并保存至本地 `~/Documents/VideoCopilot/Models/Tripo4AE/` 目录
  - 在合成中自动创建名称为 `Tripo4AE_E3D` 的固态图层
  - 自动在图层上添加 Video Copilot Element 3D 效果

### 4. 后续处理管线

使用管线步骤指示器或各标签页：

- **精修** → 将草稿模型升级为高质量
- **纹理** → 通过文本/图片提示词应用新 PBR 纹理
- **绑定与动画** → 检查可绑定性、绑定、应用 100+ 动画预设
- **转换** → 导出为 FBX/OBJ/USDZ/STL/3MF
- **风格化** → 乐高、体素、泰森多边形、我的世界、钥匙扣等

### 5. AE 动画

对导入的模型应用内置 AE 动画：

- **摄像机预设**：环绕、推入、平移、摇臂
- **模型预设**：淡入、缩放弹出、翻转、滑入
- **循环表达式**：旋转（X/Y/Z）、浮动、呼吸
- **缓动**：线性、缓入缓出、弹跳、弹性
- **材质预设**：金属、玻璃、塑料、橡胶、陶瓷、黄金、陶土

---

## ExtendScript 接口参考

全部 12 个宿主函数注册为 `host["tripo4ae"]`，通过 `evalScript('tripo4ae.函数名(参数)')` 调用：

| 函数 | 签名 | 说明 |
|------|------|------|
| `getActiveCompInfo` | `() → JSON` | 返回当前合成的名称、尺寸、帧率、时长 |
| `importModel` | `(path, config?) → JSON` | 导入 3D 模型，自动激活 Advanced 3D、居中、启用 Time Remap |
| `applyAnimation` | `(config) → JSON` | 对选中图层应用关键帧预设 + 循环表达式 |
| `selectEmbeddedAnimation` | `(config) → JSON` | 选择/循环嵌入的 GLB 动画 |
| `createCamera` | `(config) → JSON` | 创建摄像机（环绕/推入/平移/摇臂） |
| `createLights` | `(config?) → JSON` | 创建三点布光 |
| `setupE3D` | `(modelPath) → JSON` | 设置 Element 3D 图层（旧版，仅 AE 2024） |
| `setMaterialProperties` | `(config) → JSON` | 通过 match name 设置 PBR 材质属性 |
| `getMaterialProperties` | `(layerIndex?) → JSON` | 读取当前材质属性 |
| `createEnvironmentLight` | `(config?) → JSON` | 创建 HDRI 环境光，支持 HDR 文件 |
| `getExpression` | `(type, params?) → string` | 获取 AE 表达式字符串（旋转/浮动/呼吸） |

所有函数成功时返回 `JSON.stringify({ ok: true, data: {...} })`，失败时返回 `JSON.stringify({ ok: false, error: "..." })`。

---

## 支持的模型版本

| 版本 | 标签 | 说明 |
|------|------|------|
| `v3.1-20260211` | v3.1 | 最新高质量 |
| `P1-20260311` | P1 | 低多边形优化（参数有限） |
| `Turbo-v1.0-20250506` | Turbo | 快速草稿 |
| `v3.0-20250812` | v3.0 | 稳定 v3 |
| `v2.5-20250123` | v2.5 | 旧版默认 |

**注意**：P1 版本不支持 `quad`、`geometry_quality`、`texture_quality` 和 `style` 参数。选择 P1 时会自动过滤这些字段。

---

## 模型下载优先级

导入时，插件按以下优先级选择最佳模型 URL：

```
pbr_model > model > base_model
```

模型先下载到本地 `~/Documents/Tripo4AE/Models/` 再导入 AE，因为 ExtendScript 需要本地文件路径。

---

## 关键技术决策

1. **CEP 而非 UXP** — AE 2026 不支持 UXP 面板。CEP 是当前路径。如果 UXP 到来，React UI 可复用。
2. **AE 原生 3D 为主** — AE 2024+ 支持 GLB 导入和 Mercury 3D。E3D 已搁置（仅支持 AE 2024）。
3. **长操作在 CEP，短操作在 ExtendScript** — HTTP/轮询/下载在 CEP 异步执行。ExtendScript 只做简短 AE DOM 操作。
4. **GLB 为主格式** — 单文件、内嵌 PBR + 动画。Tripo 默认输出 GLB。
5. **运行时 require() 获取 Node.js** — CEP 通过 `require()` 提供 Node.js。使用运行时 require 而非静态 `import fs` 避免 Vite 外部化问题。
6. **Zustand + 持久化** — 轻量、无需 Provider、易于 localStorage 持久化，面板重载不丢数据。
7. **Bolt CEP** — 成熟的脚手架，支持热重载、JSX 编译、ZXP 打包。

---

## 参考文献与致谢

### API 与服务

- **[Tripo AI OpenAPI v2](https://platform.tripo3d.ai/)** — 3D 生成 API，提供文本转模型、图片转模型、骨骼绑定、动画重定向、纹理贴图、格式转换等功能。集成 21 个端点。
- **[Tripo API 文档](https://platform.tripo3d.ai/docs)** — 官方 API 参考，包含请求/响应结构、任务类型、积分消耗说明。

### Adobe After Effects

- **[AE 脚本指南](https://ae-scripting.docsforadobe.dev/)** — After Effects DOM 的 ExtendScript API 参考（CompItem、Layer、Property 等）。本项目中所有材质、摄像机、灯光的 match name 均来源于此。
- **[AE Match Names](https://ae-scripting.docsforadobe.dev/matchnames/)** — Camera Options（`ADBE Camera Options Group`）、Light Options（`ADBE Light Options Group`）、Material Options（`ADBE Material Options Group`）、平面几何、挤出等属性的 match name。
- **[ThreeDModelLayer（AE 24.4+）](https://ae-scripting.docsforadobe.dev/layers/threedmodellayer/)** — AVLayer 子类，用于导入的 3D 模型文件（GLB、GLTF、OBJ、FBX）。
- **[ParametricMeshLayer（AE 26.3+ Beta）](https://ae-scripting.docsforadobe.dev/layers/parametricmeshlayer/)** — 程序化几何体基本体（球体、平面、圆柱、圆锥、环面、立方体）。
- **[Adobe CEP（通用扩展平台）](https://github.com/niclas-niclas/adobe-cep-starter)** — Adobe 宿主应用的 HTML5 + Node.js 面板框架。
- **[CSInterface.js](https://github.com/AdobeDocs/CEP-Resources)** — Adobe 提供的 JavaScript 桥接库，连接 CEP 面板与 ExtendScript 宿主。

### 构建工具链

- **[Bolt CEP（`vite-cep-plugin`）](https://github.com/niclas-niclas/bolt-cep)** — 基于 Vite 的 CEP 扩展构建系统。提供热重载、JSX（ExtendScript）编译（Babel + Rollup）、ZXP 打包、符号链接管理。
- **[types-for-adobe](https://github.com/niclas-niclas/types-for-adobe)** — Adobe ExtendScript 宿主对象的 TypeScript 类型定义（app、CompItem、Layer、Property 等）。
- **[Vite](https://vitejs.dev/)** — 新一代前端构建工具，驱动 CEP 面板的 React 开发服务器和生产构建。
- **[Rollup](https://rollupjs.org/)** — 模块打包器，用于编译 ExtendScript（JSX）bundle，目标为 ES3/ES5。
- **[Babel](https://babeljs.io/)** — JavaScript 转译器，将 TypeScript/ES6+ 的 ExtendScript 代码降级为 ES3 兼容输出。

### 前端技术栈

- **[React 19](https://react.dev/)** — CEP 面板 UI 库。函数组件 + Hooks。
- **[Zustand](https://zustand.docs.pmnd.rs/)** — 轻量状态管理，配合 `persist` 中间件实现 localStorage 持久化，面板重载后数据不丢失。
- **[TypeScript](https://www.typescriptlang.org/)** — 类型安全开发，覆盖 CEP 面板和共享类型定义。

### 测试

- **[Jest](https://jestjs.io/)** — 测试框架。4 个测试套件覆盖 HTTP 客户端、API 服务、任务轮询和状态管理。
- **[Testing Library](https://testing-library.com/)** — React 组件测试工具。

### 第三方插件（参考）

- **[Element 3D（Video Copilot）](https://www.videocopilot.net/products/element3d/)** — 商业 AE 3D 模型渲染插件（旧版，仅 AE 2024）。无公开脚本 API — 通过纯色图层 + 效果应用方式集成。
