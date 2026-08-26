import * as THREE from 'three';
import { makeCoilRibNormal } from './foamSurfaces';

// Pocketed spring unit. Luma is the only product in either line with a coil
// band, so this module is imported dynamically and never enters any other
// product's chunk.
//
// The whole unit is two InstancedMeshes - one helix wire, one fabric sleeve -
// so a 150+ coil grid costs two draw calls rather than 300 scene objects.

class HelixCurve extends THREE.Curve {
  constructor(radius, height, turns) {
    super();
    this.radius = radius;
    this.height = height;
    this.turns = turns;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.turns;
    // Barrel profile: real pocket springs are pinched at the knuckles and
    // widest at mid-height.
    const r = this.radius * (0.74 + 0.26 * Math.sin(Math.PI * t));
    return target.set(Math.cos(a) * r, -this.height / 2 + t * this.height, Math.sin(a) * r);
  }
}

/**
 * @param {object} o
 * @param {number} o.W  layer footprint width
 * @param {number} o.L  layer footprint length
 * @param {number} o.h  layer thickness
 * @param {number} o.quality 1 = desktop, lower trims coil count and tube segments
 */
export function buildCoilLayer({ W, L, h, color = '#F2F1ED', env = null, quality = 1 }) {
  const disposables = [];

  // Coil pitch: placeholder density, tuned so the grid reads as individually
  // pocketed springs rather than a texture. Trimmed on low-quality devices.
  //
  // The pitch sets how many springs there are; the spacing is then solved to
  // fill the footprint it was handed, so the unit is the same size as the foam
  // bands above and below it. A grid laid out at a fixed pitch from a fixed
  // inset stopped several inches short of the edge on every side, which read as
  // a smaller mattress sitting inside the mattress. Half a cell of margin all
  // round is exactly what a spring needs: its sleeve is a touch under half a
  // pitch across, so the outermost springs land on the edge without crossing it.
  const targetPitch = 5.4 / Math.min(1, Math.max(0.55, quality));
  const cols = Math.max(5, Math.round(W / targetPitch));
  const rows = Math.max(5, Math.round(L / targetPitch));
  const count = cols * rows;

  const pitchX = W / cols;
  const pitchZ = L / rows;
  // Springs stay circular, so the radius comes from the tighter of the two axes.
  const pitch = Math.min(pitchX, pitchZ);
  const spanX = (cols - 1) * pitchX;
  const spanZ = (rows - 1) * pitchZ;
  const coilR = pitch * 0.44;
  const sleeveR = pitch * 0.47;

  const turns = quality >= 0.85 ? 5 : 4;
  const segsPerTurn = quality >= 0.85 ? 9 : 6;
  const radialSegs = quality >= 0.85 ? 4 : 3;
  const wireR = Math.max(0.055, pitch * 0.026);

  const wireGeo = new THREE.TubeGeometry(
    new HelixCurve(coilR, h * 0.9, turns),
    turns * segsPerTurn,
    wireR,
    radialSegs,
    false
  );
  disposables.push(wireGeo);

  // Open-ended sleeve, a touch shorter than the spring so the wire shows at the
  // knuckles the way it does through a real pocket seam.
  const sleeveGeo = new THREE.CylinderGeometry(sleeveR, sleeveR, h * 0.94, quality >= 0.85 ? 14 : 10, 1, true);
  disposables.push(sleeveGeo);

  const ribs = makeCoilRibNormal(11).clone();
  ribs.wrapS = ribs.wrapT = THREE.RepeatWrapping;
  ribs.repeat.set(2, 1);
  ribs.needsUpdate = true;
  disposables.push(ribs);

  const sleeveMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    normalMap: ribs,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.78,
    metalness: 0,
    sheen: 0.45,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color('#ffffff'),
    envMap: env,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });

  const wireMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#B9BEC4'),
    roughness: 0.34,
    metalness: 0.85,
    envMap: env,
    envMapIntensity: 1.1,
    transparent: true,
    opacity: 0,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });

  const wires = new THREE.InstancedMesh(wireGeo, wireMat, count);
  const sleeves = new THREE.InstancedMesh(sleeveGeo, sleeveMat, count);
  wires.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  sleeves.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -spanX / 2 + c * pitchX;
      const z = -spanZ / 2 + r * pitchZ;
      pos.set(x, 0, z);
      // Random yaw only: the springs stand upright, but the seam and the wire
      // start point should not line up into a visible moire across the grid.
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ((c * 7 + r * 13) % 17) * 0.37);
      m.compose(pos, q, scl);
      wires.setMatrixAt(i, m);
      sleeves.setMatrixAt(i, m);
      i++;
    }
  }
  wires.instanceMatrix.needsUpdate = true;
  sleeves.instanceMatrix.needsUpdate = true;
  wires.computeBoundingSphere();
  sleeves.computeBoundingSphere();
  // Sleeves draw after wires so the fabric sorts over the metal inside it.
  wires.renderOrder = 0;
  sleeves.renderOrder = 1;

  const group = new THREE.Group();
  group.add(wires, sleeves);

  // Raycasting 150 instanced helices per pointer move is wasteful, so hover and
  // tap hit an invisible slab matching the band's footprint instead.
  const hitMesh = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.98, h, L * 0.98),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitMesh.visible = false;
  group.add(hitMesh);

  return {
    group,
    hitMesh,
    materials: [sleeveMat, wireMat],
    count,
    dispose() {
      disposables.forEach((d) => d.dispose());
      sleeveMat.dispose();
      wireMat.dispose();
      hitMesh.geometry.dispose();
      hitMesh.material.dispose();
      wires.dispose();
      sleeves.dispose();
    },
  };
}
