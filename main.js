// A Week in Hatfield — a 3D animated routine.
// The town is laid out on separate streets:
//   Street A  – the apartment and the bottle store
//   Street B  – Drama and Ekhaya (side by side)
//   Street C  – Blue Room and the late-night burger stop
//   Street D  – the office
// Chapters place the characters, set the clock and aim the camera.

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const STORY = { workplace: 'BMW IT Hub' };

const $ = (s) => document.querySelector(s);
const PI = Math.PI;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.min(Math.max(k, 0), 1);
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const pick = (list, i) => list[Math.abs(Math.round(i)) % list.length];

/* ------------------------------------------------------------------ renderer */

const stage = $('#stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch {
  stage.innerHTML = '<div class="fallback">This animation needs WebGL, which is not available in this browser.</div>';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
labels.domElement.className = 'labels';
document.body.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc7ff);
scene.fog = new THREE.Fog(0x8fc7ff, 45, 150);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 400);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.6, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
});

const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7f72, 1.4);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 110 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
const fill = new THREE.PointLight(0xfff1e0, 10, 18);
scene.add(hemi, sun, sun.target, fill);

/* ------------------------------------------------------------------ building blocks */

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...extra });
const lit = (color) => new THREE.MeshBasicMaterial({ color });
const asMat = (c) => (typeof c === 'number' ? M(c) : c);
function mesh(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, asMat(material));
  m.position.set(x, y, z);
  const glow = m.material.isMeshBasicMaterial;
  m.castShadow = !glow; m.receiveShadow = !glow;
  parent.add(m); return m;
}
const box = (p, w, h, d, c, x, y, z) => mesh(p, new THREE.BoxGeometry(w, h, d), c, x, y, z);
const rbox = (p, w, h, d, c, x, y, z, r = 0.06) => mesh(p, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w * 0.49, h * 0.49, d * 0.49)), c, x, y, z);
const cyl = (p, r, h, c, x, y, z, rTop = r) => mesh(p, new THREE.CylinderGeometry(rTop, r, h, 24), c, x, y, z);
const ball = (p, r, c, x, y, z) => mesh(p, new THREE.SphereGeometry(r, 20, 16), c, x, y, z);

const tags = [];
function tag(parent, html, cls, x, y, z, far = 45) {
  const el = document.createElement('div');
  el.className = cls; el.innerHTML = html;
  const o = new CSS2DObject(el);
  o.position.set(x, y, z); parent.add(o);
  tags.push({ o, far });
  return o;
}
const neon = (parent, text, color, x, y, z, far) => { const t = tag(parent, text, 'sign', x, y, z, far); t.element.style.color = color; return t; };

const loops = [];
function puffs(parent, x, y, z, color, { n = 7, rise = 1.6, spread = 0.4, size = 0.12, rate = 0.35 } = {}) {
  const list = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false }));
    parent.add(m); return m;
  });
  const e = { on: true, update(t) {
    list.forEach((m, i) => {
      const u = (t * rate + i / n) % 1;
      m.visible = e.on;
      m.position.set(x + Math.sin(i * 2.4 + u * 4) * spread * u, y + u * rise, z + Math.cos(i * 1.7 + u * 3) * spread * u);
      m.scale.setScalar(0.5 + u * 1.8);
      m.material.opacity = 0.38 * (1 - u);
    });
  } };
  loops.push(e); return e;
}
function floaters(parent, x, y, z, chars, { rise = 1.6, spread = 0.5, rate = 0.3 } = {}) {
  const list = chars.map((c) => tag(parent, c, 'fx', x, y, z, 22));
  const e = { on: false, update(t) {
    list.forEach((o, i) => {
      const u = (t * rate + i / list.length) % 1;
      o.userData.on = e.on;
      o.position.set(x + Math.sin(i * 2.1 + u * 5) * spread, y + u * rise, z + Math.cos(i * 1.3) * spread * 0.5);
      o.element.style.opacity = e.on ? Math.sin(u * PI) : 0;
    });
  } };
  loops.push(e); return e;
}

/* ------------------------------------------------------------------ people */

const GEO = {
  leg: new THREE.CapsuleGeometry(0.085, 0.5, 6, 14), arm: new THREE.CapsuleGeometry(0.065, 0.36, 6, 14),
  torso: new THREE.CapsuleGeometry(0.2, 0.3, 8, 18), head: new THREE.SphereGeometry(0.23, 28, 20),
  hand: new THREE.SphereGeometry(0.072, 12, 10), eye: new THREE.SphereGeometry(0.042, 12, 10), pupil: new THREE.SphereGeometry(0.022, 8, 6),
  hair: new THREE.SphereGeometry(0.245, 28, 14, 0, PI * 2, 0, PI * 0.52), smile: new THREE.TorusGeometry(0.07, 0.012, 6, 14, PI),
  shoe: new RoundedBoxGeometry(0.16, 0.1, 0.28, 3, 0.045), skirt: new THREE.CylinderGeometry(0.19, 0.34, 0.5, 24),
  ear: new THREE.SphereGeometry(0.05, 8, 6), item: new THREE.CylinderGeometry(0.045, 0.04, 0.2, 14),
  hood: new THREE.TorusGeometry(0.15, 0.055, 8, 18),
};
let phase = 0;
function person({ skin, top, bottom = 0x23232e, shoes = 0xf4f4f4, hair = 0x14100e, style = 'fade', h = 1.7, dress = false, hoodie = false }) {
  const g = new THREE.Group(), root = new THREE.Group();
  g.add(root);
  root.scale.setScalar(h / 1.7);
  const mSkin = M(skin, { roughness: 0.6 }), mTop = M(top), mBot = dress ? mSkin : M(bottom), mHair = M(hair, { roughness: 0.9 }), mShoe = M(shoes);
  const leg = (x) => { const p = new THREE.Group(); p.position.set(x, 0.8, 0); mesh(p, GEO.leg, mBot, 0, -0.335, 0); mesh(p, GEO.shoe, mShoe, 0, -0.74, 0.05); root.add(p); return p; };
  const arm = (x) => { const p = new THREE.Group(); p.position.set(x, 1.37, 0); mesh(p, GEO.arm, mTop, 0, -0.24, 0); mesh(p, GEO.hand, mSkin, 0, -0.52, 0); root.add(p); return p; };
  const legL = leg(-0.11), legR = leg(0.11), armL = arm(-0.31), armR = arm(0.31);
  mesh(root, GEO.torso, mTop, 0, 1.12, 0).scale.set(1.12, 1, 0.82);
  if (dress) mesh(root, GEO.skirt, mTop, 0, 0.74, 0);
  if (hoodie) mesh(root, GEO.hood, mTop, 0, 1.45, -0.05).rotation.x = PI / 2 + 0.35;
  mesh(root, GEO.head, mSkin, 0, 1.68, 0);
  for (const x of [-0.225, 0.225]) mesh(root, GEO.ear, mSkin, x, 1.68, 0);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of [-0.085, 0.085]) { mesh(root, GEO.eye, eyeMat, x, 1.71, 0.195); mesh(root, GEO.pupil, lit(0x1a1210), x, 1.71, 0.23); }
  mesh(root, GEO.smile, lit(0x2a1a14), 0, 1.625, 0.205).rotation.z = PI;
  mesh(root, GEO.hair, mHair, 0, 1.7, -0.012).rotation.x = -0.28;
  if (style === 'bun') { ball(root, 0.13, mHair, 0, 2.0, -0.07); ball(root, 0.21, mHair, 0, 1.66, -0.1).scale.set(1.05, 1.05, 0.75); }
  if (style === 'long') rbox(root, 0.42, 0.52, 0.16, mHair, 0, 1.5, -0.17, 0.07);
  if (style === 'afro') ball(root, 0.3, mHair, 0, 1.8, -0.04).scale.set(1, 0.85, 1);
  const item = (p) => { const m = mesh(p, GEO.item, M(0xffffff, { roughness: 0.3 }), 0, -0.6, 0.08); m.visible = false; return m; };
  scene.add(g);
  const a = { g, root, legL, legR, armL, armR, eyeMat, item: item(armR), itemL: item(armL), ph: (phase += 1.7), say: '', said: null };
  a.bubble = tag(g, '', 'say', 0, 2.5, 0, 40);
  return a;
}

