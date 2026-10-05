// --- 參數狀態中心 ---
const PARAMS = {
  // 幾何模型選擇（方案 B）
  model: 'epicyclic',

  // 通用幾何參數
  rings: 36,
  speed: 0.014,
  amplitude: 35,
  gearRatio: 3.0,          // 適用於 軌道波浪
  twistAngle: 1.2,         // 適用於 六邊螺旋
  lensOverlap: 0.65,       // 適用於 透鏡擴散

  // 網版印刷質感
  paperTone: '#F3EFE6',    // 手工棉紙底色
  inkTone: '#121212',      // 線條油墨顏色
  inkBleed: 0.6,           // 油墨微滲透強度
  paperGrain: 18,          // 紙張纖維噪點
  showMarks: true,         // 對位標籤

  // 系統控制
  freeze: false
};

let pane;
let paperTexture;

function setup() {
  const canvas = createCanvas(800, 800);
  canvas.parent('canvas-container');
  frameRate(60);
  pixelDensity(1);

  initTweakpane();
  generatePaperTexture();
}

function draw() {
  // 1. 底層手工棉紙質地
  if (paperTexture) {
    image(paperTexture, 0, 0);
  } else {
    background(PARAMS.paperTone);
  }

  // 2. 時間相位
  const t = frameCount * PARAMS.speed;

  // 3. 執行當前選定的幾何模型渲染
  renderActiveModel(this, t, 1.0, false);

  // 4. 繪製對位十字標
  if (PARAMS.showMarks) {
    drawRegistrationMarks(this, 1.0, false);
  }
}

// -------------------------------------------------------------------------
// 幾何調度工廠
// -------------------------------------------------------------------------
function renderActiveModel(pg, t, scaleFactor, isVectorExport) {
  if (PARAMS.model === 'hexTwist') {
    renderHexTwist(pg, t, scaleFactor, isVectorExport);
  } else if (PARAMS.model === 'quadrifolio') {
    renderQuadrifolio(pg, t, scaleFactor, isVectorExport);
  } else {
    renderEpicyclicSystem(pg, t, scaleFactor, isVectorExport);
  }
}

// -------------------------------------------------------------------------
// 模型 1：軌道波浪
// -------------------------------------------------------------------------
function renderEpicyclicSystem(pg, t, scaleFactor, isVectorExport) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;
  const baseR = 48.0 * scaleFactor;
  const maxR = 235.0 * scaleFactor;
  const samples = isVectorExport ? 360 : 100;

  applyStrokeStyle(pg, scaleFactor, isVectorExport);

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / Math.max(1, PARAMS.rings - 1);
    const R = map(norm, 0, 1, baseR, maxR);
    const r = map(sin(norm * PI + t * 0.8), -1, 1, 16 * scaleFactor, (16 + PARAMS.amplitude) * scaleFactor);

    pg.beginShape();
    for (let j = 0; j <= samples; j++) {
      const theta = (j / samples) * TWO_PI;
      const phase = t * 1.5 + norm * PI;
      let x = cx + R * cos(theta + phase) + r * cos(PARAMS.gearRatio * (theta + phase));
      let y = cy + R * sin(theta + phase) - r * sin(PARAMS.gearRatio * (theta + phase));

      if (x >= margin && x <= pg.width - margin && y >= margin && y <= pg.height - margin) {
        pg.vertex(x, y);
      }
    }
    pg.endShape();
  }
}

// -------------------------------------------------------------------------
// 模型 2：六邊螺旋
// -------------------------------------------------------------------------
function renderHexTwist(pg, t, scaleFactor, isVectorExport) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;
  const maxR = 250.0 * scaleFactor;
  const samples = isVectorExport ? 360 : 120;

  applyStrokeStyle(pg, scaleFactor, isVectorExport);

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / Math.max(1, PARAMS.rings - 1);
    const currentR = map(norm, 0, 1, 24 * scaleFactor, maxR);
    const twist = norm * PARAMS.twistAngle * PI + t;

    pg.beginShape();
    for (let j = 0; j <= samples; j++) {
      const angle = (j / samples) * TWO_PI;
      const mod = 1.0 + (PARAMS.amplitude * 0.0025) * cos(6.0 * (angle + twist));
      const rad = currentR * mod;

      let x = cx + rad * cos(angle);
      let y = cy + rad * sin(angle);

      if (x >= margin && x <= pg.width - margin && y >= margin && y <= pg.height - margin) {
        pg.vertex(x, y);
      }
    }
    pg.endShape();
  }
}

