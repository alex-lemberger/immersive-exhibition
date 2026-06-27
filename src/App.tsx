import { Canvas } from '@react-three/fiber'
import { createXRStore, XR } from '@react-three/xr'
import { OrbitControls } from '@react-three/drei'
import { ArtworkScene } from './scene/ArtworkScene'
import { playAmbient } from './audio/useAudio'
import reaching from './data/artworks/reaching.json'
import type { ArtworkScene as ArtworkSceneData } from './data/schema'

const store = createXRStore()
const data = reaching as ArtworkSceneData

// Place the artwork in front of a standing viewer: eye height, a couple of
// metres ahead, like a work hung on a wall. Used for both the desktop camera
// target and the VR placement so the headset sees it straight ahead.
const EYE = 1.5
const DIST = 2.4
const ARTWORK_POS: [number, number, number] = [0, EYE, -DIST]

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

      <Canvas camera={{ position: [0, EYE, 0], fov: 50 }}>
        <color attach="background" args={['#0b0b12']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 4]} intensity={0.6} />

        <XR store={store}>
          <group position={ARTWORK_POS}>
            <ArtworkScene data={data} />
          </group>
        </XR>

        <OrbitControls
          makeDefault
          target={ARTWORK_POS}
          enablePan={false}
          minDistance={0.8}
          maxDistance={5}
        />
      </Canvas>
    </>
  )
}
