# Materials and Textures

## Purpose
Define how physical mattress materials are represented in the 3D experience.

## Material categories
Use verified categories such as:
- Fabric/cover
- Foam
- Latex
- Springs
- Support structure
- Stitching/piping
- Other construction materials

Exact material claims must come from approved product data.

## Rules
- Material names should map consistently to product data.
- Avoid using colour alone to distinguish materials.
- Texture scale must remain physically credible.
- Normal/roughness maps should be used only when they materially improve appearance.
- Avoid textures that visibly repeat at an unrealistic scale.
- **A repeating texture must contain nothing that should not repeat.** Branding,
  labels, tags and badges are singular features of a product; baked into a tiling
  photograph they multiply by however many times that photo wraps. Keep them out
  of the tile and place them separately. Which faces they belong on is a product
  fact and lives in `docs/PRODUCT_CATALOG.md`.
- **A tile derived from a photograph must be flattened and mirrored, not blended.**
  Blending a swatch against its own mirror to close the seam halves the grain in
  the blended strip; residual studio falloff left in the swatch becomes periodic
  banding once mirrored. Divide out the low frequencies, then mirror into a 2×2.
- **A tiling displacement function must be periodic for negative coordinates too.**
  Slab geometry is centred on the origin, so half of every surface has negative
  x and z. JavaScript's `%` takes the sign of the dividend, so `(v / cell) % 1`
  is negative there and any wave built on it is both inverted and out of range -
  the pyramid transition's triangle wave peaked at 2.98 instead of 1, cutting
  nearly three times deeper than its stated amplitude across half of every
  sheet. Use `p - Math.floor(p)` for the fractional part. Check a new
  displacement function over the full negative-to-positive span, not just the
  positive half.
- **Do not derive a normal map from a mirrored height field.** The values match
  across a mirror line but the derivative does not, so the conversion leaves a
  crease along every seam. Pair the photographed colour with a procedural weave
  normal instead — the pattern in `src/lib/layerMaterials.js`.
- **Relief that only exists in the mesh does not exist.** A quilt's puffed cells
  were reconstructed into the cap tessellation and nowhere else, which is about
  a third of an inch across six feet of mattress: two or three pixels on screen,
  none at all on a grid card, and nothing whatever in the shading. The pattern
  was therefore lit as though printed on a flat sheet — the exact thing a quilt
  must not look like. Anything at the scale of a construction feature has to be
  in the normal map as well as in the geometry, from the same reconstruction, so
  it shades at any distance. `src/lib/quiltSurface.js` folds its puff field into
  the same height map the weave comes from, referencing the slope it contributes
  rather than fixing it, because how big a product's cells are decides how steep
  that slope is.
- **A material property is scaled against the thing it belongs to.** Quilt loft
  belongs to the panel and the wadding sewn into it, not to what is underneath,
  so it is stated in inches and capped against the quilted panel — not taken as
  a fraction of the mattress's total thickness. Read the wrong way, one ticking
  puffed 0.24″ on a 6″ grade and 0.40″ on a 10″ one: one product, two different
  quilts, and the difference showed on the silhouette every time a grade
  changed.

## Asset naming
Use stable, descriptive names and document mappings in `ASSET_MANAGEMENT.md`.
