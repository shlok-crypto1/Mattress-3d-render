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
- Avoid unnecessary React/component re-renders if applicable.

## Loading
- Show a useful loading state.
- Prioritize the first meaningful product render.
- Avoid blocking the whole interface on secondary assets.

## Validation
Check performance on both a modern desktop and a representative mobile device before large rendering changes are accepted.
