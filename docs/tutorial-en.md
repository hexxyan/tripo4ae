# Tripo4AE Tutorial

A complete walkthrough from AI-generated 3D models to your After Effects composition.

---

## Table of Contents

1. [Installation & Setup](#1-installation--setup)
2. [Connecting to Tripo API](#2-connecting-to-tripo-api)
3. [Generating 3D Models](#3-generating-3d-models)
4. [Importing into After Effects](#4-importing-into-after-effects)
5. [Refining & Texturing](#5-refining--texturing)
6. [Rigging & Animation](#6-rigging--animation)
7. [Stylizing & Transforming](#7-stylizing--transforming)
8. [Model Library](#8-model-library)
9. [AE Built-in Animations](#9-ae-built-in-animations)
10. [Complete Workflow Examples](#10-complete-workflow-examples)
11. [FAQ](#11-faq)

---

## 1. Installation & Setup

### Prerequisites

- After Effects 2024 or later (AE 2025/2026 recommended)
- Node.js 18+ and npm 9+
- A [Tripo API Key](https://platform.tripo3d.ai/) (sign up to get one)
- (Optional) [Video Copilot Element 3D](https://www.videocopilot.net/products/element2/) plugin installed in After Effects if you intend to use the Element 3D workflow.

### Installation

```bash
# Clone and install
git clone <repo-url> tripo4ae
cd tripo4ae
npm install

# Enable unsigned CEP extensions (macOS)
# AE 2024/2025 → CSXS.11, AE 2026 → CSXS.12
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

# Build and symlink to Adobe extensions directory
npm run build
npm run symlink
```

Restart After Effects. Open the panel via **Window → Extensions → Tripo4AE**.

> **Tip**: Use `npm run dev` for hot-reload during development.

---

## 2. Connecting to Tripo API

1. Open the Tripo4AE panel
2. Enter your Tripo API Key in the header input
3. Click **Connect**
4. On success, the status dot turns green and your credit balance appears

Your API Key is persisted in localStorage — no need to re-enter it next session.

---

## 3. Generating 3D Models

Open the **Generate** tab. Three input modes are available:

### Mode 1: Text to 3D

1. Click **Text** in the mode toggle
2. Describe your desired model in the Prompt field, e.g.:
   - "a cute cartoon cat sitting on a chair"
   - "futuristic sci-fi helmet with glowing visor"
3. (Optional) Fill in Negative Prompt to exclude unwanted elements
4. (Optional) Pick a style preset (Clay, Steampunk, Christmas, Barbie, Gold, Ancient Bronze, etc.)
5. Adjust parameters in the expandable panel:
   - **Model Version**: v3.1 (latest high-quality) or Turbo (fast draft)
   - **Face Limit**: Low (3k), Medium (10k), High (20k), or Auto
   - **PBR**: Enable for physically-based rendering materials
   - **Quad**: Generate quad meshes
   - **Quality**: standard / detailed
   - **Seeds**: Set model/texture seeds for reproducible results
6. Click **Generate** and watch the progress bar

### Mode 2: Image to 3D

1. Click **Image** in the mode toggle
2. Drag-and-drop or click to upload a reference image (PNG, JPG supported)
3. The image uploads to Tripo cloud automatically
4. Adjust parameters and click **Generate**

> **Tip**: Cleaner backgrounds and sharper images produce better results.

### Mode 3: Multiview to 3D

1. Click **Multiview** in the mode toggle
2. Upload front, left, back, and right view images (at least one required)
3. Click **Generate**

> **Tip**: More views = better model quality.

---

## 4. Importing into After Effects

After generation completes, the result preview shows a rendered image and task details. The plugin supports two core import workflows (switched on the Generate tab):

### 1. Native Advanced 3D Workflow (Recommended)

Directly imports the `.glb` model as a native AE 2024+ **3D Model Layer**. Clicking **Import to AE** will:
1. Download the GLB model to your local `~/Documents/Tripo4AE/Models/` directory.
2. Import the asset and create a 3D model layer, centering it in the active composition.
3. Switch the composition's renderer to **Advanced 3D** (Mercury 3D Engine) automatically.
4. Enable Time Remap on the layer to allow playing embedded skeletal animations.
5. Save the task details into the local Library.

> **Tip**: If no composition is open, the plugin automatically creates a default 1920×1080, 10s, 30fps composition.

### 2. Element 3D Workflow (Third-Party Plugin)

For designers who prefer using Video Copilot Element 3D. Due to API limitations on third-party closed-source plugins, the plugin performs an asset injection and layer setup:
1. The panel initiates a Tripo API `convert_model` task to convert the model to the E3D-compatible `.obj` format with PNG/JPG textures.
2. Once converted, the OBJ model and textures are downloaded to the Element 3D user assets directory: `~/Documents/VideoCopilot/Models/Tripo4AE/<TaskID>/`.
3. A solid layer named `Tripo4AE_E3D` is automatically created in the active composition.
4. The Video Copilot Element 3D effect plugin is automatically applied to this layer.
5. You will be prompted to click **Scene Setup** in the E3D effect controls -> expand **Models** -> **Tripo4AE** in the model browser, and double-click the model to load it.

### Automatic Import (Pipeline Operations)

Pipeline tasks in Refine, Texture, Animation, and Transform tabs (such as rigging or animation retargeting) automatically follow the active import workflow. They will download, convert, and insert the results into AE without requiring manual clicks.

---

## 5. Refining & Texturing

Open the **Refine & Texture** tab.

### Refine Model

Upgrade a draft model to higher quality:

1. Select a completed model step from the **Source Model** dropdown
2. Click **Refine**
3. The refined model is automatically imported to AE

### Apply Texture

Apply new PBR textures to an existing model:

1. Select a source model
2. Choose a texture input mode:
   - **Text**: Describe the texture, e.g. "rusty metal with scratches"
   - **Image**: Upload a reference photo
   - **Style**: Upload a style reference image
3. Adjust texture parameters:
   - **Texture Quality**: standard / detailed / extreme
   - **PBR**: Enable for PBR material maps
   - **Bake**: Bake textures onto the mesh
   - **Texture Alignment**: geometry (follow geometry) or original_image (align to source image)
4. (Optional) Enter Part Names to texture specific parts, e.g. "body, head, arms"
5. Click **Apply Texture**

---

## 6. Rigging & Animation

Open the **Animation** tab.

### Step 1: Pre-Rig Check

1. Select a pipeline model in **Source Model**
2. Click **Check Rig-ability**
3. Check the result: whether it's riggable and the detected rig type

### Step 2: Rig the Model

1. Choose a **Rig Type**:
   - **Biped**: Humanoid
   - **Quadruped**: Four-legged animal
   - **Hexapod**: Six-legged
   - **Octopod**: Eight-legged
   - **Avian**: Bird
   - **Serpentine**: Snake
   - **Aquatic**: Fish
2. Select output format (GLB or FBX) and rig spec (Tripo or Mixamo)
3. Click **Rig Model**
4. The rigged model is automatically downloaded and imported to AE

### Step 3: Retarget Animation

Apply preset animations to a rigged model:

1. Browse the categorized animation list and select up to 5:
   - **Basic**: idle, walk, run, jump, fall, dive, climb/flip
   - **Combat**: slash, shoot, hurt
   - **Dance**: 6 different dance moves
   - **Performance**: sing, clap, cheer, laugh, cry, bow, wave, etc.
   - **Sports**: golf, basketball, volleyball, swim, surf
   - **Daily**: sit, hug, scratch, phone
   - **Cross-Species**: Universal animations for non-biped rigs
2. (Optional) Check **Animate in Place** to keep the character in position
3. Click **Retarget**
4. The animated model is automatically imported to AE

> **Note**: You must Rig first, then select the Rig result as the Source Model before Retargeting.

### Step 4: Advanced PBR Material Controls (Advanced PBR Material Options)

For imported Native 3D layers, you can fine-tune PBR materials dynamically in the **Advanced PBR Material Options** section at the bottom of the **Animation** tab.

> [!WARNING]
> **GLB Material Limitation**: Imported GLB models usually have baked-in textures. AE's native PBR material sliders (such as metal, roughness, diffuse, etc.) *do not* override baked texture maps. Tweak options will only visually affect areas without baked textures, or apply baseline offsets. A notice is provided in the UI for clarity.

1. **Read from Layer**: Select a 3D model layer in AE and click **Read from Selected Layer**. The sliders will automatically fetch and sync all 10 physical material values from the AE layer.
2. **Parameters & Value Ranges**:
   - Sliders map the AE `0.0 - 1.0` floats to user-friendly `0% - 100%` percentages.
   - Adjust options include: Ambient, Diffuse, Specular Intensity, Specular Shininess (Roughness), Metal, Light Transmission, Reflection Intensity, Reflection Sharpness, Transparency, and physical Index of Refraction (IOR, 1.0 to 3.0).
3. **Apply Modifications**: After tweaking, click **Apply PBR Properties**. The values are instantly written back to the selected AE layer, saving you from navigating complex timeline property groups.

---

## 7. Stylizing & Transforming

Open the **Transform** tab.

### Stylize

Convert models into specific artistic styles:

1. Select a source model
2. Choose a style:
   - **Lego**: Building block style
   - **Voxel**: Voxel art style
   - **Voronoi**: Voronoi diagram style
   - **Minecraft**: Blocky pixel style (adjustable block size)
   - **Keyring**: Keychain charm
   - **Fridge Magnet**: Refrigerator magnet
   - **Keycap**: Mechanical keyboard keycap
3. Click **Stylize**

### Mesh Editing

- **Segment Mesh**: Automatically separate mesh into labeled parts
- **Complete Mesh**: Fill in missing mesh sections (optionally specify part names)
- **Simplify / High-to-Low Poly**:
  - Regular simplification with face count control
  - **High-Poly to Low-Poly**: Decimate + normal map baking
  - Optional quad mesh output
  - Configurable face limit

### Format Conversion

Export models to other formats:

1. Choose a format: FBX, OBJ, GLTF, USDZ, STL, or 3MF
2. Configure options:
   - **Quad**: Quad mesh output
   - **With Animation**: Preserve animation data
   - **Face Limit**: Max face count
   - **Texture Size**: Texture resolution
   - **FBX Preset** (FBX only): Blender / 3ds Max / Mixamo / Bake Scale
3. Click **Convert**

---

## 8. Model Library

Open the **Library** tab.

### Model List

All models imported through the plugin are tracked in the library with:
- Thumbnail preview
- Model name and format
- Creation timestamp
- Pipeline step indicators (colored dots: green = success, yellow = running, red = failed)

### Actions

- **Import**: Re-import a model into the current composition (uses cached local file).
- **X**: Remove from library (does not delete downloaded files).
- **Import External**: Import an external GLB, GLTF, FBX, OBJ, or ZIP file through the Tripo API pipeline.

### Cloud Generation History

A specialized list fetches your complete generation history directly from the Tripo Cloud:
- **Prevent Asset Loss**: Since it synchronizes directly with your account, it displays past successful generations even if you clear your browser's local cache or reinstall the plugin.
- **Redownload past models**: You can click download on any past generation to download the model asset locally and immediately inject it into your After Effects workspace without spending extra credits.

### Animation Templates

Templates saved from the Animation tab appear in the **Animation Templates** section at the bottom. Click any template to load its configuration.

---

## 9. AE Built-in Animations

In the **Animation** tab, scroll to the **AE Animation (Local)** section. These animations run entirely within AE — no API calls needed.

### Camera Presets

Choose a camera movement preset. The plugin automatically creates or reuses a 3D Null controller rig (`Tripo4AE_CameraCtrl`) at the composition center, parents the camera to it, and animates the Null layer. This avoids gimbal lock and provides smooth orbital motion:
- **Orbit**: Circular orbit around the model by animating the Y-rotation of the Null layer.
- **Push**: Push in toward the model by animating the Z-position.
- **Track**: Side-to-side tracking shot by animating the X-position.
- **Jib**: Vertical jib movement by animating the Y-position.

### Model Entrance Presets

- **Fade In**: Opacity transition from 0% to 100%
- **Scale Pop**: Scale from 0% → 110% → 100% for a bouncy entrance
- **Flip**: Rotate 90° → 0° on Y axis
- **Slide In**: Slide in from the left

### Easing Types

- **Linear**: Constant speed
- **Ease In/Out**: Smooth acceleration/deceleration
- **Bounce**: Bounce at the end
- **Elastic**: Overshoot with elasticity

### Loop Expressions

Add continuous looping animations to the layer:
- **Spin**: Rotate around an axis (choose X/Y/Z, adjust speed)
- **Float**: Gentle up-and-down oscillation (adjust amplitude and frequency)
- **Breathe**: Rhythmic scale pulsation (adjust amplitude and frequency)

### Auto-Align Ground Options

Aligning 3D models to a ground plane in After Effects can be tedious due to varying model bounding boxes. The plugin provides automated helper buttons on the **Animation** tab:
- **Align Model to Ground**: Automatically calculates the bottom bounding box boundary of your selected 3D model (using `sourceRectAtTime` with scale and position factor scaling) and snaps the model's bottom perfectly to the Y-position of the ground layer (`Tripo4AE_Ground`).
- **Align Ground to Model**: Moves the ground solid layer (`Tripo4AE_Ground`) upward or downward to perfectly contact the bottom of the 3D model.

### HDRI Environment & Shadows

To get realistic PBR materials, reflections, and contact shadows in AE's Advanced 3D renderer:
1. **Environment Light**: When creating an environment light with an HDR path, the plugin automatically registers it as a native Environment Light, sets the background visibility (`ADBE Light Backgd Visible`) to On, and imports the HDR image to act as a 3D skybox.
2. **Ambient Occlusion (AO)**: Crucially, the Environment Light has **Casts Shadows** enabled. This generates ambient occlusion and soft contact shadows on the ground catcher solid, preventing your model from looking washed out under environmental lighting.
3. **Key Light Shadows**: The default three-point lighting setup places Key and Fill lights in front of the model (negative Z) and Rim light behind (positive Z). The Key Light has shadow darkness set to 80% to produce strong, clean directional shadows.
4. **Shadow Catcher Floor**: The ground floor layer (`Tripo4AE_Ground`) is colored light gray (`[0.85, 0.85, 0.85]`) and has **Accepts Shadows** set to **On** (instead of "Only") so that it remains visible in the composition space while clearly catching model shadows.

### Saving Templates

After configuring your animation settings, enter a name and click **Save** to store the template. Click any saved template to restore its settings instantly.

---

## 10. Complete Workflow Examples

### Example 1: Text-to-Character with Animation

```
Generate (Text)                    → Type "a cartoon robot character"
    ↓
Import to AE                       → Model appears in the composition
    ↓
Animation → Pre-Rig Check          → Confirms riggable (Biped)
    ↓
Animation → Rig (Biped, GLB)       → Rigged model auto-imported
    ↓
Animation → Retarget               → Select walk + wave animations
    ↓
Animation → AE Animation           → Add Orbit camera + Spin expression
```

### Example 2: Image-to-3D with Texture Swap

```
Generate (Image)                   → Upload a product photo
    ↓
Import to AE                       → Base model imported
    ↓
Refine & Texture → Refine          → Upgrade model quality
    ↓
Refine & Texture → Texture (Text)  → "brushed steel with blue tint"
    ↓
Auto-import to AE                  → Re-textured model in composition
```

### Example 3: Stylize for 3D Printing

```
Generate (Text)                    → "a small dragon figurine"
    ↓
Import to AE
    ↓
Transform → Stylize (Lego)         → Convert to Lego style
    ↓
Transform → Convert (STL)          → Export as STL for 3D printing
```

---

## 11. FAQ

### Q: The panel won't open?

1. Confirm you ran `defaults write com.adobe.CSXS.12 PlayerDebugMode 1`
2. Confirm you ran `npm run build && npm run symlink`
3. Fully quit and restart After Effects
4. Check **Window → Extensions → Tripo4AE**

### Q: Generation is stuck at 0%?

- Check your internet connection
- Verify your API Key is valid and has remaining credits
- The panel auto-resumes incomplete tasks — try closing and reopening the panel

### Q: Can't see the imported model?

1. Make sure the composition uses the **Advanced 3D** renderer (Composition Settings → 3D Renderer)
2. Check that the layer's 3D switch is enabled
3. Adjust the camera — the model might be out of view
4. Create a camera using the Animation tab's camera presets

### Q: Materials look wrong?

1. Ensure the Advanced 3D renderer is active.
2. Expand Material Options in AE, or use the **Advanced PBR Material Options** panel at the bottom of the **Animation** tab: click **Read from Selected Layer** to load properties, tweak, and click **Apply PBR Properties**.
3. Add an environment light (via Refine & Texture or Animation tabs) to enable proper PBR rendering. Environment lights are required for image-based reflections and lighting in Advanced 3D.

### Q: Model is too large or too small?

- Select the layer in AE and press `S` to adjust Scale
- Use the `face_limit` parameter during generation to control complexity

### Q: Why isn't the model automatically loaded in Element 3D?

- **Reason**: Video Copilot's Element 3D does not expose a public scripting API to programmatically set model asset paths inside the scene.
- **Solution**: The plugin has converted your asset to OBJ and saved it in `~/Documents/VideoCopilot/Models/Tripo4AE/`. Select the created `Tripo4AE_E3D` layer, go to the Effect Controls panel, click **Scene Setup**, expand **Models** -> **Tripo4AE** in the Model Browser, and double-click the corresponding model to load it with all textures automatically matched.

### Q: Credit costs?

Each API call consumes credits. Cost varies by operation:
- Text/Image-to-Model generation: higher
- Refine, texture, animation: moderate
- Convert, stylize: lower

The generation result page displays the credits consumed for each task.

### Q: What 3D formats are supported?

**Tripo output**: GLB (default, recommended)

**External import** (Library → Import External): GLB, GLTF, FBX, OBJ, ZIP

**Format conversion export**: FBX, OBJ, GLTF, USDZ, STL, 3MF

---

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `S` in AE | Scale the selected 3D model layer |
| `P` in AE | Show Position property |
| `R` in AE | Show Rotation property |
| `T` in AE | Show Opacity |
| `UU` in AE | Show all modified properties |

---

## File Storage Location

Downloaded models are saved to:

```
~/Documents/Tripo4AE/Models/
```

Animation templates are stored in the browser's localStorage.
