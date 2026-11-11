// A Week in Hatfield — a 3D animated life routine.
// One small world (apartment, street, office, three clubs, a burger stop) and a list of
// chapters. Each chapter says where everyone is, what the clock reads and where the camera sits.

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Story details that are easy to change in one place.
const STORY = { workplace: 'the IT Hub', officeSign: 'IT Hub', birthday: { month: 11, day: 21 }, turning: 27 };

const $ = (s) => document.querySelector(s);
const PI = Math.PI;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.min(Math.max(k, 0), 1);
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

/* ------------------------------------------------------------------ renderer */

const stage = $('#stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch {
  stage.innerHTML = '<div class="fallback">This animation needs WebGL, which is not available in this browser.</div>';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
labels.domElement.className = 'labels';
document.body.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc7ff);
scene.fog = new THREE.Fog(0x8fc7ff, 40, 120);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 400);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
});

const ambient = new THREE.AmbientLight(0xffffff, 1.6);
const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
sun.position.set(20, 30, 18);
scene.add(ambient, sun);

/* ------------------------------------------------------------------ building blocks */

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const lit = (color) => new THREE.MeshBasicMaterial({ color });
const asMat = (c) => (typeof c === 'number' ? mat(c) : c);
function box(parent, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), asMat(color));
  m.position.set(x, y, z); parent.add(m); return m;
}
function cyl(parent, r, h, color, x, y, z, r2 = r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, 20), asMat(color));
  m.position.set(x, y, z); parent.add(m); return m;
}
function ball(parent, r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), asMat(color));
  m.position.set(x, y, z); parent.add(m); return m;
}
const tags = [];
function tag(parent, html, cls, x, y, z, far = 45) {
  const el = document.createElement('div');
  el.className = cls; el.innerHTML = html;
  const o = new CSS2DObject(el);
  o.position.set(x, y, z); parent.add(o);
  tags.push({ o, far });
  return o;
}

// Things that loop on their own: smoke, steam, floating notes.
const loops = [];
function puffs(parent, x, y, z, color, { n = 7, rise = 1.6, spread = 0.4, size = 0.12, rate = 0.35 } = {}) {
  const list = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false }));
    parent.add(m); return m;
  });
  const e = { on: true, update(t) {
    list.forEach((m, i) => {
      const u = (t * rate + i / n) % 1;
      m.visible = e.on;
      m.position.set(x + Math.sin(i * 2.4 + u * 4) * spread * u, y + u * rise, z + Math.cos(i * 1.7 + u * 3) * spread * u);
      m.scale.setScalar(0.5 + u * 1.8);
      m.material.opacity = 0.4 * (1 - u);
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

let phase = 0;
function person({ skin, top, bottom = 0x23232e, shoes = 0xf4f4f4, hair = 0x14100e, style = 'fade', h = 1.7 }) {
  const g = new THREE.Group(), root = new THREE.Group();
  g.add(root);
  root.scale.setScalar(h / 1.7);
  const mSkin = mat(skin), mTop = mat(top), mBot = mat(bottom), mHair = mat(hair);
  const leg = (x) => { const p = new THREE.Group(); p.position.set(x, 0.78, 0); box(p, 0.17, 0.78, 0.2, mBot, 0, -0.39, 0); box(p, 0.18, 0.09, 0.3, mat(shoes), 0, -0.75, 0.05); root.add(p); return p; };
  const arm = (x) => { const p = new THREE.Group(); p.position.set(x, 1.36, 0); box(p, 0.13, 0.5, 0.14, mTop, 0, -0.25, 0); ball(p, 0.075, mSkin, 0, -0.55, 0); root.add(p); return p; };
  const legL = leg(-0.12), legR = leg(0.12), armL = arm(-0.32), armR = arm(0.32);
  box(root, 0.5, 0.62, 0.28, mTop, 0, 1.09, 0);
  ball(root, 0.21, mSkin, 0, 1.6, 0);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of [-0.08, 0.08]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), eyeMat); e.position.set(x, 1.63, 0.185); root.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), lit(0x111111)); p.position.set(x, 1.63, 0.216); root.add(p);
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 18, 10, 0, PI * 2, 0, PI / 2), mHair);
  cap.position.set(0, 1.64, -0.02); cap.rotation.x = -0.3; root.add(cap);
  if (style === 'bun') { ball(root, 0.12, mHair, 0, 1.9, -0.06); box(root, 0.36, 0.3, 0.12, mHair, 0, 1.52, -0.17); }
  if (style === 'long') box(root, 0.38, 0.5, 0.12, mHair, 0, 1.45, -0.17);
  const item = (p) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.2, 10), mat(0xffffff)); m.position.set(0, -0.62, 0.08); m.visible = false; p.add(m); return m; };
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  blob.rotation.x = -PI / 2; blob.position.y = 0.02; g.add(blob);
  scene.add(g);
  return { g, root, legL, legR, armL, armR, eyeMat, item: item(armR), itemL: item(armL), ph: (phase += 1.7), say: '', said: null };
}

