# Soft Lens Line Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved browser prototype where panning/zooming explores the etching, pausing creates a local soft lens, and nearby dark linework becomes ink-only, floating, intensity-shifting, and locally drying.

**Architecture:** Add a small tested activation-math module, extend the scene data schema with soft-lens parameters, and introduce a focused `SoftLensLayer` shader component for layers whose `activation` is `"softLensLinework"`. Keep the existing resilient `Layer` fallback for non-activated layers and missing assets.

**Tech Stack:** React 18, TypeScript, Vite, react-three-fiber, Three.js GLSL shader materials, Vitest for pure activation tests.

---

## File Structure

- Modify `package.json`: add a `test` script and `vitest` dev dependency.
- Modify `.gitignore`: add `.superpowers/` so visual brainstorming artifacts do not clutter status.
- Create `src/scene/softLens.ts`: pure configuration defaults and activation timing/math helpers.
- Create `src/scene/softLens.test.ts`: Vitest tests for pressure build, movement wake, drying decay, and zoom detail.
- Create `src/scene/useOptionalTexture.ts`: shared resilient texture loader extracted from `Layer`.
- Modify `src/scene/Layer.tsx`: use `useOptionalTexture` and keep the flat-texture/fallback path simple.
- Create `src/scene/SoftLensLayer.tsx`: line-aware shader layer with local UV-space lens, movement wake, dwell pressure, ink-only intensity exchange, and small UV-floating.
- Modify `src/scene/ArtworkScene.tsx`: route `activation: "softLensLinework"` layers to `SoftLensLayer`; keep `DepthLayer` behavior unchanged.
- Modify `src/data/schema.ts`: add typed soft-lens activation fields.
- Modify `src/data/artworks/reaching.json`: configure soft-lens activation for the existing `reaching` layers.

## Current Workspace Note

Before implementation, run `git status --short`. This repo currently has unrelated modified files from the wet-hand prototype and rendering/debug work. Do not revert them. Each commit below should stage only the files listed in that task.

---

### Task 1: Add Test Runner And Activation Math

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `src/data/schema.ts`
- Create: `src/scene/softLens.ts`
- Test: `src/scene/softLens.test.ts`

- [ ] **Step 1: Install Vitest**

Run:

```bash
npm install -D vitest
```

Expected: `package.json` and `package-lock.json` update with `vitest` in `devDependencies`.

- [ ] **Step 2: Add scripts and ignore rule**

In `package.json`, change the `scripts` block to include `test`:

```json
"scripts": {
  "dev": "vite",
  "host": "vite --host",
  "build": "tsc -b && vite build",
  "preview": "vite preview --host",
  "typecheck": "tsc -b --noEmit",
  "test": "vitest run"
}
```

In `.gitignore`, add:

```gitignore
.superpowers/
```

- [ ] **Step 3: Add the soft lens config input type**

In `src/data/schema.ts`, add this type after `TriggerKind`:

```ts
export interface SoftLensConfigInput {
  /** Circular activation radius in layer UV units. */
  activationRadius?: number
  /** Seconds of stillness needed for mature line behavior. */
  activationBuildTime?: number
  /** Seconds for local activation to dry after movement resumes. */
  activationDecayTime?: number
  /** Overall effect strength, 0..1. */
  activationStrength?: number
  /** Luminance cutoff below which pixels count as etched linework. */
  lineThreshold?: number
  /** UV displacement amplitude for activated line micro-floating. */
  floatStrength?: number
  /** Ink-only brightness exchange amplitude for activated lines. */
  intensityWaveStrength?: number
}
```

- [ ] **Step 4: Write the failing activation tests**

