# Hand Heart Particles 3D - 專案文檔

一個使用手勢控制的 **3D** 互動粒子特效網頁，透過 Webcam 和 MediaPipe 偵測手勢，實現 3D 星空與 3D 愛心之間的粒子動態切換效果，並可用手部位置控制 3D 旋轉。

---

## 專案結構

```
heart_handai/
├── index.html          # 頁面結構
├── styles.css          # 樣式設定
├── main.js             # 主程式入口
├── hand-tracking.js    # MediaPipe 手勢追蹤
├── gesture-logic.js    # 手勢判斷邏輯
├── particles.js        # 3D 粒子系統 (Three.js)
├── readme.md           # 開發需求文檔
├── new.md              # 3D 升級需求文檔
└── DOCUMENTATION.md    # 本文檔
```

---

## 技術棧

| 技術 | 用途 |
|------|------|
| **Three.js** | 3D 場景渲染、粒子系統 |
| **MediaPipe** | 手部關鍵點偵測 |
| **WebRTC** | Webcam 視訊擷取 |
| **WebGL** | GPU 加速渲染 |
| **ES Modules** | JavaScript 模組化 |

---

## 檔案說明

### 1. `index.html`

**功能**：網頁的 HTML 結構

**內容**：
- `<div id="three-container">` - Three.js 3D 場景容器
- `<video id="webcam">` - Webcam 視訊元素，用於手勢偵測
- `<h1 class="title">` - 頁面標題
- `<div id="gesture-hint">` - 手勢操作提示
- `<div id="status">` - 狀態訊息顯示

**特點**：
- 使用 ES modules (`<script type="module">`)
- Three.js 通過 CDN 動態載入

---

### 2. `styles.css`

**功能**：網頁樣式設定

**主要樣式**：
| 元素 | 樣式說明 |
|------|----------|
| `body` | 純深紫色背景 (`#0d0015`)，全螢幕 |
| `#three-container` | 固定定位，鋪滿整個視窗，承載 Three.js canvas |
| `#webcam` | 固定在右下角，200x150 大小，圓角邊框，鏡像翻轉 |
| `.title` | 置中上方，帶有粉紅色發光效果 |
| `#gesture-hint` | 左下角半透明提示框，帶模糊背景 |
| `#status` | 頂部狀態訊息，可自動隱藏 |

---

### 3. `main.js`

**功能**：主程式，串接 3D 場景與手勢偵測

**流程**：
```
1. DOM 載入完成
   ↓
2. 初始化 3D 粒子系統 (initParticles)
   ↓
3. 設定預設模式為星空 (setMode('space'))
   ↓
4. 設定手部位置回調 (setHandPositionCallback)
   ↓
5. 啟動手勢追蹤 (startHandTracking)
   ↓
6. 監聽手勢狀態變化 → 切換模式
   ↓
7. 監聽手部位置變化 → 控制 3D 旋轉
```

**主要函式**：
| 函式 | 說明 |
|------|------|
| `onHandStateChange(state)` | 手勢狀態變化回調，切換 heart/space 模式 |
| `onHandPosition(normX, normY)` | 手部位置回調，控制 3D 旋轉 |
| `showNotification(message)` | 顯示狀態通知 |
| `setupFallbackInteraction(container)` | 備用互動（滑鼠拖曳旋轉、點擊切換） |

---

### 4. `hand-tracking.js`

**功能**：MediaPipe Hand Landmarker 與 Webcam 整合

**新增功能**：
- `setHandPositionCallback(callback)` - 設定手部位置回調，用於 3D 旋轉控制
- `getPalmCenter(landmarks)` - 計算手掌中心位置

**主要匯出**：
| 函式 | 說明 |
|------|------|
| `startHandTracking(callback, videoElement)` | 啟動手勢追蹤 |
| `setHandPositionCallback(callback)` | 設定手部位置回調 |
| `stopHandTracking()` | 停止手勢追蹤 |

**手部位置計算**：
```javascript
// 使用 WRIST + 4個 MCP 關節的平均位置作為手掌中心
const palmCenter = getPalmCenter(landmarks);

// 轉換為 -1 到 1 的正規化座標
const normX = (palmCenter.x - 0.5) * 2;
const normY = (palmCenter.y - 0.5) * 2;
```

---

### 5. `gesture-logic.js`

**功能**：從 MediaPipe 手部關鍵點判斷手勢狀態

（與 2D 版本相同，未修改）

**判斷方式**：
1. 計算手掌中心（WRIST + 4 個 MCP 的平均位置）
2. 計算每個指尖到手掌中心的距離
3. 用手的大小正規化距離
4. 如果 ≥4 根手指伸展 → `'open'`
5. 如果 ≤1 根手指伸展 → `'fist'`

**去抖動機制**：連續 5 幀相同狀態才確認切換

---

### 6. `particles.js` (3D Three.js 版本)

**功能**：使用 Three.js 實現 3D 粒子系統

#### 可調整參數（檔案頂部）

