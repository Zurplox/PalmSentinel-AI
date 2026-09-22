# 🌴 PalmSentinel AI Pro — SawitVision Enterprise

> **High-Precision Computer Vision & Interactive Drone Oil Palm Sensus Platform for Ultra-High-Resolution (100MP+) Orthomosaics.**

[![GitHub Repo](https://img.shields.io/badge/GitHub-Zurplox%2FPalmSentinel--AI-181717.svg?logo=github)](https://github.com/Zurplox/PalmSentinel-AI)
[![Python](https://img.shields.io/badge/Python-3.9%20|%203.10%20|%203.11%20|%203.12%20|%203.14-blue.svg)](https://python.org)
[![OpenCV](https://img.shields.io/badge/OpenCV-5.0+-green.svg)](https://opencv.org)
[![Audit](https://img.shields.io/badge/System%20Audit-47%2F47%20PASS%20(100%25)-emerald.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()

---

## 📌 Executive Overview

Counting oil palms (*Elaeis guineensis*) manually across thousands of hectares is slow, error-prone, and costly. Standard AI models frequently crash or exhaust memory when processing raw 100+ megapixel drone orthophotos.

**PalmSentinel AI Pro** delivers an industrial, memory-efficient **Tiled Computer Vision Engine** paired with a Photoshop-caliber **Interactive Desktop & Web Interface**:

* **Handles 100MP+ Orthomosaics**: Built to process 15,000 × 10,000+ px aerial maps smoothly without memory spikes or slowdowns.
* **Photoshop-Style Canvas Navigation**:
  * **Temporary Spacebar Pan**: Hold `Spacebar` anytime to pan across the estate without interrupting active polygon selections.
  * **Draggable Anchor Point Editing**: Click and drag any polygon dot to adjust boundaries on the fly without resetting.
  * **Alt + Click to Delete Point**: Instantly remove specific polygon points with Photoshop Pen Tool ergonomics.
  * **Real-Time Edge Measurements**: Ground distances (in meters) are dynamically rendered along every polygon edge based on sensor GSD.
  * **Precision Wheel & Pinch Zoom**: Snappy focal zoom anchored directly to the mouse cursor up to 35× (3,500%) magnification.
  * **Movable & Collapsible Sensus Summary Box**: Drag the summary card anywhere on screen with 0-offset cursor precision, or minimize it with one click.
  * **Radar Minimap Viewport Navigator**: Corner picture-in-picture overview with draggable viewfinder to jump anywhere across the plantation instantly.
* **Dual Operation Modes**:
  * **Simple Mode**: Intuitive tree size slider (`Young TBM <———> Mature TM`) with **1-Click Tree Calibrator** ("🎯 Click to Sample a Tree").
  * **Advanced Mode**: Fine-grained controls for agronomists (Blur $K_{size}$, Minimum Spacing, ExG Threshold, Ground Sampling Distance).
* **Live 1-Tree Loupe Inspection**: Real-time 100% native resolution magnifier showing how single palms respond to calibration parameters.
* **Canopy Health & Chlorosis Color Grading**: Computes invariant Green Leaf Index (GLI) at crown apex to distinguish vigorous green canopies from nutrient-deficient (chlorotic) or defoliated palms.
* **Multi-Block Estate Session Manager (Afdeling)**: Save multiple named polygon blocks (*Blok 1*, *Blok 2*, etc.) on the same flight with 1-click restore, zooming, and aggregate estate auditing.
* **1-Click Executive Print / PDF Report Generator**: Generates publication-grade agronomy audits with FFB yield modeling and replanting gap cost projections.
* **Titik Sisipan / Replanting Gap Spotter**: Detects missing grid intersections to estimate palm mortality rate.
* **Estate Agronomy Analytics**: Automatic calculation of **Stand Density (SPH / Pokok per Hektar)**, Hectarage, and comparison against benchmark industrial targets (136–143 SPH).
* **Multi-Format GIS Exports**: Instant CSV coordinates for handheld GPS crews, OGC GeoJSON for QGIS/ArcGIS, and annotated high-resolution maps.

---

## 🚀 Quickstart & Launch Options

### Option A: Standalone Windows App (No Browser Required)
If using the compiled Windows distribution:
Simply double-click:
👉 **`PalmSentinel.exe`**

* Launches as a dedicated desktop application window powered by WebView2.
* Zero browser tabs, zero host URL distractions, and zero terminal clutter.

---

### Option B: Clone & Run via Python

```bash
# 1. Clone the repository
git clone https://github.com/Zurplox/PalmSentinel-AI.git
cd PalmSentinel-AI

# 2. Install lightweight dependencies
pip install -r requirements.txt

# 3. Launch the application
# Run as standalone desktop window:
python desktop_app.py

# OR run as web server:
python app.py
```
When running `app.py`, open your browser at `http://127.0.0.1:5000`.

> [!TIP]
> A sample high-resolution estate patch is included in `data/demo_palm_estate.jpg` so the app works instantly out-of-the-box upon cloning!

---

## 📸 Loading Your Own Drone Orthophotos

PalmSentinel AI includes a complete photo ingestion suite accessible right from the top navigation bar:
1. **Dropdown Selector**: Switch instantly between orthophotos stored in `data/`.
2. **📁 Browse / Upload**: Select any `.jpg`, `.png`, `.tif`, or `.tiff` from your computer.
3. **📍 Paste Local Path**: Paste any absolute file path on your drive.
4. **Drag & Drop**: Drag an orthophoto directly from Windows Explorer and drop it anywhere onto the canvas!

---

## ⌨️ Keyboard & Mouse Shortcuts

| Key / Action | Function |
| :--- | :--- |
| **`Spacebar` (Hold)** | Temporary Pan (Photoshop-style): click & drag to move around without losing your active tool |
| **`Mouse Wheel`** | Focal Zoom anchored to cursor position |
| **`Double-Click`** | Instant 1.6× zoom straight into target point (or close in-progress polygon) |
| **`Ctrl + Z` / `Backspace`** | Undo last placed polygon point (step backward 1 point) |
| **`Escape` (Esc)** | Reset polygon selection or cancel active tool |
| **`Alt + Click` on Vertex** | Delete that specific polygon anchor point |
| **`Click & Drag` Vertex** | Move/adjust an existing anchor point with real-time recalculation of SPH and Ha |
| **`Right-Click Drag`** | Alternative pan shortcut |

---

## 🌿 Agronomic Calibration Benchmarks

| Parameter | Mature Palm (*TM*) | Young Palm (*TBM*) | Agronomic Purpose |
| :--- | :--- | :--- | :--- |
| **Crown Blur Radius** | `29 – 35 px` | `17 – 23 px` | Consolidates frond rosette geometry into an apical spear peak (*pucuk*). |
| **Min Tree Spacing** | `65 – 80 px` | `42 – 52 px` | Prevents interlocking fronds from causing duplicate detections. |
| **Vegetation Threshold (ExG)** | `72 – 78` | `68 – 74` | Masks bare peat soil, drainage trenches (*parit cacing*), and roads. |
| **Industry Target SPH** | `136 – 143 SPH` | `143 – 160 SPH` | Standard triangular planting grid ($9.0\text{m} \times 7.8\text{m}$ to $9.2\text{m} \times 8.0\text{m}$). |

---

## 🧪 Comprehensive Automated System Audit

Run the built-in 42-point system verification suite:

```bash
python audit_suite.py
```

Tests filesystem assets, computer vision indices (ExG, VARI, GLI), peak dilation, spatial grid hashing NMS, Shoelace agronomic math, API latency, memory safety, and executable launcher integrity.

---

## 📂 Repository Structure

```
PalmSentinel-AI/
├── PalmSentinel.exe            # Native Windows C# compiled launcher
├── desktop_app.py              # Standalone desktop window runner (WebView2)
├── app.py                      # Flask REST API & high-res image pipeline
├── Launcher.cs                 # C# source code for native launcher
├── audit_suite.py              # 42-point automated enterprise test suite
├── cli.py                      # Terminal CLI batch counting tool
├── run_full_sensus.py          # Multi-block automated estate audit script
├── engine/                     # Computer vision & agronomy algorithms
│   ├── detector.py             # ExG, peak dilation, and spatial NMS
│   ├── tiler.py                # 100MP+ tiled chunk processing manager
│   └── roi_utils.py            # Shoelace polygon area, SPH, and masking
├── templates/
│   └── index.html              # Dark-mode dashboard template
├── static/
│   ├── app.js                  # Canvas engine, Photoshop tools, event controller
│   └── style.css               # User interface styling
├── data/                       # Orthophoto storage directory
│   └── demo_palm_estate.jpg    # Bundled sample orthophoto
├── requirements.txt            # Python dependencies
└── README.md                   # Project documentation
```

---

## 📄 License
Developed for commercial agricultural drone surveying, plantation census auditing, and precision estate management.
