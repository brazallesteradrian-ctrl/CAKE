import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import gsap from "gsap";
THREE.Cache.enabled = true;


const loaderOverlay = document.getElementById('loader-overlay');
const loaderProgress = document.getElementById('loader-progress');
const loaderStatus = document.getElementById('loader-status');
const loaderPercent = document.querySelector('.loader-percentage');

const statusMessages = [
  "Mixing the batter...",
  "Pre-heating oven...",
  "Baking to perfection...",
  "Applying frosting...",
  "Adding sprinkles...",
  "Final decorations..."
];

THREE.DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  if (loaderProgress) loaderProgress.style.width = `${progress}%`;
  if (loaderPercent) loaderPercent.textContent = `${Math.round(progress)}%`;

 
  const msgIndex = Math.floor((itemsLoaded / itemsTotal) * (statusMessages.length - 1));
  if (loaderStatus) loaderStatus.textContent = statusMessages[msgIndex];
};

THREE.DefaultLoadingManager.onLoad = () => {
  setTimeout(() => {
    if (loaderOverlay) {
      loaderOverlay.classList.add('fade-out');
    }
  }, 500);
};

const viewer = document.getElementById("viewer");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
//on tsaka off
const _isLowEndInit = (navigator.hardwareConcurrency || 4) <= 4 && window.innerWidth <= 768;
const renderer = new THREE.WebGLRenderer({ antialias: !_isLowEndInit, alpha: true, powerPreference: "high-performance" });
function isMobileDevice() {
  return window.innerWidth <= 768;
}
function isLowEndMobileDevice() {
  const cpuCores = navigator.hardwareConcurrency || 4;
  const memoryGb = navigator.deviceMemory || 4;
  return isMobileDevice() && (cpuCores <= 4 || memoryGb <= 4);
}
function getMobilePerfTier() {
  if (!isMobileDevice()) return "desktop";
  return isLowEndMobileDevice() ? "low-end-mobile" : "mobile";
}
function getAdaptivePixelRatio() {
  const isMobile = isMobileDevice();
  const isLowEnd = isLowEndMobileDevice();
  // Tighter caps: low-end gets 0.75 (big GPU win), regular mobile 1.0, desktop 2.
  const hardCap = isLowEnd ? 0.75 : (isMobile ? 1.0 : 2);
  return Math.min(window.devicePixelRatio || 1, hardCap);
}
function reportMobilePerfTier() {
  const tier = getMobilePerfTier();
  const pixelRatio = getAdaptivePixelRatio();
  document.documentElement.dataset.perfTier = tier;
  document.documentElement.dataset.perfPixelRatio = String(pixelRatio);

  if (tier !== "desktop") {
    console.info(
      `[perf] tier=${tier} pixelRatio=${pixelRatio} cores=${navigator.hardwareConcurrency || "n/a"} memory=${navigator.deviceMemory || "n/a"}GB`
    );
  }
}
renderer.setSize(viewer.clientWidth, viewer.clientHeight);
renderer.setPixelRatio(getAdaptivePixelRatio());
renderer.outputColorSpace = THREE.SRGBColorSpace;
// ACESFilmic is GPU-heavy on mobile Ã¢â‚¬â€ use LinearToneMapping there instead.
renderer.toneMapping = isMobileDevice() ? THREE.LinearToneMapping : THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = isMobileDevice() ? 1.1 : 1.2;
viewer.appendChild(renderer.domElement);
// --- Optimized Lighting Rig (Ambient + Key + Rim) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
keyLight.position.set(5, 10, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
rimLight.position.set(-5, 5, -10);
scene.add(rimLight);
const cakeGroup = new THREE.Group();
const cakePivotGroup = new THREE.Group();
cakeGroup.add(cakePivotGroup);
scene.add(cakeGroup);
// --- 3D Photo Gallery (Heart Formation) ---
const heartGalleryGroup = new THREE.Group();
const frames = [];
const galleryPhotos = [
  { file: "art1.webp", alt: "Pencil sketch of a woman reading" },
  { file: "SUNSET.webp", alt: "Golden sunset over the ocean" },
  { file: "cat.webp", alt: "Playful cat with a tiny boxing glove" },
  { file: "spidey.webp", alt: "Spider-Man pixel artwork" },
  { file: "ascend.webp", alt: "Colorful iridescent portrait" }
];
const textureLoader = new THREE.TextureLoader();
const curvePoints = [
  new THREE.Vector3(0, -0.5, 4.0),
  new THREE.Vector3(4.5, 1.2, 0),
  new THREE.Vector3(2.5, 3.2, -2.5),
  new THREE.Vector3(-2.5, 3.2, -2.5),
  new THREE.Vector3(-4.5, 1.2, 0)
];
const heartCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'catmullrom', 0.5);
const photoGeo = new THREE.PlaneGeometry(1.4, 1.9);
const borderGeo = new THREE.BoxGeometry(1.55, 2.05, 0.05);
for (let i = 0; i < galleryPhotos.length; i++) {
  const photo = galleryPhotos[i];
  const imageUrl = new URL(`../images/${photo.file}`, import.meta.url).href;
  const photoTexture = textureLoader.load(imageUrl, (texture) => {
    // Center-crop to the portrait frame without stretching the image.
    const imageAspect = texture.image.width / texture.image.height;
    const frameAspect = 1.4 / 1.9;
    if (imageAspect > frameAspect) {
      texture.repeat.x = frameAspect / imageAspect;
      texture.offset.x = (1 - texture.repeat.x) / 2;
    } else {
      texture.repeat.y = imageAspect / frameAspect;
      texture.offset.y = (1 - texture.repeat.y) / 2;
    }
  });
  photoTexture.colorSpace = THREE.SRGBColorSpace;
  const photoMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: photoTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  });
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0xfdfdfd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0
  });
  const frameGroup = new THREE.Group();
  const photoMesh = new THREE.Mesh(photoGeo, photoMat);
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.position.z = -0.03;
  frameGroup.add(borderMesh);
  frameGroup.add(photoMesh);
  const t = i / galleryPhotos.length;
  const initialPoint = heartCurve.getPointAt(t);
  frameGroup.position.copy(initialPoint);
  frameGroup.scale.set(0, 0, 0);
  const baseTiltX = (Math.random() - 0.5) * 0.6;
  const baseTiltY = (Math.random() - 0.5) * 0.5;
  const baseTiltZ = (Math.random() - 0.5) * 0.6;
  frameGroup.userData = {
    title: "",
    letter: "",
    imageUrl,
    imageAlt: photo.alt,
    curveT: t,
    materials: [photoMat, borderMat],
    photoMesh: photoMesh,
    baseTiltX: baseTiltX,
    baseTiltY: baseTiltY,
    baseTiltZ: baseTiltZ,
    tiltX: baseTiltX,
    tiltY: baseTiltY,
    tiltZ: baseTiltZ
  };
  frames.push(frameGroup);
  heartGalleryGroup.add(frameGroup);
}
cakeGroup.add(heartGalleryGroup);
// --- Config ---
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
const modelSceneCache = new Map();
const pendingModelLoads = new Map();
let hasStartedMobilePreload = false;
let currentCakeModel = null;
let currentModelIndex = 0;
let interactionsEnabled = false;
let galleryRevealed = false;
let scrollVelocity = 0;
let isTransitioning = false;
let touchLastX = null;
let touchLastY = null;
const tempWorldPos = new THREE.Vector3();
const tempCurvePoint = new THREE.Vector3();
function getCachedModelScene(path, onDone, onProgress, onError) {
  const cachedScene = modelSceneCache.get(path);
  if (cachedScene) {
    onDone(cachedScene.clone(true));
    return;
  }
  let pending = pendingModelLoads.get(path);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      loader.load(path, (gltf) => {
        modelSceneCache.set(path, gltf.scene);
        resolve(gltf.scene);
      }, onProgress, reject);
    });
    pendingModelLoads.set(path, pending);
    const clearPending = () => pendingModelLoads.delete(path);
    pending.then(clearPending, clearPending);
  }
  pending.then((scene) => onDone(scene.clone(true)), onError);
}
function preloadModelScene(path) {
  return new Promise((resolve) => {
    if (modelSceneCache.has(path)) return resolve();
    getCachedModelScene(path, resolve, undefined, resolve);
  });
}
function startMobileBackgroundPreload(activeIndex) {
  const connection = navigator.connection;
  if (!isMobileDevice() || hasStartedMobilePreload || isLowEndMobileDevice() ||
      connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "")) return;
  hasStartedMobilePreload = true;
  const preload = async () => {
    for (let idx = 0; idx < modelsConfig.length; idx++) {
      if (document.hidden || interactionsEnabled) break;
      if (idx !== activeIndex) await preloadModelScene(modelsConfig[idx].path);
    }
  };
  // Give the first model and its entrance animation priority.
  if (window.requestIdleCallback) {
    window.requestIdleCallback(preload, { timeout: 3000 });
  } else {
    setTimeout(preload, 1500);
  }
}
function getGalleryScalePreset() {
  const isMobile = isMobileDevice();
  return isMobile
    ? { base: 0.62, active: 0.84, selectedPulse: 0.9, cameraBoost: 0.45 }
    : { base: 0.85, active: 1.15, selectedPulse: 1.15, cameraBoost: 0 };
}
const modelsConfig = [
  {
    path: new URL("../models/STRAWB.glb", import.meta.url).href,
    scale: 1,
    cameraMultiplier: 1.8,
    word1: "STRAW<br>BERRY",
    word2: "CAKE",
    tagline: "Fresh berries & sweet cream,<br>made with all the love. ",
    textAccent: "#e8a0d4",
    textGlow: "rgba(232, 100, 180, 0.7)",
    bgMain: "linear-gradient(180deg, #b542bd 0%, #ba3a6a 49.04%, #b84e50 100%)",
    bgVector: "linear-gradient(180deg, #8c3fc2 0%, #c46ea2 100%)",
    lighting: {
      ambient: 0x6b1b4d,
      key: 0xff9eff,
      rim: 0xffffff
    }
  },
  {
    path: new URL("../models/CHOCO.glb", import.meta.url).href,
    scale: 1,
    cameraMultiplier: 1.8,
    word1: "SWEET<br>CHOCO",
    word2: "CAKE",
    tagline: "Rich, dark & indulgent layers,<br>dripping with decadence. ",
    textAccent: "#ffb89a",
    textGlow: "rgba(255, 120, 60, 0.7)",
    bgMain: "linear-gradient(180deg, #3d1a1a 0%, #7a344d 49.04%, #402828 100%)",
    bgVector: "linear-gradient(180deg, #bd6262 0%, #7d4d4d 100%)",
    lighting: {
      ambient: 0x3d1a1a,
      key: 0xffaa88,
      rim: 0xffffff
    }
  },
  {
    path: new URL("../models/FRUITC.glb", import.meta.url).href,
    scale: 1.2,
    idleX: 2.6,
    idleY: -1.2,
    cameraMultiplier: 1.2,
    selectedY: -0.8,
    selectedMultiplier: 1.6,
    word1: "FRUIT",
    word2: "CAKE",
    tagline: "A burst of fruity delight,<br>colorful & full of joy. ",
    textAccent: "#c9a8ff",
    textGlow: "rgba(160, 110, 255, 0.75)",
    bgMain: "linear-gradient(180deg, #b482c2 0%, #81548f 49.04%, #b8b8b8 100%)",
    bgVector: "linear-gradient(180deg, #878787 0%, #c4c4c4 100%)",
    lighting: {
      ambient: 0x4a3059,
      key: 0xe2c2ff,
      rim: 0xffffff
    }
  }
];
// DOM refs
const cakeWord1 = document.getElementById('cakeWord1');
const cakeWord2 = document.getElementById('cakeWord2');
const cakeTagline = document.getElementById('cakeTagline');
const cakeInfo = document.getElementById('cakeInfo');
const birthdayBanner = document.getElementById('birthdayBanner');
const spinHint = document.querySelector('.hint');
function updateSpinHint() {
  if (!spinHint) return;
  const isMobile = window.innerWidth <= 768;
  spinHint.textContent = isMobile ? "Swipe to spin" : "Scroll to spin faster";
}
function setTextWithBreaks(element, text) {
  const lines = text.split(/<br\s*\/?\s*>/i);
  element.replaceChildren();
  lines.forEach((line, index) => {
    if (index) element.appendChild(document.createElement('br'));
    element.appendChild(document.createTextNode(line));
  });
}
function updateCakeText(config) {
  document.documentElement.style.setProperty('--text-accent', config.textAccent);
  document.documentElement.style.setProperty('--text-glow', config.textGlow);
  cakeWord1.classList.add('switching');
  cakeWord2.classList.add('switching');
  cakeTagline.style.opacity = '0';
  setTimeout(() => {
    setTextWithBreaks(cakeWord1, config.word1);
    if (!cakeWord2.querySelector('svg')) {
      cakeWord2.textContent = config.word2;
    } else {
      const frostingTop = document.getElementById('svgFrostTop');
      const frostingBot = document.getElementById('svgFrostBot');
      const svgTextElems = cakeWord2.querySelectorAll('svg text');
      if (frostingTop && frostingBot) {
        frostingTop.setAttribute('stop-color', config.textAccent);
        frostingBot.setAttribute('stop-color', config.textGlow);
      }
      svgTextElems.forEach(t => {
        if (t.textContent !== config.word2) {
          t.textContent = config.word2;
        }
      });
    }
    setTextWithBreaks(cakeTagline, config.tagline);
    cakeWord1.classList.remove('switching');
    cakeWord2.classList.remove('switching');
    cakeTagline.style.opacity = '1';
  }, 350);
}
// =============================================
// FIXED loadModel ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â No variable shadowing bug,
// proper idle position, FF.glb loads correctly
// =============================================
function loadModel(index, animateIn = true, direction = 0) {
  if (direction !== 0 && currentCakeModel) {
    isTransitioning = true;
    const config = modelsConfig[index];
    document.documentElement.style.setProperty('--bg-main', config.bgMain);
    document.documentElement.style.setProperty('--bg-vector', config.bgVector);
    updateCakeText(config);
    if (config.lighting) {
      const applyColor = (lightObj, hex) => {
        const c = new THREE.Color(hex);
        gsap.to(lightObj, { r: c.r, g: c.g, b: c.b, duration: 1.5, ease: "power2.out" });
      };
      applyColor(ambientLight.color, config.lighting.ambient);
      applyColor(keyLight.color, config.lighting.key);
      applyColor(rimLight.color, config.lighting.rim);
    }
    const isMobile = window.innerWidth <= 768;
    const oldWrapper = currentCakeModel;
    if (isMobile) {
      // Mobile: Horizontal slide out to the side
      gsap.to(oldWrapper.position, {
        x: direction * -10, // Exit to left if Next, right if Prev
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
          executeLoad(index, animateIn, direction);
        }
      });
    } else {
      // Desktop: Letter C arc
      let arcObj = { angle: Math.PI };
      let radius = 15;
      gsap.to(arcObj, {
        angle: Math.PI - direction * (Math.PI / 1.5),
        duration: 0.4,
        ease: "power2.in",
        onUpdate: () => {
          oldWrapper.position.x = radius + Math.cos(arcObj.angle) * radius;
          oldWrapper.position.y = Math.sin(arcObj.angle) * radius;
          oldWrapper.rotation.z = (arcObj.angle - Math.PI) * 0.5;
        },
        onComplete: () => {
          executeLoad(index, animateIn, direction);
        }
      });
    }
  } else {
    isTransitioning = true;
    const config = modelsConfig[index];
    document.documentElement.style.setProperty('--bg-main', config.bgMain);
    document.documentElement.style.setProperty('--bg-vector', config.bgVector);
    updateCakeText(config);
    if (config.lighting) {
      const applyColor = (lightObj, hex) => {
        const c = new THREE.Color(hex);
        gsap.to(lightObj, { r: c.r, g: c.g, b: c.b, duration: 1.5, ease: "power2.out" });
      };
      applyColor(ambientLight.color, config.lighting.ambient);
      applyColor(keyLight.color, config.lighting.key);
      applyColor(rimLight.color, config.lighting.rim);
    }
    executeLoad(index, animateIn, direction);
  }
}
let modelLoadVersion = 0;
function executeLoad(index, animateIn, direction) {
  const loadVersion = ++modelLoadVersion;
  const config = modelsConfig[index];

  // Clear any existing models completely to avoid duplicates from overlapping async loads
  while (cakePivotGroup.children.length > 0) {
    cakePivotGroup.remove(cakePivotGroup.children[0]);
  }
  currentCakeModel = null;

  getCachedModelScene(
    config.path,
    (model) => {
      if (loadVersion !== modelLoadVersion) return;
      const wrapperGroup = new THREE.Group();
      // STEP 1: Measure at scale 1 first (raw size)
      model.scale.setScalar(1);
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      // STEP 2: Normalize height to TARGET_HEIGHT, then apply config.scale multiplier
      const TARGET_HEIGHT = 5.5;
      const normScale = TARGET_HEIGHT / size.y;
      const finalScale = normScale * (config.scale || 1);
      model.scale.setScalar(finalScale);
      // STEP 3: Re-center pivot with finalScale applied
      model.position.copy(center).multiplyScalar(-finalScale);
      wrapperGroup.add(model);
      cakePivotGroup.add(wrapperGroup);
      currentCakeModel = wrapperGroup;
      startMobileBackgroundPreload(index);
      // STEP 4: Reset groups cleanly
      cakePivotGroup.rotation.set(0, 0, 0);
      cakePivotGroup.scale.setScalar(1);
      cakeGroup.rotation.set(0, 0, 0);
      cakeGroup.scale.setScalar(1);
      // STEP 5: Camera distance based on final scaled dimensions
      const scaledSizeX = size.x * finalScale;
      const scaledMaxDim = Math.max(
        size.x * finalScale,
        size.y * finalScale,
        size.z * finalScale
      );
      cakeGroup.userData.scaledMaxDim = scaledMaxDim; // Store for selection animation
      camera.position.z = scaledMaxDim * (config.cameraMultiplier || 1.8);
      camera.lookAt(0, 0, 0);
      // STEP 6: FIXED idle position ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â single source of truth, no shadowing
      if (!interactionsEnabled) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          // On mobile: cake is lower at the bottom, centered horizontally
          cakeGroup.position.set(0, -3.5, 0);
          cakeGroup.rotation.z = 0;
        } else {
          // On desktop: use explicit idleX/idleY from config or auto-calculate
          const idleOffX = config.idleX !== undefined ? config.idleX : scaledSizeX * 0.8;
          const idleOffY = config.idleY !== undefined ? config.idleY : 0;
          cakeGroup.position.set(idleOffX, idleOffY, 0);
          cakeGroup.rotation.z = 15 * (Math.PI / 180);
        }
      } else {
        cakeGroup.position.set(0, 0, 0);
      }
      if (animateIn) {
        const isMobile = window.innerWidth <= 768;
        if (direction !== 0) {
          if (isMobile) {
            // Mobile: Horizontal slide in from the side
            wrapperGroup.position.set(direction * 10, 0, 0); // Enter from right if Next, left if Prev
            gsap.to(wrapperGroup.position, {
              x: 0,
              duration: 0.6,
              ease: "back.out(1.1)",
              onComplete: () => {
                isTransitioning = false;
              }
            });
          } else {
            // Desktop: Letter C arc in
            let radius = 15;
            let arcObjIn = { angle: Math.PI + direction * (Math.PI / 1.5) };
            wrapperGroup.position.x = radius + Math.cos(arcObjIn.angle) * radius;
            wrapperGroup.position.y = Math.sin(arcObjIn.angle) * radius;
            wrapperGroup.rotation.z = (arcObjIn.angle - Math.PI) * 0.5;
            gsap.to(arcObjIn, {
              angle: Math.PI,
              duration: 0.6,
              ease: "back.out(1.1)",
              onUpdate: () => {
                wrapperGroup.position.x = radius + Math.cos(arcObjIn.angle) * radius;
                wrapperGroup.position.y = Math.sin(arcObjIn.angle) * radius;
                wrapperGroup.rotation.z = (arcObjIn.angle - Math.PI) * 0.5;
              },
              onComplete: () => {
                isTransitioning = false;
              }
            });
          }
        } else {
          // Normal initial load pop-in
          wrapperGroup.scale.setScalar(0);
          gsap.to(wrapperGroup.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.8,
            ease: "back.out(1.2)",
            onComplete: () => {
              isTransitioning = false;
            }
          });
        }
      } else {
        wrapperGroup.scale.setScalar(1);
        isTransitioning = false;
      }
    },
    // onProgress ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â para makita sa console kung nag-loload
    (xhr) => {
      if (xhr.total > 0) {
        console.log(`[${config.path}] ${(xhr.loaded / xhr.total * 100).toFixed(1)}% loaded`);
      }
    },
    // onError ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â para makita kung bakit hindi lumalabas ang FF.glb
    (err) => {
      console.error(`[${config.path}] LOAD ERROR:`, err);
      isTransitioning = false;
    }
  );
}
// --- Navigation ---
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const selectBtn = document.getElementById("selectBtn");
const returnBtn = document.getElementById("returnBtn");
let selectionTimeline = null;
history.replaceState({ ...history.state, cakeView: 'selection' }, '');