function pose(a, name, t = 0) {
  const { root, legL, legR, armL, armR } = a;
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
  for (const p of [legL, legR, armL, armR]) p.rotation.set(0, 0, 0);
  const sit = () => { legL.rotation.x = legR.rotation.x = -PI / 2; root.position.y = -0.3; };
  const b = t * 5.9 + a.ph;
  switch (name) {
    case 'walk': { const s = Math.sin(t * 9 + a.ph); legL.rotation.x = s * 0.6; legR.rotation.x = -s * 0.6; armL.rotation.x = -s * 0.5; armR.rotation.x = s * 0.5; root.position.y = Math.abs(Math.cos(t * 9 + a.ph)) * 0.04; break; }
    case 'carry': { const s = Math.sin(t * 9 + a.ph); legL.rotation.x = s * 0.6; legR.rotation.x = -s * 0.6; armL.rotation.x = armR.rotation.x = -0.5; break; }
    case 'sit': sit(); break;
    case 'type': sit(); armL.rotation.x = -1.15 + Math.sin(t * 15) * 0.07; armR.rotation.x = -1.15 + Math.cos(t * 13) * 0.07; break;
    case 'sip': sit(); armL.rotation.x = -0.5; armR.rotation.x = -1.2 - Math.max(0, Math.sin(t * 1.1 + a.ph)) * 0.9; break;
    case 'lie': root.rotation.x = -PI / 2; root.position.y = 0.6; break;
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
const HELD = {
  beer: [0xf2b632, 1.3, 0.9], cider: [0x9be36b, 0.8, 1.4], wineWhite: [0xf3e7a4, 0.9, 0.8], wineRed: [0x8a1538, 0.9, 0.8],
  bottleRed: [0x5c0f26, 0.9, 1.9], bottleWhite: [0xd9d28a, 0.9, 1.9], bag: [0xc98a3c, 2.2, 1.3],
};
function hold(itemMesh, kind) { const [c, w, h] = HELD[kind]; itemMesh.visible = true; itemMesh.material.color.setHex(c); itemMesh.scale.set(w, h, w); }

const SKINS = [0x5a3620, 0x6b4226, 0x7a4a2b, 0x8a5a3a, 0x4a2c1a];
const TOPS = [0xff5fa2, 0x5ee6ff, 0xffd166, 0xa78bfa, 0x06d6a0, 0xf8f8f8, 0xef476f, 0x118ab2];
const pick = (list, i) => list[i % list.length];

const me = person({ skin: 0x6b4226, top: 0x1fb6a6, bottom: 0x1c1f2b, h: 1.73 });
const gf = person({ skin: 0x7a4a2b, top: 0xff5fa2, bottom: 0x2a2140, style: 'bun', h: 1.57 });
tag(me.g, 'Me', 'who', 0, 2.05, 0, 30);
tag(gf.g, 'My girl', 'who her', 0, 1.9, 0, 30);
for (const a of [me, gf]) a.bubble = tag(a.g, '', 'say', 0, 2.35, 0, 40);

/* ------------------------------------------------------------------ the world */

const ground = box(scene, 400, 0.2, 200, 0x5d7a55, 10, -0.1, -20);
box(scene, 160, 0.04, 3.6, 0x2b2b33, 12, 0.02, 6.6); // road
box(scene, 160, 0.08, 1.4, 0xb9b2a6, 12, 0.04, 4.3); // pavement
for (let x = -64; x < 90; x += 4) box(scene, 1.6, 0.02, 0.14, 0xf2f2f2, x, 0.05, 6.6);

// City backdrop with lit windows.
const winCanvas = document.createElement('canvas'); winCanvas.width = 64; winCanvas.height = 128;
{ const g = winCanvas.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 128; y += 14) for (let x = 5; x < 64; x += 12) { g.fillStyle = Math.random() < 0.55 ? '#ffd98a' : '#1b1b22'; g.fillRect(x, y, 7, 8); } }
const winTex = new THREE.CanvasTexture(winCanvas);
const towerMats = [];
for (let i = 0; i < 46; i++) {
  const w = 5 + Math.random() * 6, h = 8 + Math.random() * 22, x = -70 + i * 3.6 + Math.random() * 2, z = -14 - Math.random() * 26;
  const m = new THREE.MeshLambertMaterial({ color: pick([0x6f6a7d, 0x857a8f, 0x9a8f86, 0x5e6a7d], i), emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0 });
  towerMats.push(m);
  box(scene, w, h, w, m, x, h / 2, z);
}
// Jacarandas — Pretoria is the Jacaranda City.
function jacaranda(x, z) {
  cyl(scene, 0.22, 2.6, 0x4a3324, x, 1.3, z, 0.14);
  for (const [dx, dy, dz, r] of [[0, 3.3, 0, 1.5], [0.9, 2.9, 0.3, 1.0], [-0.8, 3.0, -0.3, 1.1]]) ball(scene, r, 0x9b6bd6, x + dx, dy, z + dz);
}
for (let x = -62; x < 92; x += 6.5) jacaranda(x, -7 + Math.sin(x) * 0.8);
for (const x of [-19, -12, 7.3, 17, 30.5, 45, 59.6, 70]) jacaranda(x, 0.8);
const stars = (() => {
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const r = 180, a = Math.random() * PI * 2, b = 0.15 + Math.random() * 1.2; pos.set([r * Math.cos(a) * Math.cos(b), r * Math.sin(b), r * Math.sin(a) * Math.cos(b)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, fog: false, transparent: true }));
  scene.add(p); return p;
})();

