import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { publicUrl } from '../lib/publicUrl';
import { makeSpeckleTexture, makeConvolutedBump, makeShadowTexture } from '../lib/foamSurfaces';

// Builds a mattress box with rounded top corners/edges (footprint corner radius Rc,
// top-edge bevel radius Rt) instead of a hard-edged box, so it reads as a real
// mattress silhouette instead of a cardboard box. Three material groups:
// 0 = top face + bevel (quilted fabric), 1 = wall (gusset/side fabric, wraps the
// whole rounded perimeter as one continuous texture), 2 = bottom face.
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
  },
};

function buildMattressGeometry(W, H, L, Rc, Rt, cornerSegs, tileWidth) {
  const hx = W / 2, hz = L / 2;
  const segs = [
    { type: 'line', x0: hx, z0: -(hz - Rc), x1: hx, z1: hz - Rc, nx: 1, nz: 0 },
    { type: 'arc', cx: hx - Rc, cz: hz - Rc, a0: 0, a1: Math.PI / 2 },
    { type: 'line', x0: hx - Rc, z0: hz, x1: -(hx - Rc), z1: hz, nx: 0, nz: 1 },
    { type: 'arc', cx: -hx + Rc, cz: hz - Rc, a0: Math.PI / 2, a1: Math.PI },
    { type: 'line', x0: -hx, z0: hz - Rc, x1: -hx, z1: -(hz - Rc), nx: -1, nz: 0 },
    { type: 'arc', cx: -hx + Rc, cz: -hz + Rc, a0: Math.PI, a1: (3 * Math.PI) / 2 },
    { type: 'line', x0: -(hx - Rc), z0: -hz, x1: hx - Rc, z1: -hz, nx: 0, nz: -1 },
    { type: 'arc', cx: hx - Rc, cz: -hz + Rc, a0: (3 * Math.PI) / 2, a1: 2 * Math.PI },
  ];
  const outer = [];
  for (const seg of segs) {
    if (seg.type === 'line') {
      outer.push({ x: seg.x0, z: seg.z0, nx: seg.nx, nz: seg.nz });
    } else {
      for (let k = 0; k < cornerSegs; k++) {
        const a = seg.a0 + (seg.a1 - seg.a0) * (k / cornerSegs);
        outer.push({ x: seg.cx + Rc * Math.cos(a), z: seg.cz + Rc * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) });
      }
    }
  }
  const N = outer.length;
  const arcLen = new Array(N);
  arcLen[0] = 0;
  for (let i = 1; i < N; i++) {
    arcLen[i] = arcLen[i - 1] + Math.hypot(outer[i].x - outer[i - 1].x, outer[i].z - outer[i - 1].z);
  }
  const totalPerim = arcLen[N - 1] + Math.hypot(outer[0].x - outer[N - 1].x, outer[0].z - outer[N - 1].z);
  const inset = outer.map((p) => ({ x: p.x - p.nx * Rt, z: p.z - p.nz * Rt }));

  const positions = [], normals = [], uvs = [];
  const idxTop = [], idxWall = [], idxBottom = [];
  const pushVert = (x, y, z, nx, ny, nz, u, v) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };
  const topUV = (x, z) => [(x + hx) / W, (z + hz) / L];

  const centerIdx = pushVert(0, H / 2, 0, 0, 1, 0, 0.5, 0.5);
  const capRingIdx = inset.map((p) => {
    const [u, v] = topUV(p.x, p.z);
    return pushVert(p.x, H / 2, p.z, 0, 1, 0, u, v);
  });
  for (let i = 0; i < N; i++) idxTop.push(centerIdx, capRingIdx[i], capRingIdx[(i + 1) % N]);

  const bevelSegs = 6;
  let prevRing = capRingIdx;
  for (let j = 1; j <= bevelSegs; j++) {
    const theta = (j / bevelSegs) * (Math.PI / 2);
    const rf = Math.sin(theta), df = 1 - Math.cos(theta);
    const ring = [];
    for (let i = 0; i < N; i++) {
      const ip = inset[i], op = outer[i];
      const x = ip.x + (op.x - ip.x) * rf, z = ip.z + (op.z - ip.z) * rf, y = H / 2 - Rt * df;
      const nx = op.nx * Math.sin(theta), ny = Math.cos(theta), nz = op.nz * Math.sin(theta);
      const [u, v] = topUV(x, z);
      ring.push(pushVert(x, y, z, nx, ny, nz, u, v));
    }
    for (let i = 0; i < N; i++) {
      const a0 = prevRing[i], a1 = prevRing[(i + 1) % N], b0 = ring[i], b1 = ring[(i + 1) % N];
      idxTop.push(a0, b0, b1, a0, b1, a1);
    }
    prevRing = ring;
  }

  const wallTopV = (H - Rt) / H;
  const totalRepeat = totalPerim / tileWidth;
  const wallTopRingUV = [], wallBotRingUV = [];
  for (let i = 0; i <= N; i++) {
    const p = outer[i % N];
    const u = i === N ? totalRepeat : arcLen[i] / tileWidth;
    wallTopRingUV.push(pushVert(p.x, H / 2 - Rt, p.z, p.nx, 0, p.nz, u, wallTopV));
    wallBotRingUV.push(pushVert(p.x, -H / 2, p.z, p.nx, 0, p.nz, u, 0));
  }
  for (let i = 0; i < N; i++) {
    const a0 = wallTopRingUV[i], a1 = wallTopRingUV[i + 1], b0 = wallBotRingUV[i], b1 = wallBotRingUV[i + 1];
    idxWall.push(a0, b0, b1, a0, b1, a1);
  }

  const centerBotIdx = pushVert(0, -H / 2, 0, 0, -1, 0, 0.5, 0.5);
  const botRingIdx = outer.map((p) => {
    const [u, v] = topUV(p.x, p.z);
    return pushVert(p.x, -H / 2, p.z, 0, -1, 0, u, v);
  });
  for (let i = 0; i < N; i++) idxBottom.push(centerBotIdx, botRingIdx[(i + 1) % N], botRingIdx[i]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex([...idxTop, ...idxWall, ...idxBottom]);
  geo.addGroup(0, idxTop.length, 0);
  geo.addGroup(idxTop.length, idxWall.length, 1);
  geo.addGroup(idxTop.length + idxWall.length, idxBottom.length, 2);
  return geo;
}

