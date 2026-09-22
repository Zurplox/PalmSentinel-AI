# 🌴 PALMSENTINEL AI PRO — SYSTEM MASTER CONTEXT & LIVING HANDOVER LOG
> **Living Engineering Document & Complete Conversation Archive**  
> *Target Audience: Autonomous AI Agents (Gemini, Claude, GPT, Antigravity) & Senior Software Engineers taking over this project.*  
> *Last Updated: 2026-09-22 08:48:00 Local Time*  
> *Active Workspace: `F:\PalmSentinel-AI` | GitHub: `https://github.com/Zurplox/PalmSentinel-AI`*

---

## 🧭 TABLE OF CONTENTS
1. [Project Identity & Global Directives](#1-project-identity--global-directives)
2. [Complete Chronological Evolution & Turn-by-Turn History](#2-complete-chronological-evolution--turn-by-turn-history)
3. [Deep-Dive Root Cause Analyses & Solved Bugs](#3-deep-dive-root-cause-analyses--solved-bugs)
4. [System Architecture & Data Flow](#4-system-architecture--data-flow)
5. [Complete Codebase & File Registry](#5-complete-codebase--file-registry)
6. [Agronomic Computer Vision & Mathematical Specifications](#6-agronomic-computer-vision--mathematical-specifications)
7. [System Verification & 42-Point Audit Suite](#7-system-verification--42-point-audit-suite)
8. [Data Privacy & Local Isolation Guarantees](#8-data-privacy--local-isolation-guarantees)
9. [Operational Guide for Incoming AI (How to Resume Work)](#9-operational-guide-for-incoming-ai-how-to-resume-work)
10. [Strategic Feature Backlog & Next Capabilities](#10-strategic-feature-backlog--next-capabilities)
11. [Living Changelog Protocol](#11-living-changelog-protocol)

---

## 1. PROJECT IDENTITY & GLOBAL DIRECTIVES

### 1.1 Core Mission
**PalmSentinel AI Pro (SawitVision Enterprise)** is a production-grade, industrial Computer Vision and geospatial analytics platform engineered specifically for ultra-high-resolution (**100 Megapixel to 1+ Gigapixel**) aerial drone orthophotos of oil palm plantations (*Elaeis guineensis* / *kelapa sawit*).

### 1.2 Environments & Storage Locations
* **Primary Working Environment (Windows F: Drive)**:
  `F:\PalmSentinel-AI` — *All current active runtime code, launchers, compiled binaries, and heavy assets live here.*
* **Secondary Local Mirror**:
  `C:\Users\siapu\.gemini\antigravity\scratch\palm-sensus-ai`
* **Remote Source Control (GitHub)**:
  Repository: `https://github.com/Zurplox/PalmSentinel-AI`
  Authenticated CLI User: `Zurplox` (via `gh` CLI)
* **Local Test Drone Orthophoto**:
  File: `F:\PalmSentinel-AI\data\Jalan-Lintas-S5080iak-Tumang-3-7-2026-orthophoto-2.jpg`
  Dimensions: **9,217 × 14,980 pixels** (~138.07 Megapixels, RGB 3 channels, 62.7 MB file size).

### 1.3 Strict Rules for Any AI Agent Working on this Project
1. **Strict Zero-Cloud / 100% Local Privacy Guarantee**:
   * User drone photos (`*.jpg`, `*.png`, `*.tif`, `*.tiff`) must **NEVER** be committed to Git or pushed to GitHub.
   * `.gitignore` must strictly protect all user imagery. Only the 2.37MB public demo crop (`data/demo_palm_estate.jpg`) is tracked in Git.
   * All computer vision, inference, and GIS operations must run 100% locally on `localhost`.
2. **Strict Zero-Padding & Zero-Duplication Rule**:
   * Never introduce artificial loops or duplicate mock data to simulate processing.
   * Computations must reflect genuine mathematical and agronomic calculations.
3. **Photoshop-Caliber Interactive UX Standard**:
   * Canvas operations must remain responsive, smooth (60 FPS), and crash-proof.
   * Spacebar panning must never interrupt in-progress polygon drawings.
   * Draggable floating UI cards must use `offsetParent` positioning math to prevent jumping or coordinate drift.

---

## 2. COMPLETE CHRONOLOGICAL EVOLUTION & TURN-BY-TURN HISTORY

### Turn 1: Initial Inception & Drone Orthophoto Analysis
* **User Goal**: Process a massive drone orthophoto (`Jalan-Lintas-S5080iak-Tumang-3-7-2026-orthophoto-2.jpg`, 138MP) to count oil palm trees automatically, calculate plantation hectarage, and determine Stand Per Hectare (SPH).
* **Work Accomplished**:
  * Designed the core computer vision pipeline (`engine/detector.py`) using Excess Green Index ($\text{ExG} = 2G - R - B$), multi-scale Gaussian smoothing, morphological dilation peak isolation, and 2D spatial grid hashing Non-Maximum Suppression (NMS).
  * Sliced the 138MP image into overlapping tiles via `engine/tiler.py` to process massive imagery without running out of RAM.
  * Implemented agronomic calculations (`engine/roi_utils.py`) using Shoelace formula for polygon area and Indonesian oil palm standards (136–143 SPH target).

### Turn 2: Relocation to F: Drive & Cool App Branding
* **User Request**: *"Make sure it works on my PC too. Keep everything in F drive - give a cool name for the app and folder."*
* **Work Accomplished**:
  * Established the permanent directory at `F:\PalmSentinel-AI`.
  * Coined the enterprise name: **PalmSentinel AI Pro — SawitVision Enterprise**.
  * Created complete documentation, unit tests, and CLI batch tool (`cli.py`).

### Turn 3: Native Windows Executable Interface
* **User Request**: *"create exe file for windows F drive so I have the UI interface to run."*
* **Work Accomplished**:
  * Built `desktop_app.py` using `pywebview` with Windows Edge Chromium WebView2 engine.
  * Authored `Launcher.cs` (a high-performance, native C# wrapper) and compiled it into `PalmSentinel.exe` (11KB) using the Windows .NET Framework C# compiler (`csc.exe`).
  * Double-clicking `PalmSentinel.exe` launches the software as a self-contained desktop program with no browser tabs, no address bar, and clean process lifecycle termination.

### Turn 4: Resolution Enhancement, Simple vs Advanced Modes & 1-Tree Loupe
* **User Request**: *"I don't know how to use this parameter - make it advanced mode. But give a simple mode too - perhaps some tweaks where we can see a preview how 1 tree looks like as we scroll around so we know if we are sampling it correctly or not. Then the image preview now is way too blurry, we can't see if it's selecting the right area or not, perhaps increase the resolution. Put in even more features and make it more useful."*
* **Work Accomplished**:
  * **Dual Interface**: Designed Simple Mode (single palm size slider: `Young TBM <———> Mature TM` + 1-Click Tree Calibrator) and Advanced Mode (technical agronomy parameters: blur kernel, min spacing px, vegetation threshold, GSD cm/px).
  * **Dynamic High-Res Viewport Engine**: Upgraded the overview image to 4,096 px and created `/api/viewport-patch` which streams 100% native resolution patches dynamically as the user zooms in, completely eliminating blurriness.
  * **1-Tree Live Loupe**: Created `/api/tree-sample` and `/api/auto-calibrate` featuring a real-time magnifier in the sidebar with an interactive expanding/contracting circle matching the palm canopy.
  * **Titik Sisipan / Replanting Gap Spotter**: Added automated detection of missing grid intersections along planting rows.
  * **Canopy Density Heatmap**: Added live radial gradient density heatmap overlay.

### Turn 5: Custom Photo Selection & Upload Suite
* **User Request**: *"Let me select my photo too."*
* **Work Accomplished**:
  * Added active flight dropdown selector populated via `/api/list-images`.
  * Added direct file browse and upload (`/api/load-image`) supporting `.jpg`, `.png`, `.tif`, `.tiff`.
  * Added local PC path input box to load photos in-place.
  * Added drag-and-drop support directly onto the canvas container.

### Turn 6: Standalone Executable Verification & Window Integration
* **User Request**: *"why does it have to run in host? can't it just run in exe itself?"*
* **Work Accomplished**:
  * Clarified that `PalmSentinel.exe` embeds WebView2 directly inside the desktop window frame.
  * Added `pythonw.exe` execution so no command prompt console appears behind the window.

### Turn 7: System & Code Audit
* **User Request**: *"audit it"*
* **Work Accomplished**:
  * Developed a comprehensive 42-point automated test suite (`audit_suite.py`) testing filesystem integrity, computer vision indices, peak isolation, Shoelace agronomic math, REST endpoints, memory limits, and Windows launcher binaries.
  * Executed the audit with 100% pass rate (42/42 tests passing).

### Turn 8: Image Zoom vs UI Zoom Bugfix
* **User Request**: *"I can't zoom the picture, instead , it's the UI zoomed"*
* **Work Accomplished**:
  * Identified WebView2 default behavior where `IsZoomControlEnabled = True` caused Chromium to scale HTML font/layout rather than canvas pixels.
  * Hooked WebView2 initialization in `desktop_app.py` to disable browser zoom accelerators.
  * Implemented focal zoom anchored to cursor coordinates, added touchscreen multi-touch pinch zoom support, and added a dedicated Pan tool (`tool-pan`).

### Turn 9: Scroll Wheel Target Bugfix
* **User Request**: *"I can't zoom my image, it's so small scroll wheel should zoom it"*
* **Work Accomplished**:
  * Identified missing DOM element declaration for `btnFitScreen` in `static/app.js` which threw a synchronous `ReferenceError` during `setupEventListeners()`, preventing wheel listeners from attaching.
  * Fixed declaration, increased wheel notch sensitivity to 1.25×/0.8×, and added double-click quick zoom.

### Turn 10: Movable Sensus Card & Step-Back Undo Controls
* **User Request**: *"Let this box collapsible/movable so it wont block my area selection when I choose polygon wrongly, let me reset by pressing escape, let me undo selection 1 point/line by ctrl-z/pressing undo"*
* **Work Accomplished**:
  * Added grip handle (`⠿`) to make the Sensus Summary card draggable anywhere on screen.
  * Added collapsible minimize toggle (`▼ / ▲`) with mini-badge count (`X palms`).
  * Wired `Escape` to reset in-progress drawings or sampling mode.
  * Wired `Ctrl + Z` and `Backspace` / `Delete` and sidebar button `↶ Undo` to remove the last placed vertex.

### Turn 11: Photoshop Controls & Drag Offset Bugfix
* **User Request**: *"when moving the sensus summary box, it's not actually dragging it with the mouse, it's offset to -Y from the mouse. Allow me to pan temporarily by pressing space button, then continue selection again (like photoshop). Allow me to move the polygon dots to edit if I put it at the wrong place wihtout having to reset (like photoshop). I want it to be like photoshop - be creative"*
* **Work Accomplished**:
  * **Fixed Card Dragging Offset**: Resolved viewport-relative vs parent-relative coordinate math mismatch. Card now stays pinned under cursor with zero jump.
  * **Temporary Spacebar Pan**: Holding `Spacebar` switches cursor to `grab` and enables canvas panning without cancelling active polygon selections.
  * **Photoshop-Style Anchor Point Editing**: Hovering a vertex displays amber glow; dragging moves the vertex with real-time recalculation of SPH and Ha; `Alt + Click` deletes the vertex; dynamic ground distance labels (`15.4m`) render on every edge.

### Turn 12: GitHub Synchronization & Performance Parity
* **User Request**: *"implement the same for github too, i expect github is performing as good as the exe file"*
* **Work Accomplished**:
  * Created and pushed GitHub repository: `https://github.com/Zurplox/PalmSentinel-AI`.
  * Generated and bundled `data/demo_palm_estate.jpg` (2.37MB, tracked in Git) so anyone cloning from GitHub gets a working out-of-the-box demo immediately.
  * Added overview JPEG byte buffer caching (`CACHE["overview_jpeg_bytes"]`) reducing response latency from ~70ms to <0.5ms.
  * Added HTTP `Cache-Control` headers for fast web browser caching.
  * Added automated GitHub Actions CI workflow (`.github/workflows/audit.yml`) passing 100% green.

### Turn 13: Local Photo Upload & Strict Privacy Isolation
* **User Request**: *"Let me upload the picture instead of using 1 predefined photo. If possible, the photo remains locally, not uploaded to github"*
* **Work Accomplished**:
  * Added primary `📤 Upload Photo` button in the top navigation bar.
  * Redesigned sidebar Section 0 with `📁 Upload My Drone Photo` and privacy reassurance badge.
  * Created interactive drag-and-drop dropzone overlay on the canvas.
  * Verified with `git status --porcelain` that uploaded photos in `data/` are 100% ignored by Git.
  * Increased upload limit in `app.py` to 2GB (`MAX_CONTENT_LENGTH = 2048 * 1024 * 1024`).

### Turn 14: HTML Web Page Confirmation & 1-Click Launchers
* **User Request**: *"how to use? Is there any html page?"*
* **Work Accomplished**:
  * Explained that the application runs both as a native desktop program (`PalmSentinel.exe`) and as an HTML web page at `http://127.0.0.1:5000`.
  * Created `Launch_Web_Browser.bat` for 1-click launching in default web browsers (Chrome, Edge, Firefox).
  * Provided complete 7-step user workflow instructions.

---

## 3. DEEP-DIVE ROOT CAUSE ANALYSES & SOLVED BUGS

### Bug 1: Sensus Summary Card Jump / -Y Drag Offset
* **Symptom**: On `mousedown` on `#analytics-card-header`, the card instantly jumped downward along the -Y axis away from the mouse cursor.
* **Root Cause**:
  `analyticsCard.getBoundingClientRect()` returns coordinates relative to the **browser viewport** (which includes the 50px header). However, `#analytics-card` is positioned `absolute` inside `#canvas-container` (its `offsetParent`). When `style.top = origY + 'px'` was executed, it applied a viewport-relative coordinate to a parent-relative element, shifting the card down by exactly the header height (~50px) plus sidebar width.
* **The Permanent Fix**:
  ```javascript
  // Compute mouse offset within the card itself:
  grabOffsetX = e.clientX - cardRect.left;
  grabOffsetY = e.clientY - cardRect.top;

  // Measure the offsetParent's viewport bounding rect:
  const parentRect = (analyticsCard.offsetParent || document.body).getBoundingClientRect();

  // Anchor style.left / top in parent space:
  analyticsCard.style.left = `${cardRect.left - parentRect.left}px`;
  analyticsCard.style.top = `${cardRect.top - parentRect.top}px`;

  // During mousemove:
  let newLeft = e.clientX - parentRect.left - grabOffsetX;
  let newTop = e.clientY - parentRect.top - grabOffsetY;
  ```

### Bug 2: Missing Identifier `btnFitScreen` Breaking Event Loop
* **Symptom**: Scroll wheel did nothing; canvas could not be zoomed.
* **Root Cause**: `btnFitScreen.addEventListener(...)` was called in `setupEventListeners()`, but `const btnFitScreen = document.getElementById('btn-fit-screen')` was missing from the declarations at the top of `app.js`. This threw a fatal synchronous `ReferenceError: btnFitScreen is not defined`, aborting `setupEventListeners()` before the wheel listeners could be registered.
* **The Permanent Fix**: Declared `btnFitScreen` at the top of `app.js` and added defensive null-checks before attaching all button event listeners.

### Bug 3: WebView2 Browser Zoom Intercepting Wheel Events
* **Symptom**: Zooming on desktop scaled HTML fonts and sidebar width instead of zooming the image inside the canvas.
* **Root Cause**: Windows WebView2 has `CoreWebView2.Settings.IsZoomControlEnabled = True` and `AreBrowserAcceleratorKeysEnabled = True` by default. Trackpad pinches and `Ctrl + Wheel` were consumed by Chromium as page zoom.
* **The Permanent Fix**:
  1. In `desktop_app.py`, hooked WebView2 ready callback and set `settings.IsZoomControlEnabled = False` and `settings.AreBrowserAcceleratorKeysEnabled = False`.
  2. In `static/style.css`, added `touch-action: none !important;` and `overscroll-behavior: none !important;` to `#canvas-container` and `#main-canvas`.
  3. In `static/app.js`, intercepted window-level `wheel` with `e.ctrlKey` to prevent default browser page zooming.

### Bug 4: GitHub Actions Bash Variable Expansion Failure
* **Symptom**: GitHub Actions CI workflow failed with `NameError: name 'area_hectares' is not defined`.
* **Root Cause**: In `.github/workflows/audit.yml`, inline python was executed via bash: `python -c "print(f'{area[\"area_hectares\"]}')"`. In bash, `$area_hectares` was interpreted as a shell environment variable and evaluated to empty string before Python executed the command.
* **The Permanent Fix**: Replaced inline multi-line bash scripts with clean unittest execution: `python -m unittest discover -s tests -v` and single-line module import checks.

---

## 4. SYSTEM ARCHITECTURE & DATA FLOW

```
[Drone Flight Orthophoto (.jpg / .tif / .png)]
                     │
                     ▼
       ┌───────────────────────────┐
       │     F:\PalmSentinel-AI    │
       └─────────────┬─────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  [PalmSentinel.exe]     [Launch_Web_Browser.bat]
(C# Native Wrapper)       (Default Web Browser)
         │                       │
         ▼                       ▼
  [desktop_app.py]         [app.py (Flask)]
 (pywebview Edge Engine)    (localhost:5000)
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │     REST API ENGINE   │
         │  GET  /api/info       │
         │  GET  /api/overview   │
         │  GET  /api/patch      │
         │  GET  /api/sample     │
         │  POST /api/count      │
         │  POST /api/detect-gaps│
         │  POST /api/export-*   │
         └───────────┬───────────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[engine/detector.py]        [engine/roi_utils.py]
  • ExG Index (2G - R - B)    • Shoelace Area (Ha)
  • Gaussian Smoothing        • Stand Density (SPH)
  • Morphological Dilation    • Point-in-Polygon Raycast
  • Spatial Grid Hashing NMS
       │                           │
       └─────────────┬─────────────┘
                     ▼
         ┌───────────────────────┐
         │   FRONTEND INTERFACE  │
         │  templates/index.html │
         │  static/app.js        │
         │  static/style.css     │
         └───────────────────────┘
```

---

## 5. COMPLETE CODEBASE & FILE REGISTRY

| Relative Path | Primary Language | Function & Responsibility |
| :--- | :--- | :--- |
| `PalmSentinel.exe` | Compiled Native C# | Windows native executable launcher. Starts `pythonw desktop_app.py` or opens browser. |
| `Launcher.cs` | C# (.NET Framework) | Source code for `PalmSentinel.exe`. Compilable via `csc.exe /target:winexe Launcher.cs`. |
| `desktop_app.py` | Python (`pywebview`) | Standalone desktop GUI window runner with Edge Chromium WebView2 engine. |
| `app.py` | Python (`Flask`) | Central REST API server. Handles image loading, tiled sensus execution, viewport streaming, and exports. |
| `engine/detector.py` | Python (`OpenCV`, `NumPy`) | Core Computer Vision palm detector. Computes ExG/VARI/GLI, peak isolation, and spatial NMS. |
| `engine/tiler.py` | Python (`OpenCV`) | Tiled inference manager for processing 100MP+ imagery in overlapping chunks with margin deduplication. |
| `engine/roi_utils.py` | Python (`NumPy`) | Agronomic mathematics: Shoelace polygon area, SPH density calculation, and point-in-polygon filtering. |
| `templates/index.html` | HTML5 / TailwindCSS | Primary user interface template. Includes workspace, tools, Loupe, movable summary card, and dropzone. |
| `static/app.js` | Vanilla JavaScript (ES6) | Frontend canvas controller, Photoshop spacebar pan, anchor point drag/delete, coordinate conversions. |
| `static/style.css` | CSS3 | Custom application styling, scrollbars, touch-action locks, and card draggable cursors. |
| `audit_suite.py` | Python (`unittest`) | Comprehensive 42-point enterprise system audit testing filesystem, vision engine, math, and APIs. |
| `cli.py` | Python (`argparse`) | Headless command-line batch counting tool for server pipelines or terminal users. |
| `run_full_sensus.py` | Python | Multi-block audit script pre-configured for the 138MP Tumang orthophoto. |
| `Launch_PalmSentinel.bat` | Windows Batch | Launcher script running desktop app mode with environment checks. |
| `Launch_Web_Browser.bat` | Windows Batch | Launcher script starting Flask server and opening default web browser to `http://127.0.0.1:5000`. |
| `Launch_PalmSentinel.ps1` | PowerShell | PowerShell launcher script. |
| `.gitignore` | Git Configuration | Strictly excludes user orthophotos (`*.jpg`, `*.tif`, `*.png`, `data/`) while preserving `demo_palm_estate.jpg`. |
| `.github/workflows/audit.yml`| YAML (GitHub Actions) | Continuous Integration pipeline running automated tests on every push. |
| `data/demo_palm_estate.jpg` | JPEG Image (2.37MB) | Authentic, real drone orthophoto crop (2,500 × 2,500 px) tracked in Git for instant out-of-the-box demo. |
| `requirements.txt` | Text | Dependencies: `flask`, `numpy`, `opencv-python`, `pillow`, `pywebview`. |

---

## 6. AGRONOMIC COMPUTER VISION & MATHEMATICAL SPECIFICATIONS

### 6.1 Excess Green Index (ExG)
$$\text{ExG} = 2G - R - B$$
Normalized to 8-bit scale $[0, 255]$. Isolates living photosynthetic oil palm foliage from bare peat soil, water drainage ditches (*parit cacing*), asphalt, and shadows.

### 6.2 Apical Bud Peak Dilation
Consolidates starburst rosette fronds into a singular apex corresponding to the spear leaf (*pucuk*). Uses a circular morphological structuring element of radius $R_{\text{dilation}}$:
$$\text{Dilated}(x, y) = \max_{(dx, dy) \in B_r} \text{ExG}(x+dx, y+dy)$$
A local peak is confirmed where:
$$\text{ExG}(x, y) = \text{Dilated}(x, y) \quad \text{and} \quad \text{ExG}(x, y) \ge \text{Threshold}$$

### 6.3 Spatial Grid Hashing Non-Maximum Suppression (NMS)
To prevent double-counting across overlapping fronds while achieving $O(N)$ speed on 100MP images:
* Divides the image coordinate space into discrete spatial buckets of size $D_{\text{min}}$.
* Only candidate points that dominate their immediate spatial neighborhood within Euclidean distance $D_{\text{min}}$ are retained.

### 6.4 Agronomic Stand Density (SPH) Benchmarks
* **Hectarage (Ha)**: Calculated via the Shoelace Formula on $(X, Y)$ vertices scaled by sensor Ground Sampling Distance (GSD):
  $$\text{Area (Ha)} = \frac{\text{Pixel Area} \times (\text{GSD}_{\text{meters}})^2}{10,000}$$
* **Stand Per Hectare (SPH)**:
  $$\text{SPH} = \frac{\text{Total Palms}}{\text{Area (Ha)}}$$
* **Agronomic Thresholds**:
  * $\text{SPH} < 110$: *Critical Underpopulation / High Vacancy (Needs Replanting)*
  * $110 \le \text{SPH} < 130$: *Sub-Optimal Density / Vacant Pockets*
  * $130 \le \text{SPH} \le 148$: *Optimal Industrial Density (136–143 SPH Standard)*
  * $148 < \text{SPH} \le 165$: *High Density (Young TBM / High-Yield Planting)*
  * $\text{SPH} > 165$: *Overcrowded (Etiolation Risk)*

---

## 7. SYSTEM VERIFICATION & 47-POINT AUDIT SUITE

To verify the entire platform, run:
```powershell
python audit_suite.py
```

### Audit Coverage Summary:
* **[1/6] FileSystem & Assets (17 checks)**: Verifies all code files, templates, stylesheets, and native binaries.
* **[2/6] Computer Vision Engine (5 checks)**: Validates ExG, VARI, GLI indices, peak prominence, and spatial grid hashing throughput.
* **[3/6] Agronomic Math & SPH (4 checks)**: Validates Shoelace formula accuracy, 1.0 Ha benchmark, and density classifications.
* **[4/6] Flask REST API (13 checks)**: Tests `/api/info`, `/api/overview-image`, `/api/viewport-patch`, `/api/tree-sample`, `/api/auto-calibrate`, `/api/count`, `/api/detect-gaps`, CSV/GeoJSON exports, annotated JPEG export, and coordinate rejection edge cases.
* **[5/6] Memory Footprint (2 checks)**: Validates sub-second tiled inference on 16MP areas and confirms zero memory leaks.
* **[6/6] Desktop Executable & Launchers (5 checks)**: Validates `PalmSentinel.exe`, live native execution of `PalmSentinel.exe --check`, headless `desktop_app.py --check`, `pythonw.exe` GUI subsystem, and WebView2 Edge bindings.

---

## 8. DATA PRIVACY & LOCAL ISOLATION GUARANTEES

When users upload drone orthophotos through the application:
1. Files are saved locally to `F:\PalmSentinel-AI\data\<filename>`.
2. `.gitignore` explicitly excludes:
   ```gitignore
   *.tif
   *.tiff
   *.jpg
   *.jpeg
   *.png
   !static/*.png
   !static/*.jpg
   !data/demo_palm_estate.jpg
   ```
3. Any photo uploaded by the user is **100% ignored by Git** and will never appear in `git status` or be pushed to GitHub.
4. All processing is strictly on-device using local Python runtimes. No cloud APIs, telemetry, or external image servers are used.

---

## 9. OPERATIONAL GUIDE FOR INCOMING AI (HOW TO RESUME WORK)

If you are an AI assistant taking over this conversation:

1. **Working Directory**: Always execute commands with `Cwd: F:\PalmSentinel-AI`.
2. **Checking Code Syntax**:
   * For JavaScript: `node -c static/app.js`
   * For Python: `python -m py_compile app.py desktop_app.py engine/detector.py`
3. **Running the Audit Suite**:
   * Run `python audit_suite.py` — ensure all 49 checks pass before reporting work as complete.
4. **Git Commits & Push Protocol**:
   * When making changes:
     `git add -A; git commit -m "<concise commit message>"; git push origin main`
   * Always mirror file updates to `C:\Users\siapu\.gemini\antigravity\scratch\palm-sensus-ai\`.
5. **Testing GitHub Actions CI**:
   * Check CI status: `gh run list --limit 3`
   * View live CI logs: `gh run view <run_id> --log`

---

## 10. STRATEGIC FEATURE BACKLOG & NEXT CAPABILITIES

Here are the top high-value capabilities designed for future implementation:

### Feature 1: Multi-Block Session Manager (Afdeling / Block Partitioning) [COMPLETED]
* **Status**: Implemented in v2.6. Users can save multiple named polygon blocks (*Blok A1*, *Blok A2*, etc.) on the same flight. Each block is stored in `state.savedBlocks`, rendered with distinct pastel boundary tints and badges, and can be restored or zoomed into with 1 click.

### Feature 2: Crown Health & Chlorosis Color Grading [COMPLETED]
* **Status**: Implemented in v2.6. The vision engine assigns `health_status` (`healthy`, `stressed`, `critical`) based on normalized ExG/VARI vegetative indices. Frontend color-grades circles (🟢 Optimal Green, 🟡 Stressed/Chlorosis, 🔴 Critical/Defoliated) and displays a full distribution breakdown in the Sensus Summary card.

### Feature 3: Automated Planting Grid Alignment & Bearing Detector
* **Description**: Identify the dominant triangular equilateral planting grid angle (e.g. 30° / 60° / 90° azimuth) and automatically trace rows to identify misplanted or misaligned trees.

### Feature 4: 1-Click Executive PDF Estate Report Generator [COMPLETED]
* **Status**: Implemented in v2.6 (`/api/export-report`). Generates a publication-grade, print-ready HTML executive agronomy report complete with FFB yield projections, SPH vs 136 benchmark, mortality rate, financial replanting estimates, and multi-block comparison tables.

### Feature 5: Minimap / Radar Overview Navigator [COMPLETED]
* **Status**: Implemented in v2.6. Picture-in-picture 128×128 radar minimap in `#canvas-container` displays the full plantation silhouette, saved block footprints, and an interactive draggable viewfinder rectangle that centers the main viewport on click or drag.

---

## 11. LIVING CHANGELOG PROTOCOL

Whenever an AI agent or engineer modifies PalmSentinel AI Pro, append a new entry below following this schema:

```markdown
### [YYYY-MM-DD HH:MM] — <Change Summary>
* **Agent / Author**: <Name>
* **Files Modified**: <List of file paths>
* **Changes Made**: <Bullet points of functional modifications>
* **Verification**: <Audit suite output or test commands run>
```

### [2026-09-22 08:48] — Master Context & Living Log Creation
* **Agent / Author**: Antigravity AI (Google DeepMind)
* **Files Modified**: `SYSTEM_LIVING_LOG.md`
* **Changes Made**: Compiled 100% complete technical history, architectural blueprints, bug post-mortems, and incoming AI handover instructions.
* **Verification**: Audit suite verified 42/42 PASS. GitHub CI verified green.

### [2026-09-22 09:00] — Multi-Block Manager, Health Chlorosis Grading, Minimap & Executive Report
* **Agent / Author**: Antigravity AI (Google DeepMind)
* **Files Modified**: `engine/detector.py`, `app.py`, `templates/index.html`, `static/app.js`, `audit_suite.py`, `SYSTEM_LIVING_LOG.md`
* **Changes Made**:
  * Added ExG canopy health classification (`healthy`, `stressed`, `critical`) to `engine/detector.py` and returned `health_summary` from `/api/count`.
  * Added `/api/export-report` endpoint generating print/PDF-ready executive agronomy reports with FFB yield modeling.
  * Added Multi-Block Session Manager (`btn-save-block`, `saved-blocks-list`, block restoration, pastel polygon rendering).
  * Added interactive Radar Minimap Viewport Navigator with click-and-drag viewfinder panning.
  * Added canopy health color-coding toggle (`chk-health-colors`) and health statistics card.
  * Updated `audit_suite.py` to 43 automated checks covering all new endpoints and features.
* **Verification**: `python audit_suite.py` passed 43/43 tests (100% system integrity). `node -c static/app.js` passed 0 syntax errors.

### [2026-09-22 21:50] — Local Native EXE Live Audit, Launcher Python Discovery & Security Hardening
* **Agent / Author**: Antigravity AI (Google DeepMind)
* **Files Modified**: `Launcher.cs`, `PalmSentinel.exe`, `desktop_app.py`, `Launch_PalmSentinel.bat`, `Launch_Web_Browser.bat`, `engine/detector.py`, `app.py`, `static/app.js`, `audit_suite.py`, `.github/workflows/audit.yml`, `README.md`, `AGENTS.md`, `SYSTEM_LIVING_LOG.md`
* **Changes Made**:
  * **Native Launcher Overhaul (`Launcher.cs`)**: Added deep multi-version Python candidate discovery (Python 3.9 through 3.14 across `LocalAppData/Programs/Python`, `ProgramFiles`, System Root, PATH, and project `.venv`), uses absolute script paths via `Path.Combine`, and forwards CLI flags (`--check`, `--test`) with process exit code propagation. Recompiled `PalmSentinel.exe` cleanly.
  * **Headless Diagnostic Mode (`desktop_app.py`)**: Added `--check` flag handling to validate Python imports, pywebview, and Flask without opening a GUI window. Added threaded background image preloading so the desktop UI window appears instantaneously without blocking on 138MP image decode.
  * **Launch Scripts Hardening**: Updated `Launch_PalmSentinel.bat` to prioritize native `PalmSentinel.exe` and `pythonw.exe` for zero-console startup. Updated `Launch_Web_Browser.bat` with a robust curl/powershell polling loop waiting for port 5000 (`/api/info`) before launching default browser, preventing 404/connection refused race conditions.
  * **Invariant Canopy Health Index (`engine/detector.py`)**: Replaced per-tile relative min-max normalization with invariant Green Leaf Index ($GLI = \frac{2G - R - B}{2G + R + B + \epsilon}$) sampled at the crown apex, guaranteeing consistent health scoring across tile seams and image illumination variations.
  * **Security & Offline Hardening (`app.py`)**: Bound Flask strictly to `127.0.0.1:5000` (localhost only). Secured image uploads with `werkzeug.utils.secure_filename` and strict extension whitelisting. Fixed `NameError: name 'block_name' is not defined` in `/api/export-annotated-image`. Added pixel CRS metadata (`urn:ogc:def:crs:OGC:1.3:CRS84`) to GeoJSON export. Added offline fallback styling in `/api/export-report`.
  * **Comprehensive 47-Check Audit (`audit_suite.py`)**: Expanded from 43 to 47 tests, including live sub-process execution of `PalmSentinel.exe --check` (~638ms) and `desktop_app.py --check` (~778ms), annotated image export, and DOM element audits.
  * **CI Workflow Integration (`.github/workflows/audit.yml`)**: Added automated `python audit_suite.py` step to GitHub Actions runner.
* **Verification**: `python audit_suite.py` passed 47/47 tests (100.0% system integrity), with live `PalmSentinel.exe --check` passing in 638ms.

### [2026-09-23 07:15] — v2.7 Enterprise Capabilities: Planting Row Bearing, Age Estimation, Undo/Redo & Viewport Screenshot
* **Agent / Author**: Antigravity AI (Google DeepMind)
* **Files Modified**: `engine/detector.py`, `app.py`, `templates/index.html`, `static/app.js`, `static/style.css`, `audit_suite.py`, `README.md`, `SYSTEM_LIVING_LOG.md`
* **Changes Made**:
  * **Feature A: Planting Row Bearing & Compass (`engine/detector.py`, `app.py`, `static/app.js`)**: Implemented nearest-neighbor angle histogram analysis to calculate dominant planting azimuth (0–180°), confidence score, and cross-row axis. Canvas renders dashed sky-blue row alignment lines when `chk-row-bearing` is toggled.
  * **Feature B: Palm Age / Maturity Tiers (`engine/detector.py`, `app.py`, `templates/index.html`, `static/app.js`)**: GSD-normalized crown diameter classification into TBM (<3m), Immature (3–5.5m), Mature TM (5.5–9.5m), and Senescent (>9.5m). Dynamic breakdown card with color dots in Sensus Summary.
  * **Feature C: Client-Side Viewport PNG Screenshot (`static/app.js`, `templates/index.html`)**: Added `btn-screenshot` button using `canvas.toBlob('image/png')` for instant one-click capture of current view without server latency.
  * **Feature D: Edit Mode Undo/Redo Stack (`static/app.js`)**: Manual marker additions and deletions now push history snapshots. Supported with `Ctrl+Z` (undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (redo).
  * **Feature E: SPH Benchmark Progress Bar (`templates/index.html`, `static/app.js`, `static/style.css`)**: Horizontal density progress bar relative to the 136 SPH industry benchmark with dynamic color coding (red < 110, amber 110–130, emerald 130–148, blue > 148).
  * **Feature F: Keyboard Shortcuts Help Modal (`templates/index.html`, `static/app.js`, `static/style.css`)**: Accessible via `?` or `F1`, and dismissible via `Esc` or close button.
  * **Audit Suite Expansion (`audit_suite.py`)**: Expanded to 49 checks, adding validation for Planting Row Bearing azimuth and Palm Age / Maturity Tiers.
* **Verification**: `python audit_suite.py` passed 49/49 tests (100.0% PASS). Node JS syntax check clean. All 5 Python modules compiled with zero errors.


