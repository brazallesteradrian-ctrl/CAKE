import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ─── Renderer / Scene ────────────────────────────────────────────────────────
const canvas = document.querySelector("#viewer");
const status = document.querySelector("#status");
const navUI = document.querySelector("#nav-ui");
const modelLabel = document.querySelector("#model-label");
const btnPrev = document.querySelector("#btn-prev");
const btnNext = document.querySelector("#btn-next");
const clock = new THREE.Clock();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(0, 1.5, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.5, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragHit = new THREE.Vector3();
const dragOffset = new THREE.Vector3();

scene.add(new THREE.HemisphereLight(0xffffff, 0xcccccc, 2.2));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(3, 4, 4);
scene.add(keyLight);

// ─── Shared visible rope mesh ─────────────────────────────────────────────────
const ropeMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d1b18,
  roughness: 0.58,
  metalness: 0.08,
});
const visibleRope = new THREE.Mesh(new THREE.BufferGeometry(), ropeMaterial);
visibleRope.frustumCulled = false;
scene.add(visibleRope);

// ─── Per-model physics state (reset on each switch) ───────────────────────────
let mixer;
let base, door, frame, rope, currentModel;
let pendantState;
let holeMarker;
let isDraggingPendant = false;
let idleFrames = 0;
let hasLoggedRopePoints = false;
let isRopeRenderable = false;
const previousPendantAnchor = new THREE.Vector3();
const ropePoints = [];
const ropeMarkers = [];
const ropeRestLengths = [];
const ropeGravity = new THREE.Vector3(0, -1.15, 0);
const MAX_ROPE_POINT_STEP = 0.08;
const ROPE_SOLVER_ITERATIONS = 52;

// ─── Multi-model config ───────────────────────────────────────────────────────
const MODEL_FILES = ["necklace.glb", "necklace2.glb", "necklace3.glb"];
const MODEL_LABELS = ["Necklace 1", "Necklace 2", "Necklace 3"];
const ROPE_LENGTH_SCALES = [0.5, 0.4, 0.25];
const loadedGltfs = [];
let currentIndex = 0;
let isSwitching = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
setupPointerListeners();
loadAllModels();

// ─── Loading ──────────────────────────────────────────────────────────────────
function loadAllModels() {
  const loader = new GLTFLoader();
  let loaded = 0;

  MODEL_FILES.forEach((file, i) => {
    loader.load(
      file,
      (gltf) => {
        gltf.scene.visible = false;
        scene.add(gltf.scene);
        loadedGltfs[i] = gltf;
        loaded += 1;

        if (loaded === MODEL_FILES.length) {
          switchToModel(0);
          navUI.classList.remove("is-hidden");
          status.classList.add("is-hidden");
        }
      },
      (event) => {
        if (event.total) {
          status.textContent = `Loading ${file}… ${Math.round((event.loaded / event.total) * 100)}%`;
        }
      },
      (err) => {
        console.error("Failed to load", file, err);
        status.textContent = `Failed to load ${file}`;
      },
    );
  });
}

// ─── Model switching ──────────────────────────────────────────────────────────
function switchToModel(index) {
  if (isSwitching) return;
  isSwitching = true;

  // Hide all models
  loadedGltfs.forEach((g) => { if (g) g.scene.visible = false; });

  // Reset physics for fresh start
  resetPhysics();

  currentIndex = index;
  const gltf = loadedGltfs[index];
  if (!gltf) { isSwitching = false; return; }

  gltf.scene.visible = true;
  modelLabel.textContent = MODEL_LABELS[index];

  // Find nodes using generic traversal (works for any naming convention)
  const model = gltf.scene;
  currentModel = model;
  base = model.getObjectByName("basemetal") || model.getObjectByName("baseclock") || model.getObjectByName("base");
  door = model.getObjectByName("doorgreen") || model.getObjectByName("clockdoor") || model.getObjectByName("door");
  frame = model.getObjectByName("frame3") || model.getObjectByName("frame2") || model.getObjectByName("frame");
  rope = null;
  model.traverse((o) => { if (!rope && /^rope/i.test(o.name)) rope = o; });

  if (!base || !door || !frame || !rope) {
    console.error("[switch] Missing nodes:", { base: !!base, door: !!door, frame: !!frame, rope: !!rope });
    isSwitching = false;
    return;
  }

  if (!model.userData.isFramed) {
    framePendant(model);
    model.userData.isFramed = true;
  }

  model.updateMatrixWorld(true);
  setupDoorAnimation(gltf);
  setupPendantPhysics();

  isSwitching = false;
}

