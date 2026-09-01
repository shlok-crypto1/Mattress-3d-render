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
- Exploded spacing should communicate construction. It may distort the product's *thickness* — see "An exploded band is not to scale" below — but never its footprint, its layer order, or which bands a grade has.
- Transitions should be reversible and predictable — general animation principles are owned by `docs/INTERACTIONS.md`; this file only adds the construction-specific requirement that exploding and collapsing layers must be symmetric (the reverse of an explode should retrace the same path, not a different one). **Symmetric in time as well as in path.** Easing a linear clock with a decelerating curve is right in one direction and backwards in the other: the bands left briskly and eased into their exploded positions, then drifted on the way back and covered the last 27% of their travel in the final 70ms, arriving at full speed. The curve is flat at both ends instead, so each direction is the other's mirror — and stays a pure function of the clock, so reversing part-way through cannot make a position jump.

## An exploded band is not to scale

Bands are built `LAYER_INFLATE` times thicker than the mattress they came out
of (2.2x as of 2026-08-31), and the whole stack is squashed back to the
product's real height while it is closed. The exaggeration therefore exists
only in the open view.

The reason is arithmetic: a true 6"-10" split over six to eight bands leaves
each layer under an inch thick, and at the distance the exploded view is framed
from that renders as a sheet of paper rather than a slab of foam - which is the
one thing the layers view exists to show. The product owner asked for broader
layers on 2026-08-31 and explicitly accepted the consequence.

Three properties keep it honest, and a change here must preserve all three:

- **The closed mattress is untouched.** It is a separate mesh and keeps its
  declared thickness exactly. The thing that has to read as a real product
  still does.
- **The stack matches the mattress at rest.** The squash is undone gradually
  across the explode rather than at the end of the cross-fade, so the stack is
  still near the product's real height for as long as the solid box is visible
  behind it. The exaggeration is never on screen next to the thing it
  exaggerates.
- **Geometry is built oversize and scaled down, never the reverse.** The bands
  are at their native proportions exactly when they are being looked at, so the
  wall grain and the sculpted relief are never stretched in the open view.

What this costs: an exploded Classic and an exploded Luxury are no longer to
scale against each other, and no dimension may be read off the exploded stack.
Thickness as a product fact lives in `docs/PRODUCT_CATALOG.md` and nowhere else.

## Bands dominate the gaps

The exploded gap is a fraction of average band thickness - `GAP_FRACTION`, 0.4
as of 2026-08-31 - and not a separation solved on its own. Solved on its own it
came out as large as the slabs or larger, and a stack whose air dominates its
foam reads as a row of uniform floating cards whatever the real proportions are.
At 0.4 a band is two and a half times the air above it, so a band that is
genuinely 1.5x another one looks it.

**`gap` means clear air, not centre-to-centre spacing**, and the two are not
interchangeable here. Once the gap is smaller than a band, spacing band centres
by it puts every band inside its neighbours and the stack renders as one solid
blob. The bands are therefore laid out by walking the stack - each offset by
half its own thickness, half the previous one's, and the gap - which also makes
the band-to-gap ratio exact for every pair rather than true only on average.

Two knobs, and they are independent:

- **`GAP_FRACTION`** (`layerStack.js`, useful range 0.3-0.5) sets how much the
  bands dominate. Lower means thicker-looking bands.
- **`EXPLODE_SCALE`** (`MattressViewer.jsx`) sets how large the open stack sits
  in the viewport. **Its ceiling is clipping, not taste**: the tallest-framed
  stack must stay fully in frame at full explode, and Luma Luxury at eight bands
  is the one to check first. Do not dolly the camera instead - `EXPLODE_DIST`
  stays where it is.

The stack normalises its own true exploded height against a framing reference so
that a smaller gap cannot simply let it grow until it overflows. What that
normalisation cancels is worth knowing: on screen the stack spans the reference,
which contains no inflated term at all, so **`LAYER_INFLATE` drops out of the
framing entirely**. It sets the band-to-gap ratio, not the size on screen.

## The stage is full-bleed and the chrome floats on it

The canvas fills the viewport. The title, the variant pill and the control row
are positioned over it rather than taking layout space beside it.

It used to be a box with the head above and the controls below, and those two
boundaries were visible as a band of Key Black on FOAMICO and Stage Grey (the
VedaSleep stage of the time, superseded by Veda Green-Black on 2026-09-01) on
VedaSleep. Worse, the box cropped the product: zooming in ran the mattress into
a hard edge partway down the screen.

Two things this requires, and a third it must not break:

- **The camera has to be pulled back by the height of the chrome.** The 32
  degree fov is *vertical*, so a taller canvas holds the same world height and
  proportionally *less* world width - about 50% less on a desktop window, which
  puts a wide mattress well into clipping at the sides. The viewer measures the
  head and the control row and pulls back by the ratio of the full viewport to
  what is left after them. That cancels exactly: world height scales by the same
  factor the canvas grew, so pixels-per-inch is unchanged and the product
  renders at precisely the size and position it had inside the box, with the
  stage simply carrying on behind the chrome. **Measure it; do not hard-code a
  reference aspect** - the control row rewraps at the phone breakpoints.
- **The fit is applied in one place**, where the camera is positioned, so every
  distance in the viewer stays in the logical units it was tuned in: the view
  presets, the pinch clamps and the explode park all scale together.
- **Floating chrome must not swallow drags meant for the model.** The bars are
  `pointer-events: none` and only the controls inside them take the pointer
  back. A bar that eats the pointer makes the bottom of the mattress
  un-draggable, which is not obvious from looking at it.

This is scoped to the mattress viewer (`.mv-immersive`). Sofa cum Bed wears the
same chrome classes but is a photographic plate in normal flow, and still wants
its head and controls to occupy space.

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
