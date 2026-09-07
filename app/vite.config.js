import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The site is served from the root of myfoamico.com, so the base path is `/`.
  //
  // It used to be /Mattress-3d-render/ because a GitHub Pages project site is
  // always published under the repo name. A custom domain moves it to the
  // domain root instead, so the repo-name prefix would now be one directory
  // too deep. VITE_BASE stays available as an override for anywhere the site
  // is served from a subdirectory again.
  //
  // Nothing else needs to know: every public/ asset goes through publicUrl(),
  // which resolves against import.meta.env.BASE_URL, and the router is
  // hash-based so the document path never moves off the base.
  base: process.env.VITE_BASE ?? '/',
})
