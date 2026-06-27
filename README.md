# Immersive Etchings

Physical-print-anchored VR exhibition. Each etching hangs physically on the
wall; in the headset the viewer enters a fully **digital** world built from that
artwork's layers. One codebase runs in the browser and on the Meta Quest 3 via
WebXR. See [`docs/immersive-exhibition-abstract.md`](docs/immersive-exhibition-abstract.md)
for concept, hardware, and the M0–M7 roadmap.

## Stack

React + [react-three-fiber](https://github.com/pmndrs/react-three-fiber) ·
[@react-three/xr](https://github.com/pmndrs/xr) ·
[drei](https://github.com/pmndrs/drei) · Vite · Howler. Assets authored in
Cinema 4D / After Effects, exported to glTF / WebP / Lottie.

## Run

```bash
npm install
npm run dev        # browser, localhost (HTTPS)
npm run host       # expose on LAN IP for the Quest 3 browser
npm run build      # typecheck + production build
```

WebXR needs a secure context — the dev server uses a self-signed cert
(`@vitejs/plugin-basic-ssl`). On the Quest, open `https://<your-LAN-ip>:5173`
and accept the certificate warning, then press **Enter VR**.

## Layout

```
docs/                          concept + roadmap
src/
  data/schema.ts               ArtworkScene data model (the exhibition contract)
  data/artworks/*.json         one file per artwork (data, not code)
  scene/ArtworkScene.tsx       assembles layers + story nodes
  scene/Layer.tsx              depth/parallax layer (graceful missing-asset fallback)
  scene/StoryNode.tsx          interactive story fragment
  audio/useAudio.ts            ambient + one-shot narration
  App.tsx                      Canvas, XR store, Enter VR
public/artworks/<id>/          layer images, master, audio per artwork
.claude/skills/                workflow skills (asset pipeline, add artwork, …)
```

## Adding an artwork

Drop separated layers + audio in `public/artworks/<id>/`, add `src/data/artworks/<id>.json`
matching `ArtworkScene`, point `App.tsx` at it. The `add-artwork` skill walks
this end to end.