```javascript
// 粒子數量（增加可獲得更密集的效果，但會影響性能）
const PARTICLE_COUNT = 8000;

// 愛心大小（調整這個值改變愛心的整體大小）
const HEART_SCALE = 2.5;

// 星空分佈半徑（粒子散開時的最大距離）
const SPACE_RADIUS = 15;

// 緩動係數（0-1 之間，越小移動越慢越平滑）
const EASING = 0.02;

// 旋轉靈敏度（手勢控制旋轉的幅度）
const ROTATION_SENSITIVITY = 1.5;

// 旋轉緩動係數（旋轉的平滑度）
const ROTATION_EASING = 0.08;

// 心跳動畫幅度
const HEARTBEAT_AMPLITUDE = 0.08;

// 心跳速度
const HEARTBEAT_SPEED = 2.0;
```

#### 3D 愛心座標計算

```javascript
// 2D 愛心參數方程
x = 16 * sin³(t)
y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)

// 3D 擴展：添加 Z 軸厚度
// - 使用 fillFactor 填充愛心內部（不只是輪廓）
// - 中心厚，邊緣薄
// - 添加隨機偏移讓分佈更自然
```

#### 3D 星空座標計算

```javascript
// 使用球座標系生成均勻分佈
θ = random() * 2π           // 水平角度
φ = acos(2 * random() - 1)  // 垂直角度（均勻分佈）
r = radius * random()^0.33  // 立方根讓分佈更均勻

x = r * sin(φ) * cos(θ)
y = r * sin(φ) * sin(θ)
z = r * cos(φ)
```

#### 主要匯出

| 函式 | 說明 |
|------|------|
| `initParticles(container)` | 初始化 Three.js 場景和粒子系統 |
| `setMode(mode)` | 設定顯示模式 ('heart' / 'space') |
| `getMode()` | 取得當前模式 |
| `setRotationFromHand(normX, normY)` | 根據手部位置控制 3D 旋轉 |
| `resize(width, height)` | 調整渲染器大小 |
| `stopAnimation()` | 停止動畫 |
| `resetParticles()` | 重置粒子位置 |
| `dispose()` | 清理資源 |

#### 旋轉控制映射

```
手部 X 位置 (-1 到 1) → Y 軸旋轉（左右轉動）
手部 Y 位置 (-1 到 1) → X 軸旋轉（上下俯仰）

旋轉使用 lerp 平滑插值，避免抖動
```

#### Three.js 場景結構

```
Scene
├── Camera (PerspectiveCamera, z=10)
└── particleContainer (Group, 用於整體旋轉)
    └── particleSystem (Points)
        ├── BufferGeometry
        │   ├── position (Float32Array)
        │   ├── customColor (Float32Array)
        │   └── size (Float32Array)
        └── ShaderMaterial (自訂發光效果)
```

---

## 使用方式

### 啟動伺服器

```bash
# 方法 1：Python
python -m http.server 8000

# 方法 2：Node.js
npx serve .

# 方法 3：VS Code Live Server
```

### 開啟網頁

瀏覽器開啟 `http://localhost:8000`

### 操作說明

| 操作 | 效果 |
|------|------|
| ✊ 握拳 | 粒子聚合成 3D 愛心形狀 |
| 🖐️ 張開手 | 愛心炸開變成 3D 星空 |
| 👋 移動手掌 | 控制 3D 場景旋轉 |
| 🖱️ 點擊畫面 | 備用切換模式（攝影機無法使用時）|
| 🖱️ 拖曳畫面 | 備用旋轉控制（攝影機無法使用時）|

---

## 技術規格

| 項目 | 規格 |
|------|------|
| 粒子數量 | 8000 顆 |
| 渲染技術 | WebGL (Three.js) |
| 粒子渲染 | 自訂 ShaderMaterial + Additive Blending |
| 顏色系統 | RGB（粉紅、紫色、白色混合）|
| 動畫 | requestAnimationFrame（約 60fps）|
| 緩動係數 | 0.02（平滑移動）|
| 手勢去抖動 | 連續 5 幀確認 |

---

## 瀏覽器支援

- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 14+

需要支援：
- ES Modules
- WebRTC (getUserMedia)
- WebGL 2.0
- WebAssembly（MediaPipe）

---

## 效能優化建議

1. **降低粒子數量**：如果效能不佳，將 `PARTICLE_COUNT` 從 8000 降低到 5000 或 3000
2. **關閉抗鋸齒**：在 `WebGLRenderer` 設定 `antialias: false`
3. **降低 devicePixelRatio**：在高 DPI 螢幕上可手動設定較低的像素比

---

## 常見問題

### Q: 攝影機無法使用？
A: 請確認已授權攝影機權限，或使用 HTTPS/localhost。備用模式可用滑鼠/觸控操作。

### Q: 3D 效果卡頓？
A: 嘗試降低粒子數量，或關閉其他佔用 GPU 的程式。

### Q: 手勢偵測不靈敏？
A: 確保手部完整出現在畫面中，光線充足，背景簡單。

---

## 版本歷史

- **v2.0** - 升級為 3D Three.js 版本，新增手勢旋轉控制
- **v1.0** - 初始 2D Canvas 版本
