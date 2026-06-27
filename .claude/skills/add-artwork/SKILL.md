---
name: add-artwork
description: Use when adding a new artwork to the exhibition end to end — creating its JSON scene data, asset folder, layers and story nodes (M2 pilot, M6 multi-work). Triggers on "add an artwork", "new etching", "new scene", "second piece".
---

# Add an Artwork

An artwork is **data, not code**. Adding one = one JSON file + an asset folder.
If you need new rendering behaviour, that belongs in the schema/components, not
a per-artwork special case — see the `narrative-system` skill.

## Steps

1. **Pick an id** (kebab-case, e.g. `the-cartographer`). Used for the folder and
   filename.
2. **Create the asset folder** `public/artworks/<id>/` and add separated layers,
   master, and audio via the `asset-pipeline` skill. Layer image filenames
   should match the layer `id`s you'll use in JSON.
3. **Create `src/data/artworks/<id>.json`** matching the `ArtworkScene` type in
   `src/data/schema.ts`. Copy `pilot.json` as a template. Fill:
   - `title`, `description`, `emotionalTone`
   - `size` — real-world plane size in metres `[w, h]`
   - `layers` — ordered back-to-front, increasing `z`; tune `parallax` for the
     screen build (small values, 0.02–0.16)
   - `storyNodes` — `position` in the artwork's local space, `title`, `body`,
     optional `audio` and `trigger`
   - `ambientAudio`, `narration`
4. **Wire it in.** For a single-artwork build, point the import in `App.tsx` at
   the new file. For multi-artwork (M6), register it in the artwork list /
   navigation (introduced at that phase).
5. **Verify**: `npm run dev`, confirm depth order, story nodes appear and toggle,
   audio fires on a user gesture. Then run `npm run build`. Test on device with
   `deploy-quest`.

## Conventions

- Keep one open story node at a time (the scene already enforces this).
- Don't hardcode artwork specifics in components. New field needed by several
  artworks → add it to `schema.ts` and handle it generically.
- Absolute asset paths under `/artworks/<id>/…`.

## Done means

New artwork renders from its JSON, story interactions work, `npm run build`
passes (quote it), device behaviour stated.
