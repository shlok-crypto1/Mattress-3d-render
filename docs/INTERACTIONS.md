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
- **Natural is last, and it is marked by its colour alone.** It is the premium
  grade of the products that offer it, so it is pinned to the end whatever it
  measures, separated by a hairline from the ladder above it, and set in Kiwi
  Green where that ladder is set in the menu's own ink. It carried a filled
  highlight until 2026-08-27 - a warm gold wash, a tinted border and heavier
  type, on the row and on the pill both - which the product owner removed: a
  filled row inside a list of unfilled ones reads as a selected state rather
  than as a grade, and one green word among white ones already says "a
  different kind of choice". The pill takes no Natural treatment at all now.
  The hairline is not part of the highlight and stays; it is what makes "pinned
  to the end" read as an order rather than as an odd sort. The colour is fixed
  rather than brand-themed because it marks the grade, not the brand - and only
  FOAMICO products offer Natural, so it never puts Kiwi Green on a VedaSleep
  screen. Re-check that against the brand-mixing rule in
  `guidelines/DESIGN_GUIDELINES.md` if VedaSleep ever gains a Natural grade.

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

**Labels are spaced against each other, not only against their bands.** A label
is anchored to its own band's projected corner - that is what makes it point at
its layer - but the anchor says nothing about the label next to it, and six to
eight bands over the height the stack is framed at put the pills closer together
than a pill is tall. The list then reads as one block of text rather than as six
to eight names. They are therefore pushed apart to a minimum pitch once every
anchor for the frame is known, and the run is translated as a whole rather than
each label being clamped individually, so the list stays centred on where the
bands actually are and no label can cross its neighbour.

**The Bottom view names the underside.** Selecting Bottom puts a single callout
on screen reading `ANTI SKID FABRIC` - the same pill and the same bent leader
the layer labels use, anchored to the underside's own projected corner and
flipping to the other side when a narrow viewport leaves no room. It is the one
view besides Layers that names anything, and the two never appear together: the
callout hides the moment the stack opens, because the Layers view already names
every band and does not want a stray ninth pill among them. **Riva shows no
callout at all** - the product owner excluded it and gave no name, which
`docs/PRODUCT_CATALOG.md` records. Everything below about how a label is drawn
applies to it too.

**A leader line joins each label to its own band**, and the two features are one
design: the spacing pass is what separates a pill from the band it names, so
without a line the connection is guesswork. The line is the printed-callout
shape - a diagonal run from the band's own projected corner to an elbow, then a
short horizontal into the pill - because the bend is what makes it read as
pointing at something rather than as a stray diagonal.

**The pills line up in one column where there is room for one.** Parked
individually beside their own band, each pill sits a few pixels from its anchor
and the leader is a stub: it reads as a tick on the mattress rather than as a
line joining two things. Aligning the left edges puts the pills clear of the
product and gives every leader a length of its own, which is what makes the set
read as a callout diagram rather than as scattered tags. The column is only used
when it genuinely clears the widest anchor; on a narrow viewport each pill falls
back to sitting beside its own band, which is what it did before there were
leaders. The lines are decorative - the pill is the hit target - so they are
`aria-hidden` and transparent to the pointer.

Two things this must keep doing. It runs in the order the labels land in **on
screen**, not in stack order: the camera can be orbited below the mattress, and
from there the top band projects below the bottom one, so assuming stack order
would drag every label to the wrong end of the frame for the whole of that view.
And it never asks for more pitch than the stage can give - on a short viewport
the pills close up a little instead of the list detaching from the stack to span
a height the mattress does not occupy.

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

Two rules about *how* they are driven, both learned the hard way:

- **Run every timeline off the clock, never off the frame.** A per-frame step is
  a different animation on every display: the camera's damper took a flat 8% of
  the remaining distance each frame, which converges twice as fast on a 120Hz
  panel as on a 60Hz one and visibly slows down and speeds up again through any
  dropped frame. The idle auto-orbit had the same shape. Both now advance on the
  frame's own `dt`, and durations are stated in `src/lib/motion.js` in
  milliseconds, so a move takes as long as the table says it does everywhere.
  For a damper that means a time constant rather than a per-frame fraction —
  `MOTION.camera / 4.6`, an exponential settle being within 1% after ln(100)
  time constants.
- **Never read layout inside an animation loop.** Reading
  `getBoundingClientRect` or `offsetWidth` after writing a style forces the
  browser to lay the page out again then and there, and it cannot batch the
  work. The layer labels did exactly that once per band per frame — eight forced
  layouts a frame through the whole explode and every grade change, and none at
  all in the camera path, which is the shape of "the explode is rough and the
  orbit is fine". Measure on resize, cache against what was measured, and let
  the loop write only.

## Accessibility
Where UI controls exist, use semantic controls, visible focus states, labels, and keyboard-accessible actions.
