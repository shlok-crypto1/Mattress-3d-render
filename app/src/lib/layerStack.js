import * as THREE from 'three';
import { buildMattressGeometry } from './mattressGeometry';
import { createLayerMaterials } from './layerMaterials';
import { makeShadowTexture, makeContactAOTexture } from './foamSurfaces';

// Turns a product's declared `layers` array into a stack of meshes the viewer
// can explode. Nothing here knows a product by name: layer count, types,
// proportions and surfaces all come from the config, so adding a product is a
// data change, not a code change.

/**
 * Exploded separation between adjacent bands. Products range from five bands to
 * eight, so a fixed gap would either bunch Duro up or push Ultima out of frame;
 * the gap is solved for a roughly constant exploded height instead.
 */
export function computeExplodeGap(n, H) {
  if (n < 2) return 0;
  return Math.min(11, Math.max(4.2, (38 - H) / (n - 1)));
}

/**
 * @returns {Promise<{layers: Array, gap: number, dispose: Function}>}
 */
export async function buildLayerStack({
  layerDefs,
  group,
  W,
  H,
  L,
  cornerRadius,
  topBevel,
  wallTile,
  env,
  quality = 1,
  productTop,
  productBottomMap,
  productSideMap,
}) {
  const disposables = [];
  const built = [];

  const totalRatio = layerDefs.reduce((a, l) => a + (l.thicknessRatio ?? 1), 0) || 1;
  const shadowTex = makeShadowTexture();
  const aoTex = makeContactAOTexture();

  // Only pay for the coil module when a product actually declares a coil band.
  const needsCoil = layerDefs.some((l) => l.type === 'coil');
  const coilMod = needsCoil ? await import('./coilLayer') : null;

  let yCursor = H / 2; // walk down from the top face
  layerDefs.forEach((def, i) => {
    const h = (H * (def.thicknessRatio ?? 1)) / totalRatio;
    const yCenter = yCursor - h / 2;
    yCursor -= h;

    const ctx = {
      W,
      L,
      h,
      wallTile,
      env,
      quality,
      productTop: i === 0 ? productTop : null,
      productBottomMap: i === layerDefs.length - 1 ? productBottomMap : null,
      productSideMap: i === layerDefs.length - 1 ? productSideMap : null,
    };

    let object;
    let hitMesh;
    let mats;
    let coil = null;

    if (def.type === 'coil' && coilMod) {
      coil = coilMod.buildCoilLayer({ W: W * 0.94, L: L * 0.94, h, color: def.color, env, quality });
      object = coil.group;
      hitMesh = coil.hitMesh;
      mats = coil.materials;
    } else {
      const built3 = createLayerMaterials(def, ctx);
      disposables.push(...built3.disposables);
      mats = built3.materials;
      // Only the top band carries the mattress's real rounded top edge; the rest
      // get a hairline bevel so cut foam does not read as razor-sharp.
      const bevel = i === 0 ? Math.min(topBevel, h * 0.9) : Math.min(0.12, h * 0.4);
      const geo = buildMattressGeometry(W, h, L, cornerRadius, bevel, 8, wallTile, {
        displace: built3.displace,
        capRings: built3.capRings,
        sideSegs: built3.sideSegs,
      });
      object = new THREE.Mesh(geo, mats);
      // Hover picking runs on every pointer move, and a sculpted comfort band is
      // ~10k triangles - far too much to raycast at pointer rate. Every layer
      // therefore carries an invisible 12-triangle proxy that rides along with
      // it, and picking only ever tests those.
      hitMesh = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.999, h, L * 0.999),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.visible = false;
      object.add(hitMesh);
    }

    object.position.y = yCenter;
    object.visible = false;
    hitMesh.userData.layerIndex = i;
    group.add(object);

    // Cast shadow onto whatever sits below, plus a tighter contact-occlusion
    // ring that stays hard against the lower face. Together they keep a
    // separated band reading as a solid slab hovering over another slab rather
    // than a flat card floating in space.
    let drop = null;
    let ao = null;
    if (i < layerDefs.length - 1) {
      drop = new THREE.Mesh(
        new THREE.PlaneGeometry(W * 1.16, L * 1.16),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0, depthWrite: false })
      );
      drop.rotation.x = -Math.PI / 2;
      drop.renderOrder = 1;
      drop.visible = false;
      group.add(drop);

      ao = new THREE.Mesh(
        new THREE.PlaneGeometry(W * 1.02, L * 1.02),
        new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, opacity: 0, depthWrite: false })
      );
      ao.rotation.x = -Math.PI / 2;
      ao.renderOrder = 2;
      ao.visible = false;
      group.add(ao);
    }

    built.push({
      def,
      object,
      hitMesh,
      coil,
      mats,
      drop,
      ao,
      h,
      restY: yCenter,
      hoverT: 0,
      explodeDy: 0,
    });
  });

  const n = built.length;
  const gap = computeExplodeGap(n, H);
  // Centre the exploded stack on the origin so it does not drift off-frame.
  built.forEach((l, i) => {
    l.explodeDy = ((n - 1) / 2 - i) * gap;
  });

  return {
    layers: built,
    gap,
    dispose() {
      built.forEach((l) => {
        if (l.coil) {
          l.coil.dispose();
        } else {
          l.object.geometry.dispose();
          l.mats.forEach((m) => m.dispose());
        }
        if (!l.coil) {
          l.hitMesh.geometry.dispose();
          l.hitMesh.material.dispose();
        }
        [l.drop, l.ao].forEach((p) => {
          if (!p) return;
          p.geometry.dispose();
          p.material.dispose();
        });
      });
      disposables.forEach((d) => d.dispose());
    },
  };
}
