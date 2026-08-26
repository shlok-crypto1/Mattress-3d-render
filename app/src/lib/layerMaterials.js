import * as THREE from 'three';
import {
  makeFoamGrainNormal,
  makeConvolutedNormal,
  makePyramidNormal,
  makeChannelNormal,
  makeWovenNormal,
  makeQuiltedNormal,
  makeSpeckleTexture,
} from './foamSurfaces';

// The four layer types every product's stack is expressed in. Anything a
// product declares must be one of these; the viewer never special-cases a
// product by slug.
export const LAYER_TYPES = ['foam', 'coil', 'fabric-cover', 'fabric-base'];

// Physical response per type. Foam is matte and porous; fabric is softer and a
// little glossier with a sheen falloff; the coil sleeve sits between the two.
const TYPE_BASE = {
  foam: { roughness: 0.92, metalness: 0, envMapIntensity: 0.34, surface: 'plain' },
  'fabric-cover': { roughness: 0.66, metalness: 0, envMapIntensity: 0.6, surface: 'quilted' },
  'fabric-base': { roughness: 0.72, metalness: 0, envMapIntensity: 0.52, surface: 'woven' },
  coil: { roughness: 0.74, metalness: 0, envMapIntensity: 0.55, surface: 'woven' },
};

// Physical pitch of each pattern, in mattress units (inches). Repeats are
// derived from these so a 72" slab and a 4" gusset wall show the same grain
// size instead of the texture stretching to fit whatever face it lands on.
const SURFACE_PITCH = {
  plain: 6,
  convoluted: 18,
  pyramid: 18,
  channelled: 27,
  speckled: 26,
  woven: 3.8,
  quilted: 20,
};

const surfaceOf = (def) => def.surface ?? TYPE_BASE[def.type]?.surface ?? 'plain';

function patternNormal(surface) {
  switch (surface) {
    case 'convoluted':
      return makeConvolutedNormal(10);
    case 'pyramid':
      return makePyramidNormal(12);
    case 'channelled':
      return makeChannelNormal(9);
    case 'woven':
      return makeWovenNormal(46);
    case 'quilted':
      return makeQuiltedNormal(5);
    default:
      return makeFoamGrainNormal(7);
  }
}

/**
 * Clone a cached pattern so this face can carry its own repeat. Clones share
 * the underlying `source`, so three uploads the pixels once however many faces
 * ask for it - only the UV transform differs.
 */
function tiled(tex, repeatX, repeatY, maxAnisotropy = 1) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(0.5, repeatX), Math.max(0.5, repeatY));
  // Sampler state is per-texture even though clones share the pixels, so each
  // face has to ask for anisotropy itself. Without this the exploded stack's
  // foam grain, quilting and weave sampled at 1x and broke up into shimmer at
  // exactly the grazing angles the layer view is usually seen from.
  t.anisotropy = maxAnisotropy;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Builds the three face materials for one layer plus, when the layer has a
 * sculpted surface, the displacement function the geometry builder needs.
 *
 * ctx: { W, L, h, wallTile, env, quality, productTop, productBottomMap }
 *   productTop        material options for the real photographed quilt top
 *   productBottomMap  the real photographed base cloth, worn by every face of
 *                     the base band
 */
