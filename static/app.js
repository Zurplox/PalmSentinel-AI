/**
 * PalmSentinel AI Pro — Frontend Canvas & Interactive Controller
 * Featuring: Simple/Advanced Modes, Dynamic High-Res Viewport, and Live 1-Tree Loupe
 */

// Application State
const state = {
    info: null,
    image: new Image(),
    imageLoaded: false,
    
    // Viewport transform
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isPanning: false,
    startPanX: 0,
    startPanY: 0,

    // Dynamic High-Res Viewport Patch
    patchImg: new Image(),
    patchLoaded: false,
    patchBBox: null, // { x1, y1, x2, y2 } in full coordinates
    patchTimer: null,

    // Interaction Mode: 'poly', 'box', 'edit', 'sample'
    currentTool: 'poly',
    currentTab: 'simple', // 'simple' or 'advanced'

    // ROI Polygon coordinates in overview image space: [{x, y}, ...]
    polygon: [],
    isDrawingPoly: false,
    hoverPoint: null,

    // Box drawing state
    boxStart: null,
    boxCurrent: null,
    isDrawingBox: false,

    // 1-Tree Loupe State
    sampleX: 4500, // full coords
    sampleY: 4500,
    sampleRadius: 32, // native px
    isSamplingMode: false,

    // Detected palms & Agro-analytics
    palms: [],
    gaps: [],
    showMissingPalms: false,
    showDensityHeatmap: false,
    
    // UI Options
    showNumbers: true,
    showCircles: true,
    activeBlockName: "Blok 1 - TM Utara"
};

// DOM Elements
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

// Tabs
const tabSimple = document.getElementById('tab-simple');
const tabAdvanced = document.getElementById('tab-advanced');
const sectionSimple = document.getElementById('section-simple');
const sectionAdvanced = document.getElementById('section-advanced');

// Loupe Elements
const loupeImg = document.getElementById('loupe-img');
const loupeCircle = document.getElementById('loupe-circle');
const loupeStatus = document.getElementById('loupe-status');
const loupeCoords = document.getElementById('loupe-coords');
const btnSampleTree = document.getElementById('btn-sample-tree');

// Simple Sliders
const sliderSimpleSize = document.getElementById('slider-simple-size');
const valSimpleSize = document.getElementById('val-simple-size');
const sliderSimpleStrict = document.getElementById('slider-simple-strict');
const valSimpleStrict = document.getElementById('val-simple-strict');

// Advanced Sliders
const sliderBlur = document.getElementById('slider-blur');
const valBlur = document.getElementById('val-blur');
const sliderSpacing = document.getElementById('slider-spacing');
const valSpacing = document.getElementById('val-spacing');
const sliderThresh = document.getElementById('slider-thresh');
const valThresh = document.getElementById('val-thresh');
const sliderGsd = document.getElementById('slider-gsd');
const valGsd = document.getElementById('val-gsd');

// Actions & Toggles
const btnCount = document.getElementById('btn-count');
const countSpinner = document.getElementById('count-spinner');
const countBtnText = document.getElementById('count-btn-text');
const btnClearRoi = document.getElementById('btn-clear-roi');
const inputBlockName = document.getElementById('input-block-name');
const chkMissingPalms = document.getElementById('chk-missing-palms');
const chkDensityHeatmap = document.getElementById('chk-density-heatmap');
const chkShowNumbers = document.getElementById('chk-show-numbers');
const chkShowCircles = document.getElementById('chk-show-circles');
const btnNativeRes = document.getElementById('btn-native-res');

// Tool Buttons
const toolPolyBtn = document.getElementById('tool-poly');
const toolBoxBtn = document.getElementById('tool-box');
const toolEditBtn = document.getElementById('tool-edit');
const toolInstruction = document.getElementById('tool-instruction');

// Analytics Card
const statPalms = document.getElementById('stat-palms');
const statArea = document.getElementById('stat-area');
const statSph = document.getElementById('stat-sph');
const statStatus = document.getElementById('stat-status');
const statTime = document.getElementById('stat-time');
const statGapsCard = document.getElementById('stat-gaps-card');
const statGaps = document.getElementById('stat-gaps');
const statMortality = document.getElementById('stat-mortality');
const lblZoom = document.getElementById('lbl-zoom-level');
const posX = document.getElementById('pos-x');
const posY = document.getElementById('pos-y');
const lblPatchStatus = document.getElementById('lbl-patch-status');

