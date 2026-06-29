import { useEffect, useState } from 'react'
import * as THREE from 'three'

export interface OptionalTextureState {
  texture: THREE.Texture | null
  failed: boolean
}

export function useOptionalTexture(url?: string): OptionalTextureState {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const [failed, setFailed] = useState(!url)

  useEffect(() => {
    setTex(null)
    setFailed(!url)
    if (!url) return

    const resolvedUrl = url.startsWith('/')
      ? `${import.meta.env.BASE_URL}${url.slice(1)}`
      : url

    let active = true
    new THREE.TextureLoader().load(
      resolvedUrl,
      (t) => {
        if (!active) return
        t.colorSpace = THREE.SRGBColorSpace
        setTex(t)
        setFailed(false)
      },
      undefined,
      () => {
        if (active) setFailed(true)
      },
    )

    return () => {
      active = false
    }
  }, [url])

  return { texture: tex, failed }
}
