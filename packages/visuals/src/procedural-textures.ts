import * as THREE from 'three';

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas');
  el.width = size;
  el.height = size;
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  return [el, ctx];
}

function noise(ctx: CanvasRenderingContext2D, size: number, alpha: number, color: string) {
  const layer = document.createElement('canvas');
  layer.width = size;
  layer.height = size;
  const lctx = layer.getContext('2d')!;
  const img = lctx.createImageData(size, size);
  const parts = color.match(/\w\w/g) ?? ['00', '00', '00'];
  const r = parseInt(parts[0] ?? '00', 16);
  const g = parseInt(parts[1] ?? '00', 16);
  const b = parseInt(parts[2] ?? '00', 16);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = Math.random();
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = Math.floor(n * alpha * 255);
  }
  lctx.putImageData(img, 0, 0);
  ctx.drawImage(layer, 0, 0);
}

function softBlur(source: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d')!;
  ctx.filter = `blur(${amount}px)`;
  ctx.drawImage(source, 0, 0);
  ctx.filter = 'none';
  return out;
}

/** Soft out-of-focus foliage field matching Botanical Dark/Light concepts. */
export function makeFoliageTexture(mode: 'light' | 'dark'): THREE.CanvasTexture {
  const size = 1024;
  const [el, ctx] = canvas(size);
  const base = mode === 'dark' ? '#0A1410' : '#E8E2D4';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const blobs =
    mode === 'dark'
      ? ['#16301F', '#1F4630', '#0E2218', '#2A5A3C', '#112818', '#3A6B48']
      : ['#6B9A4E', '#4F7340', '#A8C86A', '#3D6B32', '#8FBF5C', '#C5D48A', '#2F5A28'];
  for (let i = 0; i < (mode === 'light' ? 64 : 48); i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 40 + Math.random() * 180;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, blobs[i % blobs.length]!);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const blurred = softBlur(el, 28);
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(blurred, 0, 0);
  noise(ctx, size, mode === 'dark' ? 0.08 : 0.05, mode === 'dark' ? '102818' : '596352');
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
  return tex;
}

/** Concrete / plaster grain for Brutalist concepts. */
export function makeConcreteTexture(mode: 'light' | 'dark'): THREE.CanvasTexture {
  const size = 1024;
  const [el, ctx] = canvas(size);
  ctx.fillStyle = mode === 'dark' ? '#141414' : '#D6D5CF';
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, mode === 'dark' ? 0.45 : 0.32, mode === 'dark' ? '050505' : '8A8A82');
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = mode === 'dark' ? `rgba(255,255,255,${0.01 + Math.random() * 0.04})` : `rgba(0,0,0,${0.02 + Math.random() * 0.05})`;
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillRect(x, y, 1 + Math.random() * 10, 1 + Math.random() * 4);
    if (Math.random() > 0.7) {
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const vignette = ctx.createRadialGradient(size / 2, size * 0.28, size * 0.1, size / 2, size / 2, size * 0.78);
  vignette.addColorStop(0, mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)');
  vignette.addColorStop(0.45, 'transparent');
  vignette.addColorStop(1, mode === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(40,40,35,0.22)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Soft leaf-branch gobo for Botanical Light dappled light. */
export function makeLeafShadowTexture(): THREE.CanvasTexture {
  const size = 1024;
  const [el, ctx] = canvas(size);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(40, 55, 35, 0.22)';
  for (let i = 0; i < 36; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 60 + Math.random() * 160;
    const w = 18 + Math.random() * 40;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-50 + Math.random() * 100) * (Math.PI / 180));
    ctx.beginPath();
    ctx.ellipse(0, 0, w, len, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  }
  const soft = softBlur(el, 18);
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(soft, 0, 0);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Corner botanical silhouette (fern-like) on transparent canvas. */
export function makeBotanicalSilhouette(tint: string): THREE.CanvasTexture {
  const size = 512;
  const [el, ctx] = canvas(size);
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = tint;
  ctx.fillStyle = tint;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const stem = (ox: number, oy: number, angle: number, scale: number) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8 * scale, -80 * scale, 4 * scale, -180 * scale);
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const y = -20 * scale - t * 150 * scale;
      const side = i % 2 ? 1 : -1;
      const leaf = (28 + (1 - t) * 34) * scale;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(side * leaf, y - 10 * scale, side * leaf * 0.2, y - 28 * scale);
      ctx.quadraticCurveTo(side * leaf * 0.55, y - 6 * scale, 0, y);
      ctx.fill();
    }
    ctx.restore();
  };
  stem(40, size - 20, -0.35, 1.1);
  stem(110, size - 10, -0.1, 0.85);
  stem(20, size - 40, -0.55, 0.7);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
