import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// One shared-element transition system for the whole site. Two kinds of
// journey run through it, deliberately sharing every timing constant and the
// same state machine rather than each getting bespoke logic:
//
//   brand selector -> brand grid   (shared element: the brand logo)
//   brand grid     -> product page (shared element: the product texture crop)
//
// No animation library is installed (react, react-router-dom, three - that's
// it), so this is manual FLIP: refs + getBoundingClientRect + CSS transitions
// on transform/opacity only, coordinated through context because the source
// and destination are different route components that React Router unmounts
// and mounts around the swap.
//
// SEQUENCING (the part that matters most):
//   1. click        - source page blurs + fades and stops taking pointer
//                     events; the shared element is lifted into a fixed
//                     overlay, pinned over its original position.
//   2. route swap   - destination mounts showing ONLY its background colour.
//                     All of its content (headings, spec lines, controls,
//                     back link) is held at opacity 0 via enterStyle().
//   3. flight       - the overlay FLIPs from the source rect to the
//                     destination rect.
//   4. settle       - once the flight is done AND (for the 3D pages) the
//                     canvas has a real first frame, the overlay crossfades
//                     out and only then does the destination's content run
//                     its staggered reveal, back link last.
//
// Every hook is additive: a component that passes a null/absent transitionId
// renders exactly as it did before this file existed. That's what makes it
// safe to wire into all eleven routes.

const SELECT_HOLD_MS = 190; // source blur/fade before the route actually swaps
const FLIP_MS = 820; // shared-element travel
const CROSSFADE_MS = 200; // overlay -> real destination element
const CANVAS_WAIT_CAP_MS = 4000; // never let a slow 3D scene stall the reveal forever
export const EASE_ENTER = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Reveal order after the shared element settles. Stagger sits in the 40-90ms
// band; every page uses these same slots so the rhythm matches site-wide.
export const REVEAL = {
  mark: 0, // logo / brand mark
  title: 55, // product name, brand wordmark
  meta: 110, // spec line, tagline
  controls: 170, // view buttons, Layers, "View collection", product cards
  back: 235, // back-navigation link - always last
};

const TransitionCtx = createContext(null);

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;

