// --- 參數狀態中心 ---
const PARAMS = {
  // 模型選擇
  model: 'epicyclic',      // 當前模型：'epicyclic' | 'hexTwist' | 'quadrifolio'

  // 通用幾何參數
  rings: 36,
  speed: 0.014,
  amplitude: 35,
  gearRatio: 3.0,          // 適用於 軌道波浪
  twistAngle: 1.2,         // 適用於 六邊螺旋
  lensOverlap: 0.65,       // 適用於 透鏡擴散

  // 網版印刷質感（螢幕預覽）
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
  // 1. 繪製底層棉紙質地
  image(paperTexture, 0, 0);

  // 2. 時間相位
  const t = frameCount * PARAMS.speed;

  // 3. 依據當前選定模型進行動態渲染（維持 60 fps）
  renderActiveModel(this, t, 1.0, false);

  // 4. 繪製對位十字標
  if (PARAMS.showMarks) {
    drawRegistrationMarks(this, 1.0, false);
  }
}

// -------------------------------------------------------------------------
// 幾何調度工廠（Factory Dispatcher）
// -------------------------------------------------------------------------
function renderActiveModel(pg, t, scaleFactor, isVectorExport) {
  if (PARAMS.model === 'epicyclic') {
    renderEpicyclicSystem(pg, t, scaleFactor, isVectorExport);
  } else if (PARAMS.model === 'hexTwist') {
    renderHexTwist(pg, t, scaleFactor, isVectorExport);
  } else if (PARAMS.model === 'quadrifolio') {
    renderQuadrifolio(pg, t, scaleFactor, isVectorExport);
  }
}

// -------------------------------------------------------------------------
// 模型 1：軌道波浪
// -------------------------------------------------------------------------
function renderEpicyclicSystem(pg, t, scaleFactor, isVectorExport) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;
  const baseR = 48 * scaleFactor;
  const maxR = 235.0 * scaleFactor;
  const samples = isVectorExport ? 360 : 100;

  configureStroke(pg, scaleFactor, isVectorExport);

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
// 模型 2：六邊螺旋
// -------------------------------------------------------------------------
function renderHexTwist(pg, t, scaleFactor, isVectorExport) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;
  const maxR = 260.0 * scaleFactor;
  const samples = isVectorExport ? 360 : 120;

  configureStroke(pg, scaleFactor, isVectorExport);

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / (PARAMS.rings - 1);
    const currentR = map(norm, 0, 1, 30 * scaleFactor, maxR);
    const twist = norm * PARAMS.twistAngle * PI + t;

    pg.beginShape();
    for (let j = 0; j <= samples; j++) {
      const angle = (j / samples) * TWO_PI;
      const mod = 1.0 + (PARAMS.amplitude * 0.003) * cos(6.0 * (angle + twist));
      const rad = currentR * mod;

      let x = cx + rad * cos(angle);
      let y = cy + rad * sin(angle);

      if (x >= margin && x <= pg.width - margin && y >= margin && y <= pg.height - margin) {
        pg.vertex(x, y);
      }
    }
    pg.endShape(CLOSE);
  }
}

// -------------------------------------------------------------------------
// 模型 3：透鏡擴散
// -------------------------------------------------------------------------
function renderQuadrifolio(pg, t, scaleFactor, isVectorExport) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;
  const maxR = 240.0 * scaleFactor;
  const samples = isVectorExport ? 360 : 120;

  configureStroke(pg, scaleFactor, isVectorExport);

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / (PARAMS.rings - 1);
    const baseSize = map(norm, 0, 1, 40 * scaleFactor, maxR);
    const petalWarp = (PARAMS.amplitude * 0.005) * sin(t * 1.2 + norm * TWO_PI);

    pg.beginShape();
    for (let j = 0; j <= samples; j++) {
      const angle = (j / samples) * TWO_PI;
      const r = baseSize * (1.0 + (PARAMS.lensOverlap + petalWarp) * cos(4.0 * angle + t));
      let x = cx + r * cos(angle + norm * 0.3);
      let y = cy + r * sin(angle + norm * 0.3);

      if (x >= margin && x <= pg.width - margin && y >= margin && y <= pg.height - margin) {
        pg.vertex(x, y);
      }
    }
    pg.endShape(CLOSE);
  }
}

// 筆觸與線寬樣式統一設定
function configureStroke(pg, scaleFactor, isVectorExport) {
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
// 原生純黑向量 SVG 產生器
// -------------------------------------------------------------------------
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
    const norm = i / (PARAMS.rings - 1);
    let pathD = '';
    let isDrawing = false;

    for (let j = 0; j <= samples; j++) {
      let x, y;

      if (PARAMS.model === 'epicyclic') {
        const R = map(norm, 0, 1, 48, 235);
        const r = map(sin(norm * PI + t * 0.8), -1, 1, 16, 16 + PARAMS.amplitude);
        const theta = (j / samples) * TWO_PI;
        const phase = t * 1.5 + norm * PI;
        x = cx + R * cos(theta + phase) + r * cos(PARAMS.gearRatio * (theta + phase));
        y = cy + R * sin(theta + phase) - r * sin(PARAMS.gearRatio * (theta + phase));
      } else if (PARAMS.model === 'hexTwist') {
        const currentR = map(norm, 0, 1, 30, 260);
        const twist = norm * PARAMS.twistAngle * PI + t;
        const angle = (j / samples) * TWO_PI;
        const mod = 1.0 + (PARAMS.amplitude * 0.003) * cos(6.0 * (angle + twist));
        x = cx + (currentR * mod) * cos(angle);
        y = cy + (currentR * mod) * sin(angle);
      } else if (PARAMS.model === 'quadrifolio') {