function pose(a, name, t = 0) {
  const { root, legL, legR, armL, armR } = a;
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
  for (const p of [legL, legR, armL, armR]) p.rotation.set(0, 0, 0);
  const sit = () => { legL.rotation.x = legR.rotation.x = -PI / 2; root.position.y = -0.33; };
  const b = t * 5.9 + a.ph;
  switch (name) {
    case 'walk': { const s = Math.sin(t * 9 + a.ph); legL.rotation.x = s * 0.6; legR.rotation.x = -s * 0.6; armL.rotation.x = -s * 0.5; armR.rotation.x = s * 0.5; root.position.y = Math.abs(Math.cos(t * 9 + a.ph)) * 0.04; break; }
    case 'carry': { const s = Math.sin(t * 9 + a.ph); legL.rotation.x = s * 0.6; legR.rotation.x = -s * 0.6; armL.rotation.x = armR.rotation.x = -0.5; break; }
    case 'sit': sit(); armL.rotation.x = armR.rotation.x = -0.35; break;
    case 'type': sit(); armL.rotation.x = -1.15 + Math.sin(t * 15) * 0.07; armR.rotation.x = -1.15 + Math.cos(t * 13) * 0.07; break;
    case 'sip': sit(); armL.rotation.x = -0.5; armR.rotation.x = -1.2 - Math.max(0, Math.sin(t * 1.1 + a.ph)) * 0.9; break;
    case 'lie': root.rotation.x = -PI / 2; root.position.y = 0.66; break;
    case 'dance': root.position.y = Math.abs(Math.sin(b)) * 0.13; root.rotation.y = Math.sin(b * 0.5) * 0.5; armL.rotation.z = -2.2 + Math.sin(b) * 0.5; armR.rotation.z = 2.2 - Math.sin(b + 1) * 0.5; legL.rotation.x = Math.sin(b) * 0.25; legR.rotation.x = -Math.sin(b) * 0.25; break;
    case 'groove': root.position.y = Math.abs(Math.sin(b)) * 0.1; root.rotation.y = Math.sin(b * 0.5) * 0.35; armL.rotation.z = -0.5 + Math.sin(b) * 0.4; armR.rotation.x = -1.3 - Math.max(0, Math.sin(t * 0.9 + a.ph)) * 0.8; legL.rotation.x = Math.sin(b) * 0.2; legR.rotation.x = -Math.sin(b) * 0.2; break;
    case 'stir': armR.rotation.x = -1.1; armR.rotation.z = Math.sin(t * 6 + a.ph) * 0.3; armL.rotation.x = -0.4; break;
    case 'wave': armR.rotation.z = 2.6 + Math.sin(t * 8 + a.ph) * 0.35; break;
    default: break;
  }
}
function put(a, x, z, rot, name, t) { a.g.position.set(x, 0, z); a.g.rotation.y = rot; pose(a, name, t); }
function along(pts, k) {
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); total += d; }
  let d = clamp01(k) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(d / seg[i], 1) : 0, a = pts[i], b = pts[i + 1];
      return { x: lerp(a[0], b[0], f), z: lerp(a[1], b[1], f), rot: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    }
    d -= seg[i];
  }
  return { x: pts[0][0], z: pts[0][1], rot: 0 };
}
function walk(a, pts, k, t, name = 'walk') { const p = along(pts, k); put(a, p.x, p.z, p.rot, name, t); }
const shift = (pts, dx, dz) => pts.map(([x, z]) => [x + dx, z + dz]);
const HELD = {
  beer: [0xf2b632, 1.3, 0.9], cider: [0x9be36b, 0.8, 1.4], wineWhite: [0xf3e7a4, 0.9, 0.8], wineRed: [0x8a1538, 0.9, 0.8],
  bottleRed: [0x5c0f26, 0.9, 1.9], bottleWhite: [0xd9d28a, 0.9, 1.9], bag: [0xc98a3c, 2.2, 1.3],
};
function hold(itemMesh, kind) { const [c, w, h] = HELD[kind]; itemMesh.visible = true; itemMesh.material.color.setHex(c); itemMesh.scale.set(w, h, w); }

const SKINS = [0x5a3620, 0x6b4226, 0x7a4a2b, 0x8a5a3a, 0x4a2c1a];
const TOPS = [0xff5fa2, 0x5ee6ff, 0xffd166, 0xa78bfa, 0x06d6a0, 0xf8f8f8, 0xef476f, 0x118ab2];

const me = person({ skin: 0x6b4226, top: 0x1fb6a6, bottom: 0x1c1f2b, h: 1.73, hoodie: true });
const gf = person({ skin: 0x7a4a2b, top: 0xff5fa2, style: 'bun', h: 1.57, dress: true, shoes: 0xffffff });

/* ------------------------------------------------------------------ the town */

// Where each place sits on the map: [x, z].
const O = { apt: [0, 0], store: [12, 0], drama: [34, -50], ekhaya: [47, -50], blue: [74, -100], burger: [88, -100], office: [-40, -110] };
const place = (key) => { const g = new THREE.Group(); g.position.set(O[key][0], 0, O[key][1]); scene.add(g); return g; };
const W = (key, x, z) => [O[key][0] + x, O[key][1] + z];
const nearSet = (x, z, pad) => Object.values(O).some(([sx, sz]) => Math.abs(x - sx) < pad + 5 && Math.abs(z - sz) < pad + 4);
const camAt6 = (key, c, cut = 0) => [c[0] + O[key][0], c[1], c[2] + O[key][1], c[3] + O[key][0], c[4], c[5] + O[key][1], cut];

box(scene, 520, 0.2, 420, 0x6f9463, 20, -0.1, -50).castShadow = false;
// Streets running east–west: [z, x1, x2].  Streets running north–south: [x, z1, z2].
const EW = [[6.6, -40, 44], [-43.4, 14, 70], [-93.4, 54, 104], [-103.4, -60, -14]];
const NS = [[22, -45.2, 8.4], [62, -95.2, -41.6], [-22, -105.2, 8.4]];
const asphalt = M(0x2d2d36, { roughness: 0.95 }), paving = M(0xc4bcae), paint = lit(0xdedede);
for (const [z, x1, x2] of EW) {
  box(scene, x2 - x1, 0.04, 3.6, asphalt, (x1 + x2) / 2, 0.02, z).castShadow = false;
  box(scene, x2 - x1, 0.1, 1.5, paving, (x1 + x2) / 2, 0.05, z - 2.6).castShadow = false;
  for (let x = x1 + 2; x < x2; x += 4) box(scene, 1.6, 0.01, 0.14, paint, x, 0.045, z);
  for (let x = x1 + 5; x < x2; x += 13) if (!nearSet(x, z - 6.6, 2)) { cyl(scene, 0.06, 3.6, 0x3a3a44, x, 1.8, z - 3.2); ball(scene, 0.17, lit(0xffe2a8), x, 3.7, z - 3.2); }
}
for (const [x, z1, z2] of NS) {
  box(scene, 3.6, 0.04, z2 - z1, asphalt, x, 0.021, (z1 + z2) / 2).castShadow = false;
  for (let z = z1 + 4; z < z2 - 2; z += 4) box(scene, 0.14, 0.01, 1.6, paint, x, 0.046, z);
}