// ---- The studio apartment (a cutaway room at the origin).
const apt = new THREE.Group(); scene.add(apt);
box(apt, 10.4, 0.2, 7.4, 0xc9a37a, 0, -0.09, 0);                  // wooden floor
box(apt, 10.4, 3.4, 0.2, 0xf1e4d3, 0, 1.7, -3.6);               // back wall
box(apt, 0.2, 3.4, 7.4, 0xe7d6c2, -5.1, 1.7, 0);                // left wall
box(apt, 4.2, 0.03, 3, 0x7d5ba6, -1.2, 0.03, -0.9);             // rug
const windowPane = box(apt, 2.2, 1.4, 0.06, lit(0xbfe3ff), 3.2, 2.0, -3.48);
box(apt, 2.4, 0.08, 0.1, 0xffffff, 3.2, 2.74, -3.46); box(apt, 2.4, 0.08, 0.1, 0xffffff, 3.2, 1.26, -3.46);
box(apt, 1.1, 0.8, 0.05, 0xff8c42, -1.6, 2.2, -3.48); box(apt, 0.7, 0.9, 0.05, 0x2ec4b6, -0.4, 2.1, -3.48); // wall art
tag(apt, 'Studio apartment · Hatfield', 'plain', 0, 3.9, -3.5, 60);
// Desk with two 27" monitors, two laptops and the soundbar.
box(apt, 0.85, 0.07, 2.6, 0x3b2b20, -4.55, 0.76, -1.5);
for (const z of [-2.7, -0.3]) box(apt, 0.7, 0.74, 0.07, 0x2a1f18, -4.55, 0.37, z);
const screens = [];
for (const z of [-1.92, -1.08]) {
  box(apt, 0.05, 0.42, 0.68, 0x111114, -4.82, 1.18, z);
  screens.push(box(apt, 0.02, 0.36, 0.62, lit(0x3355ff), -4.79, 1.18, z));
  box(apt, 0.05, 0.2, 0.06, 0x111114, -4.84, 0.9, z); box(apt, 0.22, 0.02, 0.26, 0x111114, -4.8, 0.8, z);
}
const soundbar = box(apt, 0.1, 0.09, 1.1, 0x16161a, -4.62, 0.845, -1.5);
const sbLight = box(apt, 0.02, 0.03, 0.9, lit(0xff7a18), -4.565, 0.845, -1.5);
for (const [z, c] of [[-2.5, 0x2b2e3a], [-0.5, 0x8a8f99]]) { box(apt, 0.3, 0.02, 0.42, c, -4.45, 0.805, z); const lid = box(apt, 0.02, 0.28, 0.42, c, -4.6, 0.94, z); lid.rotation.z = -0.2; box(apt, 0.01, 0.24, 0.38, lit(0x9fd0ff), -4.585, 0.94, z).rotation.z = -0.2; }
tag(apt, '2 × 27" Dell · JBL soundbar', 'plain', -4.7, 1.75, -1.5, 14);
const chair = new THREE.Group(); apt.add(chair);
box(chair, 0.5, 0.08, 0.5, 0x22232e, 0, 0.46, 0); box(chair, 0.08, 0.6, 0.5, 0x22232e, 0.24, 0.78, 0); cyl(chair, 0.04, 0.44, 0x555555, 0, 0.22, 0);
// Couch + coffee table.
box(apt, 0.85, 0.45, 2.0, 0x3d5a80, -2.5, 0.23, -1.5); box(apt, 0.22, 0.95, 2.0, 0x34507a, -1.98, 0.48, -1.5);
for (const z of [-2.55, -0.45]) box(apt, 0.85, 0.65, 0.18, 0x34507a, -2.5, 0.33, z);
box(apt, 0.5, 0.05, 0.95, 0x2a1f18, -3.6, 0.4, -1.5); for (const z of [-1.9, -1.1]) box(apt, 0.06, 0.4, 0.06, 0x2a1f18, -3.6, 0.2, z);
const cards = new THREE.Group(); apt.add(cards);
for (let i = 0; i < 5; i++) box(cards, 0.09, 0.006, 0.13, i % 2 ? 0xffffff : 0xd62839, -3.6 + (i - 2) * 0.05, 0.435 + i * 0.004, -1.5 + (i - 2) * 0.12).rotation.y = i * 0.5;
const flyCard = box(cards, 0.09, 0.006, 0.13, 0xffffff, -3.6, 0.5, -1.5);
// Kitchenette.
box(apt, 2.6, 0.9, 0.7, 0xf5f0e8, 1.1, 0.45, -3.15); box(apt, 2.7, 0.06, 0.76, 0x2f2f36, 1.1, 0.93, -3.15);
box(apt, 0.8, 1.9, 0.7, 0xdfe3e8, 2.95, 0.95, -3.15);
box(apt, 0.6, 0.02, 0.5, 0x111111, 0.6, 0.965, -3.15);
const pot = cyl(apt, 0.2, 0.22, 0x8d99ae, 0.6, 1.09, -3.15);
const pan = cyl(apt, 0.19, 0.05, 0x222222, 1.5, 1.0, -3.15); ball(apt, 0.06, 0xffd60a, 1.5, 1.02, -3.15); cyl(apt, 0.12, 0.012, 0xffffff, 1.5, 1.03, -3.15);
const steam = puffs(apt, 0.6, 1.25, -3.15, 0xffffff, { rise: 1.1, spread: 0.25, size: 0.08 });
const potTag = tag(apt, '', 'plain', 0.6, 2.1, -3.15, 16);
// Bed.
box(apt, 1.8, 0.4, 2.2, 0x6b4f3a, 3.2, 0.2, 1.3); box(apt, 1.7, 0.16, 2.1, 0xf4f1ea, 3.2, 0.46, 1.3);
box(apt, 1.7, 0.1, 1.3, 0xb5179e, 3.2, 0.56, 1.7); for (const x of [2.8, 3.6]) box(apt, 0.6, 0.12, 0.38, 0xffffff, x, 0.58, 0.5);
box(apt, 1.8, 0.9, 0.12, 0x6b4f3a, 3.2, 0.6, 0.18);
const zzz = floaters(apt, 3.2, 1.2, 0.7, ['💤', '💤', '💤'], { rise: 1.4, spread: 0.4, rate: 0.22 });
const notes = floaters(apt, -4.5, 1.3, -1.5, ['🎵', '🎶', '🎵', '🎶', '🎵'], { rise: 1.8, spread: 0.8 });
const lamp = new THREE.PointLight(0xffc98a, 0, 16); lamp.position.set(-1, 2.9, -0.5); apt.add(lamp);
ball(apt, 0.1, lit(0xd9b98a), -1, 3.15, -0.5);
// Birthday cake + confetti for the finale.
const cake = new THREE.Group(); cake.position.set(-0.4, 0, 0.9); apt.add(cake);
cyl(cake, 0.3, 0.7, 0x5c4033, 0, 0.35, 0); cyl(cake, 0.42, 0.26, 0xfff1e6, 0, 0.84, 0); cyl(cake, 0.3, 0.2, 0xff8fab, 0, 1.07, 0);
for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; cyl(cake, 0.015, 0.16, 0xffffff, Math.cos(a) * 0.18, 1.25, Math.sin(a) * 0.18); ball(cake, 0.035, lit(0xffc300), Math.cos(a) * 0.18, 1.36, Math.sin(a) * 0.18); }
const cakeTag = tag(cake, '', 'sign', 0, 2.3, 0, 40);
const confetti = new THREE.Group(); apt.add(confetti);
const bits = Array.from({ length: 140 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.14), new THREE.MeshBasicMaterial({ color: pick(TOPS, i), side: THREE.DoubleSide })); confetti.add(m); return { m, x: -4 + Math.random() * 8, z: -3 + Math.random() * 6, ph: Math.random(), sp: 0.18 + Math.random() * 0.2 }; });

