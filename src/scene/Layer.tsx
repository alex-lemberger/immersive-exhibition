import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtworkLayer } from '../data/schema'

/** Loads a texture but never throws — missing files just stay null so the
 *  scene is viewable before any art is produced. */
function useOptionalTexture(url?: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) return
    let active = true
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (!active) return
        t.colorSpace = THREE.SRGBColorSpace
        setTex(t)
      },
      undefined,
      () => {
        /* missing asset — keep fallback colour */
      },
    )
    return () => {
      active = false
    }
  }, [url])
  return tex
}

export function Layer({
  layer,
  size,
  reachT,
}: {
  layer: ArtworkLayer
  size: [number, number]
  /** Shared scene reach driver, 0..1. */
  reachT?: MutableRefObject<number>
}) {
  const tex = useOptionalTexture(layer.texture)
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const baseOpacity = layer.opacity ?? 1

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    const p = layer.parallax ?? 0
    const m = layer.motion

    // screen-mode parallax (negligible in VR, where head movement gives depth)
    let x = state.pointer.x * p
    let y = state.pointer.y * p

    // always-on ambient motion
    if (m) {
      const sp = m.speed ?? 1
      const ph = m.phase ?? 0
      x += Math.sin(t * sp + ph) * (m.floatX ?? 0)
      y += Math.cos(t * sp * 0.8 + ph) * (m.floatY ?? 0)
      mesh.rotation.z = Math.sin(t * sp * 0.5 + ph) * (m.sway ?? 0)
      if (mat.current && m.breathe) {
        const b = 0.5 + 0.5 * Math.sin(t * sp + ph)
        mat.current.opacity = baseOpacity * (1 - m.breathe + m.breathe * b)
      }
    }

    // the reach: translate toward the gesture target as reachT rises
    let z = layer.z
    if (layer.reach && reachT) {
      const rt = reachT.current
      x += layer.reach.offset[0] * rt
      y += layer.reach.offset[1] * rt
      z += layer.reach.offset[2] * rt
    }

    mesh.position.set(x, y, z)
  })

  return (
    <mesh ref={ref} position={[0, 0, layer.z]}>
      <planeGeometry args={[size[0], size[1]]} />
      <meshBasicMaterial
        ref={mat}
        map={tex ?? undefined}
        transparent
        opacity={baseOpacity}
        color={tex ? '#ffffff' : '#3a3a4d'}
      />
    </mesh>
  )
}
