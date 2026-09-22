# 🌴 AGENTS.md — Handover & Operational Directives for AI Agents

> **CRITICAL DIRECTIVE FOR ALL INCOMING AI ASSISTANTS:**
> **DO NOT REBUILD THIS APP FROM SCRATCH.**
> PalmSentinel AI Pro is an existing, fully functioning, 100% verified application with 47 passing audit tests, native Windows launchers, and production computer vision pipelines.
> Always **CONTINUE** and **ENHANCE** what is already built.

---

## 1. Quick Orientation & Workspaces
* **Primary Working Directory**: `F:\PalmSentinel-AI`
* **Local Mirror**: `C:\Users\siapu\.gemini\antigravity\scratch\palm-sensus-ai`
* **GitHub Remote**: `https://github.com/Zurplox/PalmSentinel-AI` (Authenticated as `Zurplox`)
* **Living Documentation**: Read [`SYSTEM_LIVING_LOG.md`](file:///F:/PalmSentinel-AI/SYSTEM_LIVING_LOG.md) before making architectural changes.

---

## 2. Strict Rules & Guardrails
1. **100% Local Privacy (Never Leak User Photos)**:
   * Drone photos in `data/` are strictly local to the user's computer and ignored by Git.
   * NEVER remove `*.jpg`, `*.png`, `*.tif`, `*.tiff` from `.gitignore`.
   * Only `data/demo_palm_estate.jpg` is permitted in Git.
2. **Never Break Native Launchers & Executables**:
   * `PalmSentinel.exe` (compiled C# wrapper around WebView2 supporting `--check` headless diagnostic mode).
   * `Launch_PalmSentinel.bat` and `Launch_PalmSentinel.ps1`.
   * `Launch_Web_Browser.bat` (includes port 5000 polling synchronization).
   * Do not delete or rename these files.
3. **Always Run Verification After Any Edits**:
   * For JS: `node -c static/app.js`
   * For Python: `python -m py_compile app.py desktop_app.py engine/detector.py`
   * Full Audit: `python audit_suite.py` (Must pass all 49 checks 100%, including live `PalmSentinel.exe --check`).
4. **Mirroring Rule**:
   * When modifying `F:\PalmSentinel-AI`, copy updated code to `C:\Users\siapu\.gemini\antigravity\scratch\palm-sensus-ai\`.

---

## 3. Key Architecture & File Map
* `app.py`: Flask backend REST API, tiling server, viewport patcher, report generator.
* `desktop_app.py`: PyWebView desktop wrapper embedding WebView2, supports headless `--check` validation.
* `Launcher.cs` / `PalmSentinel.exe`: Windows native launcher with automatic discovery of Python 3.9–3.14 across LocalAppData, ProgramFiles, Root, and PATH, plus `--check` flag forwarding.
* `engine/detector.py`: Computer vision tree detection (ExG, VARI, GLI vegetative indices, spatial grid hashing NMS, crown apex sampling).
* `engine/tiler.py`: Overlapping tile inference across 100MP+ orthophotos.
* `engine/roi_utils.py`: Shoelace area, SPH calculations, point-in-polygon masking.
* `templates/index.html`: Web interface, Tailwind CSS, high-tech radar minimap, Sensus summary.
* `static/app.js`: High-performance 60fps HTML5 Canvas controller, dynamic patch renderer, multi-block session manager, minimap navigator.
* `audit_suite.py`: Automated 47-point test suite for engines, math, APIs, performance, live executable execution, and launchers.

---

## 4. How to Run & Verify
```powershell
# Run the complete test suite (includes live PalmSentinel.exe verification)
python audit_suite.py

# Commit and push to GitHub
git add -A
git commit -m "Your descriptive commit message"
git push origin main
```
