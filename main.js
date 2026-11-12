// A Month in Hatfield — a 3D animated routine.
// The town is laid out on separate streets:
//   Street A  – the apartment and the bottle store
//   Street B  – Drama and Ekhaya (side by side)
//   Street C  – Blue Room and the late-night burger stop
//   Street D  – the office
// Chapters place the characters, set the clock and aim the camera.

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
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
// Realistic rigged people from the Microsoft Rocketbox avatar library (MIT licence),
// moved by its motion-captured animations. See assets/ROCKETBOX-LICENSE.txt.

const AVATARS = {
  him: { file: 'Male_Adult_18', tex: 'm023', sex: 'm', height: 181 },
  her: { file: 'Female_Party_02', tex: 'f022', sex: 'f', height: 179 },
  man: { file: 'Male_Adult_12', tex: 'm007', sex: 'm', height: 181 },
  woman: { file: 'Female_Adult_11', tex: 'f011', sex: 'f', height: 174 },
  manager: { file: 'Female_Adult_15', tex: 'f018', sex: 'f', height: 174 },
  tee: { file: 'Male_Adult_16', tex: 'm019', sex: 'm', height: 181, bodyOnly: true },       // T-shirt body, used as sleepwear
  tank: { file: 'Female_Party_01', tex: 'f010', sex: 'f', height: 179, bodyOnly: true },    // tank-top body, used as sleepwear
};
// What each "pose" used by the chapters plays.
const CLIP_FOR = { walk: 'walk', carry: 'walk', sit: 'sit', type: 'sit', sip: 'sit', lie: 'idle', dance: 'dance1', groove: 'dance2', drink: 'drink', stir: 'work', wave: 'wave', stand: 'idle' };
const TINTS = [0xffffff, 0xffd9d9, 0xd9e8ff, 0xfff2c9, 0xd9ffe4, 0xe9d9ff, 0xcfcfcf, 0xffe0c2];
const actors = [];
const library = { ready: false, models: {}, meshes: {}, clips: {}, recolored: {} };
const itemGeo = new THREE.CylinderGeometry(4.5, 4, 20, 14); // in centimetres, like the models
const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
const cardGeo = new THREE.BoxGeometry(0.3, 9, 6), cardWhite = M(0xffffff), cardRed = M(0xd62839);
let phase = 0;
const TW = [0, 0, -1.0]; // extra bend of the left forearm while holding cards

// A person can own several "looks" (outfits). A look is a body from one avatar, optionally with
// the head of another grafted on (so the face stays the same) and optionally re-coloured clothes.
function person({ model = 'man', h = 1.75, tint = null, looks = null }) {
  const g = new THREE.Group(), inner = new THREE.Group();
  g.add(inner); scene.add(g);
  const mk = () => { const m = new THREE.Mesh(itemGeo, M(0xffffff, { roughness: 0.3 })); m.visible = false; m.castShadow = true; return m; };
  looks = looks || { default: { body: model } };
  const fan = new THREE.Group(); fan.visible = false;
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(cardGeo, i % 2 ? cardWhite : cardRed); c.position.set(0, 4, (i - 1.5) * 2.2); c.rotation.x = (i - 1.5) * 0.22; fan.add(c); }
  const a = { g, inner, h, tint, looks, rigs: {}, look: null, wantLook: Object.keys(looks)[0], item: mk(), itemL: mk(), fan, eyeMat: { color: { setHex() {} } }, ph: (phase += 1.7), say: '', said: null, want: 'idle', lying: false, cur: null, last: new THREE.Vector3() };
  a.bubble = tag(g, '', 'say', 0, h + 0.5, 0, 40); a.bubble.userData.on = false;
  actors.push(a);
  if (library.ready) dress(a);
  return a;
}
const wear = (a, look) => { a.wantLook = look; };

// Darken clothing but leave skin and white fabric alone.
const RECOLOR = {
  // These two bodies were made with light skin; shift it to match the leads.
  skin(r, g, b) {
    if (!(r > 120 && r > g && g > b && r - b > 28 && r - b < 130 && g - b < 70)) return null;
    return [r * 0.5, g * 0.4, b * 0.34];
  },
  black(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (r > g && g >= b && r - b > 22 && r - b < 120) return null;      // skin tones
    if (mn > 150 && mx - mn < 45) return null;                           // white T-shirt
    return [r * 0.3, g * 0.3, b * 0.36];
  },
};
function recolored(bodyKey, how, map) {
  const id = bodyKey + ':' + how;
  if (library.recolored[id]) return library.recolored[id];
  const img = map.image, c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, c.width, c.height), d = px.data, fn = RECOLOR[how];
  for (let i = 0; i < d.length; i += 4) { const out = fn(d[i], d[i + 1], d[i + 2]); if (out) { d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; } }
  ctx.putImageData(px, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = map.flipY;
  return (library.recolored[id] = t);
}

function buildRig(a, spec) {
  const src = AVATARS[spec.body];
  const obj = SkeletonUtils.clone(library.models[spec.body]);
  obj.scale.setScalar(a.h / src.height);
  const graft = spec.head && spec.head !== spec.body;
  const bones = {};
  obj.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (!o.isSkinnedMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material = o.material.map((m) => {
      const isBody = /_body$/.test(m.name);
      if (graft && !isBody) return HIDDEN;
      if (isBody && spec.recolor) { const c = m.clone(); c.map = recolored(spec.body, spec.recolor, m.map); return c; }
      if (isBody && a.tint) { const c = m.clone(); c.color.set(a.tint); return c; }
      return m;
    });
  });
  if (graft) {
    const hm = library.meshes[spec.head], list = hm.skeleton.bones.map((b) => bones[b.name]);
    if (list.every(Boolean)) {
      const head = new THREE.SkinnedMesh(hm.geometry, hm.material.map((m) => (/_body$/.test(m.name) ? HIDDEN : m)));
      head.castShadow = true; head.frustumCulled = false;
      obj.add(head);
      head.bind(new THREE.Skeleton(list, hm.skeleton.boneInverses), hm.bindMatrix);
    }
  }
  const mixer = new THREE.AnimationMixer(obj), actions = {};
  for (const [name, clip] of Object.entries(library.clips[src.sex])) {
    const act = mixer.clipAction(clip);
    if (name !== 'walk') act.setLoop(THREE.LoopPingPong);
    actions[name] = act;
  }
  obj.visible = false;
  a.inner.add(obj);
  return { obj, mixer, actions, hr: bones.Bip01_R_Hand, hl: bones.Bip01_L_Hand, lf: bones.Bip01_L_Forearm };
}
function dress(a) {
  for (const [name, spec] of Object.entries(a.looks)) a.rigs[name] = buildRig(a, spec);
  a.item.position.set(9, -3, 0); a.item.rotation.x = PI / 2;
  a.itemL.position.set(9, -3, 0); a.itemL.rotation.x = PI / 2;
  a.fan.position.set(10, 3, 0); a.fan.rotation.z = 0.5; a.fan.scale.setScalar(1.6);
}

