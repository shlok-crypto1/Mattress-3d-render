import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { publicUrl } from '../lib/publicUrl';
import { buildEuroTopGeometry } from '../lib/mattressGeometry';
import { makeStudioEnvironment, makeWovenNormal } from '../lib/foamSurfaces';
import { QUILT_DEFAULTS, quiltMaps, quiltDisplacer, buildEdgeStitch, averageColor } from '../lib/quiltSurface';
import { MOTION, EASE, REVEAL } from '../lib/motion';
import { buildLayerStack } from '../lib/layerStack';
import { layersForVariant } from '../lib/variantLayers';
import { BRAND_THEMES } from '../data/brandThemes';
import {
  useProductEntranceTarget,
  enterStyle,
  prefersReducedMotion,
} from '../transition/ProductTransition';

// Explode tuning. The stack is toggled by the Layers button alone - zoom used
// to cross a threshold and explode the mattress on its own, which fired when
// someone was only trying to look closer at the solid product.
const EXPLODE_MS = MOTION.explode;
const LAYER_STAGGER = MOTION.explodeStagger;
const EXPLODE_DIST = 94; // where the button parks the camera to frame the stack
const EXPLODE_SCALE = 0.55; // shrink the group so the taller stack stays framed
const HOVER_LIFT = 1.15;
const HOVER_SCALE = 0.02;
const HOVER_GLOW = 0.5;
// Time constant of the camera damper. An exponential settle is within 1% of
// its target after ln(100) time constants, so dividing MOTION.camera by 4.6
// makes "a camera move takes MOTION.camera" true of a damper as well as of a
// tween - which is what that entry in the motion table always claimed.
const CAMERA_TAU = MOTION.camera / 4.6;

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
/**
 * The explode's own curve, and the reason it is not `easeOutCubic`.
 *
 * The stack's separation used to be `easeOutCubic` of a linearly advancing
 * clock, which is right in one direction and backwards in the other. Opening,
 * the bands leave briskly and ease into place. Closing, the same curve is
 * traversed in reverse - so they drift at first and then cover the last 27% of
 * their travel in the final 70ms, arriving at full speed. A collapse that
 * slams shut is exactly what "not smooth" describes, and it contradicts the
 * motion system's own rule that everything which arrives decelerates
 * (`EASE.enter` in src/lib/motion.js).
 *
 * A curve that is flat at both ends fixes it in both directions at once, and -
 * unlike picking the easing from the direction of travel - it stays a pure
 * function of the clock, so reversing mid-flight cannot make a position jump.
 * Its slope peaks at 2 in the middle, so the gesture keeps its pace; it just
 * no longer starts or ends at a wall. This also makes exploding and collapsing
 * genuinely mirror-symmetric in time, which is what
 * docs/3D_RENDER_GUIDELINES.md asks of them.
 */
const easeExplode = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// [key, label, theta, phi, dist]. `dist` is optional; without it a preset keeps
// the framing the viewer picks for the mount size.
//
// Corner and Detail used to sit at either end of this row. Corner was never a
// destination - it is the framing the viewer already opens on, so the button
// only ever restated where you were - and Detail was the one preset that moved
// the camera dolly as well as its angle, which made it read as a different
// product rather than a different view of one. Dragging does both jobs better.
// CORNER_VIEW below keeps the framing itself; only the buttons are gone.
const VIEW_DEFS = [
  ['front', 'Front', 0, 0.12],
  ['side', 'Side', Math.PI / 2, 0.12],
  ['top', 'Top', 0, 1.35],
  ['bottom', 'Bottom', 0, -1.35],
];

/** The resting three-quarter framing: mount default, and where Solid returns. */
const CORNER_VIEW = { key: 'corner', theta: 0.6, phi: 0.62 };

/**
 * How a variant reads on screen.
 *
 * The same "Grade · 6″" shape the grid cards set their spec line in, so the
 * card you clicked and the pill you land on are recognisably the same fact.
 */
const variantLabel = (v) => `${v.variant} · ${v.height}″`;

/**
 * Natural is a grade, not a thickness: it is the premium line wherever it is
 * offered, so it reads last in the menu and in its own colour rather than
 * taking its place in the thickness run.
 */
const isNatural = (v) => v.variant === 'Natural';

/**
 * Menu order: thinnest first, so the list steps 5″ → 6″ → 6.5″ → 7″ and a
 * reader can scan it as a size ladder. Natural is pinned to the end whatever
 * it measures. Ties hold the order the data declares - Ultima's Classic 6″
 * still leads its Premium 6″ - because Array#sort is stable and the index is
 * the final key anyway.
 *
 * Entries carry their index in `variants` with them: that index is what state
 * holds and what the height is read back from, so display order never becomes
 * a second, disagreeing source of which variant is selected.
 */
const menuOrder = (variants) =>
  variants
    .map((v, index) => ({ v, index }))
    .sort(
      (a, b) =>
        Number(isNatural(a.v)) - Number(isNatural(b.v)) ||
        a.v.height - b.v.height ||
        a.index - b.index,
    );

/** Coarse device budget: trims coil count and sculpted-cap tessellation. */
function deviceQuality() {
  if (typeof window === 'undefined') return 1;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const small = window.innerWidth < 760;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || small || weak ? 0.6 : 1;
}

