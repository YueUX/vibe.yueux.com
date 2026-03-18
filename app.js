/**
 * Sticker Generator v9
 * - Elegant color picker (presets + native input with hex label)
 * - iOS-style sticker effects: Original, Puffy, Shiny (Holographic), Comic
 * - Shadow, Preview BG, Emoji mode all preserved
 */

// ============= State =============
const state = {
    mode: 'image',
    originalImage: null,
    originalFile: null,
    bgRemovedCanvas: null,
    resultCanvas: null,
    emojiCanvas: null,
    settings: {
        strokeWidth: 8,
        strokeColor: '#FFFFFF',
        strokeStyle: 'solid',
        strokeJoin: 'round',
        enableShadow: false,
        shadowX: 3, shadowY: 3, shadowBlur: 6,
        shadowColor: '#000000', shadowOpacity: 40,
        // Sticker effect: 'none' | 'puffy' | 'shiny' | 'comic'
        stickerEffect: 'none',
        shinyAngle: 135,
        shinyIntensity: 60,
        puffyDepth: 4,
        outputPadding: 20,
        previewBg: 'checker',
        emojiFontSize: 256,
    },
    comparing: false,
    processing: false,
    apiKey: localStorage.getItem('removebg_api_key') || '',
    creditInfo: null,
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const els = {};

// ============= Init =============
document.addEventListener('DOMContentLoaded', () => {
    // Image mode
    els.uploadZone = $('#uploadZone');
    els.fileInput = $('#fileInput');
    els.resultArea = $('#resultArea');
    els.loadingOverlay = $('#loadingOverlay');
    els.loadingText = $('#loadingText');
    els.loadingBar = $('#loadingBar');
    els.toast = $('#toast');
    els.previewCanvas = $('#previewCanvas');
    els.previewContainer = $('#previewContainer');
    els.previewLabel = $('#previewLabel');
    els.compareBtn = $('#compareBtn');
    els.resetBtn = $('#resetBtn');
    els.downloadBtn = $('#downloadBtn');
    els.downloadSvgBtn = $('#downloadSvgBtn');
    els.copyBtn = $('#copyBtn');
    els.apiKeyInput = $('#apiKeyInput');
    els.apiKeyToggle = $('#apiKeyToggle');
    els.apiKeyStatus = $('#apiKeyStatus');
    els.apiKeyWrap = $('#apiKeyWrap');
    els.shadowControls = $('#shadowControls');
    els.imageWorkspace = $('#imageWorkspace');
    els.emojiWorkspace = $('#emojiWorkspace');
    els.apiKeySection = $('#apiKeySection');
    els.emojiFontSizeControl = $('#emojiFontSizeControl');
    els.shinyControls = $('#shinyControls');
    els.puffyControls = $('#puffyControls');
    els.colorHexLabel = $('#colorHexLabel');
    els.creditBar = $('#creditBar');
    els.creditCount = $('#creditCount');
    els.creditFill = $('#creditFill');
    els.creditDetail = $('#creditDetail');

    // Emoji mode
    els.emojiInput = $('#emojiInput');
    els.emojiPreviewCanvas = $('#emojiPreviewCanvas');
    els.emojiPreviewContainer = $('#emojiPreviewContainer');
    els.emojiDownloadBtn = $('#emojiDownloadBtn');
    els.emojiCopyBtn = $('#emojiCopyBtn');

    // Restore API key
    if (state.apiKey) {
        els.apiKeyInput.value = state.apiKey;
        updateApiKeyStatus(true);
    }

    bindUpload();
    bindCompare();
    bindSettings();
    bindActions();
    bindApiKey();
    bindModeSwitcher();
    bindPreviewBg();
    bindStickerEffect();
    bindEmoji();
    updateShadowUI();
    updateEffectSubControls();
    updateColorHexLabel(state.settings.strokeColor);

    // Fetch credits on load
    if (state.apiKey) setTimeout(fetchCredits, 500);

    // Initial emoji render
    renderEmoji();
});

// ============= Mode Switcher =============
function bindModeSwitcher() {
    $$('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.mode = btn.dataset.mode;

            const isEmoji = state.mode === 'emoji';
            els.imageWorkspace.style.display = isEmoji ? 'none' : '';
            els.emojiWorkspace.style.display = isEmoji ? '' : 'none';
            els.apiKeySection.style.display = isEmoji ? 'none' : '';
            els.emojiFontSizeControl.classList.toggle('hidden', !isEmoji);

            if (isEmoji) renderEmoji();
        });
    });
}

// ============= Preview Background =============
function bindPreviewBg() {
    $$('.seg-bg').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.seg-bg').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.settings.previewBg = btn.dataset.bg;
            applyPreviewBg();
        });
    });
}

