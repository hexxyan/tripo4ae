# Tripo4AE 使用教程

从 AI 生成 3D 模型到 After Effects 合成，完整工作流指南。

---

## 目录

1. [安装与配置](#1-安装与配置)
2. [连接 Tripo API](#2-连接-tripo-api)
3. [生成 3D 模型](#3-生成-3d-模型)
4. [导入 After Effects](#4-导入-after-effects)
5. [精修与纹理](#5-精修与纹理)
6. [绑定与动画](#6-绑定与动画)
7. [风格化与变换](#7-风格化与变换)
8. [模型库管理](#8-模型库管理)
9. [AE 内置动画](#9-ae-内置动画)
10. [完整工作流示例](#10-完整工作流示例)
11. [常见问题](#11-常见问题)

---

## 1. 安装与配置

### 前置条件

- After Effects 2024 或更高版本（推荐 AE 2025/2026）
- Node.js 18+ 和 npm 9+
- [Tripo API Key](https://platform.tripo3d.ai/)（注册后获取）
- （可选）若使用 Element 3D 导入工作流，AE 中必须安装 [Video Copilot Element 3D](https://www.videocopilot.net/products/element2/) 插件

### 安装步骤

```bash
# 克隆项目并安装依赖
git clone <仓库地址> tripo4ae
cd tripo4ae
npm install

# 开启未签名 CEP 插件支持
# AE 2024/2025 → CSXS.11，AE 2026 → CSXS.12
# macOS 终端执行：
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
# Windows 终端（以管理员身份运行 cmd）执行：
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f

# 构建并链接到 AE 扩展目录
npm run build
npm run symlink
```

重启 After Effects，在菜单栏选择 **窗口 → 扩展 → Tripo4AE** 打开面板。

> **提示**：开发模式下可使用 `npm run dev` 启用热重载。

---

## 2. 连接 Tripo API

1. 打开 Tripo4AE 面板，在顶部找到 API Key 输入框
2. 输入你的 Tripo API Key
3. 点击 **Connect** 按钮
4. 连接成功后，状态指示灯变为绿色，右侧显示可用积分余额

API Key 会自动保存到 localStorage，下次打开面板无需重新输入。

---

## 3. 生成 3D 模型

打开 **Generate**（生成）标签页，插件提供三种输入模式：

### 模式一：文本转 3D（Text）

1. 点击顶部 **Text** 按钮切换到文本模式
2. 在 Prompt 输入框中描述你想要的 3D 模型，例如：
   - "a cute cartoon cat sitting on a chair"
   - "futuristic sci-fi helmet with glowing visor"
3. （可选）在 Negative Prompt 中填写你不想出现的内容
4. （可选）选择一种风格预设（粘土、蒸汽朋克、圣诞、芭比、黄金、青铜等）
5. 调整参数（展开参数面板）：
   - **Model Version**：v3.1（最新高质量）或 Turbo（快速草稿）
   - **Face Limit**：低（3k）、中（10k）、高（20k）或自动
   - **PBR**：开启后生成包含 PBR 材质的模型
   - **Quad**：生成四边形网格
   - **Quality**：standard / detailed
   - **Seeds**：设置模型种子或纹理种子以复现结果
6. 点击 **Generate**，进度条显示生成进度

### 模式二：图片转 3D（Image）

1. 点击 **Image** 按钮切换到图片模式
2. 拖拽或点击上传一张参考图片（支持 PNG、JPG）
3. 图片自动上传到 Tripo 云端并获取 token
4. 调整参数后点击 **Generate**

> **提示**：图片越清晰、背景越干净，生成效果越好。

### 模式三：多视图转 3D（Multiview）

1. 点击 **Multiview** 按钮切换到多视图模式
2. 分别上传正面、左侧、背面、右侧四张视图图片（至少一张）
3. 点击 **Generate**

> **提示**：上传更多视角的图片可以显著提升模型质量。

---

## 4. 导入 After Effects

生成完成后，结果预览区会显示渲染图和任务信息。插件支持两种核心导入工作流（在 Generate 标签页中切换）：

### 1. Native Advanced 3D 模式 (推荐)

直接将 `.glb` 三维模型导入为 AE 2024+ 的原生 **3D Model Layer**。点击 **Import to AE** 会执行：
1. 下载 GLB 模型至本地 `~/Documents/Tripo4AE/Models/` 目录。
2. 自动导入项目并创建 3D 模型图层，居中放置在当前合成中。
3. 自动将合成的 3D 渲染器切换为 **Advanced 3D**（Mercury 3D Engine）。
4. 启用 Time Remap，以便后续读取并播放模型内嵌的骨骼动画。
5. 将任务记录保存至本地模型库 (Library)。

> **提示**：如果当前没有打开的合成，插件将自动创建一个 1920×1080、10秒、30fps 的默认合成。

### 2. Element 3D 模式 (第三方插件)

适合习惯使用 Video Copilot Element 3D 的设计师。由于 ExtendScript 对闭源 E3D 内部配置的边界限制，插件采用了“本地资产目录注入+自动效果应用”流程：
1. 面板自动发起 Tripo API 的 `convert_model` 任务，将模型转为 E3D 支持的 `.obj` 格式（配合 PNG/JPG 材质图）。
2. 转换成功后，自动将 OBJ 模型及其贴图下载并归档至 Element 3D 的用户模型库路径下：`~/Documents/VideoCopilot/Models/Tripo4AE/<任务ID>/`。
3. 在 AE 活动合成中自动创建一个名为 `Tripo4AE_E3D` 的纯色图层 (Solid Layer)。
4. 自动在图层上添加 `Element` (Video Copilot: Element) 效果插件。
5. 提示用户点击 E3D 效果面板的 **Scene Setup**，在模型列表中选择 `Tripo4AE` 文件夹下的对应模型即可直接载入。

### 自动导入（管线操作）

在 Refine、Texture、Animation、Transform 等标签页中触发的高级管线任务（例如自动 Rig 绑定或 Animation 动画重定向），在生成完毕后，会自动遵循当前选中的导入工作流自动下载、转换并导入到 AE，省去手动干预。

---

## 5. 精修与纹理

打开 **Refine & Texture**（精修与纹理）标签页。

### 精修模型

将低质量草稿模型升级为高质量版本：

1. 在 **Source Model** 下拉框中选择管线中已完成的模型步骤
2. 点击 **Refine**
3. 等待处理完成，精修结果自动导入 AE

### 应用纹理

为已有模型应用全新的 PBR 纹理：

1. 选择源模型
2. 选择纹理输入方式：
   - **Text**：输入文字描述，如 "rusty metal with scratches"
   - **Image**：上传参考图片
   - **Style**：上传风格图片
3. 调整纹理参数：
   - **Texture Quality**：standard / detailed / extreme
   - **PBR**：开启后生成 PBR 材质贴图
   - **Bake**：烘焙纹理
   - **Texture Alignment**：geometry（按几何）或 original_image（按原图对齐）
4. （可选）填写 Part Names 以对特定部件贴图，如 "body, head, arms"
5. 点击 **Apply Texture**

---

## 6. 绑定与动画

打开 **Animation**（动画）标签页。

### 第一步：检查可绑定性（Pre-Rig Check）

1. 在 **Source Model** 中选择一个管线模型
2. 点击 **Check Rig-ability**
3. 查看结果：是否可绑定（Riggable）以及检测到的骨骼类型

### 第二步：绑定骨骼（Rig）

1. 选择 Rig Type（骨骼类型）：
   - **Biped**：双足人形
   - **Quadruped**：四足动物
   - **Hexapod**：六足
   - **Octopod**：八足
   - **Avian**：鸟类
   - **Serpentine**：蛇形
   - **Aquatic**：水生
2. 选择输出格式（GLB 或 FBX）和骨骼规范（Tripo 或 Mixamo）
3. 点击 **Rig Model**
4. 绑定结果自动下载并导入 AE

### 第三步：重定向动画（Retarget）

将预设动画应用到已绑定的模型：

1. 从分类列表中选择动画（最多选 5 个）：
   - **Basic**：idle、walk、run、jump、fall、dive、climb/flip
   - **Combat**：slash、shoot、hurt
   - **Dance**：6 种舞蹈动画
   - **Performance**：sing、clap、cheer、laugh、cry、bow、wave 等
   - **Sports**：golf、basketball、volleyball、swim、surf 等
   - **Daily**：sit、hug、scratch、phone 等
   - **Cross-Species**：跨物种通用动画
2. （可选）勾选 **Animate in Place** 让角色原地动画
3. 点击 **Retarget**
4. 带动画的模型自动导入 AE

> **注意**：Retarget 操作前需要先完成 Rig 步骤，并将 Rig 结果选为 Source Model。

### 第四步：高级 PBR 材质控制 (Advanced PBR Material Options)

对于导入 AE 的 Native 3D 图层，除了应用基础材质预设外，还可以在 **Animation** 页面下方的 **Advanced PBR Material Options** 区域进行精细化调节。

> [!WARNING]
> **GLB 材质限制**：导入的 GLB 模型通常包含已烘焙的贴图（纹理映射）。AE 的原生 PBR 材质滑块（如金属度、粗糙度、漫反射等）*无法* 直接覆盖模型已烘焙的贴图。滑块仅会对未贴图区域或应用基准偏移产生视觉作用。面板上已有提示信息提醒此物理渲染特性。

1. **读取当前图层材质**：在 AE 中选中一个 3D 模型图层，点击 **Read from Selected Layer**。面板滑块会自动读取并同步当前图层在 AE 中的 10 项物理材质数值（如反射率、粗糙度、金属度、折射率等）。
2. **精细调节参数**：
   - 滑块将 AE 的 `0.0 - 1.0` 浮点数映射为更直观的 `0% - 100%` 进行调节。
   - 可调项包含：环境光、漫反射、高光强度、高光锐度 (Shininess)、金属度 (Metal)、透光度 (Light Transmission)、反射强度 (Reflection Intensity)、反射锐度 (Reflection Sharpness)、透明度 (Transparency) 以及物理折射率 (IOR，范围 1.0 - 3.0)。
3. **应用材质修改**：调节滑块数值后，点击 **Apply PBR Properties** 按钮，参数将自动折算并实时回写至 AE 选中图层的材质属性中，无需在 AE 时间线上反复展开属性组手动微调。

---

## 7. 风格化与变换

打开 **Transform**（变换）标签页。

### 风格化（Stylize）

将模型转换为特定风格：

1. 选择源模型
2. 选择风格：
   - **Lego**：乐高积木风格
   - **Voxel**：体素风格
   - **Voronoi**：泰森多边形风格
   - **Minecraft**：我的世界风格（可设置方块大小）
   - **Keyring**：钥匙扣
   - **Fridge Magnet**：冰箱贴
   - **Keycap**：键帽
3. 点击 **Stylize**

### 网格编辑（Mesh Editing）

- **Segment Mesh**：自动分割网格为不同部件
- **Complete Mesh**：补全缺失的网格部分（可指定部件名称）
- **Simplify**：
  - 普通简化：减少面数
  - **High-Poly to Low-Poly**：高模转低模并烘焙法线贴图
  - 可选 Quad（四边形）和 Face Limit

### 格式转换（Convert）

将模型导出为其他格式：

1. 选择目标格式：FBX、OBJ、GLTF、USDZ、STL、3MF
2. 调整参数：
   - **Quad**：四边形网格
   - **With Animation**：保留动画数据
   - **Face Limit**：面数限制
   - **Texture Size**：纹理尺寸
   - **FBX Preset**（仅 FBX）：Blender / 3ds Max / Mixamo / Bake Scale
3. 点击 **Convert**

---

## 8. 模型库管理

打开 **Library**（模型库）标签页。

### 模型列表

所有通过插件导入的模型都会记录在库中，显示：
- 缩略图预览
- 模型名称和格式
- 创建时间
- 管线步骤指示（彩色圆点）

### 操作

- **Import**：将模型重新导入当前合成（不重新下载）
- **X**：从库中移除（不影响已下载的文件）
- **Import External**：导入外部 GLB/GLTF/FBX/OBJ 文件，通过 Tripo API 处理后导入 AE

### 云端生成历史 (Cloud Generation History)

直接从 Tripo 官方云端账户同步拉取生成的历史任务：
- **防丢资产**：即使您清除了浏览器的 LocalStorage 本地缓存或重装插件，只要绑定同一个 API Key，所有历史任务都会自动呈现。
- **免积分下载**：点击历史任务中的下载按钮，可以免费将以前生成的模型下载到本地并自动导入 AE，无需重复扣除您的积分余额。

### 动画模板

在 Animation 标签页保存的模板会出现在库底部的 **Animation Templates** 区域，点击即可重新应用到当前选中的图层。

---

## 9. AE 内置动画

在 **Animation** 标签页底部的 **AE Animation (Local)** 区域，可以对已导入的模型应用本地 AE 动画（不需要调用 API）。

### 摄像机预设

选择一种摄像机运动方式。插件会自动创建或复用一个位于合成中心的 3D Null 控制层 (`Tripo4AE_CameraCtrl`) 并作为摄像机的父级，通过对该 Null 层应用关键帧动画来控制镜头。这能避免万向节锁并提供更平滑的环绕效果：
- **Orbit**：通过对 Null 控制层应用 Y 轴旋转，实现对模型 360° 环绕。
- **Push**：通过对 Null 控制层应用 Z 轴位置动画，向模型推入镜头。
- **Track**：通过 X 轴位置平移镜头。
- **Jib**：通过 Y 轴位置垂直升降镜头。

### 模型入场预设

- **Fade In**：淡入
- **Scale Pop**：缩放弹出
- **Flip**：翻转进入
- **Slide In**：滑入

### 缓动类型

- **Linear**：线性
- **Ease In/Out**：缓入缓出
- **Bounce**：弹跳
- **Elastic**：弹性

### 循环表达式

为图层添加持续循环动画：
- **Spin**：绕轴旋转（可选 X/Y/Z 轴，可调速度）
- **Float**：上下浮动（可调振幅和频率）
- **Breathe**：呼吸缩放效果（可调振幅和频率）

### 自动对齐地面工具

在 AE 中手动对齐 3D 模型和地面非常繁琐。为此，插件在 **Animation** 标签页底部的 AE 侧动画部分提供了两个一键辅助按钮：
- **对齐模型到地面 (Align Model to Ground)**：脚本会自动计算选中 3D 模型的位置、锚点及缩放比例，利用 `sourceRectAtTime` 精确获取模型包围盒的底部边缘，并将模型完美贴合到地面层 (`Tripo4AE_Ground`) 的 Y 轴高度上。
- **对齐地面到模型 (Align Ground to Model)**：将地面层 (`Tripo4AE_Ground`) 的 Y 轴位置调整为贴合模型底端边缘，使地面跟随模型底部。

### HDRI 环境与阴影设置

要想在 AE 2026 Advanced 3D 渲染器中表现出真实的 PBR 材质质感、环境反射和阴影关系，请注意以下机制：
1. **环境光 (Environment Light)**：通过面板创建带 HDRI 贴图的环境光时，插件会自动将背景可见性属性 (`ADBE Light Backgd Visible`) 设为开启 (1)，使 HDR 图像作为背景天幕可见。
2. **环境光遮蔽 (AO) 与阴影**：环境光默认开启了 **Casts Shadows**（投影）。这十分关键，能够在使用 HDRI 的同时，计算模型与地面、模型自身各部件之间的接触阴影（Ambient Occlusion），避免模型在全局环境光照下显得“发飘”。
3. **三点布光 Z 轴校正**：默认的三点布光（主光、补光、轮廓光）已校正 Z 轴逻辑。主光和补光在模型前方（Z 轴负方向），轮廓光在模型后方（Z 轴正方向）。主光的 shadow darkness 提高到 80%，以保证清晰的定向投影。
4. **影子接收地面**：创建的地面层 (`Tripo4AE_Ground`) 默认设定为较淡的灰色 (`[0.85, 0.85, 0.85]`)，且接收阴影 (Accepts Shadows) 属性设为 **开启 (On)**（而非 "Only"）。这使得地面网格在合成中可见，同时又可以干净、清晰地投射出模型的阴影。

### 保存模板

配置好动画参数后，输入模板名称点击 **Save**，下次可直接从模板加载。

---

## 10. 完整工作流示例

### 示例 1：文本生成角色 + 动画

```
Generate (Text)                    → 输入 "a cartoon robot character"
    ↓
Import to AE                       → 模型出现在合成中
    ↓
Animation → Pre-Rig Check          → 确认可绑定（Biped）
    ↓
Animation → Rig (Biped, GLB)       → 自动导入绑定模型
    ↓
Animation → Retarget               → 选择 walk + wave
    ↓
Animation → AE Animation           → 添加 Orbit 摄像机 + Spin 表达式
```

### 示例 2：图片转 3D + 纹理替换

```
Generate (Image)                   → 上传产品照片
    ↓
Import to AE                       → 导入基础模型
    ↓
Refine & Texture → Refine          → 升级模型质量
    ↓
Refine & Texture → Texture (Text)  → "brushed steel with blue tint"
    ↓
自动导入 AE                         → 新纹理模型替换到合成
```

### 示例 3：风格化 + 导出打印

```
Generate (Text)                    → "a small dragon figurine"
    ↓
Import to AE
    ↓
Transform → Stylize (Lego)         → 转换为乐高风格
    ↓
Transform → Convert (STL)          → 导出为 STL 用于 3D 打印
```

---

## 11. 常见问题

### Q: 插件面板打不开？

1. 确认已运行 `defaults write com.adobe.CSXS.12 PlayerDebugMode 1`
2. 确认已运行 `npm run build && npm run symlink`
3. 完全退出并重启 After Effects
4. 检查菜单 窗口 → 扩展 → Tripo4AE

### Q: 生成一直卡在 0%？

- 检查网络连接
- 确认 API Key 有效且有剩余积分
- 面板会自动恢复未完成的任务（关闭重开面板即可）

### Q: 导入模型后看不到？

1. 确认合成使用的是 **Advanced 3D** 渲染器（合成设置 → 3D 渲染器）
2. 检查图层是否开启了 3D 开关
3. 调整摄像机视角 — 模型可能不在可视范围内
4. 使用 Animation 标签页创建摄像机

### Q: 材质看起来不对？

1. 确保 Advanced 3D 渲染器已激活。
2. 展开 Material Options 检查属性，或者使用 **Animation** 标签页底部的 **Advanced PBR Material Options** 面板：点击 **Read from Selected Layer** 加载当前属性，调整后再点击 **Apply PBR Properties** 应用。
3. 添加环境光（Refine & Texture 或 Animation 标签页）让 PBR 材质正确渲染。环境光是 Advanced 3D 必不可少的照明来源。

### Q: 模型太大或太小？

- 在 AE 中选中图层，使用 `S` 键调整 Scale
- 生成时可设置 `face_limit` 控制模型复杂度

### Q: Element 3D 导入模式下没有自动加载模型？

- **原因**：Element 3D 插件由于没有向 ExtendScript 提供直接设置模型路径的接口，因此插件无法完成 "一键加载入场景" 的最后一步。
- **解决方法**：插件已自动为您把模型转为 E3D 专用的 OBJ 并放置在 `~/Documents/VideoCopilot/Models/Tripo4AE/` 文件夹下。您只需在新建的 `Tripo4AE_E3D` 图层的效果控件面板点击 **Scene Setup** -> 在左侧的 Model Browser 展开 **Models** -> **Tripo4AE** 文件夹，双击即可载入刚刚下载好的模型，所有的纹理材质都已自动对齐。

### Q: 积分消耗？

每次 API 调用都会消耗积分，消耗量取决于操作类型：
- 文本/图片生成模型：较高
- 精修、纹理、动画：中等
- 转换、风格化：较低

生成结果页面会显示本次任务消耗的积分数量。

### Q: 支持哪些 3D 格式导入？

**Tripo 生成**：GLB（默认，推荐）

**外部导入**（Library → Import External）：GLB、GLTF、FBX、OBJ、ZIP

**格式转换导出**：FBX、OBJ、GLTF、USDZ、STL、3MF

---

## 键盘快捷参考

| 快捷键 | 操作 |
|--------|------|
| AE 中 `S` | 缩放选中的 3D 模型图层 |
| AE 中 `P` | 显示位置属性 |
| AE 中 `R` | 显示旋转属性 |
| AE 中 `T` | 显示不透明度 |
| AE 中 `UU` | 显示所有修改过的属性 |

---

## 模型文件存储位置

所有下载的模型保存在：

```
~/Documents/Tripo4AE/Models/
```

动画模板保存在浏览器的 localStorage 中。
