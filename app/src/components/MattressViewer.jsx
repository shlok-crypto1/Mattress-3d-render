import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { publicUrl } from '../lib/publicUrl';
import { buildEuroTopGeometry } from '../lib/mattressGeometry';
import { makeStudioEnvironment, makeTuftedBorderNormal } from '../lib/foamSurfaces';
import { QUILT_DEFAULTS, quiltMaps, quiltDisplacer, buildEdgeStitch, averageColor } from '../lib/quiltSurface';
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
    // Soft pool behind the exploded stack. On this near-white stage a white
    // cover has no silhouette to read against; a touch of shade under the
    // model gives it an edge without darkening the page.
    stageTint:
      'radial-gradient(ellipse 68% 60% at 50% 54%, rgba(31,33,28,0.13) 0%, rgba(31,33,28,0) 72%)',
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
    // Key Black already separates a pale layer cleanly - nothing to add.
    stageTint: null,
    cardBg: '#212121',
    cardBorder: '#343434',
    cardTitle: '#FEFEFE',
    cardBody: '#a8a8a8',
    cardMeta: '#e4e4e4',
    cardShadow: '0 10px 34px rgba(0,0,0,0.45)',
  },
};

// Explode tuning. The stack is toggled by the Layers button alone - zoom used
// to cross a threshold and explode the mattress on its own, which fired when
// someone was only trying to look closer at the solid product.
const EXPLODE_MS = 720;
const LAYER_STAGGER = 0.07;
const EXPLODE_DIST = 94; // where the button parks the camera to frame the stack
const EXPLODE_SCALE = 0.55; // shrink the group so the taller stack stays framed
const HOVER_LIFT = 1.15;
const HOVER_SCALE = 0.02;
const HOVER_GLOW = 0.5;

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

