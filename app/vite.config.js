import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Deployed as a static build under /Mattress-3d-render/catalog/ on GitHub
  // Pages, alongside the standalone Duro index.html at the repo root.
  base: '/Mattress-3d-render/catalog/',
})
