# CLAUDE.md — Mattress 3D Render

## Purpose
This file is the operating instruction for AI coding agents working on the Mattress 3D Render project.

## Before making changes
1. Read `guidelines/DEVELOPMENT_GUIDELINES.md`.
2. Read `guidelines/DESIGN_GUIDELINES.md`.
3. Read `guidelines/DO_NOT_CHANGE.md`.
4. Read the relevant file in `docs/` for the subsystem being changed.
5. Inspect the existing implementation before introducing a new pattern.

## Non-negotiable behaviour
- Preserve the existing visual language unless the user explicitly requests a redesign.
- Do not remove working interactions, assets, sections, or states unless explicitly instructed.
- Do not rename assets or product identifiers casually; update `docs/ASSET_MANAGEMENT.md` when identifiers change.
- Keep 3D presentation consistent across products and breakpoints.
- Avoid unnecessary dependencies.
- Prefer small, isolated changes over broad rewrites.
- Never invent product facts. This rule, and what counts as a product fact, is defined in `guidelines/DO_NOT_CHANGE.md` — that file is the single source for this rule; do not restate or vary it elsewhere.

## Documentation rule
When a change materially affects architecture, product data, interactions, assets, responsive behaviour, performance, or design rules, update the relevant Markdown document in the same change.

## Validation
After implementation:
- Check the primary desktop experience.
- Check mobile and narrow viewport behaviour.
- Check 3D loading and interaction states.
- Check that existing navigation and controls still work.
- Check browser console for new errors.
- Check asset paths and deployment paths.

## Source of truth
The deployed site is a presentation artifact, not the sole source of project intent. Use the source code and these documents together. Product facts specifically are governed by `docs/PRODUCT_CATALOG.md` — see that file's precedence rule when the deployed site or a reference image appears to disagree with it.
