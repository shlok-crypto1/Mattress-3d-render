import * as THREE from 'three';

// Procedural stand-ins for real layer photography. Everything here is a small
// canvas texture generated once and shared by every layer that asks for the
// same parameters, so a product with eight bands pays for one grain map, not
// eight. They are deliberately NOT disposed with the viewer: the cache outlives
// individual mounts (a few hundred KB of GPU memory in total) so navigating
// between products never regenerates them.
const cache = new Map();
const memo = (key, make) => {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
};

// ---------------------------------------------------------------- noise ----

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tiling value noise at `freq` cells across `size` px. */
function valueNoise(size, freq, rnd) {
  const g = new Float32Array(freq * freq);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const out = new Float32Array(size * size);
  const sc = freq / size;
  for (let y = 0; y < size; y++) {
    const fy = y * sc;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    const wy = ty * ty * (3 - 2 * ty);
    const y1 = (y0 + 1) % freq;
    for (let x = 0; x < size; x++) {
      const fx = x * sc;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const wx = tx * tx * (3 - 2 * tx);
      const x1 = (x0 + 1) % freq;
      const a = g[y0 * freq + x0] + (g[y0 * freq + x1] - g[y0 * freq + x0]) * wx;
      const b = g[y1 * freq + x0] + (g[y1 * freq + x1] - g[y1 * freq + x0]) * wx;
      out[y * size + x] = a + (b - a) * wy;
    }
  }
  return out;
}

function fbm(size, octaves, baseFreq, seed) {
  const rnd = mulberry32(seed);
  const out = new Float32Array(size * size);
  let amp = 1;
  let norm = 0;
  let freq = baseFreq;
  for (let o = 0; o < octaves; o++) {
    const f = valueNoise(size, Math.max(2, Math.round(freq)), rnd);
    for (let i = 0; i < out.length; i++) out[i] += f[i] * amp;
    norm += amp;
    amp *= 0.52;
    freq *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

/** Height field to tangent-space normal map. */
function normalFromHeight(h, size, strength) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const wrap = (v) => ((v % size) + size) % size;
  const at = (x, y) => h[wrap(y) * size + wrap(x)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const p = (y * size + x) * 4;
      img.data[p] = (nx * 0.5 + 0.5) * 255;
      img.data[p + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[p + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[p + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------- surfaces ----

/**
 * Open-cell foam grain: fine porous pits over a slow density drift, so a slab
 * reads matte and slightly irregular instead of like moulded plastic.
 */
export function makeFoamGrainNormal(seed = 7) {
  return memo(`foam-grain-${seed}`, () => {
    const size = 256;
    const fine = fbm(size, 3, 64, seed);
    const cells = fbm(size, 2, 26, seed + 991);
    const h = new Float32Array(size * size);
    for (let i = 0; i < h.length; i++) {
      // Sharpen the fine octave into pore-like pits rather than soft hills.
      const pore = Math.pow(fine[i], 2.4);
      h[i] = pore * 0.72 + cells[i] * 0.28;
    }
    return normalFromHeight(h, size, 26);
  });
}

/** Egg-crate / convoluted foam: rounded peaks in a square lattice. */
export function makeConvolutedNormal(cells = 10) {
  return memo(`convoluted-${cells}`, () => {
    const size = 256;
    const grain = fbm(size, 3, 60, 41);
    const h = new Float32Array(size * size);
    const k = (Math.PI * 2 * cells) / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = (Math.sin(x * k) * Math.sin(y * k) + 1) * 0.5;
        h[y * size + x] = v * 0.9 + grain[y * size + x] * 0.1;
      }
    }
    return normalFromHeight(h, size, 9);
  });
}

/** Sawtooth pyramid foam: hard ridges, the profile on the orange base layers. */
export function makePyramidNormal(cells = 12) {
  return memo(`pyramid-${cells}`, () => {
    const size = 256;
    const grain = fbm(size, 3, 60, 77);
    const h = new Float32Array(size * size);
    const c = cells / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = Math.abs(((x * c) % 1) * 2 - 1);
        const fz = Math.abs(((y * c) % 1) * 2 - 1);
        const v = 1 - Math.max(fx, fz);
        h[y * size + x] = v * 0.92 + grain[y * size + x] * 0.08;
      }
    }
    return normalFromHeight(h, size, 11);
  });
}

/** Straight channel cuts across a support slab (Riva's zoned core). */
export function makeChannelNormal(cuts = 9) {
  return memo(`channel-${cuts}`, () => {
    const size = 256;
    const grain = fbm(size, 3, 58, 313);
    const h = new Float32Array(size * size);
    const k = (Math.PI * 2 * cuts) / size;
    for (let y = 0; y < size; y++) {
      const groove = Math.pow((Math.cos(y * k) + 1) * 0.5, 0.6);
      for (let x = 0; x < size; x++) h[y * size + x] = groove * 0.86 + grain[y * size + x] * 0.14;
    }
    return normalFromHeight(h, size, 14);
  });
}

/** Plain woven fabric: warp over weft, for gusset walls and base cloth. */
export function makeWovenNormal(threads = 46) {
  return memo(`woven-${threads}`, () => {
    const size = 256;
    const fuzz = fbm(size, 2, 90, 523);
    const h = new Float32Array(size * size);
    const c = threads / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x * c;
        const v = y * c;
        const iu = Math.floor(u);
        const iv = Math.floor(v);
        const over = ((iu + iv) & 1) === 0;
        const bu = Math.cos((u - iu - 0.5) * Math.PI);
        const bv = Math.cos((v - iv - 0.5) * Math.PI);
        const t = over ? 0.62 + 0.38 * bu : 0.34 + 0.3 * bv;
        h[y * size + x] = t * 0.85 + fuzz[y * size + x] * 0.15;
      }
    }
    return normalFromHeight(h, size, 12);
  });
}

