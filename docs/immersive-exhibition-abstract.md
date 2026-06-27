# Immersive Exhibition Concept

## Abstract

This project transforms traditional etchings and digital illustrations into an immersive, story-driven exhibition. The original artwork remains the visual and narrative anchor; spatial media, animation, sound, and interactive storytelling reveal hidden layers within each piece.

Augmentation is treated as an interpretive medium, not decoration. A viewer encounters a physical etching in the gallery, then puts on a headset and *enters a digital world built from that artwork* — fragments of story, motion, depth, and atmosphere emerge from the image. Linework, texture, figures, and symbolic details become interactive narrative elements. Each artwork behaves like a portal into its own inner world.

The project combines artistic production, digital asset preparation, immersive interface design, and narrative system development. It grows in phases: a single-artwork prototype first, expanding toward a complete multi-work exhibition.

## Experience Model (Resolved)

This is the decision that drives all hardware, software, and roadmap choices. It is fixed:

**Physical-print-anchored VR — *not* AR.**

- The original etching is **physically exhibited** on the wall. It is the anchor object that draws the viewer in.
- The augmented experience is **fully digital VR**, rendered directly by the headset. The viewer enters a digital scene built from the artwork's layers.
- The headset does **not** look at the physical print through passthrough cameras.

Why this matters: passthrough on consumer headsets uses low-resolution, distorted camera feeds. Viewing a real etching *through* passthrough would destroy exactly the fine linework, edge definition, and tonal detail this project depends on. By making the in-headset experience fully digital, the headset renders crisp, authored content — and the physical print stays pristine on the wall beside it. The two reinforce each other: physical original as anchor, digital world as interpretation.

A note on expectations: a headset does **not** out-resolve a good print or 4K screen for fine detail (angular resolution ~25 px/degree). The headset's value is **depth, space, emergence, and immersion** — not finer line than reality. The narrative design leans into motion, depth, and atmosphere accordingly.

## Hardware

- **Meta Quest 3 (512GB)** — standalone, strong optics for the price, full WebXR support. The VR-digital model removes the earlier passthrough concern, so Quest 3 is the correct prototype device. 512GB because layered art assets are large.
- **Elite strap with battery** — exhibition visitors wear the headset for minutes at a time; comfort is essential, not optional.
- **Link cable** — faster dev iteration (or wireless `adb` / WebXR over Wi-Fi).
- **Carrying case** — transport and on-site testing.

Deferred until Phase 6/7: additional headsets, kiosk hardware. Not now: Apple Vision Pro, XREAL, Magic Leap. Estimated initial spend ~€650–750.

Alternative devices (for a later high-end phase only):
- **Apple Vision Pro** — strongest presentation quality, expensive, Apple-locked. A possible premium final-exhibition upgrade, not a prototype device.
- **XREAL-style glasses** — lightweight display experiments only; weak for full spatial interactive scenes.
- **Magic Leap / enterprise AR** — conceptually close to true AR, but costly and impractical for an independent prototype, and unnecessary given the VR-digital model.

## Software Stack

One codebase runs in the browser **and** on the Quest 3 via WebXR. No second engine. This leverages existing React skills and a Cinema 4D / After Effects asset pipeline; Unity/C# is intentionally avoided.

| Layer | Tool | Role |
|---|---|---|
| Web + headset runtime | **React + react-three-fiber (R3F)** | Three.js as React components. Same app runs in browser and Quest 3. |
| VR / XR | **@react-three/xr** | Headset, controllers, hands, gaze, spatial interaction. |
| Scene helpers | **@react-three/drei** | Loaders, parallax, depth, postprocessing. |
| 3D asset creation | **Cinema 4D** | Depth/displacement from etching layers, animated marks and figures, rendering. |
| 2.5D motion | **After Effects** | Parallax passes, subtle mark animation (image sequences or Lottie). |
| Export formats | **glTF/GLB** (3D), **WebP/PNG sequences** (2.5D), **Lottie** (vector) | Web-native, loads in Three.js. |
| Audio | **Howler.js / Web Audio** | Spatial ambient and narration. |
| Narrative data | **JSON scene graph** first, CMS (Sanity/Strapi) later | Avoid building an editor early; JSON files first. |
| Hosting | **Vercel / Netlify** | Static, free tier. |

