# Responsive Behaviour

## Objective
The 3D experience must remain usable across desktop, tablet and mobile widths.

## Desktop
- Prioritize the 3D product view.
- Keep controls accessible without covering important product geometry.
- Preserve intended composition.

## Tablet
- Reduce secondary UI before reducing the product view.
- Maintain usable touch targets.
- Prevent control panels from overlapping critical product areas.

## Mobile
- Prioritize product visibility and primary actions.
- Use touch-friendly controls.
- Avoid requiring hover.
- Keep text legible without excessive zoom.
- Prevent horizontal overflow.

### The lineup is three across, and the card is a plate with words under it
The count is the composition, not a fit: **three columns from 1024px, two below
it, and the swipe row below 620px.** A column count rather than an auto-fitting
minimum, because auto-fit puts five plates across a wide screen and turns a
lineup back into a table of thumbnails. Six FOAMICO products read as two rows of
three and VedaSleep's three as one row of three, so a card is the same object in
both lines.

The card itself is a picture plate with the name and tagline centred underneath
it, on the page rather than inside a box:

- **The plate is 1:0.95** — near-square, a touch wider than tall — with a 24px
  radius, at every width. It carries the picture, the "Coming soon" chip and the
  hover lift, and it is also the shared element the 3D flight starts from, so
  its ratio is the shape that transition begins in.
- **560px is where it lands at full container width.** Three plates plus their
  two 32px gutters is what sets the grids' 1744px maximum; the plate reaches
  560px at roughly 1800px of viewport and scales down with the column below
  that (443px at 1440, 304px at 1024).
- **The name is 30px where there is room and 26px where there is not.** The
  floor is what SOFA CUM BED, the longest name, fits on one line inside a phone
  card at this tracking. Montserrat 800 in caps either way - the type is the
  brand's, only its size is responsive.
- **The tagline is 18px, two lines, on a 34ch measure.** The measure is what
  makes 7-10 words break as two balanced lines rather than one long and one
  short; the line clamp is the guard for longer copy arriving later. What it
  says is a product fact - see `docs/PRODUCT_CATALOG.md`.
- **There is no swatch row.** Apple's dots are colours; these products vary by
  grade and thickness, which a dot cannot state, and on a phone they would have
  sat directly above the carousel's own position marks. The slot is closed
  rather than filled - product owner's decision, 2026-09-02.

### The page ground is the route's, not the document's
A phone browser paints more than the page. iOS Safari tints its status bar and
its bottom toolbar from the page's colour, and a rubber-band overscroll uncovers
that same colour past either end of a scroll - so on an iPhone the site drew a
cream band above and below a Key Black page, which is what
`--page-ground` exists to stop.

- **The ground is a route's property.** `PageGround` in `app/src/App.jsx` sets
  `--page-ground` and the `theme-color` meta on every navigation, from the same
  per-brand table the route holding screen uses. Both are set because Safari
  uses both: `theme-color` is what it prefers and the only one that reaches the
  bottom toolbar, and the custom property is what actually paints the document
  and what every other browser overscrolls into.
- **The selector takes the panel at the top.** It is the one split screen and a
  canvas takes a single colour, so it takes FOAMICO's Key Black - the half the
  status bar sits over, and the panel a phone stacks first.
- **This is not the same thing as a page background.** Every page still paints
  its own, full-bleed, over a ground that already matches it. Nothing here
  should ever be the reason a page looks right.
- **Not solved with safe-area padding.** `env(safe-area-inset-*)` insets content
  away from the edges; the bands were never content, and padding the page would
  have moved the problem inward rather than removed it. The insets stay where
  they already are, on the viewer's own floating chrome.

### The brand grid becomes one card at a time
At 620px and below, the row of product cards on a brand grid stops being a grid
and becomes a horizontally scrolled row: one card is the subject, and a fixed
24px sliver of the next one stays on screen. Both layouts are the same class -
`.product-lineup` in `app/src/index.css` - so a card is never rebuilt between
them, and the card component itself knows nothing about either.

What the sizing is solved for, in order:
- **The card is 80-84% of the screen** at every width from 320px up. It is
  written as "the screen, less the page margin, less one gap, less the sliver",
  which is the same statement as "a card and a bit of the next one fit exactly",
  rather than as a percentage that happens to look right on one phone.
- **The sliver is the same width on every phone.** It is the whole reason the
  row reads as scrollable before anything moves, so it is a fixed 24px rather
  than a share of the screen that would vanish on a small one. Past roughly
  460px the card hits its 84vw ceiling and the extra room widens the sliver
  instead - the better of the two ways to spend it, since a card that keeps
  growing only gets taller.
- **The first card starts on the page's own left margin** and the last one
  rests against its right one. The row cancels the page's 24px padding with a
  negative margin and re-applies it as its own, which is what lets a card
  scroll to the screen edge without the first one starting there. `--lineup-gutter`
  in the phone block has to stay in step with the horizontal padding on the
  catalog pages' root element.
