import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { publicUrl } from '../lib/publicUrl';
import { makeStudioEnvironment } from '../lib/foamSurfaces';
import { buildSofaCumBed } from '../lib/sofaModel';
import { BRAND_THEMES } from '../data/brandThemes';
import { MOTION, EASE } from '../lib/motion';
import { useProductEntranceTarget, enterStyle, prefersReducedMotion } from '../transition/ProductTransition';

// Viewer for the Sofa cum Bed.
//
// NOT CURRENTLY ROUTED. The product page shows the supplied studio photography
// instead (see SofaPhotoViewer.jsx), which is the product owner's decision of
// 2026-08-26 and not a fault in this model. It is kept, with sofaModel.js,
// because it is a complete working viewer and the photography could be
// superseded; nothing imports it, so it costs nothing in the bundle.
//
// Deliberately a separate component from MattressViewer rather than a mode
// inside it. That file's whole spine is mattress-shaped - one euro-top slab, a
// quilt reconstructed from a top-face photo, an explodable layer stack - and a
// folding three-panel sofa shares none of it. What the two DO share is the
// studio rig, the orbit, the entrance and the chrome, and those are shared as
// modules (foamSurfaces, brandThemes, motion, ProductTransition) rather than by
// threading a second product shape through code that assumes the first.
//
// No Layers control: the product has no layers to open. The fold does have a
// second position - flat, as a bed - and the model is built so that could be
// driven later, but it is not wired to a control yet.

const VIEW_DEFS = [
  ['front', 'Front', 0, 0.12],
  ['side', 'Side', Math.PI / 2, 0.12],
  ['top', 'Top', 0, 1.35],
  ['bottom', 'Bottom', 0, -1.35],
];

/** Resting three-quarter framing, matching the mattress pages' default. */
const CORNER_VIEW = { key: 'corner', theta: 0.6, phi: 0.5 };

function deviceQuality() {
  if (typeof window === 'undefined') return 1;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const small = window.innerWidth < 760;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || small || weak ? 0.6 : 1;
}

