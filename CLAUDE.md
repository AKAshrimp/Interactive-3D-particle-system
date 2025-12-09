# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hand Heart Particles 3D is an interactive web application that uses webcam-based hand gesture recognition to control a 3D particle system. When the user makes a fist, particles form a 3D heart shape; when they open their hand, the heart explodes into a starfield. Hand position also controls 3D rotation of the scene.

## Running the Project

Start a local HTTP server (ES modules require serving over HTTP):

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

Then open `http://localhost:8000` in a browser.

## Architecture

### Module Structure

```
main.js                 # Entry point - connects hand tracking to particle system
├── particles.js        # Three.js 3D particle system (heart/space modes)
├── hand-tracking.js    # MediaPipe Hand Landmarker + webcam integration
│   └── gesture-logic.js  # Gesture state detection (open/fist) with debouncing
```

### Key Data Flow

1. `hand-tracking.js` captures webcam frames and runs MediaPipe Hand Landmarker
2. Hand landmarks (21 points) are passed to `gesture-logic.js` for state detection
3. State changes ('open'/'fist') trigger `setMode()` in `particles.js`
4. Hand position (palm center) triggers `setRotationFromHand()` for 3D rotation

### Particle System (particles.js)

- Uses Three.js with custom ShaderMaterial for glow effects
- 8000 particles with additive blending
- Two target position arrays: `heartTargets` (3D heart shape) and `spaceTargets` (sphere distribution)
- Particles ease toward current mode's targets each frame

**Heart shape generation**: Uses parametric equation `x = 16*sin³(t), y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)` with fill factor and Z-axis thickness.

**Configurable parameters** at top of `particles.js`:
- `PARTICLE_COUNT` - number of particles (default: 8000)
- `HEART_SCALE` - size of heart (default: 2.5)
- `SPACE_RADIUS` - starfield radius (default: 15)
- `EASING` - movement smoothness (default: 0.02)
- `HEARTBEAT_AMPLITUDE/SPEED` - heart pulse animation

### Gesture Detection (gesture-logic.js)

- Calculates palm center from WRIST + 4 MCP joints
- Measures each fingertip distance to palm center, normalized by hand size
- `open`: ≥4 fingers extended (normalized distance > 1.3)
- `fist`: ≤1 finger extended
- `GestureDetector` class provides debouncing (5 consecutive frames required to confirm state change)

### External Dependencies (loaded via CDN)

- Three.js r160: `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`
- MediaPipe Tasks Vision: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest`

## API Reference

### particles.js exports
- `initParticles(container)` - Initialize Three.js scene in container element
- `setMode('heart' | 'space')` - Switch particle target positions
- `getMode()` - Get current mode
- `setRotationFromHand(normX, normY)` - Control 3D rotation (-1 to 1 range)
- `resize(width, height)` - Handle container resize
- `dispose()` - Clean up resources

### hand-tracking.js exports
- `startHandTracking(onStateChange, videoElement)` - Start detection, callback receives 'open'/'fist'
- `setHandPositionCallback(callback)` - Receive normalized palm position (normX, normY)
- `stopHandTracking()` - Stop detection and release camera
