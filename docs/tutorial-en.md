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

# Enable unsigned CEP extensions
# AE 2024/2025 → CSXS.11, AE 2026 → CSXS.12
# On macOS:
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
# On Windows (Run Cmd as Administrator):
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f

# Build and symlink to Adobe extensions directory
npm run build
npm run symlink
```

Restart After Effects. Open the panel via **Window → Extensions → Tripo4AE**.

> **Tip**: Use `npm run dev` for hot-reload during development.

---

## 2. Connecting to Tripo API

1. Open the Tripo4AE panel.
2. **Onboarding Guidance**: If you don't have an API Key yet, click the link below the input field: **"Register on Tripo to get free credits"** to jump directly to the Tripo platform.
3. Enter your Tripo API Key (API Keys typically start with the `tsk_` prefix).
4. Click **Connect**.
5. **Format & Troubleshooting**:
   - The plugin runs a client-side format validation.
   - If your balance is 0 or negative, it prompts a credit balance warning.
   - If the connection drops or is unauthorized (HTTP 401/403), a descriptive troubleshooting tip is shown.
6. On success, the status dot turns green and your credit balance appears.

Your API Key is persisted — no need to re-enter it next session.

---

## 3. Generating 3D Models

Open the **Generate** tab. Three input modes are available:

- **Text to 3D (Text)**
- **Image to 3D (Image)**
- **Multiview to 3D (Multiview)**

> [!TIP]
> **Expandable Settings**:
> Technical parameters like Face Limit, Mesh Quad, Model Seed, and Quality multipliers are folded under the **"Advanced Options"** panel by default. Designers only need to type a prompt or upload an image to hit generate, reducing visual complexity.

---

## 4. Importing into After Effects

After generation completes, the result preview features an **Interactive WebGL 3D Preview Viewport**. You can left-click and drag to rotate the model, right-click and drag to pan, and scroll to zoom. This allows you to inspect the model's structure and geometry interactively from all angles before committing to import.

Instead of selecting the import workflow before generating, **the import buttons are now shown dynamically on the completed model preview**. This allows you to inspect the generation quality before choosing how to load the asset:

### 1. Native 3D Layer (AE Native / Advanced 3D)

Directly imports the `.glb` model as a native AE 2024+ **3D Model Layer**. Clicking this button will:
1. Download the GLB model to your local `~/Documents/Tripo4AE/Models/` directory.
2. Import the asset and create a 3D model layer, centering it in the active composition.
3. Switch the composition's renderer to **Advanced 3D** (Mercury 3D Engine) automatically to enable PBR rendering.
4. Enable Time Remap on the layer to play embedded skeletal animations.
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

### ✨ One-Click Rig & Animate Wizard (Magic Animate) - Recommended!

The plugin provides an automated **"One-Click Rig & Animate Wizard (Magic Animate)"** panel to combine the traditional 3-step manual rigging/retargeting workflow into a single click:

1. **Select & Configure**: Pick your draft model in the **Source Model** dropdown, select up to 5 animations from the preset lists, and check "Animate in Place" if needed.
2. **Launch Wizard**: Click the **"One-Click Rig & Animate (Magic Animate)"** button.
3. **Automated Pipeline**: The plugin will execute all cloud operations in sequence automatically:
   - Initiates `Pre-Rig Check` and verifies suitability.
   - Submits the `Auto-Rig` task and tracks progress, then downloads the rigged model.
   - Automatically submits the `Retarget` animation task on the rigged model.
   - Downloads the final animated GLB and imports it directly into your AE composition.
   - Configures Time Remap and sets up loop expressions on the layer automatically.

If you prefer micro-managing each step, you can use the traditional manual steps:

### Manual Step 1: Pre-Rig Check

1. Select a pipeline model in **Source Model**
2. Click **Check Rig-ability**
3. Check the result: whether it's riggable and the detected rig type

### Manual Step 2: Rig the Model

1. Choose a **Rig Type** (such as Biped, Quadruped, etc.)
2. Select output format (GLB or FBX) and rig spec (Tripo or Mixamo)
3. Click **Rig Model** to process and import.

### Manual Step 3: Retarget Animation

1. Select animations from basic, combat, dance, performance, sports, daily, or cross-species categories.
2. (Optional) Check **Animate in Place** to keep the character in position
3. Click **Retarget** to download and import (requires a completed Rig model as Source).

### Motion Hot-Swap & Anti-Sliding Walk Sync

Once you have imported an animated model into your timeline, you can easily hot-swap animations or resolve walking slide-in issues:
1. **Quick Motion Hot-Swap**: Select the model in the dropdown list, choose a new animation preset (e.g. dance, run), and click **"Apply Hot-Swap Action"**. The panel will call Tripo API to retarget the new motion, download the GLB, duplicate the project footage to isolate it, and replace the layer's source reference seamlessly.
2. **Anti-Sliding Walk Sync**: If your character slides while walking, select the layer, set the walk speed ratio using the slider, and click **"Apply Anti-Sliding Walk Sync"**. This injects an expression on the Position property of the layer to dynamically sync translation with the animation pace, preventing foot sliding.

### Skeletal Joint Tracker

Extract 3D joint motion coordinates from the GLB skeleton and create an AE Null layer tracked to it:
1. **Scan Skeleton**: When you select a model in the dropdown, the panel automatically parses the GLB skeleton and populates the **"Select Joint Bone"** list with all detected bone names (falling back to standard names like `mixamorig:Head`).
2. **Extract Keyframes**: Choose a bone (e.g., Head, Right Hand) and click **"Extract Joint to 3D Null"**.
3. **Coordinate Alignment**: The panel reads the AE composition's frame rate and duration, samples the bone's world coordinates frame-by-frame using Three.js, maps them to AE space (inverting Y and Z axes, and scaling based on the model's bounding box height), and writes them as position keyframes onto a parented 3D Null. You can now mount particle emitters, lights, or text layers directly to this Null.
4. **VFX Bridge**: To automate attaching light sources or particles to the bone Null:
   - **Link 3D Point Light**: Creates a new 3D Point Light layer aligned and parented to the extracted bone Null.
   - **Link Particle Emitter**: Creates a particle emitter layer. If Trapcode Particular is installed, it adds a Point Light named `Emitter` parented to the Null, which Particular automatically registers as a particle emitter. If Particular is not found, it falls back to native **CC Particle World** and injects normalized coordinate expressions to align particle producers directly to the Null tracking path.


### PBR Multi-Pass Map Exporter

Separate and export embedded textures from your GLB model:
1. Select the model and click **"Export & Import Textures"**.
2. The panel will scan all Standard Materials in the GLB, extract texture maps (Albedo/Diffuse, Normal, Roughness, Metallic, AO, Emissive), and render them to PNG files on your local drive using HTML5 canvas.
3. It then automatically imports the saved PNGs into the AE Project Panel and groups them into a `"Tripo4AE_Textures"` folder for use in Element 3D or other shaders.

---

## 7. 3D Scene Controls & Lighting Settings

### 1. Real-Time Light & Shadow Controls
Under **"Scene Setup"** in the **Animation** tab, you can configure and dynamically control lighting in the composition:
- **Setup Scene**: Click to automatically configure a camera rig (with Andrew Kramer's Classic Null Controller), three-point lights (Key, Fill, Rim), and a shadow-catcher ground plane.
- **Real-Time Sliders**: Tweak light settings and watch them update instantly in AE without rebuilding:
  - **Environment Intensity**: Adjust HDRI background ambient light.
  - **Key Light Angle** & **Key Light Intensity**: Adjust key lamp brightness and rotation.
  - **Shadow Darkness** & **Shadow Diffusion (Softness)**: Adjust Key light projection properties.
- **Visual HDR Card Gallery**: Instead of text dropdowns, choose from 8 royalty-free CC0 HDRI environments represented by gradient card swatches (Studio Soft, Sunset Glow, City Lights, Kiara Dawn, etc.) with description subtitles. Click a card to download and load it as the environment map.
- **Studio Lighting Rigs Gallery**: Select from 4 visual card templates (Soft Studio, Dramatic Rim, Cyberpunk Neon, Moody Cinematic) with representative color gradients to instantly create standard three-point light setups in AE in one click.
- **Auto Ground Alignment**: The ground plane is automatically aligned to the bottom boundary of the first 3D model layer in the comp, removing the need for manual alignment.

> **Note**: You must Rig first, then select the Rig result as the Source Model before Retargeting.

### Step 4: Advanced PBR Material Controls (Advanced PBR Material Options)

For imported Native 3D layers, you can choose PBR material presets or fine-tune properties dynamically at the bottom of the **Animation** tab.

- **Visual PBR Material Presets Gallery**: Click a card template (Glass, Chrome, Gold, Matte Plastic, Jade, Brushed Copper, etc.) representing physical materials to instantly apply PBR properties to your layer. The sliders will automatically sync with the preset's exact settings (e.g. 100% metal for Chrome, 85% transparency and 1.5 IOR for Glass).

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

### Matchmoving & Compositing

Align your generated 3D models with real-world camera tracks:
1. **Bind to Tracker**: Parent your 3D model layer to any active 3D Tracker Null (e.g. from Mocha AE or AE 3D Camera Tracker). Select the Null in the **"Select Tracker Layer"** dropdown and click **"Align & Bind to Tracker"** to reset relative coordinates, locking the model to the tracking point.
2. **Create Shadow Catcher**: Select a tracker layer and click **"Create Shadow Catcher"**. The plugin creates a horizontal solid layer parented to the tracker, setting its material options to **"Accepts Shadows: Only"** and **"Accepts Lights: On"** to blend shadows into video backgrounds.

### Intelligent Lighting Match

Automatically match the 3D model's lighting environment with the colors of your video frame:
1. Select the model and click **"Match Lighting"**.
2. The plugin will export the current frame of your active composition as a temporary PNG, analyze the pixel colors using HTML5 canvas, extract the Key Light, Fill Light, and Ambient Light colors, and construct a matched 3-point light rig (`Tripo4AE_Smart_Key`, `Fill`, `Ambient`) inside AE.

### Viewport Performance Proxy

Prevent viewport lag during timeline navigation by switching to a low-poly proxy:
1. **Mesh Simplification**: Run a "Mesh Simplification (High-to-Low Poly)" task on your model under the Transform Tab.
2. **Toggle Proxy**: Select the model in the dropdown list and click **"Toggle Proxy"**. The plugin replaces the layer's source reference in the Project Panel with the simplified low-poly proxy GLB.
3. **Restore Original**: Click **"Restore Original"** to restore the full high-poly model source for final render.

---

## 8. Model Library & Local 3D Preview

Open the **Library** tab.

### 🔍 Search & Filter Chips
Manage your local model database using the controls at the top of the Library tab:
- **Search Bar**: Perform case-insensitive searches across model prompts or custom names.
- **Filter Chips**:
  - **All**: Show all assets in the library.
  - **Imported**: Show only assets currently used in your AE comps.
  - **Animated**: Show assets that have skeletons or have undergone retargeting.
  - **Stylized**: Show assets processed with Lego, Voxel, or Minecraft presets.

### 👁️ Local WebGL 3D Preview
Each model card in the library contains a **Preview (👁️)** button:
- **How it works**: Clicking preview opens a lightweight WebGL viewport. The plugin reads the local GLB file via Node.js `fs`, converts it to a temporary Blob URL, and feeds it directly into Three.js `GLTFLoader`.
- **Interactions**: Drag the mouse to rotate/orbit the model, and scroll to zoom. The camera automatically centers and fits the model's bounding box.
- **Resource Disposal**: Closing the viewport triggers full memory garbage collection (unsubscribing animations, revoking Blob URLs, and disposing WebGL renderer contexts, geometries, materials, and textures) to prevent AE memory leaks.

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
