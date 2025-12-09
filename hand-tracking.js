/**
 * hand-tracking.js
 * 負責 MediaPipe Hand Landmarker 與 Webcam 的整合
 * 使用 MediaPipe Tasks Vision 官方 SDK
 */

import { GestureDetector } from './gesture-logic.js';

// MediaPipe CDN 路徑
const MEDIAPIPE_TASKS_VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

// 模型路徑
const HAND_LANDMARKER_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// 全域變數
let handLandmarker = null;
let video = null;
let gestureDetector = null;
let onHandStateChangeCallback = null;
let onHandPositionCallback = null;  // 新增：手部位置回調
let isRunning = false;
let lastVideoTime = -1;

/**
 * 初始化 webcam 並綁定到 video 元素
 * @param {HTMLVideoElement} videoElement - video DOM 元素
 * @returns {Promise<void>}
 */
async function initWebcam(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });

        videoElement.srcObject = stream;

        // 等待 video 準備好
        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve();
            };
        });
    } catch (error) {
        console.error('無法存取 webcam:', error);
        throw new Error('無法存取攝影機，請確認已授權攝影機權限');
    }
}

/**
 * 初始化 MediaPipe Hand Landmarker
 * @returns {Promise<void>}
 */
async function initHandLandmarker() {
    try {
        // 動態載入 MediaPipe Tasks Vision
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest');

        const { HandLandmarker, FilesetResolver } = vision;

        // 載入 WASM 檔案
        const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_TASKS_VISION_CDN);

        // 建立 Hand Landmarker
        handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: HAND_LANDMARKER_MODEL,
                delegate: 'GPU'  // 使用 GPU 加速
            },
            runningMode: 'VIDEO',
            numHands: 1,  // 只偵測一隻手
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        console.log('Hand Landmarker 初始化完成');
    } catch (error) {
        console.error('Hand Landmarker 初始化失敗:', error);
        throw new Error('MediaPipe 初始化失敗');
    }
}

/**
 * 計算手掌中心位置（正規化座標）
 * @param {Array} landmarks - 手部關鍵點
 * @returns {Object} {x, y} 正規化座標（0-1）
 */
function getPalmCenter(landmarks) {
    // 使用 WRIST(0) 和四個 MCP 關節計算手掌中心
    const WRIST = 0;
    const INDEX_MCP = 5;
    const MIDDLE_MCP = 9;
    const RING_MCP = 13;
    const PINKY_MCP = 17;

    const points = [
        landmarks[WRIST],
        landmarks[INDEX_MCP],
        landmarks[MIDDLE_MCP],
        landmarks[RING_MCP],
        landmarks[PINKY_MCP]
    ];

    let sumX = 0, sumY = 0;
    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
    }

    return {
        x: sumX / points.length,
        y: sumY / points.length
    };
}

/**
 * 偵測迴圈 - 每幀從 video 抓取畫面進行手勢偵測
 */
function detectLoop() {
    if (!isRunning || !handLandmarker || !video) {
        return;
    }

    // 確保 video 已準備好且有新的幀
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        try {
            // 使用 Hand Landmarker 偵測手部
            const results = handLandmarker.detectForVideo(video, performance.now());

            // 如果有偵測到手
            if (results.landmarks && results.landmarks.length > 0) {
                // 取得第一隻手的 landmarks
                const landmarks = results.landmarks[0];

                // 使用去抖動的手勢偵測器
                const stateChange = gestureDetector.update(landmarks);

                // 如果狀態有改變，呼叫 callback
                if (stateChange && onHandStateChangeCallback) {
                    console.log('手勢狀態改變:', stateChange);
                    onHandStateChangeCallback(stateChange);
                }

                // 新增：計算並回報手部位置（用於 3D 旋轉控制）
                if (onHandPositionCallback) {
                    const palmCenter = getPalmCenter(landmarks);

                    // 將座標從 0-1 轉換為 -1 到 1
                    // 注意：webcam 是鏡像的，所以 X 需要反轉
                    const normX = (palmCenter.x - 0.5) * 2;  // 不反轉，因為在 CSS 已經鏡像
                    const normY = (palmCenter.y - 0.5) * 2;

                    onHandPositionCallback(normX, normY);
                }
            }
        } catch (error) {
            console.error('手勢偵測錯誤:', error);
        }
    }

    // 繼續下一幀偵測
    requestAnimationFrame(detectLoop);
}

/**
 * 開始手勢追蹤
 * @param {Function} onHandStateChange - 狀態改變時的 callback，參數為 'open' 或 'fist'
 * @param {HTMLVideoElement} [videoElement] - 可選的 video 元素，預設使用 #webcam
 * @returns {Promise<void>}
 */
export async function startHandTracking(onHandStateChange, videoElement = null) {
    // 設定 callback
    onHandStateChangeCallback = onHandStateChange;

    // 建立去抖動的手勢偵測器（連續 5 幀才切換狀態）
    gestureDetector = new GestureDetector(5);

    // 取得 video 元素
    video = videoElement || document.getElementById('webcam');

    if (!video) {
        throw new Error('找不到 video 元素');
    }

    // 更新狀態顯示
    updateStatus('正在初始化攝影機...');

    // 初始化 webcam
    await initWebcam(video);

    // 更新狀態顯示
    updateStatus('正在載入 AI 模型...');

    // 初始化 Hand Landmarker
    await initHandLandmarker();

    // 更新狀態顯示
    updateStatus('準備就緒！試試握拳和張開手掌');

    // 開始偵測
    isRunning = true;
    detectLoop();

    // 2 秒後隱藏狀態
    setTimeout(() => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.classList.add('ready');
        }
    }, 2000);

    console.log('手勢追蹤已啟動');
}

/**
 * 設定手部位置回調（用於 3D 旋轉控制）
 * @param {Function} callback - 回調函式，參數為 (normX, normY)，範圍 -1 到 1
 */
export function setHandPositionCallback(callback) {
    onHandPositionCallback = callback;
}

/**
 * 停止手勢追蹤
 */
export function stopHandTracking() {
    isRunning = false;

    if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    console.log('手勢追蹤已停止');
}

/**
 * 更新狀態顯示
 * @param {string} message - 狀態訊息
 */
function updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.classList.remove('ready');
    }
}
