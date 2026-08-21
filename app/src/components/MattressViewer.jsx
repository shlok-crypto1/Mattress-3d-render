import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { publicUrl } from '../lib/publicUrl';
import { buildMattressGeometry } from '../lib/mattressGeometry';
import { makeStudioEnvironment } from '../lib/foamSurfaces';
import { buildLayerStack } from '../lib/layerStack';
import {
  useProductEntranceTarget,
  enterStyle,
} from '../transition/ProductTransition';

// Per-brand chrome for the shared viewer. 'vedasleep' reproduces the original
// values exactly, so VedaSleep product pages are unchanged.
const BRAND_THEMES = {
  vedasleep: {
    logo: '/brand/vedasleep-logo.png',
    logoAlt: 'Veda Sleep',
    logoHeight: 32,
    surface:
      'radial-gradient(ellipse 70% 60% at 50% 58%, rgba(199,125,17,0.08) 0%, rgba(199,125,17,0) 62%), #F6F8F1',
    text: '#2b2b2b',
    muted: '#8a8a8e',
    faint: '#b0b0b4',
    btnBg: '#f4f4f5',
    btnColor: '#6e6e73',
    btnActiveBg: '#1d1d1f',
    btnActiveColor: '#fff',
    pendingBorder: 'rgba(199,125,17,0.45)',
    pendingColor: '#c77d11',
    // Layer explode chrome. Veda Gold.
    accent: '#c77d11',
    accentSoft: 'rgba(199,125,17,0.10)',
    accentBorder: 'rgba(199,125,17,0.35)',
    labelBg: 'rgba(254,254,254,0.92)',
    labelColor: '#2b2b2b',
    cardBg: '#FEFEFE',
    cardBorder: '#e4e0d4',
    cardTitle: '#1A1A1A',
    cardBody: '#6e6e73',
    cardMeta: '#2b2b2b',
    cardShadow: '0 10px 34px rgba(0,0,0,0.10)',
  },
  foamico: {
    logo: '/brand/foamico-logo-light.png',
    logoAlt: 'Foamico',
    logoHeight: 54,
    surface:
      'radial-gradient(ellipse 70% 60% at 50% 58%, rgba(149,193,43,0.10) 0%, rgba(149,193,43,0) 62%), #1A1A1A',
    text: '#FEFEFE',
    muted: '#8f8f8f',
    faint: '#6e6e6e',
    btnBg: '#242424',
    btnColor: '#b5b5b5',
    btnActiveBg: '#95C12B',
    btnActiveColor: '#1A1A1A',
    pendingBorder: 'rgba(149,193,43,0.45)',
    pendingColor: '#95C12B',
    // Layer explode chrome. Kiwi Green on Key Black - the card and labels have
    // to invert here or they punch a white hole through the dark stage.
    accent: '#95C12B',
    accentSoft: 'rgba(149,193,43,0.14)',
    accentBorder: 'rgba(149,193,43,0.38)',
    labelBg: 'rgba(26,26,26,0.88)',
    labelColor: '#FEFEFE',
    cardBg: '#212121',
    cardBorder: '#343434',
    cardTitle: '#FEFEFE',
    cardBody: '#a8a8a8',
    cardMeta: '#e4e4e4',
    cardShadow: '0 10px 34px rgba(0,0,0,0.45)',
  },
};

// Explode tuning. EXPLODE_IN/OUT bracket the zoom that toggles the stack; the
// gap between them is hysteresis so a stationary wheel can't flap the state.
const EXPLODE_MS = 720;
const LAYER_STAGGER = 0.07;
const EXPLODE_IN = 104;
const EXPLODE_OUT = 132;
const EXPLODE_DIST = 94;
const EXPLODE_SCALE = 0.55; // shrink the group so the taller stack stays framed
const HOVER_LIFT = 1.15;
const HOVER_SCALE = 0.02;
const HOVER_GLOW = 0.5;

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

const VIEW_DEFS = [
  ['corner', 'Corner', 0.6, 0.62],
  ['front', 'Front', 0, 0.12],
  ['side', 'Side', Math.PI / 2, 0.12],
  ['top', 'Top', 0, 1.35],
  ['bottom', 'Bottom', 0, -1.35],
];