function applyPreviewBg() {
    const containers = [els.previewContainer, els.emojiPreviewContainer];
    containers.forEach(c => {
        if (!c) return;
        c.classList.remove('checkerboard', 'bg-white', 'bg-dark');
        switch (state.settings.previewBg) {
            case 'white': c.classList.add('bg-white'); break;
            case 'dark': c.classList.add('bg-dark'); break;
            default: c.classList.add('checkerboard'); break;
        }
    });
}

// ============= Sticker Effect =============
function bindStickerEffect() {
    $$('.effect-card').forEach(card => {
        card.addEventListener('click', () => {
            $$('.effect-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.settings.stickerEffect = card.dataset.effect;
            updateEffectSubControls();
            rerender();
        });
    });

    // Shiny controls
    bindRange('shinyAngle', 'shinyAngleVal', '°', v => { state.settings.shinyAngle = v; rerender(); });
    bindRange('shinyIntensity', 'shinyIntensityVal', '%', v => { state.settings.shinyIntensity = v; rerender(); });

    // Puffy controls
    bindRange('puffyDepth', 'puffyDepthVal', '', v => { state.settings.puffyDepth = v; rerender(); });
}

function updateEffectSubControls() {
    const eff = state.settings.stickerEffect;
    els.shinyControls.classList.toggle('visible', eff === 'shiny');
    els.puffyControls.classList.toggle('visible', eff === 'puffy');
}

// ============= API Key =============
function bindApiKey() {
    let _creditDebounce;
    els.apiKeyInput.addEventListener('input', e => {
        const key = e.target.value.trim();
        state.apiKey = key;
        if (key) {
            localStorage.setItem('removebg_api_key', key);
            updateApiKeyStatus(true);
            clearTimeout(_creditDebounce);
            _creditDebounce = setTimeout(fetchCredits, 600);
        } else {
            localStorage.removeItem('removebg_api_key');
            updateApiKeyStatus(false);
            if (els.creditBar) els.creditBar.classList.add('hidden');
        }
    });
    els.apiKeyToggle.addEventListener('click', () => {
        const input = els.apiKeyInput;
        input.type = input.type === 'password' ? 'text' : 'password';
    });
}

function updateApiKeyStatus(hasKey) {
    if (hasKey) {
        els.apiKeyStatus.textContent = 'API key saved';
        els.apiKeyStatus.classList.add('connected');
    } else {
        els.apiKeyStatus.textContent = 'Required for background removal';
        els.apiKeyStatus.classList.remove('connected');
    }
}

// ============= Upload =============
function bindUpload() {
    const zone = els.uploadZone;
    zone.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    document.addEventListener('paste', e => {
        if (e.target.closest('input[type="text"], input[type="password"], textarea')) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) { showToast('Image pasted!', 'success'); handleFile(file); }
                return;
            }
        }
    });
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) { showToast('Please upload an image', 'error'); return; }
    if (file.size > 25 * 1024 * 1024) { showToast('Max 25 MB', 'error'); return; }
    if (!state.apiKey) {
        showToast('Enter your Remove.bg API key first', 'error');
        els.apiKeyInput.focus();
        els.apiKeyWrap.classList.add('shake');
        setTimeout(() => els.apiKeyWrap.classList.remove('shake'), 500);
        return;
    }
    // If in emoji mode, switch to image mode
    if (state.mode === 'emoji') {
        $$('.mode-btn').forEach(b => b.classList.remove('active'));
        $('[data-mode="image"]').classList.add('active');
        state.mode = 'image';
        els.imageWorkspace.style.display = '';
        els.emojiWorkspace.style.display = 'none';
        els.apiKeySection.style.display = '';
        els.emojiFontSizeControl.classList.add('hidden');
    }

    const img = new Image();
    img.onload = () => {
        state.originalImage = img;
        state.originalFile = file;
        els.uploadZone.classList.add('hidden');
        els.resultArea.classList.remove('hidden');
        processImage();
    };
    img.src = URL.createObjectURL(file);
}