Create `src/scene/softLens.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SOFT_LENS,
  computeSoftLensFrame,
  resolveSoftLensConfig,
} from './softLens'

describe('resolveSoftLensConfig', () => {
  it('uses defaults and allows artwork overrides', () => {
    const config = resolveSoftLensConfig({
      activationRadius: 0.18,
      activationBuildTime: 0.9,
      activationDecayTime: 3.5,
      activationStrength: 0.7,
      lineThreshold: 0.42,
      floatStrength: 0.006,
      intensityWaveStrength: 0.24,
    })

    expect(config.radius).toBe(0.18)
    expect(config.buildTime).toBe(0.9)
    expect(config.decayTime).toBe(3.5)
    expect(config.strength).toBe(0.7)
    expect(config.lineThreshold).toBe(0.42)
    expect(config.floatStrength).toBe(0.006)
    expect(config.intensityWaveStrength).toBe(0.24)
  })
})

describe('computeSoftLensFrame', () => {
  it('builds pressure while the pointer is still', () => {
    const first = computeSoftLensFrame({
      previousPressure: 0,
      previousWake: 0,
      deltaSeconds: 0.5,
      speed: 0.001,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    const second = computeSoftLensFrame({
      previousPressure: first.pressure,
      previousWake: first.wake,
      deltaSeconds: 0.5,
      speed: 0.001,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(first.pressure).toBeGreaterThan(0)
    expect(second.pressure).toBeGreaterThan(first.pressure)
    expect(second.lensOpacity).toBeGreaterThan(0)
  })

  it('suppresses pressure but leaves a faint wake during movement', () => {
    const frame = computeSoftLensFrame({
      previousPressure: 0.9,
      previousWake: 0,
      deltaSeconds: 0.16,
      speed: 0.4,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(frame.pressure).toBeLessThan(0.9)
    expect(frame.wake).toBeGreaterThan(0)
    expect(frame.lensOpacity).toBeGreaterThanOrEqual(0)
  })

  it('dries pressure and wake over time after movement stops away from the area', () => {
    const frame = computeSoftLensFrame({
      previousPressure: 1,
      previousWake: 0.8,
      deltaSeconds: DEFAULT_SOFT_LENS.decayTime,
      speed: 0.12,
      cameraDistance: 2.4,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(frame.pressure).toBeLessThan(0.2)
    expect(frame.wake).toBeLessThan(0.2)
  })

  it('increases detail when the camera is closer to the artwork', () => {
    const far = computeSoftLensFrame({
      previousPressure: 0.5,
      previousWake: 0,
      deltaSeconds: 0.1,
      speed: 0.001,
      cameraDistance: 3.2,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })
    const close = computeSoftLensFrame({
      previousPressure: 0.5,
      previousWake: 0,
      deltaSeconds: 0.1,
      speed: 0.001,
      cameraDistance: 1.2,
      restingCameraDistance: 2.4,
      config: DEFAULT_SOFT_LENS,
    })

    expect(close.zoomDetail).toBeGreaterThan(far.zoomDetail)
  })
})
```

- [ ] **Step 5: Run the tests to verify they fail**

Run:

```bash
npm test -- src/scene/softLens.test.ts
```

Expected: FAIL because `src/scene/softLens.ts` does not exist.

- [ ] **Step 6: Implement activation math**

Create `src/scene/softLens.ts`:

