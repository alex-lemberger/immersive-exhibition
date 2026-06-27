import { useState } from 'react'
import type { ArtworkScene as ArtworkSceneData } from '../data/schema'
import { Layer } from './Layer'
import { DepthLayer } from './DepthLayer'
import { StoryNode } from './StoryNode'

/** Assembles one artwork from its data: depth layers + interactive story
 *  nodes. Selection state lives here so only one node is open at a time. */
export function ArtworkScene({ data }: { data: ArtworkSceneData }) {
  const [active, setActive] = useState<string | null>(null)

  return (
    <group>
      {data.layers.map((layer) =>
        layer.depth ? (
          <DepthLayer key={layer.id} layer={layer} size={data.size} />
        ) : (
          <Layer key={layer.id} layer={layer} size={data.size} />
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