function returnToSelection() {
  selectionTimeline?.kill();
  selectionTimeline = null;
  interactionsEnabled = false;
  galleryRevealed = false;
  isTransitioning = false;
  scrollVelocity = 0;
  touchLastX = touchLastY = null;
  returnBtn.hidden = true;
  birthdayBanner.classList.add('hidden');
  spinHint.classList.add('hidden');
  cakeInfo.classList.remove('hidden');
  frames.forEach(frame => {
    gsap.killTweensOf([frame.scale, frame.userData, ...frame.userData.materials]);
    frame.scale.setScalar(0);
    frame.userData.materials.forEach(material => { material.opacity = 0; });
  });
  gsap.killTweensOf([cakeGroup.position, cakeGroup.rotation, cakeGroup.scale, cakePivotGroup.rotation, cakePivotGroup.scale, camera.position]);
  gsap.killTweensOf([selectBtn, prevBtn, nextBtn]);
  gsap.set([selectBtn, prevBtn, nextBtn], { opacity: 1, pointerEvents: 'auto' });
  loadModel(currentModelIndex, false, 0);
  selectBtn.focus({ preventScroll: true });
}

returnBtn.addEventListener('click', () => {
  if (history.state?.cakeView === 'selected') history.back();
  else returnToSelection();
});
window.addEventListener('popstate', event => {
  returnToSelection();
  if (event.state?.cakeView === 'selected') {
    const index = event.state.cakeIndex;
    if (!Number.isInteger(index) || index < 0 || index >= modelsConfig.length) return;
    currentModelIndex = index;
    loadModel(index, false, 0);
    selectCake(false);
  }
});
prevBtn.onclick = () => {
  if (interactionsEnabled || isTransitioning) return;
  currentModelIndex = (currentModelIndex - 1 + modelsConfig.length) % modelsConfig.length;
  loadModel(currentModelIndex, true, -1);
};
nextBtn.onclick = () => {
  if (interactionsEnabled || isTransitioning) return;
  currentModelIndex = (currentModelIndex + 1) % modelsConfig.length;
  loadModel(currentModelIndex, true, 1);
};
// --- Selection Animation (The "Arc" Motion) ---
function selectCake(recordHistory = true) {
  if (isTransitioning || interactionsEnabled || !currentCakeModel) return;
  isTransitioning = true;
  if (recordHistory) history.pushState({ cakeView: 'selected', cakeIndex: currentModelIndex }, '');
  returnBtn.hidden = false;
  const config = modelsConfig[currentModelIndex];
  const galleryPreset = getGalleryScalePreset();
  const endX = 0;
  const endY = config.selectedY !== undefined ? config.selectedY : 0;
  // Standard distance for selected state
  const scaledMaxDim = cakeGroup.userData.scaledMaxDim || 5;
  const selMult = config.selectedMultiplier || 1.8;
  const standardZ = scaledMaxDim * (selMult + galleryPreset.cameraBoost);
  const peakZ = camera.position.z * 0.4;
  // Keep cards tilted from the start of reveal.
  frames.forEach((frame) => {
    frame.userData.tiltX = frame.userData.baseTiltX;
    frame.userData.tiltY = frame.userData.baseTiltY;
    frame.userData.tiltZ = frame.userData.baseTiltZ;
  });
  gsap.to([selectBtn, prevBtn, nextBtn], {
    opacity: 0,
    pointerEvents: "none",
    duration: 0.6,
    stagger: 0.1,
    ease: "power2.out"
  });
  cakeInfo.classList.add('hidden');
  const tl = selectionTimeline = gsap.timeline({
    onComplete: () => {
      gsap.killTweensOf(cakeGroup.position);
      gsap.killTweensOf(cakeGroup.scale);
      gsap.killTweensOf(cakeGroup.rotation);
      cakeGroup.position.set(endX, endY, 0);
      cakeGroup.scale.set(1, 1, 1);
      cakeGroup.rotation.z = 0;
      interactionsEnabled = true;
      isTransitioning = false;
      spinHint.classList.remove('hidden');
      birthdayBanner.classList.remove('hidden');
      galleryRevealed = true;
    }
  });
  tl.to(cakeGroup.position, {
    x: endX,
    y: endY,
    duration: 1.2,
    ease: "expo.out"
  }, 0);
  // Animate camera back to standard distance if it was zoomed in
  tl.to(camera.position, {
    z: standardZ,
    duration: 1.2,
    ease: "expo.out"
  }, 0);
  tl.to(cakePivotGroup.rotation, {
    y: cakePivotGroup.rotation.y + (Math.PI * 4),
    duration: 1.2,
    ease: "power2.inOut"
  }, 0);
  tl.to(cakeGroup.position, {
    z: peakZ,
    duration: 0.5,
    ease: "power2.out"
  }, 0)
    .to(cakeGroup.position, {
      z: 0,
      duration: 0.7,
      ease: "power1.inOut"
    }, 0.5);
  tl.to(cakeGroup.rotation, {
    z: 0,
    duration: 1.2,
    ease: "back.out(1.7)"
  }, 0);
  tl.to(cakePivotGroup.scale, {
    x: 1.35, y: 1.35, z: 1.35,
    duration: 0.5,
    ease: "power2.out"
  }, 0)
    .to(cakePivotGroup.scale, {
      x: 1.25, y: 1.25, z: 1.25,
      duration: 0.7,
      ease: "power1.inOut"
    }, 0.5);
  tl.to(frames.map(f => f.scale), {
    x: galleryPreset.base, y: galleryPreset.base, z: galleryPreset.base,
    duration: 0.8,
    stagger: 0.15,
    ease: "back.out(1.5)"
  }, 0.4);
  tl.set(frames.flatMap(f => f.userData.materials), {
    opacity: 0
  }, 0.34);
  tl.to(frames.flatMap(f => f.userData.materials), {
    opacity: 1,
    duration: 0.42,
    stagger: 0.14,
    ease: "power2.inOut"
  }, 0.4);
  tl.to(frames[0].scale, {
    x: galleryPreset.selectedPulse, y: galleryPreset.selectedPulse, z: galleryPreset.selectedPulse,
    duration: 0.8,
    ease: "back.out(1.5)"
  }, 0.4);
}
selectBtn.onclick = () => selectCake();
// Frames are display-only; wheel and swipe still rotate the gallery.
let activeFrame = frames[0];
// --- Mobile perf constants ---
const _isMobile = isMobileDevice();
const VELOCITY_THRESHOLD = 0.0002; // skip curve math when nearly stopped
const HIGHLIGHT_INTERVAL = _isMobile ? 6 : 2; // throttle closest-frame check
let _tickCount = 0;
let lastRenderTime = null;
// --- Main Loop ---
function tick(now) {
  requestAnimationFrame(tick);
  if (document.hidden) {
    lastRenderTime = null;
    return;
  }
  const frameInterval = 1000 / (isLowEndMobileDevice() ? 30 : 60);
  const elapsed = lastRenderTime === null ? frameInterval : now - lastRenderTime;
  if (elapsed < frameInterval - 0.5) return;
  lastRenderTime = now;
  const frameStep = Math.min(elapsed / (1000 / 60), 3);
  _tickCount++;
  let isMoving = false;
  if (interactionsEnabled) {
    isMoving = Math.abs(scrollVelocity) > VELOCITY_THRESHOLD;
    if (isMoving) {
      const damping = Math.pow(0.95, frameStep);
      const motion = scrollVelocity * (1 - damping) / (1 - 0.95);
      cakePivotGroup.rotation.y += motion;
      frames.forEach(frame => {
        frame.userData.curveT = (frame.userData.curveT - motion * 0.3) % 1;
        if (frame.userData.curveT < 0) frame.userData.curveT += 1;
        heartCurve.getPointAt(frame.userData.curveT, tempCurvePoint);
        frame.position.copy(tempCurvePoint);
      });
    }
    scrollVelocity *= Math.pow(0.95, frameStep);
    if (Math.abs(scrollVelocity) < VELOCITY_THRESHOLD) scrollVelocity = 0;
    const config = modelsConfig[currentModelIndex];
    const sY = config.selectedY !== undefined ? config.selectedY : 0;
    cakeGroup.position.set(0, sY, 0);
    cakeGroup.scale.set(1, 1, 1);
    // --- Highlight Logic: throttled on mobile ---
    if (galleryRevealed && (_tickCount % HIGHLIGHT_INTERVAL === 0)) {
      let closestFrame = null;
      let minDistance = Infinity;
      frames.forEach(frame => {
        frame.getWorldPosition(tempWorldPos);
        const dist = tempWorldPos.distanceToSquared(camera.position);
        if (dist < minDistance) {
          minDistance = dist;
          closestFrame = frame;
        }
      });
      if (closestFrame !== activeFrame) {
        activeFrame = closestFrame;
        const galleryPreset = getGalleryScalePreset();
        frames.forEach(frame => {
          if (frame === activeFrame) {
            gsap.to(frame.scale, {
              x: galleryPreset.active,
              y: galleryPreset.active,
              z: galleryPreset.active,
              duration: 0.4,
              ease: "back.out(1.5)",
              overwrite: "auto"
            });
            gsap.to(frame.userData.materials, { opacity: 1, duration: 0.4, overwrite: "auto" });
            gsap.to(frame.userData, { tiltX: -0.5, tiltY: 0, tiltZ: 0, duration: 0.6, ease: "power2.out", overwrite: "auto" });
          } else {
            gsap.to(frame.scale, {
              x: galleryPreset.base,
              y: galleryPreset.base,
              z: galleryPreset.base,
              duration: 0.4,
              ease: "power2.out",
              overwrite: "auto"
            });
            gsap.to(frame.userData.materials, { opacity: 1, duration: 0.4, overwrite: "auto" });
            gsap.to(frame.userData, {
              tiltX: frame.userData.baseTiltX,
              tiltY: frame.userData.baseTiltY,
              tiltZ: frame.userData.baseTiltZ,
              duration: 0.6, ease: "power2.out", overwrite: "auto"
            });
          }
        });
      }
    }
  } else {
    cakePivotGroup.rotation.y += 0.003 * frameStep;
  }
  // Billboard: skip matrix recalc on mobile when scroll is idle,
  // but still refresh every 3rd tick so GSAP tilt tweens settle correctly.
  if (galleryRevealed) {
    const skipBillboard = _isMobile && !isMoving && (_tickCount % 3 !== 0);
    if (!skipBillboard) {
      frames.forEach(frame => {
        frame.lookAt(camera.position);
        frame.rotateY(frame.userData.tiltY);
        frame.rotateX(frame.userData.tiltX);
        frame.rotateZ(frame.userData.tiltZ);
      });
    }
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
// --- Scroll Interaction ---
window.addEventListener("wheel", (e) => {
  if (interactionsEnabled) {
    scrollVelocity += e.deltaY * 0.00003;
    scrollVelocity = THREE.MathUtils.clamp(scrollVelocity, -0.12, 0.12);
  }
}, { passive: true });
// Mobile swipe support for gallery spin (wheel substitute)
viewer.addEventListener("touchstart", (e) => {
  if (!interactionsEnabled || e.touches.length !== 1) return;
  touchLastX = e.touches[0].clientX;
  touchLastY = e.touches[0].clientY;
}, { passive: true });
viewer.addEventListener("touchmove", (e) => {
  if (!interactionsEnabled || e.touches.length !== 1) return;
  const touch = e.touches[0];
  if (touchLastX === null || touchLastY === null) {
    touchLastX = touch.clientX;
    touchLastY = touch.clientY;
    return;
  }
  const deltaX = touch.clientX - touchLastX;
  const deltaY = touch.clientY - touchLastY;
  // Blend vertical + horizontal swipe so motion feels natural on phones.
  scrollVelocity += (-deltaY + deltaX * 0.8) * 0.00008;
  scrollVelocity = THREE.MathUtils.clamp(scrollVelocity, -0.12, 0.12);
  touchLastX = touch.clientX;
  touchLastY = touch.clientY;
  // Prevent page scroll while spinning the gallery.
  e.preventDefault();
}, { passive: false });
viewer.addEventListener("touchend", () => {
  touchLastX = null;
  touchLastY = null;
}, { passive: true });
// --- Resize Handler ---
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  camera.aspect = viewer.clientWidth / viewer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  renderer.setPixelRatio(getAdaptivePixelRatio());
  reportMobilePerfTier();
  updateSpinHint();
  // Recalculate camera and idle position for new screen size
  // FIXED: On mobile, address bar scroll triggers height resize. Only reload if width changes.
  if (window.innerWidth !== lastWidth || !isMobileDevice()) {
    lastWidth = window.innerWidth;
    if (!interactionsEnabled && !isTransitioning) {
      loadModel(currentModelIndex, false, 0);
    }
  }
});
reportMobilePerfTier();
updateSpinHint();
loadModel(currentModelIndex, true, 0);