function jacaranda(x, z, s = 1) {
  cyl(scene, 0.2 * s, 2.6 * s, 0x4a3324, x, 1.3 * s, z, 0.13 * s);
  for (const [dx, dy, dz, r, c] of [[0, 3.4, 0, 1.4, 0x9b6bd6], [0.95, 3.0, 0.3, 1.0, 0xa77be0], [-0.85, 3.1, -0.3, 1.05, 0x8f5fcb], [0.2, 3.9, -0.5, 0.9, 0xb48cf0], [-0.2, 2.9, 0.7, 0.85, 0x9b6bd6]]) {
    mesh(scene, new THREE.IcosahedronGeometry(r * s, 2), M(c, { roughness: 1 }), x + dx * s, dy * s, z + dz * s);
  }
}

for (const [z, x1, x2] of EW) for (let x = x1 + 3; x < x2; x += 6.5) {
  if (!nearSet(x, z - 6.6, 1) && !NS.some(([nx]) => Math.abs(nx - x) < 4)) jacaranda(x, z - 5.2 + Math.sin(x) * 0.6);
  if (!NS.some(([nx]) => Math.abs(nx - x) < 4)) jacaranda(x + 2, z - 13.5 + Math.cos(x) * 0.8, 1.15);
}
for (const [x, z1, z2] of NS) for (let z = z1 + 9; z < z2 - 12; z += 7) jacaranda(x - 5, z + Math.sin(z) * 0.7);

// Background buildings with lit windows, kept clear of streets, sets and camera paths.
const winCanvas = document.createElement('canvas'); winCanvas.width = 64; winCanvas.height = 128;
{ const g = winCanvas.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 128; y += 14) for (let x = 5; x < 64; x += 12) { g.fillStyle = Math.random() < 0.55 ? '#ffd98a' : '#16161c'; g.fillRect(x, y, 7, 8); } }
const winTex = new THREE.CanvasTexture(winCanvas);
const towerMats = [0x8d8799, 0xa0969f, 0xb3a79a, 0x77839a, 0x9c8f8f].map((c) => M(c, { emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0 }));
function clear(x, z, w) {
  for (const [rz, x1, x2] of EW) if (x > x1 - 10 && x < x2 + 10 && z > rz - 5 - w / 2 && z < rz + 21 + w / 2) return false;
  for (const [rx, z1, z2] of NS) if (z > z1 - 8 && z < z2 + 22 && Math.abs(x - rx) < 14 + w / 2) return false;
  return !nearSet(x, z, 5 + w / 2);
}
for (let i = 0, made = 0; i < 900 && made < 110; i++) {
  const w = 6 + Math.random() * 6, h = 7 + Math.random() * 20, x = -95 + Math.random() * 225, z = -150 + Math.random() * 185;
  if (!clear(x, z, w)) continue;
  made++;
  rbox(scene, w, h, w, pick(towerMats, i), x, h / 2, z, 0.25);
  box(scene, w * 0.5, 0.6, w * 0.5, 0x5b5866, x, h + 0.3, z);
}
const stars = (() => {
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const r = 190, a = Math.random() * PI * 2, b = 0.15 + Math.random() * 1.2; pos.set([r * Math.cos(a) * Math.cos(b), r * Math.sin(b), r * Math.sin(a) * Math.cos(b)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, fog: false, transparent: true }));
  scene.add(p); return p;
})();