/** Coarse device budget: trims coil count and sculpted-cap tessellation. */
function deviceQuality() {
  if (typeof window === 'undefined') return 1;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const small = window.innerWidth < 760;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || small || weak ? 0.6 : 1;
}

export default function MattressViewer({
  product,
  autoRotate = true,
  brand = 'vedasleep',
  transitionId = null,
  backTo = '/',
}) {
  const mountRef = useRef(null);
  const labelsRef = useRef(null);
  const [view, setView] = useState('corner');
  // Layer explode is driven entirely by product.layers. Without it none of the
  // code below runs and the viewer behaves exactly as it always has.
  const layerDefs = product.layers ?? null;
  const hasLayers = Array.isArray(layerDefs) && layerDefs.length > 0;
  const [exploded, setExploded] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [hoveredLayer, setHoveredLayer] = useState(null);
  // Shared-element handoff: no-op unless a card transition landed here (see
  // ProductTransition.jsx). `revealed` starts true whenever entering any
  // other way (direct link, refresh, back-nav) - zero behaviour change then.
  const { revealed, markCanvasReady } = useProductEntranceTarget(transitionId, mountRef);
  const animated = !!transitionId;
  // Mutable animation/scene state that must NOT trigger re-renders, mirroring the
  // original `this.*` instance fields from the imperative viewer.
  const s = useRef({}).current;

  const theme = BRAND_THEMES[brand] ?? BRAND_THEMES.vedasleep;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    const quality = deviceQuality();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: typeof window !== 'undefined' && window.location.search.includes('explode') });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality < 1 ? 1.75 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    s.camera = camera;
    scene.add(new THREE.AmbientLight(0xffffff, 3));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(30, 80, 50);
    scene.add(dir);
    const group = new THREE.Group();
    scene.add(group);
    s.group = group;

    const loader = new THREE.TextureLoader();
    const disposables = [];
    const load = (url, onLoaded) => {
      const t = loader.load(url, () => {
        s.dirty = true;
        onLoaded?.();
      });
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.colorSpace = THREE.SRGBColorSpace;
      disposables.push(t);
      return t;
    };

    // First real frame with the visible top texture in place - what the
    // shared-element transition (if any) waits for before crossfading from
    // the static grid-card image to this live canvas.
    let topReady = false;
    s.reportedReady = false;

    const { textures, dimensions } = product;
    const top = load(publicUrl(textures.top), () => {
      topReady = true;
    });
    const bottom = load(publicUrl(textures.bottom));
    const sideTex = load(publicUrl(textures.side));
    sideTex.wrapS = THREE.RepeatWrapping;

    const topMatOpts = { map: top, roughness: 0.95, metalness: 0, side: THREE.DoubleSide };
    if (textures.topBump) {
      const topBump = load(publicUrl(textures.topBump));
      topBump.colorSpace = THREE.NoColorSpace;
      topMatOpts.bumpMap = topBump;
      topMatOpts.bumpScale = 0.35;
    }
    const topMat = new THREE.MeshStandardMaterial(topMatOpts);
    const wallMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
    const bottomMat = new THREE.MeshStandardMaterial({ map: bottom, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });

    const W = dimensions?.width ?? 72;
    const H = dimensions?.height ?? 5;
    const L = dimensions?.length ?? 72;
    const topBevel = Math.min(1.3, H * 0.26);
    const wallTile = L / 3.3;
    const geometry = buildMattressGeometry(W, H, L, 2.5, topBevel, 8, wallTile);
    const box = new THREE.Mesh(geometry, [topMat, wallMat, bottomMat]);
    group.add(box);
    s.box = box;

    // ---- layer explode stack -------------------------------------------
    // The solid box stays the collapsed representation so that view is
    // guaranteed unchanged; the stack cross-fades in as the explode begins.
    //
    // Built lazily. Eight sculpted bands plus a 150-coil spring unit is real
    // work, and doing it during mount would delay the first frame that the
    // card-to-viewer transition is waiting on. Instead the stack is warmed on
    // the first idle callback after that frame, and forced synchronously if the
    // user beats it to the Layers button.
    // Deliberately effect-local, not on the `s` ref: React StrictMode mounts
    // this effect, tears it down and mounts it again, and both runs share `s`.
    // Hanging the stack (and its build promise) off `s` let the first, discarded
    // scene claim the promise, so the live canvas silently rendered nothing.
    let stack = null;
    let layers = null;
    let hitMeshes = null;
    let stackPromise = null;
    let envRT = null;
    let env = null;
    let explodeT = 0;
    let explodeTarget = 0;
    let explodeLast = null;
    let hoverIdx = null;
    s.exploded = false;

    const ensureStack = () => {
      if (!hasLayers || disposed) return Promise.resolve();
      if (stackPromise) return stackPromise;
      if (!envRT) {
        envRT = makeStudioEnvironment(renderer);
        env = envRT.texture;
      }
      stackPromise = buildLayerStack({
        layerDefs,
        group,
        W,
        H,
        L,
        cornerRadius: 2.5,
        topBevel,
        wallTile,
        env,
        quality,
        productTop: topMatOpts,
        productBottomMap: bottom,
        productSideMap: sideTex,
      })
        .then((built) => {
          if (disposed) {
            built.dispose();
            return;
          }
          stack = built;
          layers = built.layers;
          // Cached so hover picking does not rebuild the target array on every
          // pointer move.
          hitMeshes = built.layers.map((l) => l.hitMesh);
          s.dirty = true;
        })
        .catch((err) => {
          // A failed stack must not take the whole viewer down: the solid
          // mattress still renders and the Layers button simply does nothing.
          console.error('Layer stack failed to build', err);
        });
      return stackPromise;
    };

    // soft ground shadow
    const sc = document.createElement('canvas');
    sc.width = sc.height = 256;
    const g = sc.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 10, 128, 128, 126);
    grad.addColorStop(0, 'rgba(0,0,0,0.22)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(sc);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 1.7, L * 1.35),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -H / 2 - 1.5;
    scene.add(shadow);
    s.shadow = shadow;

    s.theta = 0.6;
    s.phi = 0.62;
    s.dist = 150;
    s.tTheta = 0.6;
    s.tPhi = 0.62;
    s.tDist = 150;
    s.idle = 0;
    s.dirty = true;
    s.autoRotate = autoRotate;

    const el = renderer.domElement;
    const pointers = new Map();
    let lastPinch = 0;

    const raycaster = new THREE.Raycaster();
    let downAt = null;
    let dragDist = 0;
    let touchHoverTimer = 0;

    const accentColor = new THREE.Color(theme.accent);

    const setHover = (idx) => {
      if (hoverIdx === idx) return;
      hoverIdx = idx;
      s.dirty = true;
      setHoveredLayer(idx);
      el.style.cursor = idx === null ? (pointers.size ? 'grabbing' : 'grab') : 'pointer';
    };

    /** Which layer sits under this client point, or null. */
    const pickLayer = (clientX, clientY) => {
      if (!layers || !s.exploded) return null;
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        -((clientY - r.top) / r.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      scene.updateMatrixWorld();
      const hits = raycaster.intersectObjects(hitMeshes, false);
      return hits.length ? hits[0].object.userData.layerIndex : null;
    };

    const onPointerDown = (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      s.idle = -1e9;
      downAt = [e.clientX, e.clientY];
      dragDist = 0;
      el.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      // Hover highlight: only while exploded, only with a fine pointer, and
      // never mid-drag (rotating past layers should not strobe them).
      if (hasLayers && s.exploded && pointers.size === 0 && e.pointerType !== 'touch') {
        setHover(pickLayer(e.clientX, e.clientY));
      }
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        if (downAt) dragDist += Math.hypot(e.clientX - prev[0], e.clientY - prev[1]);
        s.tTheta += (e.clientX - prev[0]) * 0.006;
        s.tPhi = Math.min(1.45, Math.max(-1.45, s.tPhi + (e.clientY - prev[1]) * 0.006));
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
        if (lastPinch) {
          s.tDist = Math.min(260, Math.max(80, (s.tDist * lastPinch) / d));
          syncExplodeToZoom();
        }
        lastPinch = d;
      }
    };
    const onPointerUp = (e) => {
      pointers.delete(e.pointerId);
      lastPinch = 0;
      s.idle = performance.now();
      el.style.cursor = hoverIdx === null ? 'grab' : 'pointer';
      // A tap (not a drag) while exploded picks a layer, or dismisses the card.
      if (hasLayers && s.exploded && downAt && dragDist < 6) {
        const idx = pickLayer(e.clientX, e.clientY);
        if (e.pointerType === 'touch') {
          // Touch has no hover, so flash the highlight first and let the card
          // follow - otherwise the card appears with nothing tying it to a band.
          window.clearTimeout(touchHoverTimer);
          setHover(idx);
          if (idx !== null) {
            touchHoverTimer = window.setTimeout(() => {
              setSelectedLayer((cur) => (cur === idx ? null : idx));
              touchHoverTimer = window.setTimeout(() => setHover(null), 700);
            }, 170);
          } else {
            setSelectedLayer(null);
          }
        } else {
          setSelectedLayer((cur) => (idx === null || cur === idx ? null : idx));
        }
        s.dirty = true;
      }
      downAt = null;
    };
    const onPointerLeave = () => {
      if (hasLayers) setHover(null);
    };
    const onWheel = (e) => {
      e.preventDefault();
      s.tDist = Math.min(260, Math.max(80, s.tDist + e.deltaY * 0.15));
      s.idle = performance.now();
      syncExplodeToZoom();
    };

    // Zoom and the Layers button write the same flag, so the two can never
    // disagree; the dead band between the thresholds stops it oscillating.
    const setExplodeState = (next) => {
      if (!hasLayers || s.exploded === next) return;
      s.exploded = next;
      explodeTarget = next ? 1 : 0;
      s.dirty = true;
      setExploded(next);
      if (next) {
        ensureStack();
      } else {
        setSelectedLayer(null);
        setHover(null);
        window.clearTimeout(touchHoverTimer);
      }
    };
    s.setExplodeState = setExplodeState;

    const syncExplodeToZoom = () => {
      if (!hasLayers) return;
      if (s.tDist <= EXPLODE_IN) setExplodeState(true);
      else if (s.tDist >= EXPLODE_OUT) setExplodeState(false);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('wheel', onWheel, { passive: false });

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const baseDist = w < 560 ? 195 : 150;
      if (!s.exploded) s.tDist = s.dist = baseDist;
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    s.ro = ro;
    resize();
    s.idle = performance.now();

    const projected = new THREE.Vector3();
    const updateLayers = () => {
      // Nothing to drive until the stack exists; explodeT stays parked at 0 so
      // the solid box never fades out over an empty scene.
      if (!hasLayers || !layers) return false;
      // Time-based, not per-frame: the transition must last EXPLODE_MS whatever
      // the refresh rate (and headless/throttled tabs run far below 60fps).
      const now = performance.now();
      const dt = Math.min(64, now - (explodeLast ?? now));
      explodeLast = now;
      const step = dt / EXPLODE_MS;
      const before = explodeT;
      // Settle exactly on the target. Stepping unconditionally leaves the value
      // jittering by one step either side of the endpoint, which pins the render
      // loop on forever after the animation has visually finished.
      const diff = explodeTarget - explodeT;
      if (diff !== 0) {
        explodeT = Math.abs(diff) <= step ? explodeTarget : explodeT + Math.sign(diff) * step;
      }
      const T = explodeT;
      let moving = T !== before;

      const n = layers.length;
      const span = 1 - (n - 1) * LAYER_STAGGER;
      // Dollying in makes the stack overflow the frame, so the group shrinks as
      // it separates - the mattress keeps its apparent size while gaining height.
      const eT = easeOutCubic(T);
      const gs = 1 - (1 - EXPLODE_SCALE) * eT;
      group.scale.setScalar(gs);
      s.groupScale = gs;
      s.shadow.visible = T < 0.98;
      s.shadowFade = 1 - eT;
      // Cross-fade the solid box out over the first slice of the motion.
      const reveal = Math.min(1, T / 0.28);
      box.visible = reveal < 1;
      if (box.visible) {
        box.scale.setScalar(T > 0 ? 0.995 : 1);
        [topMat, wallMat, bottomMat].forEach((m) => {
          m.transparent = T > 0;
          m.opacity = 1 - reveal;
          m.depthWrite = reveal < 0.5;
        });
      }

      const hoverStep = Math.min(1, dt / 150);
      const labelEls = labelsRef.current ? labelsRef.current.children : [];
      layers.forEach((l, i) => {
        const lt = Math.max(0, Math.min(1, (T - i * LAYER_STAGGER) / span));
        const e = easeOutCubic(lt);

        // Hover glow in the brand accent, eased so a fast pointer sweep reads as
        // a wash across the stack rather than a flicker.
        const hoverTarget = hoverIdx === i && T > 0.6 ? 1 : 0;
        const prevHover = l.hoverT;
        l.hoverT += (hoverTarget - l.hoverT) * hoverStep;
        if (Math.abs(hoverTarget - l.hoverT) < 0.002) l.hoverT = hoverTarget;
        if (l.hoverT !== prevHover) moving = true;

        l.object.visible = T > 0;
        l.object.position.y = l.restY + e * l.explodeDy + l.hoverT * HOVER_LIFT;
        l.object.scale.setScalar(1 + l.hoverT * HOVER_SCALE);
        l.mats.forEach((m) => {
          m.opacity = reveal;
          m.transparent = reveal < 1;
          m.depthWrite = reveal > 0.5;
          if (l.hoverT > 0.001) {
            m.emissive.copy(accentColor);
            m.emissiveIntensity = l.hoverT * HOVER_GLOW * reveal;
          } else if (m.emissiveIntensity !== 0) {
            m.emissiveIntensity = 0;
          }
        });

        if (l.drop) {
          const below = layers[i + 1];
          const belowTop =
            below.restY +
            easeOutCubic(Math.max(0, Math.min(1, (T - (i + 1) * LAYER_STAGGER) / span))) * below.explodeDy +
            below.hoverT * HOVER_LIFT +
            below.h / 2;
          const sep = l.object.position.y - l.h / 2 - belowTop;
          l.drop.visible = T > 0.02 && sep > 0.2;
          l.drop.position.y = belowTop + 0.06;
          const soft = Math.max(0.42, 1 - sep / ((stack?.gap ?? 9.5) * 2.4));
          l.drop.material.opacity = reveal * soft;
          const spread = 1 + Math.min(0.22, sep * 0.02);
          l.drop.scale.set(spread, spread, 1);

          // Contact occlusion stays hard against the lower face and is strongest
          // when the gap is tight, so the moment of separation reads as two
          // slabs peeling apart rather than one fading into two.
          if (l.ao) {
            l.ao.visible = l.drop.visible;
            l.ao.position.y = belowTop + 0.14;
            const tight = Math.max(0, 1 - sep / 7);
            l.ao.material.opacity = reveal * (0.35 + 0.65 * tight);
          }
        }

        // Labels ride the layer's rightmost screen-space corner.
        const el2 = labelEls[i];
        if (el2) {
          const fade = Math.max(0, Math.min(1, (lt - 0.55) / 0.45));
          if (fade <= 0.001) {
            el2.style.opacity = '0';
            el2.style.visibility = 'hidden';
          } else {
            let bestX = -Infinity, bestY = 0;
            const hw = W / 2, hl = L / 2;
            const g2 = s.groupScale ?? 1;
            for (const [cx, cz] of [[hw, hl], [hw, -hl], [-hw, hl], [-hw, -hl]]) {
              projected.set(cx * g2, l.object.position.y * g2, cz * g2).project(camera);
              if (projected.x > bestX) { bestX = projected.x; bestY = projected.y; }
            }
            const r = el.getBoundingClientRect();
            el2.style.visibility = 'visible';
            el2.style.opacity = String(fade);
            el2.style.transform =
              `translate(${((bestX + 1) / 2) * r.width + 14}px, ${((1 - bestY) / 2) * r.height}px) translateY(-50%)`;
          }
        }
      });
      return moving;
    };

    const tick = () => {
      s.raf = requestAnimationFrame(tick);
      if (s.autoRotate && pointers.size === 0 && s.idle > 0 && performance.now() - s.idle > 3000 && !s.exploded) {
        s.tTheta += 0.0018;
      }
      const k = 0.08;
      const layersMoving = updateLayers();
      if (
        Math.abs(s.tTheta - s.theta) > 1e-4 ||
        Math.abs(s.tPhi - s.phi) > 1e-4 ||
        Math.abs(s.tDist - s.dist) > 1e-3 ||
        layersMoving ||
        s.dirty
      ) {
        s.theta += (s.tTheta - s.theta) * k;
        s.phi += (s.tPhi - s.phi) * k;
        s.dist += (s.tDist - s.dist) * k;
        const cp = Math.cos(s.phi), sp = Math.sin(s.phi);
        camera.position.set(s.dist * cp * Math.sin(s.theta), s.dist * sp, s.dist * cp * Math.cos(s.theta));
        camera.lookAt(0, 0, 0);
        s.shadow.material.opacity = Math.max(0, Math.min(1, sp + 0.15)) * (s.shadowFade ?? 1);
        renderer.render(scene, camera);
        s.dirty = false;
        if (topReady && !s.reportedReady) {
          s.reportedReady = true;
          s.markCanvasReady?.();
          // First real frame is out; now spend idle time on the layer stack so
          // the Layers button and the zoom threshold are both instant.
          if (hasLayers) {
            if ('requestIdleCallback' in window) {
              s.warmHandle = window.requestIdleCallback(() => ensureStack(), { timeout: 2500 });
            } else {
              s.warmHandle = window.setTimeout(() => ensureStack(), 600);
            }
          }
        }
      }
    };
    tick();

    // TEMP-SCREENSHOT-HOOK
    if (hasLayers && typeof window !== 'undefined' && window.location.search.includes('explode')) {
      const q = new URLSearchParams(window.location.search);
      window.setInterval(() => { s.dirty = true; }, 60);
      window.setTimeout(() => {
        if (disposed) return;
        const twoPi = Math.PI * 2;
        s.tTheta = 0.6 + Math.round((s.tTheta - 0.6) / twoPi) * twoPi;
        s.tPhi = q.has('phi') ? Number(q.get('phi')) : 0.3;
        s.tDist = q.has('dist') ? Number(q.get('dist')) : EXPLODE_DIST;
        s.theta = s.tTheta; s.phi = s.tPhi; s.dist = s.tDist;
        setExplodeState(true);
        ensureStack().then(() => {
          if (disposed) return;
          explodeT = q.has('mid') ? Number(q.get('mid')) : 1;
          explodeTarget = explodeT;
          s.dirty = true;
          window.setTimeout(() => {
            try {
              const l0 = layers?.[3];
              renderer.render(scene, camera);
              const gl = renderer.getContext();
              const w = gl.drawingBufferWidth, hh = gl.drawingBufferHeight;
              const px = [];
              for (const [fx, fy] of [[0.5, 0.5], [0.45, 0.4], [0.4, 0.62]]) {
                const b = new Uint8Array(4);
                gl.readPixels(Math.floor(w * fx), Math.floor(hh * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
                px.push([...b].join(','));
              }
              document.title = 'DBG ' + JSON.stringify({
                n: layers?.length, T: explodeT, vis: l0?.object?.visible,
                op: l0?.mats?.[1]?.opacity, gs: group.scale.x, boxVis: box.visible,
                calls: renderer.info.render.calls, tris: renderer.info.render.triangles,
                cw: w, ch: hh, canvasOp: getComputedStyle(mount).opacity,
                px,
              });
            } catch (e) { document.title = 'DBGERR ' + e.message + ' | ' + e.stack; }
          }, 2500);
          if (q.has('hover')) {
            hoverIdx = Number(q.get('hover'));
            layers?.forEach((l, i) => { l.hoverT = i === hoverIdx ? 1 : 0; });
          }
        });
      }, 300);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(s.raf);
      window.clearTimeout(touchHoverTimer);
      if (s.warmHandle) {
        if ('cancelIdleCallback' in window) window.cancelIdleCallback(s.warmHandle);
        window.clearTimeout(s.warmHandle);
        s.warmHandle = null;
      }
      ro.disconnect();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('pointerleave', onPointerLeave);
      el.removeEventListener('wheel', onWheel);
      renderer.dispose();
      geometry.dispose();
      topMat.dispose();
      wallMat.dispose();
      bottomMat.dispose();
      shadowTex.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
      stack?.dispose();
      stack = null;
      layers = null;
      hitMeshes = null;
      stackPromise = null;
      envRT?.dispose();
      envRT = null;
      env = null;
      disposables.forEach((t) => t.dispose());
      if (mount.contains(el)) mount.removeChild(el);
    };
    // Re-run whenever the product (and hence its textures/dimensions) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    s.autoRotate = autoRotate;
  }, [autoRotate, s]);

  useEffect(() => {
    s.markCanvasReady = markCanvasReady;
  }, [markCanvasReady, s]);

  const goTo = (name, theta, phi) => {
    if (s.exploded) s.setExplodeState?.(false);
    const twoPi = Math.PI * 2;
    const t = theta + Math.round((s.tTheta - theta) / twoPi) * twoPi;
    s.tTheta = t;
    s.tPhi = phi;
    s.idle = performance.now();
    setView(name);
  };

  const toggleLayers = () => {
    const next = !s.exploded;
    const twoPi = Math.PI * 2;
    s.tTheta = 0.6 + Math.round((s.tTheta - 0.6) / twoPi) * twoPi;
    if (next) {
      s.tPhi = 0.3;
      s.tDist = EXPLODE_DIST;
      setView('layers');
    } else {
      s.tPhi = 0.62;
      s.tDist = mountRef.current && mountRef.current.clientWidth < 560 ? 195 : 150;
      setView('corner');
    }
    s.idle = performance.now();
    s.setExplodeState?.(next);
  };

  const { name, specLine, specsPending, dimensions } = product;
  const t = theme;

  // Placeholder ratios resolve against the product's real height, so the card
  // can quote a thickness even before real per-layer specs land.
  const totalHeight = dimensions?.height ?? 0;
  const ratioSum = hasLayers ? layerDefs.reduce((a, l) => a + (l.thicknessRatio ?? 1), 0) : 0;
  const layerThickness = (l) =>
    ratioSum ? `${((totalHeight * (l.thicknessRatio ?? 1)) / ratioSum).toFixed(1)}″` : '—';
  const active = selectedLayer !== null ? layerDefs[selectedLayer] : null;

  return (
    <div
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
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          zIndex: 10,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: t.muted,
          textDecoration: 'none',
          background: brand === 'foamico' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          padding: '6px 12px',
          borderRadius: 100,
          ...(animated ? enterStyle(revealed, 235) : null),
        }}
      >
        &larr; {backTo === '/' ? 'Brands' : 'Catalog'}
      </Link>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          padding: '28px 20px 0',
          textAlign: 'center',
        }}
      >
        <img
          src={publicUrl(t.logo)}
          alt={t.logoAlt}
          style={{
            height: t.logoHeight,
            width: 'auto',
            ...(animated ? enterStyle(revealed, 0) : null),
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: 34,
              letterSpacing: '0.22em',
              lineHeight: 1,
              textTransform: 'uppercase',
              ...(animated ? enterStyle(revealed, 0) : null),
            }}
          >
            {name}
          </div>
          {specLine ? (
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 400,
                color: '#8a8a8e',
                letterSpacing: '0.04em',
                marginTop: 8,
                ...(animated ? enterStyle(revealed, 60) : null),
              }}
            >
              {specLine.variant}
              {' · '}
              {specLine.thickness}
              {' · '}
              {specLine.warranty}
            </div>
          ) : specsPending ? (
            // Mock-up slot: real variant / thickness / warranty copy drops in here.
            <div
              style={{
                marginTop: 10,
                alignSelf: 'center',
                fontSize: 10.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: t.pendingColor,
                border: `1px dashed ${t.pendingBorder}`,
                borderRadius: 100,
                padding: '5px 12px',
                ...(animated ? enterStyle(revealed, 60) : null),
              }}
            >
              Spec details to follow
            </div>
          ) : null}
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
            // The scene still mounts and loads behind the overlay so it can
            // report its first frame, but must not be visible or interactive
            // until the shared texture has completed its flight.
            opacity: animated && !revealed ? 0 : 1,
            pointerEvents: animated && !revealed ? 'none' : 'auto',
            transition: animated && revealed ? 'opacity 200ms linear' : 'none',
          }}
        />

        {hasLayers && (
          <div ref={labelsRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {layerDefs.map((l, i) => (
              <div
                key={l.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  visibility: 'hidden',
                  opacity: 0,
                  whiteSpace: 'nowrap',
                  fontSize: 10.5,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: hoveredLayer === i ? t.accent : t.labelColor,
                  background: t.labelBg,
                  border: `1px solid ${hoveredLayer === i ? t.accent : t.accentBorder}`,
                  borderRadius: 100,
                  padding: '4px 11px',
                  transition: 'opacity 0.2s linear, color 0.2s linear, border-color 0.2s linear',
                }}
              >
                <span style={{ color: t.accent, marginRight: 7 }}>&#9679;</span>
                {l.name}
              </div>
            ))}
          </div>
        )}

        {active && (
          <div
            onClick={() => setSelectedLayer(null)}
            style={{
              position: 'absolute',
              left: 18,
              bottom: 18,
              maxWidth: 320,
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 16,
              padding: '16px 18px 18px',
              boxShadow: t.cardShadow,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                fontSize: 9.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: t.accent,
                background: t.accentSoft,
                borderRadius: 100,
                padding: '3px 9px',
                marginBottom: 10,
              }}
            >
              Layer {selectedLayer + 1} of {layerDefs.length}
              {active.nameTbd ? ' · name TBD' : ''}
            </div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: t.cardTitle,
                lineHeight: 1.25,
              }}
            >
              {active.name}
            </div>
            {active.role ? (
              <div style={{ fontSize: 11, color: t.accent, marginTop: 5, letterSpacing: '0.05em' }}>
                {active.role}
              </div>
            ) : null}
            <div style={{ fontSize: 12, color: t.cardBody, marginTop: 8, lineHeight: 1.5 }}>
              {active.description}
            </div>
            <div style={{ fontSize: 12, color: t.cardMeta, marginTop: 10, letterSpacing: '0.04em' }}>
              Thickness <strong style={{ fontWeight: 600 }}>{layerThickness(active)}</strong>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          padding: '0 20px 26px',
          ...(animated ? enterStyle(revealed, 130) : null),
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {VIEW_DEFS.map(([name_, label, th, ph]) => (
            <button
              key={name_}
              onClick={() => goTo(name_, th, ph)}
              className="mv-view-btn"
              data-active={view === name_}
            >
              {label}
            </button>
          ))}
          {hasLayers && (
            <button onClick={toggleLayers} className="mv-view-btn" data-active={exploded}>
              {exploded ? 'Solid' : 'Layers'}
            </button>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: t.faint, fontWeight: 300, letterSpacing: '0.03em' }}>
          {hasLayers && exploded
            ? 'Tap a layer for details · zoom out to collapse'
            : hasLayers
              ? 'Drag to rotate · zoom in to explode layers'
              : 'Drag to rotate'}
        </div>
      </div>

      <style>{`
        .mv-view-btn {
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.02em;
          padding: 8px 15px;
          border-radius: 100px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.25s ease;
          background: var(--mv-btn-bg);
          color: var(--mv-btn-color);
        }
        .mv-view-btn[data-active="true"] {
          background: var(--mv-btn-active-bg);
          color: var(--mv-btn-active-color);
        }
      `}</style>
    </div>
  );
}
