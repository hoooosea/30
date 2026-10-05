// --- 參數狀態中心（Tweakpane 雙向綁定） ---
const PARAMS = {
  // 幾何核心
  rings: 36,
  gearRatio: 3.0,
  speed: 0.014,
  baseRadius: 48,
  amplitude: 35,
  
  // 網版印刷與色彩模擬
  paperTone: '#F3EFE6',    // 手工棉紙底色
  inkTone: '#121212',      // 油墨顏色（預設 100% K 碳黑）
  inkBleed: 0.6,           // 油墨微滲透強度 (px)
  paperGrain: 18,          // 紙張纖維噪點強度
  showMarks: true,         // 對位十字標開關
  
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

  // 1. 初始化 Tweakpane 控制面板
  initTweakpane();

  // 2. 產生初始紙張底紋
  generatePaperTexture();
}

function draw() {
  if (PARAMS.freeze) return;

  // 繪製紙張底紋快取
  image(paperTexture, 0, 0);

  const t = frameCount * PARAMS.speed;

  // 繪製幾何主體
  renderEpicyclicSystem(this, t, 1.0);

  // 繪製四角對位十字標
  if (PARAMS.showMarks) {
    drawRegistrationMarks(this, 1.0);
  }
}

// -------------------------------------------------------------------------
// 幾何計算核心：通用渲染器（支援主畫布與高解析度緩衝區）
// -------------------------------------------------------------------------
function renderEpicyclicSystem(pg, t, scaleFactor) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;

  pg.noFill();

  // 解析使用者選取之油墨顏色，解除硬編碼
  const baseColor = color(PARAMS.inkTone);

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / (PARAMS.rings - 1);
    const R = map(norm, 0, 1, PARAMS.baseRadius * scaleFactor, 235 * scaleFactor);
    const r = map(sin(norm * PI + t * 0.8), -1, 1, 16 * scaleFactor, (16 + PARAMS.amplitude) * scaleFactor);

    // 雙通道半透明疊印模擬油墨毛細邊界
    const passes = PARAMS.inkBleed > 0 ? 2 : 1;

    for (let p = 0; p < passes; p++) {
      const alphaVal = p === 0 ? 230 : 65;
      const strokeCol = color(red(baseColor), green(baseColor), blue(baseColor), alphaVal);
      pg.stroke(strokeCol);

      const baseWeight = (p === 0 ? 1.2 : 1.2 + PARAMS.inkBleed * 1.5) * scaleFactor;
      pg.strokeWeight(baseWeight);

      pg.beginShape();
      const samples = 220;
      for (let j = 0; j <= samples; j++) {
        const theta = (j / samples) * TWO_PI;
        const phase = t * 1.5 + norm * PI;

        let x = cx + R * cos(theta + phase) + r * cos(PARAMS.gearRatio * (theta + phase));
        let y = cy + R * sin(theta + phase) - r * sin(PARAMS.gearRatio * (theta + phase));

        // 疊加微量網目物理擾動
        if (PARAMS.inkBleed > 0) {
          const jitter = PARAMS.inkBleed * scaleFactor;
          x += (noise(x * 0.05, y * 0.05, t) - 0.5) * jitter;
          y += (noise(y * 0.05, x * 0.05, t) - 0.5) * jitter;
        }

        // 畫布邊界限制
        if (x >= margin && x <= pg.width - margin && y >= margin && y <= pg.height - margin) {
          pg.vertex(x, y);
        }
      }
      pg.endShape();
    }
  }
}

// -------------------------------------------------------------------------
// 紙張紋理產生器（支援底色即時變更）
// -------------------------------------------------------------------------
function generatePaperTexture(targetGraphics, scaleFactor = 1) {
  const g = targetGraphics || createGraphics(width, height);
  g.pixelDensity(1);
  g.background(PARAMS.paperTone);
  g.loadPixels();

  const d = g.pixels;
  const w = g.width;
  const h = g.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (x + y * w) * 4;
      const grain = (noise(x * 0.8, y * 0.8) - 0.5) * PARAMS.paperGrain;
      d[idx]     = constrain(d[idx] + grain, 0, 255);
      d[idx + 1] = constrain(d[idx + 1] + grain, 0, 255);
      d[idx + 2] = constrain(d[idx + 2] + grain, 0, 255);
    }
  }
  g.updatePixels();

  if (!targetGraphics) {
    paperTexture = g;
  }
  return g;
}

// -------------------------------------------------------------------------
// 四角對位十字標
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
// 高解析度（3200 x 3200 px）離線匯出管線
// -------------------------------------------------------------------------
function exportHighResPNG() {
  const scale = 4; // 800 x 4 = 3200 px (約 300 dpi 印刷規格)
  const hiResBuffer = createGraphics(width * scale, height * scale);
  hiResBuffer.pixelDensity(1);

  // 1. 於緩衝區渲染高解析紙張底紋
  generatePaperTexture(hiResBuffer, scale);

  // 2. 於緩衝區繪製高解析向量幾何
  const t = frameCount * PARAMS.speed;
  renderEpicyclicSystem(hiResBuffer, t, scale);

  // 3. 於緩衝區繪製對位標
  if (PARAMS.showMarks) {
    drawRegistrationMarks(hiResBuffer, scale);
  }

  // 4. 存檔並釋放記憶體
  save(hiResBuffer, 'screenprint_3200px.png');
  hiResBuffer.remove();
}

// -------------------------------------------------------------------------
// Tweakpane 控制面板設定
// -------------------------------------------------------------------------
function initTweakpane() {
  pane = new Tweakpane.Pane({ title: '參數控制台' });

  // 幾何參數目錄
  const fGeo = pane.addFolder({ title: '幾何動力學' });
  fGeo.addBinding(PARAMS, 'rings', { min: 6, max: 64, step: 1, label: '軌道環數' });
  fGeo.addBinding(PARAMS, 'gearRatio', { min: 1.0, max: 8.0, step: 1.0, label: '齒輪比' });
  fGeo.addBinding(PARAMS, 'speed', { min: 0.0, max: 0.05, step: 0.001, label: '轉速' });
  fGeo.addBinding(PARAMS, 'amplitude', { min: 0, max: 100, step: 1, label: '震幅' });

  // 印刷模擬目錄
  const fPrint = pane.addFolder({ title: '網版印刷質感' });
  // 修正：紙張底色加入 change 事件監聽，即時重建紋理快取
  fPrint.addBinding(PARAMS, 'paperTone', { label: '紙張底色' }).on('change', () => {
    generatePaperTexture();
  });
  // 新增：線條油墨顏色控制項
  fPrint.addBinding(PARAMS, 'inkTone', { label: '油墨顏色' });
  fPrint.addBinding(PARAMS, 'inkBleed', { min: 0.0, max: 2.5, step: 0.1, label: '油墨擴散' });
  fPrint.addBinding(PARAMS, 'paperGrain', { min: 0, max: 50, step: 1, label: '紙張顆粒' }).on('change', () => {
    generatePaperTexture();
  });
  fPrint.addBinding(PARAMS, 'showMarks', { label: '對位標籤' });

  // 系統控制
  pane.addBinding(PARAMS, 'freeze', { label: '凍結動態' });
  // 修正：更換為超採樣高畫質匯出
  pane.addButton({ title: '匯出高解析印刷圖 (3200px)' }).on('click', () => {
    exportHighResPNG();
  });
}
