import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { buildModel } from './model.js?v=2';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const host = $('#canvas-host');
const loading = $('#loading');
let toastTimer;
function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2500);
}

// Reference viewer works independently of WebGL availability.
const photos = $$('.photo');
const dialog = $('#photo-dialog');
let currentPhoto = 0;
let photoCategory = 'all';
function filteredPhotos() { return photos.filter(p => photoCategory === 'all' || p.dataset.category === photoCategory); }
function nextPhoto(direction) {
  const filtered = filteredPhotos();
  const index = filtered.indexOf(photos[currentPhoto]);
  showPhoto(photos.indexOf(filtered[(index + direction + filtered.length) % filtered.length]));
}
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  photoCategory = button.dataset.filter;
  photos.forEach(p => { p.hidden = photoCategory !== 'all' && p.dataset.category !== photoCategory; });
  $$('[data-filter]').forEach(b => { const selected = b === button; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', selected); });
}));
function showPhoto(index) {
  currentPhoto = (index + photos.length) % photos.length;
  const source = photos[currentPhoto].querySelector('img');
  $('#large-photo').src = source.dataset.full || source.src; $('#large-photo').alt = source.alt;
  $('#photo-caption').textContent = `${String(currentPhoto + 1).padStart(2, '0')} / ${photos.length} · ${photos[currentPhoto].querySelector('span').textContent.replace(/\d|↗/g, '').trim()}`;
  if (!dialog.open) dialog.showModal();
}
photos.forEach((p, i) => p.addEventListener('click', () => showPhoto(i)));
$('#close-photo').addEventListener('click', () => dialog.close());
$('#prev-photo').addEventListener('click', () => nextPhoto(-1));
$('#next-photo').addEventListener('click', () => nextPhoto(1));
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') {e.preventDefault();nextPhoto(-1);} if (e.key === 'ArrowRight') {e.preventDefault();nextPhoto(1);} });