/* ---- The studio apartment (Street A). */
const apt = place('apt');
const wood = M(0xc79a6b, { roughness: 0.6 }), darkWood = M(0x3b2b20, { roughness: 0.55 }), wall = M(0xf3e7d8), black = M(0x16161a, { roughness: 0.4 });
rbox(apt, 10.6, 0.3, 7.6, wood, 0, -0.14, 0, 0.08);
box(apt, 10.6, 3.5, 0.22, wall, 0, 1.75, -3.7); box(apt, 0.22, 3.5, 7.6, M(0xe9dac6), -5.2, 1.75, 0);
box(apt, 10.4, 0.12, 0.04, 0xffffff, 0, 0.07, -3.58); box(apt, 0.04, 0.12, 7.4, 0xffffff, -5.08, 0.07, 0);
cyl(apt, 2.1, 0.03, M(0x7d5ba6, { roughness: 1 }), -1.4, 0.03, -1.2).scale.set(1.25, 1, 1);
// window, curtains, art, shelf, plant, floor lamp
const windowPane = box(apt, 2.3, 1.5, 0.05, lit(0xbfe3ff), 3.2, 2.05, -3.57);
rbox(apt, 2.5, 0.1, 0.12, 0xffffff, 3.2, 2.85, -3.54, 0.03); rbox(apt, 2.5, 0.1, 0.12, 0xffffff, 3.2, 1.25, -3.54, 0.03); rbox(apt, 0.08, 1.6, 0.1, 0xffffff, 3.2, 2.05, -3.54, 0.03);
for (const x of [1.85, 4.55]) rbox(apt, 0.5, 2.0, 0.12, 0xd98e73, x, 1.95, -3.5, 0.06);
rbox(apt, 1.1, 0.8, 0.05, 0xff8c42, -1.7, 2.3, -3.57, 0.02); rbox(apt, 0.7, 0.95, 0.05, 0x2ec4b6, -0.5, 2.2, -3.57, 0.02); ball(apt, 0.2, 0xffe08a, -1.7, 2.35, -3.54).scale.z = 0.1;
rbox(apt, 0.25, 0.05, 1.4, darkWood, -4.95, 2.2, 1.6, 0.02);
[0xef476f, 0xffd166, 0x118ab2, 0x06d6a0, 0xf8f8f8].forEach((c, i) => rbox(apt, 0.18, 0.3, 0.07, c, -4.95, 2.38, 1.1 + i * 0.1, 0.01));
cyl(apt, 0.2, 0.36, 0xd9825b, -4.4, 0.18, 3.0, 0.26);
for (const [dx, dy, dz, r] of [[0, 0.9, 0, 0.34], [0.2, 0.65, 0.1, 0.26], [-0.2, 0.7, -0.1, 0.27], [0, 1.2, 0.05, 0.22]]) mesh(apt, new THREE.IcosahedronGeometry(r, 1), M(0x3f8f5a), -4.4 + dx, dy, 3.0 + dz);
cyl(apt, 0.03, 1.7, black, -0.9, 0.85, -3.1); cyl(apt, 0.2, 0.03, black, -0.9, 0.02, -3.1);
const shade = cyl(apt, 0.26, 0.34, lit(0xd9b98a), -0.9, 1.8, -3.1, 0.16);
const lamp = new THREE.PointLight(0xffc98a, 0, 16); lamp.position.set(-1, 2.6, -1.2); apt.add(lamp);
tag(apt, 'Studio apartment', 'plain', 0, 4.0, -3.6, 60);
// desk: two 27" monitors, two laptops, soundbar
rbox(apt, 0.9, 0.07, 2.7, darkWood, -4.55, 0.76, -1.5, 0.03);
for (const z of [-2.7, -0.3]) for (const x of [-4.9, -4.2]) cyl(apt, 0.035, 0.74, black, x, 0.37, z);
const screens = [];
for (const z of [-1.93, -1.07]) {
  rbox(apt, 0.045, 0.43, 0.7, black, -4.84, 1.2, z, 0.02);
  screens.push(box(apt, 0.012, 0.37, 0.64, lit(0x3355ff), -4.812, 1.2, z));
  cyl(apt, 0.025, 0.24, black, -4.86, 0.92, z); cyl(apt, 0.14, 0.02, black, -4.84, 0.805, z);
}
const soundbar = rbox(apt, 0.11, 0.09, 1.15, black, -4.6, 0.845, -1.5, 0.04);
const sbLight = box(apt, 0.012, 0.025, 0.9, lit(0xff7a18), -4.542, 0.845, -1.5);
rbox(apt, 0.16, 0.02, 0.5, 0x2a2a30, -4.3, 0.805, -1.5, 0.008); rbox(apt, 0.07, 0.03, 0.11, 0x2a2a30, -4.3, 0.81, -1.0, 0.012);
for (const [z, c] of [[-2.55, 0x2b2e3a], [-0.45, 0x9aa0aa]]) {
  rbox(apt, 0.3, 0.02, 0.42, c, -4.42, 0.805, z, 0.008);
  const lid = rbox(apt, 0.02, 0.28, 0.42, c, -4.6, 0.94, z, 0.008); lid.rotation.z = -0.22;
  box(apt, 0.006, 0.24, 0.38, lit(0x9fd0ff), -4.586, 0.94, z).rotation.z = -0.22;
}
tag(apt, '2 × 27" Dell · JBL soundbar', 'plain', -4.7, 1.8, -1.5, 13);
const chair = new THREE.Group(); apt.add(chair);
rbox(chair, 0.52, 0.1, 0.52, 0x2a2b36, 0, 0.47, 0, 0.05); rbox(chair, 0.1, 0.62, 0.5, 0x2a2b36, 0.25, 0.82, 0, 0.05); cyl(chair, 0.035, 0.4, 0x777777, 0, 0.22, 0); cyl(chair, 0.26, 0.04, 0x333333, 0, 0.03, 0);
// couch + round coffee table
const sofa = M(0x3d5a80, { roughness: 0.95 }), sofaDark = M(0x34507a, { roughness: 0.95 });
rbox(apt, 0.95, 0.32, 2.1, sofaDark, -2.5, 0.18, -1.5, 0.1);
for (const z of [-1.98, -1.02]) rbox(apt, 0.85, 0.2, 0.94, sofa, -2.52, 0.4, z, 0.09);
for (const z of [-1.98, -1.02]) rbox(apt, 0.26, 0.6, 0.92, sofa, -2.06, 0.72, z, 0.11);
for (const z of [-2.62, -0.38]) rbox(apt, 0.95, 0.5, 0.22, sofaDark, -2.5, 0.42, z, 0.1);
rbox(apt, 0.12, 0.34, 0.34, 0xffb347, -2.2, 0.66, -2.3, 0.06).rotation.y = 0.3;
cyl(apt, 0.42, 0.045, darkWood, -3.6, 0.4, -1.5); for (const [dx, dz] of [[0.25, 0.25], [-0.25, 0.25], [0.25, -0.25], [-0.25, -0.25]]) cyl(apt, 0.025, 0.4, black, -3.6 + dx, 0.2, -1.5 + dz);
const cards = new THREE.Group(); apt.add(cards);
for (let i = 0; i < 5; i++) rbox(cards, 0.09, 0.006, 0.13, i % 2 ? 0xffffff : 0xd62839, -3.6 + (i - 2) * 0.05, 0.43 + i * 0.005, -1.5 + (i - 2) * 0.1, 0.002).rotation.y = i * 0.5;
const flyCard = rbox(cards, 0.09, 0.006, 0.13, 0xffffff, -3.6, 0.5, -1.5, 0.002);
// kitchenette
rbox(apt, 2.7, 0.9, 0.72, 0xf5f0e8, 1.1, 0.45, -3.2, 0.04); rbox(apt, 2.8, 0.06, 0.78, 0x2f2f36, 1.1, 0.93, -3.2, 0.02);
for (const x of [0.25, 1.1, 1.95]) rbox(apt, 0.04, 0.3, 0.03, 0xb0b0b0, x, 0.55, -2.83, 0.01);
rbox(apt, 2.7, 0.7, 0.4, 0xf5f0e8, 1.1, 2.55, -3.38, 0.04);
rbox(apt, 0.85, 1.95, 0.72, 0xdfe3e8, 3.0, 0.98, -3.2, 0.08); rbox(apt, 0.04, 0.6, 0.04, 0x9aa0a6, 2.68, 1.2, -2.82, 0.015);
for (const x of [0.6, 1.5]) cyl(apt, 0.2, 0.012, 0x111111, x, 0.966, -3.2);
const pot = new THREE.Group(); apt.add(pot);
cyl(pot, 0.2, 0.22, M(0x9aa5b1, { metalness: 0.6, roughness: 0.3 }), 0.6, 1.09, -3.2); cyl(pot, 0.21, 0.02, M(0x7d8792, { metalness: 0.6, roughness: 0.3 }), 0.6, 1.21, -3.2); ball(pot, 0.03, black, 0.6, 1.24, -3.2);
cyl(apt, 0.2, 0.04, black, 1.5, 0.995, -3.2); rbox(apt, 0.05, 0.03, 0.3, black, 1.5, 1.0, -2.88, 0.01);
cyl(apt, 0.11, 0.012, 0xffffff, 1.5, 1.022, -3.2); ball(apt, 0.05, 0xffc300, 1.5, 1.03, -3.2).scale.y = 0.5;
const steam = puffs(apt, 0.6, 1.3, -3.2, 0xffffff, { rise: 1.1, spread: 0.25, size: 0.08 });
const potTag = tag(apt, '', 'plain', 0.6, 2.05, -3.2, 16);
// bed
rbox(apt, 1.9, 0.3, 2.3, darkWood, 3.2, 0.17, 1.3, 0.06); rbox(apt, 1.78, 0.24, 2.18, 0xf4f1ea, 3.2, 0.42, 1.3, 0.1);
rbox(apt, 1.82, 0.16, 1.4, 0xb5179e, 3.2, 0.55, 1.72, 0.08); for (const x of [2.78, 3.62]) rbox(apt, 0.66, 0.16, 0.42, 0xffffff, x, 0.6, 0.5, 0.08);
rbox(apt, 1.9, 1.0, 0.14, darkWood, 3.2, 0.62, 0.12, 0.06);
const zzz = floaters(apt, 3.2, 1.3, 0.7, ['💤', '💤', '💤'], { rise: 1.4, spread: 0.4, rate: 0.22 });
const notes = floaters(apt, -4.5, 1.4, -1.5, ['🎵', '🎶', '🎵', '🎶', '🎵'], { rise: 1.8, spread: 0.8 });

/* ---- Bottle store (Street A, a short walk from the apartment). */
const store = place('store');
rbox(store, 5.2, 3.3, 3.8, 0xe0c9ae, 0, 1.65, 1.4, 0.15); rbox(store, 5.6, 0.35, 4.2, 0x8a1538, 0, 3.45, 1.4, 0.12);
const awning = rbox(store, 5.4, 0.08, 1.3, 0xb5243f, 0, 2.55, 3.8, 0.03); awning.rotation.x = 0.28;
rbox(store, 1.1, 2.05, 0.08, darkWood, 0, 1.03, 3.3, 0.03); for (const x of [-1.55, 1.55]) box(store, 1.4, 1.15, 0.06, lit(0xe8cf9a), x, 1.75, 3.31);
for (const [x, c] of [[-2.1, 0x9c6b3f], [-1.65, 0x8a5a33]]) rbox(store, 0.42, 0.34, 0.42, c, x, 0.17, 3.9, 0.03);
neon(store, 'Bottle Store', '#ff9aa9', 0, 4.2, 2.6, 34);