function resetPhysics() {
  // Clear all per-model rope state.
  ropePoints.length = 0;
  ropeMarkers.length = 0;
  ropeRestLengths.length = 0;

  // Reset state flags
  pendantState = null;
  holeMarker = null;
  base = door = frame = rope = null;
  mixer = null;
  isDraggingPendant = false;
  idleFrames = 0;
  hasLoggedRopePoints = false;
  isRopeRenderable = false;
  previousPendantAnchor.set(0, 0, 0);

  visibleRope.visible = false;
}

// ─── Nav button listeners ─────────────────────────────────────────────────────
btnPrev.addEventListener("click", () => {
  const next = (currentIndex - 1 + MODEL_FILES.length) % MODEL_FILES.length;
  switchToModel(next);
});

btnNext.addEventListener("click", () => {
  const next = (currentIndex + 1) % MODEL_FILES.length;
  switchToModel(next);
});

// ─── Door animation ───────────────────────────────────────────────────────────
function setupDoorAnimation(gltf) {
  mixer = new THREE.AnimationMixer(gltf.scene);

  if (gltf.animations.length > 0) {
    gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    return;
  }

  const doorOpen = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.55, 0));
  const track = new THREE.QuaternionKeyframeTrack(
    `${door.name}.quaternion`,
    [0, 1.1, 2.2],
    [
      door.quaternion.x, door.quaternion.y, door.quaternion.z, door.quaternion.w,
      doorOpen.x, doorOpen.y, doorOpen.z, doorOpen.w,
      door.quaternion.x, door.quaternion.y, door.quaternion.z, door.quaternion.w,
    ],
  );
  mixer.clipAction(new THREE.AnimationClip("door-swing", 2.2, [track])).play();
}

// ─── Physics setup ────────────────────────────────────────────────────────────
function setupPendantPhysics() {
  base.updateWorldMatrix(true, true);
  rope.updateWorldMatrix(true, true);

  const baseWorldPos = new THREE.Vector3();
  const baseWorldQuat = new THREE.Quaternion();
  base.getWorldPosition(baseWorldPos);
  base.getWorldQuaternion(baseWorldQuat);

  rope.visible = false;
  findHoleMarker();
  pendantState = {
    position: baseWorldPos.clone(),
    quaternion: baseWorldQuat.clone(),
  };
  createRopeChainFromMarkers();

  // KINEMATIC pendant — directly controlled by user mouse, no gravity
  // Kinematic pendant is held in pendantState; the rope follows its attachment marker.
  previousPendantAnchor.copy(findPendantHoleWorldPoint(baseWorldPos));
  updateRopeEndpointAnchors();
  settleRopeBeforeFirstRender();
  syncVisibleRope();
  visibleRope.visible = true;
  isRopeRenderable = true;
}

// ─── Hole marker (rope attachment point on the pendant) ───────────────────────
// The hole is the first Empty that is a CHILD of base.
// Using object reference avoids Three.js dot-stripping name issues.
function findHoleMarker() {
  holeMarker = null;
  base.traverse((o) => {
    if (!holeMarker && o !== base && /^Empty/i.test(o.name)) holeMarker = o;
  });
}

function findPendantHoleWorldPoint(fallbackPoint) {
  if (holeMarker) {
    holeMarker.updateWorldMatrix(true, false);
    return holeMarker.getWorldPosition(new THREE.Vector3());
  }
  return fallbackPoint.clone();
}

// ─── Rope chain ───────────────────────────────────────────────────────────────
function createRopeChainFromMarkers() {
  ropeMarkers.length = 0;
  ropePoints.length = 0;
  ropeRestLengths.length = 0;

  collectRopeMarkers(scene).forEach((marker) => {
    marker.updateWorldMatrix(true, false);
    ropeMarkers.push(marker);
    marker.visible = false;
  });

  if (ropeMarkers.length < 2) {
    throw new Error("Need at least 2 rope markers. Found: " + ropeMarkers.length);
  }

  for (let i = 0; i < ropeMarkers.length; i += 1) {
    const position = ropeMarkers[i].getWorldPosition(new THREE.Vector3());
    ropePoints.push({
      pos: position.clone(),
      oldPos: position.clone(),
      fixed: i === 0 || i === ropeMarkers.length - 1,
      damping: 0.985,
    });

    if (i > 0) {
      const prevPos = ropeMarkers[i - 1].getWorldPosition(new THREE.Vector3());
      const currPos = ropeMarkers[i].getWorldPosition(new THREE.Vector3());
      ropeRestLengths.push(prevPos.distanceTo(currPos) * ROPE_LENGTH_SCALES[currentIndex]);
    }
  }
}