function pose(a, name) {
  a.want = CLIP_FOR[name] || 'idle';
  a.lying = name === 'lie';
  if (name === 'dance' && Math.floor(a.ph) % 2) a.want = 'dance2';
}
function play(a, name) {
  if (a.cur === name || !a.actions[name]) return;
  const next = a.actions[name];
  next.reset(); next.time = name === 'walk' ? 0 : (a.ph * 1.3) % next.getClip().duration;
  next.setEffectiveWeight(1).fadeIn(0.35).play();
  if (a.curAction) a.curAction.fadeOut(0.35);
  a.cur = name; a.curAction = next;
}
// Called every frame: change outfit, start the right clip, lie people down, advance the motion capture.
function animatePeople(dt, camPos) {
  for (const a of actors) {
    const rig = a.rigs[a.wantLook];
    if (!rig) continue;
    if (a.look !== a.wantLook) {
      for (const [n, r] of Object.entries(a.rigs)) r.obj.visible = n === a.wantLook;
      a.look = a.wantLook; a.mixer = rig.mixer; a.actions = rig.actions; a.cur = null; a.curAction = null;
      rig.mixer.stopAllAction();
      if (rig.hr) rig.hr.add(a.item);
      if (rig.hl) { rig.hl.add(a.itemL); rig.hl.add(a.fan); }
    }
    play(a, a.want);
    a.inner.rotation.x = a.lying ? -PI / 2 : 0;
    a.inner.position.y = a.lying ? 0.72 : 0.055; // shoes sit a few centimetres below the ankle bones' rest height
    if (a.g.visible && a.g.position.distanceToSquared(camPos) < 3600) {
      if (a.cur === 'walk') {
        const speed = a.g.position.distanceTo(a.last) / Math.max(dt, 1e-3);
        a.actions.walk.timeScale = THREE.MathUtils.clamp(speed / 1.25, 0.7, 1.9);
      }
      a.mixer.update(dt);
      if (a.fan.visible && rig.lf) { rig.lf.rotation.x += TW[0]; rig.lf.rotation.y += TW[1]; rig.lf.rotation.z += TW[2]; }
    }
    a.last.copy(a.g.position);
  }
}

async function loadClips(sex) {
  const [index, buf] = await Promise.all([fetch(`/assets/anim_${sex}.json`).then((r) => r.json()), fetch(`/assets/anim_${sex}.bin`).then((r) => r.arrayBuffer())]);
  const data = new Float32Array(buf), clips = {};
  for (const e of index) {
    const times = Float32Array.from({ length: e.frames }, (_, i) => (i / (e.frames - 1)) * e.duration);
    const tracks = e.tracks.map((tr) => {
      const values = data.subarray(tr.o, tr.o + e.frames * tr.s);
      return tr.s === 4 ? new THREE.QuaternionKeyframeTrack(tr.n, times, values) : new THREE.VectorKeyframeTrack(tr.n, times, values);
    });
    clips[e.name] = new THREE.AnimationClip(e.name, e.duration, tracks);
  }
  return clips;
}
async function loadPeople() {
  const fbx = new FBXLoader(), tl = new THREE.TextureLoader();
  const tex = async (n) => { const t = await tl.loadAsync('/assets/' + n); t.colorSpace = THREE.SRGBColorSpace; return t; };
  await Promise.all([
    ...Object.entries(AVATARS).map(async ([key, s]) => {
      const obj = await fbx.loadAsync(`/assets/${s.file}.fbx`);
      obj.children.filter((c) => c.isLight).forEach((c) => obj.remove(c));
      const jobs = [];
      obj.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        library.meshes[key] = o;
        const mats = [].concat(o.material);
        jobs.push(Promise.all(mats.map(async (m) => {
          const kind = m.name.split('_').pop();
          if (s.bodyOnly && kind !== 'body') return HIDDEN;
          if (kind === 'opacity') return new THREE.MeshStandardMaterial({ name: m.name, map: await tex(`${s.tex}_opacity_color.png`), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 });
          return new THREE.MeshStandardMaterial({ name: m.name, map: await tex(`${s.tex}_${kind}_color.jpg`), roughness: 0.85 });
        })).then((list) => { o.material = list; }));
      });
      await Promise.all(jobs);
      library.models[key] = obj;
    }),
    ...['m', 'f'].map(async (sex) => { library.clips[sex] = await loadClips(sex); }),
  ]);
  library.ready = true;
  actors.forEach(dress);
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


// The two leads, each with outfits for different occasions. The same head is kept on every body.
const me = person({ h: 1.73, looks: {
  home: { body: 'him' }, work: { body: 'man', head: 'him' }, out: { body: 'man', head: 'him', recolor: 'black' }, sleep: { body: 'tee', head: 'him', recolor: 'skin' },
} });
const gf = person({ h: 1.57, looks: { home: { body: 'woman', head: 'her' }, out: { body: 'her' }, sleep: { body: 'tank', head: 'her', recolor: 'skin' } } });

/* ------------------------------------------------------------------ the town */
// The street grid is Hatfield, Pretoria: positions and names come from OpenStreetMap
// (© OpenStreetMap contributors), straightened a little and measured in metres from the apartment.
// The apartment's exact spot on Prospect Street is a placeholder, and the office is off this map.

const ROADW = 5.2, LANE = 1.25;
const MAIN_X = 170;                                        // Jan Shoba Street
const ST = { A: 7.4, B: -152.6, C: -442.6, D: 640 };        // Prospect St, Burnett St, Arcadia St, the office's street
// East–west streets: [z, x1, x2, name].  North–south streets: [x, z1, z2, name].
const EW = [
  [ST.A, -667, 726, 'Prospect St'], [ST.B, -900, 751, 'Burnett St'], [-283.6, -900, 625, 'Park St'], [ST.C, -900, 760, 'Arcadia St'],
  [-656.6, -900, 760, 'Francis Baard St'], [149.4, -540, 758, 'South St'], [ST.D, MAIN_X - 260, MAIN_X + 220, null],
];
const NS = [
  [-608, -700, ST.A, 'Festival St'], [-339, -700, 300, 'Hilda St'], [-116, -700, 236, 'Grosvenor St'], [MAIN_X, -720, 790, 'Jan Shoba St'],
  [389, -600, 241, 'Glyn St'], [604, -700, 243, 'Richard St'],
];
// Where each place sits: [x, z]. Ekhaya and the McDonald's are at their real spots on Burnett Street.
const O = {
  apt: [0, 0], store: [12, 0], drama: [-216, ST.B - 7.4], ekhaya: [-203, ST.B - 7.4], burger: [-301, ST.B - 7.4],
  blue: [-520, ST.C - 7.4], office: [MAIN_X - 120, ST.D - 7.4],
};
const place = (key) => { const g = new THREE.Group(); g.position.set(O[key][0], 0, O[key][1]); scene.add(g); return g; };
const W = (key, x, z) => [O[key][0] + x, O[key][1] + z];
const nearSet = (x, z, pad) => Object.values(O).some(([sx, sz]) => Math.abs(x - sx) < pad + 5 && Math.abs(z - sz) < pad + 4);
const camAt6 = (key, c, cut = 0) => [c[0] + O[key][0], c[1], c[2] + O[key][1], c[3] + O[key][0], c[4], c[5] + O[key][1], cut];
// The parts of town the camera actually visits; scenery is only built there.
const ZONES = [[-90, 270, -80, 100], [80, 260, -250, 730], [-390, 260, -260, -90], [-610, -440, -530, -380], [-40, 270, 560, 730]];
const inZone = (x, z) => ZONES.some(([x1, x2, z1, z2]) => x > x1 && x < x2 && z > z1 && z < z2);

