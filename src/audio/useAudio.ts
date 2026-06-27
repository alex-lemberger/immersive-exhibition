import { Howl } from 'howler'

// Minimal audio layer. Browsers block autoplay, so ambient is started from a
// user gesture (the Enter VR button). Expand into spatial audio at M4.

let ambient: Howl | null = null

export function playAmbient(url?: string): void {
  if (!url || ambient) return
  ambient = new Howl({ src: [url], loop: true, volume: 0.5, html5: true })
  ambient.play()
}

export function stopAmbient(): void {
  ambient?.stop()
  ambient = null
}

export function playOnce(url?: string): void {
  if (!url) return
  new Howl({ src: [url], volume: 1 }).play()
}