export function TransitionProvider({ children }) {
  const [active, setActive] = useState(null);
  // active: { id, imageUrl, variant, from, to, toPath, phase, canvasReady }
  // phase: 'pinned' -> 'flying' -> 'settled' -> 'revealing'
  const timers = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const reset = useCallback(() => {
    clearTimers();
    setActive(null);
  }, []);

  // Back button, a hand-edited URL, or a back-link click mid-flight: the path
  // no longer matches what this transition is travelling toward, so drop it
  // rather than animate at a page that's gone. Keyed only on pathname so it
  // does NOT fire during the pinned hold, when the path is still the source.
  useEffect(() => {
    setActive((cur) => {
      if (!cur) return cur;
      if (cur.phase === 'pinned') return cur; // hold: still legitimately on the source
      return location.pathname === cur.toPath ? cur : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // A viewport change mid-flight invalidates the frozen pixel geometry. Snapping
  // to done beats re-deriving a target for an in-progress CSS transition.
  useEffect(() => {
    if (!active) return undefined;
    const onResize = () => reset();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, reset]);

  const registerTarget = useCallback((id, to, { waitForCanvas = false } = {}) => {
    setActive((cur) => {
      if (!cur || cur.id !== id || cur.to) return cur;
      return { ...cur, to, phase: 'flying', canvasReady: !waitForCanvas };
    });
  }, []);

  const markCanvasReady = useCallback((id) => {
    setActive((cur) => (cur && cur.id === id ? { ...cur, canvasReady: true } : cur));
  }, []);

  // Flight -> settled, plus the slow-asset escape hatch.
  useEffect(() => {
    if (!active || active.phase !== 'flying') return undefined;
    const id = active.id;
    const settle = setTimeout(() => {
      setActive((cur) => (cur && cur.id === id && cur.phase === 'flying' ? { ...cur, phase: 'settled' } : cur));
    }, FLIP_MS);
    const cap = setTimeout(() => {
      setActive((cur) => (cur && cur.id === id ? { ...cur, canvasReady: true } : cur));
    }, FLIP_MS + CANVAS_WAIT_CAP_MS);
    timers.current.push(settle, cap);
    return undefined;
  }, [active?.id, active?.phase]);

  // Settled + ready -> crossfade the overlay out and release the content reveal.
  // These happen together: the destination's real element is already sitting at
  // exactly this position/size, so the swap reads as one continuous object.
  useEffect(() => {
    if (!active || active.phase !== 'settled' || !active.canvasReady) return undefined;
    const id = active.id;
    setActive((cur) => (cur && cur.id === id ? { ...cur, phase: 'revealing' } : cur));
    const done = setTimeout(reset, CROSSFADE_MS + 40);
    timers.current.push(done);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.phase, active?.canvasReady]);

  const startTransition = useCallback(
    ({ id, imageUrl, rect, radius, toPath, variant }) => {
      if (prefersReducedMotion()) {
        navigate(toPath);
        return;
      }
      clearTimers();
      setActive({
        id,
        imageUrl,
        variant,
        from: { ...rect, radius },
        to: null,
        toPath,
        phase: 'pinned',
        canvasReady: false,
      });
      // Hold briefly so the source's blur/fade is actually perceptible before
      // the route swap replaces it with the destination's bare background.
      const t = setTimeout(() => navigate(toPath), SELECT_HOLD_MS);
      timers.current.push(t);
    },
    [navigate]
  );

  const value = useMemo(
    () => ({ active, startTransition, registerTarget, markCanvasReady }),
    [active, startTransition, registerTarget, markCanvasReady]
  );

  return (
    <TransitionCtx.Provider value={value}>
      {children}
      <TransitionOverlay />
    </TransitionCtx.Provider>
  );
}

function useTransition() {
  return useContext(TransitionCtx);
}

// ---- Source side ------------------------------------------------------

/**
 * Lifts an element into the transition overlay on click.
 * variant 'card'  - a div painted with background-image (product cards)
 * variant 'logo'  - an <img> (brand logos), kept uncropped and unshadowed
 */
export function useSharedSource({ id, toPath, variant = 'card' }) {
  const ctx = useTransition();
  const ref = useRef(null);

  const onClick = useCallback(
    (e) => {
      if (!ctx) return; // no provider - let the Link navigate normally
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (prefersReducedMotion()) return; // plain instant route change
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return; // unmeasurable - fall back to plain nav
      const cs = getComputedStyle(el);
      const imageUrl =
        variant === 'logo' ? `url("${el.currentSrc || el.src}")` : cs.backgroundImage;
      if (!imageUrl || imageUrl === 'none') return;
      e.preventDefault();
      ctx.startTransition({
        id,
        imageUrl,
        variant,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        radius: parseFloat(cs.borderTopLeftRadius) || 0,
        toPath,
      });
    },
    [ctx, id, toPath, variant]
  );

  return { ref, onClick };
}

/**
 * Style for the root of a page that is being navigated AWAY from: blur + fade,
 * and pointer-events off so nothing underneath the flying element stays live.
 * Returns {} on the destination page and under reduced motion.
 */
export function useSourceRecede() {
  const ctx = useTransition();
  const location = useLocation();
  const active = ctx?.active;
  // Only the page we're leaving recedes - never the one we're arriving at.
  const leaving = !!active && location.pathname !== active.toPath;

  if (prefersReducedMotion()) return {};
  return leaving
    ? {
        filter: 'blur(9px)',
        opacity: 0.42,
        pointerEvents: 'none',
        transition: `filter ${SELECT_HOLD_MS}ms ${EASE_ENTER}, opacity ${SELECT_HOLD_MS}ms ${EASE_ENTER}`,
      }
    : {
        filter: 'none',
        opacity: 1,
        transition: `filter 260ms ${EASE_ENTER}, opacity 260ms ${EASE_ENTER}`,
      };
}

// ---- Destination side ---------------------------------------------------

/** True once the destination may show its content. Always true when not arriving via a transition. */
export function useEntranceRevealed(transitionId) {
  const ctx = useTransition();
  const active = ctx?.active;
  const here = !!transitionId && active?.id === transitionId;
  return !here || active.phase === 'revealing';
}

/**
 * Registers a plain element (e.g. the grid header's logo) as the shared
 * element's resting place. No canvas involved, so the reveal is released as
 * soon as the flight lands.
 */
export function useElementEntranceTarget(transitionId, elRef) {
  const ctx = useTransition();
  const here = !!transitionId && ctx?.active?.id === transitionId;

  useEffect(() => {
    if (!ctx || !here) return undefined;
    const el = elRef.current;
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return undefined;
    ctx.registerTarget(transitionId, { top: r.top, left: r.left, width: r.width, height: r.height });
    return undefined;
  }, [ctx, here, transitionId, elRef]);

  return useEntranceRevealed(transitionId);
}

// A centred box inside the canvas mount, sized to frame a corner-view mattress.
// It doesn't need to pixel-match the WebGL render - the crossfade absorbs the
// difference between a flat texture crop and a lit 3D corner view.
function heroBoxWithin(mountRect) {
  const pad = 0.14;
  const availW = mountRect.width * (1 - pad * 2);
  const availH = mountRect.height * (1 - pad * 2);
  const w = Math.min(availW, availH * (4 / 3));
  const h = w * (3 / 4);
  return {
    top: mountRect.top + (mountRect.height - h) / 2,
    left: mountRect.left + (mountRect.width - w) / 2,
    width: w,
    height: h,
  };
}

/** Destination hook for the 3D product pages - holds the reveal until the canvas has a frame. */
export function useProductEntranceTarget(transitionId, mountRef) {
  const ctx = useTransition();
  const here = !!transitionId && ctx?.active?.id === transitionId;

  useEffect(() => {
    if (!ctx || !here) return undefined;
    const el = mountRef.current;
    if (!el) return undefined;
    const report = () =>
      ctx.registerTarget(transitionId, heroBoxWithin(el.getBoundingClientRect()), { waitForCanvas: true });
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ctx, here, transitionId, mountRef]);

  const markCanvasReady = useCallback(() => {
    if (ctx && here) ctx.markCanvasReady(transitionId);
  }, [ctx, here, transitionId]);

  return { revealed: useEntranceRevealed(transitionId), entering: here, markCanvasReady };
}

/** Staggered entrance for one destination element. delay comes from REVEAL. */
export function enterStyle(revealed, delayMs) {
  return {
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translateY(0)' : 'translateY(12px)',
    transition: revealed
      ? `opacity 460ms ${EASE_ENTER} ${delayMs}ms, transform 460ms ${EASE_ENTER} ${delayMs}ms`
      : 'none',
  };
}

function TransitionOverlay() {
  const ctx = useTransition();
  const active = ctx?.active;
  const elRef = useRef(null);
  const playedRef = useRef(false);

  useEffect(() => {
    playedRef.current = false;
  }, [active?.id]);

  // useLayoutEffect, not useEffect: the box's CSS position/size already jumped
  // to `to` in this same commit, so the inverting transform has to be applied
  // and reflowed before paint or one frame lands at the wrong place.
  useLayoutEffect(() => {
    if (!active?.to || playedRef.current) return undefined;
    const el = elRef.current;
    if (!el) return undefined;
    playedRef.current = true;

    const { from, to, variant } = active;
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    const endRadius = variant === 'logo' ? 0 : 22;

    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    el.style.borderRadius = `${from.radius}px`;
    el.getBoundingClientRect(); // force reflow so the inverted state commits

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = elRef.current;
        if (!node) return;
        node.style.transition = `transform ${FLIP_MS}ms ${EASE_ENTER}, border-radius ${FLIP_MS}ms ${EASE_ENTER}`;
        node.style.transform = 'translate(0px, 0px) scale(1, 1)';
        node.style.borderRadius = `${endRadius}px`;
      });
    });
    return undefined;
  }, [active?.to]);

  if (!active) return null;

  const box = active.to ?? active.from;
  const pinned = !active.to;
  const fading = active.phase === 'revealing';
  const isLogo = active.variant === 'logo';

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        backgroundImage: active.imageUrl,
        backgroundSize: isLogo ? 'contain' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: pinned ? active.from.radius : undefined,
        zIndex: 2147483000,
        pointerEvents: 'none',
        opacity: fading ? 0 : 1,
        transition: fading ? `opacity ${CROSSFADE_MS}ms linear` : pinned ? 'none' : undefined,
        willChange: 'transform, opacity',
        boxShadow: isLogo ? 'none' : '0 30px 70px rgba(0,0,0,0.24)',
      }}
    />
  );
}