export function createLayerMaterials(def, ctx) {
  const { W, L, h, wallTile, env, quality = 1, maxAnisotropy = 1 } = ctx;
  const type = def.type ?? 'foam';
  const base = TYPE_BASE[type] ?? TYPE_BASE.foam;
  const surface = surfaceOf(def);
  const pitch = SURFACE_PITCH[surface] ?? SURFACE_PITCH.plain;
  const disposables = [];

  // Face-relative repeats. The horizontal faces are UV-mapped 0..1 across the
  // footprint; the wall is mapped by arc length in `wallTile` units, and by
  // fraction of the layer's own height vertically.
  const faceRepeat = [W / pitch, L / pitch];
  const wallRepeat = [wallTile / pitch, Math.max(0.35, h / pitch)];

  const grain = makeFoamGrainNormal(7);
  const pattern = patternNormal(surface);

  const speckle = surface === 'speckled' ? makeSpeckleTexture(def.color) : null;

  const normalScaleFor = (s) => {
    switch (s) {
      case 'convoluted':
      case 'pyramid':
        return 0.85;
      case 'channelled':
        return 0.7;
      case 'quilted':
        return 0.55;
      case 'woven':
        return 0.4;
      default:
        return 0.32;
    }
  };

  const fabricish = type === 'fabric-cover' || type === 'fabric-base' || type === 'coil';

  const mk = ({ colorMap = null, colorRepeat = null, normal, repeat, roughness, extra = {} }) => {
    const nrm = tiled(normal, repeat[0], repeat[1], maxAnisotropy);
    disposables.push(nrm);
    let map = null;
    if (colorMap) {
      const cr = colorRepeat ?? repeat;
      map = tiled(colorMap, cr[0], cr[1], maxAnisotropy);
      disposables.push(map);
    }
    const opts = {
      color: new THREE.Color(map ? '#ffffff' : def.color ?? '#dddddd'),
      map,
      normalMap: nrm,
      normalScale: new THREE.Vector2(1, 1),
      roughness: roughness ?? base.roughness,
      metalness: base.metalness,
      envMap: env ?? null,
      envMapIntensity: base.envMapIntensity,
      side: THREE.DoubleSide,
      // The stack cross-fades in behind the solid box, so every layer material
      // starts fully transparent and is driven by the explode progress.
      transparent: true,
      opacity: 0,
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 0,
      ...extra,
    };
    const m = fabricish
      ? new THREE.MeshPhysicalMaterial({ ...opts, sheen: 0.4, sheenRoughness: 0.75, sheenColor: new THREE.Color('#ffffff') })
      : new THREE.MeshStandardMaterial(opts);
    m.normalScale.setScalar(normalScaleFor(surface === 'speckled' ? 'plain' : surface));
    return m;
  };

  let topMat;
  let wallMat;
  let botMat;

  if (type === 'fabric-cover' && ctx.productTop) {
    // Reuse the real photographed quilt for the visible sleeping surface; the
    // cut edges of the cover get plain cloth.
    //
    // This used to be knocked down by a COVER_TONE multiplier, because with no
    // tone mapping a near-white quilt (Maxa, Magic, Ultima) already sat at
    // ~1.0 from the lights alone: anything specular pushed it past clipping and
    // the cover flattened into a white slab that lost its quilt and its
    // silhouette both. The renderer now tone maps, so highlights roll off
    // instead of clipping and the cover can carry the same physical fabric
    // response as the solid box - which is also what keeps the two consistent
    // as the stack explodes out of it.
    topMat = new THREE.MeshPhysicalMaterial({
      ...ctx.productTop,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 0,
    });
    wallMat = mk({ normal: makeWovenNormal(46), repeat: [wallTile / SURFACE_PITCH.woven, Math.max(0.35, h / SURFACE_PITCH.woven)] });
    botMat = mk({ normal: makeWovenNormal(46), repeat: [W / SURFACE_PITCH.woven, L / SURFACE_PITCH.woven] });
  } else if (type === 'fabric-base') {
    // The base band is a slab wrapped in base cloth, so all three of its faces
    // are that one cloth: the photograph on the underside, the same photograph
    // tiled at the weave's own pitch around the wall, and the colour sampled
    // from it on the cut top face.
    //
    // The wall used to wear `productSideMap` instead - the whole mattress's
    // gusset photograph, which spans cover, piping and border, squeezed onto a
    // band under an inch tall. That is what made the bottom band read charcoal
    // on top and cream down its sides in the exploded view.
    topMat = mk({ normal: makeWovenNormal(46), repeat: [W / SURFACE_PITCH.woven, L / SURFACE_PITCH.woven] });
    wallMat = ctx.productBottomMap
      ? mk({
          colorMap: ctx.productBottomMap,
          colorRepeat: wallRepeat,
          normal: makeWovenNormal(46),
          repeat: wallRepeat,
        })
      : mk({ normal: makeWovenNormal(46), repeat: wallRepeat });
    botMat = ctx.productBottomMap
      ? new THREE.MeshPhysicalMaterial({
          map: ctx.productBottomMap,
          roughness: base.roughness,
          metalness: 0,
          envMap: env ?? null,
          envMapIntensity: base.envMapIntensity,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
          emissive: new THREE.Color('#000000'),
          emissiveIntensity: 0,
        })
      : mk({ normal: makeWovenNormal(46), repeat: [W / SURFACE_PITCH.woven, L / SURFACE_PITCH.woven] });
  } else {
    const grainFace = [W / SURFACE_PITCH.plain, L / SURFACE_PITCH.plain];
    const grainWall = [wallTile / SURFACE_PITCH.plain, Math.max(0.35, h / SURFACE_PITCH.plain)];
    const speckFace = [W / SURFACE_PITCH.speckled, L / SURFACE_PITCH.speckled];
    const speckWall = [wallTile / SURFACE_PITCH.speckled, Math.max(0.35, h / SURFACE_PITCH.speckled)];

    topMat = mk({
      colorMap: speckle,
      colorRepeat: speckFace,
      normal: pattern,
      repeat: faceRepeat,
      extra: def.topColor && !speckle ? { color: new THREE.Color(def.topColor) } : {},
    });
    // Cut foam sides never show the moulded top pattern - only the open-cell
    // grain - so the wall and underside always fall back to it.
    wallMat = mk({ colorMap: speckle, colorRepeat: speckWall, normal: grain, repeat: grainWall });
    botMat = mk({ colorMap: speckle, colorRepeat: speckFace, normal: grain, repeat: grainFace });
  }

  // Real geometric relief on the sculpted comfort/transition tops. This is what
  // gives the zig-zag silhouette in the reference photos; the normal map alone
  // only shades a flat plane.
  let displace = null;
  let displaceDepth = 0;
  let capRings = 1;
  let sideSegs = 1;
  if (surface === 'convoluted' || surface === 'pyramid' || surface === 'channelled') {
    const amp = Math.min(h * 0.45, surface === 'channelled' ? 0.5 : 0.62);
    // How far the sculpted cap cuts down into the slab. Reported back because a
    // caller stacking something underneath this one has to know how much of the
    // slab the relief has already eaten - see the bonded band in layerStack.js.
    displaceDepth = amp;
    const cell = surface === 'channelled' ? 8 : 6;
    const k = (Math.PI * 2) / cell;
    if (surface === 'convoluted') {
      displace = (x, z) => -amp * (1 - (Math.sin(x * k) * Math.sin(z * k) + 1) * 0.5);
    } else if (surface === 'pyramid') {
      // Floor, not `%`. JavaScript's remainder takes the sign of the dividend,
      // so `(v / cell) % 1` is negative for every negative coordinate and this
      // wave peaked at 2.98 instead of 1 across the whole x<0 / z<0 half of the
      // slab - inverting the pyramid pattern there and cutting nearly three
      // times as deep as `amp` says. On Ultima's transition sheet that was a
      // 1.175in gouge into 0.875in of foam. It went unnoticed while the sheet
      // was a band with nothing beneath it; the moment the base was bonded
      // underneath, the overcut surfaced as base cloth showing through the
      // orange. `p - Math.floor(p)` is the fractional part for both signs.
      const tri = (v) => {
        const p = v / cell;
        return Math.abs((p - Math.floor(p)) * 2 - 1);
      };
      displace = (x, z) => -amp * Math.max(tri(x), tri(z));
    } else {
      displace = (x, z) => -amp * (1 - (Math.cos(z * k) + 1) * 0.5);
    }
    capRings = Math.max(10, Math.round(30 * quality));
    sideSegs = Math.max(6, Math.round(22 * quality));
  }

  return {
    materials: [topMat, wallMat, botMat],
    displace,
    displaceDepth,
    capRings,
    sideSegs,
    disposables,
  };
}