function collectRopeMarkers(root) {
  const markers = [];
  root.traverse((object) => {
    const match = /^Empty(?:\.?(\d{3}))?$/.exec(object.name);
    // Exclude the pendant hole marker by object reference (avoids dot-stripping name issues)
    if (!match || object === holeMarker) return;
    markers.push({ object, index: match[1] ? Number(match[1]) : 0 });
  });
  return markers.sort((a, b) => a.index - b.index).map(({ object }) => object);
}

function worldPointToBodyLocal(body, worldPoint) {
  const bodyPosition = body.translation();
  const bodyRotation = body.rotation();
  const inverseBodyRotation = new THREE.Quaternion(
    bodyRotation.x, bodyRotation.y, bodyRotation.z, bodyRotation.w,
  ).invert();
  const localPoint = worldPoint
    .clone()
    .sub(new THREE.Vector3(bodyPosition.x, bodyPosition.y, bodyPosition.z))
    .applyQuaternion(inverseBodyRotation);
  return { x: localPoint.x, y: localPoint.y, z: localPoint.z };
}

// ─── Drag ─────────────────────────────────────────────────────────────────────
function setupPointerListeners() {
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
}

function onPointerDown(event) {
  if (!base || !pendantState || !currentModel) return;
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObject(currentModel, true).filter(h => h.object.visible && !/^rope/i.test(h.object.name));
  if (hits.length === 0) return;

  const bodyWorldPos = pendantState.position.clone();
  const camDir = camera.getWorldDirection(new THREE.Vector3()).negate();
  dragPlane.setFromNormalAndCoplanarPoint(camDir, bodyWorldPos);

  if (raycaster.ray.intersectPlane(dragPlane, dragHit)) {
    dragOffset.copy(bodyWorldPos).sub(dragHit);
  } else {
    dragOffset.set(0, 0, 0);
  }

  isDraggingPendant = true;
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!isDraggingPendant) return;
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(dragPlane, dragHit)) return;
  const nextPos = dragHit.add(dragOffset);

  if (!pendantState) return;
  pendantState.position.copy(nextPos);
}

function onPointerUp(event) {
  if (!isDraggingPendant) return;
  isDraggingPendant = false;
  controls.enabled = true;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
}



// ─── Per-frame anchor + simulation ───────────────────────────────────────────
function updateRopeEndpointAnchors() {
  if (!pendantState || ropePoints.length < 2) return;

  syncMeshFromState(base, pendantState);
  base.updateWorldMatrix(true, true);

  const holeWorldPoint = findPendantHoleWorldPoint(pendantState.position);
  const firstPoint = ropePoints[0];
  const lastPoint = ropePoints[ropePoints.length - 1];
  const anchorMovement = holeWorldPoint.distanceTo(previousPendantAnchor);

  if (isDraggingPendant || anchorMovement > 0.001) {
    idleFrames = 0;
  } else {
    idleFrames += 1;
  }

  previousPendantAnchor.copy(holeWorldPoint);

  pinRopePoint(firstPoint, holeWorldPoint);
  pinRopePoint(lastPoint, holeWorldPoint);
}

function updateRopeSimulation(delta) {
  if (ropePoints.length < 2 || ropeRestLengths.length !== ropePoints.length - 1) return;

  const time = clock.getElapsedTime();
  const step = Math.min(delta, 1 / 30);
  const stepSq = step * step;

  for (let i = 1; i < ropePoints.length - 1; i += 1) {
    const point = ropePoints[i];
    if (point.fixed) continue;

    const velocity = point.pos.clone().sub(point.oldPos).multiplyScalar(point.damping);
    if (velocity.length() > MAX_ROPE_POINT_STEP) {
      velocity.setLength(MAX_ROPE_POINT_STEP);
    }
    point.oldPos.copy(point.pos);
    point.pos.add(velocity).addScaledVector(ropeGravity, stepSq);

    if (idleFrames > 12) {
      point.pos.x += Math.sin(time * 1.5 + i * 0.33) * 0.0008;
      point.pos.z += Math.cos(time * 1.2 + i * 0.27) * 0.0008;
    }
  }

  enforceRopeLengths(ROPE_SOLVER_ITERATIONS);
  clampRopePointVelocity();
}

