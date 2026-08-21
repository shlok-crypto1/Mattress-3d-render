import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Manual FLIP shared-element transition from a product grid card into that
// product's 3D viewer page. No animation library is installed in this project
// (react, react-router-dom, three - that's it), so this is plain refs + CSS
// transitions + rAF timing, coordinated through context because the card and
// its destination are two different route components: React Router unmounts
// one and mounts the other, so nothing can "just" persist across the swap
// except state that lives above <Routes>.
//
// Every hook here is additive and optional. A component that never calls them
// (or is called with transitionId=null) renders exactly as it did before this
// feature existed - that's what makes it safe to wire into all nine product
// pages while only having visually verified a couple of them.

const SELECT_HOLD_MS = 130; // Phase 1: grid recedes before the route actually changes
const FLIP_MS = 820; // Phase 2: shared-element travel
const CROSSFADE_MS = 200; // Phase 3: static image -> live canvas
const REVEAL_AT = 0.72; // Phase 4 starts at this fraction of FLIP_MS
const CANVAS_WAIT_CAP_MS = 4000; // never let a slow scene hold the crossfade forever
export const EASE_ENTER = 'cubic-bezier(0.22, 1, 0.36, 1)';

const TransitionCtx = createContext(null);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function TransitionProvider({ children }) {
  const [active, setActive] = useState(null);
  // active shape once begin() fires: {
  //   id, imageUrl, from: {top,left,width,height,radius}, to: null | {top,left,width,height},
  //   toPath, revealed: bool, canvasReady: bool, phase: 'pinned'|'flying'|'settling'|'fading'
  // }
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

  // Back button, a manual URL edit, or the "<- Catalog" link firing mid-flight:
  // any of these change the path away from what this transition expects, so
  // drop it instantly rather than let it animate toward a page that's gone.
  // Deliberately keyed only on pathname (not `active`) - it must NOT fire
  // during the Phase-1 hold, while the grid path hasn't changed yet.
  useEffect(() => {
    setActive((cur) => (cur && location.pathname !== cur.toPath ? null : cur));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // A viewport change mid-flight leaves the overlay's frozen pixel geometry
  // stale. Snapping to done is simpler and safer than re-deriving a live
  // target for a CSS transition that's already in progress.
  useEffect(() => {
    if (!active) return undefined;
    const onResize = () => reset();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, reset]);

  const begin = useCallback(({ id, imageUrl, from, toPath }) => {
    clearTimers();
    setActive({ id, imageUrl, from, to: null, toPath, revealed: false, canvasReady: false, phase: 'pinned' });
  }, []);

  // Called by the destination page once its canvas mount area has a real
  // layout box. This is what turns the "pinned" hold into the actual FLIP.
  const registerTarget = useCallback((id, to) => {
    setActive((cur) => (cur && cur.id === id && !cur.to ? { ...cur, to, phase: 'flying' } : cur));
  }, []);

  const markCanvasReady = useCallback((id) => {
    setActive((cur) => (cur && cur.id === id ? { ...cur, canvasReady: true } : cur));
  }, []);

  // Once `to` is known: schedule the Phase-4 reveal and the "near enough to
  // done" check that gates the crossfade.
  useEffect(() => {
    if (!active || !active.to || active.phase !== 'flying') return undefined;
    const id = active.id;
    const revealTimer = setTimeout(() => {
      setActive((cur) => (cur && cur.id === id ? { ...cur, revealed: true } : cur));
    }, FLIP_MS * REVEAL_AT);
    const settleTimer = setTimeout(() => {
      setActive((cur) => (cur && cur.id === id ? { ...cur, phase: 'settling' } : cur));
    }, FLIP_MS * 0.92);
    const hardCap = setTimeout(() => {
      setActive((cur) => (cur && cur.id === id ? { ...cur, canvasReady: true } : cur));
    }, FLIP_MS + CANVAS_WAIT_CAP_MS);
    timers.current.push(revealTimer, settleTimer, hardCap);
    return undefined;
  }, [active?.id, active?.to, active?.phase]);

  // Crossfade once both the movement has settled and the canvas has a real
  // frame - never reveal a blank canvas, per the brief.
  useEffect(() => {
    if (!active || active.phase !== 'settling' || !active.canvasReady) return undefined;
    setActive((cur) => (cur && cur.id === active.id ? { ...cur, phase: 'fading' } : cur));
    const t = setTimeout(reset, CROSSFADE_MS);
    timers.current.push(t);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.phase, active?.canvasReady]);

  const startCardTransition = useCallback(
    ({ id, imageUrl, rect, radius, toPath }) => {
      if (prefersReducedMotion()) {
        navigate(toPath);
        return;
      }
      begin({ id, imageUrl, from: { ...rect, radius }, toPath });
      // Hold on the grid briefly so Phase 1 (recede) is actually visible
      // before the route swap reveals the destination underneath the overlay.
      const t = setTimeout(() => navigate(toPath), SELECT_HOLD_MS);
      timers.current.push(t);
    },
    [begin, navigate]
  );

  const value = useMemo(
    () => ({ active, startCardTransition, registerTarget, markCanvasReady }),
    [active, startCardTransition, registerTarget, markCanvasReady]
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

// ---- Grid side --------------------------------------------------------

export function useCardTransition(id, toPath) {
  const ctx = useTransition();
  const imgRef = useRef(null);

  const onClick = useCallback(
    (e) => {
      if (!ctx) return; // no provider mounted - fall back to the Link's normal nav
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (prefersReducedMotion()) return; // let the plain instant route change happen
      const el = imgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return; // unmeasurable - fall back to plain nav
      const cs = getComputedStyle(el);
      e.preventDefault();
      ctx.startCardTransition({
        id,
        imageUrl: cs.backgroundImage,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        radius: parseFloat(cs.borderTopLeftRadius) || 0,
        toPath,
      });
    },
    [ctx, id, toPath]
  );

  // Other cards recede while any card's transition is in flight; the clicked
  // card doesn't need its own styling - the overlay sits on top of it.
  const isReceding = !!ctx?.active && ctx.active.id !== id;

  return { imgRef, onClick, isReceding };
}

export function useSectionRecede() {
  const ctx = useTransition();
  return !!ctx?.active;
}

// ---- Destination side ---------------------------------------------------

// A centred box within the canvas mount area, sized to comfortably frame a
// corner-view mattress without needing to pixel-match the eventual WebGL
// render - the crossfade absorbs the difference between "photo crop" and
// "3D corner view".
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

export function useEntranceRevealed(transitionId) {
  const ctx = useTransition();
  const isActiveHere = !!transitionId && ctx?.active?.id === transitionId;
  // Not entering via a transition (direct nav / refresh / mismatched id):
  // reveal immediately, matching pre-existing behaviour exactly.
  return !isActiveHere || !!ctx?.active?.revealed;
}

export function useProductEntranceTarget(transitionId, mountRef) {
  const ctx = useTransition();
  const isActiveHere = !!transitionId && ctx?.active?.id === transitionId;

  useEffect(() => {
    if (!ctx || !isActiveHere) return undefined;
    const el = mountRef.current;
    if (!el) return undefined;
    const report = () => ctx.registerTarget(transitionId, heroBoxWithin(el.getBoundingClientRect()));
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ctx, isActiveHere, transitionId, mountRef]);

  const markCanvasReady = useCallback(() => {
    if (ctx && isActiveHere) ctx.markCanvasReady(transitionId);
  }, [ctx, isActiveHere, transitionId]);

  const revealed = !isActiveHere || !!ctx?.active?.revealed;

  return { revealed, entering: isActiveHere, markCanvasReady };
}

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

  // useLayoutEffect (not useEffect): the box's CSS position/size already
  // jumped to `to` in this same commit (see the render below), so the
  // compensating transform must be applied and reflowed before the browser
  // paints, or the user would see one frame at the wrong place.
  useLayoutEffect(() => {
    if (!active?.to || playedRef.current) return undefined;
    const el = elRef.current;
    if (!el) return undefined;
    playedRef.current = true;

    const { from, to } = active;
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = from.width / to.width;
    const sy = from.height / to.height;

    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    el.style.borderRadius = `${from.radius}px`;
    el.getBoundingClientRect(); // force reflow so the inverted state actually commits

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!elRef.current) return;
        elRef.current.style.transition = `transform ${FLIP_MS}ms ${EASE_ENTER}, border-radius ${FLIP_MS}ms ${EASE_ENTER}`;
        elRef.current.style.transform = 'translate(0px, 0px) scale(1, 1)';
        elRef.current.style.borderRadius = '22px';
      });
    });
    return undefined;
  }, [active?.to]);

  if (!active) return null;

  const box = active.to ?? active.from;
  const pinned = !active.to;
  const fading = active.phase === 'fading';

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
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: pinned ? active.from.radius : undefined,
        zIndex: 2147483000,
        pointerEvents: 'none',
        opacity: fading ? 0 : 1,
        transition: fading ? `opacity ${CROSSFADE_MS}ms linear` : pinned ? 'none' : undefined,
        willChange: 'transform, opacity',
        boxShadow: '0 30px 70px rgba(0,0,0,0.24)',
      }}
    />
  );
}
