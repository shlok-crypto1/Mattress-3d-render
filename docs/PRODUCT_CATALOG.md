# Product Catalog

## Purpose
Single source of truth for product information displayed by the 3D experience.

## Status legend
- **Confirmed** — stated explicitly by the product owner; safe to use as-is.
- **TBD** — not yet provided; do not fill this in from inference. The rule against inventing specifications is owned by `guidelines/DO_NOT_CHANGE.md` — this file only applies that rule to product data specifically.

## Precedence
This file is the sole authority for product facts (names, layer construction, materials, coil presence, dimensions). Do not let a document elsewhere (chat history, a prompt, a screenshot, a reference image, the deployed site) silently override what's recorded here. If new information conflicts with an entry marked Confirmed, update this file in the same change and note it in `docs/CHANGELOG.md` — do not just act on the new information while leaving this file stale.

---

## Brands

| Field | FOAMICO | VedaSleep |
|---|---|---|
| Positioning | Luxury Mattress Collection | Premium Sleep Collection |
| Visual treatment | Dark (Key Black background), Kiwi Green accent | Light (Paper/Egg White background), Veda Gold accent |
| Wordmark | Logo lockup file in repo (`brand/foamico-logo.png`, `-light.png`) — the lockup already sets the words "FOAMICO / LUXURY MATTRESS" | Logo lockup file now in repo (`brand/vedasleep-logo.png`) — lotus over a "VEDASLEEP" wordmark, so the lockup already sets the brand name. Supplied as `company logos/veda sleep/VEDASLEEP - LOGO.jpg.jpeg`; see `docs/ASSET_MANAGEMENT.md` |

---

## FOAMICO Products

### Resto
| Field | Value | Status |
|---|---|---|
| Product name | Resto | Confirmed |
| Category | FOAMICO Luxury Mattress | Confirmed |
| Spec line (as shown on grid) | "Classic · 6″ Firm · 10-Year Warranty + 5-Year Full Replacement" | Confirmed |
| Layer construction | Fabric cover (grey/white patterned quilted fabric) → 6 foam layers of varying thickness (yellow, blue, purple, white, grey, orange transition — thin-to-thick order visually confirmed from reference photo) → fabric-wrapped base | Confirmed (order/relative-thickness only — exact layer names and thicknesses TBD) |
| Coil layer | None | Confirmed |
| Variants | Classic 6″, Premium 6.5″, Luxury 7″ | Confirmed |
| Foam split | **Layer 6 30% / Layer 5 30% / Layer 4 20% / Layer 3 20%** of the product's foam. The cover, the convoluted top band and the bonded base are outside this split - they are upholstery and a base, not foam a percentage is quoted of - and keep the proportions they had, so the four foam bands divide their existing combined share. | Confirmed (product owner, 2026-08-26) |
| Per-grade layer composition | Resto is the one product whose grades are built from **different stacks**, not one stack cut to different thicknesses. Luxury 7″ is the full seven-band build and the grades below it drop comfort foam. **Luxury 7″ — layers 1, 2, 3, 4, 5, 6 + base. Premium 6.5″ — layers 1, 2, 4, 5, 6 + base (drops layer 3). Classic 6″ — layers 1, 2, 5, 6 + base (drops layers 3 and 4).** The base is present in every grade. | Confirmed (product owner, 2026-08-27; independently corroborated by `RESTO CLASSIC.png` and `RESTO PREMIUM.png` in the per-grade render set, which show exactly these band sets) |
| Per-grade thickness rule | The cover and the bonded base keep the real thickness they have at the baseline grade — they are the same components at every grade — and the surviving foam bands divide the rest of the declared height between them in proportion to the foam split above. A thinner Resto is therefore less foam rather than a puffier cover and a deeper base. This also governs Classic and Premium in the places where no band is dropped: their cover and base no longer scale down with the mattress the way they did before 2026-08-27. | Confirmed (product owner, 2026-08-27) |
| Per-layer names | **1 AirKnit Fabric → 2 AeroFlex Foam → 3 Memorest Foam → 4 Cosmic Foam → 5 Pro Nexa Foam → 6 Enduro HR Foam → Base Quilted Foam** | Confirmed (product owner, 2026-08-31) |
| Exact per-layer thicknesses | — | TBD |
| Dimensions | — | TBD |