box(scene, 2400, 0.2, 2000, 0x6f9463, -80, -0.1, 20).castShadow = false;
const asphalt = M(0x2d2d36, { roughness: 0.95 }), paving = M(0xc4bcae), paint = lit(0xdedede);
const dashX = new THREE.BoxGeometry(1.6, 0.01, 0.14), dashZ = new THREE.BoxGeometry(0.14, 0.01, 1.6);
const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), bulbGeo = new THREE.SphereGeometry(0.17, 10, 8), poleMat = M(0x3a3a44), bulbMat = lit(0xffe2a8);
for (const [z, x1, x2, name] of EW) {
  box(scene, x2 - x1, 0.04, ROADW, asphalt, (x1 + x2) / 2, 0.02, z).castShadow = false;
  box(scene, x2 - x1, 0.05, 1.6, paving, (x1 + x2) / 2, 0.02, z - ROADW / 2 - 0.8).castShadow = false;
  for (let x = x1 + 2; x < x2; x += 4) if (inZone(x, z)) mesh(scene, dashX, paint, x, 0.045, z);
  for (let x = x1 + 5; x < x2; x += 18) if (inZone(x, z) && !nearSet(x, z - 7.4, 2)) { mesh(scene, poleGeo, poleMat, x, 1.8, z - ROADW / 2 - 1.5); mesh(scene, bulbGeo, bulbMat, x, 3.7, z - ROADW / 2 - 1.5); }
  if (name) for (let x = x1 + 40; x < x2; x += 110) if (inZone(x, z)) tag(scene, name, 'street', x, 3.2, z + ROADW / 2 + 1.2, 42);
}
for (const [x, z1, z2, name] of NS) {
  box(scene, ROADW, 0.04, z2 - z1, asphalt, x, 0.021, (z1 + z2) / 2).castShadow = false;
  for (let z = z1 + 4; z < z2 - 2; z += 4) if (inZone(x, z)) mesh(scene, dashZ, paint, x, 0.046, z);
  if (name) for (let z = z1 + 60; z < z2; z += 120) if (inZone(x, z)) tag(scene, name, 'street', x + ROADW / 2 + 1.2, 3.2, z, 42);
}

const trunkGeo = new THREE.CylinderGeometry(0.13, 0.2, 2.6, 8), trunkMat = M(0x4a3324);
const BLOBS = [[0, 3.4, 0, 1.5, 0x9b6bd6], [0.95, 3.0, 0.3, 1.05, 0xa77be0], [-0.85, 3.2, -0.3, 1.1, 0x8f5fcb]]
  .map(([dx, dy, dz, r, c]) => ({ dx, dy, dz, geo: new THREE.IcosahedronGeometry(r, 2), mat: M(c, { roughness: 1 }) }));
function jacaranda(x, z, s = 1) {
  mesh(scene, trunkGeo, trunkMat, x, 1.3 * s, z).scale.setScalar(s);
  for (const b of BLOBS) mesh(scene, b.geo, b.mat, x + b.dx * s, b.dy * s, z + b.dz * s).scale.setScalar(s);
}
const nearCross = (x) => NS.some(([nx]) => Math.abs(nx - x) < 6);
for (const [z, x1, x2] of EW) for (let x = x1 + 3; x < x2; x += 11) {
  if (!inZone(x, z) || nearCross(x)) continue;
  if (!nearSet(x, z - 7.4, 1)) jacaranda(x, z - 6 + Math.sin(x) * 0.6);
  jacaranda(x + 3, z - 15 + Math.cos(x) * 0.8, 1.15);
}
for (let z = -240; z < 720; z += 14) if (!EW.some(([ez]) => Math.abs(ez - z) < 12)) { jacaranda(MAIN_X - 20, z + Math.sin(z) * 0.8); jacaranda(MAIN_X + 20, z + 6 + Math.cos(z) * 0.8); }

