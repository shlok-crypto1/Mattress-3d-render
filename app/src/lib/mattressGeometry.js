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
 * The quilted top panel, emitted onto whatever outline the caller hands it.
 *
 * Shared by both constructions below. A Euro-top's cushion cap and a tight
 * top's panel are the same piece of upholstery sewn to two different borders -
 * the puff, the taper into the bound edge and the pull into the binding are one
 * behaviour, so they are solved once here rather than twice with two sets of
 * constants free to drift apart.
 *
 * `capIn` is the outline the panel is sewn to, `hy` the height it sits at,
 * `uvAt(x, z)` its own UV frame, and `push` / `idxTop` the caller's vertex sink
 * and top-face index list.
 */
function emitQuiltCap({ capIn, N, hy, displace, capRings, edgeCompression, uvAt, push, idxTop }) {
  // The panel is mapped across its own extent, so the quilt photo lands on
  // the piece it belongs to rather than being sampled out of the middle of a
  // full-footprint projection.
  //
  // With no `displace` this stays the single flat fan it always was. Given
  // one, it becomes `capRings` concentric rings so the quilt's puffed cells
  // are real geometry: a normal map alone leaves the silhouette flat, and a
  // flat silhouette is what makes a quilt read as printed on rather than sewn
  // in.
  const rings = displace ? Math.max(3, capRings) : 1;
  // Displacement fades out over the last slice of the cap so the panel meets
  // the bound edge flush, exactly as the sculpted foam caps do.
  //
  // 0.1 of the cap's radius is three and a half inches on a 72" mattress -
  // a dead-flat border ring right where a viewer reads the silhouette, and
  // wider than the strip a real panel is actually pulled flat over. Narrowed
  // to the band the ring count can still resolve: `capRings` sets the ramp's
  // step, so this cannot be tightened further without more of them.
  const TAPER = 0.07;
  const taperAt = (t) => {
    const k = Math.min(1, Math.max(0, (1 - t) / TAPER));
    return k * k * (3 - 2 * k);
  };
  // ...and just inside that, it is drawn slightly under. A quilt panel is
  // pulled tight where it is sewn to the border tape, so the fabric dips into
  // the seam instead of running out flat to it. Zero at both ends of the
  // band, so the cap still meets the bevel exactly.
  const dipAt = (t) => {
    const k = Math.min(1, Math.max(0, (t - 0.72) / 0.28));
    const s = Math.sin(Math.PI * k);
    return s * s;
  };
  const dipAmp = edgeCompression * (displace ? (displace.amp ?? Math.abs(displace(0, 0))) * 0.5 + 0.06 : 0);
  const heightAt = (x, z, t) =>
    displace ? hy + displace(x, z) * taperAt(t) - dipAmp * dipAt(t) : hy;

  // Positions first, normals from the finished surface: differencing the
  // tessellation itself keeps the puff, the taper and the edge dip all
  // accounted for, where differencing `displace` alone would miss the last
  // two and shade the seam as though it were flat.
  const pos = [];
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const ring = [];
    for (let i = 0; i < N; i++) {
      const b = capIn.pts[i];
      const x = b.x * t, z = b.z * t;
      ring.push([x, heightAt(x, z, t), z]);
    }
    pos.push(ring);
  }
  const capIdx = [];
  for (let j = 0; j <= rings; j++) {
    const row = [];
    for (let i = 0; i < N; i++) {
      const [x, y, z] = pos[j][i];
      let nx = 0, ny = 1, nz = 0;
      if (rings > 1 && j > 0) {
        const a = pos[j][(i + 1) % N], b2 = pos[j][(i - 1 + N) % N];
        const o = pos[Math.min(rings, j + 1)][i], u = pos[Math.max(0, j - 1)][i];
        const t1 = [a[0] - b2[0], a[1] - b2[1], a[2] - b2[2]];
        const t2 = [o[0] - u[0], o[1] - u[1], o[2] - u[2]];
        nx = t1[1] * t2[2] - t1[2] * t2[1];
        ny = t1[2] * t2[0] - t1[0] * t2[2];
        nz = t1[0] * t2[1] - t1[1] * t2[0];
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      }
      const uv = uvAt(x, z);
      row.push(push(x, y, z, nx, ny, nz, uv[0], uv[1]));
    }
    capIdx.push(row);
  }
  // Ring 0 collapsed to a point: fan it, then quad-strip the rest.
  for (let i = 0; i < N; i++) {
    idxTop.push(capIdx[0][0], capIdx[1] ? capIdx[1][i] : capIdx[0][i], capIdx[1] ? capIdx[1][(i + 1) % N] : capIdx[0][(i + 1) % N]);
  }
  for (let j = 1; j < rings; j++) {
    const a = capIdx[j], b2 = capIdx[j + 1];
    for (let i = 0; i < N; i++) {
      const i1 = (i + 1) % N;
      idxTop.push(a[i], b2[i], b2[i1], a[i], b2[i1], a[i1]);
    }
  }
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
    displace = null,
    capRings = 1,
    edgeCompression = 0,
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
    emitQuiltCap({ capIn, N, hy, displace, capRings, edgeCompression, uvAt: cushUV, push, idxTop });
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
  // Where the quilt panel is sewn to the binding that wraps the top edge. It
  // is the one stitch path on this mattress that exists as real vectors rather
  // than as pixels in a photograph, which is what makes it the one worth
  // running actual thread along.
  geo.userData.quiltEdge = capIn.pts.map((p) => ({ x: p.x, y: hy, z: p.z }));
  // The extent the quilt photo is mapped across, so a displacement field
  // derived from that photo can be sampled in the same frame of reference -
  // plus the panel's own height, which is what its relief is scaled against.
  geo.userData.cushW = cushW;
  geo.userData.cushL = cushL;
  geo.userData.cushionH = cushionH;
  // Vertical extent of the base wall - the plain band under the piping. A woven
  // brand badge belongs on this band and nowhere else, and the proportions that
  // decide where it starts and stops are solved here, so a caller placing one
  // should read them off rather than re-deriving them from H.
  geo.userData.baseWall = { yBottom: yBot, yTop: yChamfer };
  return geo;
}

