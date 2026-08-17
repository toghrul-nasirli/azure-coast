import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ============================================================
   Azure Coast — a mini Sea-Breeze-style 3D master plan.
   Every building is generated in code (no modeled assets).
   To swap in a real architect model later, see loadCustomModel()
   at the bottom of this file.
   ============================================================ */

// ---------- palette ----------
const DAY = {
  bg: 0xe9d9c0, fog: 0xe9d9c0, fogNear: 700, fogFar: 1800,
  water: 0x5f958f, sand: 0xe6d3ac, land: 0xded0b4, park: 0xa8b183,
  hemiSky: 0xfff3e0, hemiGround: 0xcbb894, hemiInt: 1.15,
  sunColor: 0xffe8c8, sunInt: 2.2, emissive: 0.0, cloudOpacity: 0.4,
};
const NIGHT = {
  bg: 0x16233a, fog: 0x16233a, fogNear: 600, fogFar: 1700,
  water: 0x1f3d52, sand: 0x4a5266, land: 0x424c60, park: 0x35474a,
  hemiSky: 0x51678f, hemiGround: 0x2a3448, hemiInt: 1.5,
  sunColor: 0x9db8e8, sunInt: 0.55, emissive: 1.4, cloudOpacity: 0.12,
};

// ---------- residences (fictional) ----------
const RESIDENCES = [
  {
    id: 'crescent', name: 'Crescent Marina', year: 'Delivery 2027',
    anchor: [-235, 30, -20],
    desc: 'A premium residential arc embracing the marina bay. Low-rise white terraces step down to private moorings, framed by landscaped promenades and open sea views on both sides.',
    art: ['#5f958f', '#e6d3ac'],
  },
  {
    id: 'lighthouse', name: 'Lighthouse Bay', year: 'Delivery 2027',
    anchor: [60, 95, -45],
    desc: 'Sixteen snow-white towers with tall transparent windows and open terraces reflecting the beauty of coastal life. A bright quarter surrounded by palm trees and bespoke landscape design.',
    art: ['#d99a4e', '#f4efe6'],
  },
  {
    id: 'panorama', name: 'Panorama Towers', year: 'Delivery 2028',
    anchor: [210, 40, -95],
    desc: 'Mid-rise gallery residences arranged on a calm orthogonal grid. Every apartment opens to a double-height loggia with a view over the parks toward the sea.',
    art: ['#274a63', '#a8b183'],
  },
  {
    id: 'gardens', name: 'Garden Villas', year: 'Delivery 2026',
    anchor: [45, 18, 165],
    desc: 'Rows of family villas with terracotta roofs and private gardens, five minutes on foot from the central beach. A quiet neighbourhood built around shaded courtyards.',
    art: ['#c9805e', '#a8b183'],
  },
  {
    id: 'porto', name: 'Porto Verde', year: 'Delivery 2028',
    anchor: [210, 30, 110],
    desc: 'Courtyard blocks around a green ravine park. Retail arcades at street level, roof gardens above, and a direct pedestrian axis to the marina promenade.',
    art: ['#2e6f6a', '#e6d3ac'],
  },
  {
    id: 'star', name: 'Star Plaza', year: 'Delivery 2029',
    anchor: [-262, 60, -132],
    desc: 'The landmark of the bay: a slender spire on a star-shaped island plaza at the tip of the crescent, hosting a boutique hotel, an observation deck and a yacht club.',
    art: ['#f4efe6', '#274a63'],
  },
];

// ---------- deterministic pseudo-random ----------
let seed = 1337;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function rr(a, b) { return a + rnd() * (b - a); }

// ---------- renderer / scene ----------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(DAY.bg);
scene.fog = new THREE.Fog(DAY.fog, DAY.fogNear, DAY.fogFar);

// ?embed strips the HUD so the bare scene can be framed by another page
if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embed');