// Background buildings with lit windows, kept clear of streets, sets and camera paths.
const winCanvas = document.createElement('canvas'); winCanvas.width = 64; winCanvas.height = 128;
{ const g = winCanvas.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 128; y += 14) for (let x = 5; x < 64; x += 12) { g.fillStyle = Math.random() < 0.55 ? '#ffd98a' : '#16161c'; g.fillRect(x, y, 7, 8); } }
const winTex = new THREE.CanvasTexture(winCanvas);
const towerMats = [0x8d8799, 0xa0969f, 0xb3a79a, 0x77839a, 0x9c8f8f, 0xa9765b, 0x8a5a44].map((c) => M(c, { emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0 }));
const towerGeo = new THREE.BoxGeometry(1, 1, 1);
function clear(x, z, w) {
  for (const [rz, x1, x2] of EW) if (x > x1 - 10 && x < x2 + 10 && z > rz - 6 - w / 2 && z < rz + 23 + w / 2) return false;
  for (const [rx, z1, z2] of NS) if (z > z1 - 8 && z < z2 + 24 && Math.abs(x - rx) < (rx === MAIN_X ? 16 : 7) + w / 2) return false;
  return !nearSet(x, z, 5 + w / 2);
}
for (const [x1, x2, z1, z2] of ZONES) {
  const want = Math.round(((x2 - x1) * (z2 - z1)) / 950);
  for (let i = 0, made = 0; i < want * 14 && made < want; i++) {
    const w = 6 + Math.random() * 6, h = 7 + Math.random() * 20, x = x1 - 40 + Math.random() * (x2 - x1 + 80), z = z1 - 40 + Math.random() * (z2 - z1 + 80);
    if (!clear(x, z, w)) continue;
    made++;
    mesh(scene, towerGeo, pick(towerMats, i), x, h / 2, z).scale.set(w, h, w);
  }
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
const lamp = new THREE.PointLight(0xffc98a, 0, 16); lamp.position.set(-0.6, 3.0, 0.4); apt.add(lamp);
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
  const p = i === 0 ? person({ model: 'manager', h: 1.68 }) : person({ model: i === 1 ? 'woman' : 'man', h: 1.72, tint: i === 1 ? 0xd9e8ff : 0xa89a80 });
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
  const dj = person({ model: 'man', h: 1.78, tint: 0xe8e8ff }); dj.g.position.set(cx - 2.9, 0, cz - 2.65);
  const crowd = [];
  for (let i = 0; i < 9; i++) {
    const p = person({ model: pick(['man', 'woman', 'woman', 'man', 'manager', 'woman', 'man'], i + cx), tint: pick(TINTS, i * 3 + cx), h: 1.6 + (i % 4) * 0.06 });
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

/* ---- The apartment block: a closed brick building around the studio, with two more floors above. */
const brickCanvas = document.createElement('canvas'); brickCanvas.width = 256; brickCanvas.height = 128;
{ const g = brickCanvas.getContext('2d'); g.fillStyle = '#b9ab9b'; g.fillRect(0, 0, 256, 128);
  for (let row = 0; row < 8; row++) for (let i = -1; i < 8; i++) {
    const shade = 0.82 + Math.random() * 0.3;
    g.fillStyle = `rgb(${Math.round(156 * shade)}, ${Math.round(74 * shade)}, ${Math.round(52 * shade)})`;
    g.fillRect(i * 32 + (row % 2 ? 16 : 0) + 1.5, row * 16 + 1.5, 29, 13);
  } }
function brick(w, h) {
  const t = new THREE.CanvasTexture(brickCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 2, h); t.colorSpace = THREE.SRGBColorSpace;
  return M(0xffffff, { map: t, roughness: 0.92 });
}
const quiet = (m) => { m.castShadow = false; return m; }; // keeps daylight coming into the studio
const plaster = M(0xf3e7d8), aptGlass = lit(0xbfe3ff);
// brick skins on the outside of the two original walls
quiet(box(apt, 10.9, 3.7, 0.08, brick(10.9, 3.7), 0, 1.85, -3.86)); quiet(box(apt, 0.08, 3.7, 7.9, brick(7.9, 3.7), -5.36, 1.85, 0));
// right wall
quiet(box(apt, 0.22, 3.5, 7.6, plaster, 5.2, 1.75, 0)); quiet(box(apt, 0.08, 3.7, 7.9, brick(7.9, 3.7), 5.36, 1.85, 0));
// front wall with a doorway at x = 1
for (const [x1, x2, y1, y2] of [[-5.3, 0.35, 0, 3.5], [1.65, 5.3, 0, 3.5], [0.35, 1.65, 2.15, 3.5]]) {
  const w = x2 - x1, h = y2 - y1;
  quiet(box(apt, w, h, 0.22, plaster, (x1 + x2) / 2, (y1 + y2) / 2, 3.7));
  quiet(box(apt, w + (h > 3 ? 0.1 : 0), h + 0.1, 0.08, brick(w, h), (x1 + x2) / 2, (y1 + y2) / 2 + 0.05, 3.86));
}
rbox(apt, 1.2, 2.1, 0.1, 0x4a2f22, 1, 1.05, 3.84, 0.03); ball(apt, 0.05, M(0xd9b36c, { metalness: 0.8, roughness: 0.3 }), 1.45, 1.05, 3.92);
for (const x of [-3.3, 3.6]) { box(apt, 1.7, 1.3, 0.05, aptGlass, x, 1.9, 3.91); rbox(apt, 1.9, 0.1, 0.12, 0xffffff, x, 2.6, 3.92, 0.03); rbox(apt, 1.9, 0.1, 0.12, 0xffffff, x, 1.2, 3.92, 0.03); }
rbox(apt, 2.2, 0.08, 1.2, 0x8a8f99, 1, 2.45, 4.4, 0.03); // little canopy over the door
// ceiling, then two more storeys and a roof
quiet(box(apt, 10.6, 0.2, 7.6, plaster, 0, 3.6, 0));
quiet(box(apt, 10.9, 6.6, 7.9, brick(10.9, 6.6), 0, 7.0, 0));
const upperGlass = lit(0x9fc4e0);
for (const y of [5.3, 8.5]) for (const x of [-3.6, -1.2, 1.2, 3.6]) { box(apt, 1.5, 1.4, 0.05, upperGlass, x, y, 3.97); box(apt, 1.5, 1.4, 0.05, upperGlass, x, y, -3.97); rbox(apt, 1.7, 0.1, 0.14, 0xffffff, x, y - 0.75, 3.99, 0.03); }
for (const y of [5.3, 8.5]) for (const z of [-2, 2]) { box(apt, 0.05, 1.4, 1.5, upperGlass, 5.47, y, z); box(apt, 0.05, 1.4, 1.5, upperGlass, -5.47, y, z); }
quiet(rbox(apt, 11.3, 0.3, 8.3, 0x6b6660, 0, 10.45, 0, 0.05));
// the blanket that covers them at night
const blanket = rbox(apt, 1.86, 0.16, 1.3, 0x7a4fb3, 3.2, 0.86, 1.76, 0.07); blanket.visible = false;

/* ------------------------------------------------------------------ traffic */

const carGeo = {
  body: new RoundedBoxGeometry(3.7, 0.62, 1.65, 3, 0.22), cabin: new RoundedBoxGeometry(2.1, 0.58, 1.5, 3, 0.24), roof: new RoundedBoxGeometry(1.9, 0.06, 1.42, 2, 0.03),
  wheel: new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18), hub: new THREE.CylinderGeometry(0.16, 0.16, 0.25, 12),
  lamp: new RoundedBoxGeometry(0.08, 0.14, 0.32, 2, 0.03), axle: new THREE.CylinderGeometry(0.33, 0.33, 1.84, 14),
};
const glass = M(0x1c2733, { roughness: 0.1, metalness: 0.5 }), tyre = M(0x111111), hubMat = M(0xbfbfbf), headMat = lit(0xfff6cc), tailMat = lit(0xc21f1f);
function makeCar(color, simple = false) {
  const g = new THREE.Group(), paintMat = M(color, { roughness: 0.6 });
  mesh(g, carGeo.body, paintMat, 0, 0.62, 0); mesh(g, carGeo.cabin, glass, -0.15, 1.15, 0); mesh(g, carGeo.roof, paintMat, -0.15, 1.44, 0);
  if (simple) for (const x of [-1.15, 1.15]) mesh(g, carGeo.axle, tyre, x, 0.33, 0).rotation.x = PI / 2;
  else for (const [x, z] of [[-1.15, 0.8], [1.15, 0.8], [-1.15, -0.8], [1.15, -0.8]]) { mesh(g, carGeo.wheel, tyre, x, 0.33, z).rotation.x = PI / 2; mesh(g, carGeo.hub, hubMat, x, 0.33, z).rotation.x = PI / 2; }
  for (const z of [-0.55, 0.55]) { mesh(g, carGeo.lamp, headMat, 1.83, 0.7, z); mesh(g, carGeo.lamp, tailMat, -1.83, 0.72, z); }
  scene.add(g);
  return g; // faces +x
}

// ---- Traffic lights ("robots") at the three junctions on the main road.
const lampGeo = new THREE.SphereGeometry(0.15, 12, 10), mastGeo = new THREE.CylinderGeometry(0.07, 0.07, 4.2, 8), headGeo = new RoundedBoxGeometry(0.42, 1.25, 0.42, 2, 0.08);
const LAMP = { r: [0xff3b30, 0x4a1512], a: [0xffb020, 0x4a3410], g: [0x34e36a, 0x0f3d1e] };
const junctions = [];
function junction(x, z, offset) {
  const J = { x, z, offset, force: null, lamps: { x: [], z: [] } };
  const mast = (px, pz, axis) => {
    mesh(scene, mastGeo, poleMat, px, 2.1, pz); mesh(scene, headGeo, M(0x1d1d22), px, 4.5, pz);
    const set = {};
    ['r', 'a', 'g'].forEach((c, i) => {
      const m = new THREE.MeshBasicMaterial({ color: LAMP[c][1] });
      for (const s of [-1, 1]) mesh(scene, lampGeo, m, px + (axis === 'x' ? s * 0.2 : 0), 4.9 - i * 0.4, pz + (axis === 'z' ? s * 0.2 : 0));
      set[c] = m;
    });
    J.lamps[axis].push(set);
  };
  const d = ROADW / 2 + 0.9;
  mast(x - d, z - d, 'x'); mast(x + d, z + d, 'x'); mast(x + d, z - d, 'z'); mast(x - d, z + d, 'z');
  // stop lines
  box(scene, 0.25, 0.012, ROADW / 2, paint, x - d + 0.4, 0.05, z - LANE).castShadow = false; box(scene, 0.25, 0.012, ROADW / 2, paint, x + d - 0.4, 0.05, z + LANE).castShadow = false;
  box(scene, ROADW / 2, 0.012, 0.25, paint, x + LANE, 0.05, z - d + 0.4).castShadow = false; box(scene, ROADW / 2, 0.012, 0.25, paint, x - LANE, 0.05, z + d - 0.4).castShadow = false;
  junctions.push(J); return J;
}
const J1 = junction(MAIN_X, ST.A, 0), J2 = junction(MAIN_X, ST.D, 5), J3 = junction(MAIN_X, ST.B, 9);
// Signal for traffic travelling along `axis` ('x' = east–west, 'z' = north–south).
function signal(J, axis, t) {
  if (J.force) return J.force === axis ? 'g' : 'r';
  const u = (t + J.offset) % 15;
  const ew = u < 6 ? 'g' : u < 7.5 ? 'a' : 'r', ns = u < 7.5 ? 'r' : u < 13.5 ? 'g' : 'a';
  return axis === 'x' ? ew : ns;
}

// ---- Other cars. Each lane runs from a to b; cars keep left, stop at red and keep their distance.
const LANES = {
  Aw: { axis: 'x', c: ST.A + LANE, a: 340, b: -160, n: 11 }, Ae: { axis: 'x', c: ST.A - LANE, a: -160, b: 340, n: 10 },
  Ms: { axis: 'z', c: MAIN_X + LANE, a: -270, b: 770, n: 27 }, Mn: { axis: 'z', c: MAIN_X - LANE, a: 770, b: -270, n: 27 },
  De: { axis: 'x', c: ST.D - LANE, a: MAIN_X - 240, b: MAIN_X + 200, n: 8 }, Dw: { axis: 'x', c: ST.D + LANE, a: MAIN_X + 200, b: MAIN_X - 240, n: 8 },
};
const CAR_COLORS = [0xc0392b, 0x2e86de, 0xf5f5f5, 0x222831, 0xf39c12, 0x7f8c8d, 0x16a085, 0x8e44ad, 0xd4d4d4, 0x34495e];
const traffic = [];
Object.entries(LANES).forEach(([key, L], li) => {
  L.len = Math.abs(L.b - L.a); L.dir = Math.sign(L.b - L.a);
  for (let i = 0; i < L.n; i++) traffic.push({ key, L, s: ((i + Math.random() * 0.6) / L.n) * L.len, v: 8, vmax: 8 + Math.random() * 3, mesh: makeCar(pick(CAR_COLORS, i * 3 + li * 7), true), sparse: i % 3 !== 0 });
});

// ---- The Uber: scripted by the chapters, but the other cars treat it like any other car.
const car = makeCar(0xe6e6e6);
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

function updateTraffic(dt, t, lateNight, reserved, jumped) {
  for (const J of junctions) for (const axis of ['x', 'z']) {
    const s = signal(J, axis, t);
    for (const set of J.lamps[axis]) for (const c of ['r', 'a', 'g']) set[c].color.setHex(LAMP[c][c === s ? 0 : 1]);
  }
  for (const c of traffic) {
    const L = c.L, hidden = reserved.includes(c.key) || (lateNight && c.sparse);
    c.mesh.visible = !hidden;
    if (hidden) { c.s = (c.s + c.vmax * dt) % L.len; continue; }
    const p = L.a + L.dir * c.s;
    let gap = Infinity;
    for (const J of junctions) {
      if (Math.abs((L.axis === 'x' ? J.z : J.x) - L.c) > 3) continue;
      const stop = (L.axis === 'x' ? J.x : J.z) - L.dir * (ROADW / 2 + 2.6);
      const d = (stop - p) * L.dir;
      if (d > -0.6 && d < gap && signal(J, L.axis, t) !== 'g') gap = d;
    }
    for (const o of traffic) {
      if (o === c || o.key !== c.key || !o.mesh.visible) continue;
      const d = ((o.s - c.s + L.len) % L.len) - 5;
      if (d < gap) gap = d;
    }
    if (car.visible && Math.abs((L.axis === 'x' ? car.position.z : car.position.x) - L.c) < 0.7) {
      const along1 = ((L.axis === 'x' ? car.position.x : car.position.z) - p) * L.dir;
      if (jumped && Math.abs(along1) < 10) { c.s = (c.s + 30) % L.len; continue; }
      if (along1 > 0 && along1 - 5 < gap) gap = along1 - 5;
    }
    const want = gap < 0.8 ? 0 : Math.min(c.vmax, gap * 1.3);
    c.v += THREE.MathUtils.clamp(want - c.v, -16 * dt, 5 * dt);
    c.s = (c.s + Math.max(0, c.v) * dt) % L.len;
    const q = L.a + L.dir * c.s;
    if (L.axis === 'x') { c.mesh.position.set(q, 0, L.c); c.mesh.rotation.y = L.dir > 0 ? 0 : PI; }
    else { c.mesh.position.set(L.c, 0, q); c.mesh.rotation.y = L.dir > 0 ? -PI / 2 : PI / 2; }
  }
}

/* ------------------------------------------------------------------ chapters */
// A chapter's run() places everyone and returns the camera:
// [camX, camY, camZ, lookX, lookY, lookZ, cutId, fieldOfView, rigid]

const DESK = [-3.78, -1.5, -PI / 2], SOFA_ME = [-2.6, -1.98, -PI / 2], SOFA_GF = [-2.6, -1.02, -PI / 2];
const DOOR = [1, 4.05];
const easeOut = (k) => 1 - Math.pow(1 - clamp01(k), 2.4), easeIn = (k) => Math.pow(clamp01(k), 2.2);
const follow = (a, cut = 0, dx = 4, dy = 3.4, dz = 9.5) => [a.g.position.x + dx, dy, a.g.position.z + dz, a.g.position.x, 1.2, a.g.position.z - 0.5, cut];
const chase = (p, cut = 0) => [p.x + 9, 6, p.z + 16, p.x - 1, 0.8, p.z - 1, cut];
const orbit = (c, t, amt = 0.35) => [c[0] + Math.sin(t * 0.25) * amt, c[1] + Math.sin(t * 0.2) * amt * 0.4, c[2] + Math.cos(t * 0.25) * amt, c[3], c[4], c[5], c[6] || 0];
const state = { music: false, lampOn: true, eggs: false, reserved: [], indoor: false };
const indoors = (cam) => { state.indoor = true; return cam; };
const gfHome = (t, say = '') => { put(gf, ...SOFA_ME, 'sit', t); gf.say = say; };
function inBed() {
  wear(me, 'sleep'); wear(gf, 'sleep'); blanket.visible = true;
  me.g.position.set(2.82, 0, 2.3); me.g.rotation.y = 0; pose(me, 'lie'); gf.g.position.set(3.6, 0, 2.25); gf.g.rotation.y = 0; pose(gf, 'lie');
}
const goingOut = () => { wear(me, 'out'); wear(gf, 'out'); };
// Through his eyes: the camera sits at head height and he is hidden.
function eyes(pos, look, cut, fov = 60) { me.g.visible = false; return [pos[0], pos[1], pos[2], look[0], look[1], look[2], cut, fov, true]; }

function onTheFloor(c, t, drinks, hubbly, pov) {
  state.music = true;
  hold(me.item, 'beer'); hold(gf.item, 'cider');
  if (hubbly) {
    put(me, ...W(c.key, 2.5, 2.4), PI / 2, 'drink', t); put(gf, ...W(c.key, 4.3, 2.4), -PI / 2, 'drink', t);
    me.say = '💨 hubbly'; gf.say = drinks[1];
    return orbit(camAt6(c.key, [5.5, 2.6, 7.2, 3.2, 1.3, 1.6], 3), t);
  }
  put(me, ...W(c.key, -0.7, 1.3), 0.6, 'groove', t); put(gf, ...W(c.key, 0.6, 2.5), -2.4, 'dance', t);
  if (pov) {
    const [x, z] = W(c.key, -0.9, 2.2), [gx, gz] = W(c.key, 0.2, 0.5);
    put(gf, gx, gz, -0.57, 'dance', t);
    gf.say = drinks[1];
    return eyes([x + Math.sin(t * 1.9) * 0.06, 1.62 + Math.abs(Math.sin(t * 5.9)) * 0.04, z], [gx, 1.32, gz], 4, 64);
  }
  me.say = drinks[0]; gf.say = drinks[1];
  return orbit(camAt6(c.key, [1.5, 3.4, 10.5, 0, 1.4, 0.2], 2), t, 0.9);
}
function stroll(path, k, t, cut) { walk(me, path, k, t); walk(gf, shift(path, 0.9, 0.25), k, t); return follow(me, cut, 3.5, 3.3, 10); }

// A ride: wait at the kerb while the minutes tick down, get in, pull away, stop at the robot,
// ride along Jan Shoba Street (seen from inside the car), and arrive.
function ride(k, t, o) {
  state.reserved = o.reserved;
  const riders = o.riders, waitEnd = 0.26, boardEnd = 0.31;
  if (k < boardEnd) {
    o.waitLight.force = o.waitAxis;
    const kk = k / waitEnd;
    riders.forEach((a, i) => put(a, o.spot[0] + i * 1.1, o.spot[1], 0, 'stand', t));
    const mins = Math.max(1, Math.ceil(o.mins * (1 - kk / 0.72)));
    riders[0].say = kk < 0.72 ? `🚕 Uber · ${mins} min` : kk < 1 ? '🚕 arriving' : '';
    if (kk > 0.72) drive(o.arrive, easeOut((kk - 0.72) / 0.28));
    if (k > waitEnd) {
      const b = (k - waitEnd) / (boardEnd - waitEnd), door = o.arrive[o.arrive.length - 1];
      riders.forEach((a, i) => { walk(a, [[o.spot[0] + i * 1.1, o.spot[1]], [door[0] - 0.4 + i * 0.9, door[1] - 1.0]], b, t); if (b > 0.85) a.g.visible = false; });
    }
    return orbit([o.spot[0] + 7, 3.2, o.spot[1] + 9, o.spot[0] - 1, 1.2, o.spot[1] + 1.5, 0], t, 0.3);
  }
  riders.forEach((a) => { a.g.visible = false; });
  if (k < 0.38) return chase(drive(o.depart, easeIn((k - boardEnd) / (0.38 - boardEnd))), 1);
  if (k < 0.64) {
    const kk = (k - 0.38) / 0.26;
    o.light.force = kk < 0.66 ? o.crossAxis : o.myAxis;
    const f = kk < 0.4 ? easeOut(kk / 0.4) * o.stopAt : kk < 0.7 ? o.stopAt : o.stopAt + easeIn((kk - 0.7) / 0.3) * (1 - o.stopAt);
    return chase(drive(o.first, f), 2);
  }
  if (k < 0.83) {
    // From the passenger seat.
    const p = drive(o.middle, (k - 0.64) / 0.19), dx = Math.sin(p.rot), dz = Math.cos(p.rot);
    return [p.x - dx * 0.2 + dz * 0.3, 1.2, p.z - dz * 0.2 - dx * 0.3, p.x + dx * 40, 0.6, p.z + dz * 40, 3, 62, true];
  }
  o.lastLight.force = o.lastAxis;
  return chase(drive(o.last, easeOut((k - 0.83) / 0.17)), 4);
}

const eLane = ST.A - LANE, wLane = ST.A + LANE, nLane = MAIN_X - LANE, sLane = MAIN_X + LANE, dE = ST.D - LANE, dW = ST.D + LANE, bE = ST.B - LANE;
const APPROACH = 75, stopFrac = (path) => { let total = 0; for (let i = 0; i < path.length - 1; i++) total += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); return (APPROACH - ROADW / 2 - 2.6) / total; };
const TO_WORK = {
  reserved: ['Ae', 'Ms', 'Dw'], riders: [me], spot: [2, 4.3], mins: 4, waitLight: J1, waitAxis: 'z',
  arrive: [[-45, eLane], [2.5, eLane]], depart: [[2.5, eLane], [55, eLane]],
  first: [[MAIN_X - APPROACH, eLane], [sLane, eLane], [sLane, ST.A + 60]], light: J1, myAxis: 'x', crossAxis: 'z',
  middle: [[sLane, 300], [sLane, 420]],
  last: [[sLane, ST.D - 45], [sLane, dW], [O.office[0] + 6, dW]], lastLight: J2, lastAxis: 'z',
};
const TO_HOME = {
  reserved: ['De', 'Mn', 'Aw'], riders: [me], spot: W('office', 2, 4.3), mins: 6, waitLight: J2, waitAxis: 'z',
  arrive: [[O.office[0] - 45, dE], [O.office[0] + 2.5, dE]], depart: [[O.office[0] + 2.5, dE], [O.office[0] + 40, dE]],
  first: [[MAIN_X - APPROACH, dE], [nLane, dE], [nLane, ST.D - 60]], light: J2, myAxis: 'x', crossAxis: 'z',
  middle: [[nLane, 440], [nLane, 320]],
  last: [[nLane, ST.A + 50], [nLane, wLane], [3, wLane]], lastLight: J1, lastAxis: 'z',
};
const NIGHT_HOME = {
  reserved: ['Ms', 'Aw'], riders: [me, gf], spot: W('burger', -0.8, 4.3), mins: 2, waitLight: J3, waitAxis: 'z',
  arrive: [[O.burger[0] - 45, bE], [O.burger[0] - 0.3, bE]], depart: [[O.burger[0] - 0.3, bE], [O.burger[0] + 45, bE]],
  first: [[MAIN_X - APPROACH, bE], [sLane, bE], [sLane, ST.B + 60]], light: J3, myAxis: 'x', crossAxis: 'z',
  middle: [[sLane, -95], [sLane, -35]],
  last: [[sLane, ST.A - 50], [sLane, wLane], [3, wLane]], lastLight: J1, lastAxis: 'z',
};
for (const r of [TO_WORK, TO_HOME, NIGHT_HOME]) r.stopAt = stopFrac(r.first);