### Sova
| Field | Value | Status |
|---|---|---|
| Product name | Sova | Confirmed |
| Category | FOAMICO Luxury Mattress | Confirmed |
| Layer construction | White "Bamboo"-print quilted fabric cover → blue convoluted/pyramid-top foam → yellow foam → green foam → thin orange transition foam → grey fabric-wrapped base (FOAMICO tag patch) | Confirmed (order only — exact layer names/thicknesses TBD) |
| Coil layer | None | Confirmed |
| Variants | Classic 5″, Classic 6″, Premium 6.5″, Luxury 7″ | Confirmed |
| Foam split | **Layer 6 30% / Layer 5 30% / Layer 4 20% / Layer 3 20%** of the product's foam. The cover, the convoluted top band and the bonded base are outside this split - they are upholstery and a base, not foam a percentage is quoted of - and keep the proportions they had, so the four foam bands divide their existing combined share. | Confirmed (product owner, 2026-08-26) |
| Per-grade layer composition | **Luxury 7″ — all seven bands. Premium 6.5″ — layers 1, 2, 4, 5, 6 + base (drops layer 3). Classic 6″ and Classic 5″ — layers 1, 2, 5, 6 + base (drops layers 3 and 4).** The product owner gave one rule for "sova classic" and Sova presents two Classic heights; both take it. Natural's composition is still to come — until then it shows every band. | Confirmed (product owner, 2026-08-27; corroborated by `SOVA CLASSIC.png` and `SOVA PREMIUM.png`) |
| Per-layer names | **1 AirKnit Fabric → 2 AeroFlex Foam → 3 Memorest Foam → 4 Cosmic Foam → 5 Plush Core Latex → 6 OrthoBond Foam → Base Quilted Foam** | Confirmed (product owner, 2026-08-31) |
| Exact per-layer thicknesses | — | TBD |
| Dimensions | — | TBD |

### Luma
| Field | Value | Status |
|---|---|---|
| Product name | Luma | Confirmed |
| Category | FOAMICO Premium Mattress | Confirmed |
| Layer construction | Light blue-grey chevron-knit fabric cover → yellow foam → white foam → thin brown/maroon layer → **pocket coil spring core** → orange transition foam → blue denim-look fabric-wrapped base | Confirmed (order only — exact layer names/thicknesses TBD) |
| Coil layer | **Yes** — real pocket-spring core, must render as instanced individual 3D coils (not a flat textured slab), per explicit product decision | Confirmed |
| Variants | Classic 6″, Premium 8″, Luxury 10″ | Confirmed — **superseded the earlier Classic 8″ / Premium 10″ / Luxury 5″ reading on 2026-08-26 by the product owner.** Luma's grades step 6″ / 8″ / 10″; there is no 5″ Luma |
| Foam split | **Layer 5 (the spring unit) 80% / Layer 3 20%**. The cover, the convoluted band, both coil insulator pads and the bonded base are outside the split and keep the proportions they had. | Confirmed (product owner, 2026-08-26) |
| Spring unit footprint | The pocket unit fills the same footprint as the foam bands above and below it, less the 2% the slabs' rounded corners take. It used to be laid out at a fixed pitch from a fixed 3″ inset, which stopped it several inches short of the edge on every side and read as a smaller mattress inside the mattress. | Confirmed (product owner, 2026-08-26) |
| Per-grade layer composition | **Luxury 10″ — all eight bands. Premium 8″ and Classic 6″ — the same seven bands as each other, dropping layer 3.** Layer 3 is the blue comfort foam, and it was genuinely missing from this repository's Luma stack until 2026-08-27; `LUMA LUXURY.png` shows it and `LUMA CLASSIC.png` / `LUMA PREMIUM.png` do not. Adding it renumbered every band below it, so **Luma's spring unit is Layer 6**, not Layer 5 — the numbering follows position in the full stack, as it does for every product. | Confirmed (product owner, 2026-08-27; corroborated by all three Luma renders) |
| Per-grade thickness rule | **The spring unit is the same size in Luxury and Premium, and considerably smaller in Classic.** Solved rather than eyeballed: with the other seven ratios summing to 0.95, requiring Luxury's spring unit to equal Premium's fixes the blue band's ratio at 0.2375. That makes it 2.00″ and leaves every other band in Luxury the identical thickness it has in Premium — so Luxury is exactly Premium plus this one layer, which is what the two renders show. Classic's spring unit comes out 33% shorter than Premium's (2.07″ against 2.76″). Absolute thicknesses remain TBD; these are proportions. | Confirmed (product owner, 2026-08-27) |
| Per-layer names | **1 AirKnit Fabric → 2 AeroFlex Foam → 3 Memorest Foam → 4 Pro Nexa Foam → 5 Guard Flex → 6 Hybrid Pocket Springs → 7 Guard Flex → Base Quilted Foam**. Layers 5 and 7 carry the same name because they are the pair of coil insulator pads either side of the spring unit — independent corroboration that the spring unit is Layer 6 | Confirmed (product owner, 2026-08-31) |
| Exact per-layer thicknesses | — | TBD |
| Dimensions | — | TBD |

