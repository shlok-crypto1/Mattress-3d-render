# Mattress 3D Render

Interactive product presentation experience for mattress visualization.

## Project goal
The project presents mattress products through a visual, interactive 3D-oriented experience. The documentation separates product facts, visual rules, interaction behaviour, technical constraints, and AI-agent instructions so the project can be maintained consistently.

## Repository layout

The root holds three different kinds of thing, and two of them look alike. Read
this before deleting anything.

```
index.html  assets/  brand/  textures/  products/  chatbot/  .nojekyll
                    the PUBLISHED SITE - GitHub Pages deploys from the
                    repository root, so this is the live deployment. It is
                    app/dist/ copied up a level. Do not hand-edit; rebuild.
app/        Source code. app/public/ is what the build copies into the set
            above, which is why brand/ and textures/ appear in both places.
information bot/
            The chat bot's authored document, and its source of record. Not
            served: `npm run sync:bot` generates the served copy from it into
            app/public/chatbot/. See docs/ASSET_MANAGEMENT.md.
source/     Source material, never shipped: reference photography, the
            per-grade cutaway renders, supplied logos. Nothing here is
            served or read at runtime.
docs/       What the project is and what has been decided.
guidelines/ Rules the work has to follow.
```

**`brand/` and `textures/` at the root are the deployment, not source material.**
They are byte-identical to their `app/public/` counterparts because they are
those folders, copied up by the publish step. `docs/ASSET_MANAGEMENT.md` used to
describe them as source, which is the kind of mistake that gets a live site
deleted by someone tidying up; `source/` was created on 2026-09-01 so that the
name says which is which.

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
