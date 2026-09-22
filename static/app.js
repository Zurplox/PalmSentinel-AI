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
    isSpacePressed: false,
    hoveredVertexIndex: -1,
    draggedVertexIndex: -1,

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
    showHealthColors: true,
    healthSummary: null,
    savedBlocks: [],
    
    // UI Options
    showNumbers: true,
    showCircles: true,
    activeBlockName: "Blok 1 - TM Utara",

    // Feature A: Row bearing data (populated after count)
    rowBearing: null,       // { row_bearing_deg, row_confidence, secondary_deg } from API
    showRowBearing: false,  // toggled by chk-row-bearing

    // Feature D: Edit mode undo/redo stacks
    editHistory: [],   // each entry = snapshot of state.palms array before the edit
    editFuture: [],    // entries undone (available for redo)

    // Feature B: Age summary (populated after count)
    ageSummary: null
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
const btnUndoPoint = document.getElementById('btn-undo-point');
const inputBlockName = document.getElementById('input-block-name');
const chkMissingPalms = document.getElementById('chk-missing-palms');
const chkDensityHeatmap = document.getElementById('chk-density-heatmap');
const chkShowNumbers = document.getElementById('chk-show-numbers');
const chkShowCircles = document.getElementById('chk-show-circles');
const btnFitScreen = document.getElementById('btn-fit-screen');
const btnNativeRes = document.getElementById('btn-native-res');

// Tool Buttons
const toolPanBtn = document.getElementById('tool-pan');
const toolPolyBtn = document.getElementById('tool-poly');
const toolBoxBtn = document.getElementById('tool-box');
const toolEditBtn = document.getElementById('tool-edit');
const toolInstruction = document.getElementById('tool-instruction');

// Analytics Card (Movable & Collapsible)
const analyticsCard = document.getElementById('analytics-card');
const analyticsCardHeader = document.getElementById('analytics-card-header');
const analyticsCardBody = document.getElementById('analytics-card-body');
const btnToggleAnalytics = document.getElementById('btn-toggle-analytics');
const analyticsMiniBadge = document.getElementById('analytics-mini-badge');
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
const btnTopUpload = document.getElementById('btn-top-upload');
const dropzoneOverlay = document.getElementById('dropzone-overlay');

// Health, Multi-Block, and Minimap Elements
const chkHealthColors = document.getElementById('chk-health-colors');
const btnSaveBlock = document.getElementById('btn-save-block');
const badgeSavedBlocksCount = document.getElementById('badge-saved-blocks-count');
const savedBlocksContainer = document.getElementById('saved-blocks-container');
const savedBlocksList = document.getElementById('saved-blocks-list');
const btnExportReport = document.getElementById('btn-export-report');
const statHealthCard = document.getElementById('stat-health-card');
const statHealthTotal = document.getElementById('stat-health-total');
const statHealthGreen = document.getElementById('stat-health-green');
const statHealthYellow = document.getElementById('stat-health-yellow');
const statHealthRed = document.getElementById('stat-health-red');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapWrapper = document.getElementById('minimap-wrapper');
const minimapViewfinder = document.getElementById('minimap-viewfinder');

// v2.7 New Feature Elements
const chkRowBearing = document.getElementById('chk-row-bearing');
const badgeRowBearing = document.getElementById('badge-row-bearing');
const statRowCard = document.getElementById('stat-row-card');
const statRowBearing = document.getElementById('stat-row-bearing');
const statRowConfidence = document.getElementById('stat-row-confidence');
const statRowSecondary = document.getElementById('stat-row-secondary');

const statAgeCard = document.getElementById('stat-age-card');
const statAgeDominant = document.getElementById('stat-age-dominant');
const statAgeBars = document.getElementById('stat-age-bars');

const sphBar = document.getElementById('sph-bar');

const btnScreenshot = document.getElementById('btn-screenshot');
const shortcutsPanel = document.getElementById('shortcuts-panel');
const btnShortcutsHelp = document.getElementById('btn-shortcuts-help');
const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');

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
            lblPatchStatus.textContent = `⚡ Loaded ${data.filename}`;
            alert(`✅ Successfully loaded local orthophoto: ${data.filename}\n\n🔒 Image is stored 100% locally on your PC (data/) and is excluded from Git/GitHub.`);
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
    if (!container) return;
    const w = container.clientWidth || (window.innerWidth - 384);
    const h = container.clientHeight || (window.innerHeight - 50);
    if (w > 50 && h > 50) {
        canvas.width = w;
        canvas.height = h;
    }
    render();
}

