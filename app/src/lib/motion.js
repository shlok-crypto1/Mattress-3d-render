// The site's motion system, in one place.
//
// These values were already consistent - they were just spread across
// ProductTransition.jsx, MattressViewer.jsx, ProductCard.jsx and four pages,
// as private constants and as numbers inlined into template strings. Collecting
// them changes nothing about how anything moves; it makes the rhythm something
// you can read, and keeps the next duration from being invented at the point of
// use.
//
// The bands below are the ones a premium product site tends to settle on, and
// every value here sits inside its band:
//
//   microinteraction   150-250ms
//   UI transition      250-450ms
//   camera move        600-1200ms
//   product transition 800-1500ms
//   hero entrance      1000-2000ms

export const MOTION = {
  /** Hover, crossfade, active-state flips. */
  fast: 200,
  /** A control or panel changing state. */
  normal: 320,
  /** An element arriving on screen. */
  enter: 460,
  /** Source page receding before a route actually swaps. */
  hold: 190,
  /** Shared-element flight between grid and product. */
  product: 820,
  /** Camera easing toward a view preset. Damped, so this is nominal. */
  camera: 900,
  /** Layer stack opening or closing. */
  explode: 720,
  /** Per-layer offset within the explode. Seconds - it drives the raf clock. */
  explodeStagger: 0.07,
  /** Never let a slow 3D scene stall a reveal forever. */
  canvasWaitCap: 4000,
};

export const EASE = {
  /** Decelerating; everything that arrives uses this. */
  enter: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

/**
 * Reveal order after a shared element settles.
 *
 * Every page uses these same slots, which is what makes the rhythm feel like
 * one site rather than several. The gaps sit in the 40-90ms band: enough to
 * read as sequence, not enough to feel like waiting. Back-navigation is always
 * last - it is the one thing that should not compete with the product.
 */
export const REVEAL = {
  mark: 0,
  title: 55,
  meta: 110,
  controls: 170,
  back: 235,
};

/** Offset between sibling cards or pills revealing in a row. */
export const REVEAL_STEP = 45;
