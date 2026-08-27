# Do Not Change

This document protects established project behaviour. It is also the single canonical source for the "never invent" rule — every other document in this repository that mentions not inventing product facts (`CLAUDE.md`, `docs/CONTENT_GUIDELINES.md`, `docs/PRODUCT_CATALOG.md`, `guidelines/DEVELOPMENT_GUIDELINES.md`) points back to this section rather than restating it. If this rule needs to change, change it here first.

## Protected unless explicitly requested
- Overall product-first visual hierarchy.
- Existing 3D presentation and model-loading behaviour.
- Existing navigation and primary user flows.
- Existing product information that has been verified.
- Existing asset references that are required by the deployed experience.
- GitHub Pages deployment compatibility.
- Responsive behaviour that already works.
- Existing interaction states that users rely on.

## AI-agent rule
If a requested change appears to conflict with a protected item, follow the user's explicit request but isolate the change and avoid unrelated modifications.

## Never invent
Do not invent:
- mattress specifications
- dimensions
- material composition
- performance claims
- product names
- prices
- certifications
- technical model properties

Use `TBD` when source information is missing. Record the TBD in `docs/PRODUCT_CATALOG.md`, not just in code comments or UI copy, so it stays visible as an open item.

If a reference image, a prior deployment, or any other artifact appears to supply one of the facts above but conflicts with what's recorded in `docs/PRODUCT_CATALOG.md`, the catalog wins — flag the discrepancy to the user rather than trusting the image. See `docs/PRODUCT_CATALOG.md`'s own precedence note for the full rule.
