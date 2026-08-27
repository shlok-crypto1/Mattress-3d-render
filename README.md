# Mattress 3D Render

Interactive product presentation experience for mattress visualization.

## Project goal
The project presents mattress products through a visual, interactive 3D-oriented experience. The documentation separates product facts, visual rules, interaction behaviour, technical constraints, and AI-agent instructions so the project can be maintained consistently.

## Documentation map

- `CLAUDE.md` — AI coding-agent operating rules. Read this first, always.
- `guidelines/DEVELOPMENT_GUIDELINES.md` — implementation and architecture rules.
- `guidelines/DESIGN_GUIDELINES.md` — visual design rules and brand tokens.
- `guidelines/DO_NOT_CHANGE.md` — protected behaviour, elements, and the invent-nothing rule.
- `docs/PROJECT_OVERVIEW.md` — product and technical overview.
- `docs/PRODUCT_CATALOG.md` — verified product data (the only source for product facts).
- `docs/3D_RENDER_GUIDELINES.md` — 3D presentation rules.
- `docs/MATERIALS_AND_TEXTURES.md` — material and texture rules (the only source for material-realism rules).
- `docs/CAMERA_AND_LIGHTING.md` — camera and lighting standards.
- `docs/INTERACTIONS.md` — interaction states and behaviour, including animation principles.
- `docs/RESPONSIVE_BEHAVIOUR.md` — viewport rules.
- `docs/PERFORMANCE.md` — performance requirements.
- `docs/ASSET_MANAGEMENT.md` — asset naming and storage.
- `docs/CONTENT_GUIDELINES.md` — product/content rules.
- `docs/CHANGELOG.md` — project change history.

Each rule above lives in exactly one file. If you find the same rule stated in two places, that's a documentation bug — consolidate it into whichever file this map lists as its owner and leave a pointer behind, not a second copy.

## Important
The deployed page is available at:
https://shlok-crypto1.github.io/Mattress-3d-render/

The published page should be treated as a reference for the current visual/interaction result. The source repository remains the implementation source of truth.

## Updating this project
Before changing anything, read `CLAUDE.md` — it defines the full process and non-negotiable rules for this repository. Do not skip it and work from this README alone.