// ============= Compare =============
function bindCompare() {
    const btn = els.compareBtn;
    const showOrig = () => {
        if (!state.originalImage || !state.resultCanvas) return;
        state.comparing = true; btn.classList.add('active');
        els.previewLabel.textContent = 'Original';
        drawToCanvas(els.previewCanvas, state.originalImage);
    };
    const showResult = () => {
        if (!state.resultCanvas) return;
        state.comparing = false; btn.classList.remove('active');
        els.previewLabel.textContent = 'Sticker';
        drawToCanvas(els.previewCanvas, state.resultCanvas);
    };

    btn.addEventListener('mousedown', e => { e.preventDefault(); showOrig(); });
    btn.addEventListener('mouseup', showResult);
    btn.addEventListener('mouseleave', () => { if (state.comparing) showResult(); });
    btn.addEventListener('touchstart', e => { e.preventDefault(); showOrig(); });
    btn.addEventListener('touchend', showResult);
    btn.addEventListener('touchcancel', showResult);

    document.addEventListener('keydown', e => {
        if (e.code === 'Space' && !e.repeat && !e.target.closest('input, textarea, button')) {
            e.preventDefault(); showOrig();
        }
    });
    document.addEventListener('keyup', e => { if (e.code === 'Space' && state.comparing) showResult(); });
}

// ============= Pipeline =============
async function processImage() {
    if (!state.originalImage || state.processing) return;
    state.processing = true;

    try {
        setStep(1); updateProgress(5);
        showLoading('Removing background…');

        const bgBlob = await removeBgApi(state.originalFile);
        const bgImg = await blobToImage(bgBlob);
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = bgImg.naturalWidth;
        bgCanvas.height = bgImg.naturalHeight;
        bgCanvas.getContext('2d').drawImage(bgImg, 0, 0);
        state.bgRemovedCanvas = bgCanvas;

        setStep(1, 'completed'); updateProgress(70);
        showLoading('Generating sticker…'); setStep(2);
        await yieldToMain();
        setStep(2, 'completed'); updateProgress(85);
        setStep(3); await yieldToMain();

        state.resultCanvas = generateSticker(bgCanvas);
        setStep(3, 'completed'); updateProgress(100);
        await yieldToMain();

        hideLoading();
        renderPreview();
    } catch (err) {
        console.error('Processing error:', err);
        hideLoading();
        if (err.message.includes('API key') || err.message.includes('401') || err.message.includes('403')) {
            showToast('Invalid API key — check your Remove.bg key', 'error');
        } else if (err.message.includes('402')) {
            showToast('API quota exceeded — upgrade your plan', 'error');
        } else if (err.message.includes('429')) {
            showToast('Rate limited — wait a moment', 'error');
        } else {
            showToast('Failed: ' + err.message, 'error');
        }
        els.resultArea.classList.add('hidden');
        els.uploadZone.classList.remove('hidden');
        resetSteps();
    } finally {
        state.processing = false;
    }
}

async function removeBgApi(file) {
    const formData = new FormData();
    formData.append('image_file', file);
    formData.append('size', 'auto');
    updateProgress(15);
    showLoading('Uploading to Remove.bg…');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': state.apiKey },
        body: formData,
    });
    updateProgress(50);

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.errors?.[0]?.title || response.statusText;
        if (response.status === 403 || response.status === 401) throw new Error('API key invalid — 401/403');
        if (response.status === 402) throw new Error('402 — payment required');
        if (response.status === 429) throw new Error('rate limit — 429');
        throw new Error(`Remove.bg error (${response.status}): ${msg}`);
    }
    // Track credits charged from response header
    const charged = parseFloat(response.headers.get('X-Credits-Charged') || '1');
    decrementCredits(charged);

    updateProgress(65);
    showLoading('Processing result…');
    return await response.blob();
}

// ============= Sticker Generation =============
function generateSticker(bgRemovedCanvas) {
    const s = state.settings;
    const sw = s.strokeWidth;
    const pad = s.outputPadding + sw;
    const outW = bgRemovedCanvas.width + pad * 2;
    const outH = bgRemovedCanvas.height + pad * 2;

    const output = document.createElement('canvas');
    output.width = outW; output.height = outH;
    const ctx = output.getContext('2d');

    // Step 1: Build the sticker (stroke + foreground) on a temp canvas WITHOUT shadow
    const stickerTemp = document.createElement('canvas');
    stickerTemp.width = outW; stickerTemp.height = outH;
    const sCtx = stickerTemp.getContext('2d');

    // Draw stroke
    if (sw > 0) {
        const silhouette = createSilhouette(bgRemovedCanvas, s.strokeColor);
        if (s.strokeStyle === 'solid') {
            drawDilatedStroke(sCtx, silhouette, pad, sw);
        } else {
            drawDilatedStroke(sCtx, silhouette, pad, sw);
            applyStrokePattern(sCtx, bgRemovedCanvas, pad, sw, s.strokeStyle);
        }
    }

    // Draw foreground on top of stroke
    sCtx.drawImage(bgRemovedCanvas, pad, pad);

    // Step 2: Apply sticker effect on the composited sticker temp canvas
    applyStickerEffect(stickerTemp);

    // Step 3: Draw the composited sticker with shadow
    if (s.enableShadow) {
        const [r, g, b] = hexToRgb(s.shadowColor);
        ctx.shadowOffsetX = s.shadowX;
        ctx.shadowOffsetY = s.shadowY;
        ctx.shadowBlur = s.shadowBlur;
        ctx.shadowColor = `rgba(${r},${g},${b},${s.shadowOpacity / 100})`;
    }

    ctx.drawImage(stickerTemp, 0, 0);

    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    return output;
}

