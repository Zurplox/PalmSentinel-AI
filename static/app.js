/**
 * PalmSensus AI — Frontend Canvas & Interactive Controller
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

    // Interaction Mode: 'poly', 'box', 'edit'
    currentTool: 'poly',

    // ROI Polygon coordinates in overview image space: [{x, y}, ...]
    polygon: [],
    isDrawingPoly: false,
    hoverPoint: null,

    // Box drawing state
    boxStart: null,
    boxCurrent: null,
    isDrawingBox: false,

    // Detected palms: [{id, x, y, radius, confidence, full_x, full_y}, ...]
    palms: [],
    
    // UI Options
    showNumbers: true,
    showCircles: true,
    activeBlockName: "Blok 1 - TM Utara"
};

// DOM Elements
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

// Elements - Badges & Labels
const lblFilename = document.getElementById('lbl-filename');
const lblResolution = document.getElementById('lbl-resolution');
const lblZoom = document.getElementById('lbl-zoom-level');
const posX = document.getElementById('pos-x');
const posY = document.getElementById('pos-y');
const toolInstruction = document.getElementById('tool-instruction');

// Elements - Sliders & Values
const sliderBlur = document.getElementById('slider-blur');
const valBlur = document.getElementById('val-blur');
const sliderSpacing = document.getElementById('slider-spacing');
const valSpacing = document.getElementById('val-spacing');
const sliderThresh = document.getElementById('slider-thresh');
const valThresh = document.getElementById('val-thresh');
const sliderGsd = document.getElementById('slider-gsd');
const valGsd = document.getElementById('val-gsd');
const selectPreset = document.getElementById('select-preset');
const inputBlockName = document.getElementById('input-block-name');

// Elements - Buttons
const btnCount = document.getElementById('btn-count');
const countSpinner = document.getElementById('count-spinner');
const countBtnText = document.getElementById('count-btn-text');
const btnClearRoi = document.getElementById('btn-clear-roi');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnExportGeojson = document.getElementById('btn-export-geojson');
const btnExportImg = document.getElementById('btn-export-img');
const btnFitScreen = document.getElementById('btn-fit-screen');
const btnResetView = document.getElementById('btn-reset-view');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');

// Elements - Analytics Card
const statPalms = document.getElementById('stat-palms');
const statArea = document.getElementById('stat-area');
const statSph = document.getElementById('stat-sph');
const statStatus = document.getElementById('stat-status');
const statTime = document.getElementById('stat-time');
const chkShowNumbers = document.getElementById('chk-show-numbers');
const chkShowCircles = document.getElementById('chk-show-circles');

// Tool Buttons
const toolPolyBtn = document.getElementById('tool-poly');
const toolBoxBtn = document.getElementById('tool-box');
const toolEditBtn = document.getElementById('tool-edit');

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
        lblFilename.textContent = data.filename;
        lblResolution.textContent = `${data.full_width} × ${data.full_height} px`;

        // Load overview image
        state.image.onload = () => {
            state.imageLoaded = true;
            fitToScreen();
            render();
        };
        state.image.src = '/api/overview-image';

    } catch (err) {
        console.error("Initialization failed:", err);
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

// Render loop
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

    // 1. Draw Drone Orthophoto Overview
    ctx.drawImage(state.image, 0, 0);

    // 2. Draw Polygon ROI (if exists)
    if (state.polygon.length > 0) {
        ctx.beginPath();
        ctx.moveTo(state.polygon[0].x, state.polygon[0].y);
        for (let i = 1; i < state.polygon.length; i++) {
            ctx.lineTo(state.polygon[i].x, state.polygon[i].y);
        }

        // If in polygon drawing mode and have a hover point, draw line to it
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

        // Draw Vertex handles
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

    // 3. Draw Box being dragged
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

    // 4. Draw Detected Palm Markers
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

    ctx.restore();
}

// Event Listeners
function setupEventListeners() {
    // Zoom Buttons
    btnZoomIn.addEventListener('click', () => zoomBy(1.25));
    btnZoomOut.addEventListener('click', () => zoomBy(0.8));
    btnResetView.addEventListener('click', () => { state.zoom = 1.0; state.panX = 0; state.panY = 0; updateZoomLabel(); render(); });
    btnFitScreen.addEventListener('click', fitToScreen);

    // Sliders
    sliderBlur.addEventListener('input', () => { valBlur.textContent = `${sliderBlur.value} px`; });
    sliderSpacing.addEventListener('input', () => { valSpacing.textContent = `${sliderSpacing.value} px`; });
    sliderThresh.addEventListener('input', () => { valThresh.textContent = sliderThresh.value; });
    sliderGsd.addEventListener('input', () => { 
        valGsd.textContent = `${sliderGsd.value} cm/px`;
        recalcMetrics();
    });

    // Preset Selection
    selectPreset.addEventListener('change', () => {
        const p = selectPreset.value;
        if (state.info && state.info.presets && state.info.presets[p]) {
            const conf = state.info.presets[p];
            sliderBlur.value = conf.blur_ksize;
            valBlur.textContent = `${conf.blur_ksize} px`;

            sliderSpacing.value = conf.min_distance_px;
            valSpacing.textContent = `${conf.min_distance_px} px`;

            sliderThresh.value = conf.vegetation_threshold;
            valThresh.textContent = conf.vegetation_threshold;
        }
    });

    // Tool Switchers
    toolPolyBtn.addEventListener('click', () => setTool('poly'));
    toolBoxBtn.addEventListener('click', () => setTool('box'));
    toolEditBtn.addEventListener('click', () => setTool('edit'));

    // Clear ROI
    btnClearRoi.addEventListener('click', () => {
        state.polygon = [];
        state.isDrawingPoly = false;
        state.hoverPoint = null;
        state.palms = [];
        resetStats();
        render();
    });

    // Display Toggles
    chkShowNumbers.addEventListener('change', () => { state.showNumbers = chkShowNumbers.checked; render(); });
    chkShowCircles.addEventListener('change', () => { state.showCircles = chkShowCircles.checked; render(); });

    // Mouse Interactions on Canvas
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);

    // Execute Count Button
    btnCount.addEventListener('click', runCount);

    // Export Buttons
    btnExportCsv.addEventListener('click', exportCsv);
    btnExportGeojson.addEventListener('click', exportGeojson);
    btnExportImg.addEventListener('click', exportAnnotatedImage);
}

function setTool(tool) {
    state.currentTool = tool;
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
    render();
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const pt = screenToImage(mx, my);

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
                // Check if clicked close to initial point -> close polygon
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

    // Update coordinate indicator
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
        canvas.style.cursor = state.currentTool === 'edit' ? "pointer" : "crosshair";
    }

    if (state.isDrawingBox && state.boxStart && state.boxCurrent) {
        state.isDrawingBox = false;
        const x1 = Math.min(state.boxStart.x, state.boxCurrent.x);
        const y1 = Math.min(state.boxStart.y, state.boxCurrent.y);
        const x2 = Math.max(state.boxStart.x, state.boxCurrent.x);
        const y2 = Math.max(state.boxStart.y, state.boxCurrent.y);

        // Convert box to polygon vertices
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

// Manual marker edit: add or delete
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
        // Delete palm
        state.palms.splice(deleteIdx, 1);
    } else {
        // Add new palm
        const newPalm = {
            id: state.palms.length + 1,
            x: Math.round(pt.x),
            y: Math.round(pt.y),
            radius: 8,
            confidence: 1.0,
            full_x: Math.round(pt.x * state.info.scale_factor),
            full_y: Math.round(pt.y * state.info.scale_factor)
        };
        state.palms.push(newPalm);
    }

    // Re-index IDs
    state.palms.forEach((p, idx) => p.id = idx + 1);

    recalcMetrics();
    render();
}

// Run Sensus Count via Backend API
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
        preset: selectPreset.value,
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

function recalcMetrics() {
    statPalms.textContent = state.palms.length.toLocaleString();
    if (state.polygon.length >= 3) {
        // Approximate area from overview polygon
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
