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
  // warm erosion palette: from amber to ember to ash
  const warm = Math.random();
  if (warm > 0.92) {
    colors[i*3] = 1.0; colors[i*3+1] = 0.82; colors[i*3+2] = 0.32;
  } else if (warm > 0.72) {
    colors[i*3] = 0.98; colors[i*3+1] = 0.55; colors[i*3+2] = 0.12;
  } else if (warm > 0.45) {
    colors[i*3] = 0.9; colors[i*3+1] = 0.32; colors[i*3+2] = 0.06;
  } else {
    colors[i*3] = 0.22; colors[i*3+1] = 0.18; colors[i*3+2] = 0.16;
  }
  sizes[i] = Math.random() * 1.35 + 0.35;
  speeds[i] = Math.random() * 0.6 + 0.4;
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const mat = new THREE.PointsMaterial({
  size: 0.055,
  vertexColors: true,
  transparent: true,
  opacity: 0.92,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const points = new THREE.Points(geo, mat);
group.add(points);

// Erosion trails - small glowing particles that trace surface
const trailCount = 180;
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
const trailMat = new THREE.PointsMaterial({ color: 0xff8c32, size: 0.095, transparent:true, opacity:0.85, blending: THREE.AdditiveBlending, depthWrite:false });
const trails = new THREE.Points(trailGeo, trailMat);
group.add(trails);

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
let t = 0;
function animate(){
  requestAnimationFrame(animate);
  t += 0.0016;
  resize();
  group.rotation.y = t * 18;
  group.rotation.x = Math.sin(t * 7) * 0.08;
  group.rotation.z = Math.cos(t * 5) * 0.04;
  // subtle erosion pulse
  const pulse = Math.sin(t * 12) * 0.04 + 1;
  group.scale.set(pulse, pulse, pulse);
  // drift trails
  const pos = trailGeo.attributes.position;
  for(let i=0;i<trailCount;i++){
    const i3=i*3;
    pos.array[i3] += Math.sin(t*3 + i) * 0.0012;
    pos.array[i3+1] += Math.cos(t*2 + i*0.7) * 0.0008;
  }
  pos.needsUpdate = true;
  // flicker
  mat.opacity = 0.88 + Math.sin(t*9)*0.06;
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', resize);
resize();
<\/script>
</body>
</html>`;
