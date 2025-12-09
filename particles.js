/**
 * particles.js (3D Three.js 版本 - 美化版)
 * 使用 Three.js 實現 3D 粒子系統：愛心形狀與星空效果
 *
 * 美化改進：
 * 1. 愛心形狀更圓滑，無中間縫隙
 * 2. 多層顏色：內層亮粉白，外層紫色光暈
 * 3. 更柔和的發光效果
 * 4. 星空閃爍動畫
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ============== 可調整參數 ==============
const PARTICLE_COUNT = 50000;
const SPACE_RADIUS = 15;
const EASING = 0.025;
const ROTATION_SENSITIVITY = 1.5;
const ROTATION_EASING = 0.08;
const HEARTBEAT_AMPLITUDE = 0.05;
const HEARTBEAT_SPEED = 1.2;

// ===== 3D 愛心形狀參數 =====
const HEART_SIZE = 3.0;         // 整體大小
const HEART_SCALE_X = 1.3;      // X 軸縮放（寬度）
const HEART_SCALE_Y = 1.1;      // Y 軸縮放（高度）
const HEART_SCALE_Z = 0.9;      // Z 軸縮放（厚度，接近 1 = 飽滿立體）
const CENTER_LINE_AVOID = 0.15; // 中心線迴避半徑
// ========================================

// Three.js 核心物件
let scene = null;
let camera = null;
let renderer = null;
let container = null;

// 粒子系統
let particleSystem = null;
let particleGeometry = null;
let particleMaterial = null;

// 粒子資料陣列
let positions = null;
let colors = null;
let sizes = null;
let heartTargets = null;
let spaceTargets = null;

// 狀態
let currentMode = 'space';
let animationId = null;
let time = 0;

// 旋轉控制
let targetRotationX = 0;
let targetRotationY = 0;
let currentRotationX = 0;
let currentRotationY = 0;

// 粒子容器
let particleContainer = null;

/**
 * 生成飽滿 3D 愛心座標
 *
 * 使用 3D 心形參數方程，創造飽滿立體的愛心
 * 特點：
 * 1. 真正的 3D 體積，從各角度都飽滿
 * 2. 表面粒子密集，內部適度填充
 * 3. 中心線迴避，不會出現粒子直線
 * 4. 圓潤可愛的心形輪廓
 */
function generateHeartPoints(count) {
    const points = new Float32Array(count * 3);
    let generated = 0;

    // 70% 表面粒子，30% 內部填充
    const surfaceCount = Math.floor(count * 0.7);

    while (generated < count) {
        let x, y, z;

        if (generated < surfaceCount) {
            // ===== 表面粒子：使用 3D 參數方程 =====
            const u = Math.random() * Math.PI * 2;  // 水平角度 0-2π
            const v = Math.random() * Math.PI;      // 垂直角度 0-π

            // 3D 心形參數方程（飽滿版本）
            const sinU = Math.sin(u);
            const cosU = Math.cos(u);
            const sinV = Math.sin(v);
            const cosV = Math.cos(v);

            // 基礎心形輪廓（XY平面）
            const heartX = 16 * Math.pow(sinU, 3);
            const heartY = 13 * cosU - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u);

            // 正規化
            const nx = heartX / 16;
            const ny = heartY / 17;

            // 計算心形在該角度的「半徑」
            const heartRadius = Math.sqrt(nx * nx + ny * ny);

            // 3D 擴展：使用球面映射創造體積
            // sinV 控制 Z 軸分佈，創造飽滿的 3D 效果
            const zFactor = cosV;  // -1 到 1
            const xyFactor = sinV; // 0 到 1 再到 0

            // 混合心形輪廓與球面
            x = nx * xyFactor * 0.9 + nx * 0.1;
            y = ny * xyFactor * 0.9 + ny * 0.1;
            z = zFactor * heartRadius * 0.7;  // Z 軸深度與心形大小成比例

            // 輕微隨機偏移讓表面更自然
            const surfaceNoise = 0.05;
            x += (Math.random() - 0.5) * surfaceNoise;
            y += (Math.random() - 0.5) * surfaceNoise;
            z += (Math.random() - 0.5) * surfaceNoise * 0.5;

        } else {
            // ===== 內部填充粒子 =====
            const u = Math.random() * Math.PI * 2;
            const fillFactor = Math.pow(Math.random(), 0.5) * 0.85;  // 偏向外層

            // 2D 心形輪廓
            const heartX = 16 * Math.pow(Math.sin(u), 3);
            const heartY = 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u);

            const nx = heartX / 16 * fillFactor;
            const ny = heartY / 17 * fillFactor;
            const heartRadius = Math.sqrt(nx * nx + ny * ny);

            x = nx;
            y = ny;
            // 內部 Z 軸根據到中心的距離決定厚度
            z = (Math.random() - 0.5) * heartRadius * 1.2;
        }

        // ===== 中心線迴避 =====
        const distFromCenterX = Math.abs(x);
        const distFromCenterZ = Math.abs(z);
        if (distFromCenterX < CENTER_LINE_AVOID && distFromCenterZ < CENTER_LINE_AVOID) {
            if (Math.random() > 0.08) continue;  // 92% 機率跳過中心線
        }

        // ===== 應用縮放 =====
        const finalX = x * HEART_SCALE_X * HEART_SIZE;
        const finalY = y * HEART_SCALE_Y * HEART_SIZE;
        const finalZ = z * HEART_SCALE_Z * HEART_SIZE;

        points[generated * 3] = finalX;
        points[generated * 3 + 1] = finalY;
        points[generated * 3 + 2] = finalZ;

        generated++;
    }

    console.log('3D Heart points generated:', generated);
    return points;
}