function fitToScreen() {
    if (!state.imageLoaded || !state.image.width) return;
    resizeCanvas();
    const margin = 24;
    const availW = Math.max(50, canvas.width - margin * 2);
    const availH = Math.max(50, canvas.height - margin * 2);
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

const BLOCK_PALETTE = [
    { fill: "rgba(59, 130, 246, 0.22)", stroke: "#3b82f6" }, // Blue
    { fill: "rgba(168, 85, 247, 0.22)", stroke: "#a855f7" }, // Purple
    { fill: "rgba(249, 115, 22, 0.22)", stroke: "#f97316" }, // Orange
    { fill: "rgba(236, 72, 153, 0.22)", stroke: "#ec4899" }, // Pink
    { fill: "rgba(20, 184, 166, 0.22)", stroke: "#14b8a6" }  // Teal
];

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

    // 2.5 Draw Saved Estate Blocks (Multi-Block Session)
    if (state.savedBlocks && state.savedBlocks.length > 0) {
        for (let bIndex = 0; bIndex < state.savedBlocks.length; bIndex++) {
            const b = state.savedBlocks[bIndex];
            if (!b.polygon || b.polygon.length < 3) continue;

            const color = b.color || BLOCK_PALETTE[bIndex % BLOCK_PALETTE.length];
            ctx.beginPath();
            ctx.moveTo(b.polygon[0].x, b.polygon[0].y);
            for (let i = 1; i < b.polygon.length; i++) {
                ctx.lineTo(b.polygon[i].x, b.polygon[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = color.fill;
            ctx.fill();
            ctx.strokeStyle = color.stroke;
            ctx.lineWidth = 2.0 / state.zoom;
            ctx.setLineDash([6 / state.zoom, 4 / state.zoom]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Block Label Badge at centroid
            let cx = 0, cy = 0;
            b.polygon.forEach(pt => { cx += pt.x; cy += pt.y; });
            cx /= b.polygon.length;
            cy /= b.polygon.length;

            const badgeText = `${b.name} (${b.palms ? b.palms.length : 0}p)`;
            ctx.font = `bold ${Math.max(10, Math.round(12 / state.zoom))}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const tw = ctx.measureText(badgeText).width + (8 / state.zoom);
            const th = 16 / state.zoom;
            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            ctx.fillRect(cx - tw / 2, cy - th / 2, tw, th);
            ctx.strokeStyle = color.stroke;
            ctx.lineWidth = 1.2 / state.zoom;
            ctx.strokeRect(cx - tw / 2, cy - th / 2, tw, th);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(badgeText, cx, cy);
        }
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
            ctx.fillStyle = "rgba(16, 185, 129, 0.16)";
            ctx.fill();
        }

        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5 / state.zoom;
        ctx.stroke();

        // Real-time Segment Lengths (m) on lines
        if (state.info && sliderGsd) {
            const gsdM = parseFloat(sliderGsd.value) / 100.0;
            const pts = [...state.polygon];
            if (state.isDrawingPoly && state.hoverPoint) pts.push(state.hoverPoint);
            else if (!state.isDrawingPoly && pts.length >= 3) pts.push(pts[0]);

            ctx.font = `bold ${Math.max(9, Math.round(11 / state.zoom))}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const segLenM = (Math.hypot(p2.x - p1.x, p2.y - p1.y) * state.info.scale_factor * gsdM);
                if (segLenM > 1.0) {
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    const text = `${segLenM.toFixed(1)}m`;
                    const padX = 4 / state.zoom;
                    const padY = 2 / state.zoom;
                    const tw = ctx.measureText(text).width + padX * 2;
                    const th = 13 / state.zoom;

                    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
                    ctx.fillRect(midX - tw / 2, midY - th / 2, tw, th);
                    ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
                    ctx.lineWidth = 1 / state.zoom;
                    ctx.strokeRect(midX - tw / 2, midY - th / 2, tw, th);
                    ctx.fillStyle = "#34d399";
                    ctx.fillText(text, midX, midY);
                }
            }
        }

        // Photoshop-Style Interactive Anchor Points (Vertices)
        for (let i = 0; i < state.polygon.length; i++) {
            const p = state.polygon[i];
            const isHovered = (i === state.hoveredVertexIndex);
            const isDragged = (i === state.draggedVertexIndex);

            const r = (isDragged || isHovered ? 6.5 : 4.5) / state.zoom;

            if (isDragged) {
                // Dragging: Pulsing Cyan Crosshair Handle
                ctx.beginPath();
                ctx.arc(p.x, p.y, r * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = "#38bdf8";
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.5 / state.zoom;
                ctx.stroke();

                // Crosshair guide
                const arm = 14 / state.zoom;
                ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
                ctx.lineWidth = 1.2 / state.zoom;
                ctx.beginPath();
                ctx.moveTo(p.x - arm, p.y); ctx.lineTo(p.x + arm, p.y);
                ctx.moveTo(p.x, p.y - arm); ctx.lineTo(p.x, p.y + arm);
                ctx.stroke();

            } else if (isHovered) {
                // Hovered: Amber Glow Ring with "move" indicator
                ctx.beginPath();
                ctx.arc(p.x, p.y, r * 1.6, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(251, 191, 36, 0.3)";
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = "#fbbf24";
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.0 / state.zoom;
                ctx.stroke();

            } else {
                // Default: Clean White Anchor Point with Emerald Border
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
                ctx.strokeStyle = "#047857";
                ctx.lineWidth = 1.8 / state.zoom;
                ctx.stroke();
            }
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

            // Health Chlorosis Color Grading
            let crownColor = "#22c55e"; // Healthy emerald
            let apexColor = "#ef4444";  // Red spear leaf center
            if (state.showHealthColors && p.health_status) {
                if (p.health_status === "critical") {
                    crownColor = "#ef4444"; // Red for defoliated / severely chlorotic
                    apexColor = "#b91c1c";
                } else if (p.health_status === "stressed") {
                    crownColor = "#f59e0b"; // Amber/yellow for stressed / yellowing
                    apexColor = "#d97706";
                } else {
                    crownColor = "#22c55e"; // Optimal vigorous green
                    apexColor = "#15803d";
                }
            }

            // Outer Crown Circle
            if (state.showCircles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = crownColor;
                ctx.lineWidth = 1.8 / state.zoom;
                ctx.stroke();
            }

            // Apical Bud Center Point (Spear leaf)
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5 / state.zoom, 0, Math.PI * 2);
            ctx.fillStyle = apexColor;
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

    // 6.5 Feature A: Planting Row Alignment Guide Lines
    if (state.showRowBearing && state.rowBearing && state.palms.length >= 4) {
        ctx.save();
        const bearingRad = (state.rowBearing.row_bearing_deg * Math.PI) / 180.0;
        const cosA = Math.cos(bearingRad);
        const sinA = Math.sin(bearingRad);
        const nx = -sinA;
        const ny = cosA;

        const spacing = (parseFloat(sliderSpacing ? sliderSpacing.value : 68) || 68) / (state.info ? state.info.scale_factor : 1.0);
        const rowBinMap = new Map();

        for (let p of state.palms) {
            const projNorm = p.x * nx + p.y * ny;
            const binKey = Math.round(projNorm / spacing);
            if (!rowBinMap.has(binKey)) rowBinMap.set(binKey, []);
            rowBinMap.get(binKey).push(p);
        }

        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.lineWidth = 1.5 / state.zoom;
        ctx.setLineDash([8 / state.zoom, 4 / state.zoom]);

        for (let [binKey, rowPalms] of rowBinMap.entries()) {
            if (rowPalms.length < 2) continue;
            rowPalms.sort((a, b) => (a.x * cosA + a.y * sinA) - (b.x * cosA + b.y * sinA));
            const first = rowPalms[0];
            const last = rowPalms[rowPalms.length - 1];

            const ext = spacing * 0.4;
            const x1 = first.x - cosA * ext;
            const y1 = first.y - sinA * ext;
            const x2 = last.x + cosA * ext;
            const y2 = last.y + sinA * ext;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
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

    // 9. Update Picture-in-Picture Radar Minimap
    renderMinimap();
}

// -------------------------------------------------------------
// RADAR MINIMAP RENDERING & NAVIGATION
// -------------------------------------------------------------
function renderMinimap() {
    if (!minimapCanvas || !state.imageLoaded || !state.image) return;
    const mctx = minimapCanvas.getContext('2d');
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;

    mctx.clearRect(0, 0, mw, mh);

    const imgW = state.image.width || 1;
    const imgH = state.image.height || 1;

    // Draw overview orthophoto
    mctx.drawImage(state.image, 0, 0, mw, mh);

    // Draw saved blocks on minimap
    if (state.savedBlocks && state.savedBlocks.length > 0) {
        state.savedBlocks.forEach(b => {
            if (b.polygon && b.polygon.length >= 3) {
                mctx.beginPath();
                mctx.moveTo((b.polygon[0].x / imgW) * mw, (b.polygon[0].y / imgH) * mh);
                for (let i = 1; i < b.polygon.length; i++) {
                    mctx.lineTo((b.polygon[i].x / imgW) * mw, (b.polygon[i].y / imgH) * mh);
                }
                mctx.closePath();
                mctx.fillStyle = b.color ? b.color.fill : "rgba(59, 130, 246, 0.4)";
                mctx.fill();
                mctx.strokeStyle = b.color ? b.color.stroke : "#3b82f6";
                mctx.lineWidth = 1;
                mctx.stroke();
            }
        });
    }

    // Draw active ROI polygon on minimap
    if (state.polygon && state.polygon.length >= 3) {
        mctx.beginPath();
        mctx.moveTo((state.polygon[0].x / imgW) * mw, (state.polygon[0].y / imgH) * mh);
        for (let i = 1; i < state.polygon.length; i++) {
            mctx.lineTo((state.polygon[i].x / imgW) * mw, (state.polygon[i].y / imgH) * mh);
        }
        mctx.closePath();
        mctx.fillStyle = "rgba(16, 185, 129, 0.45)";
        mctx.fill();
        mctx.strokeStyle = "#10b981";
        mctx.lineWidth = 1.2;
        mctx.stroke();
    }

    // Position and size the interactive viewfinder rectangle
    if (minimapViewfinder) {
        const minX = -state.panX / state.zoom;
        const minY = -state.panY / state.zoom;
        const maxX = (canvas.width - state.panX) / state.zoom;
        const maxY = (canvas.height - state.panY) / state.zoom;

        const vx = Math.max(0, Math.min(mw - 6, (minX / imgW) * mw));
        const vy = Math.max(0, Math.min(mh - 6, (minY / imgH) * mh));
        const vw = Math.max(8, Math.min(mw - vx, ((maxX - minX) / imgW) * mw));
        const vh = Math.max(8, Math.min(mh - vy, ((maxY - minY) / imgH) * mh));

        minimapViewfinder.style.left = `${vx}px`;
        minimapViewfinder.style.top = `${vy}px`;
        minimapViewfinder.style.width = `${vw}px`;
        minimapViewfinder.style.height = `${vh}px`;
    }
}

function handleMinimapInteraction(e) {
    if (!minimapWrapper || !state.imageLoaded || !state.image) return;
    const rect = minimapWrapper.getBoundingClientRect();
    const mx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const my = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const targetImgX = mx * state.image.width;
    const targetImgY = my * state.image.height;

    state.panX = canvas.width / 2 - targetImgX * state.zoom;
    state.panY = canvas.height / 2 - targetImgY * state.zoom;

    scheduleViewportPatch();
    render();
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

    if (btnTopUpload && fileInput) {
        btnTopUpload.addEventListener('click', () => fileInput.click());
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

    // Interactive Drag & Drop on Canvas Container
    ['dragenter', 'dragover'].forEach(evtName => {
        container.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dropzoneOverlay) dropzoneOverlay.classList.remove('hidden');
        });
    });

    ['dragleave'].forEach(evtName => {
        container.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.relatedTarget === null || !container.contains(e.relatedTarget)) {
                if (dropzoneOverlay) dropzoneOverlay.classList.add('hidden');
            }
        });
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzoneOverlay) dropzoneOverlay.classList.add('hidden');
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
    if (toolPanBtn) toolPanBtn.addEventListener('click', () => setTool('pan'));
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

    if (chkHealthColors) {
        chkHealthColors.addEventListener('change', () => {
            state.showHealthColors = chkHealthColors.checked;
            render();
        });
    }

    if (chkRowBearing) {
        chkRowBearing.addEventListener('change', () => {
            state.showRowBearing = chkRowBearing.checked;
            render();
        });
    }

    chkShowNumbers.addEventListener('change', () => { state.showNumbers = chkShowNumbers.checked; render(); });
    chkShowCircles.addEventListener('change', () => { state.showCircles = chkShowCircles.checked; render(); });

    // Buttons
    if (btnCount) btnCount.addEventListener('click', runCount);
    if (btnUndoPoint) btnUndoPoint.addEventListener('click', undoPolygonPoint);
    if (btnClearRoi) {
        btnClearRoi.addEventListener('click', () => {
            resetPolygon(true);
        });
    }
    if (btnSaveBlock) btnSaveBlock.addEventListener('click', saveCurrentBlock);

    if (btnFitScreen) btnFitScreen.addEventListener('click', fitToScreen);
    if (btnNativeRes) {
        btnNativeRes.addEventListener('click', () => {
            state.zoom = 1.0;
            state.panX = (canvas.width - state.image.width) / 2;
            state.panY = (canvas.height - state.image.height) / 2;
            updateZoomLabel();
            scheduleViewportPatch();
            render();
        });
    }

    const btnZoomIn = document.getElementById('btn-zoom-in');
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => zoomBy(1.3));

    const btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => zoomBy(0.77));

    // Exports
    const btnCsv = document.getElementById('btn-export-csv');
    if (btnCsv) btnCsv.addEventListener('click', exportCsv);
    const btnGeo = document.getElementById('btn-export-geojson');
    if (btnGeo) btnGeo.addEventListener('click', exportGeojson);
    const btnImg = document.getElementById('btn-export-img');
    if (btnImg) btnImg.addEventListener('click', exportAnnotatedImage);
    if (btnScreenshot) btnScreenshot.addEventListener('click', exportCanvasScreenshot);
    if (btnExportReport) btnExportReport.addEventListener('click', exportReport);

    // Shortcuts panel toggles
    if (btnShortcutsHelp && shortcutsPanel) {
        btnShortcutsHelp.addEventListener('click', () => {
            shortcutsPanel.classList.toggle('hidden');
        });
    }
    if (btnCloseShortcuts && shortcutsPanel) {
        btnCloseShortcuts.addEventListener('click', () => {
            shortcutsPanel.classList.add('hidden');
        });
    }

    // Radar Minimap Viewport Drag / Click Interaction
    if (minimapWrapper) {
        let isMinimapActive = false;
        minimapWrapper.addEventListener('mousedown', (e) => {
            isMinimapActive = true;
            handleMinimapInteraction(e);
        });
        window.addEventListener('mousemove', (e) => {
            if (isMinimapActive) handleMinimapInteraction(e);
        });
        window.addEventListener('mouseup', () => {
            isMinimapActive = false;
        });
    }

    // Prevent default context menu on canvas & container so right-click pan works cleanly
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Interactions
    canvas.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousedown', (e) => {
        if (e.target === container) handleMouseDown(e);
    });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Canvas & Container Wheel (Intercepts both mouse wheel and touchpad pinches)
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);

    // Strict Window-Level UI Zoom Blocker (Never zoom HTML UI)
    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // Keyboard Shortcuts (Ctrl+Z to Undo, Esc to Reset Polygon, Ctrl + '+/-' to Zoom, Space to Pan)
    window.addEventListener('keydown', (e) => {
        // Spacebar temporary pan (Photoshop-style)
        if (e.code === 'Space' && !e.repeat) {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag !== 'input' && tag !== 'textarea') {
                e.preventDefault();
                state.isSpacePressed = true;
                if (!state.isPanning) {
                    canvas.style.cursor = 'grab';
                    container.style.cursor = 'grab';
                }
                return;
            }
        }

        // Toggle shortcuts panel on ? or F1
        if ((e.key === '?' || e.key === 'F1') && !e.repeat) {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag !== 'input' && tag !== 'textarea' && shortcutsPanel) {
                e.preventDefault();
                shortcutsPanel.classList.toggle('hidden');
                return;
            }
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd' || e.key === 'Add') {
                e.preventDefault();
                zoomBy(1.25);
            } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.key === 'Subtract') {
                e.preventDefault();
                zoomBy(0.8);
            } else if (e.key === '0' || e.code === 'Numpad0') {
                e.preventDefault();
                fitToScreen();
            } else if (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
                // Redo (Ctrl+Y or Ctrl+Shift+Z)
                e.preventDefault();
                if (state.currentTool === 'edit') {
                    redoMarkerEdit();
                }
            } else if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                if (state.currentTool === 'edit') {
                    undoMarkerEdit();
                } else {
                    undoPolygonPoint();
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (shortcutsPanel && !shortcutsPanel.classList.contains('hidden')) {
                shortcutsPanel.classList.add('hidden');
                return;
            }
            resetPolygon(false);
            if (state.isSamplingMode) {
                state.isSamplingMode = false;
                btnSampleTree.classList.remove("bg-emerald-600", "text-white", "animate-pulse");
                btnSampleTree.textContent = "🎯 Click on Map to Sample a Tree";
                canvas.style.cursor = "default";
            }
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag !== 'input' && tag !== 'textarea') {
                e.preventDefault();
                undoPolygonPoint();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            state.isSpacePressed = false;
            if (!state.isPanning) {
                updateCursorForTool();
            }
        }
    });

    // Touch gesture scaling block (Safari / Edge)
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());

    // Touchscreen Multi-Touch Pinch Zoom Support
    setupTouchPinchZoom();

    // Draggable & Collapsible Sensus Summary Card
    setupDraggableCard();
}

