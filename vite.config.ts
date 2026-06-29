import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// basicSsl serves HTTPS so the Quest 3 browser will allow WebXR over the LAN.
// `npm run host` exposes the dev server on your local network IP.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/immersive-exhibition/' : '/',
  plugins: [react(), basicSsl()],
  server: { host: true },
})