const mobileQuery = matchMedia('(max-width: 768px)');
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 1, 4000);
// portrait screens need to start further out to fit the whole coast
if (mobileQuery.matches) camera.position.set(560, 430, 620);
else camera.position.set(430, 330, 480);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(20, 0, 10);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 140;
controls.maxDistance = 1100;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = 1.32;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.25;
renderer.domElement.addEventListener('pointerdown', () => {
  controls.autoRotate = false;
  document.getElementById('hint').classList.add('hidden');
}, { once: true });

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemiInt);
scene.add(hemi);

const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sunInt);
sun.position.set(320, 420, 180);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -520; sc.right = 520; sc.top = 520; sc.bottom = -520;
sc.near = 50; sc.far = 1200;
sun.shadow.bias = -0.0004;
scene.add(sun);

// ---------- materials ----------
function windowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 256, 256);
  const cols = 4, rows = 4, cw = 256 / cols, ch = 256 / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rnd() < 0.55) {
        const warm = rnd() < 0.8;
        g.fillStyle = warm ? '#ffc878' : '#bcd8ff';
        g.globalAlpha = rr(0.5, 1);
        g.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.2, cw * 0.56, ch * 0.6);
        g.globalAlpha = 1;
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const winTex = windowTexture();
const sideMat = new THREE.MeshStandardMaterial({
  color: 0xf7f3ea, roughness: 0.92, metalness: 0,
  emissive: 0xffbe78, emissiveMap: winTex, emissiveIntensity: 0,
});
const roofMat = new THREE.MeshStandardMaterial({ color: 0xefe9dc, roughness: 0.95 });
const landMat = new THREE.MeshStandardMaterial({ color: DAY.land, roughness: 1 });
const sandMat = new THREE.MeshStandardMaterial({ color: DAY.sand, roughness: 1 });
const parkMat = new THREE.MeshStandardMaterial({ color: DAY.park, roughness: 1 });
const roadMat = new THREE.MeshStandardMaterial({ color: 0xcfc2a4, roughness: 1 });
const waterMat = new THREE.MeshStandardMaterial({ color: DAY.water, roughness: 0.45, metalness: 0.05 });
const villaMat = new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.92 });
const villaRoofMat = new THREE.MeshStandardMaterial({ color: 0xd08a66, roughness: 0.95 });
const treeMat = new THREE.MeshStandardMaterial({ color: 0x7fa06b, roughness: 1 });
const treeDarkMat = new THREE.MeshStandardMaterial({ color: 0x5f8757, roughness: 1 });

// ---------- water ----------
const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), waterMat);
water.rotation.x = -Math.PI / 2;
water.position.y = 0;
water.receiveShadow = true;
scene.add(water);

// ---------- land masses ----------
// helper: build a flat extruded plate from plan points [[x,z],...]
function plate(points, depth, material, smooth = true) {
  const shape = new THREE.Shape();
  const v2 = points.map(p => new THREE.Vector2(p[0], -p[1]));
  if (smooth) {
    shape.moveTo(v2[0].x, v2[0].y);
    shape.splineThru(v2.slice(1).concat([v2[0]]));
  } else {
    shape.moveTo(v2[0].x, v2[0].y);
    v2.slice(1).forEach(p => shape.lineTo(p.x, p.y));
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  m.castShadow = false;
  return m;
}

const COAST = [
  [-30, -290], [40, -230], [-20, -140], [-70, -60], [-60, 40],
  [-15, 130], [-40, 220], [60, 290], [230, 310], [420, 260],
  [470, 60], [440, -160], [330, -300], [140, -330],
];
// beach = same outline, slightly inflated around its centroid
const cx = COAST.reduce((s, p) => s + p[0], 0) / COAST.length;
const cz = COAST.reduce((s, p) => s + p[1], 0) / COAST.length;
const BEACH = COAST.map(p => [cx + (p[0] - cx) * 1.07, cz + (p[1] - cz) * 1.07]);

scene.add(plate(BEACH, 3.2, sandMat));
scene.add(plate(COAST, 6, landMat));

// crescent island
function crescent(cxp, czp, rOut, rIn, a0, a1) {
  const s = new THREE.Shape();
  s.absarc(cxp, -czp, rOut, a0, a1, false);
  s.absarc(cxp, -czp, rIn, a1, a0, true);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, landMat);
  m.receiveShadow = true;
  return m;
}
const CRE = { x: -235, z: -20, rOut: 95, rIn: 58, a0: -1.05, a1: 3.85 };
scene.add(crescent(CRE.x, CRE.z, CRE.rOut, CRE.rIn, CRE.a0, CRE.a1));
// sandy rim of the crescent
const rim = crescent(CRE.x, CRE.z, CRE.rOut + 6, CRE.rIn - 6, CRE.a0 - 0.06, CRE.a1 + 0.06);
rim.material = sandMat;
rim.scale.y = 0.55;
scene.add(rim);