function undoPolygonPoint() {
    if (state.polygon.length > 0) {
        state.polygon.pop();
        state.hoveredVertexIndex = -1;
        state.draggedVertexIndex = -1;
        if (state.polygon.length === 0) {
            state.isDrawingPoly = false;
            state.hoverPoint = null;
        } else {
            state.isDrawingPoly = true;
        }
        recalcMetrics();
        updateCursorForTool();
        render();
    }
}

function resetPolygon(fullClear = false) {
    state.polygon = [];
    state.isDrawingPoly = false;
    state.hoverPoint = null;
    state.hoveredVertexIndex = -1;
    state.draggedVertexIndex = -1;
    state.boxStart = null;
    state.boxCurrent = null;
    state.isDrawingBox = false;
    if (fullClear) {
        state.palms = [];
        state.gaps = [];
        resetStats();
    } else {
        recalcMetrics();
    }
    updateCursorForTool();
    render();
}

function setupDraggableCard() {
    if (!analyticsCard || !analyticsCardHeader) return;

    let isDragging = false;
    let grabOffsetX = 0;
    let grabOffsetY = 0;

    analyticsCardHeader.addEventListener('mousedown', (e) => {
        if (e.target.closest('#btn-toggle-analytics') || e.target.tagName.toLowerCase() === 'button') return;
        isDragging = true;

        const cardRect = analyticsCard.getBoundingClientRect();
        grabOffsetX = e.clientX - cardRect.left;
        grabOffsetY = e.clientY - cardRect.top;

        // Position card relative to offsetParent coordinate system to eliminate offset jumps
        const parentRect = (analyticsCard.offsetParent || document.body).getBoundingClientRect();
        analyticsCard.style.right = 'auto';
        analyticsCard.style.bottom = 'auto';
        analyticsCard.style.left = `${cardRect.left - parentRect.left}px`;
        analyticsCard.style.top = `${cardRect.top - parentRect.top}px`;

        analyticsCardHeader.style.cursor = 'grabbing';
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const parentRect = (analyticsCard.offsetParent || document.body).getBoundingClientRect();
        let newLeft = e.clientX - parentRect.left - grabOffsetX;
        let newTop = e.clientY - parentRect.top - grabOffsetY;

        const maxLeft = Math.max(10, parentRect.width - analyticsCard.offsetWidth - 10);
        const maxTop = Math.max(10, parentRect.height - analyticsCard.offsetHeight - 10);

        newLeft = Math.max(10, Math.min(maxLeft, newLeft));
        newTop = Math.max(10, Math.min(maxTop, newTop));

        analyticsCard.style.left = `${newLeft}px`;
        analyticsCard.style.top = `${newTop}px`;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            analyticsCardHeader.style.cursor = 'move';
        }
    });

    if (btnToggleAnalytics && analyticsCardBody) {
        let isCollapsed = false;
        btnToggleAnalytics.addEventListener('click', (e) => {
            e.stopPropagation();
            isCollapsed = !isCollapsed;
            analyticsCardBody.classList.toggle('hidden', isCollapsed);
            btnToggleAnalytics.textContent = isCollapsed ? '▲' : '▼';
            btnToggleAnalytics.title = isCollapsed ? 'Expand Sensus Card' : 'Minimize Sensus Card';
            if (analyticsMiniBadge) {
                analyticsMiniBadge.classList.toggle('hidden', !isCollapsed);
                analyticsMiniBadge.textContent = `${state.palms.length} palms`;
            }
        });
    }
}

