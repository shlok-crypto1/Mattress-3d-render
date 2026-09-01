# Asset Management

## Purpose
Keep 3D models, textures, images, fonts and icons predictable and maintainable.

## Recommended structure

```text
public/
  models/
  textures/
  images/
  icons/
  fonts/
```

Use the actual repository structure if it differs; do not move assets merely to match this example.

## Naming
Prefer:
- lowercase
- descriptive names
- stable product IDs
- consistent separators
- explicit file extensions

Example:

```text
product-id-mattress.glb
product-id-cover.webp
product-id-foam-normal.webp
```

## Rules
- Do not rename production assets without updating every reference.
- Remove orphaned assets only after confirming they are unused.
- Keep source and generated assets distinguishable.
- Record important asset mappings here.

## Asset registry

Served assets live under `app/public/`. Anything outside it (`brand/`, `textures/`,
`Foamico mattresses/`, `veda sleep mattresses/`, `company logos/`) is **source**,
not shipped — the build only copies `app/public/`. When a source asset is brought
into the experience it must be processed into `app/public/` and recorded here.

### Per-grade cutaway renders — `Layers/`

The product owner's cutaway render set, 26 files, added 2026-08-27. One render per
product per grade, named `<PRODUCT> <GRADE>.png` exactly as delivered — the names are
the product owner's and are not lowercased to match the naming section above, which
governs production assets in `app/public/`, not source.

It sits at the repository root rather than inside `Foamico mattresses/` or
`veda sleep mattresses/` because the set spans both brands and is one coherent thing:
it is the reference art the layer stacks are read from, and splitting it by brand
would break the comparison that makes it useful. It supersedes the short-lived
`Foamico mattresses/Natural/` folder, whose three files were byte-identical
duplicates of the Natural renders here.

**Source only.** Nothing here is processed into `app/public/` or referenced by the
experience, and — apart from Resto, below — no product data is derived from it.

| Product | Renders |
|---|---|
| Resto | `CLASSIC`, `PREMIUM`, `LUXURY` |
| Sova | `CLASSIC`, `PREMIUM`, `LUXURY`, `NATURAL` |
| Ultima | `CLASSIC`, `PREMIUM`, `LUXURY`, `NATURAL` |
| Luma | `CLASSIC`, `PREMIUM`, `LUXURY` |
| Riva | `RIVA 1K`, `RIVA 2K`, `RIVA 3K`, `RIVA NATURAL` — the R1000/R2000/R3000 ladder |
| Duro | `CLASSIC`, `PREMIUM`, `LUXURY` |
| Maxa, Magic | `MAXA.png`, `MAGIC.png` — one grade each, so no grade in the name |
| Signature | `CLASSIC`, `PREMIUM`, `LUXURY` |

Three things to know before using it.

**Resto is the only product read into code so far.** `RESTO CLASSIC.png` and
`RESTO PREMIUM.png` corroborate the per-grade composition the product owner gave for
Resto, and that composition is implemented. The set plainly implies the same is true
elsewhere — `SOVA CLASSIC.png` has five bands against `SOVA LUXURY.png`'s seven — but
that is a reading of reference art, not a statement from the product owner, so
nothing outside Resto is implemented. See the cross-product rules in
`docs/PRODUCT_CATALOG.md`; wait for the foam details.

**Signature is not a product any more.** It was removed from the experience on
2026-08-26 and its three renders are here only because they came with the set.
`docs/PRODUCT_CATALOG.md` keeps its entry as a record and says not to re-add it from
that entry alone; the same goes for these files.

**One render has the wrong badge.** `SOVA NATURAL.png` is badged `ULTIMA NATURAL`.
The set itself settles that this is a badge error rather than a naming error: each
product wears its own border livery across its grades, and Sova's grey border with
tan piping under a blue chevron cover is identical in `SOVA CLASSIC.png`,
`SOVA LUXURY.png` and in the disputed render, while Ultima's taupe border and hexagon
cover (`ULTIMA LUXURY.png`) are nothing like it. The disputed render also carries the
perforated latex band that marks the Natural grade, and 25 of the 26 renders badge
exactly what their file name says. **The file keeps its name; the render needs
redoing** so the badge reads `SOVA NATURAL`. Until then, do not derive a badge
texture from it — the rest of the render is sound.

Layer counts and colours read off these renders are **not** confirmed construction.
`docs/PRODUCT_CATALOG.md` remains the only authority for product facts.

### Brand marks — `app/public/brand/`