### Ultima
| Field | Value | Status |
|---|---|---|
| Product name | Ultima | Confirmed |
| Category | FOAMICO Luxury Mattress | Confirmed |
| Layer construction | White quilted fabric cover → yellow → blue → purple → white/grey speckled → grey → thin orange transition foam → tan fabric-wrapped base (black "ULTIMA LUXURY" tag) | Confirmed (order only — highest layer count of any product; exact layer names/thicknesses TBD) |
| Coil layer | None | Confirmed |
| Variants | Classic 6″, Classic 5″, Premium 6″, Luxury 6.5″, Natural 6″ | Confirmed — **Natural corrected from 7″ to 6″ on 2026-08-26 by the product owner**; Natural is 6″ wherever it is offered |
| Foam split | **Layer 6 30% / Layer 5 30% / Layer 4 20% / Layer 3 20%** of the product's foam. The cover, the convoluted top band and the bonded base are outside this split - they are upholstery and a base, not foam a percentage is quoted of - and keep the proportions they had, so the four foam bands divide their existing combined share. | Confirmed (product owner, 2026-08-26) |
| Per-grade layer composition | **Luxury 6.5″ — all seven bands. Premium 6″ — layers 1, 2, 4, 5, 6 + base (drops layer 3). Classic 6″ and Classic 5″ — layers 1, 2, 5, 6 + base (drops layers 3 and 4).** Note Classic 6″ and Premium 6″ are the same height and different builds; that is intended. Natural's composition is still to come. | Confirmed (product owner, 2026-08-27; corroborated by `ULTIMA CLASSIC.png`) |
| Per-layer names | **1 AirKnit Fabric → 2 AeroFlex Foam → 3 Memorest Foam → 4 Cosmic Foam → 5 Cloud Sense Foam → 6 Zero G Latex → Base Quilted Foam** | Confirmed (product owner, 2026-08-31) |
| Exact per-layer thicknesses | — | TBD |
| Dimensions | — | TBD |

### Riva
| Field | Value | Status |
|---|---|---|
| Product name | Riva | Confirmed |
| Category | FOAMICO Luxury Mattress | Confirmed |
| Layer construction | White wavy-line pattern quilted fabric cover → cream/ivory foam → white foam → magenta/pink foam → olive/khaki foam → thin orange transition foam → navy/black fabric-wrapped base | Confirmed (order only — exact layer names/thicknesses TBD) |
| Coil layer | **None — explicitly confirmed foam-only, no coil layer**, despite the olive/khaki layer's perforated appearance in the reference photo resembling a coil texture | Confirmed |
| Variants | Classic 6″, Classic 6.5″, Premium 7″, Luxury 6″, Natural 6″, Natural 8″, R1000 6″, R2000 8″, R3000 9″ | Confirmed |
| Variants **presented** | **R1000 6″, R2000 8″, R3000 9″, Natural 6″** — Riva is shown by its R grades plus Natural, and by nothing else. The Classic / Premium / Luxury rows above are not offered in the experience, and neither is the second Natural at 8″. | Confirmed (product owner, 2026-08-26) |
| Border badge | A woven "RIVA / SLEEP" oval badge on the dark base border. **It appears exactly twice on the product: once at the head and once at the foot. It must never repeat down the long sides.** | Confirmed |
| Badge asset note | The supplied border crop was mirrored (the badge read as a reversed "AVIR / SLEEP") and the badge was baked into the tiling photo, so it repeated about six times around the perimeter. The crop is now un-mirrored and the badge painted out of it; the badge ships separately as `side-badge.png` and is placed on two faces. | Confirmed correction |
| Per-grade layer composition | **R3000 9″ — all seven bands. R2000 8″ — drops layer 2. R1000 6″ — drops layers 2 and 3.** Riva thins from the top of the comfort stack downwards rather than from the middle, which is the opposite of how Sova, Ultima and Resto thin. Natural's composition is still to come. | Confirmed (product owner, 2026-08-27; corroborated by `RIVA 2K.png`) |
| Per-layer names | **1 Bio Weave → Base Quilted Foam.** Riva's cover is the one cover in either brand that is not AirKnit Fabric. | Confirmed (product owner, 2026-08-31) |
| Per-layer names, layers 2–6 | — | TBD — the product owner named layer 1 alone on 2026-08-31 and said the rest would follow |
| Exact per-layer thicknesses | — | TBD |
| Dimensions | — | TBD |

