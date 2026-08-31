import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The site is deployed to two hosts that disagree about where it lives, so
  // the base path is the one thing that has to differ between them.
  //
  // GitHub Pages serves it from /Mattress-3d-render/ because a project site is
  // always under the repo name, never the domain root - that is the default
  // here, so a plain `npm run build` still produces exactly the bundle the
  // repo root is checked in as. Vercel serves it from the domain root and sets
  // VITE_BASE=/ in vercel.json.
  //
  // Nothing else needs to know: every public/ asset goes through publicUrl(),
  // which resolves against import.meta.env.BASE_URL, and the router is
  // hash-based so the document path never moves off the base.
  base: process.env.VITE_BASE ?? '/Mattress-3d-render/',
})