// ============= iOS Sticker Effects =============
function applyStickerEffect(canvas) {
    const s = state.settings;
    const eff = s.stickerEffect;
    if (eff === 'none') return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    if (eff === 'shiny') {
        applyShinyEffect(ctx, w, h, s.shinyAngle, s.shinyIntensity);
    } else if (eff === 'puffy') {
        applyPuffyEffect(ctx, w, h, s.puffyDepth);
    } else if (eff === 'comic') {
        applyComicEffect(ctx, w, h);
    }
}

function applyShinyEffect(ctx, w, h, angle, intensity) {
    // Create holographic rainbow gradient overlay
    const rad = (angle * Math.PI) / 180;
    const len = Math.max(w, h);
    const cx = w / 2, cy = h / 2;
    const dx = Math.cos(rad) * len / 2;
    const dy = Math.sin(rad) * len / 2;

    // Save current composited sticker pixels
    const imageData = ctx.getImageData(0, 0, w, h);

    // Draw the holographic gradient using source-atop to clip to existing alpha
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';

    // Create the rainbow gradient
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    // Full spectrum rainbow stops — iOS-style holographic foil
    grad.addColorStop(0.00, '#ff6ec7');  // pink
    grad.addColorStop(0.12, '#ff3b30');  // red
    grad.addColorStop(0.22, '#ff9500');  // orange
    grad.addColorStop(0.33, '#ffd60a');  // yellow
    grad.addColorStop(0.44, '#34c759');  // green
    grad.addColorStop(0.55, '#30d5c8');  // teal
    grad.addColorStop(0.66, '#00c7ff');  // cyan
    grad.addColorStop(0.77, '#5e5ce6');  // indigo
    grad.addColorStop(0.88, '#bf5af2');  // purple
    grad.addColorStop(1.00, '#ff6ec7');  // pink again

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Now blend: put back the original image partially, then composite with the rainbow
    // Use the intensity to control how much of the rainbow shows vs original
    const alpha = intensity / 100;

    // Get the rainbow layer
    const rainbowData = ctx.getImageData(0, 0, w, h);

    // Blend original pixels back with the rainbow overlay
    for (let i = 0; i < imageData.data.length; i += 4) {
        const origA = imageData.data[i + 3];
        if (origA === 0) {
            rainbowData.data[i + 3] = 0;
            continue;
        }
        // Mix original color with rainbow color
        rainbowData.data[i]     = Math.round(imageData.data[i]     * (1 - alpha) + rainbowData.data[i]     * alpha);
        rainbowData.data[i + 1] = Math.round(imageData.data[i + 1] * (1 - alpha) + rainbowData.data[i + 1] * alpha);
        rainbowData.data[i + 2] = Math.round(imageData.data[i + 2] * (1 - alpha) + rainbowData.data[i + 2] * alpha);
        rainbowData.data[i + 3] = origA;

        // Add a subtle specular highlight for foil shimmer
        const normalizedY = (i / 4 / w) / h;
        const shimmer = Math.pow(Math.sin(normalizedY * Math.PI * 4 + (angle * Math.PI / 180)), 2) * 0.15 * alpha;
        rainbowData.data[i]     = Math.min(255, rainbowData.data[i]     + shimmer * 255);
        rainbowData.data[i + 1] = Math.min(255, rainbowData.data[i + 1] + shimmer * 255);
        rainbowData.data[i + 2] = Math.min(255, rainbowData.data[i + 2] + shimmer * 255);
    }

    ctx.putImageData(rainbowData, 0, 0);
}