### Sofa cum Bed
| Field | Value | Status |
|---|---|---|
| Product name | Sofa cum Bed | Confirmed |
| Category | FOAMICO | Confirmed |
| Form | **Not a mattress.** A tri-fold foam unit: three hinged panels plus a separate bolster/pillow, folding from an upright seat, through a lounger position, to a flat single bed. Upholstered in a mid-grey woven chenille with zips on the panel ends. | Confirmed from supplied photography (`Foamico mattresses/Sofa cum Bed/`, 6 shots) |
| Layer construction | **None exposed.** This product has no layer stack in the experience — explicitly confirmed as having no layers. | Confirmed |
| Coil layer | None | Confirmed |
| Presentation | **Photography**, in `src/components/SofaPhotoViewer.jsx`: three studio plates the viewer switches between, wearing the same chrome, entrance and control row as the mattress pages. Not `MattressViewer` — that builds a single rounded slab and cannot represent a hinged tri-fold form. | Confirmed (product owner, 2026-08-26) |
| Positions shown | **Front** (opened flat as a bed), **Side** (part-folded, seen from the end), **Sitting** (folded upright as a seat). The buttons name what the product is doing, not where a camera is, because the fold is what there is to see. | Confirmed |
| Previous 3D presentation | A full 3D model (`src/lib/sofaModel.js`) and viewer (`src/components/SofaViewer.jsx`) were built for this product on 2026-08-26 and are **kept in the repo but no longer routed**. The photography superseded them the same day; nothing imports them, so they cost nothing in the bundle. | Confirmed |
| Bolster | The separate bolster/pillow appears in the bed-position photographs of the source set but not in the three plates shown, so it is not presented. | Confirmed |
| Layers control | **Absent by instruction**, and correct: the product has no layer stack. | Confirmed |
| Model proportions | Measured off the supplied photography, not from a spec sheet: the seat's front face is about 5.4x as wide as one panel is thick, and the rest panel about 3x as tall. **These are shape, not size — do not read dimensions out of `sofaModel.js`.** | Confirmed as photograph-derived |
| Cover fabric render | Grey chenille, tiled from a flattened swatch of the seat front face in `_32I0311.JPG`. Rendered tone was checked against the photograph: backrest 123 vs 116, seat front 123 vs 116. | Confirmed |
| Variants | Classic 8″, Premium 8″ | Confirmed |
| Variant / thickness / feel | — | TBD |
| Warranty | — | TBD |
| Dimensions (seat and bed positions) | — | TBD |
| Foam grade / density | — | TBD |
| Cover fabric name | — | TBD |
| Colourways beyond the photographed grey | — | TBD |
| Panel count | Three hinged panels plus a separate bolster/pillow seen in the bed-position photographs. The bolster is not modelled — it does not appear in either seat-position shot. | Confirmed from photography |

Because every spec above is TBD, this product carries **no variant control** on its page — there is nothing confirmed to put in one, and no thickness for it to drive. Do not infer a thickness from the photographs.

---

## VedaSleep Products