function setupTouchPinchZoom() {
    const activePointers = new Map();
    let initialDist = null;
    let initialZoom = null;
    let initialCenter = null;

    canvas.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') {
            activePointers.set(e.pointerId, e);
            if (activePointers.size === 2) {
                const pts = Array.from(activePointers.values());
                initialDist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
                initialZoom = state.zoom;
                const rect = canvas.getBoundingClientRect();
                initialCenter = {
                    x: ((pts[0].clientX + pts[1].clientX) / 2) - rect.left,
                    y: ((pts[0].clientY + pts[1].clientY) / 2) - rect.top
                };
            }
        }
    });

    window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch' && activePointers.has(e.pointerId)) {
            activePointers.set(e.pointerId, e);
            if (activePointers.size === 2 && initialDist && initialCenter) {
                const pts = Array.from(activePointers.values());
                const curDist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
                const scale = curDist / initialDist;
                const newZoom = Math.max(0.04, Math.min(25.0, initialZoom * scale));
                const pt = screenToImage(initialCenter.x, initialCenter.y);
                state.zoom = newZoom;
                state.panX = initialCenter.x - pt.x * state.zoom;
                state.panY = initialCenter.y - pt.y * state.zoom;
                updateZoomLabel();
                scheduleViewportPatch();
                render();
            }
        }
    });

    function removePointer(e) {
        if (activePointers.has(e.pointerId)) {
            activePointers.delete(e.pointerId);
            if (activePointers.size < 2) {
                initialDist = null;
                initialZoom = null;
                initialCenter = null;
            }
        }
    }
    window.addEventListener('pointerup', removePointer);
    window.addEventListener('pointercancel', removePointer);
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

    if (toolPanBtn) toolPanBtn.classList.toggle('active', tool === 'pan');
    toolPolyBtn.classList.toggle('active', tool === 'poly');
    toolBoxBtn.classList.toggle('active', tool === 'box');
    toolEditBtn.classList.toggle('active', tool === 'edit');

    if (tool === 'pan') {
        toolInstruction.textContent = "Click & drag anywhere to pan the map. Hold Spacebar anytime to pan temporarily.";
    } else if (tool === 'poly') {
        toolInstruction.textContent = "Click to place points. Drag points to adjust. Alt+Click point to delete. Hold Space to pan.";
    } else if (tool === 'box') {
        toolInstruction.textContent = "Click and drag to select a rectangular block area. Hold Space to pan.";
    } else if (tool === 'edit') {
        toolInstruction.textContent = "Left-click empty space to ADD a palm. Click existing marker to DELETE it.";
    }
    updateCursorForTool();
}