// -------------------------------------------------------------------------
// 模型 3：透鏡擴散
// -------------------------------------------------------------------------
function renderQuadrifolio(pg, t, scaleFactor, isVectorExport) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;
  const maxR = 230.0 * scaleFactor;
  const samples = isVectorExport ? 360 : 120;

  applyStrokeStyle(pg, scaleFactor, isVectorExport);

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / Math.max(1, PARAMS.rings - 1);
    const baseSize = map(norm, 0, 1, 35 * scaleFactor, maxR);
    const petalWarp = (PARAMS.amplitude * 0.004) * sin(t * 1.2 + norm * TWO_PI);

    pg.beginShape();
    for (let j = 0; j <= samples; j++) {
      const angle = (j / samples) * TWO_PI;
      const r = baseSize * (1.0 + (PARAMS.lensOverlap * 0.3 + petalWarp) * cos(4.0 * angle + t));
      let x = cx + r * cos(angle + norm * 0.35);
      let y = cy + r * sin(angle + norm * 0.35);

      if (x >= margin && x <= pg.width - margin && y >= margin && y <= pg.height - margin) {
        pg.vertex(x, y);
      }
    }
    pg.endShape();
  }
}

// 筆觸樣式設定
function applyStrokeStyle(pg, scaleFactor, isVectorExport) {
  pg.noFill();
  if (isVectorExport) {
    pg.stroke(0);
    pg.strokeWeight(1.0);
  } else {
    const c = color(PARAMS.inkTone);
    pg.stroke(red(c), green(c), blue(c));
    pg.strokeWeight(1.2 * scaleFactor);
  }
}

// -------------------------------------------------------------------------
// 紙張紋理產生器
// -------------------------------------------------------------------------
function generatePaperTexture() {
  if (!paperTexture) {
    paperTexture = createGraphics(width, height);
    paperTexture.pixelDensity(1);
  }

  paperTexture.background(PARAMS.paperTone);
  paperTexture.loadPixels();

  const d = paperTexture.pixels;
  const grainVal = PARAMS.paperGrain;

  if (grainVal > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (x + y * width) * 4;
        const grain = (noise(x * 0.8, y * 0.8) - 0.5) * grainVal;
        d[idx]     = constrain(d[idx] + grain, 0, 255);
        d[idx + 1] = constrain(d[idx + 1] + grain, 0, 255);
        d[idx + 2] = constrain(d[idx + 2] + grain, 0, 255);
      }
    }
  }
  paperTexture.updatePixels();
}

// -------------------------------------------------------------------------
// 對位十字標
// -------------------------------------------------------------------------
function drawRegistrationMarks(pg, scaleFactor, isVectorExport) {
  pg.stroke(isVectorExport ? 0 : PARAMS.inkTone);
  pg.strokeWeight((isVectorExport ? 0.8 : 0.6) * scaleFactor);
  pg.noFill();
  const offset = 22 * scaleFactor;
  const len = 10 * scaleFactor;

  const corners = [
    [offset, offset],
    [pg.width - offset, offset],
    [offset, pg.height - offset],
    [pg.width - offset, pg.height - offset]
  ];

  for (let i = 0; i < corners.length; i++) {
    const [mx, my] = corners[i];
    pg.line(mx - len, my, mx + len, my);
    pg.line(mx, my - len, mx, my + len);
    pg.circle(mx, my, len);
  }
}

// -------------------------------------------------------------------------
// 匯出功能：彩色 JPG 與膠片 SVG
// -------------------------------------------------------------------------
function exportColorJPG() {
  // 將當前畫布上的畫面（含底色、纖維紋理與自訂線條顏色）直接儲存為 JPG
  saveCanvas(`preview_${PARAMS.model}_${Date.now()}`, 'jpg');
}

