import { Canvas } from '@react-three/fiber'
import { createXRStore, XR } from '@react-three/xr'
import { OrbitControls } from '@react-three/drei'
import { ArtworkScene } from './scene/ArtworkScene'
import { playAmbient } from './audio/useAudio'
import reaching from './data/artworks/reaching.json'
import type { ArtworkScene as ArtworkSceneData } from './data/schema'

const store = createXRStore()
const data = reaching as ArtworkSceneData

export default function App() {
  const enter = () => {
    playAmbient(data.ambientAudio)
    store.enterVR()
  }

  return (
    <>
      <div className="hud">
        <h1>{data.title}</h1>
        <button onClick={enter}>Enter VR</button>
      </div>

      <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
        <color attach="background" args={['#0b0b12']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={0.6} />

        <XR store={store}>
          <ArtworkScene data={data} />
        </XR>

        <OrbitControls enablePan={false} minDistance={0.6} maxDistance={4} />
      </Canvas>
    </>
  )
}
