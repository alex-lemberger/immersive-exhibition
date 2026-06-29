// Scene-data model for an artwork. This is the contract the whole exhibition
// is built on (see Phase 5 / Milestone M5). New artworks are *data*, not new
// code — add a JSON file matching `ArtworkScene` under `src/data/artworks/`.

export type Vec3 = [number, number, number]

export type TriggerKind = 'click' | 'gaze' | 'proximity'

export type ActivationKind = 'wetline' | 'softLensLinework'

export interface SoftLensConfigInput {
  /** Circular activation radius in layer UV units. */
  activationRadius?: number
  /** Seconds of stillness needed for mature line behavior. */
  activationBuildTime?: number
  /** Seconds for local activation to dry after movement resumes. */
  activationDecayTime?: number
  /** Overall effect strength, 0..1. */
  activationStrength?: number
  /** Luminance cutoff below which pixels count as etched linework. */
  lineThreshold?: number
  /** UV displacement amplitude for activated line micro-floating. */
  floatStrength?: number
  /** Ink-only brightness exchange amplitude for activated lines. */
  intensityWaveStrength?: number
}

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
  /** Optional depth map (path under /public) from the asset pipeline. When set,
   *  the layer is rendered by `DepthLayer`: the plane is displaced by the depth
   *  map and animated procedurally instead of staying flat. */
  depth?: string
  /** Displacement scale in world units for a depth layer. Default 0.1. */
  displace?: number
  /** Procedural drift amplitude for a depth layer's GLSL motion. Default 0. */
  drift?: number
  /** Always-on ambient motion (orbs drift, figures sway, linework breathes). */
  motion?: LayerMotion
  /** Marks this layer as a "reacher" — it translates by `offset * reachT`,
   *  where reachT is the scene's reach driver (breath + viewer + The Reach
   *  node). Used to animate the gesture across the gulf. */
  reach?: { offset: Vec3 }
  /** Optional interaction behavior for this layer. */
  activation?: ActivationKind
  /** Parameters for `activation: "softLensLinework"`. */
  softLens?: SoftLensConfigInput
}

export interface LayerMotion {
  /** Horizontal float amplitude (world units). */
  floatX?: number
  /** Vertical float amplitude (world units). */
  floatY?: number
  /** Z-axis rotation amplitude (radians). */
  sway?: number
  /** Oscillation speed multiplier. Default 1. */
  speed?: number
  /** Phase offset so layers desync. */
  phase?: number
  /** Opacity breathing depth, 0..1. */
  breathe?: number
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