// ---- Bottle store.
box(scene, 5, 3.2, 3.6, 0xd9c2a7, 12, 1.6, 1.4); box(scene, 5.3, 0.3, 4, 0x8a1538, 12, 3.35, 1.4);
box(scene, 1.1, 2, 0.06, 0x2a1f18, 12, 1, 3.22); box(scene, 1.3, 1.1, 0.06, lit(0xffe8b0), 10.6, 1.7, 3.22); box(scene, 1.3, 1.1, 0.06, lit(0xffe8b0), 13.4, 1.7, 3.22);
tag(scene, 'Bottle Store', 'sign', 12, 4.1, 2.6, 34).element.style.color = '#ff9aa9';

// ---- The office.
const office = new THREE.Group(); office.position.set(-30, 0, 0); scene.add(office);
box(office, 13, 0.2, 7, 0x9aa5b1, 0, -0.09, -0.4); box(office, 13, 3.6, 0.2, 0xb9c6d3, 0, 1.8, -3.9); box(office, 0.2, 3.6, 7, 0xa9b8c7, -6.5, 1.8, -0.4);
for (const x of [-3.5, 0, 3.5]) box(office, 2.2, 1.3, 0.06, lit(0xcfe9ff), x, 2.2, -3.78);
tag(office, STORY.officeSign, 'sign', 0, 4.3, -3.8, 50).element.style.color = '#8ecbff';
const staff = [];
[-4.2, -1.6, 1, 3.6].forEach((x, i) => {
  box(office, 1.7, 0.07, 0.85, 0xd8c3a5, x, 0.76, -1.2); for (const dx of [-0.75, 0.75]) box(office, 0.06, 0.76, 0.75, 0x9099a2, x + dx, 0.38, -1.2);
  box(office, 0.66, 0.4, 0.05, 0x111114, x, 1.14, -0.98); box(office, 0.06, 0.2, 0.05, 0x111114, x, 0.88, -0.98);
  box(office, 0.5, 0.08, 0.5, 0x22232e, x, 0.46, -2.0); box(office, 0.5, 0.6, 0.08, 0x22232e, x, 0.78, -2.25);
  if (i === 3) return; // my desk
  const p = i === 0 ? person({ skin: 0xf1c9a5, top: 0x3a506b, hair: 0xd9b36c, style: 'long', h: 1.68 }) : person({ skin: pick(SKINS, i + 2), top: pick(TOPS, i + 3), style: i === 1 ? 'bun' : 'fade', h: 1.7 });
  p.g.position.set(-30 + x, 0, -2.0);
  staff.push(p);
});
tag(staff[0].g, 'Manager', 'plain', 0, 2.1, 0, 26);
const officeLight = new THREE.PointLight(0xffffff, 30, 16); officeLight.position.set(0, 3.2, -1); office.add(officeLight);

