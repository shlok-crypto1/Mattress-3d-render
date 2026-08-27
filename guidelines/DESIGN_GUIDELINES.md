# Design Guidelines

## Design objective
The experience should feel like a premium product visualization tool rather than a generic dashboard or technical demo.

## Principles
1. Product visualization is the primary visual priority.
2. UI should support the mattress rather than compete with it.
3. Maintain strong visual hierarchy and generous whitespace.
4. Use consistent typography, spacing, controls, and interaction states.
5. Avoid decorative UI that does not improve product comprehension.
6. Motion should communicate state or add useful spatial feedback — general animation principles are owned by `docs/INTERACTIONS.md`; this file only adds that motion must also reinforce the brand's premium/restrained character (see Section on brand tokens above), not just function correctly.

## Brand tokens

These are the fixed values for both brands presented by this project. Do not introduce new colors, fonts, or values outside this table without an explicit design-change request — see the Changes section below for how to record any approved addition.

### FOAMICO

| Token | Value | Usage |
|---|---|---|
| Kiwi Green | `#95C12B` | Primary accent — headers, active states, CTAs, selection indicators, chart series |
| Avocado Green | `#3F5E12` | Secondary/darker accent variant, used sparingly |
| Key Black | `#1A1A1A` | Primary dark background/surface. Never pure `#000000`. |
| Egg White | `#FEFEFE` | Text/elements on dark backgrounds |
| Sand | `#9D9E9E` | Secondary text on dark backgrounds |
| Wordmark | FOAMICO logo lockup, `app/public/brand/foamico-logo{,-light}.png`. The lockup already contains the words "FOAMICO / LUXURY MATTRESS" | Header, branding |

### VedaSleep

| Token | Value | Usage |
|---|---|---|
| Veda Gold | `#C77D11` | The one color exclusive to VedaSleep — headers, kickers, active states, CTAs, highlight chips. Reserved: never use on FOAMICO material, never use for anything unrelated to VedaSleep. |
| Paper | `#F7F5F0` | Light background/surface option. Warmed from `#F6F8F1` on 2026-08-27 at the product owner's request; it is one token, so the card grid, the product pages, the page ground, the route-loading holding screen and the VedaSleep panel on the brand selector all carry the same value and cannot drift apart. |
| Egg White | `#FEFEFE` | Light background/surface option (alt) |
| Key Black | `#1A1A1A` | Primary text on light backgrounds |
| Slate Grey | `#6B6B6B` | Secondary/body text on light backgrounds |
| Light Grey | `#DDDDDD` | Borders, hairlines |
| Wordmark | VedaSleep lotus lockup, `app/public/brand/vedasleep-logo.png`. The lockup already contains the word "VEDASLEEP" | Header, branding — recorded in `docs/ASSET_MANAGEMENT.md` |

### Shared / reserved comparison colors

| Token | Value | Usage |
|---|---|---|
| Compare Purple | `#6A4C93` | Reserved for competitor-coding in comparison charts ONLY — not a general-purpose color for either brand |

### Typography (both brands)

| Role | Font | Notes |
|---|---|---|
| Headlines / product names | Montserrat ExtraBold (800) | Often set in ALL CAPS |
| Subheads / kickers | Montserrat Bold/SemiBold | Set in the active brand's accent color |
| Body copy | Poppins Regular (400) | ~11pt equivalent, generous line-height |
| Office/document fallback | Calibri (body), Montserrat (headings if embeddable), Arial (last resort) | For docx/pptx/xlsx exports outside the web experience |

### Brand-mixing rule

Never combine Kiwi Green and Veda Gold as accents on the same screen or section. Each brand's grid, product page, and any comparison view involving only that brand must use only that brand's accent. A view that intentionally compares both brands (if one is ever built) should treat this as an explicit exception and state so in the component's own documentation.

### Brand-mark rule

Both brands' marks are **lockups that already contain the brand name**. Do not set
a text wordmark beside or beneath either one, and do not add a positioning tagline
under it — the mark says the name, and repeating it in type says it twice. The
Positioning values in `docs/PRODUCT_CATALOG.md` describe each brand; they are not
UI copy.

Where the two marks appear together, each panel reserves the **same height** for
its mark regardless of how tall that mark actually is. The panels centre their
own content, so a shorter lockup makes a shorter column and drops its call to
action to a different height than its neighbour's - and the call to action is
the one element that has to line up across the split, because it is the same
affordance offered twice.

They are also matched on **width**, not height:
FOAMICO's is a compact circular lockup and VedaSleep's is a wide horizontal one,
so equal heights make one roughly twice the footprint of the other and the larger
reads as the primary choice. Equal widths give them equal weight, which is the
whole point of the brand selector.

## 3D presentation
- Keep the mattress visually dominant.
- Maintain consistent scale and framing between product states.
- Avoid camera changes that make products appear inconsistently sized unless intentional.
- Material realism rules (physically plausible response, avoiding flat colors) are owned by `docs/MATERIALS_AND_TEXTURES.md` — this file does not restate them, only affirms that visual design depends on getting them right.

## UI controls
- Controls must have clear affordances.
- Hover, active, selected, disabled, and loading states must be visually distinct.
- Touch targets must be usable on mobile.

## Changes
Any intentional visual redesign should be reflected here so future changes do not accidentally revert the design direction. Any addition to the Brand Tokens table above must come from an explicit instruction, not from inference off a screenshot or a one-off visual choice made mid-task.