// `date` is the day of the month (1 = the first Monday). Tuesdays and Thursdays are office days: eight a month.
const chapters = [
  { date: 1, from: 7.6, to: 9, dur: 12, title: 'Hatfield, Pretoria',
    text: 'A brick apartment block on a Hatfield street, morning traffic already moving. Inside: a studio, a couple in their twenties, and a month with a rhythm of its own.',
    run(k, t) {
      put(me, ...DESK, 'type', t); put(gf, ...SOFA_ME, 'sit', t);
      if (k < 0.55) return mix([44, 21, 52, 0, 4.5, 0, 0], [15, 5.5, 21, 0, 3.6, 2, 0], ease(k / 0.55));
      return indoors(orbit([4.3, 2.8, 3.0, -2.8, 1, -1.5, 1], t, 0.25));
    } },

  { date: 1, from: 9, to: 17, dur: 15, title: 'A remote day',
    text: 'Most of the month is spent working from the apartment: two 27-inch Dell monitors, an HP ZBook for work beside a personal Dell, and a JBL soundbar playing live amapiano and 3-step mixes.',
    run(k, t) {
      put(me, ...DESK, 'type', t); gfHome(t, k > 0.3 && k < 0.5 ? '📱' : ''); state.music = true; state.indoor = true;
      if (k < 0.55) { me.say = '💻'; return orbit(mix([1.2, 3.0, 3.1, -3.6, 1, -1.5], [-1.6, 2.8, 1.3, -4.4, 1.05, -1.5], ease(k / 0.55)), t, 0.2); }
      return eyes([-3.95, 1.24, -1.5], [-4.8, 1.14, -1.5 + Math.sin(t * 0.45) * 0.5], 1, 58);
    } },

  { date: 1, from: 17.5, to: 18.4, dur: 15, title: 'The wine run',
    text: 'Every evening, a walk down the street to the bottle store for two bottles of Robertson: a sweet red for her, a dry white for him.',
    run(k, t) {
      gfHome(t);
      const path = [DOOR, [12, 4.1], [12, 3.75]];
      if (k < 0.42) walk(me, path, k / 0.42, t);
      else if (k < 0.58) { put(me, 12, 3.75, PI, 'stand', t); me.say = '🍷 sweet red · 🥂 dry white'; }
      else { walk(me, [...path].reverse(), (k - 0.58) / 0.42, t, 'carry'); hold(me.item, 'bottleWhite'); hold(me.itemL, 'bottleRed'); me.say = 'Robertson × 2'; }
      return follow(me, 0, 3.5, 3.2, 9.5);
    } },

  { date: 1, from: 19, to: 20.5, dur: 11, title: '7pm: cooking',
    text: 'Pap and chicken, rice and chicken, wors, or beef. It depends on the day.',
    run(k, t) { put(me, 1.55, -2.42, PI, 'stir', t); put(gf, 0.6, -2.42, PI, 'stir', t + 1); steam.on = true; potTag.element.textContent = ['🍗 pap & chicken', '🍚 rice & chicken', '🌭 wors', '🥩 beef'][Math.min(3, Math.floor(k * 4))]; return indoors(orbit([3.9, 2.8, 1.2, 1.0, 1.15, -3], t, 0.25)); } },

  { date: 1, from: 21, to: 24.6, dur: 14, title: 'Wine, cards and the mix',
    text: 'After dinner: the couch, the wine, a hand of cards each, and the groove mix on the monitors until midnight or 1am.',
    run(k, t) {
      chair.position.set(-4.0, 0, -3.05);
      put(me, ...SOFA_ME, 'sip', t); put(gf, ...SOFA_GF, 'sip', t + 2.5);
      hold(me.item, 'wineWhite'); hold(gf.item, 'wineRed');
      cards.visible = me.fan.visible = gf.fan.visible = true; state.music = true;
      return indoors(orbit(mix([-0.2, 2.8, 3.1, -3.3, 0.9, -1.5], [-4.6, 2.9, 2.0, -2.9, 0.95, -1.5], ease(k)), t, 0.2));
    } },

  { date: 1, from: 24.8, to: 31, dur: 8, title: 'Lights out',
    text: 'Bedtime depends on whether tomorrow is an office day.',
    run(k, t) { state.lampOn = false; chair.position.set(-4.0, 0, -3.05); inBed(); zzz.on = true; return indoors(orbit([0.9, 2.5, 3.1, 3.1, 0.7, 1.1], t, 0.2)); } },

  { date: 2, from: 7.4, to: 8.4, dur: 40, title: 'Office day: waiting for the Uber',
    text: 'Eight days a month are office days. No car, so it starts at the kerb waiting for an Uber, then the robot at Jan Shoba Street and a long ride through the morning traffic.',
    run(k, t) { wear(me, 'work'); put(gf, ...SOFA_GF, 'sit', t); return ride(k, t, TO_WORK); } },

  { date: 2, from: 8.5, to: 17, dur: 13, title: `At ${STORY.workplace}`,
    text: 'Platform engineering, nine to five. After a late night, red eyes pick the desk furthest from the manager.',
    run(k, t) {
      wear(me, 'work'); gfHome(t);
      put(me, ...W('office', 3.6, -2.0), 0, 'type', t);
      me.say = k < 0.55 ? '🥴' : '👀';
      return k < 0.55 ? orbit(camAt6('office', [1.5, 4.2, 7.5, -0.2, 1.1, -1.6], 1), t) : orbit(camAt6('office', [5.0, 2.2, 1.6, 3.4, 1.25, -1.9], 2), t, 0.15);
    } },

  { date: 2, from: 17.05, to: 18.1, dur: 36, title: 'The ride home',
    text: 'Five o\'clock: back to the kerb, another wait, and Jan Shoba Street again in the evening traffic.',
    run(k, t) { wear(me, 'work'); gfHome(t); return ride(k, t, TO_HOME); } },

  { date: 13, from: 21.5, to: 23.75, dur: 20, title: 'Saturday night: Drama',
    text: 'Weekends mean groove, dressed for it, and it is close enough to walk over to Burnett Street. First stop, Drama. Stella Artois draught for him; Bernini, Extreme or Flying Fish for her.',
    run(k, t) {
      goingOut();
      if (k < 0.16) return stroll([DOOR, [8, 4.1]], k / 0.16, t, 0);
      if (k < 0.34) return stroll([W('drama', -6, 4.3), W('drama', -0.7, 4.3), W('drama', -0.7, 1.3)], (k - 0.16) / 0.18, t, 1);
      return onTheFloor(clubs[0], t, ['🍺 Stella draught', '🍾 Bernini'], false, k > 0.7);
    } },

  { date: 13, from: 23.75, to: 26, dur: 18, title: 'Ekhaya, a few doors down',
    text: 'Same street, next venue. Hubbly on the table, music up, and a crowd having a good time. Both places close at 2am.',
    run(k, t) {
      goingOut();
      if (k < 0.38) return stroll([W('drama', -0.7, 1.3), W('drama', -0.7, 4.3), W('ekhaya', -0.7, 4.3), W('ekhaya', -0.7, 1.3)], k / 0.38, t, 0);
      return onTheFloor(clubs[1], t, ['🍺 draught', '🐟 Flying Fish'], k > 0.7);
    } },

  { date: 14, from: 26, to: 28, dur: 17, title: 'Blue Room till 4',
    text: 'When those two close, the night moves over to Arcadia Street: Blue Room, open until 4am.',
    run(k, t) {
      goingOut();
      if (k < 0.17) return stroll([W('ekhaya', 2.5, 2.4), W('ekhaya', 2.5, 4.3), W('ekhaya', -3, 4.3)], k / 0.17, t, 0);
      if (k < 0.37) return stroll([W('blue', 6, 4.3), W('blue', -0.7, 4.3), W('blue', -0.7, 1.3)], (k - 0.17) / 0.2, t, 1);
      return onTheFloor(clubs[2], t, ['🍺 last one', '⚡ Extreme']);
    } },

  { date: 14, from: 28, to: 28.3, dur: 15, title: 'The 4am stop',
    text: 'On the way back, the McDonald\'s on Burnett Street: a mini burger, chips and six nuggets.',
    run(k, t) {
      goingOut();
      if (k < 0.2) return stroll([W('blue', -0.7, 1.3), W('blue', -0.7, 4.3), W('blue', 5, 4.3)], k / 0.2, t, 0);
      if (k < 0.46) return stroll([W('burger', -8, 4.3), W('burger', -0.8, 4.3)], (k - 0.2) / 0.26, t, 1);
      put(me, ...W('burger', -0.8, 4.3), PI, 'stand', t); put(gf, ...W('burger', 0.4, 4.1), PI, 'stand', t); hold(gf.item, 'bag');
      gf.say = '🍔 mini burger · 🍟 chips · 6 nuggets';
      return orbit(camAt6('burger', [3.5, 3.2, 10.5, -0.2, 1.4, 3.4], 2), t, 0.3);
    } },

  { date: 14, from: 28.3, to: 28.9, dur: 30, title: 'Uber home',
    text: 'Then the wait for a ride, and the empty roads back to the apartment.',
    run(k, t) { goingOut(); if (k < 0.31) hold(gf.item, 'bag'); return ride(k, t, NIGHT_HOME); } },

  { date: 14, from: 11.5, to: 13.5, dur: 12, title: 'Sunday',
    text: 'Hungover, and breakfast is long gone. Lunch is eggs.',
    run(k, t) {
      state.indoor = true;
      if (k < 0.4) { inBed(); me.say = '🤕'; gf.say = '😵‍💫'; return orbit([0.9, 2.5, 3.1, 3.1, 0.7, 1.1, 0], t, 0.2); }
      put(me, 1.5, -2.42, PI, 'stir', t); put(gf, ...SOFA_GF, 'sit', t); gf.say = '🤕'; me.say = '🍳'; state.eggs = true;
      return orbit([4.0, 2.7, 1.0, 1.2, 1.15, -3, 1], t, 0.25);
    } },

  { date: (k) => 15 + Math.min(13, Math.floor(k * 14)), from: 9, to: 23, dur: 15, title: 'And the rest of the month',
    text: 'It repeats until month end: eight office days in all, about twenty remote ones, wine and cards most evenings, and groove every weekend.',
    run(k, t) {
      if (k < 0.34) { put(me, ...DESK, 'type', t); gfHome(t); state.music = true; return indoors(orbit([-1.6, 2.8, 1.3, -4.4, 1.05, -1.5, 0], t, 0.2)); }
      if (k < 0.67) { wear(me, 'work'); gfHome(t); put(me, ...W('office', 3.6, -2.0), 0, 'type', t); return orbit(camAt6('office', [1.5, 4.2, 7.5, -0.2, 1.1, -1.6], 1), t); }
      goingOut(); return onTheFloor(clubs[0], t, ['🍺', '🍾']);
    } },
];