function applyPuffyEffect(ctx, w, h, depth) {
    // 3D embossed / puffy look:
    // - Add highlight on top edge
    // - Add shadow on bottom edge
    // - Slightly inflate the appearance
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const d = depth;

    // Create highlight and shadow based on alpha edges
    const result = new Uint8ClampedArray(data);

    for (let y = d; y < h - d; y++) {
        for (let x = d; x < w - d; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] < 20) continue;

            // Check alpha gradient for edge detection
            const aboveIdx = ((y - d) * w + x) * 4;
            const belowIdx = ((y + d) * w + x) * 4;
            const leftIdx = (y * w + (x - d)) * 4;
            const rightIdx = (y * w + (x + d)) * 4;

            const alphaAbove = data[aboveIdx + 3] || 0;
            const alphaBelow = data[belowIdx + 3] || 0;
            const alphaLeft = data[leftIdx + 3] || 0;
            const alphaRight = data[rightIdx + 3] || 0;
            const alphaCur = data[idx + 3];

            // Calculate edge normals (approximate)
            const edgeY = (alphaBelow - alphaAbove) / 510;
            const edgeX = (alphaRight - alphaLeft) / 510;

            // Highlight from top-left, shadow from bottom-right
            const highlight = Math.max(0, -edgeY * 0.7 + -edgeX * 0.3) * depth * 18;
            const shadow = Math.max(0, edgeY * 0.7 + edgeX * 0.3) * depth * 12;

            // Inner body: subtle gradient to simulate inflation
            const distFromEdge = Math.min(alphaCur, 255) / 255;
            const inflate = Math.pow(distFromEdge, 0.5) * depth * 3;

            result[idx]     = Math.min(255, Math.max(0, data[idx]     + highlight + inflate - shadow));
            result[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + highlight + inflate - shadow));
            result[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + highlight + inflate - shadow));
            result[idx + 3] = data[idx + 3];
        }
    }

    ctx.putImageData(new ImageData(result, w, h), 0, 0);
}

function applyComicEffect(ctx, w, h) {
    // Halftone dot pattern overlay
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const dotSpacing = 4;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] < 20) continue;

            // Convert to grayscale
            const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

            // Posterize (reduce to fewer tones)
            const posterized = Math.round(lum / 64) * 64;

            // Create halftone-like pattern for mid-tones
            const gridX = x % dotSpacing;
            const gridY = y % dotSpacing;
            const distToCenter = Math.sqrt(
                Math.pow(gridX - dotSpacing / 2, 2) +
                Math.pow(gridY - dotSpacing / 2, 2)
            );
            const maxDist = dotSpacing * 0.707;

            // In dark areas, make dots; in bright areas, keep white
            const threshold = (255 - posterized) / 255 * maxDist;
            const inDot = distToCenter < threshold;

            if (lum < 180) {
                // Darken or lighten based on halftone
                if (inDot) {
                    // Bold dark outline feel
                    data[idx]     = Math.max(0, data[idx] - 60);
                    data[idx + 1] = Math.max(0, data[idx + 1] - 60);
                    data[idx + 2] = Math.max(0, data[idx + 2] - 60);
                } else {
                    data[idx]     = Math.min(255, data[idx] + 30);
                    data[idx + 1] = Math.min(255, data[idx + 1] + 30);
                    data[idx + 2] = Math.min(255, data[idx + 2] + 30);
                }
            }

            // Boost saturation slightly for comic feel
            const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const satBoost = 1.3;
            data[idx]     = Math.min(255, Math.max(0, Math.round(avg + (data[idx] - avg) * satBoost)));
            data[idx + 1] = Math.min(255, Math.max(0, Math.round(avg + (data[idx + 1] - avg) * satBoost)));
            data[idx + 2] = Math.min(255, Math.max(0, Math.round(avg + (data[idx + 2] - avg) * satBoost)));
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// ============= Silhouette & Stroke (unchanged) =============
function createSilhouette(src, color) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const [cr, cg, cb] = hexToRgb(color);
    for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i + 3] > 20) {
            d.data[i] = cr; d.data[i + 1] = cg; d.data[i + 2] = cb; d.data[i + 3] = 255;
        } else { d.data[i + 3] = 0; }
    }
    ctx.putImageData(d, 0, 0);
    return c;
}

function drawDilatedStroke(ctx, silhouette, pad, sw) {
    for (let r = sw; r >= 1; r -= Math.max(1, sw > 10 ? 2 : 1)) {
        const steps = Math.max(12, Math.ceil(r * 3));
        const da = (Math.PI * 2) / steps;
        for (let a = 0; a < Math.PI * 2; a += da) {
            ctx.drawImage(silhouette, pad + Math.cos(a) * r, pad + Math.sin(a) * r);
        }
    }
    ctx.drawImage(silhouette, pad, pad);
}

function applyStrokePattern(ctx, bgRemovedCanvas, pad, sw, style) {
    const outW = ctx.canvas.width, outH = ctx.canvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = outW; tmp.height = outH;
    const tCtx = tmp.getContext('2d');
    tCtx.drawImage(bgRemovedCanvas, pad, pad);
    const fgData = tCtx.getImageData(0, 0, outW, outH);
    const strokeData = ctx.getImageData(0, 0, outW, outH);
    const dashLen = style === 'dashed' ? sw * 3 : sw * 1.5;
    const gapLen = style === 'dashed' ? sw * 2 : sw * 1.5;
    for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
            const idx = (y * outW + x) * 4;
            if (strokeData.data[idx + 3] > 0 && fgData.data[idx + 3] <= 20) {
                if ((x + y) % (dashLen + gapLen) >= dashLen) strokeData.data[idx + 3] = 0;
            }
        }
    }
    ctx.putImageData(strokeData, 0, 0);
}

