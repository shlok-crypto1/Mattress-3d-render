import * as THREE from 'three';

// Procedural stand-ins for the foam surfaces in the Duro cutaway reference.
// These exist so the explode view reads as real material rather than flat
// colour; they get replaced when real layer photography arrives.

/** Rebonded-foam chip speckle (the Ortho Bond layer). */
export function makeSpeckleTexture(base = '#DCD7CE', size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const chips = ['#E86A6A', '#4FB0C8', '#F2C14E', '#6BBF59', '#2E2E2E', '#F0F0F0', '#C86FB0'];
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = chips[(Math.random() * chips.length) | 0];
    g.globalAlpha = 0.35 + Math.random() * 0.5;
    const w = 1 + Math.random() * 4;
    const h = 1 + Math.random() * 4;
    g.save();
    g.translate(Math.random() * size, Math.random() * size);
    g.rotate(Math.random() * Math.PI);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.restore();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Egg-crate dimple height field, used as a bump map on convoluted layers. */
export function makeConvolutedBump(size = 256, cells = 12) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const k = (Math.PI * 2 * cells) / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = (Math.sin(x * k) * Math.sin(y * k) + 1) * 0.5;
      const p = (y * size + x) * 4;
      const b = 40 + v * 175;
      img.data[p] = img.data[p + 1] = img.data[p + 2] = b;
      img.data[p + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Soft radial blob reused for the ground shadow and the per-layer drop shadows. */
export function makeShadowTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const h = size / 2;
  const grad = g.createRadialGradient(h, h, size * 0.04, h, h, size * 0.49);
  grad.addColorStop(0, 'rgba(0,0,0,0.30)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.11)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
