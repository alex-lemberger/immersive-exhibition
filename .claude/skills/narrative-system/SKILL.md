---
name: narrative-system
description: Use when evolving the reusable narrative/scene-data model — schema changes, triggers, scene state, transitions, exhibition navigation, optional content editor (M5 narrative system, M6 multi-work). Triggers on "narrative system", "scene graph", "add a trigger type", "state machine", "data model".
---

# Narrative System

Turn the one-off prototype into a reusable structure so the exhibition grows by
**adding data, not rewriting code** (Milestone M5). The contract is
`src/data/schema.ts` — treat it as the spine of the whole project.

## Principles

- **Schema first.** Any new authorable behaviour (a new trigger, a state change,
  a timed cue) becomes a field/type in `schema.ts`, interpreted generically by
  components. If artwork JSON can't express it, it isn't done.
- **Generic rendering.** No `if (artwork === 'pilot')` anywhere. Components read
  the schema; artworks differ only by data.
- **Backward compatible.** New fields optional with sane defaults so existing
  artwork JSON keeps working.

## Likely extensions at M5

- **Trigger types** beyond `click`: wire `gaze` / `proximity` end to end (see
  `add-xr-interaction`) and let JSON choose per node.
- **Scene state / sequencing**: nodes that unlock others, ordered reveals, a
  simple per-artwork state machine. Keep it declarative in JSON.
- **Timed / animation cues**: schema entries that fire layer animations or audio
  at a time or on an event.
- **Transitions & navigation** (M6): an exhibition-level manifest listing
  artworks, order, and transitions; a loader that swaps scenes; visitor-flow
  pacing.
- **Optional editor**: only if hand-authoring JSON becomes the bottleneck.
  Prefer a thin form over the schema, or a CMS (Sanity/Strapi) feeding the same
  types — don't build a bespoke editor early.

## Workflow

1. Express the new behaviour as a schema change first; update types.
2. Implement generic interpretation in the scene components.
3. Migrate `pilot.json` (and others) to exercise it; keep old fields valid.
4. `npm run typecheck` + `npm run build`; verify on screen and device.

## Done means

New capability is authorable purely in JSON, all existing artworks still load,
build passes. The exhibition can gain a work without touching rendering code.
