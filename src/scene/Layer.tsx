import { useEffect, useMemo, useRef, useState } from 'react'
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
}: {
  layer: ArtworkLayer
  size: [number, number]
}) {
  const tex = useOptionalTexture(layer.texture)
  const ref = useRef<THREE.Mesh>(null)
  const base = useMemo(() => new THREE.Vector3(0, 0, layer.z), [layer.z])

  // Screen-mode parallax: shift the layer with the pointer. In VR, real head
  // movement provides the depth and this contribution is negligible.
  useFrame((state) => {
    if (!ref.current) return
    const p = layer.parallax ?? 0
    ref.current.position.x = base.x + state.pointer.x * p
    ref.current.position.y = base.y + state.pointer.y * p
  })

  return (
    <mesh ref={ref} position={[0, 0, layer.z]}>
      <planeGeometry args={[size[0], size[1]]} />
      <meshBasicMaterial
        map={tex ?? undefined}
        transparent
        opacity={layer.opacity ?? 1}
        color={tex ? '#ffffff' : '#3a3a4d'}
      />
    </mesh>
  )
}