// Photo Selector Elements
const selectActivePhoto = document.getElementById('select-active-photo');
const badgePhotoSize = document.getElementById('badge-photo-size');
const btnUploadFile = document.getElementById('btn-upload-file');
const fileInput = document.getElementById('file-input');
const btnTogglePathInput = document.getElementById('btn-toggle-path-input');
const pathInputBox = document.getElementById('path-input-box');
const inputCustomPath = document.getElementById('input-custom-path');
const btnLoadPath = document.getElementById('btn-load-path');

// Initialize
async function initApp() {
    setupEventListeners();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    try {
        const res = await fetch('/api/info');
        const data = await res.json();
        if (!data.success) {
            alert("Error loading orthophoto: " + data.error);
            return;
        }

        state.info = data;
        state.sampleX = Math.round(data.full_width / 2);
        state.sampleY = Math.round(data.full_height / 2);
        if (badgePhotoSize) badgePhotoSize.textContent = `${data.full_width} × ${data.full_height} px`;

        await loadAvailableImages();

        // Load upgraded 4096px overview image
        state.image.onload = () => {
            state.imageLoaded = true;
            fitToScreen();
            updateLoupe(state.sampleX, state.sampleY, state.sampleRadius);
            render();
        };
        state.image.src = '/api/overview-image';

    } catch (err) {
        console.error("Initialization failed:", err);
    }
}

async function loadAvailableImages() {
    try {
        const res = await fetch('/api/list-images');
        const data = await res.json();
        if (data.success && selectActivePhoto) {
            selectActivePhoto.innerHTML = "";
            data.images.forEach(img => {
                const opt = document.createElement('option');
                opt.value = img.path;
                opt.textContent = `${img.filename} (${img.size_mb} MB)`;
                if (img.is_current) opt.selected = true;
                selectActivePhoto.appendChild(opt);
            });
            if (data.images.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = "No images in data folder";
                selectActivePhoto.appendChild(opt);
            }
        }
    } catch (e) {
        console.error("Could not list images:", e);
    }
}

async function switchOrUploadPhoto(formDataOrJson) {
    lblPatchStatus.textContent = "Loading New Photo...";
    countBtnText.textContent = "Decoding New Orthophoto...";
    btnCount.disabled = true;

    try {
        let res;
        if (formDataOrJson instanceof FormData) {
            res = await fetch('/api/load-image', {
                method: 'POST',
                body: formDataOrJson
            });
        } else {
            res = await fetch('/api/load-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formDataOrJson)
            });
        }
        const data = await res.json();

        if (data.success) {
            // Reset canvas state
            state.polygon = [];
            state.palms = [];
            state.gaps = [];
            state.patchLoaded = false;
            resetStats();

            // Re-fetch info & overview
            const infoRes = await fetch('/api/info');
            const infoData = await infoRes.json();
            state.info = infoData;
            if (badgePhotoSize) badgePhotoSize.textContent = `${infoData.full_width} × ${infoData.full_height} px`;

            state.sampleX = Math.round(infoData.full_width / 2);
            state.sampleY = Math.round(infoData.full_height / 2);

            const newImg = new Image();
            newImg.onload = () => {
                state.image = newImg;
                state.imageLoaded = true;
                fitToScreen();
                updateLoupe(state.sampleX, state.sampleY, state.sampleRadius);
                render();
            };
            newImg.src = '/api/overview-image?t=' + Date.now();

            await loadAvailableImages();
            alert("✅ Successfully loaded orthophoto: " + data.filename);
        } else {
            alert("Error loading photo: " + (data.error || "Unknown error"));
        }
    } catch (err) {
        console.error("Switch photo failed:", err);
        alert("Failed to load photo: " + err.message);
    } finally {
        btnCount.disabled = false;
        countBtnText.textContent = "🚀 Run Palm Sensus Count";
    }
}

function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    render();
}

function fitToScreen() {
    if (!state.imageLoaded) return;
    const margin = 40;
    const availW = canvas.width - margin * 2;
    const availH = canvas.height - margin * 2;
    const scaleX = availW / state.image.width;
    const scaleY = availH / state.image.height;
    state.zoom = Math.min(scaleX, scaleY);
    state.panX = (canvas.width - state.image.width * state.zoom) / 2;
    state.panY = (canvas.height - state.image.height * state.zoom) / 2;
    updateZoomLabel();
    render();
}

function updateZoomLabel() {
    lblZoom.textContent = `${Math.round(state.zoom * 100)}%`;
}

// Coordinate conversions
function screenToImage(sx, sy) {
    return {
        x: (sx - state.panX) / state.zoom,
        y: (sy - state.panY) / state.zoom
    };
}