// [key, label, theta, phi, dist]. `dist` is optional and only Detail sets it -
// everything else keeps the framing the viewer picks for the mount size.
const VIEW_DEFS = [
  ['corner', 'Corner', 0.6, 0.62],
  ['front', 'Front', 0, 0.12],
  ['side', 'Side', Math.PI / 2, 0.12],
  ['top', 'Top', 0, 1.35],
  ['bottom', 'Bottom', 0, -1.35],
  // Close, and raked low enough that the light skims the quilt: the view that
  // shows the surface is fabric rather than a picture of fabric.
  ['detail', 'Detail', 0.85, 0.46, 88],
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
    // Cap at 2x: enough for retina/high-DPI to render sharp rather than soft,
    // without paying for the 3x backing store a modern phone would otherwise
    // ask for. Sharpness wins over the old 1.75 low-power budget - the geometry
    // quality dial still trims coil count and tessellation on weak devices.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tone mapping is what makes a fabric render possible at all here. Without
    // it every value above 1.0 clips flat, so a near-white quilt loses both its
    // relief and its silhouette the moment any specular is added - which is
    // exactly what happened the last time an environment map was tried on the
    // cover. Neutral rolls the highlights off while leaving hue alone; ACES
    // would tint these near-white fabrics warm.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.92;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    s.camera = camera;
    // Studio rig. The old setup was ambient 3.0 plus a single key, which put
    // ~77% of an up-facing surface's light into a perfectly uniform term: no
    // matter how much relief the quilt had, there was nothing directional
    // enough to shade it. The budget is now the other way round - the two
    // directional sources carry ~62% - so surface detail has something to cast
    // against. Total irradiance on an up-facing normal is held near the old
    // value so nothing suddenly reads brighter or darker.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a958c, 1.2));
    // Key: high and off to one side, as a product shot would be lit.
    const dir = new THREE.DirectionalLight(0xffffff, 2.0);
    dir.position.set(30, 80, 50);
    scene.add(dir);
    // Grazing fill from the opposite side, deliberately low. Raking light
    // across the quilt is what turns puffed cells and stitch channels from a
    // pattern into a construction; it also keeps the channels from going
    // black, which the spec calls out as the other half of the same problem.
    const graze = new THREE.DirectionalLight(0xffffff, 1.1);
    graze.position.set(-55, 18, 25);
    scene.add(graze);
    const group = new THREE.Group();
    scene.add(group);
    s.group = group;

    // Studio IBL. Set as scene.environment rather than per-material: three
    // falls back to it for any material with no envMap of its own, so the
    // solid box picks it up while the layer stack keeps the explicit envMap it
    // already sets. Fabric needs this - without an environment a standard
    // material has no specular response at grazing angles and the quilt
    // flattens out exactly where the raking light should be revealing it.
    const envRT = makeStudioEnvironment(renderer);
    const env = envRT.texture;
    scene.environment = env;
    // Held well below 1: the quilt should pick up soft directional sheen, not
    // read as damp or waxy.
    scene.environmentIntensity = 0.35;

    const loader = new THREE.TextureLoader();
    const disposables = [];
    // Every product map goes through here, so the sampling setup is stated in
    // one place: full anisotropy (the single biggest win on a mattress top seen
    // at a grazing angle), trilinear mipmapping so the surface doesn't alias
    // into shimmer at distance, and linear magnification for close-ups.
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const load = (url, onLoaded) => {
      const t = loader.load(url, () => {
        s.dirty = true;
        onLoaded?.();
      });
      t.anisotropy = maxAnisotropy;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
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
    let onSideReady = null;
    const sideTex = load(publicUrl(textures.side), () => onSideReady?.());
    sideTex.wrapS = THREE.RepeatWrapping;

    const W = dimensions?.width ?? 72;
    const H = dimensions?.height ?? 5;
    const L = dimensions?.length ?? 72;
    // The exploded slabs keep their own soft top edge; only the solid box is
    // built as a Euro-top.
    const topBevel = Math.min(1.3, H * 0.26);
    // ~6 tiles around the perimeter rather than the old ~13. Halving the
    // repetition costs texel density (about 19/in down to 9/in, on par with the
    // top faces), which is the accepted trade for a border that does not read
    // as a repeating strip.
    const wallTile = L / 1.5;

    // The sleeping surface is upholstery, so it gets a fabric material rather
    // than a generic standard one: sheen is the term that makes a textile catch
    // light along a grazing angle the way cloth does instead of the way plastic
    // does. Kept low - premium ticking is matte.
    const quiltCfg = { ...QUILT_DEFAULTS, ...(product.quilt ?? {}) };
    const topMatOpts = {
      map: top,
      roughness: quiltCfg.roughness,
      metalness: 0,
      sheen: quiltCfg.sheen,
      sheenRoughness: quiltCfg.sheenRoughness,
      sheenColor: new THREE.Color(0xffffff),
      side: THREE.DoubleSide,
    };
    const topMat = new THREE.MeshPhysicalMaterial(topMatOpts);
    // The quilt's own relief, reconstructed from the product's bump photo. This
    // used to be fed in as a luminance bumpMap, which cannot distinguish a pale
    // printed mark from a raised one and gives no roughness or occlusion
    // response at all; quiltSurface.js turns the same image into a proper
    // normal / roughness / occlusion set plus the puff field that sculpts the
    // cap. Resolved as a promise so the stack can wait for the same maps.
    let quiltReady = Promise.resolve(null);
    if (textures.topBump) {
      quiltReady = new Promise((resolve) => {
        const bumpTex = load(publicUrl(textures.topBump), () => {
          if (disposed || !bumpTex.image?.width) return resolve(null);
          const maps = quiltMaps(publicUrl(textures.topBump), bumpTex.image, quiltCfg);
          topMatOpts.normalMap = maps.normal;
          topMatOpts.normalScale = new THREE.Vector2(quiltCfg.normalScale, quiltCfg.normalScale);
          topMatOpts.roughnessMap = maps.roughnessMap;
          topMatOpts.aoMap = maps.aoMap;
          Object.assign(topMat, {
            normalMap: maps.normal,
            roughnessMap: maps.roughnessMap,
            aoMap: maps.aoMap,
          });
          topMat.normalScale.set(quiltCfg.normalScale, quiltCfg.normalScale);
          topMat.needsUpdate = true;
          s.dirty = true;
          resolve(maps);
        });
        bumpTex.colorSpace = THREE.NoColorSpace;
      });
    }
    // Border fabric carries the tufted dimple relief. The map's own UVs already
    // tile it around the perimeter, so the normal map is given a repeat that
    // matches roughly one dimple row per inch of border height.
    const TUFT_PITCH = 3.1; // target inches between dimple centres
    const TUFT_COLS = 14, TUFT_ROWS = 3;
    const tuftNormal = makeTuftedBorderNormal(TUFT_COLS, TUFT_ROWS).clone();
    tuftNormal.wrapS = tuftNormal.wrapT = THREE.RepeatWrapping;
    tuftNormal.anisotropy = maxAnisotropy;
    const wallMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      normalMap: tuftNormal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const bottomMat = new THREE.MeshStandardMaterial({ map: bottom, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
    // Piping between base and cushion, darkened a touch so the band reads as a
    // seam rather than merging into the fabric either side of it.
    //
    // Its map is the border photo collapsed to a single column of pixels. The
    // band used to carry the whole photo squeezed into 0.4in and tiled 26 times
    // around, so every fraction of a pixel of residual slope in the source
    // repeated as a sawtooth kink. One texel wide, every u samples the same
    // column: the trim cannot kink or shift shade along the mattress no matter
    // how un-seamless the photo is, while still taking its colour and vertical
    // shading from the product's own border.
    const seamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.86, 0.86, 0.86),
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const buildSeamProfile = () => {
      const img = sideTex.image;
      if (!img || !img.width || disposed) return;
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = img.height;
      // Downscaling to one column box-filters the width away, which also
      // averages out any residual slope in the photographed piping.
      c.getContext('2d').drawImage(img, 0, 0, 1, img.height);
      const prof = new THREE.CanvasTexture(c);
      prof.wrapS = prof.wrapT = THREE.RepeatWrapping;
      prof.colorSpace = THREE.SRGBColorSpace;
      prof.needsUpdate = true;
      seamMat.map = prof;
      seamMat.needsUpdate = true;
      disposables.push(prof);
      s.dirty = true;
    };
    if (sideTex.image?.width) buildSeamProfile();
    else onSideReady = buildSeamProfile;

    // Euro-top silhouette: firm base box, separate cushion inset on top, piping
    // where they meet. Shared by every product - this is a construction style,
    // not a per-product trait.
    const euroOpts = {
      cornerSegs: Math.max(6, Math.round(10 * quality)),
      tileWidth: wallTile,
      seamTile: wallTile / 2,
    };
    // Sculpting the cap needs enough perimeter samples to resolve the quilt's
    // cell pitch, and enough rings to resolve it inward; below that the puff
    // aliases into long diagonal creases. Both ride the device quality dial,
    // like every other tessellation choice here.
    const sculptOpts = {
      ...euroOpts,
      sideSegs: Math.max(8, Math.round(26 * quality)),
      capRings: Math.max(12, Math.round(34 * quality)),
      edgeCompression: quiltCfg.edgeCompression,
    };
    const geometry = buildEuroTopGeometry(W, H, L, euroOpts);
    // Dimples have to close on a whole period too, or the tuft map puts back
    // the closure seam the tile snapping just removed.
    const snappedTile = geometry.userData.wallTile;
    const perimeter = geometry.userData.perimeter;
    const tuftPeriods = Math.max(1, Math.round(perimeter / (TUFT_PITCH * TUFT_COLS)));
    const tuftPitch = perimeter / (TUFT_COLS * tuftPeriods);
    tuftNormal.repeat.set(
      snappedTile / (tuftPitch * TUFT_COLS),
      H / (tuftPitch * TUFT_ROWS)
    );
    tuftNormal.needsUpdate = true;
    const box = new THREE.Mesh(geometry, [topMat, wallMat, bottomMat, seamMat]);
    group.add(box);
    s.box = box;

    // The flat cap goes up first and the sculpted one replaces it once the
    // height field has decoded. The card-to-viewer transition is waiting on the
    // first real frame, and making it wait on an image decode as well would
    // stall the handoff for no visual gain - the swap is invisible because the
    // panel's outline and every UV are identical either way.
    let stitch = null;
    quiltReady.then((maps) => {
      if (!maps || disposed) return;
      const displace = quiltDisplacer(maps, geometry.userData.cushW, geometry.userData.cushL, H);
      const sculpted = buildEuroTopGeometry(W, H, L, { ...sculptOpts, displace });
      box.geometry = sculpted;
      geometry.dispose();
      // Thread along the seam the panel is sewn on, tinted from the product's
      // own fabric so it reads as stitching rather than as a bright rim.
      stitch = buildEdgeStitch(sculpted.userData.quiltEdge, {
        radius: quiltCfg.stitchRadius,
        color: top.image ? averageColor(top.image).multiplyScalar(quiltCfg.stitchTint) : undefined,
      });
      box.add(stitch);
      s.dirty = true;
    });

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
    let explodeT = 0;
    let explodeTarget = 0;
    let explodeLast = null;
    let hoverIdx = null;
    s.exploded = false;

    const ensureStack = () => {
      if (!hasLayers || disposed) return Promise.resolve();
      if (stackPromise) return stackPromise;
      // Waits on the quilt maps so the cover that emerges from the box carries
      // the same fabric response the box already has.
      stackPromise = quiltReady.then(() => buildLayerStack({
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
        maxAnisotropy,
      }))
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
    };

    // The single entry point for entering/leaving the exploded view.
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
      // Remembered so the view presets can return to it after Detail.
      s.baseDist = baseDist;
      if (!s.exploded && s.view !== 'detail') s.tDist = s.dist = baseDist;
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
        [topMat, wallMat, bottomMat, seamMat].forEach((m) => {
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
            let bestX = -Infinity, bestY = 0, leftX = Infinity, leftY = 0;
            const hw = W / 2, hl = L / 2;
            const g2 = s.groupScale ?? 1;
            for (const [cx, cz] of [[hw, hl], [hw, -hl], [-hw, hl], [-hw, -hl]]) {
              projected.set(cx * g2, l.object.position.y * g2, cz * g2).project(camera);
              if (projected.x > bestX) { bestX = projected.x; bestY = projected.y; }
              if (projected.x < leftX) { leftX = projected.x; leftY = projected.y; }
            }
            const r = el.getBoundingClientRect();
            el2.style.visibility = 'visible';
            el2.style.opacity = String(fade);
            // Labels ride the right corner by default, but a narrow viewport
            // ran them off the edge and clipped the layer names. Hang them off
            // the left corner instead when the right has no room, and clamp so
            // one never leaves the canvas.
            const lw = el2.offsetWidth;
            const GAP = 14, EDGE = 8;
            let lx = ((bestX + 1) / 2) * r.width + GAP;
            let ly = ((1 - bestY) / 2) * r.height;
            if (lx + lw > r.width - EDGE) {
              const flipped = ((leftX + 1) / 2) * r.width - GAP - lw;
              if (flipped >= EDGE) {
                lx = flipped;
                ly = ((1 - leftY) / 2) * r.height;
              } else {
                lx = Math.max(EDGE, r.width - EDGE - lw);
              }
            }
            el2.style.transform = `translate(${lx}px, ${ly}px) translateY(-50%)`;
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
      // box.geometry, not the `geometry` built above: once the sculpted cap has
      // swapped in, that original is already disposed and this is the live one.
      box.geometry.dispose();
      if (stitch) {
        stitch.geometry.dispose();
        stitch.material.dispose();
      }
      topMat.dispose();
      wallMat.dispose();
      bottomMat.dispose();
      seamMat.dispose();
      tuftNormal.dispose();
      shadowTex.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
      stack?.dispose();
      stack = null;
      layers = null;
      hitMeshes = null;
      stackPromise = null;
      envRT.dispose();
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

  const goTo = (name, theta, phi, dist) => {
    if (s.exploded) s.setExplodeState?.(false);
    const twoPi = Math.PI * 2;
    const t = theta + Math.round((s.tTheta - theta) / twoPi) * twoPi;
    s.tTheta = t;
    s.tPhi = phi;
    // Only Detail carries its own distance; the rest return to the framing the
    // viewer chose for this mount size. Either way it goes through the same
    // damped target the drag controls use, so the move eases rather than cuts.
    s.tDist = dist ?? s.baseDist ?? s.tDist;
    // Mirrored onto the ref because the scene effect only re-runs per product;
    // it would otherwise read the `view` captured at mount forever.
    s.view = name;
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
          background: brand === 'foamico' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          ...(animated ? enterStyle(revealed, 235) : null),
        }}
      >
        &larr; {backTo === '/' ? 'Brands' : 'Catalog'}
      </Link>
      <div className="mv-head">
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
            className="mv-title"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              lineHeight: 1,
              textTransform: 'uppercase',
              ...(animated ? enterStyle(revealed, 0) : null),
            }}
          >
            {name}
          </div>
          {specLine ? (
            <div
              className="mv-spec"
              style={{
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
        {hasLayers && t.stageTint ? (
          <div aria-hidden className="mv-stage-tint" style={{ background: t.stageTint, opacity: exploded ? 1 : 0 }} />
        ) : null}
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
                className="mv-label"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  visibility: 'hidden',
                  opacity: 0,
                  whiteSpace: 'nowrap',
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
            className="mv-card"
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              boxShadow: t.cardShadow,
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
        className="mv-controls"
        style={{ ...(animated ? enterStyle(revealed, 130) : null) }}
      >
        <div className="mv-btnrow">
          {VIEW_DEFS.map(([name_, label, th, ph, ds]) => (
            <button
              key={name_}
              onClick={() => goTo(name_, th, ph, ds)}
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
        <div className="mv-hint" style={{ color: t.faint }}>
          {hasLayers && exploded
            ? 'Tap a layer for details · Solid to collapse'
            : hasLayers
              ? 'Drag to rotate · Layers to open the stack'
              : 'Drag to rotate'}
        </div>
      </div>

      <style>{`
        /* Sizing lives here rather than inline so the phone breakpoints can
           actually win - an inline style would outrank every media query. */
        .mv-root {
          -webkit-tap-highlight-color: transparent;
          overscroll-behavior: none;
        }
        .mv-back {
          position: absolute;
          top: calc(18px + env(safe-area-inset-top));
          left: calc(18px + env(safe-area-inset-left));
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 100px;
        }
        .mv-head {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: calc(28px + env(safe-area-inset-top)) 20px 0;
          text-align: center;
        }
        .mv-title {
          font-size: 34px;
          letter-spacing: 0.22em;
          /* The wordmark is set very wide; on a narrow phone that is what
             overflows first, so the tracking gives way before the size does. */
          text-indent: 0.22em;
        }
        .mv-spec { font-size: 12.5px; }
        .mv-stage-tint {
          position: absolute;
          inset: 0;
          pointer-events: none;
          transition: opacity 420ms ease;
        }
        .mv-label { font-size: 10.5px; }
        .mv-card {
          position: absolute;
          left: 18px;
          bottom: 18px;
          max-width: 320px;
          border-radius: 16px;
          padding: 16px 18px 18px;
          cursor: pointer;
        }
        .mv-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 0 20px calc(26px + env(safe-area-inset-bottom));
        }
        .mv-btnrow { display: flex; gap: 8px; }
        .mv-hint { font-size: 11.5px; font-weight: 300; letter-spacing: 0.03em; }
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
          white-space: nowrap;
        }
        .mv-view-btn[data-active="true"] {
          background: var(--mv-btn-active-bg);
          color: var(--mv-btn-active-color);
        }

        /* Phones. Six view buttons never fit one line at 390px, so the row
           scrolls sideways instead of wrapping into a ragged block or pushing
           the canvas off-screen. */
        @media (max-width: 620px) {
          .mv-head { gap: 7px; padding-top: calc(16px + env(safe-area-inset-top)); }
          .mv-title { font-size: clamp(20px, 6.4vw, 30px); letter-spacing: 0.13em; text-indent: 0.13em; }
          .mv-spec { font-size: 11.5px; margin-top: 6px !important; }
          .mv-hint { font-size: 10.5px; }
          .mv-controls { gap: 10px; padding: 0 0 calc(14px + env(safe-area-inset-bottom)); }
          .mv-btnrow {
            width: 100%;
            overflow-x: auto;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x proximity;
            padding: 2px calc(16px + env(safe-area-inset-left)) 2px calc(16px + env(safe-area-inset-right));
            justify-content: flex-start;
          }
          .mv-btnrow::-webkit-scrollbar { display: none; }
          .mv-view-btn {
            scroll-snap-align: center;
            /* Comfortable thumb target - 8px/15px lands well under 44px. */
            min-height: 44px;
            padding: 8px 17px;
            font-size: 12.5px;
          }
          .mv-label { font-size: 9.5px; letter-spacing: 0.07em; padding: 3px 9px !important; }
          /* The floating card covers the model on a narrow screen; as a bottom
             sheet it sits under it instead. */
          .mv-card {
            left: 12px;
            right: 12px;
            bottom: 12px;
            max-width: none;
            border-radius: 18px;
            padding: 14px 16px 16px;
          }
        }

        /* Landscape phones: almost no vertical room, so the header collapses to
           the wordmark and the stage keeps the rest. */
        @media (max-height: 480px) and (orientation: landscape) {
          .mv-head { padding-top: calc(10px + env(safe-area-inset-top)); gap: 4px; }
          .mv-head img { height: 22px; }
          .mv-title { font-size: 20px; letter-spacing: 0.1em; text-indent: 0.1em; }
          .mv-spec, .mv-hint { display: none; }
          .mv-controls { padding-bottom: calc(8px + env(safe-area-inset-bottom)); gap: 8px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mv-stage-tint { transition: none; }
        }
      `}</style>
    </div>
  );
}
