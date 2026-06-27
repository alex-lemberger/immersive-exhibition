import { Billboard, Text } from '@react-three/drei'
import type { StoryNode as StoryNodeData } from '../data/schema'
import { playOnce } from '../audio/useAudio'

/** A clickable marker that reveals a fragment of story. Works in both the
 *  browser (pointer) and the headset (controller ray / hand) because it relies
 *  on R3F's onClick, which @react-three/xr maps to XR select events. */
export function StoryNode({
  node,
  active,
  onSelect,
}: {
  node: StoryNodeData
  active: boolean
  onSelect: () => void
}) {
  return (
    <group position={node.position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
          if (!active) playOnce(node.audio)
        }}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color={active ? '#e8b04b' : '#ffffff'}
          emissive={active ? '#e8b04b' : '#000000'}
          emissiveIntensity={active ? 0.6 : 0}
        />
      </mesh>

      {active && (
        <Billboard position={[0, 0.22, 0]}>
          <Text
            fontSize={0.07}
            maxWidth={1.4}
            textAlign="center"
            anchorX="center"
            anchorY="bottom"
            color="#f4f4f4"
            outlineWidth={0.004}
            outlineColor="#000000"
          >
            {`${node.title}\n\n${node.body}`}
          </Text>
        </Billboard>
      )}
    </group>
  )
}