// ============= Emoji Mode =============
function bindEmoji() {
    let debounce;
    els.emojiInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(renderEmoji, 60);
    });
    $$('.emoji-pick').forEach(btn => {
        btn.addEventListener('click', () => {
            els.emojiInput.value = btn.dataset.emoji;
            renderEmoji();
        });
    });
    els.emojiDownloadBtn.addEventListener('click', () => {
        if (!state.emojiCanvas) return;
        const a = document.createElement('a');
        a.download = 'emoji-sticker.png';
        a.href = state.emojiCanvas.toDataURL('image/png');
        a.click();
        showToast('PNG downloaded', 'success');
    });
    els.emojiCopyBtn.addEventListener('click', async () => {
        if (!state.emojiCanvas) return;
        try {
            const blob = await new Promise(r => state.emojiCanvas.toBlob(r, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('Copied to clipboard', 'success');
        } catch { showToast('Copy failed', 'error'); }
    });
}

function renderEmoji() {
    const text = els.emojiInput.value || '🔥';
    const s = state.settings;
    const fontSize = s.emojiFontSize;
    const sw = s.strokeWidth;
    const pad = s.outputPadding + sw;

    // Measure text with generous safety margin
    const measure = document.createElement('canvas');
    measure.width = fontSize * 8;
    measure.height = fontSize * 2;
    const mCtx = measure.getContext('2d');
    const emojiFont = `${fontSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    mCtx.font = emojiFont;
    mCtx.textBaseline = 'middle';

    // Render emoji on oversized canvas to find true bounding box via alpha scan
    mCtx.fillText(text, fontSize * 0.5, fontSize);

    // Scan for actual bounding box
    const fullData = mCtx.getImageData(0, 0, measure.width, measure.height);
    let minX = measure.width, minY = measure.height, maxX = 0, maxY = 0;
    let hasPixels = false;
    for (let y = 0; y < measure.height; y++) {
        for (let x = 0; x < measure.width; x++) {
            if (fullData.data[(y * measure.width + x) * 4 + 3] > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                hasPixels = true;
            }
        }
    }

    if (!hasPixels) {
        // Fallback: no visible pixels — possibly no emoji font. Just render centered text.
        minX = 0; minY = 0;
        maxX = Math.max(10, Math.ceil(mCtx.measureText(text).width));
        maxY = Math.ceil(fontSize * 1.2);
    }

    const textW = maxX - minX + 1;
    const textH = maxY - minY + 1;

    // Step 1: Crop the emoji into a tight canvas
    const textCanvas = document.createElement('canvas');
    textCanvas.width = textW;
    textCanvas.height = textH;
    const tCtx = textCanvas.getContext('2d');
    tCtx.drawImage(measure, minX, minY, textW, textH, 0, 0, textW, textH);

    // Step 2: Build sticker with dilation stroke
    const outW = textW + pad * 2;
    const outH = textH + pad * 2;

    const stickerTemp = document.createElement('canvas');
    stickerTemp.width = outW;
    stickerTemp.height = outH;
    const sCtx = stickerTemp.getContext('2d');

    if (sw > 0) {
        const silhouette = createSilhouette(textCanvas, s.strokeColor);
        drawDilatedStroke(sCtx, silhouette, pad, sw);
    }

    // Draw original emoji on top
    sCtx.drawImage(textCanvas, pad, pad);

    // Apply sticker effect
    applyStickerEffect(stickerTemp);

    // Step 3: Final output with shadow
    const output = document.createElement('canvas');
    output.width = outW;
    output.height = outH;
    const ctx = output.getContext('2d');

    if (s.enableShadow) {
        const [r, g, b] = hexToRgb(s.shadowColor);
        ctx.shadowOffsetX = s.shadowX;
        ctx.shadowOffsetY = s.shadowY;
        ctx.shadowBlur = s.shadowBlur;
        ctx.shadowColor = `rgba(${r},${g},${b},${s.shadowOpacity / 100})`;
    }
    ctx.drawImage(stickerTemp, 0, 0);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    state.emojiCanvas = output;

    // Render to preview
    const pc = els.emojiPreviewCanvas;
    const pCtx = pc.getContext('2d');
    const scale = Math.min(500 / outW, 400 / outH, 1);
    pc.width = Math.round(outW * scale);
    pc.height = Math.round(outH * scale);
    pCtx.clearRect(0, 0, pc.width, pc.height);
    pCtx.drawImage(output, 0, 0, pc.width, pc.height);
}

// ============= Render =============
function renderPreview() {
    if (!state.resultCanvas) return;
    state.comparing = false;
    els.compareBtn.classList.remove('active');
    els.previewLabel.textContent = 'Sticker';
    drawToCanvas(els.previewCanvas, state.resultCanvas);
    applyPreviewBg();
}

function drawToCanvas(canvas, source) {
    const ctx = canvas.getContext('2d');
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    const scale = Math.min(600 / sw, 520 / sh, 1);
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
}

// ============= Settings =============
function bindSettings() {
    bindRange('strokeWidth', 'strokeWidthVal', 'px', v => { state.settings.strokeWidth = v; rerender(); });
    bindRange('outputPadding', 'outputPaddingVal', 'px', v => { state.settings.outputPadding = v; rerender(); });
    bindRange('shadowX', 'shadowXVal', 'px', v => { state.settings.shadowX = v; rerender(); });
    bindRange('shadowY', 'shadowYVal', 'px', v => { state.settings.shadowY = v; rerender(); });
    bindRange('shadowBlur', 'shadowBlurVal', 'px', v => { state.settings.shadowBlur = v; rerender(); });
    bindRange('shadowOpacity', 'shadowOpacityVal', '%', v => { state.settings.shadowOpacity = v; rerender(); });
    bindRange('emojiFontSize', 'emojiFontSizeVal', '', v => { state.settings.emojiFontSize = v; rerender(); });

    $('#enableShadow').addEventListener('change', e => {
        state.settings.enableShadow = e.target.checked;
        updateShadowUI(); rerender();
    });
    $('#shadowColor').addEventListener('input', e => { state.settings.shadowColor = e.target.value; rerender(); });

    // Color presets
    $$('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            $$('.color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            const color = dot.dataset.color;
            state.settings.strokeColor = color;
            $('#customColor').value = color;
            updateColorHexLabel(color);
            rerender();
        });
    });

    // Custom color input
    $('#customColor').addEventListener('input', e => {
        const color = e.target.value;
        state.settings.strokeColor = color;
        // Deselect all presets if custom color doesn't match any
        const matching = $(`.color-dot[data-color="${color.toUpperCase()}"]`);
        $$('.color-dot').forEach(d => d.classList.remove('active'));
        if (matching) {
            matching.classList.add('active');
        }
        updateColorHexLabel(color);
        rerender();
    });

    $$('.seg').forEach(btn => btn.addEventListener('click', () => {
        $$('.seg').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.settings.strokeStyle = btn.dataset.style; rerender();
    }));
    $$('.seg-join').forEach(btn => btn.addEventListener('click', () => {
        $$('.seg-join').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.settings.strokeJoin = btn.dataset.join; rerender();
    }));
}

function updateColorHexLabel(color) {
    if (els.colorHexLabel) {
        els.colorHexLabel.textContent = color.toUpperCase();
    }
}

function bindRange(id, displayId, suffix, cb) {
    const input = $(`#${id}`), display = $(`#${displayId}`);
    if (!input || !display) return;
    const up = () => { display.textContent = input.value + suffix; };
    up();
    let t;
    input.addEventListener('input', () => {
        up(); clearTimeout(t);
        t = setTimeout(() => cb(parseInt(input.value)), 80);
    });
}

function updateShadowUI() {
    els.shadowControls.classList.toggle('disabled', !state.settings.enableShadow);
}

let rt;
function rerender() {
    clearTimeout(rt);
    rt = setTimeout(() => {
        if (state.mode === 'image' && state.bgRemovedCanvas) {
            state.resultCanvas = generateSticker(state.bgRemovedCanvas);
            renderPreview();
        }
        if (state.mode === 'emoji') {
            renderEmoji();
            applyPreviewBg();
        }
    }, 30);
}

// ============= Actions =============
function bindActions() {
    els.resetBtn.addEventListener('click', () => {
        state.originalImage = null; state.bgRemovedCanvas = null;
        state.resultCanvas = null; state.processing = false;
        els.resultArea.classList.add('hidden');
        els.uploadZone.classList.remove('hidden');
        els.fileInput.value = '';
        resetSteps();
    });

    els.downloadBtn.addEventListener('click', () => {
        if (!state.resultCanvas) return;
        const a = document.createElement('a');
        a.download = 'sticker.png';
        a.href = state.resultCanvas.toDataURL('image/png');
        a.click();
        showToast('PNG downloaded', 'success');
    });

    els.downloadSvgBtn.addEventListener('click', () => {
        if (!state.resultCanvas) return;
        const c = state.resultCanvas;
        const svg = `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${c.width}" height="${c.height}"><image width="${c.width}" height="${c.height}" xlink:href="${c.toDataURL('image/png')}"/></svg>`;
        const a = document.createElement('a');
        a.download = 'sticker.svg';
        a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        a.click();
        showToast('SVG downloaded', 'success');
    });

    els.copyBtn.addEventListener('click', async () => {
        if (!state.resultCanvas) return;
        try {
            const blob = await new Promise(r => state.resultCanvas.toBlob(r, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('Copied to clipboard', 'success');
        } catch { showToast('Copy failed — try downloading', 'error'); }
    });
}

// ============= UI Helpers =============
function setStep(n, status = 'active') {
    const el = $(`#step${n}`);
    if (el) { el.classList.remove('active', 'completed'); el.classList.add(status); }
}
function resetSteps() { for (let i = 1; i <= 3; i++) { const el = $(`#step${i}`); if (el) el.classList.remove('active', 'completed'); } }

function showLoading(t) { els.loadingText.textContent = t; els.loadingOverlay.classList.remove('hidden'); }
function hideLoading() { els.loadingOverlay.classList.add('hidden'); updateProgress(0); }
function updateProgress(p) { els.loadingBar.style.width = p + '%'; }

function showToast(msg, type = '') {
    els.toast.textContent = msg;
    els.toast.className = 'toast visible ' + type;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { els.toast.className = 'toast hidden'; }, 3000);
}

function yieldToMain() { return new Promise(r => setTimeout(r, 20)); }

function blobToImage(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
}


// ============= Credit Counter =============
async function fetchCredits() {
    if (!state.apiKey || !els.creditBar) return;

    els.creditBar.classList.remove('hidden');
    els.creditBar.classList.add('refreshing');

    try {
        const res = await fetch('https://api.remove.bg/v1.0/account', {
            headers: { 'X-Api-Key': state.apiKey }
        });
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                els.creditCount.textContent = 'Invalid key';
                els.creditFill.style.width = '0%';
                els.creditFill.className = 'credit-fill';
                els.creditDetail.textContent = '';
            }
            els.creditBar.classList.remove('refreshing');
            return;
        }
        const json = await res.json();
        const attr = json?.data?.attributes;
        if (!attr) { els.creditBar.classList.remove('refreshing'); return; }

        const freeCalls = attr.api?.free_calls ?? 0;
        const totalCredits = attr.credits?.total ?? 0;
        const subCredits = attr.credits?.subscription ?? 0;
        const paygCredits = attr.credits?.payg ?? 0;

        state.creditInfo = { freeCalls, totalCredits, subCredits, paygCredits };
        renderCredits();
    } catch (e) {
        console.warn('Failed to fetch credits:', e);
    } finally {
        els.creditBar.classList.remove('refreshing');
    }
}