// ---- The clubs.
function club(cx, name, color, color2) {
  const g = new THREE.Group(); g.position.set(cx, 0, 0); scene.add(g);
  box(g, 9.4, 0.2, 6.4, 0x17131f, 0, -0.09, 0.4); box(g, 9.4, 4.2, 0.25, 0x1d1729, 0, 2.1, -2.75);
  for (const x of [-4.6, 4.6]) box(g, 0.25, 4.2, 0.25, lit(color), x, 2.1, -2.6);
  box(g, 9.4, 0.12, 0.12, lit(color), 0, 4.2, -2.6); box(g, 9.4, 0.08, 0.08, lit(color2), 0, 3.9, -2.6);
  tag(g, name, 'sign', 0, 5.0, -2.6, 46).element.style.color = '#' + color.toString(16).padStart(6, '0');
  const tiles = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) tiles.push(box(g, 1.15, 0.03, 1.15, new THREE.MeshBasicMaterial({ color }), (i - 2) * 1.25, 0.03, j * 1.25 - 0.4));
  box(g, 3, 1.05, 0.6, 0x3a2a4d, 2.8, 0.62, -2.1); box(g, 3.1, 0.06, 0.7, lit(color2), 2.8, 1.17, -2.1); // bar
  for (let i = 0; i < 7; i++) cyl(g, 0.05, 0.3, pick([0x9be36b, 0xf2b632, 0x8a1538, 0xffffff], i), 1.6 + i * 0.4, 1.9, -2.55);
  box(g, 3, 0.05, 0.25, 0x3a2a4d, 2.8, 1.73, -2.55);
  box(g, 2.2, 1.05, 0.7, 0x241b33, -2.9, 0.62, -2.0);                 // DJ booth
  const speakers = [-4.1, -1.7].map((x) => { box(g, 0.8, 1.7, 0.7, 0x0e0b14, x, 0.95, -2.0); return cyl(g, 0.28, 0.05, lit(color2), x, 1.2, -1.63); });
  speakers.forEach((s) => (s.rotation.x = PI / 2));
  const dj = person({ skin: pick(SKINS, cx), top: 0xf8f8f8, h: 1.75 }); dj.g.position.set(cx - 2.9, 0, -2.6);
  const crowd = [];
  for (let i = 0; i < 9; i++) {
    const p = person({ skin: pick(SKINS, i + cx), top: pick(TOPS, i * 3 + cx), style: i % 2 ? 'bun' : 'fade', h: 1.55 + (i % 4) * 0.07 });
    let x, z; do { x = -3.8 + Math.random() * 7.6; z = -1.1 + Math.random() * 3.6; } while (Math.abs(x) < 1.5 && z > 0.2 || x > 2 && z > 1.2);
    p.g.position.set(cx + x, 0, z); p.g.rotation.y = Math.random() * PI * 2;
    if (i % 3 === 0) hold(p.item, i % 2 ? 'cider' : 'beer');
    crowd.push(p);
  }
  // Hubbly corner.
  cyl(g, 0.4, 0.5, 0x2a1f18, 3.4, 0.45, 2.3); cyl(g, 0.13, 0.26, color, 3.4, 0.83, 2.3); cyl(g, 0.025, 0.6, 0xd0d0d0, 3.4, 1.25, 2.3); cyl(g, 0.07, 0.08, 0xc0392b, 3.4, 1.58, 2.3);
  puffs(g, 3.4, 1.65, 2.3, 0xffffff, { rise: 1.8, spread: 0.6, size: 0.13, rate: 0.28 });
  const l1 = new THREE.PointLight(color, 0, 14), l2 = new THREE.PointLight(color2, 0, 14); g.add(l1, l2);
  return { cx, tiles, speakers, dj, crowd, l1, l2, color: new THREE.Color(color), color2: new THREE.Color(color2) };
}
const clubs = [club(24, 'Drama', 0xff2fa0, 0x7b2ff7), club(37, 'Ekhaya', 0xff8c1a, 0xffe14d), club(53, 'Blue Room', 0x2f8bff, 0x35f0ff)];
tag(scene, 'near Arcadia St · open till 04:00', 'plain', 53, 5.9, -2.6, 30);
tag(scene, 'closes 02:00', 'plain', 24, 5.9, -2.6, 24); tag(scene, 'closes 02:00', 'plain', 37, 5.9, -2.6, 24);

// ---- Late-night burger stop.
box(scene, 5, 3, 3.6, 0xfff3e0, 64, 1.5, 1.4); box(scene, 5.4, 0.25, 1.4, 0xd62828, 64, 2.6, 3.6); box(scene, 2.2, 1, 0.06, lit(0xfff0b3), 64, 1.7, 3.22);
box(scene, 2.6, 0.08, 0.5, 0xb0b0b0, 64, 1.15, 3.4);
tag(scene, 'Burgers · 24h', 'sign', 64, 3.9, 2.6, 34).element.style.color = '#ffd23f';

// ---- The Uber.
const car = new THREE.Group(); scene.add(car); car.position.set(0, 0, 6.6);
box(car, 3.6, 0.7, 1.6, 0xf5f5f5, 0, 0.62, 0); box(car, 2, 0.6, 1.45, 0x9fc5e8, -0.1, 1.2, 0); box(car, 2.1, 0.06, 1.5, 0xf5f5f5, -0.1, 1.52, 0);
for (const [x, z] of [[-1.1, 0.8], [1.1, 0.8], [-1.1, -0.8], [1.1, -0.8]]) cyl(car, 0.32, 0.22, 0x111111, x, 0.32, z).rotation.x = PI / 2;
for (const z of [-0.55, 0.55]) ball(car, 0.12, lit(0xfff6cc), 1.8, 0.66, z);
const carLight = new THREE.PointLight(0xfff0c0, 0, 12); carLight.position.set(3, 0.8, 0); car.add(carLight);
tag(car, 'Uber', 'plain', 0, 2.2, 0, 40);

/* ------------------------------------------------------------------ chapters */

const DESK = [-3.78, -1.5, -PI / 2], SOFA_ME = [-2.58, -1.88, -PI / 2], SOFA_GF = [-2.58, -1.1, -PI / 2];
const DOOR = [1, 2.8], CURB = [1, 4.4];
const follow = (a, dx = 4, dy = 3.4, dz = 9) => [a.g.position.x + dx, dy, a.g.position.z + dz, a.g.position.x, 1.2, a.g.position.z - 0.5];
const orbit = (c, t, amt = 0.35) => [c[0] + Math.sin(t * 0.25) * amt, c[1] + Math.sin(t * 0.2) * amt * 0.4, c[2] + Math.cos(t * 0.25) * amt, c[3], c[4], c[5]];
const state = { music: false, lampOn: true, eggs: false };
const gfHome = (t, say = '') => { put(gf, -2.58, -2.0, -PI / 2, 'sit', t); gf.say = say; };

