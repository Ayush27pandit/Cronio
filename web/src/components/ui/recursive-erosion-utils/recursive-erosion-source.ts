export const recursiveErosionSource = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Recursive Erosion</title>
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#0a0908}
  #stage{width:100vw;height:100vh;position:relative;overflow:hidden;background:radial-gradient(ellipse at center, #1a1816 0%, #0a0908 55%, #050403 100%)}
  canvas{display:block;width:100%;height:100%}
  .vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 85%)}
  .grain{position:absolute;inset:0;pointer-events:none;opacity:0.04;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")}
</style>
<script async src="https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js"></script>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>
</head>
<body>
<div id="stage"><canvas id="c"></canvas><div class="vignette"></div><div class="grain"></div></div>
<script type="module">
import * as THREE from 'three';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0908, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0908, 8, 22);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.6, 9.2);

const group = new THREE.Group();
scene.add(group);

// Particle sphere with recursive erosion
const COUNT = 18000;
const R = 2.85;
const positions = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);
const sizes = new Float32Array(COUNT);
const speeds = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  const phi = Math.acos(1 - 2 * (i / COUNT));
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  const r = R * (0.985 + Math.random() * 0.03);
  const x = r * Math.cos(theta) * Math.sin(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(phi);
  positions[i*3] = x;
  positions[i*3+1] = y;
  positions[i*3+2] = z;
  // muted erosion palette: desaturated to keep text readable, text is white on black
  const warm = Math.random();
  if (warm > 0.92) {
    colors[i*3] = 0.68; colors[i*3+1] = 0.58; colors[i*3+2] = 0.42;
  } else if (warm > 0.72) {
    colors[i*3] = 0.55; colors[i*3+1] = 0.42; colors[i*3+2] = 0.32;
  } else if (warm > 0.45) {
    colors[i*3] = 0.42; colors[i*3+1] = 0.32; colors[i*3+2] = 0.28;
  } else {
    colors[i*3] = 0.18; colors[i*3+1] = 0.16; colors[i*3+2] = 0.15;
  }
  sizes[i] = Math.random() * 0.9 + 0.25;
  speeds[i] = Math.random() * 0.6 + 0.4;
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const mat = new THREE.PointsMaterial({
  size: 0.042,
  vertexColors: true,
  transparent: true,
  opacity: 0.38,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const points = new THREE.Points(geo, mat);
group.add(points);

// Erosion trails - visible small trails that trace surface
const trailCount = 420;
const trailGeo = new THREE.BufferGeometry();
const trailPos = new Float32Array(trailCount * 3);
for (let i=0;i<trailCount;i++){
  const a = Math.random()*Math.PI*2;
  const r = R * (0.98 + Math.random()*0.04);
  trailPos[i*3]= Math.cos(a)*r;
  trailPos[i*3+1]= (Math.random()-0.5)*0.6;
  trailPos[i*3+2]= Math.sin(a)*r;
}
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos,3));
const trailMat = new THREE.PointsMaterial({ color: 0x8ec8ff, size: 0.14, transparent:true, opacity:0.92, blending: THREE.AdditiveBlending, depthWrite:false });
const trails = new THREE.Points(trailGeo, trailMat);
group.add(trails);
// Trail glow halo
const trailHaloMat = new THREE.PointsMaterial({ color: 0x3b82f6, size: 0.28, transparent:true, opacity:0.18, blending: THREE.AdditiveBlending, depthWrite:false });
const trailsHalo = new THREE.Points(trailGeo, trailHaloMat);
group.add(trailsHalo);

// Lights
const hemi = new THREE.HemisphereLight(0xffe8cc, 0x0a0908, 0.9);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffd6a0, 1.1);
dir.position.set(4, 6, 5);
scene.add(dir);
const rim = new THREE.PointLight(0xff6a2a, 2.2, 20);
rim.position.set(-5, -2, -4);
scene.add(rim);

function resize(){
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h){
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
// mouse hover handling
const mouse = new THREE.Vector2(0, 0);
const targetRot = new THREE.Vector2(0, 0);
let isHovering = false;
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  targetRot.x = mouse.y * 0.12;
  targetRot.y = mouse.x * 0.18;
  isHovering = true;
});
canvas.addEventListener('mouseleave', () => {
  isHovering = false;
  targetRot.set(0,0);
});
canvas.addEventListener('touchmove', (e) => {
  if (!e.touches[0]) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
  targetRot.x = mouse.y * 0.12;
  targetRot.y = mouse.x * 0.18;
  isHovering = true;
}, {passive:true});