function startGallery() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#eeefe9');
  scene.fog = new THREE.Fog('#eeefe9', 32, 70);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); loading.textContent = '3D 显示暂时中断，请刷新页面重试。'; loading.classList.remove('hidden'); });
  renderer.domElement.addEventListener('webglcontextrestored', () => location.reload());
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .065;
  controls.enablePan = false; controls.minDistance = 8; controls.maxDistance = 31;
  controls.maxPolarAngle = Math.PI * .5 - .018; controls.autoRotateSpeed = .7;
  controls.target.set(-.25, 1.4, 0);
  scene.add(new THREE.HemisphereLight(0xfffdf4, 0xa3ab9a, 1.65));
  const key = new THREE.DirectionalLight(0xfff8e6, 2.3); key.position.set(3, 12, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
  key.shadow.normalBias = .035; key.shadow.bias = -.00015; key.shadow.radius = 4; scene.add(key);
  const fill = new THREE.DirectionalLight(0xeaf1ff, 1.1); fill.position.set(-6, 7, -8); scene.add(fill);
  const edge = new THREE.DirectionalLight(0xffffff, .6); edge.position.set(8, 4, -4); scene.add(edge);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(5.42, 5.48, .17, 96), new THREE.MeshStandardMaterial({ color: 0xe0e3d8, roughness: .88 }));
  platform.position.y = -.1; platform.receiveShadow = true; scene.add(platform);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xeeefe9, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.19; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(100, 100, 0xd1d6c6, 0xdde1d2); grid.position.y = -.185; grid.material.transparent = true; grid.material.opacity = .40; scene.add(grid);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.12, .008, 3, 128), new THREE.MeshBasicMaterial({ color: 0xc4ccb7 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -.005; scene.add(ring);
  const { model, chassis, creature, poseCreature, materials, meshCount } = buildModel(); scene.add(model);

  let mode = 'combined', separated = false, targetLift = 0, targetWing = 0, cameraMotion = null;
  let pose = 'standing', targetStand = 0, targetHead = 0;
  let view = 'perspective', autoRotate = false, wireframe = false;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const poses = { perspective: [10.8, 8.7, 12.2], side: [0, 5.0, 17.2], front: [17.0, 5.1, 0], top: [0, 19.0, .015] };
  function fitDistance() { return Math.max(1, .98 / camera.aspect); }
  function moveCamera(nextView, instant = false) {
    view = nextView;
    const target = new THREE.Vector3(mode === 'creature' ? .55 : -.25, mode === 'creature' ? (pose === 'standing' ? 2.4 : .6) : mode === 'split' ? 1.9 : separated ? 2.0 : 1.35, mode === 'creature' ? 0 : mode === 'split' ? .2 : 0);
    const offset = new THREE.Vector3(...poses[view]);
    if (mode === 'creature') offset.multiplyScalar(pose === 'standing' ? .74 : .86);
    if (mode === 'split') offset.multiplyScalar(1.16);
    const end = offset.multiplyScalar(fitDistance()).add(target);
    if (instant || reduceMotion.matches) { camera.position.copy(end); controls.target.copy(target); controls.update(); cameraMotion = null; }
    else cameraMotion = { from: camera.position.clone(), to: end, fromTarget: controls.target.clone(), toTarget: target, time: performance.now() };
    $$('[data-view]').forEach(b => { const yes = b.dataset.view === view; b.classList.toggle('selected', yes); b.setAttribute('aria-pressed', yes); });
  }
  function setAuto(value) { autoRotate = value; controls.autoRotate = value; $('#rotate').setAttribute('aria-checked', value); }
  function setSeparated(value) {
    separated = value; targetLift = value ? 1.75 : 0;
    $('#separate').setAttribute('aria-pressed', value);
    $('#separate span').textContent = value ? '还原组合结构' : '分层查看结构';
  }
  function setMode(value) {
    mode = value; chassis.visible = value !== 'creature'; creature.visible = value !== 'chassis';
    const independent = value === 'creature' || value === 'split';
    targetStand = independent && pose === 'standing' ? 1 : 0;
    setSeparated(false); $('#separate').disabled = value !== 'combined';
    $('#pose-controls').hidden = !independent;
    $('#wings').disabled = value === 'chassis'; $('#head-pitch').disabled = value === 'chassis';
    const descriptions = {combined:'翼龙伏在车顶，四点接口连接两部分。',split:'分离后的战车与翼龙，保持相同的模型比例。',creature:'独立查看长喙、肩部球节、腰部双接头和脚爪。',chassis:'大斜板属于车身；四凸点接口与后部格栅已露出。'};
    $('#mode-detail').textContent = descriptions[value];
    updateDownload();
    $$('[data-mode]').forEach(b => { const yes = b.dataset.mode === value; b.classList.toggle('selected', yes); b.setAttribute('aria-pressed', yes); });
    moveCamera(view);
  }
  function updateDownload() {
    const files = {combined:'mechanical-pterosaur',split:pose === 'standing' ? 'detached-pair' : 'detached-resting',creature:pose === 'standing' ? 'pterosaur-standing' : 'pterosaur-resting',chassis:'carrier'};
    $('.download').href = `./assets/${files[mode]}.glb`;
    $('.download').title = '下载当前展示形态的基础模型（不包含滑杆临时调整）';
  }
  $$('[data-pose]').forEach(button => button.addEventListener('click', () => {
    pose = button.dataset.pose; targetStand = pose === 'standing' ? 1 : 0;
    $$('[data-pose]').forEach(b => { const yes = b === button; b.classList.toggle('selected', yes); b.setAttribute('aria-pressed', yes); });
    updateDownload(); moveCamera(view);
  }));
  function setWireframe(value) {
    wireframe = value; Object.values(materials).forEach(m => { m.wireframe = value; });
    $('#wireframe').setAttribute('aria-checked', value);
  }
  function reset() {
    setAuto(false); setWireframe(false); setMode('combined');
    $('#wings').value = '0'; $('#wing-value').value = '0%'; targetWing = 0;
    $('#head-pitch').value = '0'; $('#head-value').value = '0°'; targetHead = 0;
    pose = 'standing'; $$('[data-pose]').forEach(b => { const yes = b.dataset.pose === pose; b.classList.toggle('selected',yes); b.setAttribute('aria-pressed',yes); });
    moveCamera('perspective'); toast('已恢复照片姿态与默认视角');
  }
  $$('[data-view]').forEach(b => b.addEventListener('click', () => { setAuto(false); moveCamera(b.dataset.view); }));
  $$('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#rotate').addEventListener('click', () => setAuto(!autoRotate));
  $('#wireframe').addEventListener('click', () => setWireframe(!wireframe));
  $('#separate').addEventListener('click', () => { setSeparated(!separated); moveCamera(view); });
  $('#wings').addEventListener('input', e => { targetWing = Number(e.target.value) / 100; $('#wing-value').value = `${e.target.value}%`; });
  $('#head-pitch').addEventListener('input', e => { targetHead = THREE.MathUtils.degToRad(Number(e.target.value)); $('#head-value').value = `${e.target.value}°`; });
  $('#reset').addEventListener('click', reset);
  $('#fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if ($('#viewer').requestFullscreen) await $('#viewer').requestFullscreen();
      else toast('当前浏览器不支持全屏，可横屏查看模型');
    } catch { toast('无法进入全屏，请使用浏览器的全屏功能'); }
  });
  controls.addEventListener('start', () => { cameraMotion = null; setAuto(false); $$('[data-view]').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', false); }); });

  const observer = new ResizeObserver(() => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    moveCamera(view, true);
  }); observer.observe(host);
  camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
  renderer.setSize(host.clientWidth, host.clientHeight); moveCamera('perspective', true);
  let lastTime = performance.now(), currentWing = 0, currentStand = 0, currentHead = 0, currentLift = 0, currentGround = 0, splitOffset = 0, visible = true;
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '80px' }); visibilityObserver.observe(host);
  function frame(time) {
    requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000, .05); lastTime = time;
    if (document.hidden || !visible) return;
    const smooth = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 9);
    currentLift = THREE.MathUtils.lerp(currentLift, targetLift, smooth);
    currentWing = THREE.MathUtils.lerp(currentWing, targetWing, smooth);
    currentStand = THREE.MathUtils.lerp(currentStand, targetStand, smooth);
    currentHead = THREE.MathUtils.lerp(currentHead, targetHead, smooth);
    splitOffset = THREE.MathUtils.lerp(splitOffset, mode === 'split' ? 1 : 0, smooth);
    currentGround = THREE.MathUtils.lerp(currentGround, mode === 'creature' || mode === 'split' ? 1 : 0, smooth);
    poseCreature({stand:currentStand,wing:currentWing,headPitch:currentHead,lift:currentLift,grounded:currentGround});
    chassis.position.z = -1.72 * splitOffset;
    creature.position.z = 2.45 * splitOffset;
    creature.position.x += .28 * splitOffset;
    if (cameraMotion) {
      const t = Math.min((time - cameraMotion.time) / 700, 1), easing = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(cameraMotion.from, cameraMotion.to, easing); controls.target.lerpVectors(cameraMotion.fromTarget, cameraMotion.toTarget, easing);
      if (t === 1) cameraMotion = null;
    }
    controls.update(dt); renderer.render(scene, camera);
  }
  renderer.render(scene, camera); loading.classList.add('hidden'); requestAnimationFrame(frame);
  // Read-only diagnostics for checking the interactive state during local QA.
  window.galleryState = () => ({ mode, pose, separated, autoRotate, wireframe, wing: targetWing, standing:currentStand, meshCount, canvasWidth: renderer.domElement.width, canvasHeight: renderer.domElement.height, meshes: renderer.info.render.calls, camera: camera.position.toArray() });
}

try { startGallery(); }
catch (error) {
  console.error('3D gallery could not start:', error);
  loading.innerHTML = '<span>当前设备暂时无法显示 3D。请使用支持 WebGL 的浏览器，或下载模型查看。</span>';
  loading.style.padding = '35px'; loading.style.textAlign = 'center';
  $$('.panel button, .panel input, .view-tools button, .views button').forEach(control => { control.disabled = true; });
}