/* ---- The office (Street D, across town). */
const office = place('office');
rbox(office, 13.2, 0.3, 7.2, 0xa9b3bf, 0, -0.14, -0.4, 0.08);
box(office, 13.2, 3.7, 0.22, 0xb9c6d3, 0, 1.85, -3.95); box(office, 0.22, 3.7, 7.2, 0xa9b8c7, -6.6, 1.85, -0.4);
for (const x of [-3.6, 0, 3.6]) { box(office, 2.4, 1.5, 0.05, lit(0xcfe9ff), x, 2.2, -3.82); rbox(office, 2.6, 0.08, 0.1, 0xffffff, x, 3.0, -3.8, 0.02); rbox(office, 2.6, 0.08, 0.1, 0xffffff, x, 1.42, -3.8, 0.02); }
for (const x of [-3, 3]) box(office, 2.4, 0.05, 0.3, lit(0xfafafa), x, 3.55, -1.2);
cyl(office, 0.25, 0.45, 0xd9825b, -5.8, 0.22, 2.2, 0.3); mesh(office, new THREE.IcosahedronGeometry(0.5, 1), M(0x3f8f5a), -5.8, 1.0, 2.2);
neon(office, STORY.workplace, '#8ecbff', 0, 4.4, -3.8, 50);
const staff = [];
[-4.2, -1.6, 1, 3.6].forEach((x, i) => {
  rbox(office, 1.75, 0.07, 0.9, 0xd8c3a5, x, 0.76, -1.2, 0.03); for (const dx of [-0.78, 0.78]) rbox(office, 0.06, 0.74, 0.8, 0x9099a2, x + dx, 0.37, -1.2, 0.02);
  rbox(office, 0.68, 0.42, 0.045, black, x, 1.16, -0.98, 0.02); cyl(office, 0.025, 0.2, black, x, 0.9, -0.98); cyl(office, 0.13, 0.02, black, x, 0.805, -0.98);
  rbox(office, 0.52, 0.1, 0.52, 0x2a2b36, x, 0.47, -2.0, 0.05); rbox(office, 0.5, 0.62, 0.1, 0x2a2b36, x, 0.82, -2.26, 0.05); cyl(office, 0.035, 0.4, 0x777777, x, 0.22, -2.0);
  if (i === 3) return; // the empty desk at the far end
  const p = i === 0 ? person({ skin: 0xf1c9a5, top: 0x3a506b, hair: 0xd9b36c, style: 'long', h: 1.68 }) : person({ skin: pick(SKINS, i + 2), top: pick(TOPS, i + 3), style: i === 1 ? 'bun' : 'fade', h: 1.7 });
  p.g.position.set(O.office[0] + x, 0, O.office[1] - 2.0);
  staff.push(p);
});
tag(staff[0].g, 'Manager', 'plain', 0, 2.2, 0, 26);
const officeLight = new THREE.PointLight(0xffffff, 10, 16); officeLight.position.set(0, 3.2, -1); office.add(officeLight);

/* ---- The clubs. Drama and Ekhaya share Street B; Blue Room is on Street C. */
function club(key, name, color, color2, note) {
  const g = place(key), cx = O[key][0], cz = O[key][1];
  rbox(g, 9.6, 0.3, 6.6, 0x17131f, 0, -0.14, 0.4, 0.08); box(g, 9.6, 4.3, 0.25, 0x1d1729, 0, 2.15, -2.8);
  for (const x of [-4.7, 4.7]) { box(g, 0.25, 4.3, 3, 0x1d1729, x, 2.15, -1.4); cyl(g, 0.06, 4.3, lit(color), x, 2.15, 0.14); }
  cyl(g, 0.06, 9.4, lit(color), 0, 4.3, -2.62).rotation.z = PI / 2; cyl(g, 0.04, 9.4, lit(color2), 0, 3.95, -2.62).rotation.z = PI / 2;
  neon(g, name, '#' + color.toString(16).padStart(6, '0'), 0, 5.1, -2.6, 46);
  tag(g, note, 'plain', 0, 6.0, -2.6, 26);
  const tiles = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) tiles.push(rbox(g, 1.15, 0.04, 1.15, new THREE.MeshBasicMaterial({ color }), (i - 2) * 1.25, 0.03, j * 1.25 - 0.4, 0.015));
  const disco = mesh(g, new THREE.IcosahedronGeometry(0.42, 1), M(0xdddddd, { metalness: 1, roughness: 0.15, flatShading: true }), 0, 3.5, 0.6);
  cyl(g, 0.012, 0.8, 0x888888, 0, 4.25, 0.6);
  rbox(g, 3.1, 1.05, 0.65, 0x3a2a4d, 2.8, 0.55, -2.1, 0.08); rbox(g, 3.2, 0.06, 0.75, lit(color2), 2.8, 1.1, -2.1, 0.02);
  for (let i = 0; i < 3; i++) { cyl(g, 0.17, 0.05, 0x241b33, 1.9 + i * 0.9, 0.72, -1.35); cyl(g, 0.03, 0.7, 0x888888, 1.9 + i * 0.9, 0.35, -1.35); }
  rbox(g, 3.1, 0.05, 0.25, 0x3a2a4d, 2.8, 1.75, -2.6, 0.02);
  for (let i = 0; i < 7; i++) cyl(g, 0.05, 0.3, pick([0x9be36b, 0xf2b632, 0x8a1538, 0xffffff], i), 1.6 + i * 0.4, 1.93, -2.6, 0.03);
  rbox(g, 2.3, 1.05, 0.75, 0x241b33, -2.9, 0.55, -2.0, 0.08); rbox(g, 1.2, 0.06, 0.5, 0x0e0b14, -2.9, 1.12, -2.0, 0.02);
  for (const x of [-3.2, -2.6]) cyl(g, 0.16, 0.02, 0x111111, x, 1.16, -2.0);
  const speakers = [-4.15, -1.65].map((x) => { rbox(g, 0.85, 1.75, 0.75, 0x0e0b14, x, 0.9, -2.0, 0.08); cyl(g, 0.16, 0.04, lit(color), x, 1.45, -1.61).rotation.x = PI / 2; const s = cyl(g, 0.28, 0.05, lit(color2), x, 0.75, -1.61); s.rotation.x = PI / 2; return s; });
  const dj = person({ skin: pick(SKINS, cx), top: 0xf8f8f8, h: 1.75, style: 'afro' }); dj.g.position.set(cx - 2.9, 0, cz - 2.65);
  const crowd = [];
  for (let i = 0; i < 9; i++) {
    const p = person({ skin: pick(SKINS, i + cx), top: pick(TOPS, i * 3 + cx), style: pick(['bun', 'fade', 'afro'], i), dress: i % 2 === 0, h: 1.55 + (i % 4) * 0.07 });
    let x, z; do { x = -3.8 + Math.random() * 7.6; z = -1.1 + Math.random() * 3.6; } while ((Math.abs(x) < 1.5 && z > 0.2) || (x > 2 && z > 1.2));
    p.g.position.set(cx + x, 0, cz + z); p.g.rotation.y = (Math.random() - 0.5) * 1.6;
    if (i % 3 === 0) hold(p.item, i % 2 ? 'cider' : 'beer');
    crowd.push(p);
  }
  cyl(g, 0.4, 0.5, 0x2a1f18, 3.4, 0.25, 2.3); cyl(g, 0.13, 0.26, M(color, { roughness: 0.2 }), 3.4, 0.63, 2.3, 0.08); cyl(g, 0.022, 0.6, M(0xd0d0d0, { metalness: 0.8, roughness: 0.3 }), 3.4, 1.05, 2.3); cyl(g, 0.07, 0.08, 0xc0392b, 3.4, 1.38, 2.3, 0.09);
  puffs(g, 3.4, 1.45, 2.3, 0xffffff, { rise: 1.8, spread: 0.6, size: 0.13, rate: 0.28 });
  const l1 = new THREE.PointLight(color, 0, 14), l2 = new THREE.PointLight(color2, 0, 14); g.add(l1, l2);
  return { key, tiles, speakers, disco, dj, crowd, l1, l2, color: new THREE.Color(color), color2: new THREE.Color(color2) };
}
const clubs = [
  club('drama', 'Drama', 0xff2fa0, 0x7b2ff7, 'closes 02:00'),
  club('ekhaya', 'Ekhaya', 0xff8c1a, 0xffe14d, 'closes 02:00'),
  club('blue', 'Blue Room', 0x2f8bff, 0x35f0ff, 'near Arcadia St · open till 04:00'),
];

