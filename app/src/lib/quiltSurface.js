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
  // Relief between a stitch channel and a cell crown, in mattress inches.
  //
  // It used to be a fraction of the mattress's total thickness, which says the
  // wrong thing: the loft of a quilt panel belongs to the fabric and the
  // wadding sewn into it, not to what is underneath. Read that way the same
  // ticking puffed 0.24" on a 6" Classic and 0.40" on a 10" Luma - one product,
  // two different quilts, and the difference showed on the silhouette every
  // time a grade changed. Stated in inches it is one quilt at every grade, and
  // it stays within a couple of hundredths of what a 7" mattress rendered
  // before, so no product's cap moves noticeably from this alone.
  depth: 0.3,
  // ...capped against the quilted panel, so a shallow cushion cannot be
  // swallowed by its own quilting.
  depthMax: 0.35,
  // Slope the cell domes carry into the normal map, as an RMS gradient -
  // roughly tan of the typical tilt, so 0.22 is about 12 degrees typical and
  // half again as much on the steepest wall of a cell. Referenced rather than
  // fixed, for the reason spelled out where it is used.
  puffRelief: 0.22,
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
  // Edge thread. Radius is in inches - about 0.75mm at mattress scale - and
  // the tint multiplies the fabric's own average colour.
  stitchRadius: 0.03,
  stitchTint: 0.92,
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
  //
  // Its strength is normalised against the source's own contrast, because that
  // varies enormously across the catalogue: Magic's ticking has a standard
  // deviation of 45/255 and Ultima's 6/255. A single fixed strength embosses
  // the first like stone while the second all but disappears. Referencing every
  // product to the same perceptual relief is what makes this one system rather
  // than nine hand-tunings, and the per-product `normalScale` still layers on
  // top for anything that genuinely wants to differ.
  let mean = 0;
  for (let i = 0; i < fine.data.length; i++) mean += fine.data[i];
  mean /= fine.data.length;
  let variance = 0;
  for (let i = 0; i < fine.data.length; i++) {
    const d = fine.data[i] - mean;
    variance += d * d;
  }
  const sd = Math.sqrt(variance / fine.data.length);
  // Clamped so a nearly flat source is lifted without amplifying its noise, and
  // a very busy one is calmed without being erased.
  const REFERENCE_SD = 0.1;
  const strength = 9 * Math.min(2.2, Math.max(0.45, REFERENCE_SD / Math.max(1e-4, sd)));

  // The cells have to be in here too, not only in the geometry.
  //
  // The bump photo is flat-fielded, so on its own this map carried thread and
  // weave and nothing at the scale of a quilt cell - every dome lived in the
  // cap tessellation alone. That is about a third of an inch of relief across
  // six feet of mattress: two or three pixels on screen, and none at all on a
  // grid card. So the pattern was lit as though it were printed on a flat
  // sheet, which is exactly what a quilt must not look like. Folding the puff
  // field into the same height map gives every cell a dome that shades at any
  // distance, from the same reconstruction the geometry already uses - no
  // second guess at where the cells are.
  //
  // Referenced, not fixed, for the same reason `strength` is: the puff's own
  // gradient depends on how big that product's cells are, and `strength` has
  // already been set by the ticking's contrast. Measuring the slope the puff
  // actually produces and solving back for the scale that lands it on
  // `puffRelief` is what makes one number right for a lattice as coarse as
  // Riva's and one as busy as Resto's.
  const combined = fine.data.slice();
  {
    const { w, h } = fine;
    // RMS of the central difference `normalFromHeight` is about to take,
    // measured on the coarse field and referred to the fine one. Bilinear
    // upsampling leaves the slope per unit distance alone, so the per-pixel
    // gradient simply divides by the scale factor - which beats walking a
    // megapixel twice just to arrive at one number.
    const gk = coarse.w / w;
    const at = (x, y) => puff[(((y % coarse.h) + coarse.h) % coarse.h) * coarse.w + (((x % coarse.w) + coarse.w) % coarse.w)];
    let acc = 0;
    for (let y = 0; y < coarse.h; y++) {
      for (let x = 0; x < coarse.w; x++) {
        const gx = at(x + 1, y) - at(x - 1, y);
        const gy = at(x, y + 1) - at(x, y - 1);
        acc += gx * gx + gy * gy;
      }
    }
    const gradRms = Math.sqrt(acc / (2 * coarse.w * coarse.h)) * gk;
    const scale = cfg.puffRelief / Math.max(1e-6, gradRms * strength);
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      for (let x = 0; x < w; x++) {
        combined[y * w + x] += sample(puff, coarse.w, coarse.h, (x + 0.5) / w, v) * scale;
      }
    }
  }
  const normal = normalFromHeight(combined, fine.w, strength, fine.h);
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
 * Average colour of an image, as a THREE.Color.
 *
 * Used to tint the quilt's edge thread. The brief is explicit that the thread
 * should not be bright white unless the product's own fabric is: it should read
 * because of geometry and light, not because of contrast.
 */