- **The row cannot scroll vertically.** Its block axis is explicitly hidden and
  it carries 14px of block padding, cancelled by an equal negative margin, so a
  card lifting under a thumb or rising on entrance has somewhere to go and the
  row still occupies the height it did.

The gesture and the position marks under the row are `docs/INTERACTIONS.md`.

### The document is the whole screen, and the edges are held off by hand

`viewport-fit=cover` in `app/index.html`. Without it a phone lays the page out
inside the safe area and paints the strip above and below it in a colour of its
own choosing, so a full-screen page arrives bracketed by two blocks that belong
to nothing on it. With it the page's own ground runs edge to edge and the
browser's furniture floats over it.

That is the whole of the benefit and the whole of the cost. Anything anchored to
an edge is now under whatever is over that edge unless it holds itself off, and
the four insets are named once at the top of `src/index.css`:

```
--safe-top  --safe-right  --safe-bottom  --safe-left
```

They alias `env(safe-area-inset-*)` with a `0px` fallback, which is every
desktop and every phone without a notch. Aliasing rather than using `env()`
directly buys two things: the fallback is written once, and a layout can be
checked at a notch's dimensions by setting four custom properties instead of
being taken to a phone.

**Everything at an edge takes them.** The viewer's back link, header and control
row; the catalog pages' padding and their back link; the brand selector's two
panels; the guide's launcher and its full-screen frame. The rule is that the
*surface* bleeds and its *content* insets - never the other way round, because a
surface that stops short of the edge is the band this was meant to remove.

**A framed document cannot see an edge.** Safe-area insets are measured against
the top-level viewport, so inside the guide's iframe they are all zero whatever
shape the screen is. The page hosting the frame is the only side that can inset
it, which is why the guide's panel bleeds and the frame inside it is held off
all four edges by `ChatWidget`, not by the guide's own stylesheet.

**The insets go on the frame, not as padding on the panel.** The frame is
positioned absolutely, and an absolutely positioned box is laid out against its
container's *padding* box - padding on the panel moves it not at all. The frame
is also sized explicitly rather than stretched between offsets: an iframe is a
replaced element, and an auto width between a left and a right offset resolves
to its intrinsic 300x150 with the offsets ignored.

## The viewer's button row on a phone
Front, Side, Top, Bottom, the divider and Layers stay on one line at every phone width,
with no sideways scroll. Below 620px the row's type (11-12.5px), button padding (9-17px)
and gaps scale with the screen width, sized so that this longest row fits from 320px up.
It reaches full size by about 390px. The buttons keep a 44px touch height throughout.

It used to scroll sideways at a fixed size. On a 340px screen that put Layers, the
control that opens the stack, past the right edge with nothing to show it was there.
The scroll remains only as a fallback, for a row that is ever wider than the screen:
the row sizes to its content and is centred, so an overflowing row starts at its first
button and scrolls, instead of being cut off at both ends.

Measured in headless Chrome at 320, 340, 360, 375, 390, 412, 430, 480 and 620px wide,
and in landscape at 844x390 and 932x430. No row overflowed.

## Breakpoints
Taken from the implementation, not chosen: these are the values in the source.

| Width | Where | What changes |
|---|---|---|
| `max-width: 620px` | `app/src/index.css` | Phone. The viewer chrome (head, wordmark tracking, control row, layer labels) and the brand grid's card row, which becomes the swipeable lineup described above. **This is the project's phone breakpoint** - a new phone rule belongs here rather than at a fourth value. |
| `max-height: 480px and (orientation: landscape)` | `app/src/index.css` | Landscape phone. The viewer header collapses so the stage keeps the height. |
| `max-width: 620px` | `app/src/components/ChatWidget.jsx` | The Mattress Guide stops being a corner panel and becomes the screen, the launcher hides while it is open, and the page behind it stops scrolling. The launcher and its label follow the design's phone version: a 46px disc (56px on a desktop) 16px from the edge, and the label at 10px, right-aligned on two lines ("For Product Details / and Prices →") in a 170px column. A further rule, `(max-width: 620px) and (max-height: 700px)` in the same file, hides the label on the brand selector, where a short phone puts the VedaSleep "View collection" in the launcher's row. Scoped to that component's own `<style>`. Moved from 520px on 2026-09-02 to match the phone breakpoint above. |
| `max-width: 560px` / `380px` | the guide's own document | **These measure the panel, not the display.** The frame is 400px wide on a desktop and the screen on a phone, so the guide's own queries are what shape its header in both - which is why its narrow-panel header is the one the site actually shows. |
| `innerWidth < 760` | `MattressViewer.jsx`, `SofaViewer.jsx` | Not a layout breakpoint. Read once in JS, with `(pointer: coarse)`, to pick camera framing and interaction defaults for a small screen. |
