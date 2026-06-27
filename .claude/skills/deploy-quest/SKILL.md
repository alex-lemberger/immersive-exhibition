---
name: deploy-quest
description: Use when loading and testing a build on the Meta Quest 3 over WebXR, or shipping the exhibition build (M0 setup, M4 testing, M7 installation). Triggers on "test on Quest", "run on headset", "WebXR won't start", "deploy exhibition", "Enter VR does nothing".
---

# Deploy & Test on Quest 3

WebXR behaviour cannot be validated from a desktop build — it must run on the
headset. This skill covers dev testing and exhibition install.

## Dev testing (LAN, fastest loop)

1. `npm run host` — serves on your machine's LAN IP over HTTPS (self-signed via
   `@vitejs/plugin-basic-ssl`).
2. Find the IP from Vite's "Network" line (e.g. `https://192.168.1.50:5173`).
3. Quest and computer on the **same Wi-Fi**. In the Quest browser open that
   HTTPS URL and **accept the certificate warning** (one-time per session).
4. Press **Enter VR**. WebXR requires the secure context + a user gesture — both
   are already wired.

## If "Enter VR" does nothing

- Not HTTPS / cert not accepted → WebXR is blocked. Re-check the cert page.
- Opened `http://` or a `localhost` URL from the Quest → use the LAN HTTPS URL.
- Browser not updated, or VR permission denied → update Quest browser, allow.
- Check the browser console (enable remote debugging: `chrome://inspect` with
  the Quest connected via USB and developer mode on).

## USB / device dev mode (M0)

- Enable **Developer Mode** in the Meta Horizon app, connect USB, allow debugging
  on the headset.
- Use `adb devices` to confirm, `chrome://inspect` to see console/network and
  profile performance.

## Performance checks on device

- Target 72–90 fps. Watch for dropped frames on heavy transparency / large
  textures (downscale via `asset-pipeline`).
- Confirm depth order, alpha, story-node selection, and audio all behave as on
  screen — they don't always.

## Exhibition install (M7)

- Build: `npm run build`; serve `dist/` from a stable local box or host
  (Vercel/Netlify) reachable by the headsets.
- Add a kiosk/guided mode so visitors can't navigate out or break state.
- Plan charging, hygiene (face covers), onboarding, and a reset-between-visitors
  flow.

## Done means

The experience actually ran on the Quest 3 — state what you observed (fps,
interactions, audio), not just that the build compiled.
