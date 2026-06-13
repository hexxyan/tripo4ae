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

1. 打开 Tripo4AE 面板，在顶部找到 API Key 输入框。
2. **连接引导**：如果您还没有 API Key，可以点击输入框下方的链接 **“点此注册 Tripo 获取免费积分”** 直接跳转到官网注册。
3. 输入您的 Tripo API Key（API Key 格式通常以 `tsk_` 开头）。
4. 点击 **连接 (Connect)** 按钮。
5. **错误校验排查**：
   - 插件内置了格式自动验证，不符合格式的 Key 会直接提示格式错误。
   - 如果余额为 0，会显示余额不足警告，提醒您前往官网充值。
   - 如果遇到连接中断、超时或 401 密钥失效，界面会给出清晰的网络和授权故障提示。
6. 连接成功后，状态指示灯变为绿色，右侧显示可用积分余额。

API Key 会自动保存，下次打开面板无需重新输入。

---

## 3. 生成 3D 模型

打开 **Generate**（生成）标签页，插件提供三种输入模式：

- **文本生成 3D (Text)**
- **单图生成 3D (Image)**
- **多视图生成 3D (Multiview)**

> [!TIP]
> **极简设置与高级选项**：
> 为避免干扰设计师，面数限制 (Face Limit)、网格四边形化 (Mesh Quad)、生成种子 (Model Seed) 等底层 3D 渲染控制技术参数默认收折在 **“高级选项 (Advanced Options)”** 折叠面板内。设计师仅需输入描述词或拖入参考图片即可点击生成，大幅减轻界面认知负担。

---

## 4. 导入 After Effects

生成完成后，结果预览区现在集成了**交互式 WebGL 3D 预览视口**。您可以直接用鼠标左键拖拽旋转模型、右键拖拽平移、滚轮缩放，从而在导入 AE 前全方位、动态地检查模型结构和贴图质量。

与旧版在生成前指定工作流不同，为了方便设计师在看到最终生成质量后再决定导入方式，**导入工作流选择器移到了生成结果下方**。模型生成成功后，插件会呈现三个并列的导入控制按钮：

### 1. 原生 3D 图层 (AE Native / Advanced 3D)

直接将 `.glb` 三维模型导入为 AE 2024+ 的原生 **3D Model Layer**。点击该按钮会执行：
1. 下载 GLB 模型至本地 `~/Documents/Tripo4AE/Models/` 目录。
2. 自动导入项目并创建 3D 模型图层，居中放置在当前合成中。
3. 自动将合成的 3D 渲染器切换为 **Advanced 3D**（Mercury 3D Engine）以正确显示材质反射。
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

### ✨ 一键自动绑定动作向导 (One-Click Rig & Animate Wizard) - 强烈推荐！

插件提供了一个智能的 **“一键自动绑定动作向导 (Magic Animate)”** 功能，将原本繁琐的 3 步操作合并为一键：

1. **选择模型与动作**：在 **Source Model** 中选择生成的草稿模型，在动作列表中选中想要应用的动画预设（最多选择 5 个），并可根据需要选择是否“原地动画”。
2. **启动一键向导**：点击 **“一键自动绑定动作 (Magic Animate)”**。
3. **后台链式流转**：插件将全自动运行以下全部云端流程，无需您逐步干预：
   - 自动提交骨骼绑定可行性分析 (`Check Rig`) 并且确认通过。
   - 自动提交骨骼绑定任务 (`Rig Model`)，实时追踪进度并自动下载绑定后的 GLB 模型。
   - 自动将绑定好的角色与所选的动作列表提交动画重定向服务 (`Retarget`)。
   - 动画生成完成后，自动下载最终生成的动画 GLB 模型，并一键导入 After Effects 的当前合成。
   - 自动在 AE 图层上设置好时间重映射，并写入循环表达式。

如果您希望分步细微控制，您也可以在面板下方使用传统的三步流程：

### 传统步骤一：检查可绑定性（Pre-Rig Check）

1. 在 **Source Model** 中选择一个管线模型
2. 点击 **Check Rig-ability**
3. 查看结果：是否可绑定（Riggable）以及检测到的骨骼类型

### 传统步骤二：绑定骨骼（Rig）

1. 选择 Rig Type（骨骼类型，如 Biped 双足人形、Quadruped 四足等）
2. 选择输出格式（GLB 或 FBX）和骨骼规范（Tripo 或 Mixamo）
3. 点击 **Rig Model** 按钮进行下载导入。

### 传统步骤三：重定向动画（Retarget）

1. 从基本、战斗、舞蹈、表演、体育、日常生活等分类中选中动画预设。
2. （可选）勾选 **Animate in Place** 让角色原地动画
3. 点击 **Retarget**，带动作的模型自动导入 AE（Retarget 前需先完成 Rig 并选择 Rig 结果）。

### 动作热重定向与防滑步幅同步