// small trails: keep previous position for line trail effect via extra points
const trailVelocities = new Float32Array(trailCount * 3);
for(let i=0;i<trailCount*3;i++) trailVelocities[i] = (Math.random()-0.5)*0.002;

let t = 0;
let currentRotX = 0, currentRotY = 0;
function animate(){
  requestAnimationFrame(animate);
  t += 0.00055;
  resize();
  // slow rotation, lerp to mouse target when hovering
  currentRotX += (targetRot.x - currentRotX) * 0.02;
  currentRotY += (targetRot.y - currentRotY) * 0.02;
  group.rotation.y = t * 4.5 + currentRotY;
  group.rotation.x = Math.sin(t * 2.5) * 0.04 + currentRotX * 0.5;
  group.rotation.z = Math.cos(t * 1.8) * 0.02;
  // subtle erosion pulse slower
  const pulse = Math.sin(t * 4) * 0.025 + 1;
  group.scale.set(pulse, pulse, pulse);
  // drift trails with small trails and mouse influence
  const pos = trailGeo.attributes.position;
  for(let i=0;i<trailCount;i++){
    const i3=i*3;
    // base drift
    pos.array[i3] += Math.sin(t*1.2 + i) * 0.0006 + trailVelocities[i3];
    pos.array[i3+1] += Math.cos(t*0.9 + i*0.7) * 0.0004 + trailVelocities[i3+1];
    pos.array[i3+2] += Math.sin(t*0.7 + i*0.3) * 0.0005;
    // mouse hover: repel particles near cursor projection
    if (isHovering) {
      const dist = Math.sqrt(pos.array[i3]*pos.array[i3] + pos.array[i3+1]*pos.array[i3+1]);
      const influence = Math.max(0, 1 - dist / 3.5) * 0.015;
      pos.array[i3] += mouse.x * influence;
      pos.array[i3+1] += mouse.y * influence;
    }
    // keep on sphere surface with small trail jitter
    const len = Math.sqrt(pos.array[i3]*pos.array[i3] + pos.array[i3+1]*pos.array[i3+1] + pos.array[i3+2]*pos.array[i3+2]);
    if (len > R*1.08 || len < R*0.92) {
      const s = R / len;
      pos.array[i3] *= s;
      pos.array[i3+1] *= s;
      pos.array[i3+2] *= s;
    }
  }
  pos.needsUpdate = true;
  // interactive particle hover: particles near mouse glow and grow with small trails
  const pPos = geo.attributes.position;
  const pColors = geo.attributes.color;
  const baseSizes = new Float32Array(sizes);
  for(let i=0;i<COUNT;i++){
    const i3=i*3;
    const dx = pPos.array[i3] - mouse.x * R * 0.7;
    const dy = pPos.array[i3+1] - mouse.y * R * 0.7;
    const d2 = dx*dx + dy*dy;
    // restore toward base
    sizes[i] += (baseSizes[i] - sizes[i]) * 0.06;
    if (isHovering && d2 < 0.42) {
      const hover = (0.42 - d2) / 0.42;
      pColors.array[i3] = Math.min(1, pColors.array[i3] + hover * 0.18);
      pColors.array[i3+1] = Math.min(1, pColors.array[i3+1] + hover * 0.12);
      sizes[i] = Math.min(1.8, sizes[i] * (1 + hover * 0.5));
      // small trail: nudge position slightly along normal for hover particles
      const n = 0.008 * hover;
      pPos.array[i3] += n * (Math.random()-0.5);
      pPos.array[i3+1] += n * (Math.random()-0.5);
      pPos.array[i3+2] += n * (Math.random()-0.5);
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  geo.attributes.size.needsUpdate = true;
  // gentle flicker slower
  mat.opacity = isHovering ? 0.96 : 0.88 + Math.sin(t*3)*0.04;
  trailMat.opacity = isHovering ? 0.92 : 0.62 + Math.sin(t*2)*0.08;
  const hoverScale = isHovering ? 1.015 : 1;
  group.scale.multiplyScalar(hoverScale);
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', resize);
resize();
<\/script>
</body>
</html>`;
