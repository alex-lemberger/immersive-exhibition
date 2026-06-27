import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtworkScene as ArtworkSceneData } from '../data/schema'
import { Layer } from './Layer'
import { DepthLayer } from './DepthLayer'
import { StoryNode } from './StoryNode'

/** Assembles one artwork: depth/parallax layers + interactive story nodes.
 *  Owns two pieces of shared state — the open story node, and `reach`, the
 *  driver for the gesture across the gulf (slow breath + viewer proximity,
 *  pinned open while The Reach is selected). */
export function ArtworkScene({ data }: { data: ArtworkSceneData }) {
  const [active, setActive] = useState<string | null>(null)
  const reach = useRef(0)
  const activeRef = useRef<string | null>(null)
  activeRef.current = active

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // the eternal almost-touch: a slow breath the gesture rests in
    const breath = 0.5 + 0.5 * Math.sin(t * 0.25)
    // viewer influence: pointer drawn toward the gap pulls the hands closer
    const near = Math.max(0, 1 - Math.hypot(state.pointer.x + 0.0, state.pointer.y - 0.2) / 0.8)
    // selecting The Reach closes the gap and holds it
    const target =
      activeRef.current === 'node-reach' ? 1 : Math.max(breath * 0.45, near)
    reach.current = THREE.MathUtils.lerp(reach.current, target, 0.05)
  })

  return (
    <group>
      {data.layers.map((layer) =>
        layer.depth ? (
          <DepthLayer key={layer.id} layer={layer} size={data.size} />
        ) : (
          <Layer key={layer.id} layer={layer} size={data.size} reachT={reach} />
        ),
      )}

      {data.storyNodes.map((node) => (
        <StoryNode
          key={node.id}
          node={node}
          active={active === node.id}
          onSelect={() => setActive(active === node.id ? null : node.id)}
        />
      ))}
    </group>
  )
}