export default function MattressViewer({
  product,
  autoRotate = true,
  brand = 'vedasleep',
  transitionId = null,
  backTo = '/',
}) {
  const mountRef = useRef(null);
  const labelsRef = useRef(null);
  const variantRef = useRef(null);
  const variantButtonRef = useRef(null);
  const [view, setView] = useState(CORNER_VIEW.key);
  // Layer explode is driven entirely by product.layers. Without it none of the
  // code below runs and the viewer behaves exactly as it always has. Read off
  // the product rather than off the selected grade's bands: whether there is a
  // stack to open at all is not a per-grade question.
  const hasLayers = Array.isArray(product.layers) && product.layers.length > 0;
  const [exploded, setExploded] = useState(false);
  const [hoveredLayer, setHoveredLayer] = useState(null);
  // Variant selection. `variants` is the product's confirmed variant list,
  // baseline first (see src/data/foamicoProducts.js), and the only thing held
  // in state is which one is chosen - the thickness is read back off it rather
  // than stored separately, so the two can never disagree. The clamp covers a
  // product swapping under the same mount: the index survives, the height is
  // always the new product's.
  //
  // These sit above the scene effect because it reads `currentHeight` when it
  // builds. Declared below it, the effect's dependency array - evaluated during
  // render, before the declaration - would throw on every mattress route.
  const variants = product.variants ?? [];
  const [variantIndex, setVariantIndex] = useState(0);
  const [variantMenuOpen, setVariantMenuOpen] = useState(false);
  const activeIndex = variants.length ? Math.min(variantIndex, variants.length - 1) : -1;
  const activeVariant = variants.length ? variants[activeIndex] : null;
  const currentHeight = activeVariant?.height ?? product.dimensions?.height ?? 5;
  const hasVariantChoice = variants.length > 1;
  const variantMenuId = useId();
  // Which bands the selected grade is actually built from. For every product
  // whose grades are one stack cut to several thicknesses this is the product's
  // own `layers` array, returned by identity; Resto's lower grades get it with
  // comfort foam removed and the remaining bands re-solved against the grade's
  // height. See src/lib/variantLayers.js.
  //
  // Memoised because the value is a scene input: a fresh array every render
  // would rebuild the whole layer stack every render.
  const layerDefs = useMemo(() => layersForVariant(product, activeVariant), [product, activeVariant]);
  // The scene effect below only re-runs per product, so it cannot close over a
  // value that changes with the grade - it would read the bands captured at
  // mount forever. Same reason `s.view` and `s.autoRotate` are mirrored.
  const layerDefsRef = useRef(layerDefs);
  layerDefsRef.current = layerDefs;
  // Shared-element handoff: no-op unless a card transition landed here (see
  // ProductTransition.jsx). `revealed` starts true whenever entering any
  // other way (direct link, refresh, back-nav) - zero behaviour change then.
  const { revealed: sharedRevealed, entering, markCanvasReady } = useProductEntranceTarget(transitionId, mountRef);
  // A shared-element arrival is either in flight when this mounts or it is not,
  // and that never changes for the life of the mount - so it is captured once.
  //
  // Everything below exists because the entrance used to run *only* for the
  // card-click journey. A direct link or a refresh - which is how the product
  // URL actually gets shared - dropped the whole page in at once, fully formed,
  // with no sequence at all. The two paths now arrive the same way; this one
  // just has no shared element to fly in first.
  const [directEntry] = useState(() => !entering);
  const [directRevealed, setDirectRevealed] = useState(false);
  const revealed = directEntry ? directRevealed : sharedRevealed;
  const animated = !!transitionId || directEntry;
  // Mutable animation/scene state that must NOT trigger re-renders, mirroring the
  // original `this.*` instance fields from the imperative viewer.
  const s = useRef({}).current;

  const theme = BRAND_THEMES[brand] ?? BRAND_THEMES.vedasleep;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    const quality = deviceQuality();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: typeof window !== 'undefined' && window.location.search.includes('explode') });
    // Cap at 2x: enough for retina/high-DPI to render sharp rather than soft,
    // without paying for the 3x backing store a modern phone would otherwise
    // ask for. Sharpness wins over the old 1.75 low-power budget - the geometry
    // quality dial still trims coil count and tessellation on weak devices.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tone mapping is what makes a fabric render possible at all here. Without
    // it every value above 1.0 clips flat, so a near-white quilt loses both its
    // relief and its silhouette the moment any specular is added - which is
    // exactly what happened the last time an environment map was tried on the
    // cover. Neutral rolls the highlights off while leaving hue alone; ACES
    // would tint these near-white fabrics warm.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.92;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    s.camera = camera;
    // Studio rig. The old setup was ambient 3.0 plus a single key, which put
    // ~77% of an up-facing surface's light into a perfectly uniform term: no
    // matter how much relief the quilt had, there was nothing directional
    // enough to shade it. The budget is now the other way round - the two
    // directional sources carry ~62% - so surface detail has something to cast
    // against. Total irradiance on an up-facing normal is held near the old
    // value so nothing suddenly reads brighter or darker.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a958c, 1.2));
    // Key: high and off to one side, as a product shot would be lit.
    const dir = new THREE.DirectionalLight(0xffffff, 2.0);
    dir.position.set(30, 80, 50);
    scene.add(dir);
    // Grazing fill from the opposite side, deliberately low. Raking light
    // across the quilt is what turns puffed cells and stitch channels from a
    // pattern into a construction; it also keeps the channels from going
    // black, which the spec calls out as the other half of the same problem.
    const graze = new THREE.DirectionalLight(0xffffff, 1.1);
    graze.position.set(-55, 18, 25);
    scene.add(graze);
    // Bounce off the sweep. Every source above is overhead, so a downward-
    // facing normal was lit by the hemisphere's ground term alone - about 23%
    // of what an up-facing one receives. The base cloth is genuinely a dark
    // charcoal non-woven, so at that exposure the underside crushed to near
    // black and took its weave and its edge with it, which is the shadow depth
    // CAMERA_AND_LIGHTING.md rules out. The reference photography is shot on a
    // white sweep that throws a lot of light back up; this is that bounce.
    // Aimed straight up, so it lands on undersides and contributes nothing to
    // the quilt - a top-facing normal gets zero from it and a side wall gets
    // near zero, so the mattress's sleeping surface and border are lit exactly
    // as they were. Intensity is solved against the reference: the base cloth
    // photographs at #474847, and at 3.5 the rendered underside sits at the
    // same tone instead of the near-black (RGB ~30 against a ~26 page) it was.
    const bounce = new THREE.DirectionalLight(0xffffff, 3.5);
    bounce.position.set(0, -60, 0);
    scene.add(bounce);
    const group = new THREE.Group();
    scene.add(group);
    s.group = group;

    // Studio IBL. Set as scene.environment rather than per-material: three
    // falls back to it for any material with no envMap of its own, so the
    // solid box picks it up while the layer stack keeps the explicit envMap it
    // already sets. Fabric needs this - without an environment a standard
    // material has no specular response at grazing angles and the quilt
    // flattens out exactly where the raking light should be revealing it.
    const envRT = makeStudioEnvironment(renderer);
    const env = envRT.texture;
    scene.environment = env;
    // Held well below 1: the quilt should pick up soft directional sheen, not
    // read as damp or waxy.
    scene.environmentIntensity = 0.35;

    const loader = new THREE.TextureLoader();
    const disposables = [];
    // Every product map goes through here, so the sampling setup is stated in
    // one place: full anisotropy (the single biggest win on a mattress top seen
    // at a grazing angle), trilinear mipmapping so the surface doesn't alias
    // into shimmer at distance, and linear magnification for close-ups.
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const load = (url, onLoaded) => {
      const t = loader.load(url, () => {
        s.dirty = true;
        onLoaded?.();
      });
      t.anisotropy = maxAnisotropy;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      disposables.push(t);
      return t;
    };

    // First real frame with the visible top texture in place - what the
    // shared-element transition (if any) waits for before crossfading from
    // the static grid-card image to this live canvas.
    let topReady = false;
    s.reportedReady = false;

    const { textures } = product;
    const top = load(publicUrl(textures.top), () => {
      topReady = true;
    });
    const bottom = load(publicUrl(textures.bottom));
    let onSideReady = null;
    const sideTex = load(publicUrl(textures.side), () => onSideReady?.());
    sideTex.wrapS = THREE.RepeatWrapping;

    const W = product.dimensions?.width ?? 72;
    // Height alone is mutable: picking a variant changes it, and `s.applyHeight`
    // below rebuilds the parts that depend on it. Read once here, from the
    // render that mounted this scene, which is always the baseline variant.
    let H = currentHeight;
    const L = product.dimensions?.length ?? 72;
    // The exploded slabs keep their own soft top edge; only the solid box is
    // built as a Euro-top.
    let topBevel = Math.min(1.3, H * 0.26);
    // ~6 tiles around the perimeter rather than the old ~13. Halving the
    // repetition costs texel density (about 19/in down to 9/in, on par with the
    // top faces), which is the accepted trade for a border that does not read
    // as a repeating strip.
    const wallTile = L / 1.5;

    // The sleeping surface is upholstery, so it gets a fabric material rather
    // than a generic standard one: sheen is the term that makes a textile catch
    // light along a grazing angle the way cloth does instead of the way plastic
    // does. Kept low - premium ticking is matte.
    const quiltCfg = { ...QUILT_DEFAULTS, ...(product.quilt ?? {}) };
    const topMatOpts = {
      map: top,
      roughness: quiltCfg.roughness,
      metalness: 0,
      sheen: quiltCfg.sheen,
      sheenRoughness: quiltCfg.sheenRoughness,
      sheenColor: new THREE.Color(0xffffff),
      side: THREE.DoubleSide,
    };
    const topMat = new THREE.MeshPhysicalMaterial(topMatOpts);
    // The quilt's own relief, reconstructed from the product's bump photo. This
    // used to be fed in as a luminance bumpMap, which cannot distinguish a pale
    // printed mark from a raised one and gives no roughness or occlusion
    // response at all; quiltSurface.js turns the same image into a proper
    // normal / roughness / occlusion set plus the puff field that sculpts the
    // cap. Resolved as a promise so the stack can wait for the same maps.
    let quiltReady = Promise.resolve(null);
    if (textures.topBump) {
      quiltReady = new Promise((resolve) => {
        const bumpTex = load(publicUrl(textures.topBump), () => {
          if (disposed || !bumpTex.image?.width) return resolve(null);
          const maps = quiltMaps(publicUrl(textures.topBump), bumpTex.image, quiltCfg);
          topMatOpts.normalMap = maps.normal;
          topMatOpts.normalScale = new THREE.Vector2(quiltCfg.normalScale, quiltCfg.normalScale);
          topMatOpts.roughnessMap = maps.roughnessMap;
          topMatOpts.aoMap = maps.aoMap;
          Object.assign(topMat, {
            normalMap: maps.normal,
            roughnessMap: maps.roughnessMap,
            aoMap: maps.aoMap,
          });
          topMat.normalScale.set(quiltCfg.normalScale, quiltCfg.normalScale);
          topMat.needsUpdate = true;
          s.dirty = true;
          resolve(maps);
        });
        bumpTex.colorSpace = THREE.NoColorSpace;
      });
    }
    // The border wears its own photograph and nothing else. A procedural
    // dimple lattice used to be laid over it, which was near-invisible under
    // the old flat ambient light but resolves into a hard geometric grid once
    // the rig is directional - and one that belongs to no product, since every
    // border here is already photographed fabric with its own weave.
    const wallMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    // The underside carried no normal map at all, so even once it was lit it
    // read as a flat dark card rather than cloth. It gets the same woven relief
    // the base band uses in the exploded stack, at the base cloth's own pitch,
    // so the two agree when the stack opens out of the box.
    // Cloned, not used directly: makeWovenNormal memoises one texture per
    // thread count and the exploded stack's fabric bands share that instance,
    // so setting a repeat on it here would rescale their weave too. A clone
    // carries its own UV transform while three still uploads the pixels once.
    const bottomNormal = makeWovenNormal(46).clone();
    bottomNormal.wrapS = bottomNormal.wrapT = THREE.RepeatWrapping;
    // 3.8in is the base cloth's physical thread pitch - the same value
    // SURFACE_PITCH.woven uses in layerMaterials.js.
    bottomNormal.repeat.set(W / 3.8, L / 3.8);
    bottomNormal.anisotropy = maxAnisotropy;
    bottomNormal.needsUpdate = true;
    disposables.push(bottomNormal);
    const bottomMat = new THREE.MeshStandardMaterial({
      map: bottom,
      normalMap: bottomNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    // Piping between base and cushion, darkened a touch so the band reads as a
    // seam rather than merging into the fabric either side of it.
    //
    // Its map is the border photo collapsed to a single column of pixels. The
    // band used to carry the whole photo squeezed into 0.4in and tiled 26 times
    // around, so every fraction of a pixel of residual slope in the source
    // repeated as a sawtooth kink. One texel wide, every u samples the same
    // column: the trim cannot kink or shift shade along the mattress no matter
    // how un-seamless the photo is, while still taking its colour and vertical
    // shading from the product's own border.
    const seamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.86, 0.86, 0.86),
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const buildSeamProfile = () => {
      const img = sideTex.image;
      if (!img || !img.width || disposed) return;
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = img.height;
      // Downscaling to one column box-filters the width away, which also
      // averages out any residual slope in the photographed piping.
      c.getContext('2d').drawImage(img, 0, 0, 1, img.height);
      const prof = new THREE.CanvasTexture(c);
      prof.wrapS = prof.wrapT = THREE.RepeatWrapping;
      prof.colorSpace = THREE.SRGBColorSpace;
      prof.needsUpdate = true;
      seamMat.map = prof;
      seamMat.needsUpdate = true;
      disposables.push(prof);
      s.dirty = true;
    };
    if (sideTex.image?.width) buildSeamProfile();
    else onSideReady = buildSeamProfile;

    // Euro-top silhouette: firm base box, separate cushion inset on top, piping
    // where they meet. Shared by every product - this is a construction style,
    // not a per-product trait.
    const euroOpts = {
      cornerSegs: Math.max(6, Math.round(10 * quality)),
      tileWidth: wallTile,
      seamTile: wallTile / 2,
    };
    // Sculpting the cap needs enough perimeter samples to resolve the quilt's
    // cell pitch, and enough rings to resolve it inward; below that the puff
    // aliases into long diagonal creases. Both ride the device quality dial,
    // like every other tessellation choice here.
    const sculptOpts = {
      ...euroOpts,
      sideSegs: Math.max(8, Math.round(26 * quality)),
      // Raised with the narrowed edge taper in mattressGeometry.js: the ramp
      // into the binding is only as smooth as the rings that carry it.
      capRings: Math.max(12, Math.round(44 * quality)),
      edgeCompression: quiltCfg.edgeCompression,
    };
    const geometry = buildEuroTopGeometry(W, H, L, euroOpts);
    const box = new THREE.Mesh(geometry, [topMat, wallMat, bottomMat, seamMat]);
    group.add(box);
    s.box = box;

    // ---- woven brand badge ------------------------------------------------
    // A badge is sewn onto a mattress once at the head and once at the foot. It
    // used to live inside the border photograph, which the wall repeats about
    // six times around the perimeter, so the mark appeared six times - down both
    // long sides as well, where no real mattress carries it. The photograph is
    // now clean fabric that can tile as often as it likes, and the badge is
    // placed here as a decal on exactly two faces.
    //
    // Declared per product, never by slug: only a product that actually has a
    // woven badge sets `sideBadge`, and the viewer does nothing at all without it.
    const badgeMats = [];
    const badgeMeshes = [];
    // Centred on the band the badge is sewn to, not on the mattress: the
    // cushion above it is upholstery and the badge never crosses the piping.
    // Read off the live geometry every time, because which band that is moves
    // when the mattress changes thickness.
    const placeBadges = () => {
      if (!badgeMeshes.length) return;
      const { yBottom, yTop } = box.geometry.userData.baseWall;
      const y = (yBottom + yTop) / 2;
      badgeMeshes.forEach((m) => { m.position.y = y; });
    };
    if (product.sideBadge) {
      const { src, width: bw, height: bh } = product.sideBadge;
      const badgeTex = load(publicUrl(src));
      const badgeGeo = new THREE.PlaneGeometry(bw, bh);
      disposables.push({ dispose: () => badgeGeo.dispose() });
      // depthWrite off and a negative polygon offset so it sits on the fabric
      // without z-fighting it; the tiny push along the face covers the wall's
      // own displacement.
      const mkBadge = () => {
        const m = new THREE.MeshStandardMaterial({
          map: badgeTex,
          transparent: true,
          roughness: 0.88,
          metalness: 0,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        badgeMats.push(m);
        return m;
      };
      const front = new THREE.Mesh(badgeGeo, mkBadge());
      front.position.set(0, 0, L / 2 + 0.05);
      const back = new THREE.Mesh(badgeGeo, mkBadge());
      back.position.set(0, 0, -L / 2 - 0.05);
      back.rotation.y = Math.PI;
      badgeMeshes.push(front, back);
      // Children of the box, so they inherit its visibility and its transform
      // through both the explode cross-fade and the entrance scale.
      box.add(front);
      box.add(back);
      placeBadges();
    }

    // The flat cap goes up first and the sculpted one replaces it once the
    // height field has decoded. The card-to-viewer transition is waiting on the
    // first real frame, and making it wait on an image decode as well would
    // stall the handoff for no visual gain - the swap is invisible because the
    // panel's outline and every UV are identical either way.
    let stitch = null;
    // Held once resolved so the cap can be sculpted again at a new thickness
    // without re-decoding the bump image.
    let quiltMapsReady = null;

    /** Put `geo` on the box, dispose what it replaced, keep the badges with it. */
    const swapGeometry = (geo) => {
      const prev = box.geometry;
      box.geometry = geo;
      if (prev && prev !== geo) prev.dispose();
      placeBadges();
      s.dirty = true;
    };

    /** Re-cut the cap's relief for the box's current height. */
    const applySculpt = () => {
      if (!quiltMapsReady || disposed) return;
      const { cushW, cushL, cushionH } = box.geometry.userData;
      const displace = quiltDisplacer(quiltMapsReady, cushW, cushL, cushionH);
      const sculpted = buildEuroTopGeometry(W, H, L, { ...sculptOpts, displace });
      if (stitch) {
        box.remove(stitch);
        stitch.geometry.dispose();
        stitch.material.dispose();
        stitch = null;
      }
      swapGeometry(sculpted);
      // Thread along the seam the panel is sewn on, tinted from the product's
      // own fabric so it reads as stitching rather than as a bright rim.
      stitch = buildEdgeStitch(sculpted.userData.quiltEdge, {
        radius: quiltCfg.stitchRadius,
        color: top.image ? averageColor(top.image).multiplyScalar(quiltCfg.stitchTint) : undefined,
      });
      box.add(stitch);
    };

    /**
     * Rebuild the solid mattress at the current H. The flat cap goes on first
     * because `applySculpt` needs the cushion extents this geometry reports;
     * if the quilt maps have not arrived yet the flat one simply stays until
     * they do, which is the same order a fresh mount goes through.
     */
    const rebuildBox = () => {
      swapGeometry(buildEuroTopGeometry(W, H, L, euroOpts));
      applySculpt();
    };

    quiltReady.then((maps) => {
      if (!maps || disposed) return;
      quiltMapsReady = maps;
      applySculpt();
    });

    // ---- layer explode stack -------------------------------------------
    // The solid box stays the collapsed representation so that view is
    // guaranteed unchanged; the stack cross-fades in as the explode begins.
    //
    // Built lazily. Eight sculpted bands plus a 150-coil spring unit is real
    // work, and doing it during mount would delay the first frame that the
    // card-to-viewer transition is waiting on. Instead the stack is warmed on
    // the first idle callback after that frame, and forced synchronously if the
    // user beats it to the Layers button.
    // Deliberately effect-local, not on the `s` ref: React StrictMode mounts
    // this effect, tears it down and mounts it again, and both runs share `s`.
    // Hanging the stack (and its build promise) off `s` let the first, discarded
    // scene claim the promise, so the live canvas silently rendered nothing.
    let stack = null;
    let layers = null;
    let hitMeshes = null;
    let stackPromise = null;
    let explodeT = 0;
    let explodeTarget = 0;
    let explodeLast = null;
    let hoverIdx = null;
    s.exploded = false;

    // ---- grade change morph ------------------------------------------------
    //
    // Choosing a grade rebuilds the box at a new thickness and, on Resto, the
    // stack from a different set of bands. Doing that in the frame the pill is
    // released makes the mattress pop, so the swap is hidden inside one
    // gesture: the build on screen releases, the new one settles into place.
    // Both halves run the same curve, so 7" -> 6" is the exact reverse of
    // 6" -> 7" (docs/3D_RENDER_GUIDELINES.md wants explode symmetry, and a
    // grade change is the other thing that reshapes the stack).
    //
    // `morphT` runs 0 -> 1 over MOTION.normal on the same clock as `explodeT`.
    // The two never fight: this one only ever multiplies what the explode has
    // already decided to draw.
    const MORPH_MS = MOTION.normal;
    /** Where the outgoing build is fully out and the geometry actually changes. */
    const MORPH_TROUGH = 0.42;
    /** Longest the trough will wait for a rebuilt stack before settling anyway. */
    const MORPH_HOLD_CAP = MOTION.explode;
    let morphT = 1; // 1 = settled, nothing to draw
    let morphSwap = null; // the geometry change, held until the trough
    let morphFromScale = 1; // box scale.y the settle starts from
    let morphHeld = 0; // time already spent waiting at the trough for new bands
    let shownH = H; // the thickness the geometry on screen was built at
    let appliedDefs = layerDefsRef.current; // and the bands it was built from
    s.morphFade = 1;
    s.morphScaleY = 1;
    s.morphSpread = 1;

    const ensureStack = () => {
      if (!hasLayers || disposed) return Promise.resolve();
      if (stackPromise) return stackPromise;
      // Waits on the quilt maps so the cover that emerges from the box carries
      // the same fabric response the box already has.
      stackPromise = quiltReady.then(() => buildLayerStack({
        layerDefs: layerDefsRef.current,
        group,
        W,
        H,
        L,
        cornerRadius: 2.5,
        topBevel,
        wallTile,
        env,
        quality,
        productTop: topMatOpts,
        productBottomMap: bottom,
        maxAnisotropy,
      }))
        .then((built) => {
          if (disposed) {
            built.dispose();
            return;
          }
          stack = built;
          layers = built.layers;
          // Cached so hover picking does not rebuild the target array on every
          // pointer move.
          hitMeshes = built.layers.map((l) => l.hitMesh);
          s.dirty = true;
        })
        .catch((err) => {
          // A failed stack must not take the whole viewer down: the solid
          // mattress still renders and the Layers button simply does nothing.
          console.error('Layer stack failed to build', err);
        });
      return stackPromise;
    };

    // soft ground shadow
    const sc = document.createElement('canvas');
    sc.width = sc.height = 256;
    const g = sc.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 10, 128, 128, 126);
    grad.addColorStop(0, 'rgba(0,0,0,0.22)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(sc);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 1.7, L * 1.35),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -H / 2 - 1.5;
    scene.add(shadow);
    s.shadow = shadow;

    /**
     * Rebuild the exploded stack at the current H.
     *
     * The old bands are disposed only once the new ones exist, so changing
     * thickness with the stack open swaps one stack for another rather than
     * blinking through an empty stage. If the stack was never built, there is
     * nothing to redo - whenever it is built it reads the current H.
     */
    const rebuildStack = () => {
      if (!stackPromise) return;
      const prev = stack;
      stack = null;
      layers = null;
      hitMeshes = null;
      stackPromise = null;
      ensureStack().then(() => prev?.dispose());
    };

    /**
     * Step the grade morph. Returns whether it still needs frames.
     *
     * Driven from updateLayers rather than from its own place in the tick so
     * that it shares one `dt` with the explode and cannot end up a frame behind
     * the values it multiplies.
     */
    const advanceMorph = (dt) => {
      if (morphT >= 1 && !morphSwap) return false;
      const before = morphT;
      morphT = Math.min(1, morphT + dt / MORPH_MS);

      if (morphSwap && morphT >= MORPH_TROUGH) {
        // Everything is at zero opacity here, so this is where the thickness
        // and the band set change.
        morphSwap();
        morphSwap = null;
      }
      // Hold at the trough until there is something to settle back in. With the
      // stack open the new bands are still being built at this point, and
      // running the settle over an empty stage would fade nothing up and then
      // pop the bands in at the end of it. Nothing is visible while it holds.
      //
      // Bounded, because the thing being waited on can fail: ensureStack
      // deliberately swallows a failed build so the viewer stays usable, and an
      // unbounded hold would answer that by leaving the product invisible
      // instead. Past the cap the settle runs anyway and late bands simply
      // arrive into it. Measured in the loop's own dt, so a starved or
      // backgrounded renderer spends no budget here.
      if (!morphSwap && s.exploded && !layers) {
        morphHeld += dt;
        if (morphHeld < MORPH_HOLD_CAP) morphT = MORPH_TROUGH;
      } else {
        morphHeld = 0;
      }

      if (morphT <= MORPH_TROUGH) {
        // Release: the outgoing build fades, eases a touch smaller, and an open
        // stack draws together.
        const e = easeOutCubic(morphT / MORPH_TROUGH);
        s.morphFade = 1 - e;
        s.morphScaleY = 1 - 0.015 * e;
        s.morphSpread = 1 - 0.12 * e;
      } else {
        // Settle: the reverse, from the new build's own basis. In solid view
        // scale.y starts at the old thickness over the new one, so the mattress
        // grows or shrinks into its grade instead of cutting to it.
        const e = easeOutCubic((morphT - MORPH_TROUGH) / (1 - MORPH_TROUGH));
        s.morphFade = e;
        s.morphScaleY = morphFromScale + (1 - morphFromScale) * e;
        s.morphSpread = 0.88 + 0.12 * e;
      }
      return morphT !== before || morphT < 1;
    };

    const beginMorph = (swap, fromScale) => {
      if (s.reduced) {
        // Reduced motion gets the change without the gesture.
        swap();
        morphSwap = null;
        morphT = 1;
        s.morphFade = 1;
        s.morphScaleY = 1;
        s.morphSpread = 1;
        s.dirty = true;
        return;
      }
      // A second grade chosen mid-gesture supersedes the pending swap rather
      // than queueing behind it: this one rebuilds from the same live H and
      // bands, so it does everything the dropped one would have. Restarting
      // from the fade already on screen instead of from 1 keeps the gesture
      // continuous rather than flashing back to full opacity first.
      morphSwap = swap;
      morphFromScale = fromScale;
      morphT = Math.min(morphT, MORPH_TROUGH * (1 - (s.morphFade ?? 1)));
      s.dirty = true;
    };

    /**
     * Change the grade in place: a new thickness, and on Resto a new set of
     * bands.
     *
     * Everything else in this scene - renderer, lights, environment, textures,
     * materials, camera - is grade-independent, so a variant change rebuilds
     * only the geometry that actually encodes H and the stack. Re-running the
     * whole effect would drop the WebGL context, re-fetch every texture and
     * throw away where the user had orbited to, which is a lot of work to
     * arrive at the same pixels either side of one changed number.
     *
     * The rebuild itself is handed to the morph rather than run here, so it
     * lands at the point in the gesture where nothing is on screen to pop.
     */
    s.applyVariant = (nextH, nextDefs) => {
      if (disposed) return;
      if (nextH === H && nextDefs === appliedDefs) return;
      // Measured against what is drawn, not against the last grade asked for,
      // so a change during a gesture still starts from the thickness on screen.
      const fromScale = shownH / nextH;
      H = nextH;
      appliedDefs = nextDefs;
      topBevel = Math.min(1.3, H * 0.26);
      beginMorph(() => {
        shadow.position.y = -H / 2 - 1.5;
        shownH = H;
        rebuildBox();
        rebuildStack();
      }, fromScale);
    };

    s.theta = CORNER_VIEW.theta;
    s.phi = CORNER_VIEW.phi;
    s.dist = 150;
    s.tTheta = CORNER_VIEW.theta;
    s.tPhi = CORNER_VIEW.phi;
    s.tDist = 150;
    s.idle = 0;
    s.dirty = true;
    // prefers-reduced-motion is respected everywhere else on the site but was
    // never plumbed into the 3D scene, which is where the only continuous
    // motion actually lives. Idle drift is precisely the "unnecessary camera
    // movement" the setting asks to be rid of; dragging, the view presets and
    // the layer stack all keep working.
    s.reduced = prefersReducedMotion();
    s.autoRotate = autoRotate && !s.reduced;

    const el = renderer.domElement;
    const pointers = new Map();
    let lastPinch = 0;

    const raycaster = new THREE.Raycaster();
    let downAt = null;
    let dragDist = 0;
    let touchHoverTimer = 0;

    const accentColor = new THREE.Color(theme.accent);

    const setHover = (idx) => {
      if (hoverIdx === idx) return;
      hoverIdx = idx;
      s.dirty = true;
      setHoveredLayer(idx);
      el.style.cursor = idx === null ? (pointers.size ? 'grabbing' : 'grab') : 'pointer';
    };

    /** Which layer sits under this client point, or null. */
    const pickLayer = (clientX, clientY) => {
      if (!layers || !s.exploded) return null;
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        -((clientY - r.top) / r.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      scene.updateMatrixWorld();
      const hits = raycaster.intersectObjects(hitMeshes, false);
      return hits.length ? hits[0].object.userData.layerIndex : null;
    };

    const onPointerDown = (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      s.idle = -1e9;
      downAt = [e.clientX, e.clientY];
      dragDist = 0;
      el.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      // Hover highlight: only while exploded, only with a fine pointer, and
      // never mid-drag (rotating past layers should not strobe them).
      if (hasLayers && s.exploded && pointers.size === 0 && e.pointerType !== 'touch') {
        setHover(pickLayer(e.clientX, e.clientY));
      }
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        if (downAt) dragDist += Math.hypot(e.clientX - prev[0], e.clientY - prev[1]);
        s.tTheta += (e.clientX - prev[0]) * 0.006;
        s.tPhi = Math.min(1.45, Math.max(-1.45, s.tPhi + (e.clientY - prev[1]) * 0.006));
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
        if (lastPinch) {
          s.tDist = Math.min(260, Math.max(80, (s.tDist * lastPinch) / d));
        }
        lastPinch = d;
      }
    };
    const onPointerUp = (e) => {
      pointers.delete(e.pointerId);
      lastPinch = 0;
      s.idle = performance.now();
      el.style.cursor = hoverIdx === null ? 'grab' : 'pointer';
      // A tap (not a drag) while exploded names the band it landed on. Touch has
      // no hover, so the tap stands in for one: the label lights and then fades
      // by itself. On a pointer that can hover there is nothing to do - the
      // label is already lit under the cursor.
      if (hasLayers && s.exploded && downAt && dragDist < 6 && e.pointerType === 'touch') {
        window.clearTimeout(touchHoverTimer);
        const idx = pickLayer(e.clientX, e.clientY);
        setHover(idx);
        if (idx !== null) touchHoverTimer = window.setTimeout(() => setHover(null), 1400);
        s.dirty = true;
      }
      downAt = null;
    };
    const onPointerLeave = () => {
      if (hasLayers) setHover(null);
    };
    const onWheel = (e) => {
      e.preventDefault();
      s.tDist = Math.min(260, Math.max(80, s.tDist + e.deltaY * 0.15));
      s.idle = performance.now();
    };

    // The single entry point for entering/leaving the exploded view.
    const setExplodeState = (next) => {
      if (!hasLayers || s.exploded === next) return;
      s.exploded = next;
      explodeTarget = next ? 1 : 0;
      s.dirty = true;
      setExploded(next);
      if (next) {
        ensureStack();
      } else {
        setHover(null);
        window.clearTimeout(touchHoverTimer);
      }
    };
    s.setExplodeState = setExplodeState;

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('wheel', onWheel, { passive: false });

    // Stage box and label widths, measured here and nowhere else.
    //
    // Both used to be read inside the per-frame label loop - a
    // getBoundingClientRect and an offsetWidth per visible band, each one
    // preceded by style writes to the band before it. That is a forced
    // synchronous layout per label per frame, and with the writes in between
    // the browser cannot batch them: eight bands meant eight layouts a frame,
    // every frame of the explode and of every grade change. It is the reason
    // those two transitions stuttered while the camera, which touches no DOM,
    // did not.
    //
    // The canvas fills the mount, so clientWidth/clientHeight are the same
    // numbers the rect carried. Label widths are cached against the text that
    // was measured and re-measured when the stage resizes, because the phone
    // breakpoints change .mv-label's type size.
    let stageW = 0, stageH = 0, labelEpoch = 0;
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      stageW = w;
      stageH = h;
      labelEpoch += 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const baseDist = w < 560 ? 195 : 150;
      // Remembered so the view presets can return to the size-appropriate framing.
      s.baseDist = baseDist;
      if (!s.exploded) s.tDist = s.dist = baseDist;
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    s.ro = ro;
    resize();
    s.idle = performance.now();

    const projected = new THREE.Vector3();
    const updateLayers = (dt) => {
      // One clock for both timelines. The grade morph runs first because
      // everything below multiplies the fade it publishes.
      let moving = advanceMorph(dt);
      const mf = s.morphFade ?? 1;

      // The explode only advances against a live stack; explodeT stays parked
      // at 0 so the solid box never fades out over an empty scene.
      const before = explodeT;
      if (hasLayers && layers) {
        const step = dt / EXPLODE_MS;
        // Settle exactly on the target. Stepping unconditionally leaves the
        // value jittering by one step either side of the endpoint, which pins
        // the render loop on forever after the animation has visually finished.
        const diff = explodeTarget - explodeT;
        if (diff !== 0) {
          explodeT = Math.abs(diff) <= step ? explodeTarget : explodeT + Math.sign(diff) * step;
        }
      }
      const T = explodeT;
      if (T !== before) moving = true;

      // ---- the solid box -------------------------------------------------
      // Ahead of the early return below, because the box is what a grade change
      // morphs when the stack is closed - which is most of the time, and is the
      // one case where there is no stack to drive at all.
      //
      // Cross-fade the solid box out over the first slice of the explode.
      const reveal = Math.min(1, T / 0.28);
      const bs = T > 0 ? 0.995 : 1;
      box.scale.set(bs, bs * (s.morphScaleY ?? 1), bs);
      box.visible = reveal < 1 && mf > 0.001;
      if (box.visible) {
        const o = (1 - reveal) * mf;
        [topMat, wallMat, bottomMat, seamMat].forEach((m) => {
          m.transparent = T > 0 || mf < 1;
          m.opacity = o;
          m.depthWrite = reveal < 0.5 && mf > 0.5;
        });
        // The badge is already transparent and already never writes depth, so
        // it only needs its opacity carried along with the surface it is on.
        badgeMats.forEach((m) => { m.opacity = o; });
      }

      if (!hasLayers || !layers) return moving;

      const n = layers.length;
      const span = 1 - (n - 1) * LAYER_STAGGER;
      // Dollying in makes the stack overflow the frame, so the group shrinks as
      // it separates - the mattress keeps its apparent size while gaining height.
      const eT = easeExplode(T);
      const gs = 1 - (1 - EXPLODE_SCALE) * eT;
      group.scale.setScalar(gs);
      s.groupScale = gs;
      s.shadow.visible = T < 0.98;
      s.shadowFade = 1 - eT;

      // How far the open stack sits from its exploded offsets: 1 at rest, drawn
      // in to 0.88 at the trough of a grade change so the bands ease together
      // as they leave and back out as they arrive.
      const sp = s.morphSpread ?? 1;

      const hoverStep = Math.min(1, dt / 150);
      const labelEls = labelsRef.current ? labelsRef.current.children : [];
      layers.forEach((l, i) => {
        const lt = Math.max(0, Math.min(1, (T - i * LAYER_STAGGER) / span));
        const e = easeExplode(lt);

        // Hover glow in the brand accent, eased so a fast pointer sweep reads as
        // a wash across the stack rather than a flicker.
        const hoverTarget = hoverIdx === i && T > 0.6 ? 1 : 0;
        const prevHover = l.hoverT;
        l.hoverT += (hoverTarget - l.hoverT) * hoverStep;
        if (Math.abs(hoverTarget - l.hoverT) < 0.002) l.hoverT = hoverTarget;
        if (l.hoverT !== prevHover) moving = true;

        l.object.visible = T > 0 && mf > 0.001;
        l.object.position.y = l.restY + e * l.explodeDy * sp + l.hoverT * HOVER_LIFT;
        l.object.scale.setScalar(1 + l.hoverT * HOVER_SCALE);
        l.mats.forEach((m) => {
          m.opacity = reveal * mf;
          m.transparent = reveal < 1 || mf < 1;
          m.depthWrite = reveal > 0.5 && mf > 0.5;
          if (l.hoverT > 0.001) {
            m.emissive.copy(accentColor);
            m.emissiveIntensity = l.hoverT * HOVER_GLOW * reveal * mf;
          } else if (m.emissiveIntensity !== 0) {
            m.emissiveIntensity = 0;
          }
        });

        if (l.drop) {
          const below = layers[i + 1];
          const belowTop =
            below.restY +
            easeExplode(Math.max(0, Math.min(1, (T - (i + 1) * LAYER_STAGGER) / span))) * below.explodeDy * sp +
            below.hoverT * HOVER_LIFT +
            below.h / 2;
          const sep = l.object.position.y - l.h / 2 - belowTop;
          l.drop.visible = T > 0.02 && sep > 0.2 && mf > 0.001;
          l.drop.position.y = belowTop + 0.06;
          const soft = Math.max(0.42, 1 - sep / ((stack?.gap ?? 9.5) * 2.4));
          l.drop.material.opacity = reveal * soft * mf;
          const spread = 1 + Math.min(0.22, sep * 0.02);
          l.drop.scale.set(spread, spread, 1);

          // Contact occlusion stays hard against the lower face and is strongest
          // when the gap is tight, so the moment of separation reads as two
          // slabs peeling apart rather than one fading into two.
          if (l.ao) {
            l.ao.visible = l.drop.visible;
            l.ao.position.y = belowTop + 0.14;
            const tight = Math.max(0, 1 - sep / 7);
            l.ao.material.opacity = reveal * (0.35 + 0.65 * tight) * mf;
          }
        }

        // Labels ride the layer's rightmost screen-space corner.
        const el2 = labelEls[i];
        if (el2) {
          const fade = Math.max(0, Math.min(1, (lt - 0.55) / 0.45)) * mf;
          if (fade <= 0.001) {
            el2.style.opacity = '0';
            el2.style.visibility = 'hidden';
          } else {
            let bestX = -Infinity, bestY = 0, leftX = Infinity, leftY = 0;
            const hw = W / 2, hl = L / 2;
            const g2 = s.groupScale ?? 1;
            for (const [cx, cz] of [[hw, hl], [hw, -hl], [-hw, hl], [-hw, -hl]]) {
              projected.set(cx * g2, l.object.position.y * g2, cz * g2).project(camera);
              if (projected.x > bestX) { bestX = projected.x; bestY = projected.y; }
              if (projected.x < leftX) { leftX = projected.x; leftY = projected.y; }
            }
            el2.style.visibility = 'visible';
            el2.style.opacity = String(fade);
            // Labels ride the right corner by default, but a narrow viewport
            // ran them off the edge and clipped the layer names. Hang them off
            // the left corner instead when the right has no room, and clamp so
            // one never leaves the canvas.
            let lw = el2._mvWidth;
            if (lw === undefined || el2._mvWidthFor !== el2.textContent || el2._mvWidthEpoch !== labelEpoch) {
              lw = el2.offsetWidth;
              el2._mvWidth = lw;
              el2._mvWidthFor = el2.textContent;
              el2._mvWidthEpoch = labelEpoch;
            }
            const GAP = 14, EDGE = 8;
            let lx = ((bestX + 1) / 2) * stageW + GAP;
            let ly = ((1 - bestY) / 2) * stageH;
            if (lx + lw > stageW - EDGE) {
              const flipped = ((leftX + 1) / 2) * stageW - GAP - lw;
              if (flipped >= EDGE) {
                lx = flipped;
                ly = ((1 - leftY) / 2) * stageH;
              } else {
                lx = Math.max(EDGE, stageW - EDGE - lw);
              }
            }
            el2.style.transform = `translate(${lx}px, ${ly}px) translateY(-50%)`;
          }
        }
      });
      return moving;
    };

    const tick = () => {
      s.raf = requestAnimationFrame(tick);
      // One clock for the whole frame. Time-based, not per-frame: a transition
      // must last as long as it says it does whatever the refresh rate, and a
      // headless or throttled tab runs far below 60fps. Capped so a tab
      // returning from the background does not jump every timeline to its end.
      const now = performance.now();
      const dt = Math.min(64, now - (explodeLast ?? now));
      explodeLast = now;
      if (s.autoRotate && pointers.size === 0 && s.idle > 0 && now - s.idle > 3000 && !s.exploded) {
        // 0.0018 rad per frame at 60fps, expressed as the rate it always was.
        s.tTheta += 0.108 * (dt / 1000);
      }
      // Exponential damper, on the clock rather than on the frame. It used to
      // be a flat 0.08 of the remaining distance per frame, which makes the
      // camera converge at whatever rate the display happens to run at - twice
      // as fast on a 120Hz panel as on a 60Hz one, and visibly slowing down
      // and speeding up again through any frame drop. Same feel, now the same
      // feel everywhere: tau is set so the move has settled to within 1% by
      // MOTION.camera, which reproduces 0.08-per-frame exactly at 60fps.
      const k = 1 - Math.exp(-dt / CAMERA_TAU);
      const layersMoving = updateLayers(dt);
      if (
        Math.abs(s.tTheta - s.theta) > 1e-4 ||
        Math.abs(s.tPhi - s.phi) > 1e-4 ||
        Math.abs(s.tDist - s.dist) > 1e-3 ||
        layersMoving ||
        s.dirty
      ) {
        s.theta += (s.tTheta - s.theta) * k;
        s.phi += (s.tPhi - s.phi) * k;
        s.dist += (s.tDist - s.dist) * k;
        const cp = Math.cos(s.phi), sp = Math.sin(s.phi);
        camera.position.set(s.dist * cp * Math.sin(s.theta), s.dist * sp, s.dist * cp * Math.cos(s.theta));
        camera.lookAt(0, 0, 0);
        s.shadow.material.opacity =
          Math.max(0, Math.min(1, sp + 0.15)) * (s.shadowFade ?? 1) * (s.morphFade ?? 1);
        renderer.render(scene, camera);
        s.dirty = false;
        if (topReady && !s.reportedReady) {
          s.reportedReady = true;
          s.markCanvasReady?.();
          // Same signal, other journey: with no shared element to wait on, this
          // is what releases the direct-load entrance.
          s.onFirstFrame?.();
          // First real frame is out; now spend idle time on the layer stack so
          // the Layers button and the zoom threshold are both instant.
          if (hasLayers) {
            if ('requestIdleCallback' in window) {
              s.warmHandle = window.requestIdleCallback(() => ensureStack(), { timeout: 2500 });
            } else {
              s.warmHandle = window.setTimeout(() => ensureStack(), 600);
            }
          }
        }
      }
    };
    tick();

    // TEMP-SCREENSHOT-HOOK
    if (hasLayers && typeof window !== 'undefined' && window.location.search.includes('explode')) {
      const q = new URLSearchParams(window.location.search);
      window.setInterval(() => { s.dirty = true; }, 60);
      window.setTimeout(() => {
        if (disposed) return;
        const twoPi = Math.PI * 2;
        s.tTheta = CORNER_VIEW.theta + Math.round((s.tTheta - CORNER_VIEW.theta) / twoPi) * twoPi;
        s.tPhi = q.has('phi') ? Number(q.get('phi')) : 0.3;
        s.tDist = q.has('dist') ? Number(q.get('dist')) : EXPLODE_DIST;
        s.theta = s.tTheta; s.phi = s.tPhi; s.dist = s.tDist;
        setExplodeState(true);
        ensureStack().then(() => {
          if (disposed) return;
          explodeT = q.has('mid') ? Number(q.get('mid')) : 1;
          explodeTarget = explodeT;
          s.dirty = true;
          window.setTimeout(() => {
            try {
              const l0 = layers?.[3];
              renderer.render(scene, camera);
              const gl = renderer.getContext();
              const w = gl.drawingBufferWidth, hh = gl.drawingBufferHeight;
              const px = [];
              for (const [fx, fy] of [[0.5, 0.5], [0.45, 0.4], [0.4, 0.62]]) {
                const b = new Uint8Array(4);
                gl.readPixels(Math.floor(w * fx), Math.floor(hh * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
                px.push([...b].join(','));
              }
              document.title = 'DBG ' + JSON.stringify({
                n: layers?.length, T: explodeT, vis: l0?.object?.visible,
                op: l0?.mats?.[1]?.opacity, gs: group.scale.x, boxVis: box.visible,
                calls: renderer.info.render.calls, tris: renderer.info.render.triangles,
                cw: w, ch: hh, canvasOp: getComputedStyle(mount).opacity,
                px,
              });
            } catch (e) { document.title = 'DBGERR ' + e.message + ' | ' + e.stack; }
          }, 2500);
          if (q.has('hover')) {
            hoverIdx = Number(q.get('hover'));
            layers?.forEach((l, i) => { l.hoverT = i === hoverIdx ? 1 : 0; });
          }
        });
      }, 300);
    }

    return () => {
      disposed = true;
      s.applyHeight = null;
      cancelAnimationFrame(s.raf);
      window.clearTimeout(touchHoverTimer);
      if (s.warmHandle) {
        if ('cancelIdleCallback' in window) window.cancelIdleCallback(s.warmHandle);
        window.clearTimeout(s.warmHandle);
        s.warmHandle = null;
      }
      ro.disconnect();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('pointerleave', onPointerLeave);
      el.removeEventListener('wheel', onWheel);
      renderer.dispose();
      // box.geometry, not the `geometry` built above: once the sculpted cap has
      // swapped in, that original is already disposed and this is the live one.
      box.geometry.dispose();
      if (stitch) {
        stitch.geometry.dispose();
        stitch.material.dispose();
      }
      topMat.dispose();
      wallMat.dispose();
      bottomMat.dispose();
      badgeMats.forEach((m) => m.dispose());
      seamMat.dispose();
      shadowTex.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
      stack?.dispose();
      stack = null;
      layers = null;
      hitMeshes = null;
      stackPromise = null;
      envRT.dispose();
      disposables.forEach((t) => t.dispose());
      if (mount.contains(el)) mount.removeChild(el);
    };
    // Re-run whenever the product (and hence its textures/dimensions) changes.
    // Not on variant height - that goes through s.applyHeight, which rebuilds
    // the geometry without tearing the scene down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // Mirrored onto the scene the same way autoRotate is. The first run after a
  // mount is a no-op: the scene was built at exactly this height, from exactly
  // these bands.
  useEffect(() => {
    s.applyVariant?.(currentHeight, layerDefs);
  }, [currentHeight, layerDefs, s]);

  useEffect(() => {
    s.autoRotate = autoRotate && !s.reduced;
  }, [autoRotate, s]);

  useEffect(() => {
    s.markCanvasReady = markCanvasReady;
  }, [markCanvasReady, s]);

  // Direct-load entrance: hold until the scene has a real first frame, so the
  // mattress fades up already drawn rather than revealing an empty canvas, then
  // let the same REVEAL slots stagger the chrome. Capped so a slow scene cannot
  // strand the page invisible, and skipped outright under reduced motion.
  useEffect(() => {
    if (!directEntry) return undefined;
    if (prefersReducedMotion()) {
      setDirectRevealed(true);
      return undefined;
    }
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setDirectRevealed(true);
    };
    s.onFirstFrame = show;
    const cap = window.setTimeout(show, MOTION.canvasWaitCap);
    return () => {
      done = true;
      s.onFirstFrame = null;
      window.clearTimeout(cap);
    };
  }, [directEntry, s]);

  const goTo = (name, theta, phi, dist) => {
    if (s.exploded) s.setExplodeState?.(false);
    const twoPi = Math.PI * 2;
    const t = theta + Math.round((s.tTheta - theta) / twoPi) * twoPi;
    s.tTheta = t;
    s.tPhi = phi;
    // Only Detail carries its own distance; the rest return to the framing the
    // viewer chose for this mount size. Either way it goes through the same
    // damped target the drag controls use, so the move eases rather than cuts.
    s.tDist = dist ?? s.baseDist ?? s.tDist;
    // Mirrored onto the ref because the scene effect only re-runs per product;
    // it would otherwise read the `view` captured at mount forever.
    s.view = name;
    s.idle = performance.now();
    setView(name);
  };

  const toggleLayers = () => {
    const next = !s.exploded;
    const twoPi = Math.PI * 2;
    s.tTheta = CORNER_VIEW.theta + Math.round((s.tTheta - CORNER_VIEW.theta) / twoPi) * twoPi;
    if (next) {
      s.tPhi = 0.3;
      s.tDist = EXPLODE_DIST;
      setView('layers');
    } else {
      s.tPhi = CORNER_VIEW.phi;
      s.tDist = mountRef.current && mountRef.current.clientWidth < 560 ? 195 : 150;
      setView(CORNER_VIEW.key);
    }
    s.idle = performance.now();
    s.setExplodeState?.(next);
  };

  const { name } = product;
  const t = theme;

  const selectVariant = (index) => {
    setVariantIndex(index);
    setVariantMenuOpen(false);
    variantButtonRef.current?.focus();
  };

  // Dismiss the variant menu on an outside press or on Escape. Containment is
  // tested against the wrapper node rather than by class name, so it stays
  // right if the markup changes; pointerdown rather than click so a press that
  // starts outside dismisses immediately.
  useEffect(() => {
    if (!variantMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (!variantRef.current?.contains(e.target)) setVariantMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setVariantMenuOpen(false);
      variantButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [variantMenuOpen]);

  return (
    <div
      className="mv-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        fontFamily: "'Poppins', -apple-system, sans-serif",
        background: t.surface,
        color: t.text,
        '--mv-btn-bg': t.btnBg,
        '--mv-btn-color': t.btnColor,
        '--mv-btn-active-bg': t.btnActiveBg,
        '--mv-btn-active-color': t.btnActiveColor,
        // The variant control dresses itself from the same theme the layer
        // chrome uses; the rules themselves live in index.css, because a media
        // query cannot override an inline style.
        '--mv-accent': t.accent,
        '--mv-accent-soft': t.accentSoft,
        '--mv-accent-border': t.accentBorder,
        '--mv-menu-bg': t.cardBg,
        '--mv-menu-border': t.cardBorder,
        '--mv-menu-shadow': t.cardShadow,
        '--mv-menu-color': t.text,
        // Natural's Kiwi Green is the grade's own mark, not the brand's - see
        // the note on .mv-variant-item[data-natural] in index.css. One value:
        // the grade is marked by type colour and nothing else now.
        '--mv-natural': '#95C12B',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <Link
        to={backTo}
        className="mv-back"
        style={{
          zIndex: 10,
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: t.muted,
          textDecoration: 'none',
          background: brand === 'foamico' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          ...(animated ? enterStyle(revealed, 235) : null),
        }}
      >
        &larr; {backTo === '/' ? 'Brands' : 'Catalog'}
      </Link>
      <div className="mv-head">
        <img
          src={publicUrl(t.logo)}
          alt={t.logoAlt}
          style={{
            height: t.logoHeight,
            width: 'auto',
            ...(animated ? enterStyle(revealed, 0) : null),
          }}
        />
        <div
          className="mv-title"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            lineHeight: 1,
            textTransform: 'uppercase',
            ...(animated ? enterStyle(revealed, 0) : null),
          }}
        >
          {name}
        </div>
        {/* Variant pill. Present only where the catalog confirms variants, and
            interactive only where it confirms more than one - a range with a
            single grade is a fact about the product, not a choice to offer. */}
        {activeVariant && (
          <div
            ref={variantRef}
            className="mv-variant"
            style={{ ...(animated ? enterStyle(revealed, REVEAL.meta) : null) }}
          >
            {hasVariantChoice ? (
              <button
                ref={variantButtonRef}
                type="button"
                className="mv-variant-pill"
                aria-expanded={variantMenuOpen}
                aria-controls={variantMenuId}
                onClick={() => setVariantMenuOpen((open) => !open)}
              >
                <span key={variantLabel(activeVariant)} className="mv-variant-label">
                  {variantLabel(activeVariant)}
                </span>
                <span className="mv-variant-caret" aria-hidden="true" />
              </button>
            ) : (
              <span className="mv-variant-pill">
                {variantLabel(activeVariant)}
              </span>
            )}
            {/* The menu lists what you can switch to, so the variant already
                named on the pill is left out of it rather than repeated
                directly underneath itself. */}
            {variantMenuOpen && hasVariantChoice && (
              <div id={variantMenuId} className="mv-variant-menu">
                {menuOrder(variants)
                  .filter(({ index }) => index !== activeIndex)
                  .map(({ v, index }) => (
                    <button
                      key={`${v.variant}-${v.height}`}
                      type="button"
                      className="mv-variant-item"
                      data-natural={isNatural(v)}
                      onClick={() => selectVariant(index)}
                    >
                      {variantLabel(v)}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Two pools, and they do different jobs. The ground is always on and
            is what gives a dark-bordered product a silhouette against a dark
            stage - see the note in src/data/brandThemes.js. The tint fades in
            with the explode and shades an open stack. Both sit behind the
            canvas, which is drawn with alpha. */}
        {t.stageGround ? (
          <div aria-hidden className="mv-stage-ground" style={{ background: t.stageGround }} />
        ) : null}
        {hasLayers && t.stageTint ? (
          <div aria-hidden className="mv-stage-tint" style={{ background: t.stageTint, opacity: exploded ? 1 : 0 }} />
        ) : null}
        <div
          ref={mountRef}
          style={{
            position: 'absolute',
            inset: 0,
            touchAction: 'none',
            cursor: 'grab',
            // The scene still mounts and loads behind the overlay so it can
            // report its first frame, but must not be visible or interactive
            // until the shared texture has completed its flight.
            opacity: animated && !revealed ? 0 : 1,
            pointerEvents: animated && !revealed ? 'none' : 'auto',
            // The shared-element path crossfades fast because the mattress is
            // already on screen as the flying overlay. A direct load has
            // nothing to hand over from, so it eases up from slightly small -
            // the product settling into place rather than appearing.
            transform: directEntry && !revealed ? 'scale(0.94)' : 'scale(1)',
            transition: !animated || !revealed
              ? 'none'
              : directEntry
                ? `opacity ${MOTION.enter}ms ${EASE.enter}, transform ${MOTION.enter}ms ${EASE.enter}`
                : `opacity ${MOTION.fast}ms linear`,
          }}
        />

        {hasLayers && (
          <div ref={labelsRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {layerDefs.map((l, i) => (
              <div
                key={l.id}
                className="mv-label"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  visibility: 'hidden',
                  opacity: 0,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: hoveredLayer === i ? t.accent : t.labelColor,
                  background: t.labelBg,
                  border: `1px solid ${hoveredLayer === i ? t.accent : t.accentBorder}`,
                  borderRadius: 100,
                  padding: '4px 11px',
                  transition: 'opacity 0.2s linear, color 0.2s linear, border-color 0.2s linear',
                }}
              >
                <span style={{ color: t.accent, marginRight: 7 }}>&#9679;</span>
                {l.name}
              </div>
            ))}
          </div>
        )}

      </div>

      <div
        className="mv-controls"
        style={{ ...(animated ? enterStyle(revealed, 130) : null) }}
      >
        <div className="mv-btnrow">
          {VIEW_DEFS.map(([name_, label, th, ph, ds]) => (
            <button
              key={name_}
              onClick={() => goTo(name_, th, ph, ds)}
              className="mv-view-btn"
              data-active={view === name_}
            >
              {label}
            </button>
          ))}
          {hasLayers && (
            <>
              {/* Layers is not a sixth camera angle - it changes what the
                  product *is* on screen. A divider says so without a label. */}
              <span className="mv-btn-sep" aria-hidden="true" />
              <button onClick={toggleLayers} className="mv-view-btn" data-active={exploded}>
                {exploded ? 'Solid' : 'Layers'}
              </button>
            </>
          )}
        </div>
        <div className="mv-hint" style={{ color: t.faint }}>
          {hasLayers && exploded
            ? 'Drag to rotate · Solid to collapse'
            : hasLayers
              ? 'Drag to rotate · Layers to open the stack'
              : 'Drag to rotate'}
        </div>
      </div>

    </div>
  );
}
