/**
 * main.js
 * 主程式：串接 3D 粒子場景與手勢偵測
 */

import { initParticles, setMode, setRotationFromHand } from './particles.js';
import { startHandTracking, setHandPositionCallback } from './hand-tracking.js';

// 目前的手勢狀態
let currentGestureState = null;

/**
 * 手勢狀態改變時的處理函式
 * 只在狀態真正改變時才呼叫粒子系統的 setMode
 *
 * @param {string} state - 'open' 或 'fist'
 */
function onHandStateChange(state) {
    // 只在狀態真正改變時處理
    if (state === currentGestureState) {
        return;
    }

    console.log(`手勢狀態從 ${currentGestureState} 變為 ${state}`);
    currentGestureState = state;

    // 根據手勢狀態切換粒子模式
    if (state === 'fist') {
        // 握拳 → 愛心聚合
        setMode('heart');
        showNotification('✊ 握拳 → 3D 愛心聚合中...');
    } else if (state === 'open') {
        // 張開手 → 愛心炸開變星空
        setMode('space');
        showNotification('🖐️ 張開手 → 3D 星空散開中...');
    }
}

/**
 * 手部位置更新時的處理函式
 * 用於控制 3D 場景的旋轉
 *
 * @param {number} normX - 正規化 X 座標 (-1 到 1)
 * @param {number} normY - 正規化 Y 座標 (-1 到 1)
 */
function onHandPosition(normX, normY) {
    // 將手部位置傳給 3D 場景，用於旋轉控制
    setRotationFromHand(normX, normY);
}

/**
 * 顯示通知訊息
 * @param {string} message - 通知訊息
 */
function showNotification(message) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.classList.remove('ready');

        // 2 秒後隱藏
        setTimeout(() => {
            status.classList.add('ready');
        }, 2000);
    }
}

/**
 * 主程式初始化
 */
async function init() {
    console.log('=== Hand Heart Particles 3D 啟動 ===');

    // 取得 DOM 元素
    const container = document.getElementById('three-container');
    const webcam = document.getElementById('webcam');

    if (!container) {
        console.error('找不到 #three-container 元素');
        return;
    }

    if (!webcam) {
        console.error('找不到 #webcam 元素');
        return;
    }

    // 1. 初始化 3D 粒子系統，預設為星空模式
    initParticles(container);
    setMode('space');
    console.log('3D 粒子系統已初始化，預設模式：星空');

    // 2. 啟動手勢追蹤
    try {
        // 設定手部位置回調（用於 3D 旋轉控制）
        setHandPositionCallback(onHandPosition);

        await startHandTracking(onHandStateChange, webcam);
        console.log('手勢追蹤已啟動');
    } catch (error) {
        console.error('手勢追蹤啟動失敗:', error);
        showNotification('⚠️ ' + error.message);

        // 即使手勢追蹤失敗，粒子效果仍然可以顯示
        // 提供備用的滑鼠/觸控互動
        setupFallbackInteraction(container);
    }
}

/**
 * 設定備用的滑鼠/觸控互動
 * 當手勢追蹤無法使用時，提供替代的互動方式
 * @param {HTMLElement} container - 容器元素
 */
function setupFallbackInteraction(container) {
    console.log('啟用備用互動模式（滑鼠/觸控）');
    showNotification('💡 點擊切換模式，拖曳旋轉 3D');

    let isHeartMode = false;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // 滑鼠點擊切換模式
    container.addEventListener('click', (e) => {
        // 如果是拖曳結束，不切換模式
        if (Math.abs(e.clientX - lastMouseX) > 5 || Math.abs(e.clientY - lastMouseY) > 5) {
            return;
        }

        isHeartMode = !isHeartMode;
        if (isHeartMode) {
            setMode('heart');
            showNotification('❤️ 3D 愛心模式');
        } else {
            setMode('space');
            showNotification('✨ 3D 星空模式');
        }
    });

    // 滑鼠拖曳旋轉
    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        // 累積旋轉（加大靈敏度）
        const normX = deltaX / window.innerWidth * 20;
        const normY = deltaY / window.innerHeight * 20;

        setRotationFromHand(normX, normY);

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // 觸控支援
    let touchStartX = 0;
    let touchStartY = 0;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    });

    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;

            const normX = deltaX / window.innerWidth * 20;
            const normY = deltaY / window.innerHeight * 20;

            setRotationFromHand(normX, normY);

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    });

    container.addEventListener('touchend', (e) => {
        // 雙擊切換模式
        if (e.changedTouches.length === 1) {
            // 簡單的點擊檢測
            const touch = e.changedTouches[0];
            if (Math.abs(touch.clientX - touchStartX) < 10 && Math.abs(touch.clientY - touchStartY) < 10) {
                isHeartMode = !isHeartMode;
                if (isHeartMode) {
                    setMode('heart');
                    showNotification('❤️ 3D 愛心模式');
                } else {
                    setMode('space');
                    showNotification('✨ 3D 星空模式');
                }
            }
        }
    });
}

// 當 DOM 載入完成後執行初始化
document.addEventListener('DOMContentLoaded', init);
