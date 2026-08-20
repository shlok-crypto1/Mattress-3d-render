import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Deployed as the root of the GitHub Pages site (Mattress-3d-render is a
  // project site, so it's served under /Mattress-3d-render/, not the domain
  // root). The catalog is now the site's landing page.
  base: '/Mattress-3d-render/',
})
