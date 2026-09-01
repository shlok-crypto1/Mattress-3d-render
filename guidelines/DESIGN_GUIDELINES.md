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
| Veda Green-Black | `#1F2A22` | The ground of the two VedaSleep pages that show product: the card grid and the product pages. **Replaced Stage Grey `#D3D3D3` on 2026-09-01** at the product owner's explicit instruction. The route-loading holding screen takes it too, since every VedaSleep route that reaches it is one of those two pages and a cream flash before a dark page is the flash that screen exists to prevent. A product surface is a stage, and a stage is not the same thing as a page — that principle is unchanged; only the stage moved. See the row below for why it had to go dark rather than darker. |
| — why not a darker grey | — | **The intuitive answer is wrong here, and it is worth not re-deriving it.** VedaSleep's tickings are not all pale: Duro and Maxa photograph at `#E2DDDA` and `#ECE5E4`, but **Magic is itself a mid-grey at `#9D9BA1`**. No stage between them can separate them both, and `#D3D3D3` sat exactly there — Duro measured 1.11 against it and Maxa 1.21, which is no edge at all. Nudging the stage down makes Magic *worse*: the stage passes through Magic's own tone, and at `#9A9A9A` Magic measures **1.02 and vanishes**. Only a stage below all three separates all three. `#1F2A22` puts the worst face on any product at 2.14 and Magic's top at 5.40. It was also the only candidate where Veda Gold clears WCAG AA on the stage (4.51), so the accent stays usable for small text. |
| Veda Chrome | `#93A197` secondary text, `#6B7A70` hints, `#2A382E` control fill, `#B7C4BB` control label | The UI that had to invert when the stage went dark on 2026-09-01. Not a design choice in its own right: these are the VedaSleep counterparts of the greys FOAMICO already carries for the same controls, solved against the new ground rather than picked, and each one was checked for contrast on it before use. Recorded here because the Changes rule below asks for it - the stage change was instructed, and this is what that instruction required. |
| Veda Card | `#3A4F3F`, rim `#4C6552` | The card fill on the VedaSleep grid, and the variant menu on its product pages. Set 2026-09-01 after `#26332A` measured 1.13 against the stage and merged into it. **A fill one step off its ground is not separation** — roughly 1.5 is where the eye accepts an edge; this sits at 1.68 with the rim at 2.33. It is bounded above as well as below: the fill must stay clearly darker than the tickings it frames or it competes with the product photograph, and Magic, the one mid-grey ticking, is what binds it (3.22). |
| Paper | `#F7F5F0` | Light background/surface option, and the VedaSleep ground everywhere that is **not** a product stage — the page ground and the VedaSleep panel on the brand selector. Warmed from `#F6F8F1` on 2026-08-27 at the product owner's request. |
| Egg White | `#FEFEFE` | Light background/surface option (alt) |
| Key Black | `#1A1A1A` | Primary text on light backgrounds |
| Slate Grey | `#6B6B6B` | Secondary/body text on light backgrounds |
| Light Grey | `#DDDDDD` | Borders, hairlines |
| Wordmark | VedaSleep lotus lockup, `app/public/brand/vedasleep-logo{,-light}.png`. The lockup already contains the word "VEDASLEEP" | Header, branding — recorded in `docs/ASSET_MANAGEMENT.md`. **Use `-light` on Veda Green-Black** (the product pages and the card grid) and the original on Paper (the brand selector). The mark sets "VEDA" in near-black, which is invisible on the dark stage; the light variant is the same file with the same alpha and only that black ink moved to Paper, exactly as `foamico-logo-light.png` does. The green wordmark and the gold lotus are untouched in both. |

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
- **A product must have a ground to read against, and that is the stage's job, not the light's.** Both brands met this from opposite directions on 2026-08-27. FOAMICO's Riva - whose border is a charcoal non-woven that photographs at Key Black - vanished into Key Black, rendering as a one-inch white pancake where nine inches of mattress should be; no lighting fixes that, because a matte fabric's diffuse response cannot exceed its own albedo, so the FOAMICO viewer carries a soft pool of Egg White behind the model instead. On the VedaSleep side the product owner moved the two product-facing pages off Paper on the same day and to **Veda Green-Black `#1F2A22`** on 2026-09-01, once it became clear that no light stage separates all three of its tickings - Magic's is itself a mid-grey, so a stage between the pale two and Magic separates neither. Both brands therefore now stand their product on a dark ground, from opposite starting points. Both are tints of existing tokens, and both are the thing a studio does when it photographs something the same tone as its background.
- Maintain consistent scale and framing between product states.
- Avoid camera changes that make products appear inconsistently sized unless intentional.
- Material realism rules (physically plausible response, avoiding flat colors) are owned by `docs/MATERIALS_AND_TEXTURES.md` — this file does not restate them, only affirms that visual design depends on getting them right.

## UI controls
- Controls must have clear affordances.
- Hover, active, selected, disabled, and loading states must be visually distinct.
- Touch targets must be usable on mobile.

## Changes
Any intentional visual redesign should be reflected here so future changes do not accidentally revert the design direction. Any addition to the Brand Tokens table above must come from an explicit instruction, not from inference off a screenshot or a one-off visual choice made mid-task.