function imageToScreen(ix, iy) {
    return {
        x: ix * state.zoom + state.panX,
        y: iy * state.zoom + state.panY
    };
}

// -------------------------------------------------------------
// DYNAMIC HIGH-RES VIEWPORT ENGINE (Eliminates Blurriness)
// -------------------------------------------------------------
function scheduleViewportPatch() {
    if (!state.info || !state.imageLoaded) return;
    clearTimeout(state.patchTimer);

    // Only load high-res patch if user is zoomed in past 0.35x
    if (state.zoom < 0.35) {
        state.patchLoaded = false;
        lblPatchStatus.textContent = "Overview Mode";
        return;
    }

    lblPatchStatus.textContent = "Fetching 100% Native Pixels...";

    state.patchTimer = setTimeout(async () => {
        const topLeft = screenToImage(0, 0);
        const bottomRight = screenToImage(canvas.width, canvas.height);

        const scale = state.info.scale_factor;
        const x1 = Math.max(0, Math.round(topLeft.x * scale));
        const y1 = Math.max(0, Math.round(topLeft.y * scale));
        const x2 = Math.min(state.info.full_width, Math.round(bottomRight.x * scale));
        const y2 = Math.min(state.info.full_height, Math.round(bottomRight.y * scale));

        if (x2 <= x1 || y2 <= y1) return;

        const url = `/api/viewport-patch?x1=${x1}&y1=${y1}&x2=${x2}&y2=${y2}&max_dim=2560`;
        const tempImg = new Image();
        tempImg.onload = () => {
            state.patchImg = tempImg;
            state.patchBBox = { x1, y1, x2, y2 };
            state.patchLoaded = true;
            lblPatchStatus.textContent = "⚡ Razor-Sharp Native";
            render();
        };
        tempImg.src = url;
    }, 280);
}

// -------------------------------------------------------------
// 1-TREE LIVE INSPECTION LOUPE ENGINE
// -------------------------------------------------------------
function updateLoupe(fullX, fullY, radiusPx) {
    state.sampleX = fullX;
    state.sampleY = fullY;
    state.sampleRadius = radiusPx;

    loupeImg.src = `/api/tree-sample?x=${fullX}&y=${fullY}&size=260&coord_scale=full`;
    loupeCoords.textContent = `${fullX}, ${fullY}`;
    updateLoupeCircleDisplay();
}

function updateLoupeCircleDisplay() {
    // 260px is native crop size. Map to container dimensions
    const containerW = loupeImg.parentElement.clientWidth || 320;
    const scale = containerW / 260.0;
    const circleDiameter = state.sampleRadius * 2 * scale;

    loupeCircle.style.width = `${circleDiameter}px`;
    loupeCircle.style.height = `${circleDiameter}px`;
}

// Auto-Calibrate on Click
async function autoCalibrateAtPoint(screenX, screenY) {
    const pt = screenToImage(screenX, screenY);
    const fullX = Math.round(pt.x * state.info.scale_factor);
    const fullY = Math.round(pt.y * state.info.scale_factor);

    loupeStatus.textContent = "Calibrating...";
    btnSampleTree.classList.add("animate-pulse");

    try {
        const res = await fetch('/api/auto-calibrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: fullX, y: fullY, coord_scale: 'full' })
        });
        const data = await res.json();

        if (data.success) {
            const cal = data.calibrated_tree;
            const rec = data.recommended_parameters;

            state.sampleRadius = rec.crown_radius_px;
            sliderSimpleSize.value = rec.crown_radius_px;
            updateSimpleSizeLabel(rec.crown_radius_px);

            // Sync with advanced sliders
            sliderBlur.value = rec.blur_ksize;
            valBlur.textContent = `${rec.blur_ksize} px`;
            sliderSpacing.value = rec.min_distance_px;
            valSpacing.textContent = `${rec.min_distance_px} px`;
            sliderThresh.value = rec.vegetation_threshold;
            valThresh.textContent = rec.vegetation_threshold;

            updateLoupe(fullX, fullY, rec.crown_radius_px);
            loupeStatus.textContent = cal.category;

            // Turn off sampling mode
            state.isSamplingMode = false;
            btnSampleTree.classList.remove("bg-emerald-600", "text-white", "animate-pulse");
            btnSampleTree.textContent = "🎯 Click on Map to Sample a Tree";
            setTool('poly');
        }
    } catch (err) {
        console.error("Auto calibrate failed:", err);
    }
}

