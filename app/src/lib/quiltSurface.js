import * as THREE from 'three';
import { normalFromHeight } from './foamSurfaces';

// Turns a product's own quilt photography into the surface response of a
// quilted fabric: relief geometry for the puffed cells, and normal / roughness
// / occlusion detail for the stitching and weave.
//
// Everything here is derived from `top-bump.png`, the grayscale companion to
// each product's `top.png`. That matters for accuracy: every mattress in the
// catalogue has a different real quilt, and inventing a synthetic diamond
// lattice would make each render stop matching the fabric it is supposed to
// depict. The pattern is photographed; only the *physics* is reconstructed.
//
// The maps are cached by product slug and deliberately not disposed with the
// viewer, exactly like the procedural surfaces in foamSurfaces.js - navigating
// between products should not regenerate them.
const cache = new Map();

/** Sensible for every product in the catalogue; overridable per product. */
export const QUILT_DEFAULTS = {
  // Puff height as a fraction of mattress thickness. The spec's starting point
  // is 0.008; that is invisible at this scale, and the value below is what
  // actually reads as padding without tipping into the inflated-balloon look.
  depth: 0.04,
  // How far the fabric is drawn down as it approaches the bound edge. Real
  // quilt panels are pulled tight where they are sewn to the border tape.
  edgeCompression: 0.35,
  // Strength of the fine stitch/weave normal.
  normalScale: 0.85,
  // Fabric sheen. Kept low - premium mattress ticking is matte.
  sheen: 0.22,
  sheenRoughness: 0.85,
  roughness: 0.86,
  // Occlusion in the stitch channels.
  ao: 0.55,
};

// ------------------------------------------------------------- sampling ----

/**
 * Decode an image into a normalised luminance field.
 *
 * Downsampled to at most `maxSize` on the long edge: the field is only ever
 * used for low-frequency work (the puff dome and the blurred channel mask), so
 * full resolution would cost memory and blur time for detail that is about to
 * be averaged away regardless.
 */
function fieldFromImage(img, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(8, Math.round(img.width * scale));
  const h = Math.max(8, Math.round(img.height * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) {
    // These are grayscale sources, so any channel would do; the weighted sum
    // keeps it correct if a colour map is ever passed in.
    out[i] = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255;
  }
  return { data: out, w, h };
}

/**
 * Separable box blur, three passes - close enough to a gaussian for this and
 * far cheaper. Wraps at the edges because these fields tile with the texture.
 */
function blur(src, w, h, radius) {
  if (radius < 1) return src.slice();
  let a = src.slice();
  let b = new Float32Array(w * h);
  const r = Math.round(radius);
  const norm = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += a[row + ((k % w) + w) % w];
      for (let x = 0; x < w; x++) {
        b[row + x] = sum * norm;
        sum -= a[row + ((x - r) % w + w) % w];
        sum += a[row + ((x + r + 1) % w + w) % w];
      }
    }
    // vertical
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += b[(((k % h) + h) % h) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum * norm;
        sum -= b[((((y - r) % h) + h) % h) * w + x];
        sum += b[((((y + r + 1) % h) + h) % h) * w + x];
      }
    }
  }
  return a;
}

/** Value of `f` at normalised (u, v), bilinear, wrapping. */
function sample(f, w, h, u, v) {
  const fx = (u - Math.floor(u)) * w - 0.5;
  const fy = (v - Math.floor(v)) * h - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const xa = ((x0 % w) + w) % w, xb = (xa + 1) % w;
  const ya = ((y0 % h) + h) % h, yb = (ya + 1) % h;
  const top = f[ya * w + xa] * (1 - tx) + f[ya * w + xb] * tx;
  const bot = f[yb * w + xa] * (1 - tx) + f[yb * w + xb] * tx;
  return top * (1 - ty) + bot * ty;
}

// ------------------------------------------------------------- the puff ----

/**
 * Reconstruct which parts of the panel are padded and which are pinched.
 *
 * The obvious approach - low-pass the bump map and call that the macro shape -
 * does not work, and it is worth saying why: these maps are already high-passed
 * (their standard deviation under a heavy blur is ~0.1/255), because the source
 * photography is evenly lit and flat-fielded. There is no broad shading left to
 * recover.
 *
 * What the map does carry is the stitching: thin dark channels where the thread
 * pulls the fabric down. That is enough, because it is also how the real thing
 * works. Fabric is compressed along the stitch lines and puffs up between them,
 * so a blurred mask of "how much stitching is nearby" inverts directly into
 * "how padded is this spot" - a dome over every quilt cell, falling to nothing
 * at the seams, with no pattern invented anywhere.
 *
 * The threshold is a percentile rather than a fixed level so that a low
 * contrast ticking (Ultima, sd 6/255) and a strongly patterned one (Magic, sd
 * 45/255) both yield the same amount of channel.
 */
