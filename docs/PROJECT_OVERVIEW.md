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

### Response headers - `app/public/.htaccess`
Hostinger serves the site with LiteSpeed, which reads `.htaccess`. The file is
authored in `app/public/` and deployed with the rest of the build, so it is the
single place the server's behaviour is set:

- **HTTPS redirect**, the same rule hPanel's "Force HTTPS" writes. It is carried
  here because uploading this file replaces any `.htaccess` already in
  `/public_html/`, including one hPanel wrote. **If a setting in hPanel ever
  writes to `.htaccess`, copy what it added into `app/public/.htaccess`**, or the
  next deploy removes it.
- **Caching.** Hashed build output (`assets/*-<hash>.js|css|woff2`) is cached for
  a year as `immutable`; `index.html` is `no-cache`, so a deploy is seen on the
  next visit. Unhashed files (`brand/`, `textures/`, `products/`) keep the host's
  7-day default, because their names do not change when their contents do.
- **Security.**
  - Content-Security-Policy: every resource from this origin only. Scripts get no
    inline allowance. Styles do (`'unsafe-inline'`), because React renders
    `<style>` elements and style attributes. `object-src 'none'`,
    `frame-ancestors 'none'`.
  - HSTS for one year, without `includeSubDomains`/`preload` until the domain's
    other subdomains are known to serve HTTPS.
  - COOP `same-origin`, `X-Frame-Options: DENY`, `nosniff`,
    `strict-origin-when-cross-origin` and a Permissions-Policy denying camera,
    microphone, geolocation, payment and USB.
- **Not set, deliberately: Trusted Types.** React and three.js have not been
  audited against it, and a violation would take the 3D viewers down.

The CSP means **a new third-party resource (an analytics tag, a font service,
an embed) will be blocked until its origin is added to the policy.** That is the
point of it - add the origin to the directive it needs, not a wildcard.

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