function exportNativeFilmSVG() {
  const w = 800;
  const h = 800;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const margin = 45.0;
  const t = frameCount * PARAMS.speed;
  const samples = 360;

  let svgContent = `<?xml version="1.0" encoding="utf-8"?>\n`;
  svgContent += `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
  svgContent += `<g id="film_black_${PARAMS.model}" fill="none" stroke="#000000" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round">\n`;

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / Math.max(1, PARAMS.rings - 1);
    let pathD = '';
    let isDrawing = false;

    for (let j = 0; j <= samples; j++) {
      let x = 0;
      let y = 0;

      if (PARAMS.model === 'hexTwist') {
        const currentR = map(norm, 0, 1, 24, 250);
        const twist = norm * PARAMS.twistAngle * PI + t;
        const angle = (j / samples) * TWO_PI;
        const mod = 1.0 + (PARAMS.amplitude * 0.0025) * cos(6.0 * (angle + twist));
        x = cx + (currentR * mod) * cos(angle);
        y = cy + (currentR * mod) * sin(angle);
      } else if (PARAMS.model === 'quadrifolio') {
        const baseSize = map(norm, 0, 1, 35, 230);
        const petalWarp = (PARAMS.amplitude * 0.004) * sin(t * 1.2 + norm * TWO_PI);
        const angle = (j / samples) * TWO_PI;
        const r = baseSize * (1.0 + (PARAMS.lensOverlap * 0.3 + petalWarp) * cos(4.0 * angle + t));
        x = cx + r * cos(angle + norm * 0.35);
        y = cy + r * sin(angle + norm * 0.35);
      } else {
        const R = map(norm, 0, 1, 48, 235);
        const r = map(sin(norm * PI + t * 0.8), -1, 1, 16, 16 + PARAMS.amplitude);
        const theta = (j / samples) * TWO_PI;
        const phase = t * 1.5 + norm * PI;
        x = cx + R * cos(theta + phase) + r * cos(PARAMS.gearRatio * (theta + phase));
        y = cy + R * sin(theta + phase) - r * sin(PARAMS.gearRatio * (theta + phase));
      }

      if (x >= margin && x <= w - margin && y >= margin && y <= h - margin) {
        if (!isDrawing) {
          pathD += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
          isDrawing = true;
        } else {
          pathD += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
        }
      } else {
        isDrawing = false;
      }
    }

    if (pathD.length > 0) {
      svgContent += `  <path d="${pathD}" />\n`;
    }
  }

  if (PARAMS.showMarks) {
    const offset = 22;
    const len = 10;
    const corners = [
      [offset, offset],
      [w - offset, offset],
      [offset, h - offset],
      [w - offset, h - offset]
    ];
    svgContent += `  <!-- 對位十字標 -->\n`;
    for (let i = 0; i < corners.length; i++) {
      const [mx, my] = corners[i];
      svgContent += `  <line x1="${mx - len}" y1="${my}" x2="${mx + len}" y2="${my}" stroke-width="0.8" />\n`;
      svgContent += `  <line x1="${mx}" y1="${my - len}" x2="${mx}" y2="${my + len}" stroke-width="0.8" />\n`;
      svgContent += `  <circle cx="${mx}" cy="${my}" r="${len * 0.5}" stroke-width="0.8" />\n`;
    }
  }

  svgContent += `</g>\n</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `film_${PARAMS.model}_${Date.now()}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------------
// Tweakpane 控制面板設定
// -------------------------------------------------------------------------
function initTweakpane() {
  pane = new Tweakpane.Pane({ title: '參數控制台' });

  // 1. 幾何核心
  const fGeo = pane.addFolder({ title: '幾何' });

  fGeo.addBinding(PARAMS, 'model', {
    label: '幾何模型',
    options: {
      '軌道波浪': 'epicyclic',
      '六邊螺旋': 'hexTwist',
      '透鏡擴散': 'quadrifolio'
    }
  }).on('change', () => {
    if (PARAMS.freeze) redraw();
  });

  fGeo.addBinding(PARAMS, 'rings', { min: 6, max: 64, step: 1, label: '軌道環數' });
  fGeo.addBinding(PARAMS, 'speed', { min: 0.0, max: 0.05, step: 0.001, label: '轉速' });
  fGeo.addBinding(PARAMS, 'amplitude', { min: 0, max: 100, step: 1, label: '形變震幅' });

  fGeo.addBinding(PARAMS, 'gearRatio', { min: 1.0, max: 8.0, step: 1.0, label: '波形頻率 (軌道)' });
  fGeo.addBinding(PARAMS, 'twistAngle', { min: 0.1, max: 3.0, step: 0.1, label: '螺旋扭轉 (六邊)' });
  fGeo.addBinding(PARAMS, 'lensOverlap', { min: 0.1, max: 1.5, step: 0.05, label: '透鏡擴散度 (透鏡)' });

  // 2. 網版印刷質感
  const fPrint = pane.addFolder({ title: '網版印刷質感' });
  fPrint.addBinding(PARAMS, 'paperTone', { label: '紙張底色' }).on('change', () => {
    generatePaperTexture();
    if (PARAMS.freeze) redraw();
  });
  fPrint.addBinding(PARAMS, 'inkTone', { label: '油墨顏色' }).on('change', () => {
    if (PARAMS.freeze) redraw();
  });
  fPrint.addBinding(PARAMS, 'inkBleed', { min: 0.0, max: 2.5, step: 0.1, label: '油墨擴散'
