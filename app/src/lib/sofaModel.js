import * as THREE from 'three';
import { buildMattressGeometry } from './mattressGeometry';
import { makeWovenNormal } from './foamSurfaces';

// The Sofa cum Bed, in its seat position.
//
// It is three identical hinged foam panels in one upholstered cover. Folded up,
// two of them stack to make the seat and the third stands at the back as the
// rest; opened out, the same three lie in a row as a single bed. This module
// builds the seat position, which is what the two front-on product shots show.
//
// PROPORTIONS, NOT DIMENSIONS. Every number below is read off the photographs
// in "source/Foamico mattresses/Sofa cum Bed/", by measuring the seat's front face
// against the panel thickness in the straight-on shot: the face is about 5.4x
// as wide as one panel is thick, and the back panel about 3x as tall. Real
// dimensions are TBD in docs/PRODUCT_CATALOG.md and must not be read out of
// this file - these describe the shape, not the size. They share the mattress
// scene's arbitrary unit only so the two can be framed by the same camera code.

export const PANEL = {
  width: 38,
  depth: 21,
  thickness: 7,
  // Upholstered foam, so no sharp arris anywhere: the footprint corners are
  // rounded and the exposed edge is softened.
  cornerRadius: 1.6,
  edgeRadius: 1.1,
};

// The rest leans back a little rather than standing square, which is both how
// it photographs and what stops the seat reading as a cube with a lid.
const REST_TILT = 0.12; // radians

// A hinge is a fold in one cover, so the panels touch. A hairline keeps their
// two surfaces from z-fighting where they meet.
const CONTACT = 0.06;

/** Physical size of the fabric swatch, so its weave holds one scale on every face. */
const FABRIC_PITCH = 9;

// Relief comes from the procedural weave, not from the photograph.
//
// The colour map is a mirrored tile, which is exact for colour - the two edges
// hold the same values - but a mirrored HEIGHT field has a discontinuous
// derivative at every mirror line, and converting that to a normal map put a
// crease along each one. On the rendered backrest they read as a regular set of
// horizontal streaks. layerMaterials.js already pairs photographed fabric with
// makeWovenNormal for exactly this reason; the sofa follows it.
const WEAVE_THREADS = 56;
const WEAVE_SCALE = 0.5;

/**
 * @returns {{ group: THREE.Group, materials: THREE.Material[], bounds: {width:number,height:number,depth:number}, dispose: Function }}
 */
export function buildSofaCumBed({ fabricMap, env, quality = 1, maxAnisotropy = 1 }) {
  const { width: W, depth: D, thickness: T, cornerRadius, edgeRadius } = PANEL;
  const disposables = [];

  // All three panels are the same piece of foam, so one geometry and one set of
  // materials serve all three meshes - three uploads the buffers once and the
  // only thing that differs per panel is its transform.
  const wallTile = W / 2;
  const geometry = buildMattressGeometry(
    W, T, D, cornerRadius, edgeRadius,
    Math.max(6, Math.round(10 * quality)),
    wallTile,
    { sideSegs: Math.max(4, Math.round(10 * quality)) }
  );

  const tex = (src, rx, ry) => {
    if (!src) return null;
    const t = src.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = maxAnisotropy;
    t.needsUpdate = true;
    disposables.push(t);
    return t;
  };

  // Face-relative repeats, so the weave is the same size on the seat top as on
  // the front border rather than stretching to fit whichever face it lands on.
  const faceR = [W / FABRIC_PITCH, D / FABRIC_PITCH];
  const wallR = [wallTile / FABRIC_PITCH, T / FABRIC_PITCH];

  // makeWovenNormal memoises one texture per thread count, so each face clones
  // it to carry its own repeat rather than mutating the shared instance.
  const weave = makeWovenNormal(WEAVE_THREADS);

  const mkFace = (rx, ry) =>
    new THREE.MeshPhysicalMaterial({
      map: tex(fabricMap, rx, ry),
      normalMap: tex(weave, rx * 2, ry * 2),
      normalScale: new THREE.Vector2(WEAVE_SCALE, WEAVE_SCALE),
      roughness: 0.94,
      metalness: 0,
      envMap: env ?? null,
      envMapIntensity: 0.4,
      // Chenille has a visible bloom along a grazing angle - the thing that
      // separates upholstery from painted foam - but it is a matte weave, so
      // the sheen stays low and very rough.
      sheen: 0.5,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color('#ffffff'),
    });

  const materials = [mkFace(...faceR), mkFace(...wallR), mkFace(...faceR)];

  const panel = () => {
    const m = new THREE.Mesh(geometry, materials);
    m.castShadow = false;
    return m;
  };

  const group = new THREE.Group();

  // Seat: two panels stacked, the fold running along the back edge.
  const seatLower = panel();
  seatLower.position.set(0, T / 2, 0);

  const seatUpper = panel();
  seatUpper.position.set(0, T * 1.5 + CONTACT, 0);

  // Rest: the third panel stood on the seat's back edge, hinged along the
  // bottom, so it rises from the seat rather than floating behind it.
  const rest = panel();
  const seatTop = T * 2 + CONTACT;
  rest.rotation.x = -Math.PI / 2 + REST_TILT;
  // Rotating about the panel's own centre puts its long axis vertical; it is
  // then placed so its lower edge sits on the seat and its back face lines up
  // with the seat's back face, allowing for the lean.
  rest.position.set(
    0,
    seatTop + (D / 2) * Math.cos(REST_TILT) - (T / 2) * Math.sin(REST_TILT),
    -D / 2 + T / 2 - (D / 2) * Math.sin(REST_TILT)
  );

  group.add(seatLower, seatUpper, rest);

  // Centre the assembly on the origin so the orbit camera turns around the
  // product rather than around the seat's floor plane.
  const height = seatTop + D * Math.cos(REST_TILT);
  group.position.y = -height / 2;

  return {
    group,
    materials,
    bounds: { width: W, height, depth: D + T },
    dispose() {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
