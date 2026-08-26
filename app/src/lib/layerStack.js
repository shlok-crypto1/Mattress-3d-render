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
  maxAnisotropy = 1,
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
      maxAnisotropy,
      productTop: i === 0 ? productTop : null,
      productBottomMap: i === layerDefs.length - 1 ? productBottomMap : null,
    };

    let object;
    let hitMesh;
    let mats;
    let coil = null;
    // Geometries are tracked per layer rather than read back off the object at
    // dispose time, because a bonded band's object is a group and has none of
    // its own.
    const geos = [];

    // Only the top band carries the mattress's real rounded top edge; the rest
    // get a hairline bevel so cut foam does not read as razor-sharp.
    const bevelFor = (sh) => (i === 0 ? Math.min(topBevel, sh * 0.9) : Math.min(0.12, sh * 0.4));

    /** One slab of a band: its materials, its geometry and the mesh carrying both. */
    const slab = (slabDef, slabCtx, sh, bevel = bevelFor(sh)) => {
      const built = createLayerMaterials(slabDef, slabCtx);
      disposables.push(...built.disposables);
      const geo = buildMattressGeometry(W, sh, L, cornerRadius, bevel, 8, wallTile, {
        displace: built.displace,
        capRings: built.capRings,
        sideSegs: built.sideSegs,
      });
      geos.push(geo);
      return {
        mesh: new THREE.Mesh(geo, built.materials),
        mats: built.materials,
        // Bevel plus relief is how much of this slab's own thickness is already
        // carved away from the top.
        eaten: bevel + built.displaceDepth,
      };
    };

    // Hover picking runs on every pointer move, and a sculpted comfort band is
    // ~10k triangles - far too much to raycast at pointer rate. Every layer
    // therefore carries an invisible 12-triangle proxy that rides along with
    // it, and picking only ever tests those.
    const proxy = () => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.999, h, L * 0.999),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      m.visible = false;
      return m;
    };

    if (def.type === 'coil' && coilMod) {
      coil = coilMod.buildCoilLayer({ W: W * 0.94, L: L * 0.94, h, color: def.color, env, quality });
      object = coil.group;
      hitMesh = coil.hitMesh;
      mats = coil.materials;
    } else if (def.bonded) {
      // One layer, two slabs. The transition sheet is bonded to the top of the
      // fabric-wrapped base - it is not a band you could ever lift off, so the
      // stack must never separate them. They are built as a group with no gap:
      // the sheet keeps its own sculpted top so it still reads as the pierced
      // orange foam pasted onto the base, and the whole thing explodes, hovers,
      // labels and selects as a single layer.
      const sheetH = h * def.bonded.fraction;
      const slabH = h - sheetH;

      // A thin sheet glued down has a near-square edge, and a generous bevel
      // here would eat thickness the relief needs. Kept small on purpose.
      const sheet = slab(
        { ...def, type: 'foam', color: def.bonded.color, surface: def.bonded.surface, bonded: undefined },
        // The sheet is inside the band, so it wears no product photography: the
        // base cloth belongs to the slab underneath it.
        { ...ctx, h: sheetH, productBottomMap: null },
        sheetH,
        bevelFor(sheetH)
      );
      sheet.mesh.position.y = h / 2 - sheetH / 2;

      // The body is grown up into the sheet so their surfaces are not coplanar,
      // which would z-fight. How far it may rise is set by what the sheet has
      // left: its pierced relief cuts `sheet.eaten` down from its own top, and
      // if the body's top reaches that depth it surfaces in the bottom of every
      // pyramid valley - which is exactly what happened, as a fan of grey base
      // cloth showing through the orange. Half the remaining headroom leaves the
      // join hidden with room to spare.
      const headroom = Math.max(0, sheetH - sheet.eaten);
      const weld = Math.max(0.004, Math.min(0.04, headroom * 0.5));
      const bodyH = slabH + weld;

      // Square top on the body: its top edge is inside the sheet, and a bevel
      // there would open a groove all the way round the join that reads as a
      // gap between two layers - the exact thing this band is not.
      const body = slab({ ...def, bonded: undefined }, { ...ctx, h: bodyH }, bodyH, 0);
      body.mesh.position.y = -h / 2 + bodyH / 2;

      object = new THREE.Group();
      object.add(body.mesh, sheet.mesh);
      mats = [...body.mats, ...sheet.mats];
      hitMesh = proxy();
      object.add(hitMesh);
    } else {
      const built = slab(def, ctx, h);
      object = built.mesh;
      mats = built.mats;
      hitMesh = proxy();
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
      geos,
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
        // Off the scene as well as out of GPU memory. A stack is disposed both
        // when the viewer unmounts - where the whole group goes with it - and
        // when it is rebuilt at a new thickness under a live scene, where
        // anything left attached would hang in the frame as a ghost of the
        // previous variant.
        group.remove(l.object);
        if (l.coil) {
          l.coil.dispose();
        } else {
          l.geos.forEach((g) => g.dispose());
          l.mats.forEach((m) => m.dispose());
          l.hitMesh.geometry.dispose();
          l.hitMesh.material.dispose();
        }
        [l.drop, l.ao].forEach((p) => {
          if (!p) return;
          group.remove(p);
          p.geometry.dispose();
          p.material.dispose();
        });
      });
      disposables.forEach((d) => d.dispose());
    },
  };
}