function clubScene(i, t, k, from, texts) {
  const c = clubs[i], spot = [c.cx - 0.7, 1.3], spotG = [c.cx + 0.5, 1.5];
  state.music = true;
  const arrive = 0.24;
  if (k < arrive) {
    const kk = k / arrive;
    walk(me, [...from, [c.cx - 0.7, 4.4], spot], kk, t);
    walk(gf, [...from.map(([x, z]) => [x + 0.8, z + 0.2]), [c.cx + 0.5, 4.5], spotG], kk, t);
    return follow(me, 3, 3.2, 10);
  }
  if (k > 0.62 && texts.hubbly) {
    put(me, c.cx + 2.5, 2.4, PI / 2, 'groove', t); put(gf, c.cx + 4.3, 2.4, -PI / 2, 'groove', t);
    me.say = '💨 hubbly'; gf.say = texts.her;
    hold(me.item, 'beer'); hold(gf.item, 'cider');
    return orbit([c.cx + 5.5, 2.6, 7.2, c.cx + 3.2, 1.3, 1.6], t);
  }
  put(me, spot[0], spot[1], 0.2, 'groove', t); put(gf, spotG[0], spotG[1], -0.2, 'dance', t);
  hold(me.item, 'beer'); hold(gf.item, 'cider');
  me.say = texts.me; gf.say = texts.her;
  return orbit([c.cx + 1.5, 3.4, 10.5, c.cx, 1.4, 0.2], t, 0.9);
}