function updateSimpleSizeLabel(r) {
    if (r < 24) {
        valSimpleSize.textContent = `Young TBM (${r} px)`;
    } else if (r < 38) {
        valSimpleSize.textContent = `Mature TM (${r} px)`;
    } else {
        valSimpleSize.textContent = `Large Canopy (${r} px)`;
    }
}

// -------------------------------------------------------------
// MAIN CANVAS RENDER LOOP
// -------------------------------------------------------------
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.imageLoaded) {
        ctx.fillStyle = "#64748b";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Loading drone orthophoto...", canvas.width / 2, canvas.height / 2);
        return;
    }

    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);

    // 1. Draw Overview Orthophoto
    ctx.drawImage(state.image, 0, 0);

    // 2. Draw Dynamic High-Res Viewport Patch (Sharp Native Overlay)
    if (state.patchLoaded && state.patchImg && state.patchBBox) {
        const scale = state.info.scale_factor;
        const px = state.patchBBox.x1 / scale;
        const py = state.patchBBox.y1 / scale;
        const pw = (state.patchBBox.x2 - state.patchBBox.x1) / scale;
        const ph = (state.patchBBox.y2 - state.patchBBox.y1) / scale;
        ctx.drawImage(state.patchImg, px, py, pw, ph);
    }

    // 3. Draw Polygon ROI (if exists)
    if (state.polygon.length > 0) {
        ctx.beginPath();
        ctx.moveTo(state.polygon[0].x, state.polygon[0].y);
        for (let i = 1; i < state.polygon.length; i++) {
            ctx.lineTo(state.polygon[i].x, state.polygon[i].y);
        }

        if (state.isDrawingPoly && state.hoverPoint) {
            ctx.lineTo(state.hoverPoint.x, state.hoverPoint.y);
        } else if (!state.isDrawingPoly && state.polygon.length >= 3) {
            ctx.closePath();
            ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
            ctx.fill();
        }

        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5 / state.zoom;
        ctx.stroke();

        // Vertex handles
        ctx.fillStyle = "#34d399";
        for (let p of state.polygon) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4 / state.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#064e3b";
            ctx.lineWidth = 1 / state.zoom;
            ctx.stroke();
        }
    }

    // 4. Draw Box being dragged
    if (state.isDrawingBox && state.boxStart && state.boxCurrent) {
        const bx = Math.min(state.boxStart.x, state.boxCurrent.x);
        const by = Math.min(state.boxStart.y, state.boxCurrent.y);
        const bw = Math.abs(state.boxCurrent.x - state.boxStart.x);
        const bh = Math.abs(state.boxCurrent.y - state.boxStart.y);

        ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2 / state.zoom;
        ctx.strokeRect(bx, by, bw, bh);
    }

    // 5. Density Heatmap Overlay (Optional Feature)
    if (state.showDensityHeatmap && state.palms.length > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        for (let p of state.palms) {
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, (p.radius || 15) * 1.6);
            grad.addColorStop(0, "rgba(16, 185, 129, 0.8)");
            grad.addColorStop(0.7, "rgba(245, 158, 11, 0.4)");
            grad.addColorStop(1, "rgba(239, 68, 68, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, (p.radius || 15) * 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 6. Draw Detected Palm Markers
    if (state.palms.length > 0) {
        for (let i = 0; i < state.palms.length; i++) {
            const p = state.palms[i];
            const r = (p.radius || 4);

            // Outer Crown Circle
            if (state.showCircles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = "#22c55e";
                ctx.lineWidth = 1.8 / state.zoom;
                ctx.stroke();
            }

            // Apical Bud Center Point (Spear leaf)
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5 / state.zoom, 0, Math.PI * 2);
            ctx.fillStyle = "#ef4444";
            ctx.fill();

            // Tree Sequential Number
            if (state.showNumbers) {
                ctx.font = `${Math.max(9, 11 / state.zoom)}px monospace`;
                ctx.fillStyle = "#ffffff";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 2 / state.zoom;
                const txt = String(p.id || (i + 1));
                const tx = p.x - (txt.length * 3.5) / state.zoom;
                const ty = p.y - (r + 3) / state.zoom;
                ctx.strokeText(txt, tx, ty);
                ctx.fillText(txt, tx, ty);
            }
        }
    }

    // 7. Missing Tree / Vacant Spot Indicators (Titik Sisipan)
    if (state.showMissingPalms && state.gaps.length > 0) {
        for (let g of state.gaps) {
            ctx.beginPath();
            ctx.arc(g.x, g.y, 14 / state.zoom, 0, Math.PI * 2);
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 2.0 / state.zoom;
            ctx.setLineDash([4 / state.zoom, 4 / state.zoom]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Yellow X mark
            const s = 6 / state.zoom;
            ctx.strokeStyle = "#fbbf24";
            ctx.beginPath();
            ctx.moveTo(g.x - s, g.y - s);
            ctx.lineTo(g.x + s, g.y + s);
            ctx.moveTo(g.x + s, g.y - s);
            ctx.lineTo(g.x - s, g.y + s);
            ctx.stroke();
        }
    }

    // 8. Sample Point Marker (The tree currently in the Loupe)
    if (state.info) {
        const sx = state.sampleX / state.info.scale_factor;
        const sy = state.sampleY / state.info.scale_factor;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.0 / state.zoom;
        ctx.strokeRect(sx - 12 / state.zoom, sy - 12 / state.zoom, 24 / state.zoom, 24 / state.zoom);
    }

    ctx.restore();
}

// -------------------------------------------------------------
// EVENT LISTENERS & CONTROLS
// -------------------------------------------------------------
function setupEventListeners() {
    // Mode Switcher Tabs
    tabSimple.addEventListener('click', () => switchTab('simple'));
    tabAdvanced.addEventListener('click', () => switchTab('advanced'));

    // Photo Selector & Uploader Listeners
    if (selectActivePhoto) {
        selectActivePhoto.addEventListener('change', () => {
            const chosenPath = selectActivePhoto.value;
            if (chosenPath) switchOrUploadPhoto({ path: chosenPath });
        });
    }

    if (btnUploadFile && fileInput) {
        btnUploadFile.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const fd = new FormData();
                fd.append('file', fileInput.files[0]);
                switchOrUploadPhoto(fd);
            }
        });
    }

    if (btnTogglePathInput && pathInputBox) {
        btnTogglePathInput.addEventListener('click', () => {
            pathInputBox.classList.toggle('hidden');
        });
    }

    if (btnLoadPath && inputCustomPath) {
        btnLoadPath.addEventListener('click', () => {
            const p = inputCustomPath.value.trim();
            if (p) switchOrUploadPhoto({ path: p });
        });
    }

    // Drag & Drop on Canvas Container
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.style.outline = '3px dashed #10b981';
    });
    container.addEventListener('dragleave', () => {
        container.style.outline = 'none';
    });
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.style.outline = 'none';
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            const fd = new FormData();
            fd.append('file', e.dataTransfer.files[0]);
            switchOrUploadPhoto(fd);
        }
    });

    // 1-Tree Loupe Sample Button
    btnSampleTree.addEventListener('click', () => {
        state.isSamplingMode = !state.isSamplingMode;
        if (state.isSamplingMode) {
            btnSampleTree.classList.add("bg-emerald-600", "text-white");
            btnSampleTree.textContent = "👆 Now Click Any Palm Tree on the Map";
            canvas.style.cursor = "crosshair";
        } else {
            btnSampleTree.classList.remove("bg-emerald-600", "text-white");
            btnSampleTree.textContent = "🎯 Click on Map to Sample a Tree";
            canvas.style.cursor = "default";
        }
    });

    // Simple Size Slider
    sliderSimpleSize.addEventListener('input', () => {
        const r = parseInt(sliderSimpleSize.value);
        state.sampleRadius = r;
        updateSimpleSizeLabel(r);
        updateLoupeCircleDisplay();

        // Sync with advanced sliders
        const recBlur = Math.round(r * 0.9) | 1;
        sliderBlur.value = recBlur;
        valBlur.textContent = `${recBlur} px`;

        const recSpacing = Math.round(r * 2.1);
        sliderSpacing.value = recSpacing;
        valSpacing.textContent = `${recSpacing} px`;
    });

    // Simple Strictness Slider
    sliderSimpleStrict.addEventListener('input', () => {
        const v = parseInt(sliderSimpleStrict.value);
        const labels = ["Very Sensitive", "Relaxed", "Balanced", "Strict", "Very Strict"];
        valSimpleStrict.textContent = labels[v - 1];

        // Map 1-5 to vegetation sensitivity (65 - 90)
        const mappedThresh = 60 + v * 6;
        sliderThresh.value = mappedThresh;
        valThresh.textContent = mappedThresh;
    });

    // Advanced Sliders
    sliderBlur.addEventListener('input', () => { valBlur.textContent = `${sliderBlur.value} px`; });
    sliderSpacing.addEventListener('input', () => { 
        valSpacing.textContent = `${sliderSpacing.value} px`;
        // Sync back to simple size
        const approxR = Math.round(parseInt(sliderSpacing.value) / 2.1);
        sliderSimpleSize.value = Math.max(18, Math.min(55, approxR));
        state.sampleRadius = approxR;
        updateLoupeCircleDisplay();
    });
    sliderThresh.addEventListener('input', () => { valThresh.textContent = sliderThresh.value; });
    sliderGsd.addEventListener('input', () => { 
        valGsd.textContent = `${sliderGsd.value} cm/px`;
        recalcMetrics();
    });

    // Tool Switchers
    toolPolyBtn.addEventListener('click', () => setTool('poly'));
    toolBoxBtn.addEventListener('click', () => setTool('box'));
    toolEditBtn.addEventListener('click', () => setTool('edit'));

    // Toggles
    chkMissingPalms.addEventListener('change', () => {
        state.showMissingPalms = chkMissingPalms.checked;
        if (state.showMissingPalms && state.gaps.length === 0 && state.palms.length > 0) {
            fetchGaps();
        }
        render();
    });

    chkDensityHeatmap.addEventListener('change', () => {
        state.showDensityHeatmap = chkDensityHeatmap.checked;
        render();
    });

    chkShowNumbers.addEventListener('change', () => { state.showNumbers = chkShowNumbers.checked; render(); });
    chkShowCircles.addEventListener('change', () => { state.showCircles = chkShowCircles.checked; render(); });

    // Buttons
    btnCount.addEventListener('click', runCount);
    btnClearRoi.addEventListener('click', () => {
        state.polygon = [];
        state.isDrawingPoly = false;
        state.hoverPoint = null;
        state.palms = [];
        state.gaps = [];
        resetStats();
        render();
    });

    btnFitScreen.addEventListener('click', fitToScreen);
    btnNativeRes.addEventListener('click', () => {
        state.zoom = 1.0;
        updateZoomLabel();
        scheduleViewportPatch();
        render();
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => zoomBy(1.25));
    document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(0.8));

    // Exports
    document.getElementById('btn-export-csv').addEventListener('click', exportCsv);
    document.getElementById('btn-export-geojson').addEventListener('click', exportGeojson);
    document.getElementById('btn-export-img').addEventListener('click', exportAnnotatedImage);

    // Mouse Interactions
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);
}

