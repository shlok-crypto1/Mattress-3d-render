import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { publicUrl } from '../lib/publicUrl';

// Builds a mattress box with rounded top corners/edges (footprint corner radius Rc,
// top-edge bevel radius Rt) instead of a hard-edged box, so it reads as a real
// mattress silhouette instead of a cardboard box. Three material groups:
// 0 = top face + bevel (quilted fabric), 1 = wall (gusset/side fabric, wraps the
// whole rounded perimeter as one continuous texture), 2 = bottom face.
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

const VIEW_DEFS = [
  ['corner', 'Corner', 0.6, 0.62],
  ['front', 'Front', 0, 0.12],
  ['side', 'Side', Math.PI / 2, 0.12],
  ['top', 'Top', 0, 1.35],
  ['bottom', 'Bottom', 0, -1.35],
];

export default function MattressViewer({ product, autoRotate = true }) {
  const mountRef = useRef(null);
  const [view, setView] = useState('corner');
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

    const onPointerDown = (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      s.idle = -1e9;
      el.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        s.tTheta += (e.clientX - prev[0]) * 0.006;
        s.tPhi = Math.min(1.45, Math.max(-1.45, s.tPhi + (e.clientY - prev[1]) * 0.006));
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
        if (lastPinch) s.tDist = Math.min(260, Math.max(80, (s.tDist * lastPinch) / d));
        lastPinch = d;
      }
    };
    const onPointerUp = (e) => {
      pointers.delete(e.pointerId);
      lastPinch = 0;
      s.idle = performance.now();
      el.style.cursor = 'grab';
    };
    const onWheel = (e) => {
      e.preventDefault();
      s.tDist = Math.min(260, Math.max(80, s.tDist + e.deltaY * 0.15));
      s.idle = performance.now();
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
      s.tDist = s.dist = w < 560 ? 195 : 150;
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    s.ro = ro;
    resize();
    s.idle = performance.now();

    const tick = () => {
      s.raf = requestAnimationFrame(tick);
      if (s.autoRotate && pointers.size === 0 && s.idle > 0 && performance.now() - s.idle > 3000) {
        s.tTheta += 0.0018;
      }
      const k = 0.08;
      if (
        Math.abs(s.tTheta - s.theta) > 1e-4 ||
        Math.abs(s.tPhi - s.phi) > 1e-4 ||
        Math.abs(s.tDist - s.dist) > 1e-3 ||
        s.dirty
      ) {
        s.theta += (s.tTheta - s.theta) * k;
        s.phi += (s.tPhi - s.phi) * k;
        s.dist += (s.tDist - s.dist) * k;
        const cp = Math.cos(s.phi), sp = Math.sin(s.phi);
        camera.position.set(s.dist * cp * Math.sin(s.theta), s.dist * sp, s.dist * cp * Math.cos(s.theta));
        camera.lookAt(0, 0, 0);
        s.shadow.material.opacity = Math.max(0, Math.min(1, sp + 0.15));
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
    const twoPi = Math.PI * 2;
    const t = theta + Math.round((s.tTheta - theta) / twoPi) * twoPi;
    s.tTheta = t;
    s.tPhi = phi;
    s.idle = performance.now();
    setView(name);
  };

  const { name, specLine } = product;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        fontFamily: "'Poppins', -apple-system, sans-serif",
        background:
          'radial-gradient(ellipse 70% 60% at 50% 58%, rgba(199,125,17,0.08) 0%, rgba(199,125,17,0) 62%), #F6F8F1',
        color: '#2b2b2b',
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
        <img src={publicUrl('/brand/vedasleep-logo.png')} alt="Veda Sleep" style={{ height: 32, width: 'auto' }} />
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
          ) : null}
        </div>
      </div>

      <div ref={mountRef} style={{ flex: 1, minHeight: 0, touchAction: 'none', cursor: 'grab' }} />

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
        </div>
        <div style={{ fontSize: 11.5, color: '#b0b0b4', fontWeight: 300, letterSpacing: '0.03em' }}>Drag to rotate</div>
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
          background: #f4f4f5;
          color: #6e6e73;
        }
        .mv-view-btn[data-active="true"] {
          background: #1d1d1f;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