/**
 * Tight-top silhouette: one upholstered border running the full height of the
 * mattress, with the quilted panel sewn straight onto its top edge.
 *
 * The difference from `buildEuroTopGeometry` above is one of construction, not
 * of decoration. A Euro-top is two pieces - a base box and a cushion - with a
 * piping band declaring the join, so the eye reads a soft layer sitting on a
 * firm one. A tight top has no such join: the border is a single panel from
 * floor to binding, and the quilt is the mattress's own face rather than
 * something resting on it. Removing the mid-height seam is what removes the
 * pillow; flattening the cushion while that seam is still drawn does not.
 *
 * It is also the only construction that is honest on a thin grade. A 5" slab
 * has no room for a cushion at 30% of its height that still reads as a
 * mattress rather than as a folded quilt, which is why the thin grades are the
 * ones built this way.
 *
 * Stacked bottom to top:
 *
 *      ____________________     quilt panel        group 0
 *     /                    \    bound top edge     group 1 (border fabric)
 *   [======================]    binding tape/welt  group 3  <- stands proud
 *   | | | | | | | | | | | |     border wall        group 1, channel-quilted
 *   [======================]    foot tape/welt     group 3
 *    \____________________/     bottom             group 2
 *
 * Groups keep the meanings the other builders set - 0 top, 1 wall, 2 bottom,
 * 3 trim - so the viewer's existing four materials carry over untouched.
 *
 * The border carries shallow vertical channels between its two tapes. They are
 * real geometry rather than a pattern laid over the product's own border
 * photograph, which is deliberate: a procedural overlay would put a lattice
 * belonging to no product on top of fabric that already has its own weave (see
 * the note in MattressViewer), whereas channel quilting is a shape the border
 * genuinely has and one that reads on the silhouette. `channelDepth: 0` drops
 * it for a product whose border is plainly flat.
 */