function updateCursorForTool() {
    if (state.isSpacePressed) {
        canvas.style.cursor = 'grab';
        container.style.cursor = 'grab';
        return;
    }
    if (state.isSamplingMode) {
        canvas.style.cursor = 'crosshair';
        container.style.cursor = 'crosshair';
    } else if (state.currentTool === 'pan') {
        canvas.style.cursor = 'grab';
        container.style.cursor = 'grab';
    } else if (state.currentTool === 'edit') {
        canvas.style.cursor = 'pointer';
        container.style.cursor = 'default';
    } else if (state.hoveredVertexIndex !== -1) {
        canvas.style.cursor = 'move';
        container.style.cursor = 'move';
    } else {
        canvas.style.cursor = 'crosshair';
        container.style.cursor = 'crosshair';
    }
}

function zoomBy(factor) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const pt = screenToImage(cx, cy);

    state.zoom *= factor;
    state.zoom = Math.max(0.04, Math.min(35.0, state.zoom));

    state.panX = cx - pt.x * state.zoom;
    state.panY = cy - pt.y * state.zoom;
    updateZoomLabel();
    scheduleViewportPatch();
    render();
}

function handleWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    const rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    // Anchor focal point within canvas bounds
    if (mouseX < 0 || mouseX > canvas.width || mouseY < 0 || mouseY > canvas.height) {
        mouseX = Math.max(0, Math.min(canvas.width, mouseX));
        mouseY = Math.max(0, Math.min(canvas.height, mouseY));
    }

    const ptBefore = screenToImage(mouseX, mouseY);

    // Differentiate between trackpad pinch gesture (e.ctrlKey) vs standard mouse wheel
    let zoomFactor;
    if (e.ctrlKey) {
        // Trackpad pinch-to-zoom: deltaY gives fine fractional velocity
        zoomFactor = Math.exp(-e.deltaY * 0.01);
    } else {
        // Standard mouse wheel notch: snappy, responsive zoom
        zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
    }

    const newZoom = Math.max(0.04, Math.min(35.0, state.zoom * zoomFactor));
    if (Math.abs(newZoom - state.zoom) < 0.0001) return;

    state.zoom = newZoom;
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

    // Pan with Spacebar (Photoshop temporary pan), Pan Tool, Middle Mouse, Right Click, or Shift+Left Click
    if (state.isSpacePressed || state.currentTool === 'pan' || e.button === 1 || e.button === 2 || e.shiftKey) {
        state.isPanning = true;
        state.startPanX = mx - state.panX;
        state.startPanY = my - state.panY;
        canvas.style.cursor = "grabbing";
        container.style.cursor = "grabbing";
        e.preventDefault();
        return;
    }

    if (e.button === 0) { // Left Click
        // 1. Check if clicking an existing polygon vertex (Photoshop Anchor Point interaction)
        if (state.hoveredVertexIndex !== -1) {
            if (e.altKey) {
                // Alt + Click on vertex: Photoshop Pen Tool feature: Delete that vertex!
                state.polygon.splice(state.hoveredVertexIndex, 1);
                state.hoveredVertexIndex = -1;
                state.draggedVertexIndex = -1;
                if (state.polygon.length === 0) {
                    state.isDrawingPoly = false;
                }
                recalcMetrics();
                updateCursorForTool();
                render();
                return;
            } else {
                // Drag the vertex
                state.draggedVertexIndex = state.hoveredVertexIndex;
                canvas.style.cursor = "grabbing";
                container.style.cursor = "grabbing";
                render();
                return;
            }
        }

        if (state.currentTool === 'poly') {
            const now = Date.now();
            // Guard: ignore the 2nd rapid click that is part of a dblclick sequence
            // (dblclick fires ~20-300ms after first click; the second mousedown would
            //  otherwise start a stray 1-point polygon before dblclick fires)
            const isDblClickSecond = (now - (state._lastPolyClickTime || 0)) < 320;
            state._lastPolyClickTime = now;

            if (!state.isDrawingPoly) {
                // Don't start a new polygon if this looks like the 2nd click of a dblclick
                if (!isDblClickSecond) {
                    state.polygon = [pt];
                    state.isDrawingPoly = true;
                }
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
            recalcMetrics();
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

    // Dragging an existing polygon anchor point (Photoshop vertex manipulation)
    if (state.draggedVertexIndex !== -1 && state.polygon[state.draggedVertexIndex]) {
        state.polygon[state.draggedVertexIndex] = { x: pt.x, y: pt.y };
        recalcMetrics();
        render();
        return;
    }

    // Check vertex hovering when not panning or dragging
    if (state.polygon.length > 0 && !state.isSpacePressed && state.currentTool !== 'pan') {
        const hitRadius = 14 / state.zoom;
        let closestIdx = -1;
        let minDist = hitRadius;

        for (let i = 0; i < state.polygon.length; i++) {
            const p = state.polygon[i];
            const d = Math.hypot(p.x - pt.x, p.y - pt.y);
            if (d < minDist) {
                minDist = d;
                closestIdx = i;
            }
        }

        const prevHover = state.hoveredVertexIndex;
        state.hoveredVertexIndex = closestIdx;
        if (prevHover !== closestIdx) {
            updateCursorForTool();
            render();
        }
    } else if (state.hoveredVertexIndex !== -1) {
        state.hoveredVertexIndex = -1;
        updateCursorForTool();
        render();
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
    if (state.draggedVertexIndex !== -1) {
        state.draggedVertexIndex = -1;
        recalcMetrics();
        scheduleViewportPatch();
        updateCursorForTool();
        render();
    }

    if (state.isPanning) {
        state.isPanning = false;
        updateCursorForTool();
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
            recalcMetrics();
        }
        state.boxStart = null;
        state.boxCurrent = null;
        render();
    }
}

function handleDoubleClick(e) {
    if (state.currentTool === 'poly') {
        if (state.isDrawingPoly) {
            // Close the polygon
            state.isDrawingPoly = false;
            state.hoverPoint = null;
            render();
            return;
        } else if (state.polygon.length === 1) {
            // Clean up stray 1-point ghost polygon that slipped through from the second click
            state.polygon = [];
            state.isDrawingPoly = false;
            render();
            return;
        }
    }
    // Double click on map zooms straight into that point
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const pt = screenToImage(mx, my);
    state.zoom = Math.min(35.0, state.zoom * 1.6);
    state.panX = mx - pt.x * state.zoom;
    state.panY = my - pt.y * state.zoom;
    updateZoomLabel();
    scheduleViewportPatch();
    render();
}

// Manual marker edit with full Undo/Redo history (Feature D)
function handleManualMarkerEdit(pt) {
    // Push current snapshot onto editHistory before applying change
    state.editHistory.push(JSON.parse(JSON.stringify(state.palms)));
    // Clear redo future when a new edit is performed
    state.editFuture = [];

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

function undoMarkerEdit() {
    if (state.editHistory.length > 0) {
        // Save current palms onto redo stack
        state.editFuture.push(JSON.parse(JSON.stringify(state.palms)));
        // Pop previous state
        state.palms = state.editHistory.pop();
        recalcMetrics();
        render();
    }
}

function redoMarkerEdit() {
    if (state.editFuture.length > 0) {
        // Save current palms onto undo stack
        state.editHistory.push(JSON.parse(JSON.stringify(state.palms)));
        // Pop redo state
        state.palms = state.editFuture.pop();
        recalcMetrics();
        render();
    }
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
            state.healthSummary = data.health_summary || null;
            state.rowBearing = data.row_bearing || null;
            state.ageSummary = data.age_summary || null;

            statPalms.textContent = data.total_count.toLocaleString();
            statArea.textContent = data.area_info.area_hectares.toFixed(2);
            statSph.textContent = `${data.sph_info.sph} SPH`;
            statStatus.textContent = data.sph_info.status;
            statTime.textContent = `${data.process_time_s}s`;

            // Feature E: Update SPH Progress Bar vs 136 benchmark
            updateSphBar(data.sph_info.sph);

            // Health card
            if (state.healthSummary && statHealthCard) {
                statHealthCard.classList.remove('hidden');
                if (statHealthGreen) statHealthGreen.textContent = `${state.healthSummary.healthy_count} (${state.healthSummary.healthy_pct}%)`;
                if (statHealthYellow) statHealthYellow.textContent = `${state.healthSummary.stressed_count} (${state.healthSummary.stressed_pct}%)`;
                if (statHealthRed) statHealthRed.textContent = `${state.healthSummary.critical_count} (${state.healthSummary.critical_pct}%)`;
            }

            // Feature A: Row bearing info display
            if (state.rowBearing && state.rowBearing.row_confidence > 0.05 && statRowCard) {
                statRowCard.classList.remove('hidden');
                if (statRowBearing) statRowBearing.textContent = `${state.rowBearing.row_bearing_deg}°`;
                if (statRowConfidence) statRowConfidence.textContent = `${Math.round(state.rowBearing.row_confidence * 100)}%`;
                if (statRowSecondary) statRowSecondary.textContent = `${state.rowBearing.secondary_deg}°`;
                if (badgeRowBearing) {
                    badgeRowBearing.classList.remove('hidden');
                    badgeRowBearing.textContent = `${state.rowBearing.row_bearing_deg}°`;
                }
            } else if (statRowCard) {
                statRowCard.classList.add('hidden');
                if (badgeRowBearing) badgeRowBearing.classList.add('hidden');
            }

            // Feature B: Age summary display
            if (state.ageSummary && state.ageSummary.classes && statAgeCard) {
                statAgeCard.classList.remove('hidden');
                if (statAgeDominant) statAgeDominant.textContent = state.ageSummary.dominant_class;
                if (statAgeBars) {
                    statAgeBars.innerHTML = "";
                    state.ageSummary.classes.forEach(c => {
                        const row = document.createElement('div');
                        row.className = "flex items-center justify-between";
                        row.innerHTML = `
                            <span class="flex items-center gap-1.5 text-slate-300">
                                <span class="w-2 h-2 rounded-full inline-block" style="background-color:${c.color}"></span>
                                <span>${c.label}:</span>
                            </span>
                            <span class="font-mono text-white font-semibold">${c.count} <span class="text-slate-400 font-normal">(${c.pct}%)</span></span>
                        `;
                        statAgeBars.appendChild(row);
                    });
                }
            } else if (statAgeCard) {
                statAgeCard.classList.add('hidden');
            }

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
    if (analyticsMiniBadge) {
        analyticsMiniBadge.textContent = `${state.palms.length.toLocaleString()} palms`;
    }
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
            updateSphBar(sph);
        } else {
            updateSphBar(0);
        }
    } else {
        updateSphBar(0);
    }
}

function updateSphBar(sph) {
    if (!sphBar) return;
    const maxScale = 200.0;
    const pct = Math.min(100, Math.max(0, (sph / maxScale) * 100));
    sphBar.style.width = `${pct}%`;

    // Color-code relative to 136 benchmark
    if (sph === 0) {
        sphBar.className = "h-full rounded-full transition-all duration-500 bg-slate-600";
    } else if (sph < 110) {
        sphBar.className = "h-full rounded-full transition-all duration-500 bg-rose-500"; // Severe vacancy
    } else if (sph < 130) {
        sphBar.className = "h-full rounded-full transition-all duration-500 bg-amber-400"; // Sub-optimal
    } else if (sph <= 148) {
        sphBar.className = "h-full rounded-full transition-all duration-500 bg-emerald-400"; // Target commercial range
    } else {
        sphBar.className = "h-full rounded-full transition-all duration-500 bg-sky-400"; // High density
    }
}

function resetStats() {
    statPalms.textContent = "0";
    statArea.textContent = "0.00";
    statSph.textContent = "0 SPH";
    statStatus.textContent = "Draw an area and click 'Run Palm Sensus Count'.";
    statTime.textContent = "0.0s";
    statGapsCard.classList.add('hidden');
    if (statHealthCard) statHealthCard.classList.add('hidden');
    if (statRowCard) statRowCard.classList.add('hidden');
    if (statAgeCard) statAgeCard.classList.add('hidden');
    if (badgeRowBearing) badgeRowBearing.classList.add('hidden');
    state.healthSummary = null;
    state.rowBearing = null;
    state.ageSummary = null;
    updateSphBar(0);
    if (analyticsMiniBadge) {
        analyticsMiniBadge.textContent = "0 palms";
    }
}

// Feature C: Export current canvas viewport as PNG screenshot
function exportCanvasScreenshot() {
    if (!canvas) return;
    try {
        canvas.toBlob((blob) => {
            if (!blob) {
                alert("Canvas capture failed.");
                return;
            }
            const block = (inputBlockName ? inputBlockName.value.trim() : "") || "viewport";
            const filename = `palmsentinel_view_${block}_${Date.now()}.png`;
            downloadBlob(blob, filename);
        }, 'image/png');
    } catch (err) {
        console.error("Screenshot failed:", err);
        alert("Screenshot export failed: " + err.message);
    }
}

// -------------------------------------------------------------
// MULTI-BLOCK ESTATE SESSION MANAGER
// -------------------------------------------------------------
function saveCurrentBlock() {
    if (state.polygon.length < 3 && state.palms.length === 0) {
        alert("Draw a polygon or run a sensus count first before saving this block.");
        return;
    }
    const blockName = (inputBlockName.value || `Blok ${state.savedBlocks.length + 1}`).trim();
    const areaHa = parseFloat(statArea.textContent) || 0.0;
    const sphVal = parseFloat(statSph.textContent) || 0.0;

    const existingIndex = state.savedBlocks.findIndex(b => b.name.toLowerCase() === blockName.toLowerCase());
    const blockIndex = existingIndex >= 0 ? existingIndex : state.savedBlocks.length;
    const blockData = {
        id: existingIndex >= 0 ? state.savedBlocks[existingIndex].id : "block_" + Date.now(),
        name: blockName,
        polygon: JSON.parse(JSON.stringify(state.polygon)),
        palms: JSON.parse(JSON.stringify(state.palms)),
        gaps: JSON.parse(JSON.stringify(state.gaps)),
        areaHa: areaHa,
        sph: sphVal,
        sphStatus: statStatus.textContent,
        healthSummary: state.healthSummary ? JSON.parse(JSON.stringify(state.healthSummary)) : null,
        color: BLOCK_PALETTE[blockIndex % BLOCK_PALETTE.length]
    };

    if (existingIndex >= 0) {
        state.savedBlocks[existingIndex] = blockData;
    } else {
        state.savedBlocks.push(blockData);
    }
    updateSavedBlocksUI();

    // Prepare workspace for next block selection
    state.polygon = [];
    state.palms = [];
    state.gaps = [];
    resetStats();
    inputBlockName.value = `Blok ${state.savedBlocks.length + 1}`;
    render();
}

function updateSavedBlocksUI() {
    if (!savedBlocksContainer || !savedBlocksList || !badgeSavedBlocksCount) return;
    badgeSavedBlocksCount.textContent = state.savedBlocks.length;

    if (state.savedBlocks.length === 0) {
        savedBlocksContainer.classList.add('hidden');
        savedBlocksList.innerHTML = "";
        return;
    }

    savedBlocksContainer.classList.remove('hidden');
    savedBlocksList.innerHTML = "";

    state.savedBlocks.forEach((b, idx) => {
        const item = document.createElement('div');
        item.className = "flex items-center justify-between bg-slate-900 px-2 py-1.5 rounded border border-slate-700/70 text-xs hover:border-slate-500 transition group";

        const infoSpan = document.createElement('div');
        infoSpan.className = "flex items-center gap-1.5 cursor-pointer flex-1 overflow-hidden";
        infoSpan.title = "Click to zoom into and restore this block";

        const dot = document.createElement('span');
        dot.className = "w-2.5 h-2.5 rounded-full inline-block flex-shrink-0";
        dot.style.backgroundColor = b.color ? b.color.stroke : "#10b981";

        const text = document.createElement('span');
        text.className = "truncate font-medium text-slate-200";
        text.textContent = `${b.name} (${b.palms ? b.palms.length : 0}p | ${b.areaHa.toFixed(1)}Ha)`;

        infoSpan.appendChild(dot);
        infoSpan.appendChild(text);

        infoSpan.addEventListener('click', () => {
            restoreBlock(idx);
        });

        const delBtn = document.createElement('button');
        delBtn.className = "text-slate-500 hover:text-rose-400 px-1 text-xs transition";
        delBtn.title = "Delete this saved block";
        delBtn.textContent = "✕";
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.savedBlocks.splice(idx, 1);
            updateSavedBlocksUI();
            render();
        });

        item.appendChild(infoSpan);
        item.appendChild(delBtn);
        savedBlocksList.appendChild(item);
    });
}

