# Performance

## Goals
3D content is typically the largest performance cost in this project. Performance work should protect visual quality while reducing unnecessary GPU, CPU, network and memory usage.

## Assets
- Compress models where quality permits.
- Compress textures appropriately.
- Avoid loading unused product assets.
- Prefer lazy loading for non-critical content.

## Runtime
- Avoid unnecessary per-frame calculations.
- **Never read layout from inside a render loop.** `getBoundingClientRect` and
  `offsetWidth` are the two that catch you, and reading either after writing a
  style forces the browser to lay the page out on the spot. Measure on resize,
  cache, and let the loop write only — the reasoning and the case that produced
  the rule are in `docs/INTERACTIONS.md` § Animation.
- Reuse materials and resources where appropriate.
- Dispose of resources when no longer needed.
- **Give the drawing context back, not just the objects in it.**
  `renderer.dispose()` frees what three.js allocated; it does not hand back the
  WebGL context, and a browser allows only so many live contexts per page -
  Chrome around sixteen. A viewer that is unmounted must therefore also call
  `renderer.forceContextLoss()`. Until 2026-09-07 the mattress viewer did not,
  so every product opened held one more context and gave none back: five
  mattresses left five live contexts, and a session long enough to pass the
  limit made **every** product page fail to start - reported as "this mattress
  could not be displayed", on laptops, where a real driver enforces the cap and
  a browsing session is long. Measured before and after: five products left five
  live contexts, and now leave one.
- **A lost context is a normal event, not a fault.** Laptops lose them for
  ordinary reasons - a driver reset, waking from sleep, switching between an
  integrated and a discrete GPU, the GPU process restarting. Handle
  `webglcontextlost`, call `preventDefault()` on it (without that the browser
  makes the loss permanent) and rebuild; do not leave a canvas that will never
  draw again.
- Avoid unnecessary React/component re-renders if applicable.

## Loading
- Show a useful loading state.
- Prioritize the first meaningful product render.
- Avoid blocking the whole interface on secondary assets.

## First paint of the brand selector
Measured with Lighthouse 13 (desktop) on 2026-09-25: LCP 0.8 s → 0.4 s, page
weight 291 → 164 KiB, all four categories at 100. What holds that in place:

- **Fonts are self-hosted** (`app/src/fonts/`). Google Fonts used to put a
  cross-origin stylesheet, and then a font on a third origin, in front of the
  first paint. The files are Google's own, with every subset and its
  `unicode-range` unchanged, so rendering is identical and a browser still
  downloads only the subsets a page uses. The build hashes them, so they are
  cached as immutable. Only Poppins 400 (latin), the one face the selector sets
  text in, is preloaded.
- **Both logos are preloaded from `app/index.html`.** They are `<img>`s React
  renders, so the browser cannot discover them until the script has run; the
  preload lets it fetch them alongside the script instead of after it. They also
  carry `fetchpriority="high"` and never take `loading="lazy"`.
- **Logos are WebP, sized per screen density** - see `docs/ASSET_MANAGEMENT.md`
  for the files. The preload and the `srcset` must name the same candidates.
- **Every `<img>` states its intrinsic `width`/`height`**, with the rendered
  height still set in CSS. The box is reserved before the file arrives; CLS is 0.
- **Nothing that is not visible should load a font weight.** A heading defaults
  to bold, and even a visually hidden one makes the browser fetch a bold face -
  which is why the selector's hidden `<h1>` is set at 400.

What remains open in the audit, deliberately: about 34 KiB of the entry
chunk is React and the router, unused on a first paint but needed by the first
interaction; the 3.7 KiB stylesheet is render-blocking because it is the page's
styles; unhashed images keep a 7-day cache.

## Validation
Check performance on both a modern desktop and a representative mobile device before large rendering changes are accepted.
