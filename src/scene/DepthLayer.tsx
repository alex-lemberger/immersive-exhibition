import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtworkLayer } from '../data/schema'

// Depth-displaced layer: the color plane is pushed along z by a depth map
// (from scripts/pipeline.py depth) and drifts procedurally. Unlit, so the
// etching's tone is preserved exactly. This replaces hand-built C4D depth.

const vertexShader = /* glsl */ `
uniform sampler2D uDepth;
uniform float uDisplace;
uniform float uDrift;
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  float d = texture2D(uDepth, uv).r;
  vec3 p = position;
  p.z += (d - 0.5) * uDisplace;
  p.x += sin(uTime * 0.20 + uv.y * 6.2831) * uDrift;
  p.y += cos(uTime * 0.15 + uv.x * 6.2831) * uDrift * 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uMap, vUv);
  if (c.a < 0.01) discard;
  gl_FragColor = vec4(c.rgb, c.a * uOpacity);
  #include <colorspace_fragment>
}
`

export function DepthLayer({
  layer,
  size,
}: {
  layer: ArtworkLayer
  size: [number, number]
}) {
  const uniforms = useMemo(
    () => ({
      uMap: { value: null as THREE.Texture | null },
      uDepth: { value: null as THREE.Texture | null },
      uDisplace: { value: layer.displace ?? 0.1 },
      uOpacity: { value: layer.opacity ?? 1 },
      uDrift: { value: layer.drift ?? 0 },
      uTime: { value: 0 },
    }),
    // uniforms object is created once; values are refreshed in the effect below
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let active = true
    loader.load(
      layer.texture,
      (t) => {
        if (!active) return
        t.colorSpace = THREE.SRGBColorSpace
        uniforms.uMap.value = t
      },
      undefined,
      () => {},
    )
    if (layer.depth) {
      loader.load(
        layer.depth,
        (t) => {
          if (active) uniforms.uDepth.value = t
        },
        undefined,
        () => {},
      )
    }
    uniforms.uDisplace.value = layer.displace ?? 0.1
    uniforms.uOpacity.value = layer.opacity ?? 1
    uniforms.uDrift.value = layer.drift ?? 0
    return () => {
      active = false
    }
  }, [layer.texture, layer.depth, layer.displace, layer.opacity, layer.drift, uniforms])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh position={[0, 0, layer.z]}>
      <planeGeometry args={[size[0], size[1], 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
      />
    </mesh>
  )
}