function restoreBlock(index) {
    const b = state.savedBlocks[index];
    if (!b) return;

    state.polygon = JSON.parse(JSON.stringify(b.polygon));
    state.palms = JSON.parse(JSON.stringify(b.palms));
    state.gaps = JSON.parse(JSON.stringify(b.gaps || []));
    state.healthSummary = b.healthSummary ? JSON.parse(JSON.stringify(b.healthSummary)) : null;

    inputBlockName.value = b.name;
    statPalms.textContent = state.palms.length.toLocaleString();
    statArea.textContent = b.areaHa.toFixed(2);
    statSph.textContent = `${b.sph} SPH`;
    statStatus.textContent = b.sphStatus || "Evaluated";

    if (state.healthSummary && statHealthCard) {
        statHealthCard.classList.remove('hidden');
        if (statHealthGreen) statHealthGreen.textContent = `${state.healthSummary.healthy_count} (${state.healthSummary.healthy_pct}%)`;
        if (statHealthYellow) statHealthYellow.textContent = `${state.healthSummary.stressed_count} (${state.healthSummary.stressed_pct}%)`;
        if (statHealthRed) statHealthRed.textContent = `${state.healthSummary.critical_count} (${state.healthSummary.critical_pct}%)`;
    }

    // Zoom and center to this block
    if (state.polygon.length >= 3) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        state.polygon.forEach(pt => {
            minX = Math.min(minX, pt.x);
            maxX = Math.max(maxX, pt.x);
            minY = Math.min(minY, pt.y);
            maxY = Math.max(maxY, pt.y);
        });
        const bw = maxX - minX || 100;
        const bh = maxY - minY || 100;
        const pad = 1.3;
        const z = Math.min(canvas.width / (bw * pad), canvas.height / (bh * pad), 2.5);
        state.zoom = z;
        state.panX = canvas.width / 2 - ((minX + maxX) / 2) * z;
        state.panY = canvas.height / 2 - ((minY + maxY) / 2) * z;
        updateZoomLabel();
        scheduleViewportPatch();
    }
    render();
}