function switchTab(tab) {
    state.currentTab = tab;
    tabSimple.classList.toggle('active', tab === 'simple');
    tabAdvanced.classList.toggle('active', tab === 'advanced');

    if (tab === 'simple') {
        sectionSimple.classList.remove('hidden');
        sectionAdvanced.classList.add('hidden');
    } else {
        sectionSimple.classList.add('hidden');
        sectionAdvanced.classList.remove('hidden');
    }
}

function setTool(tool) {
    state.currentTool = tool;
    state.isSamplingMode = false;
    btnSampleTree.classList.remove("bg-emerald-600", "text-white");
    btnSampleTree.textContent = "🎯 Click on Map to Sample a Tree";

    toolPolyBtn.classList.toggle('active', tool === 'poly');
    toolBoxBtn.classList.toggle('active', tool === 'box');
    toolEditBtn.classList.toggle('active', tool === 'edit');

    if (tool === 'poly') {
        toolInstruction.textContent = "Click on the image to place polygon vertices. Double-click or click start point to close.";
        canvas.style.cursor = "crosshair";
    } else if (tool === 'box') {
        toolInstruction.textContent = "Click and drag to select a rectangular block area.";
        canvas.style.cursor = "crosshair";
    } else if (tool === 'edit') {
        toolInstruction.textContent = "Left-click empty space to ADD a palm. Click existing marker to DELETE it.";
        canvas.style.cursor = "pointer";
    }
}