/** Quilted knit cover: diamond puffs pinched by stitch lines. */
export function makeQuiltedNormal(cells = 5) {
  return memo(`quilted-${cells}`, () => {
    const size = 256;
    const knit = fbm(size, 3, 72, 811);
    const h = new Float32Array(size * size);
    const c = cells / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = ((x * c) % 1) * 2 - 1;
        const fy = ((y * c) % 1) * 2 - 1;
        const diamond = Math.min(1, (Math.abs(fx) + Math.abs(fy)) * 0.62);
        const puff = Math.cos(diamond * Math.PI * 0.5);
        h[y * size + x] = puff * 0.8 + knit[y * size + x] * 0.2;
      }
    }
    return normalFromHeight(h, size, 10);
  });
}

/** Horizontal rings on a pocketed spring sleeve. */
export function makeCoilRibNormal(ribs = 11) {
  return memo(`coil-rib-${ribs}`, () => {
    const size = 128;
    const weave = fbm(size, 2, 60, 1201);
    const h = new Float32Array(size * size);
    const k = (Math.PI * 2 * ribs) / size;
    for (let y = 0; y < size; y++) {
      const rib = (Math.sin(y * k) + 1) * 0.5;
      for (let x = 0; x < size; x++) h[y * size + x] = rib * 0.82 + weave[y * size + x] * 0.18;
    }
    return normalFromHeight(h, size, 13);
  });
}

/** Rebonded-foam chip speckle (Ortho Bond and the FOAMICO support cores). */
export function makeSpeckleTexture(base = '#DCD7CE', size = 256) {
  return memo(`speckle-${base}-${size}`, () => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);
    const chips = ['#E86A6A', '#4FB0C8', '#F2C14E', '#6BBF59', '#2E2E2E', '#F0F0F0', '#C86FB0'];
    const rnd = mulberry32(9137);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = chips[(rnd() * chips.length) | 0];
      g.globalAlpha = 0.35 + rnd() * 0.5;
      const w = 1 + rnd() * 4;
      const h = 1 + rnd() * 4;
      g.save();
      g.translate(rnd() * size, rnd() * size);
      g.rotate(rnd() * Math.PI);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.restore();
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Soft radial blob reused for the ground shadow and per-layer drop shadows. */
export function makeShadowTexture(size = 256) {
  return memo(`shadow-${size}`, () => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const h = size / 2;
    const grad = g.createRadialGradient(h, h, size * 0.04, h, h, size * 0.49);
    grad.addColorStop(0, 'rgba(0,0,0,0.34)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  });
}

/**
 * Contact-occlusion band: clear in the middle, dark toward the rim. Laid just
 * under a separated layer it darkens the air gap at the edges the way a real
 * cut foam face occludes its neighbour, so exploded bands read as solid slabs
 * with depth between them rather than floating flat cards.
 */
export function makeContactAOTexture(size = 256) {
  return memo(`contact-ao-${size}`, () => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const h = size / 2;
    const grad = g.createRadialGradient(h, h, size * 0.2, h, h, size * 0.5);
    grad.addColorStop(0, 'rgba(0,0,0,0.02)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.17)');
    grad.addColorStop(0.93, 'rgba(0,0,0,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  });
}

// ---------------------------------------------------------- environment ----

/**
 * A tiny studio IBL. Without an environment map MeshStandardMaterial has no
 * specular response at grazing angles and every slab flattens out; this is the
 * single biggest step from "coloured box" to "product render". Built from a
 * gradient dome plus two softboxes and prefiltered once per renderer.
 *
 * Applied only to layer materials, so the collapsed mattress keeps the exact
 * lighting it always had and no product's default view changes.
 */
export function makeStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();

  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.42, '#d9dad6');
  grad.addColorStop(0.62, '#8d8e8b');
  grad.addColorStop(1, '#37383a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  const domeTex = new THREE.CanvasTexture(c);
  domeTex.colorSpace = THREE.SRGBColorSpace;

  const parts = [];
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(60, 24, 16),
    new THREE.MeshBasicMaterial({ map: domeTex, side: THREE.BackSide })
  );
  scene.add(dome);
  parts.push(dome);

  const softbox = (w, h, x, y, z, intensity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.material.color.multiplyScalar(intensity);
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
    parts.push(m);
  };
  softbox(34, 22, 22, 34, 26, 3.4);
  softbox(40, 26, -30, 14, -18, 1.15);

  // Returned as a render target so the caller can release it on unmount.
  const rt = pmrem.fromScene(scene, 0.03);

  parts.forEach((m) => {
    m.geometry.dispose();
    m.material.dispose();
  });
  domeTex.dispose();
  pmrem.dispose();

  return rt;
}
