import { useState } from 'react'
import type { ArtworkScene as ArtworkSceneData } from '../data/schema'
import { Layer } from './Layer'
import { DepthLayer } from './DepthLayer'
import { SoftLensLayer } from './SoftLensLayer'
import { StoryNode } from './StoryNode'

export function ArtworkScene({ data }: { data: ArtworkSceneData }) {
  const [active, setActive] = useState<string | null>(null)

  return (
    <group>
      {data.layers.map((layer) => {
        if (layer.depth) {
          return <DepthLayer key={layer.id} layer={layer} size={data.size} />
        }

        if (layer.activation === 'softLensLinework') {
          return <SoftLensLayer key={layer.id} layer={layer} size={data.size} />
        }

        return <Layer key={layer.id} layer={layer} size={data.size} />
      })}

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