/* ---- Late-night burger stop (Street C, near Blue Room). */
const burger = place('burger');
rbox(burger, 5.2, 3.1, 3.8, 0xc9b79c, 0, 1.55, 1.4, 0.15); rbox(burger, 5.6, 0.3, 4.2, 0xd62828, 0, 3.25, 1.4, 0.12);
rbox(burger, 5.4, 0.08, 1.3, 0xffc300, 0, 2.5, 3.8, 0.03).rotation.x = 0.28;
box(burger, 2.4, 1.0, 0.06, lit(0xa88a45), 0, 1.7, 3.31); rbox(burger, 2.8, 0.08, 0.55, 0xb8b8b8, 0, 1.15, 3.5, 0.02);
rbox(burger, 1.0, 0.7, 0.06, lit(0x7a6a3a), 1.9, 1.9, 3.31, 0.02);
neon(burger, 'Burgers · 24h', '#ffd23f', 0, 4.0, 2.6, 34);

/* ---- The Uber. */
const car = new THREE.Group(); scene.add(car);
const carPaint = M(0xf5f5f5, { roughness: 0.25, metalness: 0.3 });
rbox(car, 3.7, 0.62, 1.65, carPaint, 0, 0.62, 0, 0.22); rbox(car, 2.1, 0.58, 1.5, M(0x1c2733, { roughness: 0.1, metalness: 0.5 }), -0.15, 1.15, 0, 0.24); rbox(car, 1.9, 0.06, 1.42, carPaint, -0.15, 1.44, 0, 0.03);
for (const [x, z] of [[-1.15, 0.8], [1.15, 0.8], [-1.15, -0.8], [1.15, -0.8]]) { const w = cyl(car, 0.33, 0.24, 0x111111, x, 0.33, z); w.rotation.x = PI / 2; cyl(car, 0.16, 0.25, 0xbfbfbf, x, 0.33, z).rotation.x = PI / 2; }
for (const z of [-0.55, 0.55]) { rbox(car, 0.08, 0.14, 0.32, lit(0xfff6cc), 1.83, 0.7, z, 0.03); rbox(car, 0.08, 0.12, 0.3, lit(0xc21f1f), -1.83, 0.72, z, 0.03); }
const carLight = new THREE.PointLight(0xfff0c0, 0, 12); carLight.position.set(3, 0.8, 0); car.add(carLight);
tag(car, 'Uber', 'plain', 0, 2.2, 0, 40);
let carRot = 0;
function drive(path, k) {
  const p = along(path, k);
  car.visible = true; car.position.set(p.x, 0, p.z);
  let d = p.rot - PI / 2 - carRot; d = Math.atan2(Math.sin(d), Math.cos(d));
  carRot += d * 0.2; car.rotation.y = carRot;
  return p;
}

/* ------------------------------------------------------------------ chapters */

const DESK = [-3.78, -1.5, -PI / 2], SOFA_ME = [-2.6, -1.98, -PI / 2], SOFA_GF = [-2.6, -1.02, -PI / 2];
const DOOR = [1, 2.8], CURB = [1, 4.1];
const follow = (a, cut = 0, dx = 4, dy = 3.4, dz = 9.5) => [a.g.position.x + dx, dy, a.g.position.z + dz, a.g.position.x, 1.2, a.g.position.z - 0.5, cut];
const chase = (p, cut = 0) => [p.x + 9, 6, p.z + 16, p.x - 1, 0.8, p.z - 1, cut];
const orbit = (c, t, amt = 0.35) => [c[0] + Math.sin(t * 0.25) * amt, c[1] + Math.sin(t * 0.2) * amt * 0.4, c[2] + Math.cos(t * 0.25) * amt, c[3], c[4], c[5], c[6] || 0];
const state = { music: false, lampOn: true, eggs: false };
const gfHome = (t, say = '') => { put(gf, ...SOFA_ME, 'sit', t); gf.say = say; };
const inBed = () => { me.g.position.set(2.82, 0, 2.3); me.g.rotation.y = 0; pose(me, 'lie'); gf.g.position.set(3.6, 0, 2.25); gf.g.rotation.y = 0; pose(gf, 'lie'); };

function onTheFloor(c, t, drinks, hubbly) {
  state.music = true;
  hold(me.item, 'beer'); hold(gf.item, 'cider');
  if (hubbly) {
    put(me, ...W(c.key, 2.5, 2.4), PI / 2, 'groove', t); put(gf, ...W(c.key, 4.3, 2.4), -PI / 2, 'groove', t);
    me.say = '💨 hubbly'; gf.say = drinks[1];
    return orbit(camAt6(c.key, [5.5, 2.6, 7.2, 3.2, 1.3, 1.6], 3), t);
  }
  put(me, ...W(c.key, -0.7, 1.3), 0.2, 'groove', t); put(gf, ...W(c.key, 0.5, 1.5), -0.2, 'dance', t);
  me.say = drinks[0]; gf.say = drinks[1];
  return orbit(camAt6(c.key, [1.5, 3.4, 10.5, 0, 1.4, 0.2], 2), t, 0.9);
}
function stroll(path, k, t, cut) { walk(me, path, k, t); walk(gf, shift(path, 0.9, 0.25), k, t); return follow(me, cut, 3.5, 3.3, 10); }

const TO_WORK = [[2, 6.6], [-22, 6.6], [-22, -103.4], [-38.5, -103.4]];
const TO_HOME = [[86, -93.4], [62, -93.4], [62, -43.4], [22, -43.4], [22, 6.6], [3, 6.6]];