export function averageColor(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 16, 16);
  const px = g.getImageData(0, 0, 16, 16).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < 256; i++) {
    r += px[i * 4]; gg += px[i * 4 + 1]; b += px[i * 4 + 2];
  }
  // SRGBColorSpace, matching how the photo itself is sampled.
  return new THREE.Color().setRGB(r / 65280, gg / 65280, b / 65280, THREE.SRGBColorSpace);
}

/**
 * Thread running the seam where the quilt panel meets its binding.
 *
 * Interior quilt channels are left to the normal map: they exist in these
 * products only as photographed pixels, and tracing vector stitch lines out of
 * a 600px photo would be guesswork that fought the very image it sits on. This
 * one path is different - the geometry builder knows exactly where it runs - so
 * it gets real thread.
 *
 * Radius is in mattress inches; the default is about 0.75mm at this scale.
 */
export function buildEdgeStitch(edge, { radius = 0.03, color, segments = 6 } = {}) {
  const pts = edge.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  // Two tube segments per outline point: enough to stay smooth around the
  // corner arcs without spending geometry on the long straight runs.
  const geo = new THREE.TubeGeometry(curve, pts.length * 2, radius, segments, true);
  const mat = new THREE.MeshStandardMaterial({
    color: color ?? new THREE.Color(0.8, 0.8, 0.8),
    // Thread is spun fibre - rougher than the woven face it sits on.
    roughness: 0.72,
    metalness: 0,
  });
  return new THREE.Mesh(geo, mat);
}

/**
 * A `displace(x, z) -> dy` for the geometry builders, in mattress units.
 *
 * `cushW`/`cushL` are the extent the quilt photo is mapped across, so the
 * relief lands exactly under the pattern that produced it. `cushionH` is the
 * quilted panel's own height - the thing the relief belongs to. All three are
 * reported by `buildEuroTopGeometry` in the geometry's userData, so a caller
 * reads them off the cap it is about to sculpt rather than re-deriving them.
 */
export function quiltDisplacer(maps, cushW, cushL, cushionH) {
  const { puff, puffW, puffH, cfg } = maps;
  const amp = Math.min(cfg.depth, cushionH * cfg.depthMax);
  // Referenced to the mean so the panel puffs and pinches around its original
  // height instead of the whole cap floating upward.
  let mean = 0;
  for (let i = 0; i < puff.length; i++) mean += puff[i];
  mean /= puff.length;
  const displace = (x, z) =>
    (sample(puff, puffW, puffH, x / cushW + 0.5, z / cushL + 0.5) - mean) * amp;
  // The geometry builder needs the amplitude, not just a sample of it, to size
  // the dip where the panel is drawn into its binding. It used to estimate it
  // from `displace(0, 0)` - the relief at the exact centre of the mattress,
  // which lands wherever that product's pattern happens to put it and is as
  // likely to be a channel as a crown. Carried on the function instead.
  displace.amp = amp;
  return displace;
}
