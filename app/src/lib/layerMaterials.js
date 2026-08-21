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
function tiled(tex, repeatX, repeatY) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(0.5, repeatX), Math.max(0.5, repeatY));
  t.needsUpdate = true;
  return t;
}

/**
 * Builds the three face materials for one layer plus, when the layer has a
 * sculpted surface, the displacement function the geometry builder needs.
 *
 * ctx: { W, L, h, wallTile, env, quality, productTop, productBottomMap, productSideMap }
 *   productTop        material options for the real photographed quilt top
 *   productBottomMap  the real photographed base cloth
 *   productSideMap    the real photographed gusset, wrapped around the base band
 */
export function createLayerMaterials(def, ctx) {
  const { W, L, h, wallTile, env, quality = 1 } = ctx;
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
    const nrm = tiled(normal, repeat[0], repeat[1]);
    disposables.push(nrm);
    let map = null;
    if (colorMap) {
      const cr = colorRepeat ?? repeat;
      map = tiled(colorMap, cr[0], cr[1]);
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
    topMat = new THREE.MeshPhysicalMaterial({
      ...ctx.productTop,
      envMap: env ?? null,
      envMapIntensity: base.envMapIntensity,
      sheen: 0.35,
      sheenRoughness: 0.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 0,
    });
    wallMat = mk({ normal: makeWovenNormal(46), repeat: [wallTile / SURFACE_PITCH.woven, Math.max(0.35, h / SURFACE_PITCH.woven)] });
    botMat = mk({ normal: makeWovenNormal(46), repeat: [W / SURFACE_PITCH.woven, L / SURFACE_PITCH.woven] });
  } else if (type === 'fabric-base') {
    // The base band is the part of the mattress you actually see from the side
    // in the reference renders - branded tape and all - so it wears the real
    // gusset and base photography.
    topMat = mk({ normal: makeWovenNormal(46), repeat: [W / SURFACE_PITCH.woven, L / SURFACE_PITCH.woven] });
    wallMat = ctx.productSideMap
      ? new THREE.MeshPhysicalMaterial({
          map: ctx.productSideMap,
          roughness: base.roughness,
          metalness: 0,
          envMap: env ?? null,
          envMapIntensity: base.envMapIntensity,
          sheen: 0.3,
          sheenRoughness: 0.8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
          emissive: new THREE.Color('#000000'),
          emissiveIntensity: 0,
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
  let capRings = 1;
  let sideSegs = 1;
  if (surface === 'convoluted' || surface === 'pyramid' || surface === 'channelled') {
    const amp = Math.min(h * 0.45, surface === 'channelled' ? 0.5 : 0.62);
    const cell = surface === 'channelled' ? 8 : 6;
    const k = (Math.PI * 2) / cell;
    if (surface === 'convoluted') {
      displace = (x, z) => -amp * (1 - (Math.sin(x * k) * Math.sin(z * k) + 1) * 0.5);
    } else if (surface === 'pyramid') {
      const tri = (v) => Math.abs(((v / cell) % 1) * 2 - 1);
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
    capRings,
    sideSegs,
    disposables,
  };
}
