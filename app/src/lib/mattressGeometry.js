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
/**
 * Walks a rounded-rectangle footprint once, returning one point per sample with
 * its outward normal, plus the running arc length used for wall UVs.
 *
 * Two footprints walked with the same cornerSegs/sideSegs produce the same
 * number of points in the same parametric order, so a ring built from one can
 * be stitched straight onto a ring built from the other. That is what lets the
 * Euro-top's base, piping and cushion outlines connect without any resampling.
 */
export function roundedRectPerimeter(W, L, Rc, cornerSegs, sideSegs = 1) {
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
  const pts = [];
  for (const seg of segs) {
    if (seg.type === 'line') {
      for (let k = 0; k < sideSegs; k++) {
        const f = k / sideSegs;
        pts.push({
          x: seg.x0 + (seg.x1 - seg.x0) * f,
          z: seg.z0 + (seg.z1 - seg.z0) * f,
          nx: seg.nx,
          nz: seg.nz,
        });
      }
    } else {
      for (let k = 0; k < cornerSegs; k++) {
        const a = seg.a0 + (seg.a1 - seg.a0) * (k / cornerSegs);
        pts.push({ x: seg.cx + Rc * Math.cos(a), z: seg.cz + Rc * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) });
      }
    }
  }
  const n = pts.length;
  const arcLen = new Array(n);
  arcLen[0] = 0;
  for (let i = 1; i < n; i++) {
    arcLen[i] = arcLen[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  }
  const total = arcLen[n - 1] + Math.hypot(pts[0].x - pts[n - 1].x, pts[0].z - pts[n - 1].z);
  return { pts, arcLen, total };
}

/**
 * Make every triangle wind so that it is front-facing from the side its own
 * vertex normals point to.
 *
 * The perimeter walk in `roundedRectPerimeter` runs clockwise as seen from
 * above, so caps built by fanning across it came out back-facing: three then
 * negates the shading normal for those fragments (materials here are
 * DoubleSided), and the quilt top was being lit as though it faced the floor.
 * That was invisible while the scene was lit mostly by an AmbientLight, which
 * is normal-independent - it only surfaced once the rig became directional.
 *
 * Fixing it by flipping the winding rather than the walk direction keeps every
 * UV, arc length and tile-snapping calculation exactly as it was. Faces whose
 * normal is perpendicular to their plane (degenerate slivers) are left alone.
 */
function orientFaces(positions, normals, index) {
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const e1x = positions[b * 3] - ax, e1y = positions[b * 3 + 1] - ay, e1z = positions[b * 3 + 2] - az;
    const e2x = positions[c * 3] - ax, e2y = positions[c * 3 + 1] - ay, e2z = positions[c * 3 + 2] - az;
    const fx = e1y * e2z - e1z * e2y;
    const fy = e1z * e2x - e1x * e2z;
    const fz = e1x * e2y - e1y * e2x;
    const vx = normals[a * 3] + normals[b * 3] + normals[c * 3];
    const vy = normals[a * 3 + 1] + normals[b * 3 + 1] + normals[c * 3 + 1];
    const vz = normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2];
    if (fx * vx + fy * vy + fz * vz < 0) {
      index[t + 1] = c;
      index[t + 2] = b;
    }
  }
  return index;
}

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
  geo.setIndex(orientFaces(positions, normals, [...idxTop, ...idxWall, ...idxBottom]));
  geo.addGroup(0, idxTop.length, 0);
  geo.addGroup(idxTop.length, idxWall.length, 1);
  geo.addGroup(idxTop.length + idxWall.length, idxBottom.length, 2);
  // No explicit tangents: three derives them in the shader from screen-space
  // derivatives, which is accurate enough here and saves a vec4 per vertex on
  // the highest-layer-count products.
  return geo;
}

/**
 * Euro-top silhouette: a firm base box with a separate cushion sewn on top,
 * divided by a piping band that runs the whole perimeter. Standard mattress
 * construction, so it is shared by every product rather than switched on per
 * slug.
 *
 * The cushion carries the base's full footprint - flush sides, corner to corner
 * - which is what separates a Euro-top from a pillow-top, where the cushion is
 * inset and sits on a visible shelf. cushionInset can still step it in if a
 * pillow-top is ever wanted.
 *
 * Stacked bottom to top:
 *
 *      ____________________     cushion cap       group 0 (quilt)
 *     /                    \    cushion bevel     group 0  <- the only soft edge
 *     |                    |    cushion wall      group 1 (border fabric, upper v)
 *   [========================]  piping band       group 3  <- stands proud
 *   |                        |  shelf + chamfer   group 3 / 1
 *   |                        |  base wall         group 1 (border fabric, lower v)
 *   |________________________|  bottom            group 2
 *
 * The base keeps a small footprint radius and only a slight chamfer under the
 * shelf: a real mattress edge is tailored and structured, and rounding it like
 * a pillow is what made the old single-box model read as a soft blob.
 *
 * Groups 0-2 keep the same meaning as buildMattressGeometry (top / wall /
 * bottom) so the viewer's existing materials carry over; group 3 is the piping.
 */