const chapters = [
  { day: 'Hatfield', from: 8.5, to: 9, dur: 9, title: 'Hatfield, Pretoria',
    text: 'A studio apartment, a couple in their twenties, and a week with a rhythm of its own.',
    run(k, t) { put(me, -0.5, 1.2, 0.45, 'wave', t); put(gf, 0.45, 1.35, 0.3, 'wave', t + 1); return mix([17, 14, 27, 0, 1, 0, 0], [7.5, 5.2, 9.5, -1, 1.1, -0.6, 0], ease(clamp01(k * 1.4))); } },

  { day: 'Remote day', from: 9, to: 17, dur: 13, title: 'Nine to five, from the apartment',
    text: 'Two 27-inch Dell monitors, an HP ZBook for work beside a personal Dell, and a JBL soundbar playing live amapiano and 3-step mixes all day.',
    run(k, t) { put(me, ...DESK, 'type', t); me.say = k < 0.5 ? '💻' : '🎧'; gfHome(t, k > 0.6 ? '📱' : ''); state.music = true; return orbit(mix([1.2, 3.4, 3.6, -3.6, 1, -1.5], [-1.6, 3.0, 1.3, -4.4, 1.05, -1.5], ease(k)), t, 0.2); } },

  { day: 'Office day', from: 8.2, to: 17, dur: 16, title: `Across town to ${STORY.workplace}`,
    text: 'Eight days a month it is an Uber to the office, on a different side of town. After a late night, red eyes pick the desk furthest from the manager.',
    run(k, t) {
      gfHome(t);
      if (k < 0.42) { me.g.visible = false; return chase(drive(TO_WORK, ease(k / 0.42)), 0); }
      put(me, ...W('office', 3.6, -2.0), 0, 'type', t); me.eyeMat.color.setHex(0xff5a5a);
      me.say = k < 0.7 ? '🥴' : '👀';
      return k < 0.7 ? orbit(camAt6('office', [1.5, 4.2, 7.5, -0.2, 1.1, -1.6], 1), t) : orbit(camAt6('office', [5.0, 2.2, 1.6, 3.4, 1.25, -1.9], 2), t, 0.15);
    } },

  { day: 'Every evening', from: 17.5, to: 18.4, dur: 12, title: 'The wine run',
    text: 'A walk down the street to the bottle store for two bottles of Robertson: a sweet red for her, a dry white for him.',
    run(k, t) {
      gfHome(t);
      const path = [DOOR, CURB, [12, 4.1], [12, 3.75]];
      if (k < 0.42) walk(me, path, k / 0.42, t);
      else if (k < 0.58) { put(me, 12, 3.75, PI, 'stand', t); me.say = '🍷 sweet red · 🥂 dry white'; }
      else { walk(me, [...path].reverse(), (k - 0.58) / 0.42, t, 'carry'); hold(me.item, 'bottleWhite'); hold(me.itemL, 'bottleRed'); me.say = 'Robertson × 2'; }
      return follow(me, 0, 3.5, 3.2, 9.5);
    } },

  { day: 'Every evening', from: 19, to: 20.5, dur: 11, title: '7pm: cooking',
    text: 'Pap and chicken, rice and chicken, wors, or beef. It depends on the day.',
    run(k, t) { put(me, 1.55, -2.42, PI, 'stir', t); put(gf, 0.6, -2.42, PI, 'stir', t + 1); steam.on = true; potTag.element.textContent = ['🍗 pap & chicken', '🍚 rice & chicken', '🌭 wors', '🥩 beef'][Math.min(3, Math.floor(k * 4))]; return orbit([3.9, 3.0, 1.2, 1.0, 1.15, -3], t, 0.3); } },

  { day: 'Every evening', from: 21, to: 24.6, dur: 14, title: 'Wine, cards and the mix',
    text: 'After dinner: the couch, the wine, a deck of cards, and the groove mix on the monitors until midnight or 1am.',
    run(k, t) {
      chair.position.set(-4.0, 0, -3.05);
      put(me, ...SOFA_ME, 'sip', t); put(gf, ...SOFA_GF, 'sip', t + 2.5);
      hold(me.item, 'wineWhite'); hold(gf.item, 'wineRed');
      cards.visible = true; state.music = true;
      const u = (t * 0.45) % 1, flip = Math.floor(t * 0.45) % 2;
      flyCard.position.set(-3.6 + Math.sin(u * PI) * 0.5, 0.48 + Math.sin(u * PI) * 0.35, lerp(-1.85, -1.1, flip ? u : 1 - u)); flyCard.rotation.z = u * PI * 2;
      (flip ? me : gf).say = '🃏';
      return orbit(mix([-0.2, 2.9, 3.4, -3.3, 0.9, -1.5], [-4.7, 3.1, 2.0, -2.9, 0.95, -1.5], ease(k)), t, 0.2);
    } },

  { day: 'Late', from: 24.8, to: 31, dur: 8, title: 'Lights out',
    text: 'Bedtime depends on whether tomorrow is an office day.',
    run(k, t) { state.lampOn = false; chair.position.set(-4.0, 0, -3.05); inBed(); zzz.on = true; return orbit([7.2, 3.8, 6, 3.2, 0.6, 1.2], t, 0.3); } },

  { day: 'Saturday night', from: 21.5, to: 23.75, dur: 16, title: 'Groove: Drama',
    text: 'Weekends mean groove, and it is close enough to walk: out of their street and over to the next. First stop, Drama. Stella Artois draught for him; Bernini, Extreme or Flying Fish for her.',
    run(k, t) {
      if (k < 0.13) return stroll([DOOR, CURB, [15, 4.1]], k / 0.13, t, 0);
      if (k < 0.3) return stroll([W('drama', -9, 4.3), W('drama', -0.7, 4.3), W('drama', -0.7, 1.3)], (k - 0.13) / 0.17, t, 1);
      return onTheFloor(clubs[0], t, ['🍺 Stella draught', '🍾 Bernini']);
    } },

  { day: 'Saturday night', from: 23.75, to: 26, dur: 14, title: 'Ekhaya, a few doors down',
    text: 'Same street, next venue. Hubbly on the table, music up, and a crowd having a good time. Both places close at 2am.',
    run(k, t) {
      if (k < 0.2) return stroll([W('drama', -0.7, 1.3), W('drama', -0.7, 4.3), W('ekhaya', -0.7, 4.3), W('ekhaya', -0.7, 1.3)], k / 0.2, t, 0);
      return onTheFloor(clubs[1], t, ['🍺 draught', '🐟 Flying Fish'], k > 0.62);
    } },

  { day: 'Sunday, early', from: 26, to: 28, dur: 15, title: 'Blue Room till 4',
    text: 'When those two close, the night moves to a different street: Blue Room, over by Arcadia Street, open until 4am.',
    run(k, t) {
      if (k < 0.14) return stroll([W('ekhaya', 2.5, 2.4), W('ekhaya', 2.5, 4.3), W('ekhaya', 12, 4.3)], k / 0.14, t, 0);
      if (k < 0.3) return stroll([W('blue', -9, 4.3), W('blue', -0.7, 4.3), W('blue', -0.7, 1.3)], (k - 0.14) / 0.16, t, 1);
      return onTheFloor(clubs[2], t, ['🍺 last one', '⚡ Extreme']);
    } },

  { day: 'Sunday, early', from: 28, to: 28.4, dur: 10, title: 'The 4am stop',
    text: 'On the way out, McDonald\'s: a mini burger, chips and six nuggets.',
    run(k, t) {
      if (k < 0.4) return stroll([W('blue', -0.7, 1.3), W('blue', -0.7, 4.3), W('burger', -0.8, 4.3)], k / 0.4, t, 0);
      put(me, ...W('burger', -0.8, 4.3), PI, 'stand', t); put(gf, ...W('burger', 0.4, 4.1), PI, 'stand', t); hold(gf.item, 'bag');
      gf.say = '🍔 mini burger · 🍟 chips · 6 nuggets'; me.say = k > 0.7 ? '🚕 2 min' : '';
      return orbit(camAt6('burger', [3.5, 3.2, 10.5, -0.2, 1.4, 3.4], 1), t, 0.3);
    } },

  { day: 'Sunday, early', from: 28.4, to: 28.8, dur: 10, title: 'Uber home',
    text: 'No car, so it is an Uber back across to the apartment.',
    run(k) { me.g.visible = gf.g.visible = false; return chase(drive(TO_HOME, ease(k)), 0); } },

  { day: 'Sunday', from: 11.5, to: 13.5, dur: 12, title: 'The morning after',
    text: 'Hungover, and breakfast is long gone. Lunch is eggs.',
    run(k, t) {
      if (k < 0.4) { inBed(); me.say = '🤕'; gf.say = '😵‍💫'; return orbit([7.2, 3.8, 6, 3.2, 0.6, 1.2, 0], t, 0.3); }
      put(me, 1.5, -2.42, PI, 'stir', t); put(gf, ...SOFA_GF, 'sit', t); gf.say = '🤕'; me.say = '🍳'; state.eggs = true;
      return orbit([4.0, 2.8, 1.0, 1.2, 1.15, -3, 1], t, 0.3);
    } },
];

/* ------------------------------------------------------------------ HUD + playback */

let idx = 0, chT = 0, playing = true;
$('#dots').innerHTML = chapters.map((c, i) => `<button data-go="${i}" title="${c.title}"><i></i></button>`).join('');
const dotEls = [...$('#dots').children];
function go(i) {
  idx = (i + chapters.length) % chapters.length; chT = 0;
  const c = chapters[idx];
  $('#title').textContent = c.title; $('#text').textContent = c.text; $('#day').textContent = c.day;
  dotEls.forEach((d, j) => { d.className = j < idx ? 'done' : ''; d.firstChild.style.width = '0'; });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.go) go(+b.dataset.go);
  else if (b.id === 'prev') go(idx - 1);
  else if (b.id === 'next') go(idx + 1);
  else if (b.id === 'play') { playing = !playing; b.textContent = playing ? '⏸' : '▶'; }
  else if (b.id === 'sound') { toggleSound(); b.classList.toggle('on', audioOn); }
});
addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(idx + 1); if (e.key === 'ArrowLeft') go(idx - 1); if (e.key === ' ') $('#play').click(); });

