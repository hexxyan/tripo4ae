<h1 align="center">Tripo4AE</h1>

<p align="center">
  <strong>在 After Effects 里完成 AI 3D 生成的全部工作流</strong>
</p>

<p align="center">
  <a href="./README.md">English</a> | 中文
</p>

<p align="center">
  <img alt="After Effects" src="https://img.shields.io/badge/After%20Effects-2024%20%7C%202025%20%7C%202026-9999FF?logo=adobeaftereffects" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" />
  <img alt="Tripo AI" src="https://img.shields.io/badge/Tripo-OpenAPI%20v2-orange" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-73%20passed-brightgreen" />
</p>

---

## 这是什么

Tripo4AE 是一个 Adobe After Effects CEP 扩展插件，把 [Tripo AI](https://platform.tripo3d.ai/) 的完整 3D 生成管线搬进了 AE。

**一句话：输入文字或图片，直接在 AE 时间线上拿到带 PBR 材质和动画的 3D 模型。**

- 覆盖 **21 个** Tripo API 端点
- **5 个** 功能标签页覆盖完整工作流
- **12 个** ExtendScript 宿主函数控制 AE 三维场景
- 深度适配 **AE 2026 Advanced 3D**（Mercury 3D 引擎）
- 面板重载不丢状态，任务自动恢复

---

## 功能一览

### 🎨 生成（Generate）

| 输入方式 | 说明 |
|----------|------|
| 文本 → 3D | 输入中英文提示词，选择风格（卡通/毒液/粘土/蒸汽朋克/圣诞/芭比/金/古铜） |
| 图片 → 3D | 拖拽上传图片，自动生成对应 3D 模型 |
| 多视图 → 3D | 上传前/左/后/右四张图，高精度重建 |

参数控制：模型版本（v3.1 / P1 / Turbo / v3.0 / v2.5）、面数、PBR、四边面、几何精度、种子值

### ✨ 精修与纹理（Refine & Texture）

- **精修**：将草稿模型升级为高质量版本
- **重贴图**：通过文本提示词 / 参考图 / 风格图重新生成纹理
- **PBR 升级**：standard → detailed → extreme 三档精度
- **分部件贴图**：基于网格分割结果，对指定部件单独贴图
- **烘焙**：将高级材质合并为基础纹理

### 🎬 动画（Animation）

**Tripo 侧动画：**

| 功能 | 说明 |
|------|------|
| PreRigCheck | 检查模型可绑定性，返回推荐骨骼类型 |
| Rig | 绑定骨骼（双足/四足/六足/八足/鸟类/蛇形/水生） |
| Retarget | 应用动画预设（100+ 种：行走/跑步/跳舞/战斗/运动/日常/动物） |

**AE 侧动画与辅助工具：**

| 类型 | 预设 / 功能 |
|------|------|
| 摄像机 | 环绕 (Orbit)、推入 (Push)、平移 (Track)、摇臂 (Jib)（自动创建 3D Null 控制关联） |
| 模型入场 | 淡入、缩放弹出、翻转、滑入 |
| 循环表达式 | 旋转 (Spin)、浮动 (Float)、呼吸 (Breathe) |
| 缓动 | 线性、缓入缓出、弹跳、弹性 |
| 模型对齐 | 对齐模型到地面、对齐地面到模型（基于 sourceRectAtTime 空间包围盒计算） |
| PBR 材质控制 | Advanced PBR Material Options 精细面板，支持一键读取和回写 10 项材质滑块参数 |

### 🔧 变换（Transform）

| 功能 | 说明 |
|------|------|
| 风格化 | 乐高、体素、泰森多边形、我的世界、钥匙扣、冰箱贴、键帽 |
| 网格分割 | 将模型分割为命名部件 |
| 网格补全 | 补全缺失部件 |
| 高模转低模 | 简化面数，可选四边面 |
| 格式转换 | FBX、OBJ、GLTF、USDZ、STL、3MF（含 FBX 预设：Blender/3ds Max/Mixamo） |

### 📚 模型库（Library）

- 已生成模型列表，含缩略图和元数据
- **云端生成历史 (Cloud Generation History)**：直接从 Tripo 云端拉取历史任务记录列表，防止因本地缓存清除导致的积分或资产丢失，并支持重新下载。
- 一键重新导入 AE
- 动画模板保存/加载（JSON）
- 导入外部模型文件

---

## AE 2026 Advanced 3D 深度集成

| 特性 | 说明 |
|------|------|
| ThreeDModelLayer 检测 | AE 24.4+ 新增的 3D 模型图层类型，脚本级精确识别 |
| Adobe Standard Material | 12 项 PBR 属性控制，面板新增 **Advanced PBR Material Options** 调节滑块，支持读取并回写 10 项核心参数。*注意：对于 GLB 这种带有烘焙纹理的模型，AE 的 PBR 材质滑块无法覆盖原始模型的贴图，仅对非贴图区域或基础色生效。* |
| 嵌入动画控制 | 选择 GLB/FBX 中的嵌入动画，通过 Time Remap 实现循环播放 |
| HDRI 环境光 | 一键创建环境光图层，支持 HDRI 文件，支持背景可见性开关，并默认开启环境光阴影投射以生成真实的接触阴影与环境光遮蔽 (AO) |
| 摄像机 Null 控制器 | 自动建立 3D Null 节点图层并作为摄像机的父级，方便直观控制镜头的旋转与平移 |
| 地面影子接收器 | 自动创建偏亮灰色的地面固态层 (`[0.85, 0.85, 0.85]`)，设置其接收阴影属性为开启状态，既可见又能良好承载模型的投影 |
| 自动对齐工具 | 脚本级实时计算模型包围盒底部边缘，一键实现模型对齐地面或地面贴合模型底部 |
| 材质预设 | 8 种一键预设：默认、金属、玻璃、塑料、橡胶、陶瓷、黄金、陶土 |
| 渲染器自动切换 | 导入时自动激活 Advanced 3D / Mercury 3D Engine |

---

## 管线与可靠性

```
文本/图片 → 生成 → 精修 → 贴图 → 绑定 → 动画 → 转换 → 导入 AE
   ✅         ✅       ✅      ✅      ✅       ✅       ✅
```

- **管线步骤指示器**：跨标签页实时显示当前模型处理进度，每步可跳过
- **状态持久化**：Zustand + localStorage，面板吸附/取消吸附不丢失数据
- **任务自动恢复**：面板重载后自动找到进行中的任务并继续轮询
- **自适应轮询**：根据 API 返回的 `running_left_time` 动态调整间隔，上限 5 秒
- **Node.js 文件下载器**：采用宿主 Node.js 异步 HTTPS 模块直接下载文件到本地，绕过 CEP 内置 Chromium 浏览器的 CORS 限制及 SSL 握手挂死问题

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      Tripo4AE 插件                       │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│    CEP 面板 (React)      │     ExtendScript (.jsx)      │
│                          │                              │
│  ┌──────────────────┐   │   ┌────────────────────┐    │
│  │ 5 个功能标签页     │   │   │ 12 个宿主函数       │    │
│  │ ├ 生成            │   │   │ ├ 导入 3D 模型      │    │
│  │ ├ 精修与纹理      │   │   │ ├ 关键帧动画        │    │
│  │ ├ 动画            │   │   │ ├ 摄像机预设        │    │
│  │ ├ 变换            │   │   │ ├ 三点布光          │    │
│  │ └ 模型库          │   │   │ ├ PBR 材质控制      │    │
│  └──────────────────┘   │   │ ├ 环境光            │    │
│                          │   │ ├ 嵌入动画控制      │    │
│  ┌──────────────────┐   │   │ └ 表达式循环        │    │
│  │ 服务层             │   │   └────────────────────┘    │
│  │ ├ HTTP 客户端      │   │                              │
│  │ ├ Tripo API 封装   │   │                              │
│  │ ├ 自适应轮询器     │   │                              │
│  │ └ Zustand 状态管理 │   │                              │
│  └──────────────────┘   │                              │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│                  CSInterface.js（桥接层）                 │
└─────────────────────────────────────────────────────────┘
          ↕ HTTP (REST API)                   ↕ AE DOM
          Tripo API v2                   After Effects
```

**核心原则**：所有耗时操作（网络请求、轮询、文件下载）在 CEP/React/Node 异步层完成。ExtendScript 只做简短的 AE DOM 操作，避免 UI 冻结。

---

## 技术栈

| 层 | 技术 | 版本 |
|---|------|------|
| CEP 面板 | React + TypeScript + Vite | React 19, TS 5.x, Vite 6 |
| 状态管理 | Zustand | 5.x（含 localStorage 持久化中间件） |
| ExtendScript | Babel + Rollup 编译到 ES3 | `types-for-adobe` 类型支持 |
| 构建 | Bolt CEP (`vite-cep-plugin`) | 2.x |
| 通信 | CSInterface.js | CEP 12 |
| API | Tripo OpenAPI v2 | REST API |
| 认证 | Bearer API Key | |

---

## 快速开始

### 环境要求

| 依赖 | 最低版本 |
|------|---------|
| After Effects | 2024（推荐 2026） |
| Node.js | 18+ |
| npm | 9+ |
| macOS | Intel / Apple Silicon |

> **获取 API Key**：前往 [platform.tripo3d.ai](https://platform.tripo3d.ai/) 注册并创建 API Key

### 安装

```bash
git clone <仓库地址> tripo4ae
cd tripo4ae
npm install
```

### 构建与运行

```bash
# 1. 开启 CEP 未签名插件支持（macOS）
#    ⚠️ 根据你的 AE 版本选择正确的 CSXS 版本号：
#    AE 2024 / 2025 → CSXS.11
#    AE 2026        → CSXS.12
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

# 2. 构建并创建符号链接
npm run build
npm run symlink

# 3. 启动 After Effects
#    打开面板：窗口 → 扩展 → Tripo4AE
```

### 开发模式（热重载）

```bash
npm run dev
# 面板通过 Vite 开发服务器加载，地址 localhost:3000
# 修改 src/client/ 下的文件会自动热更新
# 修改 src/jsx/ 下的 ExtendScript 文件会自动重新编译
```

### 打包分发

```bash
npm run build    # 构建到 dist/cep/
npm run zxp      # 打包为 .zxp 安装包
```

### 运行测试

```bash
npx jest --runInBand
# 6 个测试套件 / 73 个测试用例
```

---

## 项目结构

```
tripo4ae/
├── src/
│   ├── client/                        # CEP 面板（React）
│   │   ├── App.tsx                    # 根组件（标签页导航 + Header + PipelineStepper）
│   │   ├── components/
│   │   │   ├── GenerateTab/           # 生成标签页
│   │   │   ├── RefineTextureTab/      # 精修与纹理标签页
│   │   │   ├── AnimationTab/          # 动画标签页
│   │   │   ├── TransformTab/          # 变换标签页
│   │   │   ├── LibraryTab/            # 模型库标签页
│   │   │   ├── PipelineStepper/       # 管线步骤指示器
│   │   │   └── common/                # 公共 UI 组件
│   │   │       ├── PromptInput.tsx    # 提示词输入框
│   │   │       ├── ProgressBar.tsx    # 进度条
│   │   │       ├── ParameterPanel.tsx # 参数面板
│   │   │       └── ImageUpload.tsx    # 图片拖拽上传
│   │   ├── hooks/
│   │   │   └── useCsInterface.ts      # CSInterface 桥接 Hook
│   │   ├── services/
│   │   │   ├── httpClient.ts          # HTTP 客户端（重试、429 指数退避）
│   │   │   ├── tripoApi.ts            # Tripo API 封装（创建/查询/下载/上传）
│   │   │   └── taskPoller.ts          # 自适应任务轮询器
│   │   └── stores/
│   │       └── useStore.ts            # Zustand 状态（含 localStorage 持久化）
│   │
│   ├── jsx/                           # ExtendScript 编译入口
│   │   ├── index.ts                   # 入口：注册 host["tripo4ae"] 和 host[ns]
│   │   └── aeft/
│   │       └── aeft.ts                # 12 个 AE 宿主函数（编译到 ES3）
│   │
│   ├── host/                          # ExtendScript 源码模块（参考用）
│   │   ├── importModel.ts             # 导入 3D 模型
│   │   ├── animation.ts               # 关键帧预设 + 循环表达式
│   │   ├── camera.ts                  # 摄像机预设
│   │   ├── lights.ts                  # 三点布光
│   │   ├── materials.ts               # PBR 材质控制
│   │   ├── environmentLight.ts        # HDRI 环境光
│   │   ├── expressions.ts             # AE 表达式生成器
│   │   ├── e3d.ts                     # Element 3D（已搁置）
│   │   └── projectInfo.ts             # 合成信息查询
│   │
│   └── shared/
│       ├── types.ts                   # 全部 TypeScript 类型定义（~300 行）
│       └── constants.ts               # API 版本、预设、枚举常量
│
├── __tests__/                         # Jest 测试（6 个套件，73 个用例）
│   ├── aeft.test.ts                   # 宿主 ExtendScript 方法 Mock 测试
│   ├── hooks/
│   │   └── useCsInterface.test.ts     # CSInterface Hook 测试
│   ├── services/
│   │   ├── tripoApi.test.ts           # API 服务测试（含 CEP Node.js mock）
│   │   ├── taskPoller.test.ts         # 自适应状态轮询测试
│   │   └── httpClient.test.ts         # HTTP 客户端重试测试
│   └── stores/
│       └── useStore.test.ts           # Zustand 状态持久化测试
│
├── CSXS/
│   └── manifest.xml                   # CEP 扩展清单
├── cep.config.ts                      # Bolt CEP 配置
├── vite.config.ts                     # Vite 构建配置
├── vite.es.config.ts                  # ExtendScript (ES3) 构建配置
└── package.json
```

---

## 使用流程

### 第一步：设置 API Key

在面板顶部输入框粘贴你的 Tripo API Key。Key 会保存到 localStorage，下次打开自动填充。

### 第二步：生成 3D 模型

1. 选择输入模式：**文本** / **图片** / **多视图**
2. 输入提示词或拖拽上传图片
3. 调整参数（版本、面数、PBR 等）
4. 点击 **Generate**

### 第三步：导入 AE

生成完成后点击 **Import to AE**（插件会根据当前选择的导入工作流自动处理）：

- **Native Advanced 3D 模式**：
  1. 下载模型到本地 `~/Documents/Tripo4AE/Models/`
  2. 在当前合成中创建 3D 模型图层并自动激活 Advanced 3D 渲染器
  3. 自动居中放置并启用 Time Remap 表达式以播放内嵌骨骼动画
  4. 如果没有打开的合成，自动创建一个 1920×1080、10 秒、30fps 的新合成
- **Element 3D 模式**：
  1. 自动调用 Tripo API 的 `convert_model` 将其转换为兼容的 OBJ 格式
  2. 下载并保存至本地 `~/Documents/VideoCopilot/Models/Tripo4AE/` 模型归档目录
  3. 在合成中自动新建名称为 `Tripo4AE_E3D` 的黑色固态层 (Solid Layer)
  4. 自动向固态层应用 Video Copilot Element 3D 插件效果（如未安装会优雅退回提示）

### 第四步：后续处理

按需使用管线中的各步骤：

- **精修** → 升级草稿模型质量
- **贴图** → 用新提示词重贴 PBR 纹理
- **绑定** → 自动骨骼绑定
- **动画** → 从 100+ 预设中选择动画
- **转换** → 输出为 FBX/OBJ/USDZ/STL 等
- **风格化** → 乐高/体素/泰森多边形等特效

### 第五步：AE 动画增强

对导入的模型添加 AE 原生动画效果：

- 摄像机环绕拍摄
- 模型出入场动画
- 持续循环动画（旋转/浮动/呼吸）
- 一键切换材质风格

---

## ExtendScript 接口文档

所有宿主函数通过 `evalScript('tripo4ae.函数名(参数)')` 从 CEP 面板调用。

### 通用返回格式

```javascript
// 成功
{ ok: true, data: { ... } }

// 失败
{ ok: false, error: "错误描述" }
```

### 函数列表

#### `getActiveCompInfo()`

获取当前活动合成的信息。

```javascript
// 返回
{ name: "合成 1", width: 1920, height: 1080, frameRate: 30, duration: 10, durationFrames: 300 }
```

#### `importModel(path: string, config?: JSON)`

导入 3D 模型文件到当前合成。

```javascript
// config 可选参数
{
  autoScale: true,           // 自动缩放
  centerInComp: true,        // 居中放置
  enableTimeRemap: true,     // 启用时间重映射
  selectEmbeddedAnim: 1      // 选择第几个嵌入动画
}

// 返回
{ name: "model.glb", addedToComp: true, isThreeDModelLayer: true,
  hasAdvanced3DRenderer: true, layerIndex: 0 }
```

#### `applyAnimation(config: JSON)`

对选中图层应用关键帧动画预设和循环表达式。

```javascript
{
  modelPreset: "fade-in",    // fade-in | scale-pop | flip | slide-in
  easing: "ease-in-out",     // linear | ease-in-out | bounce | elastic
  duration: 2,
  loops: [
    { type: "spin", axis: "y", speed: 1 },
    { type: "float", axis: "y", amplitude: 50, frequency: 1 },
    { type: "breathe", amplitude: 5, frequency: 0.5 }
  ]
}
```

#### `selectEmbeddedAnimation(config: JSON)`

选择和控制 GLB/FBX 中的嵌入动画。

```javascript
{
  layerIndex: 0,             // 可选，不传则使用当前选中图层
  animationIndex: 1,         // 动画索引（1-based）
  enableTimeRemap: true,
  loopAnimation: true        // 通过 Time Remap 表达式实现循环
}
```

#### `createCamera(config: JSON)`

创建带预设动画的摄像机。

```javascript
{
  preset: "orbit",           // orbit | push | track | jib
  duration: 5,
  radius: 500,               // 环绕半径
  offset: 400                // 平移/摇臂偏移量
}
```

#### `createLights(config?: JSON)`

创建三点布光（主光 + 补光 + 轮廓光）。

```javascript
{
  intensity: 100,            // 主光强度 (0-200)
  color: [1, 1, 1],          // 光色 [R, G, B] 0-1
  keyAngle: 45,              // 主光水平角度
  fillRatio: 0.4,            // 补光/主光比例
  rimRatio: 0.6              // 轮廓光/主光比例
}
```

#### `setMaterialProperties(config: JSON)`

设置 3D 模型图层的 PBR 材质属性（AE 2024.4+ Advanced 3D）。

```javascript
{
  layerIndex: 0,             // 可选
  material: {
    ambient: 0.5,            // 环境光
    diffuse: 0.8,            // 漫反射
    specularIntensity: 0.6,  // 高光强度
    specularShininess: 70,   // 高光锐度
    metal: 1.0,              // 金属度
    lightTransmission: 0.9,  // 透光
    reflectionIntensity: 80, // 反射强度
    reflectionSharpness: 90, // 反射锐度
    transparency: 80,        // 透明度
    indexOrRefraction: 1.5   // 折射率
  }
}
```

#### `getMaterialProperties(layerIndex?: number)`

读取当前图层的全部材质属性值。

#### `createEnvironmentLight(config?: JSON)`

创建 HDRI 环境光（AE 2025+）。

```javascript
{
  intensity: 100,
  hdrPath: "/path/to/environment.hdr",  // 可选 HDRI 文件
  castShadows: true,
  shadowDarkness: 50
}
```

#### `getExpression(type: string, params?: JSON)`

获取 AE 表达式字符串。

```javascript
// type: "spin" | "float" | "breathe"
getExpression("spin", { axis: "y", speed: 2 })
```

---

## 支持的模型版本

| 版本 ID | 显示名 | 特点 | 参数限制 |
|---------|--------|------|---------|
| `v3.1-20260211` | v3.1 | 最新高质量 | 全参数 |
| `P1-20260311` | P1 | 低多边形优化 | 不支持 quad / geometry_quality / texture_quality / style |
| `Turbo-v1.0-20250506` | Turbo | 快速草稿 | 全参数 |
| `v3.0-20250812` | v3.0 | 稳定 v3 | 全参数 |
| `v2.5-20250123` | v2.5 | 旧版默认 | 全参数 |

> 选择 P1 版本时，不兼容的参数会被自动过滤，不会发送到 API。

---

## 模型下载优先级

Tripo API 返回的 `output` 中可能包含多个模型 URL，插件按以下顺序选择：

```
pbr_model > model > base_model
```

所有模型先下载到本地 `~/Documents/Tripo4AE/Models/` 再传给 ExtendScript 导入，因为 AE 的 `ImportOptions` 只接受本地文件路径。

---

## 关键技术决策

| 决策 | 原因 |
|------|------|
| **CEP 而非 UXP** | AE 2026 仍不支持 UXP 面板。CEP 是当前唯一路径。React UI 未来可迁移到 UXP |
| **AE 原生 3D 为主** | AE 2024+ 支持 GLB + Mercury 3D。E3D 已搁置（仅兼容到 AE 2024，2025+ 问题多） |
| **长操作在 CEP / 短操作在 ExtendScript** | HTTP/轮询/下载在异步层完成。ExtendScript 只做 DOM 操作，避免 UI 卡死 |
| **GLB 为首选格式** | 单文件包含几何体 + PBR 纹理 + 动画。Tripo 默认输出 GLB |
| **运行时 `require()` 获取 Node.js** | CEP 内置 Node.js。用 `require('fs')` 而非 `import fs` 避免 Vite 外部化问题 |
| **Zustand + localStorage** | 轻量无 Provider，一行配置持久化。面板重载（吸附/取消吸附）不丢数据 |
| **Bolt CEP 脚手架** | 成熟方案：热重载 + JSX 编译到 ES3 + ZXP 打包 |

---

## 常见问题

### 面板没有出现在「窗口 → 扩展」菜单

1. 确认已运行 `npm run build && npm run symlink`
2. 确认已开启 PlayerDebugMode：`defaults write com.adobe.CSXS.12 PlayerDebugMode 1`
3. AE 版本对应的 CSXS 版本号是否正确（2024→11, 2026→12）
4. 确认符号链接存在：`ls ~/Library/Application\ Support/Adobe/CEP/extensions/ | grep tripo`
5. 完全退出并重启 AE（不是只关窗口）

### 生成完成后导入失败

- 确认 `~/Documents/Tripo4AE/Models/` 目录存在且有写入权限
- 首次保存时 macOS 可能弹出权限对话框，点击「允许」
- 检查模型文件是否下载完成（查看上述目录）

### 面板重载后任务丢失

- 确保 Zustand 持久化正常工作：打开 DevTools → Application → Local Storage，查看 `tripo4ae-store` 键
- 生成中的任务（pending/queued/running 状态）会自动恢复轮询

### 图片上传失败

- 确认文件为图片格式（PNG/JPG/JPEG）
- CEP 环境下使用 `File.arrayBuffer()` 读取文件内容，无需本地文件路径

---

## 相关资源

- [Tripo AI 平台](https://platform.tripo3d.ai/) — 获取 API Key、查看文档
- [Tripo OpenAPI v2 文档](https://api.tripo3d.ai/v2/openapi) — API 接口文档
- [Bolt CEP](https://github.com/hyperbrew/bolt-cep) — CEP 扩展脚手架
- [AE ExtendScript API 参考](https://ae-scripting.docsforadobe.dev/) — ExtendScript 完整文档
- [Adobe CEP Cookbook](https://github.com/Adobe-CEP/CEP-Resources) — CEP 开发指南
- [types-for-adobe](https://github.com/aenhancers/types-for-adobe) — AE ExtendScript 类型定义

---

## 许可证

私有项目，保留所有权利。