/**
 * 生成星空座標
 */
function generateSpacePoints(count, radius) {
    const points = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * Math.cbrt(Math.random());

        points[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        points[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        points[i * 3 + 2] = r * Math.cos(phi);
    }

    return points;
}

/**
 * HSL 轉 RGB
 */
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r, g, b };
}

/**
 * 生成多層顏色
 * 內層：亮粉白色  外層：紫色光暈
 */
function generateColors(count) {
    const colors = new Float32Array(count * 3);
    const edgeCount = Math.floor(count * 0.6);

    for (let i = 0; i < count; i++) {
        let h, s, l;

        if (i >= edgeCount) {
            // 內層：亮粉白色
            const variant = Math.random();
            if (variant < 0.5) {
                h = 0.92 + Math.random() * 0.08;
                s = 0.6 + Math.random() * 0.4;
                l = 0.75 + Math.random() * 0.2;
            } else if (variant < 0.8) {
                h = 0.95;
                s = 0.2 + Math.random() * 0.3;
                l = 0.9 + Math.random() * 0.1;
            } else {
                h = 0; s = 0;
                l = 0.95 + Math.random() * 0.05;
            }
        } else {
            // 外層：紫粉色
            const variant = Math.random();
            if (variant < 0.4) {
                h = 0.75 + Math.random() * 0.1;
                s = 0.5 + Math.random() * 0.3;
                l = 0.5 + Math.random() * 0.2;
            } else if (variant < 0.7) {
                h = 0.9 + Math.random() * 0.08;
                s = 0.4 + Math.random() * 0.3;
                l = 0.55 + Math.random() * 0.15;
            } else {
                h = 0.8 + Math.random() * 0.05;
                s = 0.3 + Math.random() * 0.2;
                l = 0.6 + Math.random() * 0.15;
            }
        }

        const rgb = hslToRgb(h % 1, s, l);
        colors[i * 3] = rgb.r;
        colors[i * 3 + 1] = rgb.g;
        colors[i * 3 + 2] = rgb.b;
    }

    return colors;
}

/**
 * 生成多樣化粒子大小
 */
function generateSizes(count) {
    const sizes = new Float32Array(count);
    const edgeCount = Math.floor(count * 0.6);

    for (let i = 0; i < count; i++) {
        const rand = Math.random();

        if (i >= edgeCount) {
            // 內層：較大粒子
            if (rand < 0.6) {
                sizes[i] = 0.04 + Math.random() * 0.03;
            } else if (rand < 0.9) {
                sizes[i] = 0.06 + Math.random() * 0.04;
            } else {
                sizes[i] = 0.1 + Math.random() * 0.08;
            }
        } else {
            // 外層：較小粒子
            if (rand < 0.7) {
                sizes[i] = 0.02 + Math.random() * 0.02;
            } else if (rand < 0.95) {
                sizes[i] = 0.03 + Math.random() * 0.03;
            } else {
                sizes[i] = 0.05 + Math.random() * 0.03;
            }
        }
    }

    return sizes;
}

/**
 * 創建增強版 Shader Material
 */
function createParticleMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: window.devicePixelRatio },
            mode: { value: 0.0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 customColor;
            varying vec3 vColor;
            varying float vRand;
            uniform float time;
            uniform float pixelRatio;
            uniform float mode;

            float rand(vec2 co) {
                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                vColor = customColor;
                vRand = rand(position.xy + position.z);

                float twinkle = 1.0;
                if (mode < 0.5) {
                    twinkle = 0.7 + 0.3 * sin(time * 2.0 + vRand * 6.28);
                }

                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pixelRatio * twinkle * (350.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vRand;
            uniform float time;
            uniform float mode;

            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);

                float core = 1.0 - smoothstep(0.0, 0.3, dist);
                float glow = exp(-dist * 3.5) * 0.6;
                float outerGlow = exp(-dist * 2.0) * 0.25;
                float brightness = core + glow + outerGlow;

                vec3 finalColor = vColor;
                finalColor = mix(finalColor, vec3(1.0, 0.95, 1.0), core * 0.3);
                finalColor *= brightness;

                float alpha = brightness * (1.0 - smoothstep(0.4, 0.5, dist));

                if (mode < 0.5) {
                    alpha *= 0.7 + 0.3 * sin(time * 1.5 + vRand * 6.28);
                }

                if (alpha < 0.01) discard;
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
}

/**
 * 初始化粒子系統
 */
export function initParticles(containerElement) {
    container = containerElement;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080010);

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.z = 10;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    particleContainer = new THREE.Group();
    scene.add(particleContainer);

    heartTargets = generateHeartPoints(PARTICLE_COUNT);
    spaceTargets = generateSpacePoints(PARTICLE_COUNT, SPACE_RADIUS);
    colors = generateColors(PARTICLE_COUNT);
    sizes = generateSizes(PARTICLE_COUNT);

    positions = new Float32Array(spaceTargets);

    particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    particleMaterial = createParticleMaterial();

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleContainer.add(particleSystem);

    window.addEventListener('resize', handleResize);

    startAnimation();

    console.log('3D 粒子系統初始化完成（美化版），共 ' + PARTICLE_COUNT + ' 顆粒子');
}

function handleResize() {
    if (!container || !camera || !renderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    if (particleMaterial) {
        particleMaterial.uniforms.pixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
}

export function resize(width, height) {
    if (!camera || !renderer) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

export function setMode(mode) {
    if (mode !== 'heart' && mode !== 'space') {
        console.warn('Invalid mode:', mode);
        return;
    }
    currentMode = mode;
    if (particleMaterial) {
        particleMaterial.uniforms.mode.value = mode === 'heart' ? 1.0 : 0.0;
    }
    console.log('3D 粒子模式切換為:', mode);
}

export function getMode() {
    return currentMode;
}

export function setRotationFromHand(normX, normY) {
    targetRotationY = -normX * Math.PI * ROTATION_SENSITIVITY;
    targetRotationX = normY * Math.PI * 0.5 * ROTATION_SENSITIVITY;
    targetRotationX = Math.max(-Math.PI * 0.4, Math.min(Math.PI * 0.4, targetRotationX));
}

function startAnimation() {
    function animate() {
        time += 0.016;

        if (particleMaterial) {
            particleMaterial.uniforms.time.value = time;
        }

        const heartbeat = currentMode === 'heart'
            ? 1 + HEARTBEAT_AMPLITUDE * Math.sin(time * HEARTBEAT_SPEED)
            : 1;

        const positionAttribute = particleGeometry.getAttribute('position');
        const posArray = positionAttribute.array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            let targetX, targetY, targetZ;

            if (currentMode === 'heart') {
                targetX = heartTargets[i3] * heartbeat;
                targetY = heartTargets[i3 + 1] * heartbeat;
                targetZ = heartTargets[i3 + 2] * heartbeat;
            } else {
                targetX = spaceTargets[i3];
                targetY = spaceTargets[i3 + 1];
                targetZ = spaceTargets[i3 + 2];
            }

            posArray[i3] += (targetX - posArray[i3]) * EASING;
            posArray[i3 + 1] += (targetY - posArray[i3 + 1]) * EASING;
            posArray[i3 + 2] += (targetZ - posArray[i3 + 2]) * EASING;
        }

        positionAttribute.needsUpdate = true;

        currentRotationX += (targetRotationX - currentRotationX) * ROTATION_EASING;
        currentRotationY += (targetRotationY - currentRotationY) * ROTATION_EASING;

        if (particleContainer) {
            particleContainer.rotation.x = currentRotationX;
            particleContainer.rotation.y = currentRotationY;
        }

        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
    }

    animate();
}

export function stopAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

export function resetParticles() {
    heartTargets = generateHeartPoints(PARTICLE_COUNT);
    spaceTargets = generateSpacePoints(PARTICLE_COUNT, SPACE_RADIUS);
    console.log('粒子位置已重置');
}

export function dispose() {
    stopAnimation();
    if (particleGeometry) particleGeometry.dispose();
    if (particleMaterial) particleMaterial.dispose();
    if (renderer) {
        renderer.dispose();
        if (container && renderer.domElement) {
            container.removeChild(renderer.domElement);
        }
    }
    window.removeEventListener('resize', handleResize);
    console.log('3D 粒子系統已清理');
}