// star plaza island at the crescent tip + causeway to it
const STAR = { x: -262, z: -132 };
function starPlate(x, z, rOut, rIn, spikes, depth, mat) {
  const s = new THREE.Shape();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = -z + Math.sin(a) * r;
    i === 0 ? s.moveTo(px, py) : s.lineTo(px, py);
  }
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}
scene.add(starPlate(STAR.x, STAR.z, 26, 16, 8, 5, sandMat));
scene.add(starPlate(STAR.x, STAR.z, 18, 11, 8, 6.5, landMat));

function causeway(x1, z1, x2, z2, w) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 4.5, w), sandMat);
  m.position.set((x1 + x2) / 2, 2.2, (z1 + z2) / 2);
  m.rotation.y = -Math.atan2(dz, dx);
  m.receiveShadow = true;
  return m;
}
// star island to crescent tip, and crescent to mainland
scene.add(causeway(STAR.x, STAR.z, -228, -110, 10));
scene.add(causeway(-150, -8, -68, -10, 14));

// spire landmark on the star plaza
const spire = new THREE.Mesh(new THREE.ConeGeometry(4.5, 58, 6), roofMat);
spire.position.set(STAR.x, 6.5 + 29, STAR.z);
spire.castShadow = true;
scene.add(spire);

// ---------- buildings ----------
const CELL_W = 16, CELL_H = 14; // world size covered by one full window texture tile

function buildingGeometry(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    let su = 1, sv = 1;
    if (i < 8) { su = d / CELL_W; sv = h / CELL_H; }        // ±x faces
    else if (i < 16) { su = 0; sv = 0; }                    // top/bottom: kill windows
    else { su = w / CELL_W; sv = h / CELL_H; }              // ±z faces
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  return geo;
}

const buildings = new THREE.Group();
scene.add(buildings);

// footprint registry: every structure reserves a circle in plan; randomly
// placed structures and trees must not land inside an existing one
const placed = [];
function overlaps(x, z, r) {
  return placed.some(p => (x - p.x) ** 2 + (z - p.z) ** 2 < (r + p.r) ** 2);
}
function footprint(w, d) { return Math.hypot(w, d) / 2 + 1.5; }