/* ------------------------------------------------------------------ HUD + playback */

const OFFICE_DAYS = [2, 4, 9, 11, 16, 18, 23, 25], DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
$('#cal').innerHTML = Array.from({ length: 28 }, (_, i) => { const d = i + 1; return `<i class="${OFFICE_DAYS.includes(d) ? 'office' : i % 7 > 4 ? 'weekend' : ''}" title="Day ${d}"></i>`; }).join('');
const calEls = [...$('#cal').children];
let shownDate = 0;
function showDate(d) {
  if (d === shownDate) return;
  shownDate = d;
  calEls.forEach((el, i) => { el.classList.toggle('past', i + 1 < d); el.classList.toggle('now', i + 1 === d); });
  $('#day').textContent = `Week ${Math.ceil(d / 7)} · ${DAY[(d - 1) % 7]}`;
}

let idx = 0, chT = 0, playing = true;
$('#dots').innerHTML = chapters.map((c, i) => `<button data-go="${i}" title="${c.title}"><i></i></button>`).join('');
const dotEls = [...$('#dots').children];
function go(i) {
  idx = (i + chapters.length) % chapters.length; chT = 0;
  const c = chapters[idx];
  $('#title').textContent = c.title; $('#text').textContent = c.text;
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
loadPeople().catch((err) => console.error('people failed to load', err));
window.__life = { go, seek: (k) => { chT = k * chapters[idx].dur; }, me, gf, actors, THREE, TW }; // handy for jumping around while editing

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  if (playing) chT += dt;
  const ch = chapters[idx], k = clamp01(chT / ch.dur);

  // Defaults for this frame; the chapter then overrides what it needs.
  for (const a of [me, gf]) { a.g.visible = true; a.say = ''; a.item.visible = a.itemL.visible = a.fan.visible = false; wear(a, 'home'); }
  chair.position.set(-3.78, 0, -1.5);
  car.visible = cards.visible = blanket.visible = false; state.indoor = false;
  steam.on = zzz.on = false; state.music = false; state.lampOn = true; state.eggs = false; state.reserved = [];
  for (const J of junctions) J.force = null;
  potTag.element.textContent = '';

  const want = ch.run(k, t);
  const narrow = !want[8] && innerWidth / innerHeight < 0.8 ? 1.55 : 1;
  wantLook.set(want[3], want[4], want[5]);
  wantPos.set(want[0], want[1], want[2]).sub(wantLook).multiplyScalar(narrow).add(wantLook);
  const cutKey = idx + ':' + (want[6] || 0), jumped = cutKey !== lastCut;
  if (state.indoor) wantPos.set(THREE.MathUtils.clamp(wantPos.x, -4.85, 4.85), THREE.MathUtils.clamp(wantPos.y, 0.6, 3.3), THREE.MathUtils.clamp(wantPos.z, -3.35, 3.35));
  const f = jumped || want[8] ? 1 : 1 - Math.exp(-dt * 2.6);
  const fov = want[7] || 40;
  camera.fov = jumped ? fov : camera.fov + (fov - camera.fov) * f; camera.updateProjectionMatrix();
  lastCut = cutKey;
  camPos.lerp(wantPos, f); camLook.lerp(wantLook, f);
  camera.position.copy(camPos); camera.lookAt(camLook);
  fill.position.copy(camPos).lerp(camLook, 0.35); fill.position.y += 1.2;
  sun.target.position.copy(camLook); sun.position.copy(camLook).add(tmpV.set(16, 30, 14));
  stars.position.copy(camPos);

  for (const a of [me, gf]) { if (a.say !== a.said) { a.said = a.say; a.bubble.element.textContent = a.say; } a.bubble.userData.on = !!a.say; }
  potTag.userData.on = !!potTag.element.textContent;
  pot.visible = !state.eggs;
  notes.on = state.music && idx < 6;

  // Calendar, clock, sky and light follow the date and time of day.
  showDate(typeof ch.date === 'function' ? ch.date(k) : ch.date);
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
  lamp.intensity = state.lampOn ? lerp(3, 16, night) : 1.2;
  shade.material.color.setHex(state.lampOn && night > 0.3 ? 0xd9b98a : 0x6b5a45);
  officeLight.intensity = lerp(18, 5, dayAmt);
  carLight.intensity = car.visible ? night * 9 : 0;

  updateTraffic(dt, t, hour > 0.5 && hour < 5.5, state.reserved, jumped);

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

  animatePeople(dt, camPos);
  loops.forEach((e) => e.update(t));
  for (const { o, far } of tags) { let shown = o.userData.on !== false; for (let p = o.parent; p && shown; p = p.parent) shown = p.visible; o.visible = shown && o.getWorldPosition(tmpV).distanceTo(camera.position) < far; }

  composer.render();
  labels.render(scene, camera);
  if (playing && k >= 1) go(idx + 1);
});
