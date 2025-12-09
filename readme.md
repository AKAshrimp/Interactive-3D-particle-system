請幫我用 HTML + CSS + JavaScript（可用 ES modules）實作一個單頁網站，功能和架構請完全依照下面需求實作，程式碼盡量有註解。

整體說明
做一個抖音風格的互動網頁特效：

用 webcam + MediaPipe 偵測手勢。

平常畫面是「星空粒子」。

當手握拳時，粒子慢慢聚成一個愛心。

當手張開時，愛心「炸開」變成滿版星空，粒子散開。

技術棧與檔案結構
請建立以下檔案：

index.html

styles.css

main.js

hand-tracking.js（負責 MediaPipe + webcam）

gesture-logic.js（負責從 landmarks 判斷 open / fist）

particles.js（負責粒子系統：愛心 / 星空）

index.html 使用 <script type="module" src="main.js"></script>。

1. 頁面結構與樣式
index.html：

全螢幕 <canvas id="particlesCanvas"> 作為背景粒子畫布。

一個 <video id="webcam" autoplay playsinline muted>，放在右下角小視窗（debug 用，可以用 CSS 設成小小一塊）。

一個簡單標題文字（例如「Hand Heart Particles」）置中上方即可。

styles.css：

網頁背景純黑或深紫。

canvas 全螢幕鋪滿，固定在背景。

video#webcam 固定在右下角，大小類似 200x150，帶一點圓角和邊框。

使用簡單的 flex 或 absolute 佈局即可。

2. MediaPipe 手勢偵測（hand-tracking.js + gesture-logic.js）
使用 MediaPipe Web 版的 Hand Landmarker 或 Gesture Recognizer（用官方 JS SDK）。​

hand-tracking.js
實作內容：

啟動 webcam，拿到 video stream，綁定到 <video id="webcam">。

初始化 MediaPipe hand solution：

每 frame 從 video 抓一幀送入 hand landmarker / gesture recognizer。

取得單隻手的 landmarks 或預測結果。

提供一個函式，例如 startHandTracking(onHandStateChange)：

onHandStateChange 是 callback，參數是字串 'open' 或 'fist'。

在每次手勢「狀態改變」時（例如從 open 變 fist），呼叫這個 callback。

gesture-logic.js
實作內容：

匯出一個函式 detectHandState(landmarks)，輸入 MediaPipe 的 21 個手部關鍵點，回傳：

'open'（張開手掌）

'fist'（握拳）

或 null（無明確判斷時可回傳 null）

邏輯可用簡單幾何規則：

先算「手掌中心」：可用 WRIST + MCP 點的平均位置。

取五個指尖：THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP。

計算每個指尖到掌心的距離，取平均或計數：

如果大部分指尖距離都「很遠」→ 視為 open。

如果大部分指尖距離都「很近」→ 視為 fist。

要有去抖動機制：例如連續 N 幀都判斷為 open/fist 才視為真正切換。

3. 粒子系統：愛心 / 星空（particles.js）
粒子用 2D canvas 實作即可，不需要 Three.js。

需求：

匯出介面：

initParticles(canvas)：初始化粒子系統，綁定到傳入的 canvas。

setMode(mode)：mode 為 'heart' 或 'space'。

在內部使用 requestAnimationFrame 不斷更新並繪製粒子。

初始化時：

建立一個粒子陣列，例如 1000–3000 顆。

每顆粒子要有：當前位置 (x, y)、速度 (vx, vy)、顏色 color，以及兩個目標位置：

heartX, heartY：在畫面中央附近排成一個愛心形狀。

spaceX, spaceY：分佈在整個畫面，類似星空的隨機位置。

3.1 愛心形狀座標
請用「數學心形公式」或類似 parametric 方程產生心形輪廓點，然後把這些點正規化、縮放到畫布中央區域，隨機分配給每個粒子的 heartX, heartY。​

例如：

以某個參數 t 從 0 到 2π，算出心形曲線上的 (x, y)。

多 sample 一些點（或加一點隨機偏移）做出「實心愛心」的效果。

3.2 星空位置
spaceX, spaceY 直接隨機分佈在整個畫布範圍內。

可以根據高度稍微改變粒子的亮度，營造層次感。​

3.3 更新邏輯與模式
mode 共有兩種：'heart'、'space'。

在動畫迴圈中：

如果目前 mode 是 'heart'：

粒子用 easing / 緩動方式往自己的 (heartX, heartY) 移動。

可以在愛心模式下讓整個心臟做輕微縮放跳動（例如用 sin(time) 做輕微的 scale 動畫）。

如果目前 mode 是 'space'：

粒子用 easing / 緩動方式往自己的 (spaceX, spaceY) 移動。

在星空模式下可加一點隨機微動與 twinkle（隨機變化 alpha 或亮度）。​​

請保證：

在兩種模式切換時，不要瞬移；而是粒子緩慢移動到新目標位置。

有合理的 FPS 表現（請盡量避免太重的計算）。

4. 串接手勢與粒子（main.js）
main.js 功能：

從 DOM 取得 #particlesCanvas 和 #webcam。

呼叫 initParticles(canvas) 啟動粒子系統，預設 mode = 'space'（星空）。

呼叫 startHandTracking(onHandStateChange) 開始手勢偵測。

在 onHandStateChange(state) 裡：

當 state === 'fist' → 呼叫 setMode('heart')，讓粒子聚成愛心。

當 state === 'open' → 呼叫 setMode('space')，讓愛心炸開變星空。

只在狀態真正改變時才呼叫一次，避免瘋狂切換。

5. 其他要求
所有檔案請用 ES modules 的寫法互相 import / export。

程式碼中請加上清楚的註解，特別是：

愛心座標計算的部分。

手勢判斷邏輯（open vs fist 的條件）。

粒子從 heart 模式切換到 space 模式的過程。

不需要加後端或 build 工具，使用原生 JS 即可，在瀏覽器直接用一個靜態伺服器開啟就能跑。

請直接輸出所有檔案的完整程式碼內容（index.html、styles.css、main.js、hand-tracking.js、gesture-logic.js、particles.js），方便我複製貼上到專案裡。