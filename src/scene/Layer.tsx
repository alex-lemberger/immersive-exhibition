import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtworkLayer } from '../data/schema'
import { useOptionalTexture } from './useOptionalTexture'

export function Layer({
  layer,
  size,
  activationState,
}: {
  layer: ArtworkLayer
  size: [number, number]
  activationState?: MutableRefObject<Record<string, number>>
}) {
  const { texture: tex, failed } = useOptionalTexture(layer.texture)
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const showFallback = failed && !tex

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh || !mat.current) return
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

      // Activation: wash the layer bright white/ethereal on mouse hover/sweep
    const activated = activationState?.current[layer.id] ?? 0
    if (activated > 0.01) {
      mat.current.color.setHex(0xffffff)
      mat.current.emissive.setHex(0x88ccff)
      mat.current.emissiveIntensity = activated * 2.0
      } else {
      mat.current.color.setHex(showFallback ? 0x3a3a4d : 0xffffff)
      mat.current.emissiveIntensity = 0
      }
    })

  return (
      <mesh ref={ref} position={[0, 0, layer.z]}>
        <planeGeometry args={[size[0], size[1]]} />
        <meshStandardMaterial
          ref={mat}
          map={tex ?? undefined}
          color={showFallback ? '#3a3a4d' : '#ffffff'}
          transparent
          opacity={tex || showFallback ? layer.opacity ?? 1 : 0}
          alphaTest={tex ? 0.05 : 0}
          depthWrite={showFallback}
        />
      </mesh>
    )
}