### Duro
| Field | Value | Status |
|---|---|---|
| Product name | Duro | Confirmed |
| Category | VedaSleep Classic | Confirmed |
| Layer construction | AirKnit Fabric (cover) → AeroFlex Foam → OrthoBond Foam → base transition/fabric layer | Confirmed — material names updated 2026-08-31; see Per-layer names below |
| Excluded layer | A green foam layer appears between AeroFlex Foam and OrthoBond Foam in one reference image (`DURO_PREMIUM.png`) — **this layer does not exist in the real product and must never be rendered.** The corrected reference is `DURO_LUXURY.png` (4 layers, no green). | Confirmed |
| Coil layer | None | Confirmed |
| Variants | Classic 5″, Premium 6″, Luxury 6″ | Confirmed |
| Foam split | **OrthoBond is 100% of Duro's support foam.** AeroFlex stays as it is, above it - explicitly confirmed by the product owner (2026-08-26) when the split was given - so the stack is unchanged. | Confirmed |
| Per-layer names | **1 AirKnit Fabric → 2 AeroFlex Foam → 3 OrthoBond Foam → Base Quilted Foam**. **This retires "Super Plush LuxeKnit Fabric"**, the name previously Confirmed for Duro's cover and the only signed-off material name this project carried before 2026-08-31; the product owner replaced it with the AirKnit Fabric that every product except Riva now shares. Layer 3's spelling also moves from Ortho Bond to OrthoBond; layer 2 keeps the AeroFlex it already had | Confirmed (product owner, 2026-08-31) |
| Exact per-layer thicknesses | — | TBD |
| Dimensions | — | TBD |
| Note on old spec line | The live site previously showed "Classic · 5″ High-Density Foam" — this predates the multi-layer construction above and should be replaced, not treated as current. | Confirmed correction |

### Maxa
| Field | Value | Status |
|---|---|---|
| Product name | Maxa | Confirmed |
| Category | VedaSleep Comfort | Confirmed |
| Layer construction | Cream quilted fabric cover → comfort foam (yellow) → foam (green) → speckled multicolor foam → thin orange transition foam → tan fabric-wrapped base (VEDASLEEP tag) | Confirmed as the current direction (5 bands) — **note: this reverses an earlier assumption in this project that Maxa's construction was unconfirmed; treat the 5-layer stack as current per explicit instruction** |
| Coil layer | None | Confirmed |
| Variants | Classic 5″ | Confirmed |
| Foam split | **Layer 3 is 100% of Maxa's foam, and the rebonded support core that sat under it is removed** (product owner, 2026-08-26). Layer 3 takes the core's share as well as its own, so the cover, the convoluted band and the bonded base keep their proportions. The stack is four bands: cover → convoluted comfort foam → comfort foam → bonded base. This supersedes the 5-band construction recorded above. | Confirmed |
| Per-layer names | **1 AirKnit Fabric → 2 AeroFlex Foam → 3 Float Sense Foam → Base Quilted Foam** | Confirmed (product owner, 2026-08-31) |
| Exact per-layer thicknesses | — | TBD |
| Dimensions | — | TBD |

### Magic
| Field | Value | Status |
|---|---|---|
| Product name | Magic | Confirmed |
| Category | VedaSleep Memory Foam | Confirmed |
| Layer construction | **Superseded.** Originally built and shipped as a single uniform foam core ("100% Float Sense Foam," 5″ thick, no internal layer divisions). This has been explicitly replaced with a 5-band multi-layer construction matching the Maxa/Signature template: cream quilted fabric cover → comfort foam → foam → speckled multicolor foam → thin orange transition foam → tan fabric-wrapped base. | Confirmed — **intentional override, not an error.** If any component or copy still describes Magic as a single-foam product, it is out of date and must be corrected to match this entry. |
| Coil layer | None | Confirmed |
| Variants | Classic 5″ | Confirmed |
| Thickness | **5″** | Confirmed — supersedes the 6″ previously carried in code, which was never a confirmed figure |
| Layer proportions | Cover 0.35″ and the bonded base 0.60″ take their real thicknesses; the remaining 4.05″ is foam. The convoluted top band keeps **5%** of that foam (Layer 2, 0.20″), and what is under it splits **25% Layer 3 (0.96″) / 75% Layer 4 (2.89″)**. | Confirmed (product owner, 2026-08-26) — supersedes the earlier 80 / 15 / 5 split |
| Proportion scope | These are Magic's alone; every product's proportions are now its own. | Confirmed |
| Per-layer names | **1 AirKnit Fabric → 2 AeroFlex Foam → 3 Float Sense Foam → 4 Core Bonded Foam → Base Quilted Foam**. Float Sense Foam survives Magic's supersession as the name of layer 3 alone, not of the whole mattress | Confirmed (product owner, 2026-08-31) |
| Exact per-layer thicknesses | — | TBD |
| Dimensions (width/length) | — | TBD |
| Fabric texture reference | Top/side/bottom textures already cropped from `Magic_texture.JPG`, `Magic_front_and_back.png`, and the angled/front reference photos (grey diamond-quilt top, dark ribbed side/bottom) | Confirmed |