function puffFromStitching(field, w, h) {
  const { data } = field;
  // Percentile threshold, from a histogram - sorting 260k floats to find one
  // number is wasteful.
  const BINS = 256;
  const hist = new Uint32Array(BINS);
  for (let i = 0; i < data.length; i++) hist[Math.min(BINS - 1, (data[i] * BINS) | 0)]++;
  const target = data.length * 0.3; // darkest 30% is treated as channel
  let acc = 0, cut = 0;
  for (let i = 0; i < BINS; i++) {
    acc += hist[i];
    if (acc >= target) { cut = (i + 0.5) / BINS; break; }
  }
  // Soft mask: 1 well inside a channel, 0 clear of one. The soft shoulder
  // matters - a hard mask quantises into visible terraces once it is blurred.
  const band = 0.12;
  const mask = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const t = Math.min(1, Math.max(0, (cut + band - data[i]) / (2 * band)));
    mask[i] = t * t * (3 - 2 * t);
  }
  // Blur radius sets the cell shape. Roughly a tenth of the panel: wide enough
  // that a whole quilt cell reads as one dome rather than each stitch getting
  // its own dimple, narrow enough that neighbouring cells stay distinct.
  const spread = blur(mask, w, h, Math.max(2, Math.round(Math.min(w, h) * 0.035)));
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < spread.length; i++) {
    if (spread[i] < lo) lo = spread[i];
    if (spread[i] > hi) hi = spread[i];
  }
  const span = Math.max(1e-6, hi - lo);
  const puff = new Float32Array(spread.length);
  for (let i = 0; i < spread.length; i++) {
    // Inverted (more stitching nearby -> less puff) and eased, so cell crowns
    // are rounded rather than coming to a point.
    const t = 1 - (spread[i] - lo) / span;
    puff[i] = t * t * (3 - 2 * t);
  }
  return puff;
}

// ---------------------------------------------------------------- maps -----

/**
 * Build every quilt map for one product, or return the cached set.
 *
 * `img` must already be decoded (an HTMLImageElement from a loaded texture).
 */
export function quiltMaps(key, img, opts = {}) {
  const cached = cache.get(key);
  if (cached) return cached;

  const cfg = { ...QUILT_DEFAULTS, ...opts };
  // The fine field stays near source resolution - this is the detail the
  // viewer actually gets close to. The coarse one only feeds blurs.
  const fine = fieldFromImage(img, 1024);
  const coarse = fieldFromImage(img, 256);
  const puff = puffFromStitching(coarse, coarse.w, coarse.h);

  // Micro detail: the bump map is already exactly this - stitch chains, thread
  // and weave, with the broad shading flat-fielded out - so it goes in as-is.
  const normal = normalFromHeight(fine.data, fine.w, 9, fine.h);
  normal.anisotropy = 8;

  // Roughness and occlusion share the channel structure: thread and the
  // compressed fabric beside it scatter more and see less of the room than a
  // taut crown does. Both are built at the coarse size - neither carries
  // detail finer than the shading it modulates.
  const rough = new Uint8ClampedArray(puff.length * 4);
  const ao = new Uint8ClampedArray(puff.length * 4);
  for (let i = 0; i < puff.length; i++) {
    const crown = puff[i];
    const r = (cfg.roughness + (1 - crown) * 0.10) * 255;
    const o = (1 - (1 - crown) * (1 - cfg.ao)) * 255;
    rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = r;
    ao[i * 4] = ao[i * 4 + 1] = ao[i * 4 + 2] = o;
    rough[i * 4 + 3] = ao[i * 4 + 3] = 255;
  }

  const maps = {
    normal,
    roughnessMap: dataTexture(rough, coarse.w, coarse.h),
    aoMap: dataTexture(ao, coarse.w, coarse.h),
    puff,
    puffW: coarse.w,
    puffH: coarse.h,
    cfg,
  };
  // aoMap defaults to the second UV set; these meshes only have one, and it is
  // the same projection the quilt photo uses.
  maps.aoMap.channel = 0;
  cache.set(key, maps);
  return maps;
}

function dataTexture(data, w, h) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/**
 * A `displace(x, z) -> dy` for the geometry builders, in mattress units.
 *
 * `cushW`/`cushL` are the extent the quilt photo is mapped across, so the
 * relief lands exactly under the pattern that produced it.
 */
export function quiltDisplacer(maps, cushW, cushL, thickness) {
  const { puff, puffW, puffH, cfg } = maps;
  const amp = thickness * cfg.depth;
  // Referenced to the mean so the panel puffs and pinches around its original
  // height instead of the whole cap floating upward.
  let mean = 0;
  for (let i = 0; i < puff.length; i++) mean += puff[i];
  mean /= puff.length;
  return (x, z) => (sample(puff, puffW, puffH, x / cushW + 0.5, z / cushL + 0.5) - mean) * amp;
}