export function buildEuroTopGeometry(W, H, L, opts = {}) {
  const {
    baseCornerRadius = 1.15,
    baseTopChamfer = 0.2,
    cushionInset = 0,
    cushionBevel = 0.32,
    cushionRatio = 0.3,
    seamHeight = 0.4,
    seamProud = 0.13,
    cornerSegs = 10,
    sideSegs = 1,
    tileWidth: tileWidthReq = L / 3.3,
    seamTile = L / 6,
  } = opts;

  const hy = H / 2;
  // Proportions are clamped so a 5" slab and a 12" slab both stay plausible:
  // the cushion never eats the base, and the piping stays a band, not a stripe.
  const cushionH = Math.max(0.9, Math.min(H * cushionRatio, H * 0.42));
  const seamH = Math.max(0.18, Math.min(seamHeight, H * 0.09));
  const baseH = H - cushionH - seamH;
  const bevel = Math.min(cushionBevel, cushionH * 0.75);
  const chamfer = Math.min(baseTopChamfer, baseH * 0.25);
  const inset = Math.min(cushionInset, Math.min(W, L) * 0.06);

  const yBot = -hy;
  const yChamfer = yBot + baseH - chamfer;
  const yShelf = yBot + baseH;
  const ySeamTop = yShelf + seamH;
  const yCushionBevel = hy - bevel;

  const baseR = Math.max(0.35, baseCornerRadius);
  const cushR = Math.max(0.3, baseR - inset);
  const base = roundedRectPerimeter(W, L, baseR, cornerSegs, sideSegs);
  const chamferIn = roundedRectPerimeter(
    W - 2 * chamfer, L - 2 * chamfer, Math.max(0.2, baseR - chamfer), cornerSegs, sideSegs
  );
  const seam = roundedRectPerimeter(
    W - 2 * (inset - seamProud), L - 2 * (inset - seamProud),
    Math.max(0.25, cushR + seamProud), cornerSegs, sideSegs
  );
  const cush = roundedRectPerimeter(W - 2 * inset, L - 2 * inset, cushR, cornerSegs, sideSegs);
  const capIn = roundedRectPerimeter(
    W - 2 * (inset + bevel), L - 2 * (inset + bevel), Math.max(0.2, cushR - bevel), cornerSegs, sideSegs
  );
  const N = base.pts.length;

  // The perimeter has to hold a whole number of tiles. At 13.1 the wall's u ran
  // 0 -> 13.1 and then jumped back to 0 at the closure, so even a perfectly
  // seamless photo tore there. Snapping the tile width rather than the count
  // honours the requested tile size to within half a tile.
  const wallTiles = Math.max(1, Math.round(base.total / tileWidthReq));
  const tileWidth = base.total / wallTiles;

  // One side-fabric photo has to cover both walls, so it is split by height:
  // the base takes the lower band, the cushion the upper one, and the piping
  // sits between. Splitting proportionally keeps texel size equal on both
  // instead of squashing the shorter piece.
  const baseWallH = yChamfer - yBot;
  const cushWallH = yCushionBevel - ySeamTop;
  const vSplit = baseWallH / Math.max(1e-6, baseWallH + cushWallH);

  const positions = [], normals = [], uvs = [];
  const idxTop = [], idxWall = [], idxBottom = [], idxSeam = [];
  const push = (x, y, z, nx, ny, nz, u, v) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };
  // Cushion faces map across the cushion's own extent, so the quilt photo fills
  // the piece it belongs to instead of being sampled out of the middle of a
  // full-footprint projection.
  const cushW = W - 2 * inset, cushL = L - 2 * inset;
  const cushUV = (x, z) => [(x + cushW / 2) / cushW, (z + cushL / 2) / cushL];

  /** Vertical band around one outline, UV by arc length. */
  const wallBand = (ring, yA, yB, vA, vB, tile, idx) => {
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const p = ring.pts[i % N];
      const u = i === N ? ring.total / tile : ring.arcLen[i] / tile;
      top.push(push(p.x, yB, p.z, p.nx, 0, p.nz, u, vB));
      bot.push(push(p.x, yA, p.z, p.nx, 0, p.nz, u, vA));
    }
    for (let i = 0; i < N; i++) {
      idx.push(bot[i], bot[i + 1], top[i + 1], bot[i], top[i + 1], top[i]);
    }
  };

  /** Horizontal ring joining two different outlines at one height. */
  const flatRing = (outerRing, innerRing, y, vOuter, vInner, tile, idx) => {
    const o = [], n2 = [];
    for (let i = 0; i <= N; i++) {
      const a = outerRing.pts[i % N], b = innerRing.pts[i % N];
      const u = i === N ? outerRing.total / tile : outerRing.arcLen[i] / tile;
      o.push(push(a.x, y, a.z, 0, 1, 0, u, vOuter));
      n2.push(push(b.x, y, b.z, 0, 1, 0, u, vInner));
    }
    for (let i = 0; i < N; i++) {
      idx.push(o[i], n2[i], n2[i + 1], o[i], n2[i + 1], o[i + 1]);
    }
  };

  // ---- base -------------------------------------------------------------
  wallBand(base, yBot, yChamfer, 0, vSplit * 0.94, tileWidth, idxWall);
  {
    // Slight chamfer under the shelf - tailored, not rounded.
    const outer = [], inner = [];
    for (let i = 0; i <= N; i++) {
      const a = base.pts[i % N], b = chamferIn.pts[i % N];
      const u = i === N ? base.total / tileWidth : base.arcLen[i] / tileWidth;
      outer.push(push(a.x, yChamfer, a.z, a.nx * 0.7, 0.7, a.nz * 0.7, u, vSplit * 0.94));
      inner.push(push(b.x, yShelf, b.z, a.nx * 0.7, 0.7, a.nz * 0.7, u, vSplit));
    }
    for (let i = 0; i < N; i++) {
      idxWall.push(outer[i], inner[i], inner[i + 1], outer[i], inner[i + 1], outer[i + 1]);
    }
  }
  // Shelf: the ledge of base left proud of the cushion, in trim fabric.
  flatRing(chamferIn, seam, yShelf, 0, 0.45, seamTile, idxSeam);
  // Piping: stands proud of the cushion wall so it catches light as a raised
  // cord rather than reading as a printed stripe.
  wallBand(seam, yShelf, ySeamTop, 0.45, 0.92, seamTile, idxSeam);
  flatRing(seam, cush, ySeamTop, 0.92, 1, seamTile, idxSeam);

  // ---- cushion ----------------------------------------------------------
  const V_BINDING = 0.93; // where the border photo's top edge becomes binding tape
  wallBand(cush, ySeamTop, yCushionBevel, vSplit, V_BINDING, tileWidth, idxWall);
  {
    // The rounded top edge is bound in border fabric, not quilt.
    //
    // A euro-top's quilt panel is sewn to a tape that wraps this edge, which is
    // also what makes it renderable: the bevel spans well under a hundredth of
    // the top photo's width, so projecting the quilt across it magnified two or
    // three texels around the entire perimeter and smeared them into a chrome
    // band. Border fabric is UV'd by arc length, so it lands at its true scale.
    const bevelSegs = 4;
    let prev = null;
    for (let j = 0; j <= bevelSegs; j++) {
      const theta = (j / bevelSegs) * (Math.PI / 2);
      const rf = Math.sin(theta), df = 1 - Math.cos(theta);
      const v = V_BINDING + (1 - V_BINDING) * (j / bevelSegs);
      const ring = [];
      for (let i = 0; i <= N; i++) {
        const a = cush.pts[i % N], b = capIn.pts[i % N];
        const x = a.x + (b.x - a.x) * rf, z = a.z + (b.z - a.z) * rf;
        const y = yCushionBevel + bevel * df;
        const u = i === N ? cush.total / tileWidth : cush.arcLen[i] / tileWidth;
        ring.push(push(x, y, z, a.nx * Math.cos(theta), Math.sin(theta), a.nz * Math.cos(theta), u, v));
      }
      if (prev) {
        for (let i = 0; i < N; i++) {
          idxWall.push(prev[i], ring[i], ring[i + 1], prev[i], ring[i + 1], prev[i + 1]);
        }
      }
      prev = ring;
    }
    // Quilt cap, mapped across the cushion's own extent.
    const cap = [];
    for (let i = 0; i < N; i++) {
      const b = capIn.pts[i];
      const uv = cushUV(b.x, b.z);
      cap.push(push(b.x, hy, b.z, 0, 1, 0, uv[0], uv[1]));
    }
    const c0 = cushUV(0, 0);
    const centre = push(0, hy, 0, 0, 1, 0, c0[0], c0[1]);
    for (let i = 0; i < N; i++) idxTop.push(centre, cap[i], cap[(i + 1) % N]);
  }

  // ---- bottom -----------------------------------------------------------
  {
    const centre = push(0, yBot, 0, 0, -1, 0, 0.5, 0.5);
    const ring = base.pts.map((p) => push(p.x, yBot, p.z, 0, -1, 0, (p.x + W / 2) / W, (p.z + L / 2) / L));
    for (let i = 0; i < N; i++) idxBottom.push(centre, ring[(i + 1) % N], ring[i]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(orientFaces(positions, normals, [...idxTop, ...idxWall, ...idxBottom, ...idxSeam]));
  let at = 0;
  geo.addGroup(at, idxTop.length, 0); at += idxTop.length;
  geo.addGroup(at, idxWall.length, 1); at += idxWall.length;
  geo.addGroup(at, idxBottom.length, 2); at += idxBottom.length;
  geo.addGroup(at, idxSeam.length, 3);
  // The border's dimple pitch has to be derived from the same snapped numbers,
  // or the tuft map reintroduces the closure seam the snapping just removed.
  geo.userData.wallTile = tileWidth;
  geo.userData.perimeter = base.total;
  return geo;
}