function settleRopeBeforeFirstRender() {
  if (ropePoints.length < 2) return;

  for (let frame = 0; frame < 120; frame += 1) {
    updateRopeEndpointAnchors();
    updateRopeSimulation(1 / 60);
  }

  ropePoints.forEach((point) => {
    point.oldPos.copy(point.pos);
  });
  idleFrames = 0;
}

function enforceRopeLengths(iterations = 4) {
  if (ropePoints.length < 2 || ropeRestLengths.length !== ropePoints.length - 1) return;

  for (let pass = 0; pass < iterations; pass += 1) {
    for (let i = 0; i < ropePoints.length - 1; i += 1) {
      const a = ropePoints[i];
      const b = ropePoints[i + 1];
      const delta = b.pos.clone().sub(a.pos);
      const distance = delta.length();
      if (distance <= 0.00001) continue;

      const correction = delta.multiplyScalar((distance - ropeRestLengths[i]) / distance);

      if (!a.fixed && !b.fixed) {
        a.pos.addScaledVector(correction, 0.5);
        b.pos.addScaledVector(correction, -0.5);
      } else if (a.fixed && !b.fixed) {
        b.pos.addScaledVector(correction, -1);
      } else if (!a.fixed && b.fixed) {
        a.pos.add(correction);
      }
    }
  }
}

function clampRopePointVelocity() {
  for (let i = 1; i < ropePoints.length - 1; i += 1) {
    const point = ropePoints[i];
    const frameVelocity = point.pos.clone().sub(point.oldPos);
    if (frameVelocity.length() <= MAX_ROPE_POINT_STEP) continue;
    point.oldPos.copy(point.pos).sub(frameVelocity.setLength(MAX_ROPE_POINT_STEP));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pinRopePoint(point, position) {
  point.pos.copy(position);
  point.oldPos.copy(position);
}

function syncMeshFromState(object, state) {
  if (!object.parent) {
    object.position.copy(state.position);
    object.quaternion.copy(state.quaternion);
    return;
  }

  object.parent.updateWorldMatrix(true, false);
  object.position.copy(object.parent.worldToLocal(state.position.clone()));

  const parentWorldQuat = new THREE.Quaternion();
  object.parent.getWorldQuaternion(parentWorldQuat);
  object.quaternion.copy(parentWorldQuat.invert().multiply(state.quaternion));
}

function syncVisibleRope() {
  const points = ropePoints.map((point) => point.pos);

  if (!hasLoggedRopePoints && points.length > 0) {
    console.log("Rope points:", points.length, "| NaN?", points.some((p) => isNaN(p.x) || isNaN(p.y) || isNaN(p.z)));
    hasLoggedRopePoints = true;
  }

  if (points.length < 2) return;

  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.35);
  const oldGeometry = visibleRope.geometry;
  try {
    visibleRope.geometry = new THREE.TubeGeometry(curve, Math.max(points.length * 4, 32), 0.026, 10, false);
  } catch (e) {
    console.error("TubeGeometry failed:", e);
  }
  oldGeometry.dispose();
}

function framePendant(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const scale = maxSize > 0 ? 2.5 / maxSize : 1;

  model.position.sub(center);
  model.scale.setScalar(scale);

  const framedBox = new THREE.Box3().setFromObject(model);
  const framedCenter = framedBox.getCenter(new THREE.Vector3());
  const framedSize = framedBox.getSize(new THREE.Vector3());
  const distance = Math.max(framedSize.x, framedSize.y, framedSize.z) * 1.9;

  controls.target.copy(framedCenter);
  camera.position.set(framedCenter.x, framedCenter.y + distance * 0.18, framedCenter.z + distance);
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.update();
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// ─── Animate ──────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 1 / 30);
  mixer?.update(delta);

  if (pendantState) {
    updateRopeEndpointAnchors();
    updateRopeSimulation(delta);
    syncMeshFromState(base, pendantState);
    if (isRopeRenderable) {
      syncVisibleRope();
    }
  }

  resize();
  controls.update();
  renderer.render(scene, camera);
}

animate();