const chapters = [
  { day: 'Hatfield, Pretoria', from: 8.5, to: 9, dur: 10, kicker: 'This is me', title: '26, and almost 27',
    text: `I live in a studio apartment in Hatfield, Pretoria, with my girlfriend. We are both 26. I am a platform engineer, I do not own a car, and I turn ${STORY.turning} on 21 December. This is what a week looks like.`,
    run(k, t) { put(me, -0.5, 1.2, 0.45, 'wave', t); put(gf, 0.45, 1.35, 0.3, 'wave', t + 1); me.say = '👋'; return mix([16, 13, 26, 0, 1, 0], [7.5, 5.2, 9.5, -1, 1.1, -0.6], ease(clamp01(k * 1.4))); } },

  { day: 'A remote day', from: 9, to: 17, dur: 13, kicker: 'Weekdays · 9 to 5', title: 'Working from the apartment',
    text: 'Most days I work remotely. Two 27-inch Dell monitors, the HP ZBook for work with my own Dell beside it, and the JBL soundbar running live groove mixtapes all day: amapiano and 3-step.',
    run(k, t) { put(me, ...DESK, 'type', t); me.say = k < 0.5 ? '💻 deploying…' : '🎧 the mix is cooking'; gfHome(t, k > 0.6 ? '📱' : ''); state.music = true; return orbit(mix([1.2, 3.4, 3.6, -3.6, 1, -1.5], [-1.6, 3.0, 1.3, -4.4, 1.05, -1.5], ease(k)), t, 0.2); } },

  { day: 'An office day', from: 8.2, to: 17, dur: 15, kicker: 'Eight days a month', title: `Uber to ${STORY.workplace}`,
    text: 'Office days mean an Uber, because I do not have a car. Some mornings my eyes are a little red from the night before, so I pick the desk furthest from my manager and keep my head down.',
    run(k, t) {
      gfHome(t);
      if (k < 0.34) { const kk = ease(k / 0.34); car.visible = true; car.position.x = lerp(2, -24, kk); car.rotation.y = PI; me.g.visible = false; return [car.position.x + 7, 4.2, 15, car.position.x - 1, 1, 5.5]; }
      put(me, -26.4, -2.0, 0, 'type', t); me.eyeMat.color.setHex(0xff5a5a);
      me.say = k < 0.66 ? '🥴 rough morning' : '👀 far from the manager';
      return k < 0.66 ? orbit([-28.5, 4.2, 7.5, -30.2, 1.1, -1.6], t) : orbit([-25.0, 2.2, 1.6, -26.6, 1.25, -1.9], t, 0.15);
    } },

  { day: 'Every evening', from: 17.5, to: 18.4, dur: 12, kicker: 'After work', title: 'The wine run',
    text: 'Every evening I walk to the bottle store for two bottles of Robertson: a sweet red for her and a dry white for me.',
    run(k, t) {
      gfHome(t);
      const path = [DOOR, CURB, [12, 4.4], [12, 3.7]];
      if (k < 0.42) walk(me, path, k / 0.42, t);
      else if (k < 0.58) { put(me, 12, 3.7, PI, 'stand', t); me.say = '🍷 sweet red + 🥂 dry white'; }
      else { walk(me, [...path].reverse(), (k - 0.58) / 0.42, t, 'carry'); hold(me.item, 'bottleWhite'); hold(me.itemL, 'bottleRed'); me.say = 'Robertson × 2'; }
      return follow(me, 3.5, 3.2, 9.5);
    } },

  { day: 'Every evening', from: 19, to: 20.5, dur: 11, kicker: '7pm sharp', title: 'Cooking together',
    text: 'At seven we start cooking. Pap and chicken, rice and chicken, wors, or beef. It depends on the day.',
    run(k, t) { put(me, 1.55, -2.4, PI, 'stir', t); put(gf, 0.6, -2.4, PI, 'stir', t + 1); steam.on = true; potTag.element.textContent = ['🍗 pap & chicken', '🍚 rice & chicken', '🌭 wors', '🥩 beef'][Math.min(3, Math.floor(k * 4))]; return orbit([3.6, 3.0, 1.6, 1.1, 1.15, -3], t, 0.3); } },

  { day: 'Every evening', from: 21, to: 24.6, dur: 14, kicker: 'On the couch', title: 'Wine, cards and the mix',
    text: 'After eating we sit on the couch with the wine, the groove mix playing through the monitors and soundbar, and a game of cards between us. That runs to around midnight or 1am.',
    run(k, t) {
      chair.position.set(-4.0, 0, -3.0);
      put(me, ...SOFA_ME, 'sip', t); put(gf, ...SOFA_GF, 'sip', t + 2.5);
      hold(me.item, 'wineWhite'); hold(gf.item, 'wineRed');
      cards.visible = true; state.music = true;
      const u = (t * 0.45) % 1; flyCard.position.set(-3.6 + Math.sin(u * PI) * 0.5, 0.48 + Math.sin(u * PI) * 0.35, lerp(-1.85, -1.1, Math.floor(t * 0.45) % 2 ? u : 1 - u)); flyCard.rotation.z = u * PI * 2;
      me.say = k > 0.5 ? '🃏 my hand' : ''; gf.say = k > 0.5 ? '' : '🃏 your turn';
      return orbit(mix([-0.2, 2.9, 3.4, -3.3, 0.9, -1.5], [-4.7, 3.1, 2.0, -2.9, 0.95, -1.5], ease(k)), t, 0.2);
    } },

  { day: 'Late', from: 24.8, to: 31, dur: 8, kicker: 'Lights out', title: 'Sleep, depending on tomorrow',
    text: 'When we sleep depends on whether tomorrow is an office day or a remote day.',
    run(k, t) { state.lampOn = false; chair.position.set(-4.0, 0, -3.0); me.g.position.set(2.85, 0, 2.25); me.g.rotation.y = 0; pose(me, 'lie'); gf.g.position.set(3.6, 0, 2.2); gf.g.rotation.y = 0; pose(gf, 'lie'); zzz.on = true; return orbit([7.2, 3.8, 6, 3.2, 0.6, 1.2], t, 0.3); } },

  { day: 'Saturday night', from: 21.5, to: 23.75, dur: 15, kicker: 'The weekend', title: 'Groove, on foot: Drama',
    text: 'Saturdays and Sundays we go to groove, and we walk because it is close. First stop is usually Drama Hatfield. I only drink Stella Artois draught. She goes for Bernini, Extreme or Flying Fish.',
    run(k, t) { return clubScene(0, t, k, [DOOR, CURB], { me: '🍺 Stella draught', her: '🍾 Bernini' }); } },

  { day: 'Saturday night', from: 23.75, to: 26, dur: 14, kicker: 'Next door', title: 'Ekhaya, and the hubbly',
    text: 'Then Ekhaya. We smoke hubbly while everyone around us is drinking and having a good time. Both Drama and Ekhaya close at 2am.',
    run(k, t) { return clubScene(1, t, k, [[23.3, 1.3], [23.3, 4.4]], { me: '🍺 another draught', her: '🐟 Flying Fish', hubbly: true }); } },

  { day: 'Sunday, early', from: 26, to: 28, dur: 13, kicker: 'After 2am', title: 'Blue Room till 4',
    text: 'When those two close we move to Blue Room, over by Arcadia Street right next to Hatfield, because it stays open until 4am.',
    run(k, t) { return clubScene(2, t, k, [[39.5, 2.4], [39.5, 4.4]], { me: '🍺 last one', her: '⚡ Extreme' }); } },

  { day: 'Sunday, early', from: 28, to: 28.4, dur: 10, kicker: '4am', title: 'The McDonald\'s stop',
    text: 'Coming out of Blue Room we sometimes pass by McDonald\'s. She gets a mini burger, chips and six nuggets.',
    run(k, t) {
      if (k < 0.4) { walk(me, [[52.3, 1.3], [52.3, 4.4], [63.2, 4.4]], k / 0.4, t); walk(gf, [[53.5, 1.5], [53.5, 4.6], [64.4, 4.4]], k / 0.4, t); return follow(me, 4, 3.2, 10); }
      put(me, 63.2, 4.4, PI, 'stand', t); put(gf, 64.4, 4.2, PI, 'stand', t); hold(gf.item, 'bag');
      gf.say = '🍔 mini burger · 🍟 chips · 6 nuggets'; me.say = k > 0.7 ? '🚕 Uber is 2 min away' : '';
      return orbit([67.5, 3.2, 10.5, 63.8, 1.4, 3.4], t, 0.3);
    } },

  { day: 'Sunday, early', from: 28.4, to: 28.8, dur: 8, kicker: 'Home time', title: 'Uber back to the apartment',
    text: 'Then an Uber home to the apartment, and straight to sleep.',
    run(k) { const kk = ease(k); car.visible = true; car.position.x = lerp(62, 2.5, kk); car.rotation.y = PI; me.g.visible = gf.g.visible = false; return [car.position.x + 8, 4.5, 16, car.position.x - 2, 1, 5.5]; } },

  { day: 'Sunday', from: 11.5, to: 13.5, dur: 12, kicker: 'The morning after', title: 'Hungover, so lunch is eggs',
    text: 'We wake up hungover and breakfast is long gone, so we make lunch instead. During the day that usually means eggs.',
    run(k, t) {
      if (k < 0.4) { me.g.position.set(2.85, 0, 2.25); me.g.rotation.y = 0; pose(me, 'lie'); gf.g.position.set(3.6, 0, 2.2); gf.g.rotation.y = 0; pose(gf, 'lie'); me.say = '🤕'; gf.say = '😵‍💫'; return orbit([7.2, 3.8, 6, 3.2, 0.6, 1.2], t, 0.3); }
      put(me, 1.5, -2.4, PI, 'stir', t); gfHome(t, '🤕 never again'); me.say = '🍳 eggs'; state.eggs = true;
      return orbit([3.8, 2.8, 1.4, 1.3, 1.15, -3], t, 0.3);
    } },

  { day: '21 December', from: 18.5, to: 19.5, dur: 13, kicker: 'Coming up', title: `${STORY.turning}, loading…`,
    text: 'And then Monday comes around and the week starts again. The next big date on the calendar is 21 December, when I turn 27.',
    run(k, t) { put(me, -1.4, 0.7, 0.4, 'dance', t); put(gf, 0.6, 0.8, -0.4, 'dance', t + 1); cake.visible = confetti.visible = true; state.music = true; me.say = '🥳'; return orbit(mix([4.5, 3.6, 7.5, -0.4, 1.2, 0.6], [2.2, 2.6, 5, -0.4, 1.3, 0.8], ease(k)), t, 0.6); } },
];