function addBuilding(x, z, w, h, d, rotY = 0) {
  const m = new THREE.Mesh(buildingGeometry(w, h, d), [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat]);
  m.position.set(x, 6 + h / 2, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  m.receiveShadow = true;
  buildings.add(m);
  placed.push({ x, z, r: footprint(w, d) });
  return m;
}

// random placement with collision rejection; gives up quietly after 60 tries
function tryAddBuilding(area, w, h, d, rotY = 0) {
  for (let t = 0; t < 60; t++) {
    const [x, z] = area();
    if (!overlaps(x, z, footprint(w, d))) return addBuilding(x, z, w, h, d, rotY);
  }
  return null;
}

// -- towers cluster (Lighthouse Bay) --
for (let i = 0; i < 14; i++) {
  tryAddBuilding(() => [rr(0, 140), rr(-115, 15)], rr(14, 22), rr(38, 88), rr(14, 22), rr(-0.2, 0.2));
}
// podium slabs between towers
for (let i = 0; i < 6; i++) {
  tryAddBuilding(() => [rr(-10, 150), rr(-125, 25)], rr(26, 40), rr(8, 14), rr(18, 26));
}

// -- mid-rise grid (Panorama) --
for (let gx = 0; gx < 5; gx++) {
  for (let gz = 0; gz < 4; gz++) {
    if (rnd() < 0.15) continue;
    const x = 160 + gx * 44 + rr(-4, 4);
    const z = -170 + gz * 46 + rr(-4, 4);
    addBuilding(x, z, rr(26, 34), rr(14, 30), rr(12, 16));
  }
}

// -- courtyard blocks (Porto Verde) --
for (let gx = 0; gx < 4; gx++) {
  for (let gz = 0; gz < 3; gz++) {
    const bx = 150 + gx * 52, bz = 60 + gz * 52;
    // four bars around a courtyard
    addBuilding(bx, bz - 16, 36, rr(12, 20), 8);
    addBuilding(bx, bz + 16, 36, rr(12, 20), 8);
    if (rnd() < 0.8) addBuilding(bx - 16, bz, 8, rr(12, 20), 22);
    if (rnd() < 0.8) addBuilding(bx + 16, bz, 8, rr(12, 20), 22);
  }
}

// -- crescent arc buildings --
for (let i = 0; i < 20; i++) {
  const a = CRE.a0 + 0.35 + (i / 19) * (CRE.a1 - CRE.a0 - 0.7);
  const r = (CRE.rOut + CRE.rIn) / 2;
  const x = CRE.x + Math.cos(a) * r;
  const z = CRE.z - Math.sin(a) * r; // shape plane y is -z
  const w = rr(13, 18);
  if (!overlaps(x, z, footprint(w, 13))) addBuilding(x, z, w, rr(10, 26), 13, a);
}

// -- scattered coast towers north --
for (let i = 0; i < 6; i++) {
  tryAddBuilding(() => [rr(40, 130), rr(-260, -170)], rr(14, 20), rr(24, 52), rr(14, 20), rr(0, 0.4));
}

// -- villas (instanced) --
const villaBody = new THREE.BoxGeometry(7.5, 4.5, 6.5);
const villaRoof = new THREE.ConeGeometry(5.4, 3.2, 4);
const VILLA_ROWS = [];
for (let row = 0; row < 7; row++) {
  for (let k = 0; k < 12; k++) {
    VILLA_ROWS.push({ x: -8 + k * 11 + rr(-1, 1), z: 120 + row * 16 + rr(-1.2, 1.2) });
  }
}
VILLA_ROWS.forEach(v => placed.push({ x: v.x, z: v.z, r: 6 }));
const villaBodies = new THREE.InstancedMesh(villaBody, villaMat, VILLA_ROWS.length);
const villaRoofs = new THREE.InstancedMesh(villaRoof, villaRoofMat, VILLA_ROWS.length);
villaBodies.castShadow = villaRoofs.castShadow = true;
villaBodies.receiveShadow = true;
{
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  const qr = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
  VILLA_ROWS.forEach((v, i) => {
    m4.compose(new THREE.Vector3(v.x, 6 + 2.25, v.z), q, s);
    villaBodies.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(v.x, 6 + 4.5 + 1.6, v.z), qr, s);
    villaRoofs.setMatrixAt(i, m4);
  });
}
scene.add(villaBodies, villaRoofs);

// ---------- parks & trees ----------
const PARKS = [
  [70, 60, 130, 60],   // cx, cz, w, d
  [280, -30, 110, 50],
  [10, 250, 160, 50],
  [360, 160, 90, 70],
];
PARKS.forEach(p => {
  const g = new THREE.Mesh(new THREE.BoxGeometry(p[2], 1.6, p[3]), parkMat);
  g.position.set(p[0], 6.4, p[1]);
  g.receiveShadow = true;
  scene.add(g);
});