当角色动作导入 AE 后，您可以快速热替换动作或解决移动时的滑步现象：
1. **时间线快速动作热重定向 (Quick Motion Hot-Swap)**：在 Source Model 中选择当前模型，选中新动作（如跳舞、奔跑），点击 **“一键替换动作 (Apply Hot-Swap Action)”**。面板将自动调用接口、下载动作 GLB、复制项目素材以隔离图层，并一键完成源文件热替换。
2. **防滑步移动同步 (Anti-Sliding Walk Sync)**：若您的角色在走动时“脚底打滑”，选中图层，使用滑块设定角色的位移速度，点击 **“应用防滑步位移同步 (Apply Anti-Sliding Walk Sync)”**。这将在图层的 Position 属性上注入智能表达式，动态匹配行走动画的速率与真实位移，消除滑步穿帮。

### 3D 骨骼关节运动轨迹提取

将模型动画中的骨骼运动轨迹转换为 AE 中的 3D 关键帧空图层：
1. **自动扫描骨骼**：当您选中模型时，面板会在后台通过 Three.js 解析 GLB，并将骨骼列表中所有的骨头名称自动载入**“选择骨骼关节 (Select Joint Bone)”** 下拉列表中（若扫描失败会默认显示 `mixamorig:Head` 等标准骨头）。
2. **一键生成追踪点**：在列表中选中您想要提取的骨骼（如 Head 头部、RightHand 右手、LeftFoot 左脚），点击 **“一键提取关节为 3D 空图层 (Extract Joint to 3D Null)”**。
3. **坐标自适应对齐**：面板会自动获取 AE 当前合成的帧率与时间范围，通过 Three.js 逐帧计算出该骨头在三维坐标系下的全局位置。通过在 Y 和 Z 轴进行方向反转，并根据模型 AE 的包围盒高度计算出精确缩放比，最后自动在 AE 中生成一个绑定在此模型图层下的 3D Null 图层，并写入像素级位置关键帧。您可以在此 Null 图层上直接挂载 3D 粒子、灯光、文字或特技效果。
4. **特效粒子一键绑定 (VFX Bridge)**：为了方便一键在关节 Null 上挂载特效，可以使用该栏目下的两个功能：
   - **一键绑定 3D 点光源**：自动创建 3D 点光源图层并对齐、父级关联至提取出来的关节 Null。
   - **一键绑定粒子发射器**：自动创建粒子发射器图层。如果安装了 Trapcode Particular，将自动在 Null 下创建一个名为 `Emitter` 的点光源，Particular 会自动识别其为粒子发射源；如果未安装 Particular，则自动退回到原生的 **CC Particle World**，并注入归一化坐标表达式，使粒子生成位置完美对齐 Null 的运动轨迹。


### PBR 多通道材质贴图导出

将 GLB 模型中封装 PBR 材质贴图单独提取并导入 AE：
1. 选中对应的 Source Model，点击 **“导出贴图并导入项目 (Export & Import Textures)”**。
2. 插件将自动解析模型中的 `MeshStandardMaterial`，提取出 Diffuse (颜色)、Normal (法线)、Roughness (粗糙度)、Metalness (金属度)、AO (环境光遮蔽) 以及 Emissive (自发光) 等通道贴图。
3. 借助 HTML5 Canvas 将它们保存为 PNG 图片格式写在本地磁盘，然后调用 JSX 接口自动把这些贴图全部导入 AE 的项目面板，并统一归档在 `"Tripo4AE_Textures"` 文件夹下，方便在 Element 3D 等第三方贴图通道中直接调用。

---

## 7. 三维场景光影控制与 PBR 材质调节

### 1. 实时光影控制 (Real-Time Lighting & Shadow Controls)
在 **Animation** 面板的 **“场景搭建 (Scene Setup)”** 下，我们支持对合成中的三维光影进行实时调控：
- **场景搭建 (Setup Scene)**：一键在当前合成中配置一台空对象摄像机控制架、三点照明和环境贴图（HDR）。
- **实时调节滑块**：无需重新创建，可以直接拖动以下滑块实时回写 AE 图层属性值：
  - **环境光强度 (Environment Intensity)**
  - **主光水平角度 (Key Light Angle)** 与 **主光灯光强度**
  - **阴影黑度/浓度 (Shadow Darkness)** 与 **投影扩散/软化 (Shadow Diffusion/Softness)**
- **视觉 HDR 卡片画廊 (New!)**：内置 8 款写实的 CC0 免版权 HDR 预设（如 Studio Soft 棚拍柔光、Sunset Glow 夕阳金辉、City Lights 都市霓虹等），卡片自带影调色彩渐变缩略图和中文描述，点击卡片即自动下载和加载为环境反射贴图。
- **三维摄影棚灯光组 (New!)**：提供 4 种一键式专业灯光预设卡片（柔光影棚、戏剧轮廓光、赛博霓虹、情绪化电影），自带对应环境色彩渐变卡片。点击即可瞬间在 AE 合成中创建与之匹配的高级三点照明灯光组。
- **地面底面自动对齐 (New!)**：点击“搭建三维环境”或“对齐模型到地面”，插件会自动寻找 3D 模型底面边缘，将投影地面（Shadow Catcher）精确定位在其脚底，省去手动对齐。

