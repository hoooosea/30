// --- 參數狀態中心（Tweakpane 直接綁定此物件） ---
const PARAMS = {
  // 幾何核心
  rings: 36,
  gearRatio: 3.0,
  speed: 0.014,
  baseRadius: 48,
  amplitude: 35,
  
  // 網版印刷質感模擬
  paperTone: '#F3EFE6',    // 手工棉紙底色
  inkTone: '#121212',      // 100% K 碳黑油墨
  inkBleed: 0.6,           // 油墨微滲透強度 (px)
  paperGrain: 18,          // 紙張纖維噪點強度
  showMarks: true,         // 對位十字標開關
  
  // 輸出控制
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

  // 2. 預先產生紙張底紋，避免每幀重複計算降低效能
  generatePaperTexture();
}

function draw() {
  if (PARAMS.freeze) return;

  // 繪製手工紙張底層
  image(paperTexture, 0, 0);

  // 計算時間相位
  const t = frameCount * PARAMS.speed;

  // 繪製行星周轉輪系
  renderEpicyclicSystem(t);

  // 繪製印刷對位標
  if (PARAMS.showMarks) {
    drawRegistrationMarks();
  }
}

// -------------------------------------------------------------------------
// 幾何計算核心：行星周轉輪系
// -------------------------------------------------------------------------
function renderEpicyclicSystem(t) {
  const cx = width * 0.5;
  const cy = height * 0.5;
  const margin = 45.0;

  noFill();
  stroke(PARAMS.inkTone);

  for (let i = 0; i < PARAMS.rings; i++) {
    const norm = i / (PARAMS.rings - 1);
    const R = map(norm, 0, 1, PARAMS.baseRadius, 235);
    const r = map(sin(norm * PI + t * 0.8), -1, 1, 16, 16 + PARAMS.amplitude);

    // 模擬油墨邊緣微滲透：重複微偏移繪製
    const passes = PARAMS.inkBleed > 0 ? 2 : 1;

    for (let p = 0; p < passes; p++) {
      const alpha = p === 0 ? 230 : 60;
      stroke(18, 18, 18, alpha);
      strokeWeight(p === 0 ? 1.2 : 1.2 + PARAMS.inkBleed * 1.5);

      beginShape();
      const samples = 220;
      for (let j = 0; j <= samples; j++) {
        const theta = (j / samples) * TWO_PI;
        const phase = t * 1.5 + norm * PI;

        let x = cx + R * cos(theta + phase) + r * cos(PARAMS.gearRatio * (theta + phase));
        let y = cy + R * sin(theta + phase) - r * sin(PARAMS.gearRatio * (theta + phase));

        // 疊加微量物理網目擾動 (Tooth Jitter)
        if (PARAMS.inkBleed > 0) {
          x += (noise(x * 0.05, y * 0.05, t) - 0.5) * PARAMS.inkBleed;
          y += (noise(y * 0.05, x * 0.05, t) - 0.5) * PARAMS.inkBleed;
        }

        // 邊界防護
        if (x >= margin && x <= width - margin && y >= margin && y <= height - margin) {
          vertex(x, y);
        }
      }
      endShape();
    }
  }
}

// -------------------------------------------------------------------------
// 紙張紋理產生器（Perlin Noise 顆粒）
// -------------------------------------------------------------------------
function generatePaperTexture() {
  paperTexture = createGraphics(width, height);
  paperTexture.pixelDensity(1);
  paperTexture.background(PARAMS.paperTone);
  paperTexture.loadPixels();

  const d = paperTexture.pixels;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (x + y * width) * 4;
      // 微細高頻雜訊
      const grain = (noise(x * 0.8, y * 0.8) - 0.5) * PARAMS.paperGrain;
      d[idx]     = constrain(d[idx] + grain, 0, 255);
      d[idx + 1] = constrain(d[idx + 1] + grain, 0, 255);
      d[idx + 2] = constrain(d[idx + 2] + grain, 0, 255);
    }
  }
  paperTexture.updatePixels();
}

// -------------------------------------------------------------------------
// 四角對位十字標
// -------------------------------------------------------------------------
function drawRegistrationMarks() {
  stroke(PARAMS.inkTone);
  strokeWeight(0.6);
  noFill();
  const offset = 22;
  const len = 10;

  const corners = [
    [offset, offset],
    [width - offset, offset],
    [offset, height - offset],
    [width - offset, height - offset]
  ];

  for (let i = 0; i < corners.length; i++) {
    const [mx, my] = corners[i];
    line(mx - len, my, mx + len, my);
    line(mx, my - len, mx, my + len);
    circle(mx, my, len);
  }
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
  fPrint.addBinding(PARAMS, 'paperTone', { label: '紙張底色' });
  fPrint.addBinding(PARAMS, 'inkBleed', { min: 0.0, max: 2.5, step: 0.1, label: '油墨擴散' });
  fPrint.addBinding(PARAMS, 'paperGrain', { min: 0, max: 50, step: 1, label: '紙張顆粒' }).on('change', () => {
    generatePaperTexture();
  });
  fPrint.addBinding(PARAMS, 'showMarks', { label: '對位標籤' });

  // 系統控制
  pane.addBinding(PARAMS, 'freeze', { label: '凍結動態' });
  pane.addButton({ title: '匯出目前畫面 (PNG)' }).on('click', () => {
    saveCanvas('screenprint_simulation', 'png');
  });
}