/* ------------------------------------------------------------------ sound: an original amapiano-style loop */

let actx, master, audioOn = false, nextNote = 0, stepI = 0, timer;
const LOG = { 0: 55, 3: 55, 6: 65.4, 10: 55, 14: 49, 16: 55, 19: 55, 22: 73.4, 26: 65.4, 30: 49 };
function shaker(t, vol) {
  const n = actx.createBufferSource(), len = actx.sampleRate * 0.05, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  n.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
  const g = actx.createGain(); g.gain.value = vol;
  n.connect(f).connect(g).connect(master); n.start(t);
}
function logDrum(t, freq) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq * 2.4, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.09);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.45);
}
function chord(t) {
  for (const f of [220, 261.6, 329.6, 392]) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g).connect(master); o.start(t); o.stop(t + 0.55); }
}
function schedule() {
  while (nextNote < actx.currentTime + 0.15) {
    shaker(nextNote, stepI % 2 ? 0.05 : 0.11);
    if (LOG[stepI]) logDrum(nextNote, LOG[stepI]);
    if (stepI % 16 === 4 || stepI % 16 === 11) chord(nextNote);
    nextNote += 60 / 113 / 4; stepI = (stepI + 1) % 32;
  }
}
function toggleSound() {
  audioOn = !audioOn;
  if (audioOn) {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (!master) { master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination); }
    actx.resume(); nextNote = actx.currentTime + 0.05; timer = setInterval(schedule, 40);
  } else { clearInterval(timer); actx.suspend(); }
}

/* ------------------------------------------------------------------ the loop */

const camPos = new THREE.Vector3(17, 14, 27), camLook = new THREE.Vector3(0, 1, 0), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3(), tmpV = new THREE.Vector3();
const SKY = { night: new THREE.Color(0x0a0718), day: new THREE.Color(0x8fc7ff), dusk: new THREE.Color(0xff9e6d) }, sky = new THREE.Color(), white = new THREE.Color(0xffffff);
const clock = new THREE.Clock();
let lastCut = '';
go(0);
window.__life = { go, seek: (k) => { chT = k * chapters[idx].dur; } }; // handy for jumping around while editing

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  if (playing) chT += dt;
  const ch = chapters[idx], k = clamp01(chT / ch.dur);

  // Defaults for this frame; the chapter then overrides what it needs.
  for (const a of [me, gf]) { a.g.visible = true; a.say = ''; a.item.visible = a.itemL.visible = false; }
  me.eyeMat.color.setHex(0xffffff);
  chair.position.set(-3.78, 0, -1.5);
  car.visible = cards.visible = false;
  steam.on = zzz.on = false; state.music = false; state.lampOn = true; state.eggs = false;
  potTag.element.textContent = '';

  const want = ch.run(k, t);
  const narrow = innerWidth / innerHeight < 0.8 ? 1.55 : 1;
  wantLook.set(want[3], want[4], want[5]);
  wantPos.set(want[0], want[1], want[2]).sub(wantLook).multiplyScalar(narrow).add(wantLook);
  const cutKey = idx + ':' + (want[6] || 0);
  const f = cutKey !== lastCut ? 1 : 1 - Math.exp(-dt * 2.6);
  lastCut = cutKey;
  camPos.lerp(wantPos, f); camLook.lerp(wantLook, f);
  camera.position.copy(camPos); camera.lookAt(camLook);
  fill.position.copy(camPos).lerp(camLook, 0.35); fill.position.y += 1.2;
  sun.target.position.copy(camLook); sun.position.copy(camLook).add(tmpV.set(16, 30, 14));

  for (const a of [me, gf]) { if (a.say !== a.said) { a.said = a.say; a.bubble.element.textContent = a.say; } a.bubble.userData.on = !!a.say; }
  potTag.userData.on = !!potTag.element.textContent;
  pot.visible = !state.eggs;
  notes.on = state.music && idx < 7;

  // Clock, sky and light follow the time of day.
  const hour = lerp(ch.from, ch.to, k) % 24;
  $('#clock').textContent = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
  dotEls[idx].firstChild.style.width = `${k * 100}%`;
  const dayAmt = clamp01((hour - 5.5) / 1.5) * clamp01((19.5 - hour) / 1.5);
  const duskAmt = Math.max(0, 1 - Math.abs(hour - 18.6) / 1.4, 1 - Math.abs(hour - 6.2) / 1.0);
  sky.copy(SKY.night).lerp(SKY.day, dayAmt).lerp(SKY.dusk, duskAmt * 0.55);
  scene.background.copy(sky); scene.fog.color.copy(sky);
  const night = 1 - dayAmt;
  hemi.intensity = lerp(0.75, 1.5, dayAmt); hemi.color.setHex(night > 0.5 ? 0x9aa4ff : 0xffffff);
  sun.intensity = lerp(0.12, 2.6, dayAmt); sun.color.setHex(duskAmt > 0.3 ? 0xffc89a : 0xfff0d8);
  stars.material.opacity = night; bloom.strength = lerp(0.28, 0.8, night);
  towerMats.forEach((m) => (m.emissiveIntensity = night * 0.9));
  windowPane.material.color.copy(sky).lerp(white, 0.25);
  lamp.intensity = state.lampOn ? lerp(3, 26, night) : 1.2;
  shade.material.color.setHex(state.lampOn && night > 0.3 ? 0xd9b98a : 0x6b5a45);
  officeLight.intensity = lerp(18, 5, dayAmt);
  carLight.intensity = car.visible ? night * 60 : 0;

  // Music makes the screens, soundbar and clubs move.
  const beat = Math.abs(Math.sin(t * 5.9));
  screens.forEach((s, i) => s.material.color.setHSL(state.music ? (t * 0.08 + i * 0.12) % 1 : 0.6, state.music ? 0.8 : 0.5, state.music ? 0.35 + beat * 0.2 : 0.32));
  sbLight.scale.z = state.music ? 0.3 + beat * 0.7 : 0.15;
  soundbar.scale.y = state.music ? 1 + beat * 0.15 : 1;
  clubs.forEach((c, ci) => {
    const on = night > 0.5;
    c.tiles.forEach((tile, i) => tile.material.color.copy((Math.floor(t * 2.95) + i + ((i / 3) | 0)) % 2 ? c.color : c.color2).multiplyScalar(on ? 0.9 : 0.25));
    c.speakers.forEach((s) => s.scale.setScalar(1 + beat * 0.25));
    c.disco.rotation.y = t * 0.8;
    c.l1.intensity = c.l2.intensity = on ? 60 : 0;
    c.l1.position.set(Math.sin(t * 1.3 + ci) * 3.5, 3.2, Math.cos(t * 1.1) * 2); c.l2.position.set(Math.cos(t * 0.9 + ci) * 3.5, 3.2, Math.sin(t * 1.4) * 2);
    pose(c.dj, 'dance', t);
    c.crowd.forEach((p, i) => pose(p, i % 3 === 0 ? 'groove' : 'dance', t));
  });
  staff.forEach((p) => pose(p, 'type', t));

  loops.forEach((e) => e.update(t));
  for (const { o, far } of tags) { let shown = o.userData.on !== false; for (let p = o.parent; p && shown; p = p.parent) shown = p.visible; o.visible = shown && o.getWorldPosition(tmpV).distanceTo(camera.position) < far; }

  composer.render();
  labels.render(scene, camera);
  if (playing && k >= 1) go(idx + 1);
});
