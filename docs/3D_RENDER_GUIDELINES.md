# 3D Render Guidelines

## Objective
Present mattresses as physically credible products while keeping interaction fast and understandable.

## Model standards
- Preserve real product proportions.
- Keep model origin and orientation consistent across products.
- Use consistent naming for model nodes and materials.
- Avoid unnecessary geometry complexity.
- Keep hidden/internal geometry out of the render when it is not needed.

## Layer / construction views
If the experience exposes internal construction:
- Layers must retain their real order, per `docs/PRODUCT_CATALOG.md`.
- Layer labels must correspond to verified product data in `docs/PRODUCT_CATALOG.md`.
- A product's grades may be built from different sets of bands, but only where `docs/PRODUCT_CATALOG.md` records the composition for each grade. A band a grade keeps holds its own identity and its own number across every grade of that product, so the numbering runs with gaps in it rather than being closed up - the gap is what shows which bands the grade leaves out.
- Where a grade drops bands, the survivors fill that grade's declared height under the per-grade thickness rule recorded against the product; upholstery does not silently thicken because foam was removed from underneath it.
- Exploded spacing should communicate construction without distorting the product.
- Transitions should be reversible and predictable — general animation principles are owned by `docs/INTERACTIONS.md`; this file only adds the construction-specific requirement that exploding and collapsing layers must be symmetric (the reverse of an explode should retrace the same path, not a different one).

## Rendering
- Maintain consistent lighting between product states — see `docs/CAMERA_AND_LIGHTING.md` for the full lighting standard.
- Material realism (physically plausible response, avoiding flat colors, texture scale) is owned entirely by `docs/MATERIALS_AND_TEXTURES.md` — this file does not restate those rules.

## Interaction
Any 3D interaction should have a clear purpose: inspect, compare, understand construction, or navigate.

## Products that are not mattresses

Not every product in the catalogue is a slab. `MattressViewer` is built around
one — a euro-top box, a quilt reconstructed from a top-face photo, an explodable
layer stack — and a product with a different form gets its own model and viewer
rather than being forced through it, because a slab wearing another product's
fabric misrepresents the shape (see Asset integrity below). Sofa cum Bed is the
first of these: `src/lib/sofaModel.js` and `src/components/SofaViewer.jsx`.

**A product may also be photographed instead of rendered.** Sofa cum Bed is, as
of 2026-08-26: its page shows three studio plates of the fold rather than a
model of it (`src/components/SofaPhotoViewer.jsx`), and the model above is kept
but no longer routed. Photography wins where the thing worth showing is a state
change the studio already recorded and an orbit would not reveal. The shared
requirements below apply either way - a photographed product page is still a
product page.

## Bands are the size of the product

Every band in an exploded stack occupies the product's own footprint, whatever
it is made of. Luma's pocket unit is the case that made this a rule: laid out at
a fixed pitch from a fixed inset, its springs stopped several inches short of
the edge on all four sides and read as a smaller mattress inside the mattress.
The spring count still comes from a target pitch - that is density, a product
question - but the spacing is solved to fill the footprint it is handed. A band
may only pull in from the edge for a reason the geometry gives it, such as the
rounded corner the slabs are cut with.

What such a viewer must still share, as modules rather than by copying:
- the studio rig, exposure and tone mapping, so one product is not lit in a
  different studio from the next (`docs/CAMERA_AND_LIGHTING.md`)
- the brand chrome and the `.mv-*` viewer styles in `src/index.css`
- the entrance and shared-element transition hooks
- the view-preset row, minus any control the product has no use for

Where a model's proportions come from photographs rather than a spec sheet, say
so at the top of the model file and record it in `docs/PRODUCT_CATALOG.md`. Those
numbers describe shape, not size, and must not be quoted as dimensions.

## Asset integrity
Never substitute a placeholder model for a production model without explicitly marking it as temporary.
