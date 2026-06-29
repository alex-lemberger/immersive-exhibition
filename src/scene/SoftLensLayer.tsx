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
uniform sampler2D uFlowMap;
uniform float uHasFlowMap;

varying vec2 vUv;

float inkLum(vec3 c) {
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

  float baseLum = inkLum(base.rgb);
  float lineMask = smoothstep(uLineThreshold + 0.18, uLineThreshold, baseLum);

  float detail = 0.55 + uZoomDetail * 0.85;

  vec2 floatOffset;

  if (uHasFlowMap > 0.5) {
    // Decode stroke tangent; rotate 90° to get stroke normal (across the line)
    vec2 tangent = texture2D(uFlowMap, vUv).rg * 2.0 - 1.0;
    float flowMag = length(tangent);
    vec2 strokeNormal = vec2(-tangent.y, tangent.x); // perpendicular = bunches/spreads lines

    // Radial bulge: push region toward/away from lens center — creates convex lens distortion
    vec2 fromCenter = vUv - uCenter;
    float radialDist = length(fromCenter);
    vec2 radialDir = radialDist > 0.001 ? fromCenter / radialDist : vec2(0.0);

    // Slow breath (Op-Art bulge inhale/exhale) + fast stroke ripple traveling across composition
    float breath  = sin(uTime * 0.7) * localActivation;
    float ripple  = sin(uTime * 2.2 + dot(vUv, vec2(5.1, 7.3))) * flowMag;

    // Normal displacement = lines bunch/spread (the Op-Art moire)
    // Radial displacement = whole region bulges under the lens
    floatOffset = (strokeNormal * ripple * 0.55 + radialDir * breath) * uFloatStrength * detail * localActivation * lineMask;
  } else {
    float waveA = sin(uTime * (1.2 + uZoomDetail * 1.8) + vUv.x * 46.0 + vUv.y * 31.0);
    float waveB = cos(uTime * (0.9 + uZoomDetail * 1.3) + vUv.x * 17.0 - vUv.y * 39.0);
    floatOffset = vec2(waveA, waveB) * uFloatStrength * detail * localActivation * lineMask;
  }

  vec4 shifted = texture2D(uMap, vUv + floatOffset);
  if (shifted.a < 0.05) discard;

  float shiftedLum = inkLum(shifted.rgb);
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
  const { texture: flowTex } = useOptionalTexture(layer.flow)
  const meshRef = useRef<THREE.Mesh>(null)
  const pointerUv = useRef(new THREE.Vector2(0.5, 0.5))
  const previousUv = useRef(new THREE.Vector2(0.5, 0.5))
  const hasPointerInteraction = useRef(false)
  const pointerActive = useRef(false)
  const worldPosition = useRef(new THREE.Vector3())
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
      uFlowMap: { value: null as THREE.Texture | null },
      uHasFlowMap: { value: 0 },
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
  uniforms.uFlowMap.value = flowTex
  uniforms.uHasFlowMap.value = flowTex ? 1 : 0

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!event.uv) return
    pointerUv.current.copy(event.uv)
    hasPointerInteraction.current = true
    pointerActive.current = true
  }

  const onPointerLeave = () => {
    pointerActive.current = false
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

    if (!hasPointerInteraction.current) {
      frameState.current = {
        pressure: 0,
        wake: 0,
        lensOpacity: 0,
        zoomDetail: 0,
      }
      uniforms.uCenter.value.copy(pointerUv.current)
      uniforms.uRadius.value = config.radius
      uniforms.uPressure.value = 0
      uniforms.uWake.value = 0
      uniforms.uLensOpacity.value = 0
      uniforms.uZoomDetail.value = 0
      uniforms.uTime.value = t
      uniforms.uOpacity.value = layer.opacity ?? 1
      return
    }

    const speed = pointerActive.current
      ? pointerUv.current.distanceTo(previousUv.current) / Math.max(delta, 0.001)
      : 0.12
    previousUv.current.lerp(pointerUv.current, 0.35)

    mesh.getWorldPosition(worldPosition.current)
    const cameraDistance = state.camera.position.distanceTo(worldPosition.current)

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
    <mesh
      ref={meshRef}
      position={[0, 0, layer.z]}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
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
