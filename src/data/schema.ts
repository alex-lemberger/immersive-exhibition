// Scene-data model for an artwork. This is the contract the whole exhibition
// is built on (see Phase 5 / Milestone M5). New artworks are *data*, not new
// code — add a JSON file matching `ArtworkScene` under `src/data/artworks/`.

export type Vec3 = [number, number, number]

export type TriggerKind = 'click' | 'gaze' | 'proximity'

/** One depth layer of the artwork (background, figures, symbols, …). */
export interface ArtworkLayer {
  id: string
  /** Path under /public, e.g. "/artworks/pilot/figures.png". Missing files
   *  render as a flat colour so a scene is viewable before art exists. */
  texture: string
  /** Depth offset in world units. Negative = further away. */
  z: number
  /** Screen-mode parallax strength (head movement drives depth in VR). */
  parallax?: number
  opacity?: number
}

/** An interactive fragment of story anchored in the artwork's space. */
export interface StoryNode {
  id: string
  position: Vec3
  title: string
  body: string
  /** How the node is activated. Default: 'click'. */
  trigger?: TriggerKind
  /** Optional narration clip, path under /public. */
  audio?: string
}

/** A complete augmented artwork experience. */
export interface ArtworkScene {
  id: string
  title: string
  description: string
  emotionalTone?: string
  /** Hi-res digital master, path under /public (reference / catalog use). */
  master: string
  /** World size of the artwork plane [width, height] in metres. */
  size: [number, number]
  layers: ArtworkLayer[]
  storyNodes: StoryNode[]
  /** Looping ambient bed, path under /public. */
  ambientAudio?: string
  /** Opening narration, path under /public. */
  narration?: string
}
