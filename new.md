下面是我現在的 3D 粒子愛心程式（particles.js），請針對「愛心形狀」做更有針對性的調整，具體要求：

1. 外觀目標
   - 愛心看起來要「矮胖、圓潤」，像卡通的 Q 版紅心，而不是現在這種瘦高型。
   - 主要看起來還是 2.5D 粒子雲：在 XY 平面輪廓很清楚，Z 軸有一點厚度就好，不要太厚。
   - 中間絕對不能再出現一條很亮的粒子直線。

2. 請你修改這些地方：
   - 檔案上方的參數區，把 HEART_SCALE_X 調大、HEART_SCALE_Y 調小、HEART_SCALE_Z 明顯調小，預設給我一組「矮胖」預設值。
   - 在 generateHeartPoints 裡面：
     - 強化「中心線迴避」：當 |x| < CENTER_LINE_AVOID 時，大部分點都直接跳過（例如只有 5% 機率保留），讓中線區域看起來偏空。
     - 微調表面優先策略，讓靠近心形外殼的點更多，深處點更少。
   - 在最後填補不足點數的 while (generated < count) 那段，也要一起套用中心線迴避邏輯，避免 fallback 又在中心塞點。

3. API 不要變：
   - 保持 `initParticles`, `setMode`, `getMode`, `setRotationFromHand` 等函式名稱與參數不變。
   - 只修改參數值與 generateHeartPoints 內部邏輯即可，其他 shader、顏色、星空模式都先不要大改。

請在回覆中直接給出完整更新後的 particles.js 檔案，並用註解標明你修改的部分，特別是：
- 哪些常數可以讓我調整心的寬、高、厚。
- 中心線避開是怎麼做的。
下面是目前的檔案內容：
（然後貼上你現在這份 particles.js）
const HEART_SIZE = 2.4;      // 稍微縮小一點
const HEART_SCALE_X = 1.45;  // 拉寬，變胖
const HEART_SCALE_Y = 0.8;   // 壓矮，別那麼修長
const HEART_SCALE_Z = 0.35;  // 明顯變薄，看起來像 2.5D
const CENTER_LINE_AVOID = 0.28; // 中間空出更大一條
// ===== 避免中心線粒子柱 =====
const distFromCenter = Math.abs(x);
if (distFromCenter < CENTER_LINE_AVOID) {
  // 中心區域只有 5% 機率保留
  if (Math.random() > 0.05) continue;
}
// 如果沒生成夠，用表面點填充
while (generated < count) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;

  let x = Math.sin(phi) * Math.cos(theta) * 1.1;
  let y = Math.sin(phi) * Math.sin(theta) * 1.1 - 0.2;
  let z = Math.cos(phi) * 0.8;

  // 中心線再過濾一次
  if (Math.abs(x) < CENTER_LINE_AVOID && Math.random() > 0.05) continue;

  points[generated * 3]     = x * HEART_SCALE_X * HEART_SIZE;
  points[generated * 3 + 1] = y * HEART_SCALE_Y * HEART_SIZE;
  points[generated * 3 + 2] = z * HEART_SCALE_Z * HEART_SIZE;
  generated++;
}
