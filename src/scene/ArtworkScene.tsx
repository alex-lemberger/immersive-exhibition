import type { ArtworkScene as ArtworkSceneData } from '../data/schema'
import { Layer } from './Layer'
import { DepthLayer } from './DepthLayer'
import { SoftLensLayer } from './SoftLensLayer'
import { EtchingWeb } from './EtchingWeb'

export function ArtworkScene({ data }: { data: ArtworkSceneData }) {

  return (
    <group>
      {data.layers.map((layer) => {
        if (layer.depth) {
          return <DepthLayer key={layer.id} layer={layer} size={data.size} />
        }

        if (layer.activation === 'softLensLinework') {
          return (
            <>
              <SoftLensLayer key={layer.id} layer={layer} size={data.size} />
              <EtchingWeb key={`${layer.id}-web`} layer={layer} size={data.size} />
            </>
          )
        }

        return <Layer key={layer.id} layer={layer} size={data.size} />
      })}

    </group>
  )
}
