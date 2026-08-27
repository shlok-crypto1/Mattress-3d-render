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

### Source photography — Natural grade — `Foamico mattresses/Natural/`

Cutaway renders of the Natural grade, added 2026-08-27. **Source only** — nothing
here is processed into `app/public/` or referenced by the experience yet, and no
product data has been derived from them. Sova, Ultima and Riva already carry a
Natural variant in their variant lists; these are the reference art for it.

| File | What it shows | Badge woven on the border |
|---|---|---|
| `ULTIMA NATURAL.png` | Bamboo-print cover, six bands, olive/sage border | `ULTIMA NATURAL` |
| `RIVA NATURAL.png` | Bamboo-print cover, four bands, olive/sage border | `Natural` (grade only, no product name) |
| `SOVA NATURAL.png` | White/grey patterned cover, seven bands including a speckled rebond core, grey/gold border | `ULTIMA NATURAL` |

**Resolved 2026-08-27 — the file name is right and the badge is wrong.** The badge
woven on the border in `SOVA NATURAL.png` reads `ULTIMA NATURAL`, which disagrees
with the file's own name. The full per-grade render set the product owner supplied
settles it on evidence rather than inference:

- Every product wears its own border livery across its grades. Sova's is a **grey
  border with tan/gold piping** under a **white cover with blue chevron
  brushstrokes** — identical in `SOVA CLASSIC.png`, `SOVA LUXURY.png` and in the
  mattress inside `SOVA NATURAL.png`. Ultima's is a **taupe border with cream
  piping** under a **hexagon-quilted cover** (`ULTIMA LUXURY.png`), which the
  disputed render does not have.
- The disputed render also carries the perforated cream latex band that marks the
  Natural grade in `ULTIMA NATURAL.png` and `RIVA NATURAL.png`.
- 25 of the 26 renders badge exactly what their file name says. This is the one
  outlier.

So the mattress in `SOVA NATURAL.png` is a Sova, at the Natural grade, and the badge
simply was not swapped when the render was produced. **The file keeps its name; the
render needs redoing** so the badge reads `SOVA NATURAL`. Until it is, do not derive
a badge texture from this file — the rest of it is sound.

Layer counts and colours above are described from the renders and are **not**
confirmed construction; the foam details are still to come.

### Brand marks — `app/public/brand/`

| File | Contents | Source |
|---|---|---|
| `foamico-logo.png` | FOAMICO lockup for light surfaces | `brand/foamico-logo.png` |
| `foamico-logo-light.png` | FOAMICO lockup for dark surfaces | `brand/foamico-logo-light.png` |
| `vedasleep-logo.png` | VedaSleep lotus + wordmark lockup, 1156×449 RGBA | `company logos/veda sleep/VEDASLEEP - LOGO.jpg.jpeg` |

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