function zoomBy(factor) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const pt = screenToImage(cx, cy);

    state.zoom *= factor;
    state.zoom = Math.max(0.05, Math.min(20.0, state.zoom));

    state.panX = cx - pt.x * state.zoom;
    state.panY = cy - pt.y * state.zoom;
    updateZoomLabel();
    scheduleViewportPatch();
    render();
}

function handleWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const ptBefore = screenToImage(mouseX, mouseY);

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    state.zoom *= zoomFactor;
    state.zoom = Math.max(0.05, Math.min(20.0, state.zoom));

    state.panX = mouseX - ptBefore.x * state.zoom;
    state.panY = mouseY - ptBefore.y * state.zoom;
    updateZoomLabel();
    scheduleViewportPatch();
    render();
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const pt = screenToImage(mx, my);

    // If in Sampling Mode: click samples the tree into the loupe
    if (state.isSamplingMode && e.button === 0) {
        autoCalibrateAtPoint(mx, my);
        return;
    }

    // Pan with Middle Mouse Button, Spacebar, or Right Button
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
        state.isPanning = true;
        state.startPanX = mx - state.panX;
        state.startPanY = my - state.panY;
        canvas.style.cursor = "grabbing";
        e.preventDefault();
        return;
    }

    if (e.button === 0) { // Left Click
        if (state.currentTool === 'poly') {
            if (!state.isDrawingPoly) {
                state.polygon = [pt];
                state.isDrawingPoly = true;
            } else {
                const first = state.polygon[0];
                const dist = Math.hypot(pt.x - first.x, pt.y - first.y);
                if (state.polygon.length >= 3 && dist < (15 / state.zoom)) {
                    state.isDrawingPoly = false;
                    state.hoverPoint = null;
                } else {
                    state.polygon.push(pt);
                }
            }
            render();
        } else if (state.currentTool === 'box') {
            state.isDrawingBox = true;
            state.boxStart = pt;
            state.boxCurrent = pt;
        } else if (state.currentTool === 'edit') {
            handleManualMarkerEdit(pt);
        }
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const pt = screenToImage(mx, my);

    if (state.info) {
        const fullX = Math.round(pt.x * state.info.scale_factor);
        const fullY = Math.round(pt.y * state.info.scale_factor);
        posX.textContent = fullX;
        posY.textContent = fullY;
    }

    if (state.isPanning) {
        state.panX = mx - state.startPanX;
        state.panY = my - state.startPanY;
        render();
        return;
    }

    if (state.currentTool === 'poly' && state.isDrawingPoly) {
        state.hoverPoint = pt;
        render();
    } else if (state.currentTool === 'box' && state.isDrawingBox) {
        state.boxCurrent = pt;
        render();
    }
}

