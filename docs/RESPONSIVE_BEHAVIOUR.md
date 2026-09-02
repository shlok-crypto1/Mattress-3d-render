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

### The brand grid becomes one card at a time
At 620px and below, the row of product cards on a brand grid stops being a grid
and becomes a horizontally scrolled row: one card is the subject, and a fixed
24px sliver of the next one stays on screen. Above that width it is the
auto-fitting grid it has always been, unchanged. Both layouts are the same
class - `.product-lineup` in `app/src/index.css` - so a card is never rebuilt
between them, and the card component itself knows nothing about either.

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

## Breakpoints
Taken from the implementation, not chosen: these are the values in the source.

| Width | Where | What changes |
|---|---|---|
| `max-width: 620px` | `app/src/index.css` | Phone. The viewer chrome (head, wordmark tracking, control row, layer labels) and the brand grid's card row, which becomes the swipeable lineup described above. **This is the project's phone breakpoint** - a new phone rule belongs here rather than at a fourth value. |
| `max-height: 480px and (orientation: landscape)` | `app/src/index.css` | Landscape phone. The viewer header collapses so the stage keeps the height. |
| `max-width: 520px` | `app/src/components/ChatWidget.jsx` | The chat panel goes full-width. Scoped to that component's own `<style>`. |
| `innerWidth < 760` | `MattressViewer.jsx`, `SofaViewer.jsx` | Not a layout breakpoint. Read once in JS, with `(pointer: coarse)`, to pick camera framing and interaction defaults for a small screen. |
