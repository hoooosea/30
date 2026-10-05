// --- 參數狀態中心（Tweakpane 雙向綁定） ---
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

  // 3. 輕量化渲染幾何輪系（即時預覽關閉昂貴疊印以維持滿幀 60 fps）
  renderEpicyclicSystem(this, t, 1.0, false);

  // 4. 繪製對位十字標
  if (PARAMS.showMarks) {
    drawRegistrationMarks(this, 1.0, false);
  }
}

// -------------------------------------------------------------------------
// 幾何繪圖核心：支援螢幕渲染與純黑向量 SVG 輸出
// -------------------------------------------------------------------------
function renderEpicyclicSystem(pg, t, scaleFactor, isVectorExport) {
  const cx = pg.width * 0.5;
  const cy = pg.height * 0.5;
  const margin = 45.0 * scaleFactor;
  const baseR = PARAMS.baseRadius * scaleFactor;
  const maxR = 235.0 * scaleFactor;
  const bleed = PARAMS.inkBleed * scaleFactor;

  pg.noFill();

  // 若為膠片向量輸出，嚴格強制使用 100% K 純黑無透明度
  if (isVectorExport) {
    pg.stroke(0);
    pg.strokeWeight(1.0);
  } else {
    const c = color(PARAMS.inkTone);
    pg.stroke(red(c), green(c), blue(c));
    pg.strokeWeight(1.2 * scaleFactor);
  }

  // 向量匯出時提高曲線細分點數，確保開版線條平滑
  const samples = isVectorExport ? 360 : 100;

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

      // 向量開版黑稿不加入隨機微滲透，以確保照排路徑平滑封閉
      if (bleed > 0 && !isVectorExport) {
        x += (noise(x * 0.05, y * 0.05, t) - 0.5) * bleed;
        y += (noise(y * 0.05, x * 0.05, t) - 0.5) * bleed;
      }

      if (x >= margin && x <= pg.width - margin && y >= margin && y <= pg.height - margin) {
        pg.vertex(x, y);
      }
    }
    pg.endShape();
  }
}

// -------------------------------------------------------------------------
// 紙張紋理產生器（僅供網頁螢幕模擬）
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
// 四角對位十字標
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
// 膠片用向量 SVG 匯出（100% K 純黑無損向量黑稿）
// -------------------------------------------------------------------------
function exportFilmVectorSVG() {
  // 建立 SVG 虛擬繪圖物件（需搭配 p5.js-svg 模組）
  const svgGraphics = createGraphics(800, 800, SVG);
  svgGraphics.clear(); // 背景透明，不包含紙張底色

  const currentT = frameCount * PARAMS.speed;

  // 以向量模式渲染純黑路徑
  renderEpicyclicSystem(svgGraphics, currentT, 1.0, true);

  if (PARAMS.showMarks) {
    drawRegistrationMarks(svgGraphics, 1.0, true);
  }

  // 儲存無損向量檔，並釋放記憶體
  svgGraphics.save('film_black_vector.svg');
  svgGraphics.remove();
}

// -------------------------------------------------------------------------
// Tweakpane 控制面板設定
// -------------------------------------------------------------------------
function initTweakpane() {
  pane = new Tweakpane.Pane({ title: '參數控制台' });

  // 1. 幾何
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

  // 4. 開版專用向量匯出按鈕
  fSys.addButton({ title: '膠片用向量圖檔' }).on('click', () => {
    exportFilmVectorSVG();
  });
}