function handleMouseUp(e) {
    if (state.isPanning) {
        state.isPanning = false;
        canvas.style.cursor = state.isSamplingMode ? "crosshair" : (state.currentTool === 'edit' ? "pointer" : "crosshair");
        scheduleViewportPatch();
    }

    if (state.isDrawingBox && state.boxStart && state.boxCurrent) {
        state.isDrawingBox = false;
        const x1 = Math.min(state.boxStart.x, state.boxCurrent.x);
        const y1 = Math.min(state.boxStart.y, state.boxCurrent.y);
        const x2 = Math.max(state.boxStart.x, state.boxCurrent.x);
        const y2 = Math.max(state.boxStart.y, state.boxCurrent.y);

        if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
            state.polygon = [
                { x: x1, y: y1 },
                { x: x2, y: y1 },
                { x: x2, y: y2 },
                { x: x1, y: y2 }
            ];
        }
        state.boxStart = null;
        state.boxCurrent = null;
        render();
    }
}

function handleDoubleClick(e) {
    if (state.currentTool === 'poly' && state.isDrawingPoly) {
        state.isDrawingPoly = false;
        state.hoverPoint = null;
        render();
    }
}

// Manual marker edit
function handleManualMarkerEdit(pt) {
    const clickRadius = 15 / state.zoom;
    let deleteIdx = -1;

    for (let i = 0; i < state.palms.length; i++) {
        const p = state.palms[i];
        const dist = Math.hypot(p.x - pt.x, p.y - pt.y);
        if (dist < Math.max(clickRadius, p.radius || 10)) {
            deleteIdx = i;
            break;
        }
    }

    if (deleteIdx !== -1) {
        state.palms.splice(deleteIdx, 1);
    } else {
        const newPalm = {
            id: state.palms.length + 1,
            x: Math.round(pt.x),
            y: Math.round(pt.y),
            radius: state.sampleRadius / state.info.scale_factor,
            confidence: 1.0,
            full_x: Math.round(pt.x * state.info.scale_factor),
            full_y: Math.round(pt.y * state.info.scale_factor)
        };
        state.palms.push(newPalm);
    }

    state.palms.forEach((p, idx) => p.id = idx + 1);
    recalcMetrics();
    render();
}

