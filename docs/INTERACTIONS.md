# Interactions

## Interaction inventory
The exact current inventory should be confirmed from the source implementation.

Potential interaction categories include:
- Camera orbit/rotation
- Zoom
- Product selection
- Layer visibility
- Exploded construction
- Hotspots or information points
- Reset view
- Navigation
- Responsive touch gestures

### Variant selection
Product pages carry a pill under the product name stating the variant on screen.
Where the product's catalog entry confirms more than one variant it opens a list
of the rest, and choosing one re-renders the mattress at that variant's
thickness - and, where the catalog records a per-grade composition for the
product, from that grade's own set of bands; where it confirms exactly one, the
pill is a label and offers no choice, because there is none to offer. The list
dismisses on Escape or an outside press, returning focus to the pill.

Choosing a grade is a change to the product on screen, so it is given as one
gesture rather than a swap between frames: the build on screen releases - fading
out, easing slightly smaller, and drawing an open stack together - the geometry
changes at the point where nothing is visible, and the new build settles back in
along the same curve. In the solid view it settles from the old thickness into
the new one, so the mattress grows or shrinks into its grade instead of cutting
to it. With the stack open the bands leave and arrive in the same top-down
rhythm the explode itself uses, and a band the new grade does not have simply
does not come back - which is how you see what the grade drops. Both halves run
one curve, so choosing 6″ after 7″ is the exact reverse of choosing 7″ after 6″.
Under `prefers-reduced-motion` the change is applied without the gesture.

The pill's own label cross-fades as it changes, so the control acknowledges the
press well before the mattress has finished re-forming.

Three rules govern what that list shows:
- **It lists what you can switch to.** The variant already named on the pill is
  left out of it rather than repeated directly underneath itself.
- **Thinnest first.** The list reads as a size ladder - 5″, 6″, 6.5″, 7″ - so a
  reader can scan it by thickness rather than by grade name.
- **Natural is last, and looks different.** It is the premium grade of the
  products that offer it, so it is pinned to the end whatever it measures and
  reads in warm gold, separated by a hairline from the ladder above it. The
  colour is fixed rather than brand-themed: it marks the grade, and on
  VedaSleep - whose accent is already gold - a themed highlight would say
  nothing. The pill takes the same gold while a Natural variant is selected.

Which variant a page opens on is the product's baseline - its top grade - and
which variants a product presents at all are product-data questions owned by
`docs/PRODUCT_CATALOG.md`, not decided here.

### Opening the stack
`Layers` explodes the product into its bands and `Solid` collapses it again.
Hovering a band lights its name label; on touch, a tap does the same and the
label fades by itself, because there is no hover to stand in for.

**A band opens nothing.** The detail card that used to appear on tap - name,
role, description and a per-layer thickness - was removed on 2026-08-26 at the
product owner's instruction. Every field in it was a placeholder, so the card
promised a specification the project does not have yet. The exploded stack and
its labels are the whole of what the layer view says.

### Switching a photographed product's position
Sofa cum Bed has no camera to orbit; its stage is a photographic plate and the
control row switches between the three plates - Front, Side, Sitting - cross-
fading rather than swapping a single image, so the product changes position
instead of blinking. The buttons are the same `.mv-view-btn` pills the mattress
pages use for camera presets, in the same place, because to a viewer both do the
same job: change what you are looking at.

## Interaction principles
- Every control needs a predictable result.
- Preserve the user's current context where possible.
- Provide visible feedback for selected/active states.
- Avoid accidental activation on touch devices.
- Camera controls must have sensible limits — the specific limits are defined in `docs/CAMERA_AND_LIGHTING.md`; this file only states that limits must exist.

## Animation

This file is the single owner of general animation principles for the whole project. `docs/3D_RENDER_GUIDELINES.md` and `guidelines/DESIGN_GUIDELINES.md` reference this section rather than restating it; they only add the specific constraints unique to their own subsystem (construction-explode symmetry, and overall motion/brand feel, respectively).

Animations should:
- communicate state changes
- preserve spatial continuity
- avoid excessive duration
- remain usable on lower-powered devices
- respect `prefers-reduced-motion` — reduce to fast, functional transitions with no decorative movement when the user has this preference set

## Accessibility
Where UI controls exist, use semantic controls, visible focus states, labels, and keyboard-accessible actions.
