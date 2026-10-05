// --- 參數狀態中心 ---
const PARAMS = {
  // 幾何
  rings: 36,
  gearRatio: 3.0,
  speed: 0.014,
  baseRadius: 48,
  amplitude: 35,
  
  // 網版印刷質感
  paperTone: '#F3EFE6',    // 手工棉紙底色
  inkTone: '#121212',      // 螢幕預覽線條油墨顏色
  inkBleed: 0.6,           // 油墨微滲透強度 (px)
  paperGrain: 18,          // 紙張纖維噪點強度
  showMarks: true,         // 對位標籤開關
  
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
  // 1. 繪製預渲染紙張底紋
  image(paperTexture, 0, 0);

  // 2. 計算時間相位
  const t = frameCount * PARAMS.speed;

  // 3. 輕量化渲染幾何輪系（即時流暢 60 fps）
  renderEpicyclicSystem(this, t, 1.0);

  // 4. 繪製對位十字標
  if (PARAMS.showMarks) {
    drawRegistrationMarks(this, 1.0);
  }
}

// -------------------------------------------------------------------------
// 螢幕繪圖核心
// -------------------------------------------------------------------------
function renderEpicyclicSystem(pg, t, scaleFactor) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;
  const baseR = PARAMS.baseRadius * scaleFactor;
  const maxR = 235.0 * scaleFactor;

  pg.noFill();
  const c = color(PARAMS.inkTone);
  pg.stroke(red(c), green(c), blue(c));
  pg.strokeWeight(1.2 * scaleFactor);

  const samples = 110;

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / (PARAMS.rings - 1);
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
// 螢幕用對位十字標
// -------------------------------------------------------------------------
function drawRegistrationMarks(pg, scaleFactor) {
  pg.stroke(PARAMS.inkTone);
  pg.strokeWeight(0.6 * scaleFactor);
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
// 原生純黑向量 SVG 產生器（100% K 開版菲林專用）
// -------------------------------------------------------------------------
function exportNativeFilmSVG() {
  const w = 800;
  const h = 800;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const margin = 45.0;
  const baseR = PARAMS.baseRadius;
  const maxR = 235.0;
  const t = frameCount * PARAMS.speed;
  const samples = 360; // 開版專用高密度平滑取樣

  let svgContent = `<?xml version="1.0" encoding="utf-8"?>\n`;
  svgContent += `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
  svgContent += `<g id="film_black_plate" fill="none" stroke="#000000" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round">\n`;

  // 1. 幾何線條路徑
  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / (PARAMS.rings - 1);
    const R = map(norm, 0, 1, baseR, maxR);
    const r = map(sin(norm * PI + t * 0.8), -1, 1, 16, 16 + PARAMS.amplitude);

    let pathD = '';
    let isDrawing = false;

    for (let j = 0; j <= samples; j++) {
      const theta = (j / samples) * TWO_PI;
      const phase = t * 1.5 + norm * PI;

      let x = cx + R * cos(theta + phase) + r * cos(PARAMS.gearRatio * (theta + phase));
      let y = cy + R * sin(theta + phase) - r * sin(PARAMS.gearRatio * (theta + phase));

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

  // 2. 對位十字標
  if (PARAMS.showMarks) {
    const offset = 22;
    const len = 10;
    const corners = [
      [offset, offset],
      [w - offset, offset],
      [offset, h - offset],
      [w - offset, h - offset]
    ];

    svgContent += `  <!-- 對位標 -->\n`;
    for (let i = 0; i < corners.length; i++) {
      const [mx, my] = corners[i];
      svgContent += `  <line x1="${mx - len}" y1="${my}" x2="${mx + len}" y2="${my}" stroke-width="0.8" />\n`;
      svgContent += `  <line x1="${mx}" y1="${my - len}" x2="${mx}" y2="${my + len}" stroke-width="0.8" />\n`;
      svgContent += `  <circle cx="${mx}" cy="${my}" r="${len * 0.5}" stroke-width="0.8" />\n`;
    }
  }

  svgContent += `</g>\n</svg>`;

  // 觸發瀏覽器下載
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `film_black_${Date.now()}.svg`;
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

  // 1. 幾何（已修正標題）
  const fGeo = pane.addFolder({ title: '幾何' });
  fGeo.addBinding(PARAMS, 'rings', { min: 6, max: 64, step: 1, label: '軌道環數' });
  fGeo.addBinding(PARAMS, 'gearRatio', { min: 1.0, max: 8.0, step: 1.0, label: '齒輪比' });
  fGeo.addBinding(PARAMS, 'speed', { min: 0.0, max: 0.05, step: 0.001, label: '轉速' });
  fGeo.addBinding(PARAMS, 'amplitude', { min: 0, max: 100, step: 1, label: '震幅' });

  // 2. 網版印刷質感
  const fPrint = pane.addFolder({ title: '網版印刷質感' });
  fPrint.addBinding(PARAMS, 'paperTone', { label: '紙張底色' }).on('change', () => {
    generatePaperTexture();
    if (PARAMS.freeze) redraw();
  });
  fPrint.addBinding(PARAMS, 'inkTone', { label: '油墨顏色' }).on('change', () => {
    if (PARAMS.freeze) redraw();
  });
  fPrint.addBinding(PARAMS, 'inkBleed', { min: 0.0, max: 2.5, step: 0.1, label: '油墨擴散' });
  fPrint.addBinding(PARAMS, 'paperGrain', { min: 0, max: 50, step: 1, label: '紙張顆粒' }).on('change', () => {
    generatePaperTexture();
    if (PARAMS.freeze) redraw();
  });
  fPrint.addBinding(PARAMS, 'showMarks', { label: '對位標籤' }).on('change', () => {
    if (PARAMS.freeze) redraw();
  });

  // 3. 系統控制
  const fSys = pane.addFolder({ title: '系統控制' });
  fSys.addBinding(PARAMS, 'freeze', { label: '凍結動態' }).on('change', (ev) => {
    if (ev.value) {
      noLoop();
    } else {
      loop();
    }
  });

  // 4. 按鈕（已修正標題為「膠片用向量圖檔」）
  fSys.addButton({ title: '膠片用向量圖檔' }).on('click', () => {
    exportNativeFilmSVG();
  });
}