// Execute Sensus Count
async function runCount() {
    if (!state.info) return;

    btnCount.disabled = true;
    countSpinner.classList.remove('hidden');
    countBtnText.textContent = "Processing 138MP Native Orthophoto...";

    const polygonPayload = state.polygon.map(p => [p.x, p.y]);

    const payload = {
        coord_scale: "overview",
        polygon: polygonPayload,
        gsd_cm: parseFloat(sliderGsd.value),
        blur_ksize: parseInt(sliderBlur.value),
        dilation_radius: Math.round(parseInt(sliderSpacing.value) * 0.45),
        min_distance_px: parseInt(sliderSpacing.value),
        vegetation_threshold: parseInt(sliderThresh.value)
    };

    try {
        const res = await fetch('/api/count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            state.palms = data.palms;
            statPalms.textContent = data.total_count.toLocaleString();
            statArea.textContent = data.area_info.area_hectares.toFixed(2);
            statSph.textContent = `${data.sph_info.sph} SPH`;
            statStatus.textContent = data.sph_info.status;
            statTime.textContent = `${data.process_time_s}s`;

            if (state.showMissingPalms) {
                fetchGaps();
            }

            render();
        } else {
            alert("Detection error: " + data.error);
        }
    } catch (err) {
        console.error("Count request failed:", err);
        alert("Failed to connect to server.");
    } finally {
        btnCount.disabled = false;
        countSpinner.classList.add('hidden');
        countBtnText.textContent = "🚀 Run Palm Sensus Count";
    }
}

// Fetch Missing Palms / Grid Gaps
async function fetchGaps() {
    if (state.palms.length < 5 || state.polygon.length < 3) return;

    const payload = {
        palms: state.palms,
        polygon: state.polygon.map(p => [p.x, p.y]),
        expected_spacing: parseFloat(sliderSpacing.value) / state.info.scale_factor
    };

    try {
        const res = await fetch('/api/detect-gaps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            state.gaps = data.gaps;
            statGapsCard.classList.remove('hidden');
            statGaps.textContent = data.total_gaps;
            statMortality.textContent = `${data.mortality_percent}%`;
            render();
        }
    } catch (err) {
        console.error("Fetch gaps failed:", err);
    }
}

function recalcMetrics() {
    statPalms.textContent = state.palms.length.toLocaleString();
    if (state.polygon.length >= 3) {
        let areaPx = 0;
        for (let i = 0; i < state.polygon.length; i++) {
            let j = (i + 1) % state.polygon.length;
            areaPx += state.polygon[i].x * state.polygon[j].y;
            areaPx -= state.polygon[j].x * state.polygon[i].y;
        }
        areaPx = Math.abs(areaPx) * 0.5;

        const scale = state.info ? state.info.scale_factor : 1.0;
        const fullAreaPx = areaPx * (scale ** 2);
        const gsdM = parseFloat(sliderGsd.value) / 100.0;
        const areaM2 = fullAreaPx * (gsdM ** 2);
        const areaHa = areaM2 / 10000.0;

        statArea.textContent = areaHa.toFixed(2);
        if (areaHa > 0) {
            const sph = Math.round(state.palms.length / areaHa);
            statSph.textContent = `${sph} SPH`;
        }
    }
}

function resetStats() {
    statPalms.textContent = "0";
    statArea.textContent = "0.00";
    statSph.textContent = "0 SPH";
    statStatus.textContent = "Draw an area and click 'Run Palm Sensus Count'.";
    statTime.textContent = "0.0s";
    statGapsCard.classList.add('hidden');
}

// Export Handlers
async function exportCsv() {
    if (state.palms.length === 0) {
        alert("No palm detections to export. Run sensus count first!");
        return;
    }
    const block = inputBlockName.value.trim() || "Blok-Utama";
    const res = await fetch('/api/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palms: state.palms, block_name: block })
    });
    const blob = await res.blob();
    downloadBlob(blob, `sensus_pokok_${block}.csv`);
}

async function exportGeojson() {
    if (state.palms.length === 0) {
        alert("No palm detections to export. Run sensus count first!");
        return;
    }
    const block = inputBlockName.value.trim() || "Blok-Utama";
    const res = await fetch('/api/export-geojson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palms: state.palms, block_name: block })
    });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `sensus_${block}.geojson`);
}

async function exportAnnotatedImage() {
    if (state.palms.length === 0) {
        alert("No palm detections to export. Run sensus count first!");
        return;
    }
    const block = inputBlockName.value.trim() || "Blok-Utama";
    const polygonPayload = state.polygon.map(p => [p.x, p.y]);
    const res = await fetch('/api/export-annotated-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palms: state.palms, polygon: polygonPayload, block_name: block })
    });
    const blob = await res.blob();
    downloadBlob(blob, `annotated_${block}.jpg`);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Start app
window.addEventListener('DOMContentLoaded', initApp);