```ts
import type { SoftLensConfigInput } from '../data/schema'

export interface SoftLensConfig {
  radius: number
  buildTime: number
  decayTime: number
  strength: number
  lineThreshold: number
  floatStrength: number
  intensityWaveStrength: number
}

export interface SoftLensFrameInput {
  previousPressure: number
  previousWake: number
  deltaSeconds: number
  speed: number
  cameraDistance: number
  restingCameraDistance: number
  config: SoftLensConfig
}

export interface SoftLensFrame {
  pressure: number
  wake: number
  lensOpacity: number
  zoomDetail: number
}

export const DEFAULT_SOFT_LENS: SoftLensConfig = {
  radius: 0.16,
  buildTime: 1.0,
  decayTime: 3.0,
  strength: 0.75,
  lineThreshold: 0.55,
  floatStrength: 0.004,
  intensityWaveStrength: 0.22,
}

const STILL_SPEED = 0.015
const MOVING_SPEED = 0.08

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function resolveSoftLensConfig(input?: SoftLensConfigInput): SoftLensConfig {
  return {
    radius: input?.activationRadius ?? DEFAULT_SOFT_LENS.radius,
    buildTime: input?.activationBuildTime ?? DEFAULT_SOFT_LENS.buildTime,
    decayTime: input?.activationDecayTime ?? DEFAULT_SOFT_LENS.decayTime,
    strength: input?.activationStrength ?? DEFAULT_SOFT_LENS.strength,
    lineThreshold: input?.lineThreshold ?? DEFAULT_SOFT_LENS.lineThreshold,
    floatStrength: input?.floatStrength ?? DEFAULT_SOFT_LENS.floatStrength,
    intensityWaveStrength:
      input?.intensityWaveStrength ?? DEFAULT_SOFT_LENS.intensityWaveStrength,
  }
}

export function computeSoftLensFrame(input: SoftLensFrameInput): SoftLensFrame {
  const delta = Math.max(0, input.deltaSeconds)
  const speed = Math.max(0, input.speed)
  const buildRate = delta / Math.max(0.001, input.config.buildTime)
  const decayRate = delta / Math.max(0.001, input.config.decayTime)
  const stillness = clamp01(1 - speed / STILL_SPEED)
  const movement = clamp01((speed - STILL_SPEED) / (MOVING_SPEED - STILL_SPEED))

  const pressure = clamp01(
    input.previousPressure + buildRate * stillness - decayRate * movement * 1.35,
  )
  const wake = clamp01(
    input.previousWake + movement * 0.18 - decayRate * (0.8 + stillness * 0.2),
  )

  const distanceRatio =
    input.restingCameraDistance / Math.max(0.001, input.cameraDistance)
  const zoomDetail = clamp01((distanceRatio - 0.75) / 1.25)

  return {
    pressure,
    wake,
    lensOpacity: clamp01((0.75 - pressure) * pressure * 2.4),
    zoomDetail,
  }
}
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
npm test -- src/scene/softLens.test.ts
npx tsc -p tsconfig.json --noEmit
```

Expected: both pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json package-lock.json .gitignore src/data/schema.ts src/scene/softLens.ts src/scene/softLens.test.ts
git commit -m "test(scene): add soft lens activation math"
```

---

### Task 2: Add Data-Driven Soft Lens Layer Configuration

**Files:**
- Modify: `src/data/schema.ts`
- Modify: `src/data/artworks/reaching.json`
- Test: `src/scene/softLens.test.ts`

- [ ] **Step 1: Update schema types**

In `src/data/schema.ts`, add this type after `TriggerKind`:

```ts
export type ActivationKind = 'wetline' | 'softLensLinework'
```

Then replace the `activation?: string` field on `ArtworkLayer` with:

```ts
   /** Optional interaction behavior for this layer. */
  activation?: ActivationKind
   /** Parameters for `activation: "softLensLinework"`. */
  softLens?: SoftLensConfigInput
```

- [ ] **Step 2: Configure `reaching`**

In `src/data/artworks/reaching.json`, set all four current layers to use the new activation. Use these exact values first; tune only after visual verification:

```json
"activation": "softLensLinework",
"softLens": {
  "activationRadius": 0.16,
  "activationBuildTime": 1.0,
  "activationDecayTime": 3.0,
  "activationStrength": 0.75,
  "lineThreshold": 0.55,
  "floatStrength": 0.004,
  "intensityWaveStrength": 0.22
}
```

For example, the `background` layer should become:

```json
{
  "id": "background",
  "texture": "/artworks/pilot/background.webp",
  "z": -0.25,
  "parallax": 0.0,
  "motion": { "floatY": 0.004, "speed": 0.18 },
  "activation": "softLensLinework",
  "softLens": {
    "activationRadius": 0.16,
    "activationBuildTime": 1.0,
    "activationDecayTime": 3.0,
    "activationStrength": 0.75,
    "lineThreshold": 0.55,
    "floatStrength": 0.004,
    "intensityWaveStrength": 0.22
  }
}
```

Apply the same `activation` and `softLens` object to `ball2`, `ball1`, and `figure1`. Remove the old `"activation": "wetline"` value from `figure1`.

- [ ] **Step 3: Run tests and typecheck**

Run:

```bash
npm test -- src/scene/softLens.test.ts
npx tsc -p tsconfig.json --noEmit
```

Expected: both pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/data/schema.ts src/data/artworks/reaching.json src/scene/softLens.ts src/scene/softLens.test.ts
git commit -m "feat(data): configure soft lens line activation"
```

