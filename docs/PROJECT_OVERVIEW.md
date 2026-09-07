# Project Overview

## Product
Mattress 3D Render is an interactive web experience for presenting mattress products through 3D visualization.

## Current deployment
Published to Hostinger, on the domain:
https://myfoamico.com/

`.github/workflows/deploy.yml` uploads the site over FTPS on every push to
`main`, into `/public_html/`, which is the document root the domain serves.
It deploys the repository root - which is kept as a mirror of `app/dist/` -
and excludes everything that is repository-only, so only the built site
reaches the web server.

Because the site is served from the domain root rather than a subdirectory,
the Vite base path is `/` (see `app/vite.config.js`).

GitHub Pages still builds the repository at
`shlok-crypto1.github.io/Mattress-3d-render/`, but that URL no longer works:
a project site is published under the repository name, and the base path is
now `/`. Treat the domain as the only deployment.

## Core system areas
The project should be understood as five connected layers:

1. **Product data** — names, specifications, variants and labels.
2. **3D assets** — models, materials, textures and related resources.
3. **Rendering** — camera, lighting, materials and scene composition.
4. **Interaction** — rotation, zoom, selection, layer/model states and UI controls.
5. **Presentation** — layout, typography, responsive behaviour and content.

## Architecture rule
Keep these responsibilities conceptually separate even when the implementation uses a compact component structure.

## Current unknowns
The following should be confirmed from the source repository before being treated as factual:
- Framework/runtime
- 3D engine/library
- Model formats
- Exact product catalogue
- Exact interaction inventory
- Exact breakpoint values
- Exact font and colour tokens