export function buildTightTopGeometry(W, H, L, opts = {}) {
  const {
    // Tailored, not pillowy - the same footprint radius the Euro-top's base
    // carries, for the same reason.
    cornerRadius = 1.15,
    // The bound roll where the panel turns over onto the border. This is the
    // one soft edge on the whole product.
    topEdgeRadius = 0.34,
    // Just enough relief that the mattress does not meet the floor on a razor.
    bottomEdgeRadius = 0.18,
    // Binding tape at each end of the border, with a corded welt in it.
    tapeHeight = 0.34,
    weltProud = 0.09,
    // The quilted panel's own thickness - the wadding sewn into it, not the
    // mattress under it. Reported as `cushionH` so `quiltDisplacer` scales the
    // relief against the panel exactly as it does on a Euro-top; a tight top's
    // panel is thin, and that is what keeps its quilt flat without a second
    // set of quilt constants to tune.
    panelLoft = 0.5,
    // Vertical channel quilting in the border. Depth is in inches; the pitch is
    // snapped to a whole number of channels around the perimeter, so the
    // pattern closes on itself wherever the walk began.
    channelDepth = 0.12,
    channelPitch = 3.8,
    // How far the channels are eased back out to the flat border where they
    // meet a tape, in inches. A stitch line stops at a binding; it does not run
    // under one.
    channelEase = 0.18,
    // Which slice of the product's side.png is the plain border, as v.
    //
    // This is the one thing a tight top cannot inherit from the Euro-top: every
    // border photograph in the set is a photograph of a Euro-top border, so it
    // has that construction's piping and quilted cushion band printed into its
    // upper part. Mapped across a single wall, the picture puts back exactly
    // the seam the geometry just removed - the mattress reads as a pillow-top
    // again, in paint rather than in shape.
    //
    // Every photo in the set is authored the same way round, with the plain
    // base band at the bottom, so the fix is a window rather than a per-product
    // asset: the default is the widest slice that is plain fabric in all of
    // them, measured across both lines (Sova is the tightest at v 0.46, Duro
    // the lowest-starting at 0.05). A product whose border is photographed
    // differently can say so rather than being special-cased in code.
    borderBand = [0.08, 0.44],
    cornerSegs = 10,
    sideSegs = 1,
    tileWidth: tileWidthReq = L / 3.3,
    seamTile = L / 6,
    displace = null,
    capRings = 1,
    edgeCompression = 0,
  } = opts;

  const hy = H / 2;
  // Every band is clamped against the mattress it is on, so one set of
  // constants stays plausible at 5" and at 10" alike: the trim stays trim.
  const edgeTop = Math.min(topEdgeRadius, H * 0.14);
  const edgeBot = Math.min(bottomEdgeRadius, H * 0.07);
  const tape = Math.min(tapeHeight, H * 0.1);
  const panelH = Math.min(panelLoft, H * 0.14);

  const yBot = -hy;
  const yBotRoll = yBot + edgeBot;
  const yBotTape = yBotRoll + tape;
  const yTopRoll = hy - edgeTop;
  const yTopTape = yTopRoll - tape;

  const Rc = Math.max(0.35, cornerRadius);
  const base = roundedRectPerimeter(W, L, Rc, cornerSegs, sideSegs);
  const bottomIn = roundedRectPerimeter(
    W - 2 * edgeBot, L - 2 * edgeBot, Math.max(0.2, Rc - edgeBot), cornerSegs, sideSegs
  );
  // The welt stands outside the border, the way a cord sewn into a tape does.
  const proud = roundedRectPerimeter(
    W + 2 * weltProud, L + 2 * weltProud, Rc + weltProud, cornerSegs, sideSegs
  );
  const capIn = roundedRectPerimeter(
    W - 2 * edgeTop, L - 2 * edgeTop, Math.max(0.2, Rc - edgeTop), cornerSegs, sideSegs
  );
  const N = base.pts.length;

  // Whole number of tiles around the perimeter, for the reason spelled out in
  // buildEuroTopGeometry: the wall's u has to meet itself at the closure.
  const wallTiles = Math.max(1, Math.round(base.total / tileWidthReq));
  const tileWidth = base.total / wallTiles;

  const positions = [], normals = [], uvs = [];
  const idxTop = [], idxWall = [], idxBottom = [], idxSeam = [];
  const push = (x, y, z, nx, ny, nz, u, v) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };

  /**
   * One quad strip between two outlines held at two heights.
   *
   * The Euro-top builder needs two helpers for this - a vertical band and a
   * horizontal ring - because those are the only two cases it has. A tight top
   * is mostly slants: rolled edges, corded welts, the ease out of a channel.
   * Solving the normal from the profile's own run and rise covers all three in
   * one, and gives the vertical wall and the flat ledge exactly the normals the
   * two special-cased helpers produce.
   *
   * `u` is taken from `ringA` throughout, so the border texture stays
   * continuous across a strip whose two outlines have different perimeters.
   */
  const strip = (ringA, yA, vA, ringB, yB, vB, tile, idx) => {
    const a = [], b = [];
    const dy = yB - yA;
    for (let i = 0; i <= N; i++) {
      const pa = ringA.pts[i % N], pb = ringB.pts[i % N];
      const u = i === N ? ringA.total / tile : ringA.arcLen[i] / tile;
      // Outward run between the two outlines, measured along pa's own normal.
      const dr = (pb.x - pa.x) * pa.nx + (pb.z - pa.z) * pa.nz;
      const len = Math.hypot(dr, dy) || 1;
      const ny = -dr / len, k = dy / len;
      a.push(push(pa.x, yA, pa.z, pa.nx * k, ny, pa.nz * k, u, vA));
      b.push(push(pb.x, yB, pb.z, pb.nx * k, ny, pb.nz * k, u, vB));
    }
    for (let i = 0; i < N; i++) {
      idx.push(a[i], a[i + 1], b[i + 1], a[i], b[i + 1], b[i]);
    }
  };

  /** `f` of the way from outline A to outline B, keeping A's arc length. */
  const lerpRing = (A, B, f) => ({
    pts: A.pts.map((p, i) => {
      const q = B.pts[i];
      return { x: p.x + (q.x - p.x) * f, z: p.z + (q.z - p.z) * f, nx: p.nx, nz: p.nz };
    }),
    arcLen: A.arcLen,
    total: A.total,
  });

  // ---- border channels ---------------------------------------------------
  // Snapped to whole channels around the perimeter so the last one meets the
  // first, and phased on arc length so the run carries around the corners the
  // way stitching on a real border does.
  const channelCount = Math.max(1, Math.round(base.total / channelPitch));
  const channelled = (depth) => {
    if (!(depth > 0)) return base;
    const pts = base.pts.map((p, i) => {
      const phase = (base.arcLen[i] / base.total) * channelCount * Math.PI * 2;
      // 1 on a stitch line, 0 midway between two. Raised to a power so the
      // groove stays narrow and the fabric between two of them reads as a full
      // panel rather than as corrugation.
      const crest = 0.5 + 0.5 * Math.cos(phase);
      const d = -depth * Math.pow(crest, 2.4);
      return { x: p.x + p.nx * d, z: p.z + p.nz * d, nx: p.nx, nz: p.nz };
    });
    // Horizontal normals re-solved from the displaced outline. Without this the
    // channels exist on the silhouette and nowhere in the shading, which is the
    // half of the effect a viewer actually reads at a three-quarter angle.
    const out = pts.map((p, i) => {
      const nxt = pts[(i + 1) % N], prv = pts[(i - 1 + N) % N];
      let nx = nxt.z - prv.z, nz = -(nxt.x - prv.x);
      const len = Math.hypot(nx, nz) || 1;
      nx /= len; nz /= len;
      // Outward is whichever of the two perpendiculars agrees with the
      // undisplaced outline's own normal.
      if (nx * base.pts[i].nx + nz * base.pts[i].nz < 0) { nx = -nx; nz = -nz; }
      return { x: p.x, z: p.z, nx, nz };
    });
    return { pts: out, arcLen: base.arcLen, total: base.total };
  };
  const wall = channelled(channelDepth);

  // The border photo's plain band, divided between the pieces that wear it. The
  // rolls take a sliver at each end and the wall takes the rest, so the fabric
  // runs continuously from the floor to the binding at one scale.
  const [bandLo, bandHi] = borderBand;
  const bandSpan = bandHi - bandLo;
  const V_FLOOR = bandLo + bandSpan * 0.06;   // top of the bottom roll
  const V_BINDING = bandHi - bandSpan * 0.10; // where the bound top edge starts
  // The tapes are cut from the same cloth: self-binding, which is what a tight
  // top is finished with and what keeps the trim from picking up a stripe that
  // belongs to some other product's piping.
  const V_TAPE = bandLo + bandSpan * 0.25;
  const V_CORD = bandLo + bandSpan * 0.55;

  // ---- bottom edge and foot tape ----------------------------------------
  {
    const rollSegs = 3;
    let prevRing = bottomIn, prevY = yBot;
    for (let j = 1; j <= rollSegs; j++) {
      const theta = (j / rollSegs) * (Math.PI / 2);
      const ring = lerpRing(bottomIn, base, Math.sin(theta));
      const y = yBot + edgeBot * (1 - Math.cos(theta));
      const vA = bandLo + (V_FLOOR - bandLo) * ((j - 1) / rollSegs);
      const vB = bandLo + (V_FLOOR - bandLo) * (j / rollSegs);
      strip(prevRing, prevY, vA, ring, y, vB, tileWidth, idxWall);
      prevRing = ring;
      prevY = y;
    }
  }
  // Corded welt: out to the proud outline and back, so it catches light as a
  // raised cord instead of reading as a printed stripe.
  strip(base, yBotRoll, V_TAPE, proud, yBotRoll + tape / 2, V_CORD, seamTile, idxSeam);
  strip(proud, yBotRoll + tape / 2, V_CORD, base, yBotTape, V_TAPE, seamTile, idxSeam);

  // ---- border wall -------------------------------------------------------
  // The channels ease out to the flat border at each tape rather than running
  // under it, which is what a stitch line does when it terminates in a binding.
  {
    const span = yTopTape - yBotTape;
    const ease = Math.min(channelEase, span * 0.25);
    const vAt = (y) => V_FLOOR + (V_BINDING - V_FLOOR) * ((y - yBotTape) / span);
    const yA = yBotTape + ease, yB = yTopTape - ease;
    strip(base, yBotTape, vAt(yBotTape), wall, yA, vAt(yA), tileWidth, idxWall);
    strip(wall, yA, vAt(yA), wall, yB, vAt(yB), tileWidth, idxWall);
    strip(wall, yB, vAt(yB), base, yTopTape, vAt(yTopTape), tileWidth, idxWall);
  }

  // ---- head tape and bound top edge --------------------------------------
  strip(base, yTopTape, V_TAPE, proud, yTopTape + tape / 2, V_CORD, seamTile, idxSeam);
  strip(proud, yTopTape + tape / 2, V_CORD, base, yTopRoll, V_TAPE, seamTile, idxSeam);
  {
    // Bound in border fabric, not quilt - the same reasoning as the Euro-top's
    // bevel: this edge spans a hundredth of the top photo's width, and
    // projecting the quilt across it would magnify two or three texels into a
    // band around the entire perimeter. Border fabric is UV'd by arc length, so
    // it lands at its true scale.
    const rollSegs = 4;
    let prevRing = base, prevY = yTopRoll;
    for (let j = 1; j <= rollSegs; j++) {
      const theta = (j / rollSegs) * (Math.PI / 2);
      const ring = lerpRing(base, capIn, Math.sin(theta));
      const y = yTopRoll + edgeTop * (1 - Math.cos(theta));
      const vA = V_BINDING + (bandHi - V_BINDING) * ((j - 1) / rollSegs);
      const vB = V_BINDING + (bandHi - V_BINDING) * (j / rollSegs);
      strip(prevRing, prevY, vA, ring, y, vB, tileWidth, idxWall);
      prevRing = ring;
      prevY = y;
    }
  }

  // ---- quilt panel -------------------------------------------------------
  const panelW = W - 2 * edgeTop, panelL = L - 2 * edgeTop;
  emitQuiltCap({
    capIn, N, hy, displace, capRings, edgeCompression, push, idxTop,
    uvAt: (x, z) => [(x + panelW / 2) / panelW, (z + panelL / 2) / panelL],
  });

  // ---- bottom ------------------------------------------------------------
  {
    const centre = push(0, yBot, 0, 0, -1, 0, 0.5, 0.5);
    const ring = bottomIn.pts.map((p) => push(p.x, yBot, p.z, 0, -1, 0, (p.x + W / 2) / W, (p.z + L / 2) / L));
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
  // Same userData contract as buildEuroTopGeometry, so every caller - the edge
  // stitch, the quilt displacer, the woven badge - reads one shape whichever
  // construction it was handed.
  geo.userData.quiltEdge = capIn.pts.map((p) => ({ x: p.x, y: hy, z: p.z }));
  geo.userData.cushW = panelW;
  geo.userData.cushL = panelL;
  geo.userData.cushionH = panelH;
  // The plain band a woven badge belongs on: here it is the border itself,
  // between its two tapes.
  geo.userData.baseWall = { yBottom: yBotTape, yTop: yTopTape };
  return geo;
}