const TREE_N = 420;
const treeRound = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.6, 0), treeMat, TREE_N);
const treeTall = new THREE.InstancedMesh(new THREE.ConeGeometry(1.7, 6.5, 6), treeDarkMat, Math.floor(TREE_N / 2));
treeRound.castShadow = treeTall.castShadow = true;
{
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  let a = 0, b = 0;
  const drop = (x, z, kind) => {
    if (overlaps(x, z, 1.5)) return; // never inside a building or villa
    const sscale = rr(0.7, 1.5);
    if (kind === 0 && a < TREE_N) {
      m4.compose(new THREE.Vector3(x, 7 + 2.2 * sscale, z), q, new THREE.Vector3(sscale, sscale, sscale));
      treeRound.setMatrixAt(a++, m4);
    } else if (b < Math.floor(TREE_N / 2)) {
      m4.compose(new THREE.Vector3(x, 7 + 3 * sscale, z), q, new THREE.Vector3(sscale, sscale, sscale));
      treeTall.setMatrixAt(b++, m4);
    }
  };
  PARKS.forEach(p => {
    for (let i = 0; i < 70; i++) {
      drop(p[0] + rr(-p[2] / 2, p[2] / 2), p[1] + rr(-p[3] / 2, p[3] / 2), rnd() < 0.75 ? 0 : 1);
    }
  });
  // trees sprinkled between buildings and along the crescent
  for (let i = 0; i < 120; i++) drop(rr(-20, 420), rr(-260, 280), rnd() < 0.7 ? 0 : 1);
  for (let i = 0; i < 40; i++) {
    const ang = CRE.a0 + rnd() * (CRE.a1 - CRE.a0);
    const r = rr(CRE.rIn + 6, CRE.rOut - 6);
    drop(CRE.x + Math.cos(ang) * r, CRE.z - Math.sin(ang) * r, 0);
  }
  treeRound.count = a;
  treeTall.count = b;
}
scene.add(treeRound, treeTall);

// ---------- roads ----------
function road(x1, z1, x2, z2, w = 6) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, w), roadMat);
  m.position.set((x1 + x2) / 2, 6.3, (z1 + z2) / 2);
  m.rotation.y = -Math.atan2(dz, dx);
  m.receiveShadow = true;
  scene.add(m);
}
road(-40, -200, 60, 280, 9);       // coastal boulevard
road(-10, -120, 420, -140, 8);     // north avenue
road(-20, 100, 430, 90, 8);        // south avenue
for (let i = 0; i < 5; i++) road(140 + i * 52, -180, 140 + i * 52, 200, 5);

// ---------- clouds ----------
function cloudSprite() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const x = rr(50, 206), y = rr(45, 85), r = rr(22, 46);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,252,246,0.85)');
    grad.addColorStop(1, 'rgba(255,252,246,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const clouds = [];
for (let i = 0; i < 5; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudSprite(), transparent: true, opacity: DAY.cloudOpacity, depthWrite: false,
  }));
  sp.scale.set(rr(260, 420), rr(90, 150), 1);
  sp.position.set(rr(-500, 500), rr(150, 230), rr(-400, 400));
  clouds.push(sp);
  scene.add(sp);
}

// ---------- HTML pins ----------
const pinLayer = document.getElementById('pins');
const pinEls = RESIDENCES.map(r => {
  const el = document.createElement('div');
  el.className = 'pin';
  el.innerHTML = `<div class="head"><span>&#10022;</span></div>
    <div class="label">${r.name}<small>${r.year}</small></div>`;
  el.addEventListener('click', () => openResidence(r, el));
  pinLayer.appendChild(el);
  return el;
});

const panel = document.getElementById('panel');
let activePin = null;

function openResidence(r, el) {
  document.getElementById('panel-year').textContent = r.year;
  document.getElementById('panel-title').textContent = r.name;
  document.getElementById('panel-desc').textContent = r.desc;
  document.getElementById('panel-art').style.background =
    `linear-gradient(135deg, ${r.art[0]} 0%, ${r.art[1]} 100%)`;
  panel.classList.add('open');
  document.body.classList.add('panel-open');
  if (activePin) activePin.classList.remove('active');
  activePin = el;
  el.classList.add('active');
  applyViewOffset();
  flyTo(new THREE.Vector3(...r.anchor));
}
// on mobile the sheet covers the lower 62% of the screen, so while it is
// open, shift the rendered view up so the focused building stays visible
function applyViewOffset() {
  if (mobileQuery.matches && panel.classList.contains('open')) {
    camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.31, innerWidth, innerHeight);
  } else {
    camera.clearViewOffset();
  }
}