---

### Task 3: Share Resilient Texture Loading

**Files:**
- Create: `src/scene/useOptionalTexture.ts`
- Modify: `src/scene/Layer.tsx`
- Test: `npm run build`

- [ ] **Step 1: Create shared loader**

Create `src/scene/useOptionalTexture.ts`:

```ts
import { useEffect, useState } from 'react'
import * as THREE from 'three'

export interface OptionalTextureState {
  texture: THREE.Texture | null
  failed: boolean
}

export function useOptionalTexture(url?: string): OptionalTextureState {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const [failed, setFailed] = useState(!url)

  useEffect(() => {
    setTex(null)
    setFailed(!url)
    if (!url) return

    let active = true
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (!active) return
        t.colorSpace = THREE.SRGBColorSpace
        setTex(t)
        setFailed(false)
      },
      undefined,
      () => {
        if (active) setFailed(true)
      },
    )

    return () => {
      active = false
    }
  }, [url])

  return { texture: tex, failed }
}
```

- [ ] **Step 2: Simplify `Layer.tsx` imports**

In `src/scene/Layer.tsx`, replace the current imports:

```ts
import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtworkLayer } from '../data/schema'
```

with:

```ts
import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtworkLayer } from '../data/schema'
import { useOptionalTexture } from './useOptionalTexture'
```

Delete the local `useOptionalTexture` function from `Layer.tsx`. Keep the existing component body using:

```ts
const { texture: tex, failed } = useOptionalTexture(layer.texture)
```

- [ ] **Step 3: Run verification**

Run:

```bash
npx tsc -p tsconfig.json --noEmit
npm run build
```

Expected: both pass. `npm run build` may still emit Vite chunk-size warnings; those are acceptable.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/scene/useOptionalTexture.ts src/scene/Layer.tsx
git commit -m "refactor(scene): share optional texture loading"
```

---

### Task 4: Implement `SoftLensLayer`

**Files:**
- Create: `src/scene/SoftLensLayer.tsx`
- Test: `npm run build`

- [ ] **Step 1: Create the shader layer component**

Create `src/scene/SoftLensLayer.tsx`:

```tsx
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtworkLayer } from '../data/schema'
import {
  computeSoftLensFrame,
  resolveSoftLensConfig,
  type SoftLensFrame,
} from './softLens'
import { useOptionalTexture } from './useOptionalTexture'

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform float uFallback;
uniform float uOpacity;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uPressure;
uniform float uWake;
uniform float uLensOpacity;
uniform float uZoomDetail;
uniform float uTime;
uniform float uStrength;
uniform float uLineThreshold;
uniform float uFloatStrength;
uniform float uIntensityWaveStrength;

