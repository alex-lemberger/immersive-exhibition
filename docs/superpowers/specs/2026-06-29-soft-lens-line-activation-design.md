# Soft Lens Line Activation Design

Date: 2026-06-29
Status: Approved direction, not yet implemented

## Purpose

The current "wet hand" prototype proves that mouse-driven activation can affect
the artwork, but its artistic language is too broad: it treats a layer as a
panel that glows. The next prototype should make the viewer feel that the
etching itself is alive.

The intended interaction is inspection-led. The viewer pans and zooms across the
etching. When they pause over an area, that local part of the drawing starts to
wake up. The behavior is circular and area-based, but the visible performance
comes from the etched marks inside the area, not from a UI-like circle.

## Artistic Direction

The effect is **local, ink-only, surreal, and line-aware**.

- Local: activation happens around the paused pointer or gaze position.
- Ink-only: no blue glow, rainbow wash, or decorative color effect.
- Surreal: linework floats, breathes, and changes intensity in an impossible
  but restrained way.
- Line-aware: dark etched strokes and hatching react strongly; blank paper
  reacts weakly or not at all.

The viewer should feel that careful looking applies pressure to the print. The
more still the viewer becomes, the more the marks loosen from the paper.

## Interaction Loop

1. The viewer pans and zooms over the full etching.
2. Movement leaves only a faint wake, so the artwork does not feel inert while
   exploring.
3. When movement slows, a pressure build begins.
4. During the pressure build, a faint soft circular lens is visible. This teaches
   where the activation field is without becoming the main visual event.
5. If the viewer keeps still, the lens fades away and the linework inside it
   becomes active.
6. Active linework simultaneously exchanges intensity and micro-floats.
7. When the viewer moves away, the local effect dries back over roughly 2-4
   seconds.

## Visual Behavior

### Soft Lens

The lens is a circular field centered on the current pointer or gaze position.
Its edge must be feathered. It should appear during the pressure-build phase and
then fade out once the linework is clearly active.

The lens should not read as a permanent interface overlay. It is an initial
pressure trace.

### Line Intensity Exchange

Inside the active area, dark lines should trade intensity in slow waves. The
effect should resemble ink moving between etched strokes, not a uniform opacity
pulse over the whole layer.

Blank paper should stay mostly stable. If the whole texture brightens evenly,
the implementation is failing the artistic goal.

### Micro-Floating

Activated marks should appear to loosen slightly from the surface. In the first
implementation this can be a shader displacement or UV offset tied to dark
texture regions. Later versions can use depth maps or generated line masks for
more precise motion.

The motion must be small. The artwork should feel unstable and alive, not like a
rubber image distortion.

### Zoom Response

Zoom level affects detail. From far away, the activation reads as a gentle local
breathing of the drawing. Close up, smaller hatching marks become more unstable:
their intensity exchange and floating are easier to see.

Zoom should add detail and sensitivity, not simply multiply brightness.

## Technical Direction

The next implementation should replace the current layer-wide emissive
activation with a material that can evaluate:

- pointer or gaze position in layer UV space,
- current movement speed,
- dwell or stillness duration,
- zoom/detail factor,
- texture luminance or a line mask,
- activation decay for drying trails.

The first prototype can derive line awareness directly from the source texture:
dark pixels receive stronger activation than light pixels. A later asset-pipeline
step can generate explicit line masks or depth maps when the visual language is
validated.

## Data Model

Keep the artwork system data-driven. Add layer behavior through schema fields
rather than per-artwork components.

Suggested layer fields:

- `activation: "softLensLinework"`
- `activationRadius`
- `activationBuildTime`
- `activationDecayTime`
- `activationStrength`
- `lineThreshold`
- `floatStrength`
- `intensityWaveStrength`

Exact field names can be refined during implementation, but the behavior must
remain configurable per layer.

## Scope For First Prototype

The first implementation should target the existing `reaching` artwork and its
current WebP layers.

Included:

- browser mouse/pointer pan and zoom activation,
- local circular activation field,
- pressure build from stillness,
- faint movement wake,
- line-aware ink-only intensity exchange,
- small local floating or UV displacement,
- drying decay after movement resumes.

Not included yet:

- Quest gaze/controller input,
- generated depth maps,
- generated SVG line art,
- audio,
- authored narrative zones,
- multi-artwork behavior.

## Success Criteria

The prototype is successful when:

- pausing over an area feels meaningfully different from moving over it,
- the active region is local and circular,
- blank paper does not activate like dark linework,
- the effect stays black/white/ink-toned,
- zooming in reveals more detailed mark behavior,
- the viewer can describe the drawing as becoming alive, not merely glowing.

## Risks

- Texture-only luminance may be too crude for clean line isolation.
- WebP alpha layers may complicate UV-space activation if layer placement is not
  aligned with the full artwork.
- Over-strong displacement can make the etching feel like a generic liquid
  shader.
- Too-visible lens graphics can turn the experience into a UI effect instead of
  an artwork behavior.

## Verification Plan

- Run `npm run build` before claiming implementation done.
- Manually verify the browser interaction because build success cannot prove the
  artistic effect works.
- Compare paused, moving, far-zoom, and close-zoom states.
- Confirm missing assets still fall back safely and do not crash the scene.