function renderCredits() {
    const info = state.creditInfo;
    if (!info || !els.creditBar) return;

    els.creditBar.classList.remove('hidden');

    // Display free calls primarily
    const free = info.freeCalls;
    const total = info.totalCredits;

    if (free > 0) {
        els.creditCount.textContent = `${free} / 50`;
        const pct = (free / 50) * 100;
        els.creditFill.style.width = pct + '%';
        els.creditFill.className = 'credit-fill ' + (pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low');
    } else if (total > 0) {
        els.creditCount.textContent = `${total} credits`;
        const pct = Math.min(100, (total / Math.max(total, 50)) * 100);
        els.creditFill.style.width = pct + '%';
        els.creditFill.className = 'credit-fill ' + (pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low');
    } else {
        els.creditCount.textContent = '0 remaining';
        els.creditFill.style.width = '0%';
        els.creditFill.className = 'credit-fill low';
    }

    // Detail line
    const parts = [];
    if (free > 0) parts.push(`<span>${free}</span> free`);
    if (info.subCredits > 0) parts.push(`<span>${info.subCredits}</span> sub`);
    if (info.paygCredits > 0) parts.push(`<span>${info.paygCredits}</span> payg`);
    if (total > 0 && free <= 0) parts.push(`<span>${total}</span> total`);
    els.creditDetail.innerHTML = parts.join(' \u00b7 ');
}

function decrementCredits(creditsCharged) {
    if (!state.creditInfo || !els.creditBar) return;
    const info = state.creditInfo;

    if (info.freeCalls > 0) {
        info.freeCalls = Math.max(0, info.freeCalls - 1);
    } else {
        info.totalCredits = Math.max(0, info.totalCredits - (creditsCharged || 1));
    }
    renderCredits();
}

function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
