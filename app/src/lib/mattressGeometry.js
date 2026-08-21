import * as THREE from 'three';

// Builds a mattress box with rounded top corners/edges (footprint corner radius Rc,
// top-edge bevel radius Rt) instead of a hard-edged box, so it reads as a real
// mattress silhouette instead of a cardboard box. Three material groups:
// 0 = top face + bevel (quilted fabric), 1 = wall (gusset/side fabric, wraps the
// whole rounded perimeter as one continuous texture), 2 = bottom face.
//
// `opts.displace(x, z) -> dy` optionally sculpts the top cap (convoluted /
// pyramid foam). When present the flat fan cap is replaced by `opts.capRings`
// concentric rings so the profile is real geometry, not just a normal map -
// that silhouette is what makes a comfort layer read as foam rather than a
// coloured slab. Displacement tapers to zero at the cap's outer edge so it
// never tears away from the bevel ring.
//
// `opts.sideSegs` subdivides the four straight runs of the footprint. The solid
// mattress leaves it at 1 (one vertex per side, exactly as before); a sculpted
// cap needs enough perimeter samples to resolve its bump pitch, otherwise the
// displacement aliases into long diagonal creases.
export function buildMattressGeometry(W, H, L, Rc, Rt, cornerSegs, tileWidth, opts = {}) {
  const { displace = null, capRings = 1, sideSegs = 1 } = opts;
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
      for (let k = 0; k < sideSegs; k++) {
        const f = k / sideSegs;
        outer.push({
          x: seg.x0 + (seg.x1 - seg.x0) * f,
          z: seg.z0 + (seg.z1 - seg.z0) * f,
          nx: seg.nx,
          nz: seg.nz,
        });
      }
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

  // Displacement, faded out over the last slice of the cap radius so the
  // sculpted surface meets the bevel ring flush.
  const EPS = 0.4;
  const taperAt = (t) => {
    const k = Math.min(1, Math.max(0, (1 - t) / 0.08));
    return k * k * (3 - 2 * k);
  };
  const sampleTop = (x, z, t) => {
    if (!displace) return { y: H / 2, nx: 0, ny: 1, nz: 0 };
    const w = taperAt(t);
    if (w <= 0.0001) return { y: H / 2, nx: 0, ny: 1, nz: 0 };
    const d = displace(x, z) * w;
    const dx = (displace(x + EPS, z) - displace(x - EPS, z)) * w / (2 * EPS);
    const dz = (displace(x, z + EPS) - displace(x, z - EPS)) * w / (2 * EPS);
    const len = Math.hypot(-dx, 1, -dz);
    return { y: H / 2 + d, nx: -dx / len, ny: 1 / len, nz: -dz / len };
  };

  const rings = displace ? Math.max(2, capRings) : 1;
  const c0 = sampleTop(0, 0, 0);
  const centerIdx = pushVert(0, c0.y, 0, c0.nx, c0.ny, c0.nz, 0.5, 0.5);
  // Rings walk from the centre out to the inset outline; each is that outline
  // scaled toward the origin, so the cap stays conformal to the rounded rect.
  const ringIdx = [];
  for (let j = 1; j <= rings; j++) {
    const t = j / rings;
    const ring = inset.map((p) => {
      const x = p.x * t, z = p.z * t;
      const sm = sampleTop(x, z, t);
      const [u, v] = topUV(x, z);
      return pushVert(x, sm.y, z, sm.nx, sm.ny, sm.nz, u, v);
    });
    ringIdx.push(ring);
  }
  for (let i = 0; i < N; i++) idxTop.push(centerIdx, ringIdx[0][i], ringIdx[0][(i + 1) % N]);
  for (let j = 0; j < rings - 1; j++) {
    const a = ringIdx[j], b = ringIdx[j + 1];
    for (let i = 0; i < N; i++) {
      const i1 = (i + 1) % N;
      idxTop.push(a[i], b[i], b[i1], a[i], b[i1], a[i1]);
    }
  }
  const capRingIdx = ringIdx[rings - 1];

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
  // No explicit tangents: three derives them in the shader from screen-space
  // derivatives, which is accurate enough here and saves a vec4 per vertex on
  // the highest-layer-count products.
  return geo;
}