**Why not Unity:** a native Quest build gains ~10% performance at the cost of months learning C#/an engine and maintaining a separate pipeline. R3F handles layered-art scenes comfortably. Revisit only if WebXR performance actually blocks the work.

**Known pipeline risk:** glTF export directly from Cinema 4D is workable but rough. Cleanest path is often **C4D → Blender → glTF**, or render depth maps and use displacement in Three.js. This is de-risked in Milestone 0 *before* any art investment.

## Roadmap

Estimates assume part-time work, ~2 people. Each milestone ends at a **gate** — a decision point before committing further resources.

### M0 — Setup & risk-kill (week 1–2)
- Buy Quest 3, enable developer mode, load a "hello WebXR" R3F scene onto the device.
- **Critical de-risk:** push one Cinema 4D–rendered layered etching through the full pipeline (C4D → glTF → Three.js → viewed in Quest).
- **Gate:** does the pipeline work end-to-end? If glTF export fights back, switch to the depth-map / 2.5D approach now, before producing art.

### M1 — Pilot artwork & narrative (week 2–4)
- Select one etching. Map visual motifs → story fragments → spatial layers → emotional tone.
- **Deliverables:** selected pilot artwork, one-page narrative concept, visual motif map, draft JSON scene-data schema, technical feasibility notes.

### M2 — Digital preparation (week 3–6)
- High-resolution scan/photography, cleanup, color and contrast correction.
- Separate into layers: background, foreground, figures, textures, symbols, atmosphere.
- Cinema 4D: build depth, animate 2–3 marks. After Effects: parallax passes.
- **Deliverables:** high-resolution digital master, layered asset files, animation-ready elements, artwork and story metadata.

### M3 — Web interactive prototype (week 5–9) — *first real milestone*
- R3F scene in the browser: parallax depth from layers, subtle mark/figure animation, hover/click story fragments, ambient sound, one narration line, responsive exhibition page.
- **Deliverables:** browser prototype at a public URL, one interactive artwork scene, basic story-interaction model.
- **Gate:** does the interpretive emergence land for viewers *on a screen*? Fix the story here — it is cheap. Do not move to headset until the narrative works.

### M4 — Immersive VR prototype (week 9–13) — *validation milestone*
- Add `@react-three/xr`: the same scene in Quest 3, with gaze/hand-triggered interactions, 3D-placed story elements, spatialized audio, basic exhibition navigation.
- **Deliverables:** headset-compatible prototype, one complete augmented artwork experience, interaction and hardware/comfort evaluation.
- **Gate:** does the headset version beat the web version by enough to justify it? Test honestly. If not, a web-based exhibition is the product — proceed to a web variant of M7.

### M5 — Narrative system (week 13–18)
- Refactor the one-off into reusable parts: scene / trigger / state components, an artwork-and-story data model. JSON-driven so each new artwork is data + assets, not new code.
- **Deliverables:** artwork and story data model, scene and trigger structure, reusable interaction components. Optional editor interface — deferred unless clearly needed.

### M6 — Multi-artwork exhibition (week 18–28)
- Run 3–5 works through the same system. Shared visual and audio language, transitions, pacing, visitor flow.
- **Deliverables:** multiple immersive artwork scenes, exhibition navigation, shared visual/audio language, complete visitor-journey draft.

### M7 — Physical / public exhibition (week 28+)
- Physical prints on walls plus Quest stations. Decide headset count, hygiene, charging, onboarding, and a guided/kiosk mode so visitors cannot break the experience.
- Technical focus: stability, onboarding, hardware setup, repeatable presentation conditions.
- **Deliverables:** deployable exhibition build, installation plan, visitor instructions, documentation and presentation materials.

## Long-Term Vision

An expandable immersive archive: each artwork holds its own visual world, story fragments, and interactive behavior. The project may eventually include a web platform for cataloging works, a scene editor, and a public web exhibition mode — built only after M7 proves demand.

The result is both an artistic experiment and a technical framework: a way to turn static visual works into layered, spatial, story-driven experiences without losing the integrity of the original artwork.