varying vec2 vUv;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  if (uHasMap < 0.5) {
    if (uFallback < 0.5) discard;
    gl_FragColor = vec4(vec3(0.23, 0.23, 0.30), uOpacity);
    return;
  }

  vec4 base = texture2D(uMap, vUv);
  if (base.a < 0.05) discard;

  float dist = distance(vUv, uCenter);
  float lens = 1.0 - smoothstep(uRadius * 0.45, uRadius, dist);
  float localActivation = clamp(max(uPressure, uWake * 0.35) * lens * uStrength, 0.0, 1.0);

  float baseLum = luminance(base.rgb);
  float lineMask = smoothstep(uLineThreshold + 0.18, uLineThreshold, baseLum);

  float detail = 0.55 + uZoomDetail * 0.85;
  float waveA = sin(uTime * (1.2 + uZoomDetail * 1.8) + vUv.x * 46.0 + vUv.y * 31.0);
  float waveB = cos(uTime * (0.9 + uZoomDetail * 1.3) + vUv.x * 17.0 - vUv.y * 39.0);
  vec2 floatOffset = vec2(waveA, waveB) * uFloatStrength * detail * localActivation * lineMask;

  vec4 shifted = texture2D(uMap, vUv + floatOffset);
  if (shifted.a < 0.05) discard;

  float shiftedLum = luminance(shifted.rgb);
  float shiftedLineMask = smoothstep(uLineThreshold + 0.18, uLineThreshold, shiftedLum);
  float lineActivation = localActivation * shiftedLineMask;
  float exchange = sin(uTime * (1.6 + uZoomDetail * 1.6) + vUv.x * 83.0 + vUv.y * 61.0);
  float inkShift = exchange * uIntensityWaveStrength * lineActivation;

  vec3 color = shifted.rgb;
  color = clamp(color + vec3(inkShift), 0.0, 1.0);

  float pressureTrace = uLensOpacity * lens * (1.0 - shiftedLineMask) * 0.08;
  color = clamp(color - vec3(pressureTrace), 0.0, 1.0);

  gl_FragColor = vec4(color, shifted.a * uOpacity);
  #include <colorspace_fragment>
}
`

export function SoftLensLayer({
  layer,
  size,
}: {
  layer: ArtworkLayer
  size: [number, number]
}) {
  const { texture: tex, failed } = useOptionalTexture(layer.texture)
  const meshRef = useRef<THREE.Mesh>(null)
  const pointerUv = useRef(new THREE.Vector2(0.5, 0.5))
  const previousUv = useRef(new THREE.Vector2(0.5, 0.5))
  const frameState = useRef<SoftLensFrame>({
    pressure: 0,
    wake: 0,
    lensOpacity: 0,
    zoomDetail: 0,
  })
  const config = useMemo(() => resolveSoftLensConfig(layer.softLens), [layer.softLens])

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as THREE.Texture | null },
      uHasMap: { value: 0 },
      uFallback: { value: 0 },
      uOpacity: { value: layer.opacity ?? 1 },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uRadius: { value: config.radius },
      uPressure: { value: 0 },
      uWake: { value: 0 },
      uLensOpacity: { value: 0 },
      uZoomDetail: { value: 0 },
      uTime: { value: 0 },
      uStrength: { value: config.strength },
      uLineThreshold: { value: config.lineThreshold },
      uFloatStrength: { value: config.floatStrength },
      uIntensityWaveStrength: { value: config.intensityWaveStrength },
    }),
    [
      config.floatStrength,
      config.intensityWaveStrength,
      config.lineThreshold,
      config.radius,
      config.strength,
      layer.opacity,
    ],
  )

  uniforms.uMap.value = tex
  uniforms.uHasMap.value = tex ? 1 : 0
  uniforms.uFallback.value = failed && !tex ? 1 : 0

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!event.uv) return
    pointerUv.current.copy(event.uv)
  }

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const t = state.clock.elapsedTime
    const p = layer.parallax ?? 0
    const m = layer.motion
    let x = state.pointer.x * p
    let y = state.pointer.y * p

    if (m) {
      const sp = m.speed ?? 1
      const ph = m.phase ?? 0
      x += Math.sin(t * sp + ph) * (m.floatX ?? 0)
      y += Math.cos(t * sp * 0.8 + ph) * (m.floatY ?? 0)
      mesh.rotation.z = Math.sin(t * sp * 0.5 + ph) * (m.sway ?? 0)
    }

    let z = layer.z
    if (layer.reach) {
      x += layer.reach.offset[0] * t * 0.1
      y += layer.reach.offset[1] * t * 0.1
      z += layer.reach.offset[2] * t * 0.1
    }

    mesh.position.set(x, y, z)

    const speed = pointerUv.current.distanceTo(previousUv.current) / Math.max(delta, 0.001)
    previousUv.current.lerp(pointerUv.current, 0.35)

    const worldPosition = new THREE.Vector3()
    mesh.getWorldPosition(worldPosition)
    const cameraDistance = state.camera.position.distanceTo(worldPosition)

    frameState.current = computeSoftLensFrame({
      previousPressure: frameState.current.pressure,
      previousWake: frameState.current.wake,
      deltaSeconds: delta,
      speed,
      cameraDistance,
      restingCameraDistance: 2.4,
      config,
    })

    uniforms.uCenter.value.copy(pointerUv.current)
    uniforms.uRadius.value = config.radius
    uniforms.uPressure.value = frameState.current.pressure
    uniforms.uWake.value = frameState.current.wake
    uniforms.uLensOpacity.value = frameState.current.lensOpacity
    uniforms.uZoomDetail.value = frameState.current.zoomDetail
    uniforms.uTime.value = t
    uniforms.uOpacity.value = layer.opacity ?? 1
  })

  return (
    <mesh ref={meshRef} position={[0, 0, layer.z]} onPointerMove={onPointerMove}>
      <planeGeometry args={[size[0], size[1]]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={failed && !tex}
      />
    </mesh>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS with Vite build output. Chunk-size warnings are acceptable.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/scene/SoftLensLayer.tsx
git commit -m "feat(scene): add soft lens shader layer"
```