// Export Handlers
async function exportReport() {
    let block = (inputBlockName.value || "Blok-Utama").trim();
    let totalPalms = state.palms.length;
    let areaHa = parseFloat(statArea.textContent) || 0.0;
    let sph = parseFloat(statSph.textContent) || 0.0;
    let sphStatus = statStatus.textContent || "N/A";
    const gapsCount = state.gaps ? state.gaps.length : 0;
    const mortalityPct = parseFloat(statMortality ? statMortality.textContent : 0) || 0.0;
    const gsdCm = sliderGsd ? parseFloat(sliderGsd.value) : 4.0;

    // If active polygon is empty but user saved blocks, aggregate across the whole estate!
    if (totalPalms === 0 && state.savedBlocks.length > 0) {
        block = `Seluruh Estate (${state.savedBlocks.length} Blok)`;
        state.savedBlocks.forEach(b => {
            totalPalms += (b.palms ? b.palms.length : 0);
            areaHa += (b.areaHa || 0);
        });
        if (areaHa > 0) {
            sph = Math.round(totalPalms / areaHa);
            sphStatus = sph >= 130 && sph <= 150 ? "Optimal Estate Standard" : (sph < 130 ? "Under-Target Density" : "High Density Stand");
        }
    }

    const payload = {
        estate_name: "Perkebunan Kelapa Sawit",
        block_name: block,
        total_palms: totalPalms,
        area_ha: areaHa,
        sph: sph,
        sph_status: sphStatus,
        health_summary: state.healthSummary || {
            healthy_count: totalPalms,
            healthy_pct: 100,
            stressed_count: 0,
            stressed_pct: 0,
            critical_count: 0,
            critical_pct: 0
        },
        gaps_count: gapsCount,
        mortality_pct: mortalityPct,
        gsd_cm: gsdCm,
        saved_blocks: state.savedBlocks.map(b => ({
            name: b.name,
            total_palms: b.palms ? b.palms.length : 0,
            palmCount: b.palms ? b.palms.length : 0,
            area_ha: b.areaHa || 0,
            areaHa: b.areaHa || 0,
            sph: b.sph || 0,
            status: b.sphStatus || "Audited"
        }))
    };

    try {
        const res = await fetch('/api/export-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const html = await res.text();
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.open();
            reportWindow.document.write(html);
            reportWindow.document.close();
        } else {
            alert("Popup blocked! Please allow popups to view the printable report.");
        }
    } catch (err) {
        console.error("Export report failed:", err);
        alert("Failed to generate executive report: " + err.message);
    }
}

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