function closePanel() {
  panel.classList.remove('open');
  document.body.classList.remove('panel-open');
  if (activePin) activePin.classList.remove('active');
  activePin = null;
  applyViewOffset();
}
document.getElementById('panel-close').addEventListener('click', closePanel);
addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// ---------- camera fly-to ----------
let fly = null;
function flyTo(target) {
  controls.autoRotate = false;
  const dir = camera.position.clone().sub(controls.target);
  dir.y = 0;
  // narrower portrait fov: stay further back so the quarter fits the frame
  dir.normalize().multiplyScalar(mobileQuery.matches ? 330 : 240);
  const endPos = target.clone().add(dir).add(new THREE.Vector3(0, mobileQuery.matches ? 230 : 170, 0));
  const endTgt = target.clone().setY(Math.min(target.y, 30));
  fly = {
    t: 0,
    p0: camera.position.clone(), p1: endPos,
    t0: controls.target.clone(), t1: endTgt,
  };
}
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ---------- day / night ----------
const btnDay = document.getElementById('btn-day');
const btnNight = document.getElementById('btn-night');
let mode = DAY;
function setMode(m, isNight) {
  mode = m;
  document.body.classList.toggle('night', isNight);
  btnDay.classList.toggle('on', !isNight);
  btnNight.classList.toggle('on', isNight);
  scene.background.set(m.bg);
  scene.fog.color.set(m.fog);
  scene.fog.near = m.fogNear; scene.fog.far = m.fogFar;
  waterMat.color.set(m.water);
  sandMat.color.set(m.sand);
  landMat.color.set(m.land);
  parkMat.color.set(m.park);
  hemi.color.set(m.hemiSky); hemi.groundColor.set(m.hemiGround); hemi.intensity = m.hemiInt;
  sun.color.set(m.sunColor); sun.intensity = m.sunInt;
  sideMat.emissiveIntensity = m.emissive;
  clouds.forEach(c => c.material.opacity = m.cloudOpacity);
}
btnDay.addEventListener('click', () => setMode(DAY, false));
btnNight.addEventListener('click', () => setMode(NIGHT, true));

// ---------- render loop ----------
const v3 = new THREE.Vector3();
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.4);
    const k = ease(fly.t);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.t >= 1) fly = null;
  }
  controls.update();

  clouds.forEach((c, i) => {
    c.position.x += dt * (2 + i * 0.6);
    if (c.position.x > 700) c.position.x = -700;
  });

  // project pins to screen space; write visibility only on change so the
  // CSS opacity transition is never retriggered mid-fade
  RESIDENCES.forEach((r, i) => {
    v3.set(...r.anchor).project(camera);
    const el = pinEls[i];
    const vis = v3.z <= 1 ? '1' : '0';
    if (el.dataset.vis !== vis) {
      el.dataset.vis = vis;
      el.style.opacity = vis;
      el.style.pointerEvents = vis === '1' ? 'auto' : 'none';
    }
    if (vis === '0') return;
    el.style.left = `${(v3.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-v3.y * 0.5 + 0.5) * innerHeight}px`;
  });

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  applyViewOffset();
});

// splash out
setTimeout(() => document.getElementById('splash').classList.add('hidden'), 700);

/* ============================================================
   loadCustomModel — drop-in point for real architectural assets.
   Export your master plan from Blender/SketchUp/Revit as glTF,
   optimize it (npx @gltf-transform/cli optimize in.glb out.glb),
   put it at ./assets/masterplan.glb, then call this instead of
   the procedural generators above:

   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
   async function loadCustomModel() {
     const gltf = await new GLTFLoader().loadAsync('./assets/masterplan.glb');
     gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
     scene.add(gltf.scene);
   }
   Pins keep working: set each residence's `anchor` to the
   building's world position in the imported model.
   ============================================================ */