// Explode tuning. EXPLODE_IN/OUT bracket the zoom that toggles the stack; the
// gap between them is hysteresis so a stationary wheel can't flap the state.
const EXPLODE_MS = 720;
const LAYER_STAGGER = 0.07;
const EXPLODE_GAP = 9.5;
const EXPLODE_IN = 104;
const EXPLODE_OUT = 132;
const EXPLODE_DIST = 94;
const EXPLODE_SCALE = 0.55; // shrink the group so the taller stack stays framed

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

const VIEW_DEFS = [
  ['corner', 'Corner', 0.6, 0.62],
  ['front', 'Front', 0, 0.12],
  ['side', 'Side', Math.PI / 2, 0.12],
  ['top', 'Top', 0, 1.35],
  ['bottom', 'Bottom', 0, -1.35],
];

export default function MattressViewer({ product, autoRotate = true, brand = 'vedasleep' }) {
  const mountRef = useRef(null);
  const labelsRef = useRef(null);
  const [view, setView] = useState('corner');
  // Layer explode is opt-in per product: without product.layers none of the
  // code below runs and the viewer behaves exactly as it always has.
  const layerDefs = product.layers ?? null;
  const hasLayers = Array.isArray(layerDefs) && layerDefs.length > 0;
  const [exploded, setExploded] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(null);
  // Mutable animation/scene state that must NOT trigger re-renders, mirroring the
  // original `this.*` instance fields from the imperative viewer.
  const s = useRef({}).current;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    const load = (url) => {
      const t = loader.load(url, () => {
        s.dirty = true;
      });
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.colorSpace = THREE.SRGBColorSpace;
      disposables.push(t);
      return t;
    };

    const { textures, dimensions } = product;
    const top = load(publicUrl(textures.top));
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
    const geometry = buildMattressGeometry(W, H, L, 2.5, Math.min(1.3, H * 0.26), 8, L / 3.3);
    const box = new THREE.Mesh(geometry, [topMat, wallMat, bottomMat]);
    group.add(box);
    s.box = box;

    // ---- layer explode stack (Duro only, via product.layers) --------------
    // The solid box stays the collapsed representation so that view is
    // guaranteed unchanged; the stack cross-fades in as the explode begins.
    s.layers = null;
    if (hasLayers) {
      const total = layerDefs.reduce((a, l) => a + l.depth, 0) || H;
      const scale = H / total; // normalise placeholder depths onto the real height
      const shadowTex2 = makeShadowTexture();
      disposables.push(shadowTex2);

      const built = [];
      let yCursor = H / 2; // walk down from the top face
      layerDefs.forEach((def, i) => {
        const h = def.depth * scale;
        const yTop = yCursor;
        const yCenter = yTop - h / 2;
        yCursor -= h;

        // Only the top layer carries the mattress's rounded top edge; the rest
        // get a hairline bevel so cut foam doesn't read as razor-sharp.
        const bevel = i === 0 ? Math.min(Math.min(1.3, H * 0.26), h * 0.9) : Math.min(0.12, h * 0.4);
        const geo = buildMattressGeometry(W, h, L, 2.5, bevel, 8, L / 3.3);

        const base = { roughness: 0.96, metalness: 0, side: THREE.DoubleSide };
        let bumpMap = null;
        if (def.surface === 'convoluted') {
          bumpMap = makeConvolutedBump();
          bumpMap.repeat.set(Math.max(2, W / 14), Math.max(2, L / 14));
          disposables.push(bumpMap);
        }
        let faceMap = null;
        if (def.surface === 'speckled') {
          faceMap = makeSpeckleTexture(def.color);
          faceMap.repeat.set(Math.max(2, W / 26), Math.max(2, L / 26));
          disposables.push(faceMap);
        }

        const mk = (color, withBump, withMap) =>
          new THREE.MeshStandardMaterial({
            ...base,
            color: new THREE.Color(withMap ? '#ffffff' : color),
            map: withMap ? faceMap : null,
            bumpMap: withBump ? bumpMap : null,
            bumpScale: withBump ? 0.5 : 0,
            transparent: true,
            opacity: 0,
          });

        const topFace = def.useProductTop
          ? new THREE.MeshStandardMaterial({ ...topMatOpts, transparent: true, opacity: 0 })
          : mk(def.topColor ?? def.color, !!bumpMap, !!faceMap);
        const wallFace = mk(def.color, false, !!faceMap);
        const botFace = def.useProductBottom
          ? new THREE.MeshStandardMaterial({ map: bottom, ...base, transparent: true, opacity: 0 })
          : mk(def.color, false, !!faceMap);

        const mesh = new THREE.Mesh(geo, [topFace, wallFace, botFace]);
        mesh.position.y = yCenter;
        mesh.visible = false;
        mesh.userData.layerIndex = i;
        group.add(mesh);

        // Drop shadow cast onto whatever sits below this layer.
        let drop = null;
        if (i < layerDefs.length - 1) {
          drop = new THREE.Mesh(
            new THREE.PlaneGeometry(W * 1.16, L * 1.16),
            new THREE.MeshBasicMaterial({ map: shadowTex2, transparent: true, opacity: 0, depthWrite: false })
          );
          drop.rotation.x = -Math.PI / 2;
          drop.renderOrder = 1;
          drop.visible = false;
          group.add(drop);
        }

        built.push({ def, mesh, drop, h, restY: yCenter, mats: [topFace, wallFace, botFace] });
      });

      // Centre the exploded stack on the origin so it doesn't drift off-frame.
      const n = built.length;
      built.forEach((l, i) => {
        l.explodeDy = ((n - 1) / 2 - i) * EXPLODE_GAP;
      });

      s.layers = built;
      s.explodeT = 0;
      s.explodeTarget = 0;
      s.exploded = false;
    }

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

    const onPointerDown = (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      s.idle = -1e9;
      downAt = [e.clientX, e.clientY];
      dragDist = 0;
      el.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
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
      el.style.cursor = 'grab';
      // A tap (not a drag) while exploded picks a layer, or dismisses the card.
      if (hasLayers && s.exploded && downAt && dragDist < 6) {
        const r = el.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1
        );
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(s.layers.map((l) => l.mesh), false);
        const idx = hits.length ? hits[0].object.userData.layerIndex : null;
        setSelectedLayer((cur) => (idx === null || cur === idx ? null : idx));
        s.dirty = true;
      }
      downAt = null;
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
      s.explodeTarget = next ? 1 : 0;
      s.dirty = true;
      setExploded(next);
      if (!next) setSelectedLayer(null);
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
      if (!hasLayers) return false;
      // Time-based, not per-frame: the transition must last EXPLODE_MS whatever
      // the refresh rate (and headless/throttled tabs run far below 60fps).
      const now = performance.now();
      const dt = Math.min(64, now - (s.explodeLast ?? now));
      s.explodeLast = now;
      const step = dt / EXPLODE_MS;
      const before = s.explodeT;
      s.explodeT = Math.max(0, Math.min(1, s.explodeT + (s.explodeTarget - s.explodeT > 0 ? step : -step)));
      if (Math.abs(s.explodeTarget - s.explodeT) < step) s.explodeT = s.explodeTarget;
      const T = s.explodeT;
      const moving = T !== before;

      const n = s.layers.length;
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

      const labelEls = labelsRef.current ? labelsRef.current.children : [];
      s.layers.forEach((l, i) => {
        const lt = Math.max(0, Math.min(1, (T - i * LAYER_STAGGER) / span));
        const e = easeOutCubic(lt);
        l.mesh.visible = T > 0;
        l.mesh.position.y = l.restY + e * l.explodeDy;
        l.mats.forEach((m) => {
          m.opacity = reveal;
          m.transparent = reveal < 1;
          m.depthWrite = reveal > 0.5;
        });

        if (l.drop) {
          const below = s.layers[i + 1];
          const belowTop = below.restY + easeOutCubic(Math.max(0, Math.min(1, (T - (i + 1) * LAYER_STAGGER) / span))) * below.explodeDy + below.h / 2;
          const sep = l.mesh.position.y - l.h / 2 - belowTop;
          l.drop.visible = T > 0.02 && sep > 0.2;
          l.drop.position.y = belowTop + 0.06;
          const soft = Math.max(0.42, 1 - sep / (EXPLODE_GAP * 2.4));
          l.drop.material.opacity = reveal * 1.0 * soft;
          const spread = 1 + Math.min(0.22, sep * 0.02);
          l.drop.scale.set(spread, spread, 1);
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
              projected.set(cx * g2, l.mesh.position.y * g2, cz * g2).project(camera);
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
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      renderer.dispose();
      geometry.dispose();
      topMat.dispose();
      wallMat.dispose();
      bottomMat.dispose();
      shadowTex.dispose();
      if (s.layers) {
        s.layers.forEach((l) => {
          l.mesh.geometry.dispose();
          l.mats.forEach((m) => m.dispose());
          if (l.drop) {
            l.drop.geometry.dispose();
            l.drop.material.dispose();
          }
        });
        s.layers = null;
      }
      disposables.forEach((t) => t.dispose());
      if (mount.contains(el)) mount.removeChild(el);
    };
    // Re-run whenever the product (and hence its textures/dimensions) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    s.autoRotate = autoRotate;
  }, [autoRotate, s]);

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
    if (next) {
      const twoPi = Math.PI * 2;
      s.tTheta = 0.6 + Math.round((s.tTheta - 0.6) / twoPi) * twoPi;
      s.tPhi = 0.3;
      s.tDist = EXPLODE_DIST;
      setView('layers');
    } else {
      const twoPi = Math.PI * 2;
      s.tTheta = 0.6 + Math.round((s.tTheta - 0.6) / twoPi) * twoPi;
      s.tPhi = 0.62;
      s.tDist = mountRef.current && mountRef.current.clientWidth < 560 ? 195 : 150;
      setView('corner');
    }
    s.idle = performance.now();
    s.setExplodeState?.(next);
  };

  const { name, specLine, specsPending } = product;
  const t = BRAND_THEMES[brand] ?? BRAND_THEMES.vedasleep;

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
        <img src={publicUrl(t.logo)} alt={t.logoAlt} style={{ height: t.logoHeight, width: 'auto' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: 34,
              letterSpacing: '0.22em',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {name}
          </div>
          {specLine ? (
            <div style={{ fontSize: 12.5, fontWeight: 400, color: '#8a8a8e', letterSpacing: '0.04em', marginTop: 8 }}>
              {specLine.variant}
              {' · '}
              {specLine.thickness}
              {' · '}
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
              }}
            >
              Spec details to follow
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div ref={mountRef} style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'grab' }} />

        {hasLayers && (
          <div ref={labelsRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {layerDefs.map((l) => (
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
                  color: '#2b2b2b',
                  background: 'rgba(254,254,254,0.92)',
                  border: '1px solid rgba(199,125,17,0.35)',
                  borderRadius: 100,
                  padding: '4px 11px',
                  transition: 'opacity 0.2s linear',
                }}
              >
                <span style={{ color: '#c77d11', marginRight: 7 }}>&#9679;</span>
                {l.name}
              </div>
            ))}
          </div>
        )}

        {hasLayers && selectedLayer !== null && (
          <div
            onClick={() => setSelectedLayer(null)}
            style={{
              position: 'absolute',
              left: 18,
              bottom: 18,
              maxWidth: 320,
              background: '#FEFEFE',
              border: '1px solid #e4e0d4',
              borderRadius: 16,
              padding: '16px 18px 18px',
              boxShadow: '0 10px 34px rgba(0,0,0,0.10)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                fontSize: 9.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#c77d11',
                background: 'rgba(199,125,17,0.10)',
                borderRadius: 100,
                padding: '3px 9px',
                marginBottom: 10,
              }}
            >
              Layer {selectedLayer + 1} of {layerDefs.length}
              {layerDefs[selectedLayer].nameTbd ? ' · name TBD' : ''}
            </div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#1A1A1A',
                lineHeight: 1.25,
              }}
            >
              {layerDefs[selectedLayer].name}
            </div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 8, lineHeight: 1.5 }}>
              {layerDefs[selectedLayer].material}
            </div>
            <div style={{ fontSize: 12, color: '#2b2b2b', marginTop: 10, letterSpacing: '0.04em' }}>
              Thickness <strong style={{ fontWeight: 600 }}>{layerDefs[selectedLayer].thickness}</strong>
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