### Signature — REMOVED FROM THE EXPERIENCE
**Signature is no longer a product in this experience.** Removed on 2026-08-26 at the product owner's instruction: its data, page, route and textures are all gone from the app, and its grid card with them. The entry below is kept as the record of what was confirmed about it, not as a description of anything on screen. Do not re-add the product from this table alone - that needs a new instruction. Everything previously flagged against it (the unverified construction, the "Pocket Spring + Foam" spec line against a coil layer of None) went with it.

| Field | Value | Status |
|---|---|---|
| Product name | Signature | Confirmed |
| Category | VedaSleep Premium | Confirmed |
| Layer construction | Cream quilted fabric cover → comfort foam → foam → speckled multicolor foam → thin orange transition foam → tan fabric-wrapped base (matches the Maxa/Magic template) | Confirmed as current direction — construction not independently verified against a distinct Signature-specific photo; flagged for confirmation that this isn't a mislabeled/reused stock image before treating it as final |
| Coil layer | None (per current reference — not independently re-confirmed) | Unconfirmed |
| Variants | Classic 4″/5″, Premium 4″/5″, Luxury 4″/5″ | Confirmed |
| Exact per-layer names/thicknesses | — | TBD |
| Dimensions | — | TBD |

---

## Cross-product rules

- **The transition sheet and the fabric-wrapped base are ONE layer, in every product.** The pierced foam sheet is bonded to the top of the base - glued down, not a band anyone could lift off - so the exploded stack must never pull them apart. They render as a single band that labels, hovers, selects and separates as one, with the sheet keeping its own sculpted relief so it still reads as the orange foam pasted onto the base. Each product's sheet:base thickness split is unchanged from when these shipped as two bands. **Do not re-split them**, and give a new product's stack one bonded base rather than a transition band plus a base band.
- **Woven branding appears twice per product, never tiled.** A badge sewn onto a border belongs at the head and the foot and nowhere else. It must therefore be kept out of the border photograph — which the wall repeats around the perimeter — and placed as a decal on those two faces (`sideBadge` in the product data). If a new product's border photo has a badge baked into it, paint it out and crop the badge separately before shipping the texture.
- **Base-layer colour is derived from photography, not chosen.** Each product's bottom band takes its colour from the median of its own `app/public/textures/<product>/bottom.png`, because that same photograph is mapped onto the band's underside. Any hand-picked value shows the base as one colour on its cut face and another on the cloth immediately below it — which is what all nine products did until 2026-08-26. If a `bottom.png` is ever re-cropped or replaced, re-derive the colour in the same change.
- **Every product opens on its top grade.** The baseline is the first entry in the product's `variants` list in code and the single source of that product's rendered thickness; as of 2026-08-26 it is the product's best grade rather than the one it happened to present, because a page should open on the best version of the product it can show. That makes it **Luxury** for Resto, Sova, Luma, Ultima and Duro; **R3000** for Riva, which has no grade called Luxury and whose R ladder tops out there; and **Classic** for Maxa and Magic, which have no second grade. Which grade is baseline is a presentation rule; the thickness that goes with it is a product fact and comes from the variant table above.
- **Four products were rendering a thickness this table does not confirm, and no longer do** (2026-08-26): Luma at 6″; Riva at 8″ when the R1000 it presents is 6″ (8″ is R2000); Maxa at 6″ when its one variant is 5″; Signature at 8″, a figure that appears nowhere in its entry. Each now renders its baseline. Two products were also labelling their category as their variant ("Comfort" for Maxa, "Memory Foam" for Magic); both are Classic. **Maxa's correction remains flagged for the product owner; Signature's went with the product when it was removed.** Luma's was resolved the same day and in the other direction - Classic is 6″, the figure the code originally had, and it is 6″ again; the 8″ in between came from this table's earlier Luma row, which the owner has since corrected.
- **The grade a product is shown at is a choice on the page, not a line on the card.** Every product with more than one presented variant offers them in a menu on its product page; the grid card carries the product's name alone. The menu runs thinnest first and pins **Natural** to the end in its own colour - it is the premium grade of the products that offer it, and it does not belong in a size ladder. The variant already named on the pill is not repeated inside the menu.
- **Foam splits are percentages of the foam, not of the mattress.** Where a product's entry above gives one, it divides only the bands named in it; the cover, any convoluted top band and the bonded base sit outside it and keep the proportions they already had, so the split changes how the foam divides and not how thick the upholstery is. A product with no split recorded keeps its eyeballed placeholder ratios - **do not carry another product's percentages across**, however similar the stacks look.
- **Material names are now confirmed for every band of every product except Riva's layers 2-6** (product owner, 2026-08-31), and they are recorded per product in the Per-layer names row of each entry above. Two of them are shared rather than per-product, and a new product inherits both rather than inventing its own: the cover is **AirKnit Fabric** in all eight products that have one named — Riva alone differs, with **Bio Weave** — and the bonded transition-sheet-plus-base band is **Quilted Foam** in every product of both brands. Names follow one house format, approved by the product owner on 2026-08-31: **a closed compound takes an internal capital** — AirKnit, AeroFlex, OrthoBond — while names written as separate words stay separate (Pro Nexa, Guard Flex, Cloud Sense, Float Sense, Zero G, Bio Weave). In code the two shared names live in the `cover` and `base` factories in `app/src/data/layers/*Layers.js`; the base name is fixed inside its factory precisely because there is no per-product variation to express.
- **A material name is copy, not construction.** Naming a band did not change its `type`, `surface`, thickness ratio or colour, and must not: how a band is built and how it looks are established by the reference cutaway renders and the confirmed stack shapes above. Sova's **Plush Core Latex** and Ultima's **Zero G Latex** are accordingly still rendered as `type: 'foam'` with the surfaces their renders show. **Whether those two bands are literally latex, and whether Ultima's Cloud Sense Foam is still correctly described as a rebonded chip core, is open** — the names suggest otherwise and the renders do not settle it. Flagged for the product owner; do not resolve it by changing the render.
- **No thickness may be read off the exploded layer view.** Its bands are rendered deliberately thicker than they are, and the grades are not to scale against each other — the product owner asked for broader layers on 2026-08-31 and accepted that consequence. The rule and its safeguards belong to `docs/3D_RENDER_GUIDELINES.md`; what matters here is that the exploded stack is presentation and this table is the only source of a thickness. The closed mattress does still render its declared height.
- **Layer order and coil/no-coil status are Confirmed per product above and must not be altered without an explicit new instruction from the product owner.**
- **A grade may omit bands from its product's stack, but only where the product's entry above records the composition for that grade** (currently Resto alone; every other product shows every band at every grade). A band that survives keeps its own identity and its own number — Classic reads Layer 1, Layer 2, Layer 5, Layer 6, Base — and the gap in the numbering is the point: it is what shows which bands the grade leaves out. Do not renumber the survivors.
- **A grade may omit bands wherever the product's entry above records it.** Resto, Sova, Luma, Ultima and Riva all do, confirmed by the product owner on 2026-08-27 and corroborated by the per-grade render set. Natural's composition is still to come for all three products that offer it, and every Natural grade shows its whole stack meanwhile.
- **How the survivors fill the height is a per-product choice.** By default they simply divide the grade's height in proportion to the ratios they already have, so the cover and base scale with the mattress. Resto alone opts into holding the cover and bonded base at their baseline thickness (`holdUpholstery`), because that only reads correctly over a narrow spread of grade heights - Resto's grades run 6″ to 7″. Over Riva's 6″ to 9″ or Luma's 6″ to 10″ it makes the base absurd, up to 42% of the thinnest grade, because a base sized for the tallest grade is not the base a much thinner one is built on. Do not turn it on for a product without checking what it does to that product's thinnest grade.
- Exact thickness values, dimensions, warranty terms (beyond Resto's stated line), and pricing are **TBD across every product** — do not invent them for copy, labels, or detail cards. Use a visible `TBD` placeholder in UI copy if a real value is required before the source is available.
- If a reference image conflicts with an entry marked Confirmed in this table (as happened with Duro's green layer and Magic's original single-foam spec), the table wins unless the product owner explicitly states the table is being superseded — record any such override here immediately, in the same change, per `CLAUDE.md`'s documentation rule.

## Verification
This document reflects what has been explicitly confirmed in project conversations to date. It is not a substitute for final signed-off product specification sheets. Replace any TBD with real data only when it comes from an approved source, and update the Status column accordingly.