> **注意**：Retarget 操作前需要先完成 Rig 步骤，并将 Rig 结果选为 Source Model。

### 第四步：高级 PBR 材质控制 (Advanced PBR Material Options)

对于导入 AE 的 Native 3D 图层，除了应用基础材质预设外，还可以在 **Animation** 页面下方的 **Advanced PBR Material Options** 区域进行精细化调节。

- **材质预设卡片画廊 (New!)**：提供了 8 款物理仿真材质预设卡片（如玻璃、铬合金镜面金属、黄金、哑光树脂、翡翠玉石、拉丝红铜等）。点击卡片将自动在 AE 选中图层上应用对应材质（例如黄金 preset 开启 100% 金属度和 95% 高光反射；翡翠 preset 设定 20% 透光度和 10% 透明度等），同时滑块面板状态实时对齐，实现一键高拟真渲染。

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

### 实景摄像机对齐与阴影捕捉 (Matchmoving & Compositing)

将生成的 3D 模型与实景视频的摄像机追踪点对齐：
1. **对齐并绑定追踪点 (Bind to Tracker)**：将 3D 模型图层作为子图层绑定到任意活动的 3D Tracker Null（如 Mocha AE 反求出的空图层或 AE 原生 3D 摄像机跟踪器的三维点）。在面板的 **“选择追踪图层 (Select Tracker Layer)”** 下拉框中选中该追踪 Null，点击 **“绑定对齐 (Align & Bind to Tracker)”**，模型图层的相对坐标将清零并完美锁定到追踪点。
2. **生成阴影捕捉器 (Create Shadow Catcher)**：选中追踪图层，点击 **“生成阴影捕捉器 (Create Shadow Catcher)”**。插件会自动生成一个水平的 3D 固态层并建立父子级，该固态层已被预配置为 **“接受阴影：仅限 (Accepts Shadows: Only)”** 和 **“接受灯光：开启”**，能把 3D 模型落地的阴影无缝融合进实景视频中。

### 智能光影匹配 (Intelligent Lighting Match)

自动让 3D 模型的渲染光影融入实景视频的色彩中：
1. 选中模型，点击 **“智能光影匹配 (Match Lighting)”**。
2. 插件将自动把当前时间下的合成帧画面导出为临时 PNG 文件，在后台通过 HTML5 Canvas 提取画面的 Key Light (主光源色)、Fill Light (辅助光色)、Ambient Light (环境光色)，并自动在 AE 中构建匹配的三点光源预设组（`Tripo4AE_Smart_Key` 等），省去人眼对色的繁杂步骤。

### 视口性能代理 (Viewport Performance Proxy)

一键切换低模代理，彻底解决复杂模型在 AE 时间线实时预览和回放卡顿的问题：
1. **生成低模**：在 Transform 标签页中先运行一次“网格简化 (Mesh Simplification / High-to-Low Poly)”生成简化后的低模。
2. **开启代理**：在下拉框中选中模型，点击 **“Toggle Proxy”**，插件将自动将项目面板中对应图层的素材文件源热替换为简化的低模 GLB，提高合成预览回放帧率。
3. **还原原模**：最终渲染导出前，点击 **“Restore Original”** 即可一键热替换回无损的高模，保证最终渲染的画质。

---

## 8. 模型库管理与本地预览

打开 **Library**（模型库）标签页。

### 🔍 分类筛选与快速检索 (Search & Filters)
当生成的模型数量较多时，可以使用顶部的检索栏进行资产管理：
- **搜索输入框**：支持对模型的提示词（Prompt）或自定义名称进行不区分大小写的全局文本检索。
- **分类过滤芯片 (Filter Chips)**：
  - **全部 (All)**：显示所有本地资产。
  - **已导入 AE (Imported)**：仅筛选当前处于活动渲染工作流中的图层模型。
  - **带动画 (Animated)**：仅筛选绑定了骨骼或经过 Retarget 动作处理的资产。
  - **风格化 (Stylized)**：仅筛选应用了乐高 (Lego)、体素 (Voxel)、Minecraft 等风格化特效的资产。

### 👁️ 本地 WebGL 三维预览 (Local 3D Preview)
在已下载模型卡片右侧，除了常规的导入和删除外，增加了一个 **预览 (👁️)** 按钮：
- **运行机制**：点击该按钮将弹出一个轻量级 WebGL 预览视窗。插件会在后台使用 Node.js `fs` 直接读取本地 GLB 二进制资产，转化为高速内存 Blob URL 送入 GLTFLoader 加载。
- **操作方式**：在预览窗口内，您可以通过 **鼠标拖拽旋转**、**鼠标滚轮缩放** 模型，直观检查其形状、网格精度和 PBR 反射效果。
- **性能优化**：关闭预览视口时，插件会全量自动注销 WebGL 资源、材质、贴图及 Blob 内存，杜绝 AE 内存泄漏风险。

### 传统操作

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
