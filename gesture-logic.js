/**
 * gesture-logic.js
 * 負責從 MediaPipe 的 21 個手部關鍵點判斷手勢狀態（open / fist）
 */

// MediaPipe Hand Landmarks 索引定義
// 參考：https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
const LANDMARKS = {
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_MCP: 5,
    INDEX_PIP: 6,
    INDEX_DIP: 7,
    INDEX_TIP: 8,
    MIDDLE_MCP: 9,
    MIDDLE_PIP: 10,
    MIDDLE_DIP: 11,
    MIDDLE_TIP: 12,
    RING_MCP: 13,
    RING_PIP: 14,
    RING_DIP: 15,
    RING_TIP: 16,
    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_DIP: 19,
    PINKY_TIP: 20
};

// 五個指尖的索引
const FINGERTIPS = [
    LANDMARKS.THUMB_TIP,
    LANDMARKS.INDEX_TIP,
    LANDMARKS.MIDDLE_TIP,
    LANDMARKS.RING_TIP,
    LANDMARKS.PINKY_TIP
];

// 五個 MCP（掌指關節）的索引，用於計算手掌中心
const MCP_JOINTS = [
    LANDMARKS.INDEX_MCP,
    LANDMARKS.MIDDLE_MCP,
    LANDMARKS.RING_MCP,
    LANDMARKS.PINKY_MCP
];

/**
 * 計算兩點之間的歐氏距離
 * @param {Object} p1 - 點1 {x, y, z}
 * @param {Object} p2 - 點2 {x, y, z}
 * @returns {number} 距離
 */
function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 計算手掌中心位置
 * 使用 WRIST 和四個 MCP 關節的平均位置
 * @param {Array} landmarks - 21 個手部關鍵點
 * @returns {Object} 手掌中心 {x, y, z}
 */
function getPalmCenter(landmarks) {
    const wrist = landmarks[LANDMARKS.WRIST];

    // 計算所有 MCP 關節的平均位置
    let sumX = wrist.x;
    let sumY = wrist.y;
    let sumZ = wrist.z || 0;

    for (const idx of MCP_JOINTS) {
        sumX += landmarks[idx].x;
        sumY += landmarks[idx].y;
        sumZ += landmarks[idx].z || 0;
    }

    const count = MCP_JOINTS.length + 1; // MCP 數量 + WRIST
    return {
        x: sumX / count,
        y: sumY / count,
        z: sumZ / count
    };
}

/**
 * 計算手的大小（用於正規化距離閾值）
 * 使用 WRIST 到 MIDDLE_MCP 的距離作為參考
 * @param {Array} landmarks - 21 個手部關鍵點
 * @returns {number} 手的參考大小
 */
function getHandSize(landmarks) {
    return distance(landmarks[LANDMARKS.WRIST], landmarks[LANDMARKS.MIDDLE_MCP]);
}

/**
 * 偵測手勢狀態
 * @param {Array} landmarks - MediaPipe 的 21 個手部關鍵點
 * @returns {string|null} 'open'（張開）、'fist'（握拳）或 null（無明確判斷）
 *
 * 判斷邏輯：
 * 1. 計算手掌中心位置
 * 2. 計算每個指尖到手掌中心的距離
 * 3. 用手的大小來正規化這些距離
 * 4. 如果大部分指尖距離遠 → open
 * 5. 如果大部分指尖距離近 → fist
 */
export function detectHandState(landmarks) {
    if (!landmarks || landmarks.length < 21) {
        return null;
    }

    // 取得手掌中心
    const palmCenter = getPalmCenter(landmarks);

    // 取得手的大小用於正規化
    const handSize = getHandSize(landmarks);

    if (handSize < 0.01) {
        // 手太小或偵測異常
        return null;
    }

    // 計算每個指尖到手掌中心的正規化距離
    let extendedFingers = 0;

    for (const tipIdx of FINGERTIPS) {
        const tip = landmarks[tipIdx];
        const dist = distance(tip, palmCenter);

        // 正規化距離（相對於手的大小）
        const normalizedDist = dist / handSize;

        // 閾值判斷：如果正規化距離大於某值，視為手指伸展
        // 這個閾值是經過調整的經驗值
        // 張開手時，指尖到掌心的距離大約是手掌大小的 1.5-2 倍
        // 握拳時，指尖到掌心的距離大約是手掌大小的 0.8-1.2 倍
        if (normalizedDist > 1.3) {
            extendedFingers++;
        }
    }

    // 判斷手勢
    // open: 至少 4 根手指伸展
    // fist: 最多 1 根手指伸展
    if (extendedFingers >= 4) {
        return 'open';
    } else if (extendedFingers <= 1) {
        return 'fist';
    }

    // 中間狀態，不確定
    return null;
}

/**
 * 去抖動的手勢偵測器類別
 * 需要連續 N 幀都判斷為相同狀態才視為真正切換
 */
export class GestureDetector {
    /**
     * @param {number} debounceFrames - 去抖動幀數，預設 5 幀
     */
    constructor(debounceFrames = 5) {
        this.debounceFrames = debounceFrames;
        this.currentState = null;      // 目前確認的狀態
        this.pendingState = null;      // 待確認的狀態
        this.pendingCount = 0;         // 待確認狀態的連續幀數
    }

    /**
     * 處理新的一幀手勢資料
     * @param {Array} landmarks - 手部關鍵點
     * @returns {string|null} 如果狀態發生改變，回傳新狀態；否則回傳 null
     */
    update(landmarks) {
        const rawState = detectHandState(landmarks);

        // 如果沒有明確判斷，不處理
        if (rawState === null) {
            // 重置待確認狀態
            this.pendingState = null;
            this.pendingCount = 0;
            return null;
        }

        // 如果與目前確認的狀態相同，不需要改變
        if (rawState === this.currentState) {
            this.pendingState = null;
            this.pendingCount = 0;
            return null;
        }

        // 如果是新的待確認狀態
        if (rawState !== this.pendingState) {
            this.pendingState = rawState;
            this.pendingCount = 1;
            return null;
        }

        // 如果與待確認狀態相同，增加計數
        this.pendingCount++;

        // 如果連續幀數達到閾值，確認狀態改變
        if (this.pendingCount >= this.debounceFrames) {
            const newState = this.pendingState;
            this.currentState = newState;
            this.pendingState = null;
            this.pendingCount = 0;
            return newState;
        }

        return null;
    }

    /**
     * 取得目前確認的手勢狀態
     * @returns {string|null}
     */
    getState() {
        return this.currentState;
    }

    /**
     * 重置偵測器狀態
     */
    reset() {
        this.currentState = null;
        this.pendingState = null;
        this.pendingCount = 0;
    }
}