export default function SofaViewer({ product, brand = 'foamico', transitionId = null, backTo = '/foamico' }) {
  const mountRef = useRef(null);
  const s = useRef({}).current;
  const [view, setView] = useState(CORNER_VIEW.key);
  const t = BRAND_THEMES[brand] ?? BRAND_THEMES.foamico;

  const { revealed: sharedRevealed, entering, markCanvasReady } = useProductEntranceTarget(transitionId, mountRef);
  // Whether a shared-element arrival is in flight is fixed for the life of the
  // mount, so it is captured once in state rather than read off a ref during
  // render - same as MattressViewer.
  const [directEntry] = useState(() => !entering);
  const [directRevealed, setDirectRevealed] = useState(false);
  const revealed = directEntry ? directRevealed : sharedRevealed;
  const animated = !!transitionId || directEntry;

  // Mirrored onto the scene state in an effect, not during render: the render
  // pass must not write to a ref, and the tick loop only ever reads it.
  useEffect(() => {
    s.markCanvasReady = markCanvasReady;
  }, [markCanvasReady, s]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let disposed = false;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Same tone mapping and exposure as the mattress pages, so a product seen
    // on one route does not look like it was lit in a different studio.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.92;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    const envRT = makeStudioEnvironment(renderer);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.35;

    // The mattress rig, unchanged: hemisphere plus key plus grazing fill, and
    // the bounce that keeps a downward-facing surface off black.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a958c, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(30, 80, 50);
    scene.add(key);
    const graze = new THREE.DirectionalLight(0xffffff, 1.1);
    graze.position.set(-55, 18, 25);
    scene.add(graze);
    const bounce = new THREE.DirectionalLight(0xffffff, 3.5);
    bounce.position.set(0, -60, 0);
    scene.add(bounce);

    const group = new THREE.Group();
    scene.add(group);

    const quality = deviceQuality();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const loader = new THREE.TextureLoader();
    const loaded = [];
    const load = (url, onDone) => {
      const tex = loader.load(url, () => {
        s.dirty = true;
        onDone?.(tex);
      });
      tex.anisotropy = maxAnisotropy;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      loaded.push(tex);
      return tex;
    };

    let fabricReady = false;
    const fabric = load(publicUrl(product.model.fabric), () => { fabricReady = true; });

    let sofa = null;
    const build = () => {
      if (disposed || sofa) return;
      sofa = buildSofaCumBed({
        fabricMap: fabric,
        env: envRT.texture,
        quality,
        maxAnisotropy,
      });
      group.add(sofa.group);
      // Frame on the assembly's own size rather than a hardcoded distance: the
      // sofa is roughly half a mattress across, so the mattress framing would
      // leave it as a chip in the middle of the canvas.
      const span = Math.max(sofa.bounds.width, sofa.bounds.height);
      s.fitDist = span * (mount.clientWidth < 560 ? 3.4 : 2.6);
      s.tDist = s.dist = s.fitDist;
      s.dirty = true;
    };

    s.theta = s.tTheta = CORNER_VIEW.theta;
    s.phi = s.tPhi = CORNER_VIEW.phi;
    s.dist = s.tDist = 120;
    s.dirty = true;
    s.view = CORNER_VIEW.key;

    // ---- orbit ------------------------------------------------------------
    let dragging = false;
    let prev = [0, 0];
    const onDown = (e) => {
      dragging = true;
      prev = [e.clientX, e.clientY];
      mount.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!dragging) return;
      s.tTheta += (e.clientX - prev[0]) * 0.006;
      s.tPhi = Math.min(1.45, Math.max(-1.45, s.tPhi + (e.clientY - prev[1]) * 0.006));
      prev = [e.clientX, e.clientY];
      s.dirty = true;
    };
    const onUp = (e) => {
      dragging = false;
      mount.releasePointerCapture?.(e.pointerId);
    };
    const onWheel = (e) => {
      e.preventDefault();
      const fit = s.fitDist ?? 120;
      s.tDist = Math.max(fit * 0.55, Math.min(fit * 1.8, s.tDist * (1 + Math.sign(e.deltaY) * 0.08)));
      s.dirty = true;
    };
    mount.addEventListener('pointerdown', onDown);
    mount.addEventListener('pointermove', onMove);
    mount.addEventListener('pointerup', onUp);
    mount.addEventListener('pointercancel', onUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (sofa) {
        const span = Math.max(sofa.bounds.width, sofa.bounds.height);
        s.fitDist = span * (w < 560 ? 3.4 : 2.6);
        s.tDist = s.dist = s.fitDist;
      }
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    let reported = false;
    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (!sofa && fabricReady) { build(); resize(); }
      const moving =
        Math.abs(s.tTheta - s.theta) > 1e-4 ||
        Math.abs(s.tPhi - s.phi) > 1e-4 ||
        Math.abs(s.tDist - s.dist) > 1e-3;
      if (!moving && !s.dirty) return;
      const k = 0.16;
      s.theta += (s.tTheta - s.theta) * k;
      s.phi += (s.tPhi - s.phi) * k;
      s.dist += (s.tDist - s.dist) * k;
      const cp = Math.cos(s.phi), sp = Math.sin(s.phi);
      camera.position.set(s.dist * cp * Math.sin(s.theta), s.dist * sp, s.dist * cp * Math.cos(s.theta));
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      s.dirty = false;
      if (sofa && !reported) {
        reported = true;
        s.markCanvasReady?.();
        s.onFirstFrame?.();
      }
    };
    tick();

    s.goTo = (theta, phi) => {
      const twoPi = Math.PI * 2;
      s.tTheta = theta + Math.round((s.tTheta - theta) / twoPi) * twoPi;
      s.tPhi = phi;
      s.tDist = s.fitDist ?? s.tDist;
      s.dirty = true;
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('pointerup', onUp);
      mount.removeEventListener('pointercancel', onUp);
      mount.removeEventListener('wheel', onWheel);
      sofa?.dispose();
      loaded.forEach((tex) => tex.dispose());
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      s.goTo = null;
    };
  }, [product, s]);

  // A direct load or a refresh has no shared element to hand over from, so the
  // reveal is released by the first real frame instead - with a cap so a device
  // that never gets a frame does not sit on a blank page.
  useEffect(() => {
    if (!directEntry) return undefined;
    if (prefersReducedMotion()) {
      setDirectRevealed(true);
      return undefined;
    }
    let done = false;
    const show = () => { if (!done) { done = true; setDirectRevealed(true); } };
    s.onFirstFrame = show;
    const cap = window.setTimeout(show, MOTION.canvasWaitCap);
    return () => { done = true; s.onFirstFrame = null; window.clearTimeout(cap); };
  }, [directEntry, s]);

  return (
    <div
      className="mv-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        fontFamily: "'Poppins', -apple-system, sans-serif",
        background: t.surface,
        color: t.text,
        '--mv-btn-bg': t.btnBg,
        '--mv-btn-color': t.btnColor,
        '--mv-btn-active-bg': t.btnActiveBg,
        '--mv-btn-active-color': t.btnActiveColor,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <Link
        to={backTo}
        className="mv-back"
        style={{
          zIndex: 10,
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: t.muted,
          textDecoration: 'none',
          // One wash for both brands: since VedaSleep's stage went to Veda
          // Green-Black on 2026-09-01 there is no light stage left to special-
          // case. The old ternary put a 70% white pill here for VedaSleep,
          // which on this ground composites to #BBBFBC and left its own label
          // at 1.45 - a bright blob with unreadable text.
          background: 'rgba(255,255,255,0.08)',
          ...(animated ? enterStyle(revealed, 235) : null),
        }}
      >
        &larr; Catalog
      </Link>

      <div className="mv-head">
        <img
          src={publicUrl(t.logo)}
          alt={t.logoAlt}
          style={{ height: t.logoHeight, width: 'auto', ...(animated ? enterStyle(revealed, 0) : null) }}
        />
        <div
          className="mv-title"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            lineHeight: 1,
            textTransform: 'uppercase',
            ...(animated ? enterStyle(revealed, 0) : null),
          }}
        >
          {product.name}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div
          ref={mountRef}
          style={{
            position: 'absolute',
            inset: 0,
            touchAction: 'none',
            cursor: 'grab',
            opacity: animated && !revealed ? 0 : 1,
            pointerEvents: animated && !revealed ? 'none' : 'auto',
            transform: directEntry && !revealed ? 'scale(0.94)' : 'scale(1)',
            transition: !animated || !revealed
              ? 'none'
              : directEntry
                ? `opacity ${MOTION.enter}ms ${EASE.enter}, transform ${MOTION.enter}ms ${EASE.enter}`
                : `opacity ${MOTION.fast}ms linear`,
          }}
        />
      </div>

      <div className="mv-controls" style={{ ...(animated ? enterStyle(revealed, 130) : null) }}>
        <div className="mv-btnrow">
          {VIEW_DEFS.map(([name, label, th, ph]) => (
            <button
              key={name}
              onClick={() => { s.goTo?.(th, ph); setView(name); }}
              className="mv-view-btn"
              data-active={view === name}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mv-hint" style={{ color: t.faint }}>Drag to rotate</div>
      </div>
    </div>
  );
}