---

### Task 5: Wire Soft Lens Layers Into The Scene

**Files:**
- Modify: `src/scene/ArtworkScene.tsx`
- Test: `npm run build`

- [ ] **Step 1: Import `SoftLensLayer`**

In `src/scene/ArtworkScene.tsx`, add:

```ts
import { SoftLensLayer } from './SoftLensLayer'
```

- [ ] **Step 2: Replace render routing**

Replace the current `data.layers.map` block:

```tsx
{data.layers.map((layer) =>
  layer.depth ? (
     <DepthLayer key={layer.id} layer={layer} size={data.size} activationState={activationState} />
   ) : (
     <Layer key={layer.id} layer={layer} size={data.size} activationState={activationState} />
   )
)}
```

with:

```tsx
{data.layers.map((layer) => {
  if (layer.depth) {
    return (
      <DepthLayer
        key={layer.id}
        layer={layer}
        size={data.size}
        activationState={activationState}
      />
    )
  }

  if (layer.activation === 'softLensLinework') {
    return <SoftLensLayer key={layer.id} layer={layer} size={data.size} />
  }

  return (
    <Layer
      key={layer.id}
      layer={layer}
      size={data.size}
      activationState={activationState}
    />
  )
})}
```

This keeps `DepthLayer` untouched and preserves the old `Layer` path for non-soft-lens layers.

- [ ] **Step 3: Run focused checks**

Run:

```bash
npm test -- src/scene/softLens.test.ts
npx tsc -p tsconfig.json --noEmit
npm run build
```

Expected: all pass. `npm run typecheck` may still fail if the project-reference/noEmit config issue remains; do not treat that as a soft-lens regression unless this task also fixes `tsconfig.node.json`.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/scene/ArtworkScene.tsx
git commit -m "feat(scene): render soft lens activation layers"
```

---

### Task 6: Browser Verification And Tuning Pass

**Files:**
- Modify if needed: `src/data/artworks/reaching.json`
- Modify if needed: `src/scene/softLens.ts`
- Modify if needed: `src/scene/SoftLensLayer.tsx`

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite reports a local HTTPS URL, usually `https://127.0.0.1:5173/`.

- [ ] **Step 2: Manually verify interaction**

Open the dev URL in a browser and check these exact states:

```text
1. Move/pan over the etching: only a faint wake should appear.
2. Pause for roughly 1 second: a faint soft circular pressure trace should appear.
3. Keep still: the circular trace should fade while linework inside the area moves.
4. Move away: the area should dry back over roughly 2-4 seconds.
5. Zoom closer: local hatching should show more detailed instability than far view.
6. Blank paper areas should react much less than dark etched marks.
7. No blue/purple/rainbow color should appear.
8. Missing assets should still show the gray fallback instead of crashing.
```

- [ ] **Step 3: Tune only via config first**

If the effect is too large or too small, change only `src/data/artworks/reaching.json` first:

```json
"softLens": {
  "activationRadius": 0.14,
  "activationBuildTime": 1.1,
  "activationDecayTime": 3.2,
  "activationStrength": 0.68,
  "lineThreshold": 0.55,
  "floatStrength": 0.0035,
  "intensityWaveStrength": 0.18
}
```

Use this alternate stronger config only if the first version is too subtle:

```json
"softLens": {
  "activationRadius": 0.18,
  "activationBuildTime": 0.8,
  "activationDecayTime": 3.6,
  "activationStrength": 0.86,
  "lineThreshold": 0.6,
  "floatStrength": 0.005,
  "intensityWaveStrength": 0.28
}
```

- [ ] **Step 4: Tune shader only if config cannot fix it**

If blank paper activates too much, edit this line in `src/scene/SoftLensLayer.tsx`:

```glsl
float lineMask = smoothstep(uLineThreshold + 0.18, uLineThreshold, baseLum);
```

to:

```glsl
float lineMask = pow(smoothstep(uLineThreshold + 0.14, uLineThreshold, baseLum), 1.35);
```

If the lens trace is too visible, edit:

```glsl
float pressureTrace = uLensOpacity * lens * (1.0 - shiftedLineMask) * 0.08;
```

to:

```glsl
float pressureTrace = uLensOpacity * lens * (1.0 - shiftedLineMask) * 0.045;
```

- [ ] **Step 5: Stop dev server**

Stop Vite with `Ctrl-C` in the terminal running `npm run dev`.

- [ ] **Step 6: Final checks**

Run:

```bash
npm test -- src/scene/softLens.test.ts
npx tsc -p tsconfig.json --noEmit
npm run build
```

Expected: all pass.

- [ ] **Step 7: Commit tuning**

Run:

```bash
git add src/data/artworks/reaching.json src/scene/softLens.ts src/scene/SoftLensLayer.tsx
git commit -m "tune(scene): refine soft lens line activation"
```

If no tuning edits were needed, skip this commit and record the manual verification result in the final implementation summary.

---

## Final Verification Checklist

- [ ] `npm test -- src/scene/softLens.test.ts` passes.
- [ ] `npx tsc -p tsconfig.json --noEmit` passes.
- [ ] `npm run build` passes.
- [ ] Browser manual verification confirms pause differs from movement.
- [ ] Activation is local and circular.
- [ ] Blank paper reacts less than dark linework.
- [ ] Effect is ink-only with no blue glow.
- [ ] Close zoom reveals more detailed mark movement.
- [ ] Missing assets still fall back safely.

## Known Non-Goals

- Do not add Quest gaze/controller input in this plan.
- Do not generate depth maps, SVG line art, or masks in this plan.
- Do not add audio in this plan.
- Do not build authored narrative zones in this plan.
- Do not refactor `StoryNode` or exhibition navigation in this plan.

## Self-Review Notes

- Spec coverage: local soft lens, pressure build, movement wake, ink-only line-aware intensity exchange, micro-floating, zoom response, drying decay, and browser verification are covered.
- Red-flag scan: no unfinished-marker terms or unspecified implementation steps remain.
- Type consistency: `SoftLensConfigInput`, `ActivationKind`, `resolveSoftLensConfig`, `computeSoftLensFrame`, and `SoftLensLayer` names are used consistently across tasks.