| File | Contents | Source |
|---|---|---|
| `foamico-logo.png` | FOAMICO lockup for light surfaces | `brand/foamico-logo.png` |
| `foamico-logo-light.png` | FOAMICO lockup for dark surfaces | `brand/foamico-logo-light.png` |
| `vedasleep-logo.png` | VedaSleep lotus + wordmark lockup for light surfaces, 1156×449 RGBA | `company logos/veda sleep/VEDASLEEP - LOGO.jpg.jpeg` |
| `vedasleep-logo-light.png` | The same lockup for dark surfaces. Derived from `vedasleep-logo.png` on 2026-09-01, when the VedaSleep stage went to Veda Green-Black and the near-black "VEDA" stopped being visible. **Not a re-export from the source JPEG** — it is the PNG above with its alpha channel untouched and only the dark-neutral ink moved to Paper `#F7F5F0`, scaled by pixel darkness so anti-aliased glyph edges survive. The green wordmark and gold lotus are left exactly as they are, both carrying enough hue to be excluded by the neutral test. Same method as `foamico-logo-light.png`, which was diffed against its own original to confirm it before this was built. | `brand/vedasleep-logo.png` |

The VedaSleep mark is supplied as a **JPEG on solid white**, so it cannot be used
as-is: dropped onto either brand surface it shows as a white block. It is cropped
to the artwork's bounding box and white-keyed to alpha — confident artwork below
min-channel 200 keeps its exact source colour, only the anti-aliased edge band
(200–250) is un-premultiplied, so the gold and green are not over-saturated the
way a plain luminance key does. Redo that processing if the mark is ever resupplied.

### Product textures — `app/public/textures/<product>/`

`top.png`, `top-bump.png`, `side.png`, `bottom.png` per product; FOAMICO products
are nested one level deeper (`textures/foamico/<product>/`). A product removed
from the experience takes its texture folder with it - `textures/signature/` went
when Signature did on 2026-08-26 - so nothing ships in the bundle that no page
can reach; the folder is recoverable from git if the product ever returns. `bottom.png` is also
the source of truth for that product's base-layer colour — see the base-layer rule
in `docs/PRODUCT_CATALOG.md`.

`side-badge.png` appears under `textures/foamico/riva/` only: the woven badge,
alpha-keyed out of the border photograph so it can be placed on two faces instead
of repeating with the tile. See the branding rule in `docs/PRODUCT_CATALOG.md`.

### Grid card images — `app/public/products/<product>/`

`card.jpg` for a product whose grid tile is a photograph rather than one of its
own 3D maps. Currently Sofa cum Bed only, cropped to fill the 4:3 tile so it sits
beside the mattresses' edge-to-edge quilt crops rather than floating on white.
Processed from the full-resolution JPEGs in `Foamico mattresses/Sofa cum Bed/`;
those originals are ~4–8 MB each and must never be referenced directly.

The same folder holds Sofa cum Bed's three stage plates, which are what its
product page shows in place of a canvas:

| File | Original | Position |
|---|---|---|
| `front.jpg` | `_32I0320.JPG` | Opened flat as a bed, three-quarter view |
| `side.jpg` | `_32I0319.JPG` | Part-folded, seen from the end |
| `sitting.jpg` | `_32I0315.JPG` | Folded upright as a seat |

Each is cropped to the product's own bounding box — measured as everything
darker than the studio sweep, so the contact shadow is kept — plus a margin,
then grown to 3:2 about its centre and resized to 1600px wide (JPEG q86,
progressive, 150–345 kB). The crop matters: uncropped, the product sat small in
a field of white and the plate read as an empty panel. **The white is not
trimmed away.** Every shot was taken on a white sweep, so the picture's own
ground becomes the plate the product floats on, and there is no cut-out edge to
go wrong against Key Black. Re-derive all three together if the set is ever
reshot, so one plate cannot end up framed differently from its neighbours.

### Upholstery tiles — `app/public/textures/sofa-cum-bed/`

`fabric.png` is a 512×512 seamless chenille tile standing for about 9 units of
the model's scale. Two things about how it is made are load-bearing:

- **Flatten before tiling.** Even the flattest window on the sofa carries some
  studio falloff, and mirroring turns a gradient into a regular light-dark beat
  that reads as banding once the tile repeats across a panel. Divide the swatch
  by a heavily blurred copy of itself first.
- **Mirror, do not blend.** Making edges match by averaging the swatch with its
  own mirror halves the grain in the blended strip, which showed up as wide soft
  bands. Mirroring into a 2×2 joins the edges exactly and keeps the grain
  everywhere; on an isotropic weave the symmetry does not read.

There is deliberately **no bump or normal map** derived from this photo. A
mirrored height field has a discontinuous derivative at every mirror line, and
converting it put a crease along each one — a set of hard streaks across the
backrest. Relief comes from `makeWovenNormal` instead, which is what
`layerMaterials.js` already does for photographed fabric.