/* ------------------------------------------------------------------ HUD + playback */

function daysToBirthday() {
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), STORY.birthday.month, STORY.birthday.day);
  if (next < today) next = new Date(now.getFullYear() + 1, STORY.birthday.month, STORY.birthday.day);
  return Math.round((next - today) / 864e5);
}
const days = daysToBirthday();
const countText = days === 0 ? 'Today! 🎂' : `${days} day${days === 1 ? '' : 's'} to go`;
$('#count').textContent = countText;
cakeTag.element.textContent = days === 0 ? `Happy ${STORY.turning}th! 🎂` : `21 Dec · ${STORY.turning} 🎂 · ${countText}`;
cakeTag.element.style.color = '#ffb347';

let idx = 0, chT = 0, playing = true;
$('#dots').innerHTML = chapters.map((c, i) => `<button data-go="${i}" title="${c.title}"><i></i></button>`).join('');
const dotEls = [...$('#dots').children];
function go(i) {
  idx = (i + chapters.length) % chapters.length; chT = 0;
  const c = chapters[idx];
  $('#kicker').textContent = c.kicker; $('#title').textContent = c.title; $('#text').textContent = c.text; $('#day').textContent = c.day;
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

const camPos = new THREE.Vector3(16, 13, 26), camAt = new THREE.Vector3(0, 1, 0);
const SKY = { night: new THREE.Color(0x0a0718), day: new THREE.Color(0x8fc7ff), dusk: new THREE.Color(0xff9e6d) }, sky = new THREE.Color();
const clock = new THREE.Clock(), tmpV = new THREE.Vector3();
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
  car.visible = cake.visible = confetti.visible = cards.visible = false;
  steam.on = zzz.on = false; state.music = false; state.lampOn = true; state.eggs = false;
  potTag.element.textContent = '';

  const want = ch.run(k, t);
  const narrow = innerWidth / innerHeight < 0.8 ? 1.55 : 1;
  const f = 1 - Math.exp(-dt * (chT < 0.05 ? 60 : 2.6));
  camPos.lerp(new THREE.Vector3(want[3] + (want[0] - want[3]) * narrow, want[4] + (want[1] - want[4]) * narrow, want[5] + (want[2] - want[5]) * narrow), f);
  camAt.lerp(new THREE.Vector3(want[3], want[4], want[5]), f);
  camera.position.copy(camPos); camera.lookAt(camAt);

  for (const a of [me, gf]) { if (a.say !== a.said) { a.said = a.say; a.bubble.element.textContent = a.say; } a.bubble.userData.on = !!a.say; }
  potTag.userData.on = !!potTag.element.textContent;
  pot.visible = !state.eggs; pan.visible = true;
  notes.on = state.music && (idx < 7 || idx === chapters.length - 1);

  // Clock, sky and light follow the time of day.
  const hour = lerp(ch.from, ch.to, k) % 24;
  $('#clock').textContent = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
  dotEls[idx].firstChild.style.width = `${k * 100}%`;
  const dayAmt = clamp01((hour - 5.5) / 1.5) * clamp01((19.5 - hour) / 1.5);
  const duskAmt = Math.max(0, 1 - Math.abs(hour - 18.6) / 1.4, 1 - Math.abs(hour - 6.2) / 1.0);
  sky.copy(SKY.night).lerp(SKY.day, dayAmt).lerp(SKY.dusk, duskAmt * 0.55);
  scene.background.copy(sky); scene.fog.color.copy(sky);
  const night = 1 - dayAmt;
  ambient.intensity = lerp(0.95, 1.5, dayAmt); ambient.color.setHex(night > 0.5 ? 0x9aa4ff : 0xffffff);
  sun.intensity = lerp(0.15, 2.6, dayAmt);
  stars.material.opacity = night; bloom.strength = lerp(0.3, 0.85, night);
  towerMats.forEach((m) => (m.emissiveIntensity = night * 0.9));
  windowPane.material.color.copy(sky).lerp(new THREE.Color(0xffffff), 0.25);
  lamp.intensity = state.lampOn ? lerp(3, 24, night) : 1.2;
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
    c.l1.intensity = c.l2.intensity = on ? 60 : 0;
    c.l1.position.set(Math.sin(t * 1.3 + ci) * 3.5, 3.2, Math.cos(t * 1.1) * 2); c.l2.position.set(Math.cos(t * 0.9 + ci) * 3.5, 3.2, Math.sin(t * 1.4) * 2);
    pose(c.dj, 'dance', t);
    c.crowd.forEach((p, i) => pose(p, i % 3 === 0 ? 'groove' : 'dance', t));
  });
  staff.forEach((p) => pose(p, 'type', t));

  const u = (t * 0.45) % 1;
  bits.forEach((b) => { const v = (t * b.sp + b.ph) % 1; b.m.position.set(b.x + Math.sin(v * 9 + b.ph * 9) * 0.3, 4.2 - v * 4.2, b.z); b.m.rotation.set(v * 12, v * 7 + u, 0); });
  loops.forEach((e) => e.update(t));
  for (const { o, far } of tags) { let shown = o.userData.on !== false; for (let p = o.parent; p && shown; p = p.parent) shown = p.visible; o.visible = shown && o.getWorldPosition(tmpV).distanceTo(camera.position) < far; }

  composer.render();
  labels.render(scene, camera);
  if (playing && k >= 1) go(idx + 1);
});
