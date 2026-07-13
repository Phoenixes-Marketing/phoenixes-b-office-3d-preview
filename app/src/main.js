import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createIcons, icons } from "lucide";

createIcons({ icons });

const canvas = document.querySelector("#scene");
const statusEl = document.querySelector("#status");
const planOpacity = document.querySelector("#planOpacity");
const wallHeightInput = document.querySelector("#wallHeight");
const toggleFurnitureButton = document.querySelector("#toggleFurniture");
const toggleColumnEditorButton = document.querySelector("#toggleColumnEditor");
const toggleCadViewButton = document.querySelector("#toggleCadView");
const columnEditor = document.querySelector("#columnEditor");
const columnHint = document.querySelector("#columnHint");
const columnInputs = {
  x: document.querySelector("#columnX"),
  z: document.querySelector("#columnZ"),
  w: document.querySelector("#columnW"),
  d: document.querySelector("#columnD"),
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8ecef);
scene.fog = new THREE.Fog(0xe8ecef, 30, 68);

const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 160);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.enablePan = true;
controls.minDistance = 4;
controls.maxDistance = 48;
controls.maxPolarAngle = Math.PI * 0.49;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragPoint = new THREE.Vector3();

const root = new THREE.Group();
scene.add(root);

const floorGroup = new THREE.Group();
const wallGroup = new THREE.Group();
const furnitureGroup = new THREE.Group();
const fixtureGroup = new THREE.Group();
const labelGroup = new THREE.Group();
const cadGroup = new THREE.Group();
root.add(floorGroup, wallGroup, furnitureGroup, fixtureGroup, labelGroup, cadGroup);

const materials = {
  siteGround: new THREE.MeshStandardMaterial({ color: 0xe5e8e4, roughness: 0.86 }),
  floor: new THREE.MeshStandardMaterial({ color: 0xded5c5, roughness: 0.72 }),
  platformSide: new THREE.MeshStandardMaterial({ color: 0xbfc4bf, roughness: 0.8 }),
  step: new THREE.MeshStandardMaterial({ color: 0xd7d2c8, roughness: 0.78 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.78 }),
  wallTop: new THREE.MeshStandardMaterial({ color: 0xd8b174, roughness: 0.62 }),
  lowWall: new THREE.MeshPhysicalMaterial({
    color: 0x9ed0d0,
    roughness: 0.18,
    transmission: 0.16,
    transparent: true,
    opacity: 0.72,
  }),
  column: new THREE.MeshStandardMaterial({ color: 0xbb4b45, roughness: 0.58 }),
  selectedColumn: new THREE.MeshStandardMaterial({ color: 0x2f8f7c, roughness: 0.56, emissive: 0x0c2d25, emissiveIntensity: 0.12 }),
  columnPick: new THREE.MeshBasicMaterial({ color: 0x2f8f7c, transparent: true, opacity: 0, depthWrite: false }),
  wood: new THREE.MeshStandardMaterial({ color: 0xcaa58a, roughness: 0.64 }),
  paleWood: new THREE.MeshStandardMaterial({ color: 0xdfc6a7, roughness: 0.66 }),
  chair: new THREE.MeshStandardMaterial({ color: 0x79aa6f, roughness: 0.72 }),
  cabinet: new THREE.MeshStandardMaterial({ color: 0xc985b5, roughness: 0.62 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x9eb3d6, roughness: 0.58 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2f383d, roughness: 0.54 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf8f8f3, roughness: 0.42 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xa7aaa7, metalness: 0.45, roughness: 0.35 }),
  door: new THREE.MeshStandardMaterial({ color: 0xdcc7a6, roughness: 0.55 }),
  doorArc: new THREE.MeshBasicMaterial({ color: 0x1d6db5, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
  sill: new THREE.MeshStandardMaterial({ color: 0x6ec9dc, roughness: 0.42, transparent: true, opacity: 0.72 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xb9dbe4,
    roughness: 0.08,
    transmission: 0.35,
    transparent: true,
    opacity: 0.48,
  }),
  windowFrame: new THREE.MeshStandardMaterial({ color: 0xc4b7a2, roughness: 0.55 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xbfc9c2, roughness: 0.88 }),
  cushion: new THREE.MeshStandardMaterial({ color: 0xe7e3da, roughness: 0.86 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xb8c7c0, roughness: 0.9, transparent: true, opacity: 0.72 }),
  porcelain: new THREE.MeshStandardMaterial({ color: 0xf7f7f2, roughness: 0.36 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x3e7d4a, roughness: 0.86 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd7a482, roughness: 0.65 }),
  humanCloth: new THREE.MeshStandardMaterial({ color: 0x6f8790, roughness: 0.78 }),
};

const cadMaterials = {
  heavy: new THREE.LineBasicMaterial({ color: 0x0e1111, transparent: true, opacity: 0.95, depthTest: false }),
  medium: new THREE.LineBasicMaterial({ color: 0x1f2424, transparent: true, opacity: 0.78, depthTest: false }),
  light: new THREE.LineBasicMaterial({ color: 0x5b6262, transparent: true, opacity: 0.5, depthTest: false }),
  furniture: new THREE.LineBasicMaterial({ color: 0x252a2a, transparent: true, opacity: 0.62, depthTest: false }),
};

const DESIGN_ITEMS = [
  { type: "workbench", x: 255, z: 235, w: 230, d: 62, rot: 0 },
  { type: "workbench", x: 700, z: 155, w: 250, d: 68, rot: 0 },
  { type: "desk", x: 900, z: 165, w: 145, d: 70, rot: 0 },
  { type: "chair", x: 900, z: 250, rot: 180 },

  { type: "roundTable", x: 1515, z: 565, r: 80 },
  { type: "lounge", x: 1410, z: 640, rot: 45 },
  { type: "lounge", x: 1620, z: 640, rot: -45 },
  { type: "plant", x: 1345, z: 670 },
  { type: "plant", x: 1685, z: 670 },

  { type: "conferenceTable", x: 2305, z: 350, w: 500, d: 165, rot: 0, chairs: 20 },

  { type: "desk", x: 190, z: 1450, w: 150, d: 76, rot: 0 },
  { type: "chair", x: 190, z: 1535, rot: 180 },
  { type: "lounge", x: 295, z: 1320, rot: -35 },
  { type: "plant", x: 80, z: 1560 },

  { type: "desk", x: 575, z: 1450, w: 150, d: 76, rot: 0 },
  { type: "chair", x: 575, z: 1535, rot: 180 },
  { type: "lounge", x: 680, z: 1320, rot: -35 },

  { type: "desk", x: 910, z: 1290, w: 125, d: 66, rot: 0 },
  { type: "desk", x: 1110, z: 1290, w: 125, d: 66, rot: 0 },
  { type: "desk", x: 910, z: 1490, w: 125, d: 66, rot: 180 },
  { type: "desk", x: 1110, z: 1490, w: 125, d: 66, rot: 180 },
  { type: "chair", x: 910, z: 1370, rot: 180 },
  { type: "chair", x: 1110, z: 1370, rot: 180 },
  { type: "chair", x: 910, z: 1410, rot: 0 },
  { type: "chair", x: 1110, z: 1410, rot: 0 },

  { type: "desk", x: 1440, z: 1300, w: 120, d: 64, rot: 0 },
  { type: "desk", x: 1585, z: 1300, w: 120, d: 64, rot: 0 },
  { type: "desk", x: 1830, z: 1300, w: 120, d: 64, rot: 0 },
  { type: "desk", x: 1975, z: 1300, w: 120, d: 64, rot: 0 },
  { type: "desk", x: 1440, z: 1510, w: 120, d: 64, rot: 180 },
  { type: "desk", x: 1585, z: 1510, w: 120, d: 64, rot: 180 },
  { type: "desk", x: 1830, z: 1510, w: 120, d: 64, rot: 180 },
  { type: "desk", x: 1975, z: 1510, w: 120, d: 64, rot: 180 },
  { type: "chair", x: 1440, z: 1380, rot: 180 },
  { type: "chair", x: 1585, z: 1380, rot: 180 },
  { type: "chair", x: 1830, z: 1380, rot: 180 },
  { type: "chair", x: 1975, z: 1380, rot: 180 },
  { type: "chair", x: 1440, z: 1430, rot: 0 },
  { type: "chair", x: 1585, z: 1430, rot: 0 },
  { type: "chair", x: 1830, z: 1430, rot: 0 },
  { type: "chair", x: 1975, z: 1430, rot: 0 },
  { type: "plant", x: 2070, z: 1535 },

  { type: "reception", x: 2385, z: 880, w: 310, d: 78, rot: 0 },
  { type: "chair", x: 2305, z: 980, rot: 0 },
  { type: "chair", x: 2465, z: 980, rot: 0 },
  { type: "plant", x: 2205, z: 1110 },
  { type: "plant", x: 2630, z: 1110 },
];

const WINDOW_ITEMS = [
  { x: 2185, z: -18, w: 420, d: 4, rot: 0 },
  { x: 2690, z: 350, w: 420, d: 4, rot: 90 },
  { x: 2690, z: 960, w: 360, d: 4, rot: 90 },
  { x: 1700, z: 1630, w: 520, d: 4, rot: 0 },
  { x: 1010, z: 1630, w: 360, d: 4, rot: 0 },
];

const HUMAN_SCALE = { x: 2275, z: 1355, rot: -25 };

let data;
let bounds;
let center;
let planMesh;
let baseFloor;
let officeElevation = 0.6;
let currentWallHeight = Number(wallHeightInput.value);
let furnitureVisible = true;
let columnEditorOpen = false;
let editableColumns = [];
let selectedColumnId = null;
let columnMeshes = [];
let columnPickMeshes = [];
let nextColumnId = 1;
let draggingColumnId = null;
let dragColumnOffset = { x: 0, z: 0 };
let cadMode = false;
const defaultBackground = new THREE.Color(0xe8ecef);
const defaultFog = scene.fog;

init();

async function init() {
  data = await fetch("./model-data.json").then((res) => res.json());
  officeElevation = (data.levels?.officeCm ?? 60) / 100;
  wallHeightInput.min = "1.5";
  wallHeightInput.max = "3";
  wallHeightInput.step = "0.05";
  wallHeightInput.value = ((data.defaults?.wallHeightCm ?? 200) / 100).toFixed(2);
  currentWallHeight = Number(wallHeightInput.value);
  bounds = getBounds(data);
  center = {
    x: (bounds.x0 + bounds.x1) / 2,
    z: (bounds.z0 + bounds.z1) / 2,
  };
  editableColumns = makeEditableColumns(data.columns);
  setupLights();
  buildScene();
  setCameraPreset("default");
  bindControls();
  resize();
  animate();
}

function getBounds(model) {
  return {
    x0: model.image.x0,
    z0: model.image.z0,
    x1: model.image.x1,
    z1: model.image.z1,
  };
}

function makeEditableColumns(columns) {
  nextColumnId = 1;
  return columns.map((column) => ({
    ...column,
    __id: `column-${nextColumnId++}`,
  }));
}

function bindControls() {
  document.querySelector("#resetView").addEventListener("click", () => setCameraPreset("default"));
  document.querySelector("#topView").addEventListener("click", () => setCameraPreset("top"));
  toggleCadViewButton?.addEventListener("click", () => {
    cadMode = !cadMode;
    applyCadMode();
  });
  toggleFurnitureButton?.addEventListener("click", () => {
    furnitureVisible = !furnitureVisible;
    furnitureGroup.visible = furnitureVisible && !cadMode;
    toggleFurnitureButton.classList.toggle("is-active", furnitureVisible);
    toggleFurnitureButton.setAttribute("aria-label", furnitureVisible ? "隱藏家具" : "顯示家具");
    if (cadMode) rebuildCadPlan();
    updateStatus();
  });
  toggleColumnEditorButton?.addEventListener("click", () => {
    columnEditorOpen = !columnEditorOpen;
    columnEditor.hidden = !columnEditorOpen;
    toggleColumnEditorButton.classList.toggle("is-active", columnEditorOpen);
    if (columnEditorOpen) ensureSelectedColumn();
    else selectedColumnId = null;
    syncColumnEditor();
    rebuildWalls();
  });
  document.querySelector("#togglePlan")?.addEventListener("click", (event) => {
    if (!planMesh) return;
    planMesh.visible = !planMesh.visible;
    event.currentTarget.classList.toggle("is-active", planMesh.visible);
  });
  document.querySelector("#toggleLabels").addEventListener("click", (event) => {
    labelGroup.visible = !labelGroup.visible;
    event.currentTarget.classList.toggle("is-active", labelGroup.visible);
    if (cadMode) labelGroup.visible = false;
  });
  planOpacity?.addEventListener("input", () => {
    if (planMesh) planMesh.material.opacity = Number(planOpacity.value);
  });
  wallHeightInput.addEventListener("input", () => {
    currentWallHeight = Number(wallHeightInput.value);
    rebuildWalls();
  });
  document.querySelector("#addColumn")?.addEventListener("click", addColumnAtViewTarget);
  document.querySelector("#deleteColumn")?.addEventListener("click", deleteSelectedColumn);
  document.querySelector("#resetColumns")?.addEventListener("click", resetEditableColumns);
  Object.values(columnInputs).forEach((input) => {
    input?.addEventListener("input", updateSelectedColumnFromFields);
  });
  canvas.addEventListener("pointerdown", startColumnDrag);
  canvas.addEventListener("pointermove", dragSelectedColumn);
  canvas.addEventListener("pointerup", endColumnDrag);
  canvas.addEventListener("pointercancel", endColumnDrag);
  window.addEventListener("resize", resize);
}

function setupLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd6d1c9, 1.4));

  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(-8, 18, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  scene.add(sun);

  const warm = new THREE.PointLight(0xfff1d0, 0.8, 25);
  warm.position.set(5, 5, 3);
  scene.add(warm);
}

function buildScene() {
  addBaseFloor();
  rebuildWalls();
  addFurniture();
  addFixtures();
  addLabels();
  updateStatus();
}

function addBaseFloor() {
  const width = (bounds.x1 - bounds.x0) / 100;
  const depth = (bounds.z1 - bounds.z0) / 100;

  const siteGround = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, depth), materials.siteGround);
  siteGround.position.set(0, -0.02, 0);
  siteGround.receiveShadow = true;
  floorGroup.add(siteGround);
  baseFloor = siteGround;

  const raised = data.floorAreas?.find((area) => area.kind === "raised-office-floor");
  if (raised) {
    addPlatform(raised, materials.floor, floorGroup);
    addPlatformEdges(raised);
  }

  for (const step of data.steps ?? []) {
    addPlatform(step, materials.step, floorGroup);
  }

  planMesh = null;

  addSubtleFloorPlanks(raised ?? { x0: bounds.x0, z0: bounds.z0, x1: bounds.x1, z1: bounds.z1 });
}

function addPlatform(area, material, group) {
  const x0 = Math.min(area.x0, area.x1);
  const x1 = Math.max(area.x0, area.x1);
  const z0 = Math.min(area.z0, area.z1);
  const z1 = Math.max(area.z0, area.z1);
  const a = toWorld(x0, z0);
  const b = toWorld(x1, z1);
  const width = Math.max(Math.abs(b.x - a.x), 0.01);
  const depth = Math.max(Math.abs(b.z - a.z), 0.01);
  const height = Math.max((area.heightCm ?? 0) / 100, 0.03);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set((a.x + b.x) / 2, height / 2, (a.z + b.z) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addPlatformEdges(area) {
  const edgeMat = materials.platformSide;
  const x0 = Math.min(area.x0, area.x1);
  const x1 = Math.max(area.x0, area.x1);
  const z0 = Math.min(area.z0, area.z1);
  const z1 = Math.max(area.z0, area.z1);
  const strips = [
    { x0, x1, z0: z0 - 6, z1: z0 + 6, heightCm: 60 },
    { x0, x1, z0: z1 - 6, z1: z1 + 6, heightCm: 60 },
    { x0: x0 - 6, x1: x0 + 6, z0, z1, heightCm: 60 },
    { x0: x1 - 6, x1: x1 + 6, z0, z1, heightCm: 60 },
  ];
  strips.forEach((strip) => addPlatform(strip, edgeMat, floorGroup));
}

function addSubtleFloorPlanks(area) {
  const group = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: 0xbda985, transparent: true, opacity: 0.28 });
  const a = toWorld(area.x0, area.z0);
  const b = toWorld(area.x1, area.z1);
  const width = Math.abs(b.x - a.x);
  const depth = Math.abs(b.z - a.z);
  const cx = (a.x + b.x) / 2;
  const cz = (a.z + b.z) / 2;
  const points = [];
  for (let x = -width / 2; x <= width / 2; x += 0.85) {
    points.push(new THREE.Vector3(cx + x, officeElevation + 0.024, cz - depth / 2), new THREE.Vector3(cx + x, officeElevation + 0.024, cz + depth / 2));
  }
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), lineMat);
  group.add(lines);
  floorGroup.add(group);
}

function rebuildWalls() {
  clearGroup(wallGroup);
  columnMeshes = [];
  columnPickMeshes = [];
  const openings = getDoorOpenings();
  for (const item of data.walls) {
    for (const segment of splitWallByOpenings(item, openings)) {
      addFootprint(segment, currentWallHeight, materials.wall, wallGroup);
    }
  }
  for (const item of data.lowWalls) {
    addFootprint(item, data.defaults.lowWallHeightCm / 100, materials.lowWall, wallGroup);
  }
  for (const item of editableColumns) {
    const material = columnEditorOpen && item.__id === selectedColumnId ? materials.selectedColumn : materials.column;
    const mesh = addFootprint(item, data.defaults.columnHeightCm / 100, material, wallGroup);
    mesh.userData.columnId = item.__id;
    mesh.userData.isEditableColumn = true;
    columnMeshes.push(mesh);
    columnPickMeshes.push(addColumnDragHitbox(item));
  }
  for (const item of data.doorSills ?? []) {
    addFootprint(item, 0.035, materials.sill, wallGroup, { baseY: officeElevation + 0.01, cap: false });
  }
  for (const item of data.doors ?? []) {
    addDoor(item, wallGroup);
  }
  addWindows(wallGroup);
  rebuildCadPlan();
  updateStatus();
}

function addColumnDragHitbox(item) {
  const metrics = getColumnMetrics(item);
  const pickPaddingCm = 36;
  const pickHeight = Math.max(data.defaults.columnHeightCm / 100, 2.6);
  const width = Math.max((metrics.w + pickPaddingCm) / 100, 0.8);
  const depth = Math.max((metrics.d + pickPaddingCm) / 100, 0.8);
  const pos = toWorld(metrics.x, metrics.z);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, pickHeight, depth), materials.columnPick);
  mesh.position.set(pos.x, officeElevation + pickHeight / 2, pos.z);
  mesh.userData.columnId = item.__id;
  mesh.userData.isEditableColumn = true;
  mesh.renderOrder = -1;
  wallGroup.add(mesh);
  return mesh;
}

function getDoorOpenings() {
  return (data.doorSills ?? []).map((sill) => {
    const x0 = Math.min(sill.x0, sill.x1);
    const x1 = Math.max(sill.x0, sill.x1);
    const z0 = Math.min(sill.z0, sill.z1);
    const z1 = Math.max(sill.z0, sill.z1);
    const width = x1 - x0;
    const depth = z1 - z0;
    const padding = 10;
    return {
      orientation: width >= depth ? "horizontal" : "vertical",
      x0: x0 - padding,
      x1: x1 + padding,
      z0: z0 - padding,
      z1: z1 + padding,
      cx: (x0 + x1) / 2,
      cz: (z0 + z1) / 2,
    };
  });
}

function splitWallByOpenings(item, openings) {
  if (item.shape !== "rect") {
    if ((item.thicknessCm ?? 0) > 80) return [];
    return [item];
  }

  let segments = [{ ...item }];
  for (const opening of openings) {
    const next = [];
    for (const segment of segments) {
      next.push(...splitSingleWall(segment, opening));
    }
    segments = next;
  }
  return segments.filter((segment) => {
    const width = Math.abs(segment.x1 - segment.x0);
    const depth = Math.abs(segment.z1 - segment.z0);
    return width >= 6 && depth >= 6;
  });
}

function splitSingleWall(wall, opening) {
  const x0 = Math.min(wall.x0, wall.x1);
  const x1 = Math.max(wall.x0, wall.x1);
  const z0 = Math.min(wall.z0, wall.z1);
  const z1 = Math.max(wall.z0, wall.z1);
  const width = x1 - x0;
  const depth = z1 - z0;
  const isHorizontalWall = width >= depth;
  const overlapX = opening.x0 < x1 && opening.x1 > x0;
  const overlapZ = opening.z0 < z1 && opening.z1 > z0;
  if (!overlapX || !overlapZ) return [wall];

  const pieces = [];
  if (isHorizontalWall && opening.orientation === "horizontal") {
    const cut0 = Math.max(x0, opening.x0);
    const cut1 = Math.min(x1, opening.x1);
    if (cut0 - x0 >= 6) pieces.push({ ...wall, x0, x1: cut0 });
    if (x1 - cut1 >= 6) pieces.push({ ...wall, x0: cut1, x1 });
    return pieces;
  }

  if (!isHorizontalWall && opening.orientation === "vertical") {
    const cut0 = Math.max(z0, opening.z0);
    const cut1 = Math.min(z1, opening.z1);
    if (cut0 - z0 >= 6) pieces.push({ ...wall, z0, z1: cut0 });
    if (z1 - cut1 >= 6) pieces.push({ ...wall, z0: cut1, z1 });
    return pieces;
  }

  return [wall];
}

function addWindows(group) {
  for (const item of WINDOW_ITEMS) {
    addWindow(item, group);
  }
}

function rebuildCadPlan() {
  clearGroup(cadGroup);
  const y = officeElevation + 3.15;
  for (const item of data.walls) addCadFootprint(item, cadMaterials.heavy, y);
  for (const item of data.lowWalls) addCadFootprint(item, cadMaterials.medium, y);
  for (const item of editableColumns) addCadFootprint(item, item.__id === selectedColumnId ? cadMaterials.medium : cadMaterials.heavy, y);
  for (const item of data.doorSills ?? []) addCadFootprint(item, cadMaterials.light, y);
  for (const item of data.doors ?? []) addCadDoor(item, y);
  for (const item of WINDOW_ITEMS) addCadOrientedRect(item.x, item.z, item.w, Math.max(item.d, 8), item.rot ?? 0, cadMaterials.light, y);
  if (furnitureVisible) {
    for (const item of DESIGN_ITEMS) addCadFurniture(item, y);
    for (const item of data.fixtures ?? []) addCadFixture(item, y);
  }
  cadGroup.visible = cadMode;
}

function addCadFootprint(item, material, y) {
  if (item.shape === "segment") {
    const a = toWorld(item.x0, item.z0);
    const b = toWorld(item.x1, item.z1);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz) || 1;
    const thickness = Math.max((item.thicknessCm || 14) / 100, 0.04);
    const px = (-dz / length) * thickness * 0.5;
    const pz = (dx / length) * thickness * 0.5;
    addCadPolyline([
      [a.x + px, a.z + pz],
      [b.x + px, b.z + pz],
      [b.x - px, b.z - pz],
      [a.x - px, a.z - pz],
      [a.x + px, a.z + pz],
    ], material, y);
    return;
  }
  const x0 = Math.min(item.x0, item.x1);
  const x1 = Math.max(item.x0, item.x1);
  const z0 = Math.min(item.z0, item.z1);
  const z1 = Math.max(item.z0, item.z1);
  const a = toWorld(x0, z0);
  const b = toWorld(x1, z1);
  addCadPolyline([
    [a.x, a.z],
    [b.x, a.z],
    [b.x, b.z],
    [a.x, b.z],
    [a.x, a.z],
  ], material, y);
}

function addCadDoor(item, y) {
  const hinge = toWorld(item.hinge.x, item.hinge.z);
  const endA = toWorld(item.endA.x, item.endA.z);
  const endB = toWorld(item.endB.x, item.endB.z);
  addCadPolyline([[hinge.x, hinge.z], [endA.x, endA.z]], cadMaterials.medium, y);
  const start = Math.atan2(endA.z - hinge.z, endA.x - hinge.x);
  const end = Math.atan2(endB.z - hinge.z, endB.x - hinge.x);
  let delta = end - start;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const radius = Math.max((item.radiusCm ?? 90) / 100, 0.45);
  const points = [];
  for (let i = 0; i <= 24; i += 1) {
    const angle = start + delta * (i / 24);
    points.push([hinge.x + Math.cos(angle) * radius, hinge.z + Math.sin(angle) * radius]);
  }
  addCadPolyline(points, cadMaterials.light, y);
}

function addCadFurniture(item, y) {
  const rot = item.rot ?? item.rotation ?? 0;
  if (item.type === "roundTable") {
    addCadCircle(item.x, item.z, item.r ?? 60, cadMaterials.furniture, y);
    return;
  }
  if (item.type === "plant") {
    addCadCircle(item.x, item.z, 24, cadMaterials.light, y);
    return;
  }
  const defaults = {
    chair: [42, 42],
    lounge: [58, 58],
    workbench: [item.w ?? 180, item.d ?? 60],
    desk: [item.w ?? 130, item.d ?? 70],
    conferenceTable: [item.w ?? 460, item.d ?? 160],
    reception: [item.w ?? 300, item.d ?? 80],
    sofa: [item.w ?? 180, item.d ?? 80],
    coffee: [item.w ?? 80, item.d ?? 50],
    cabinet: [item.w ?? 120, item.d ?? 42],
    shelf: [item.w ?? 150, item.d ?? 36],
    counter: [item.w ?? 140, item.d ?? 44],
    display: [item.w ?? 120, item.d ?? 36],
    rug: [item.w ?? 160, item.d ?? 100],
  };
  const [width, depth] = defaults[item.type] ?? [item.w ?? 80, item.d ?? 60];
  addCadOrientedRect(item.x, item.z, width, depth, rot, cadMaterials.furniture, y);
}

function addCadFixture(item, y) {
  addCadOrientedRect(item.x, item.z, 42, 36, item.rotation ?? 0, cadMaterials.light, y);
}

function addCadOrientedRect(xCm, zCm, widthCm, depthCm, rotDeg, material, y) {
  const centerPoint = toWorld(xCm, zCm);
  const width = widthCm / 100;
  const depth = depthCm / 100;
  const rot = (rotDeg * Math.PI) / 180;
  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
    [-width / 2, -depth / 2],
  ].map(([x, z]) => [
    centerPoint.x + x * Math.cos(rot) - z * Math.sin(rot),
    centerPoint.z + x * Math.sin(rot) + z * Math.cos(rot),
  ]);
  addCadPolyline(corners, material, y);
}

function addCadCircle(xCm, zCm, radiusCm, material, y) {
  const centerPoint = toWorld(xCm, zCm);
  const radius = radiusCm / 100;
  const points = [];
  for (let i = 0; i <= 32; i += 1) {
    const angle = (i / 32) * Math.PI * 2;
    points.push([centerPoint.x + Math.cos(angle) * radius, centerPoint.z + Math.sin(angle) * radius]);
  }
  addCadPolyline(points, material, y);
}

function addCadPolyline(points, material, y) {
  const vertices = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    vertices.push(new THREE.Vector3(points[i][0], y, points[i][1]), new THREE.Vector3(points[i + 1][0], y, points[i + 1][1]));
  }
  const line = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices), material);
  line.renderOrder = 20;
  cadGroup.add(line);
}

function addWindow(item, group) {
  const p = toWorld(item.x, item.z);
  const rotation = ((item.rot ?? 0) * Math.PI) / 180;
  const width = item.w / 100;
  const depth = item.d / 100;
  const windowGroup = new THREE.Group();
  const glassHeight = 0.82;
  const sillHeight = officeElevation + 1.1;

  addBoxToGroup(windowGroup, width, glassHeight, depth, materials.glass, 0, sillHeight, 0);
  addBoxToGroup(windowGroup, width + 0.06, 0.055, depth + 0.025, materials.windowFrame, 0, sillHeight + glassHeight / 2 + 0.04, 0);
  addBoxToGroup(windowGroup, width + 0.06, 0.055, depth + 0.025, materials.windowFrame, 0, sillHeight - glassHeight / 2 - 0.04, 0);
  addBoxToGroup(windowGroup, 0.055, glassHeight + 0.13, depth + 0.025, materials.windowFrame, -width / 2 - 0.03, sillHeight, 0);
  addBoxToGroup(windowGroup, 0.055, glassHeight + 0.13, depth + 0.025, materials.windowFrame, width / 2 + 0.03, sillHeight, 0);

  windowGroup.position.set(p.x, 0, p.z);
  windowGroup.rotation.y = rotation;
  group.add(windowGroup);
}

function addFurniture() {
  for (const item of DESIGN_ITEMS) {
    if (item.type === "desk") addDeskAt(item);
    if (item.type === "chair") addChairAt(item);
    if (item.type === "conferenceTable") addConferenceTableAt(item);
    if (item.type === "cabinet") addCabinetAt(item);
    if (item.type === "shelf") addShelfAt(item);
    if (item.type === "workbench") addWorkbenchAt(item);
    if (item.type === "counter") addCounterAt(item);
    if (item.type === "display") addDisplayAt(item);
    if (item.type === "roundTable") addRoundTableAt(item);
    if (item.type === "reception") addReceptionAt(item);
    if (item.type === "sofa") addSofaAt(item);
    if (item.type === "lounge") addLoungeAt(item);
    if (item.type === "coffee") addCoffeeAt(item);
    if (item.type === "plant") addPlant(item.x, item.z);
    if (item.type === "rug") addRugAt(item);
  }
}

function rectMetrics(item) {
  const x0 = Math.min(item.x0, item.x1);
  const x1 = Math.max(item.x0, item.x1);
  const z0 = Math.min(item.z0, item.z1);
  const z1 = Math.max(item.z0, item.z1);
  const a = toWorld(x0, z0);
  const b = toWorld(x1, z1);
  return {
    x0,
    x1,
    z0,
    z1,
    cx: (a.x + b.x) / 2,
    cz: (a.z + b.z) / 2,
    width: Math.max(Math.abs(b.x - a.x), 0.08),
    depth: Math.max(Math.abs(b.z - a.z), 0.08),
  };
}

function addBoxToGroup(group, width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createGroupAt(item) {
  const p = toWorld(item.x, item.z);
  const group = new THREE.Group();
  group.position.set(p.x, officeElevation, p.z);
  group.rotation.y = ((item.rot ?? 0) * Math.PI) / 180;
  furnitureGroup.add(group);
  return group;
}

function addDeskAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  addBoxToGroup(group, width, 0.075, depth, materials.wood, 0, 0.73, 0);
  addTableLegs(group, width, depth, 0.7);
  addBoxToGroup(group, 0.42, 0.26, 0.035, materials.dark, 0, 0.93, -depth * 0.24);
  addBoxToGroup(group, 0.16, 0.04, 0.12, materials.metal, 0, 0.79, -depth * 0.24);
  addBoxToGroup(group, width * 0.34, 0.055, depth * 0.18, materials.white, -width * 0.2, 0.79, depth * 0.18);
}

function addWorkbenchAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  addBoxToGroup(group, width, 0.09, depth, materials.paleWood, 0, 0.86, 0);
  addBoxToGroup(group, width, 0.72, 0.055, materials.windowFrame, 0, 0.48, -depth / 2 + 0.03);
  addTableLegs(group, width, depth, 0.82);
}

function addTableLegs(group, width, depth, height) {
  const ix = Math.max(width / 2 - 0.1, 0.08);
  const iz = Math.max(depth / 2 - 0.1, 0.08);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBoxToGroup(group, 0.045, height, 0.045, materials.metal, sx * ix, height / 2, sz * iz);
    }
  }
}

function addChairAt(item) {
  const group = createGroupAt({ ...item, w: 0, d: 0 });
  addBoxToGroup(group, 0.38, 0.12, 0.38, materials.chair, 0, 0.43, 0);
  addBoxToGroup(group, 0.38, 0.44, 0.08, materials.chair, 0, 0.66, -0.17);
  addBoxToGroup(group, 0.36, 0.055, 0.36, materials.cushion, 0, 0.51, 0.01);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBoxToGroup(group, 0.032, 0.38, 0.032, materials.metal, sx * 0.14, 0.2, sz * 0.14);
    }
  }
}

function addConferenceTableAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  addBoxToGroup(group, width, 0.085, depth, materials.paleWood, 0, 0.74, 0);
  addBoxToGroup(group, width * 0.78, 0.035, 0.08, materials.white, 0, 0.8, 0);
  addTableLegs(group, width, depth, 0.7);

  const perSide = Math.max(2, Math.floor((item.chairs ?? 8) / 2));
  for (let i = 0; i < perSide; i += 1) {
    const x = -width * 0.4 + (width * 0.8 * i) / Math.max(perSide - 1, 1);
    addLocalChair(group, x, depth / 2 + 0.42, 0);
    addLocalChair(group, x, -depth / 2 - 0.42, 180);
  }
}

function addLocalChair(group, x, z, rot) {
  const chair = new THREE.Group();
  addBoxToGroup(chair, 0.36, 0.12, 0.36, materials.chair, 0, 0.43, 0);
  addBoxToGroup(chair, 0.36, 0.42, 0.08, materials.chair, 0, 0.65, -0.17);
  chair.position.set(x, 0, z);
  chair.rotation.y = (rot * Math.PI) / 180;
  group.add(chair);
}

function addCabinetAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  const height = item.h / 100;
  addBoxToGroup(group, width, height, depth, materials.paleWood, 0, height / 2, 0);
  const panels = Math.max(1, Math.round(width / 0.55));
  for (let i = 0; i < panels; i += 1) {
    const x = -width / 2 + ((i + 0.5) * width) / panels;
    addBoxToGroup(group, width / panels - 0.025, height * 0.72, 0.028, i % 2 ? materials.white : materials.cabinet, x, height * 0.52, -depth / 2 - 0.018);
  }
}

function addShelfAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  const height = item.h / 100;
  for (let i = 0; i <= 4; i += 1) {
    addBoxToGroup(group, width, 0.045, depth, materials.paleWood, 0, (height * i) / 4, 0);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBoxToGroup(group, 0.04, height, 0.04, materials.metal, sx * width / 2, height / 2, sz * depth / 2);
    }
  }
}

function addCounterAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  addBoxToGroup(group, width, 0.86, depth, materials.white, 0, 0.43, 0);
  addBoxToGroup(group, width + 0.08, 0.08, depth + 0.08, materials.wood, 0, 0.9, 0);
  addBoxToGroup(group, width * 0.78, 0.16, 0.035, materials.cabinet, 0, 0.55, -depth / 2 - 0.025);
}

function addDisplayAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  const height = item.h / 100;
  addBoxToGroup(group, width, 0.08, depth, materials.paleWood, 0, 0.04, 0);
  addBoxToGroup(group, width, height, 0.04, materials.white, 0, height / 2, -depth / 2);
  for (let i = 1; i <= 3; i += 1) {
    addBoxToGroup(group, width * 0.9, 0.035, depth * 0.72, materials.glass, 0, (height * i) / 4, 0.04);
  }
}

function addRoundTableAt(item) {
  const group = createGroupAt(item);
  const radius = item.r / 100;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.07, 32), materials.paleWood);
  top.position.y = 0.72;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.68, 16), materials.metal);
  base.position.y = 0.34;
  base.castShadow = true;
  group.add(base);
}

function addReceptionAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  addBoxToGroup(group, width, 1.05, depth, materials.white, 0, 0.525, 0);
  addBoxToGroup(group, width + 0.12, 0.09, depth + 0.1, materials.wood, 0, 1.1, 0);
  addBoxToGroup(group, width * 0.72, 0.18, 0.04, materials.paleWood, 0, 0.66, -depth / 2 - 0.03);
}

function addSofaAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  addBoxToGroup(group, width, 0.18, depth, materials.fabric, 0, 0.28, 0);
  addBoxToGroup(group, width, 0.38, 0.13, materials.fabric, 0, 0.46, -depth / 2 + 0.06);
  addBoxToGroup(group, 0.12, 0.3, depth, materials.fabric, -width / 2 + 0.06, 0.42, 0);
  addBoxToGroup(group, 0.12, 0.3, depth, materials.fabric, width / 2 - 0.06, 0.42, 0);
  addBoxToGroup(group, width * 0.42, 0.08, depth * 0.72, materials.cushion, -width * 0.23, 0.44, 0.04);
  addBoxToGroup(group, width * 0.42, 0.08, depth * 0.72, materials.cushion, width * 0.23, 0.44, 0.04);
}

function addLoungeAt(item) {
  const group = createGroupAt(item);
  addBoxToGroup(group, 0.52, 0.14, 0.52, materials.fabric, 0, 0.32, 0);
  addBoxToGroup(group, 0.52, 0.42, 0.1, materials.fabric, 0, 0.55, -0.24);
  addBoxToGroup(group, 0.08, 0.26, 0.5, materials.paleWood, -0.3, 0.42, 0);
  addBoxToGroup(group, 0.08, 0.26, 0.5, materials.paleWood, 0.3, 0.42, 0);
}

function addCoffeeAt(item) {
  const group = createGroupAt(item);
  const width = item.w / 100;
  const depth = item.d / 100;
  addBoxToGroup(group, width, 0.06, depth, materials.paleWood, 0, 0.42, 0);
  addTableLegs(group, width, depth, 0.38);
}

function addRugAt(item) {
  const group = createGroupAt(item);
  addBoxToGroup(group, item.w / 100, 0.018, item.d / 100, materials.rug, 0, 0.02, 0);
}

function addTable(item, isConference) {
  const m = rectMetrics(item);
  const group = new THREE.Group();
  const topHeight = isConference ? 0.09 : 0.075;
  const tableHeight = isConference ? 0.74 : 0.72;
  const topMat = isConference ? materials.paleWood : materials.wood;
  addBoxToGroup(group, m.width, topHeight, m.depth, topMat, 0, tableHeight, 0);

  const legInsetX = Math.max(m.width / 2 - 0.12, 0.08);
  const legInsetZ = Math.max(m.depth / 2 - 0.12, 0.08);
  const legHeight = tableHeight - topHeight / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBoxToGroup(group, 0.055, legHeight, 0.055, materials.metal, sx * legInsetX, legHeight / 2, sz * legInsetZ);
    }
  }

  if (isConference) {
    addBoxToGroup(group, m.width * 0.82, 0.025, 0.06, materials.blue, 0, tableHeight + 0.055, 0);
  }

  group.position.set(m.cx, officeElevation, m.cz);
  furnitureGroup.add(group);
}

function addCabinet(item) {
  const m = rectMetrics(item);
  const group = new THREE.Group();
  const longSide = Math.max(m.width, m.depth);
  const narrowSide = Math.min(m.width, m.depth);
  const height = narrowSide < 0.36 ? 1.55 : longSide > 1.5 ? 1.18 : 1.35;
  addBoxToGroup(group, m.width, height, m.depth, materials.paleWood, 0, height / 2, 0);

  const facesAlongX = m.width >= m.depth;
  const panelCount = Math.max(1, Math.min(5, Math.round(longSide / 0.55)));
  for (let i = 0; i < panelCount; i += 1) {
    const t = (i + 0.5) / panelCount - 0.5;
    const panelMat = i % 2 === 0 ? materials.white : materials.cabinet;
    if (facesAlongX) {
      addBoxToGroup(group, m.width / panelCount - 0.025, height * 0.74, 0.026, panelMat, t * m.width, height * 0.52, -m.depth / 2 - 0.016);
      addBoxToGroup(group, 0.025, 0.18, 0.018, materials.metal, t * m.width + 0.06, height * 0.52, -m.depth / 2 - 0.035);
    } else {
      addBoxToGroup(group, 0.026, height * 0.74, m.depth / panelCount - 0.025, panelMat, -m.width / 2 - 0.016, height * 0.52, t * m.depth);
      addBoxToGroup(group, 0.018, 0.18, 0.025, materials.metal, -m.width / 2 - 0.035, height * 0.52, t * m.depth + 0.06);
    }
  }

  group.position.set(m.cx, officeElevation, m.cz);
  furnitureGroup.add(group);
}

function addFixtures() {
  for (const item of data.fixtures ?? []) {
    if (item.kind === "toilet") addToilet(item);
    if (item.kind === "sink") addSink(item);
    if (item.kind === "urinal") addUrinal(item);
  }
}

function addFixtureGroup(item) {
  const p = toWorld(item.x, item.z);
  const group = new THREE.Group();
  group.position.set(p.x, officeElevation, p.z);
  group.rotation.y = ((item.rotation ?? 0) * Math.PI) / 180;
  fixtureGroup.add(group);
  return group;
}

function addToilet(item) {
  const group = addFixtureGroup(item);
  addBoxToGroup(group, 0.34, 0.32, 0.12, materials.porcelain, 0, 0.44, -0.22);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.18, 28), materials.porcelain);
  bowl.position.set(0, 0.24, 0.02);
  bowl.scale.set(1.0, 0.72, 1.25);
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  group.add(bowl);
  const seat = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 28), materials.white);
  seat.rotation.x = Math.PI / 2;
  seat.position.set(0, 0.35, 0.03);
  group.add(seat);
}

function addSink(item) {
  const group = addFixtureGroup(item);
  addBoxToGroup(group, 0.46, 0.45, 0.34, materials.white, 0, 0.24, 0);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.055, 28), materials.porcelain);
  basin.position.set(0, 0.49, 0.02);
  basin.scale.set(1.2, 0.45, 0.82);
  group.add(basin);
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 10), materials.metal);
  faucet.rotation.x = Math.PI / 2;
  faucet.position.set(0, 0.58, -0.12);
  group.add(faucet);
}

function addUrinal(item) {
  const group = addFixtureGroup(item);
  addBoxToGroup(group, 0.32, 0.56, 0.16, materials.porcelain, 0, 0.48, -0.12);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.08, 24), materials.porcelain);
  bowl.rotation.x = Math.PI / 2;
  bowl.position.set(0, 0.34, 0.0);
  bowl.scale.set(1, 0.7, 1);
  group.add(bowl);
}

function applyCadMode() {
  if (cadMode) {
    rebuildCadPlan();
    floorGroup.visible = false;
    wallGroup.visible = false;
    furnitureGroup.visible = false;
    fixtureGroup.visible = false;
    labelGroup.visible = false;
    cadGroup.visible = true;
    scene.background = new THREE.Color(0xffffff);
    scene.fog = null;
    toggleCadViewButton?.classList.add("is-active");
    setCameraPreset("cad");
  } else {
    floorGroup.visible = true;
    wallGroup.visible = true;
    furnitureGroup.visible = furnitureVisible;
    fixtureGroup.visible = true;
    labelGroup.visible = document.querySelector("#toggleLabels")?.classList.contains("is-active") ?? true;
    cadGroup.visible = false;
    scene.background = defaultBackground.clone();
    scene.fog = defaultFog;
    toggleCadViewButton?.classList.remove("is-active");
    setCameraPreset("default");
  }
  updateStatus();
}

function addDecor() {
  addEntryRailing();
}

function addEntryRailing() {
  const railDefs = [
    { x: 2240, z: 1460, w: 380, rot: 0 },
    { x: 2700, z: 1350, w: 230, rot: 90 },
  ];
  for (const item of railDefs) {
    const group = createGroupAt(item);
    addBoxToGroup(group, item.w / 100, 0.055, 0.04, materials.metal, 0, 1.12, 0);
    for (const x of [-item.w / 200, 0, item.w / 200]) {
      addBoxToGroup(group, 0.035, 0.72, 0.035, materials.metal, x, 0.72, 0);
    }
  }
}

function addHumanScale() {
  const group = createGroupAt(HUMAN_SCALE);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.75, 12), materials.humanCloth);
  legL.position.set(-0.07, 0.38, 0);
  const legR = legL.clone();
  legR.position.x = 0.07;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.72, 18), materials.humanCloth);
  body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12), materials.skin);
  head.position.y = 1.52;
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 10), materials.skin);
  armL.position.set(-0.22, 1.07, 0);
  armL.rotation.z = 0.18;
  const armR = armL.clone();
  armR.position.x = 0.22;
  armR.rotation.z = -0.18;
  group.add(legL, legR, body, head, armL, armR);
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

function addPlant(x, z) {
  const p = toWorld(x, z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.24, 20), materials.dark);
  pot.position.set(p.x, officeElevation + 0.12, p.z);
  pot.castShadow = true;
  furnitureGroup.add(pot);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.55, 8), materials.plant);
  stem.position.set(p.x, officeElevation + 0.48, p.z);
  furnitureGroup.add(stem);

  for (const [dx, dz, sy] of [[0.12, 0.04, 0.82], [-0.1, 0.07, 0.72], [0.02, -0.12, 0.78]]) {
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 12), materials.plant);
    leaves.position.set(p.x + dx, officeElevation + 0.72 * sy, p.z + dz);
    leaves.scale.set(1.15, 0.48, 0.72);
    leaves.castShadow = true;
    furnitureGroup.add(leaves);
  }
}

function addSofa(item) {
  const m = rectMetrics(item);
  const group = new THREE.Group();
  addBoxToGroup(group, m.width, 0.18, m.depth, materials.fabric, 0, 0.28, 0);
  addBoxToGroup(group, m.width, 0.38, 0.13, materials.fabric, 0, 0.46, -m.depth / 2 + 0.06);
  addBoxToGroup(group, 0.12, 0.3, m.depth, materials.fabric, -m.width / 2 + 0.06, 0.42, 0);
  addBoxToGroup(group, 0.12, 0.3, m.depth, materials.fabric, m.width / 2 - 0.06, 0.42, 0);
  addBoxToGroup(group, m.width * 0.42, 0.08, m.depth * 0.72, materials.cushion, -m.width * 0.23, 0.44, 0.04);
  addBoxToGroup(group, m.width * 0.42, 0.08, m.depth * 0.72, materials.cushion, m.width * 0.23, 0.44, 0.04);
  group.position.set(m.cx, officeElevation, m.cz);
  furnitureGroup.add(group);
}

function addLoungeChair(item) {
  const p = toWorld(item.x, item.z);
  const group = new THREE.Group();
  addBoxToGroup(group, 0.48, 0.14, 0.48, materials.fabric, 0, 0.32, 0);
  addBoxToGroup(group, 0.48, 0.42, 0.1, materials.fabric, 0, 0.55, -0.22);
  addBoxToGroup(group, 0.08, 0.26, 0.46, materials.paleWood, -0.28, 0.42, 0);
  addBoxToGroup(group, 0.08, 0.26, 0.46, materials.paleWood, 0.28, 0.42, 0);
  group.position.set(p.x, officeElevation, p.z);
  group.rotation.y = ((item.rotation ?? 0) * Math.PI) / 180;
  furnitureGroup.add(group);
}

function addCoffeeTable(item) {
  const m = rectMetrics(item);
  const group = new THREE.Group();
  addBoxToGroup(group, m.width, 0.06, m.depth, materials.paleWood, 0, 0.42, 0);
  addBoxToGroup(group, m.width * 0.78, 0.04, m.depth * 0.7, materials.white, 0, 0.47, 0);
  addBoxToGroup(group, 0.045, 0.38, 0.045, materials.metal, -m.width / 2 + 0.1, 0.2, -m.depth / 2 + 0.1);
  addBoxToGroup(group, 0.045, 0.38, 0.045, materials.metal, m.width / 2 - 0.1, 0.2, -m.depth / 2 + 0.1);
  addBoxToGroup(group, 0.045, 0.38, 0.045, materials.metal, -m.width / 2 + 0.1, 0.2, m.depth / 2 - 0.1);
  addBoxToGroup(group, 0.045, 0.38, 0.045, materials.metal, m.width / 2 - 0.1, 0.2, m.depth / 2 - 0.1);
  group.position.set(m.cx, officeElevation, m.cz);
  furnitureGroup.add(group);
}

function addRug(item) {
  const m = rectMetrics(item);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(m.width, 0.018, m.depth), materials.rug);
  mesh.position.set(m.cx, officeElevation + 0.035, m.cz);
  mesh.receiveShadow = true;
  furnitureGroup.add(mesh);
}

function addLabels() {
  const labels = [
    ["維修部儲藏室", 260, 210],
    ["維修部", 835, 200],
    ["倉庫區", 1620, 205],
    ["20人會議室", 2440, 220],
    ["產品展示/介紹室", 1510, 615],
    ["會計檔案室", 780, 760],
    ["總經理辦公室", 245, 1390],
    ["協理辦公室", 690, 1390],
    ["會計辦公區", 1010, 1425],
    ["業務辦公區", 1630, 1240],
    ["櫃檯/行銷部", 2260, 935],
  ];
  for (const [label, x, z] of labels) {
    const sprite = makeTextSprite(label);
    const p = toWorld(x, z);
    sprite.position.set(p.x, officeElevation + 0.08, p.z);
    labelGroup.add(sprite);
  }

  for (const step of data.steps ?? []) {
    const sprite = makeTextSprite(step.label ?? `+${step.heightCm}cm`);
    const p = toWorld((step.x0 + step.x1) / 2, (step.z0 + step.z1) / 2);
    sprite.scale.set(0.78, 0.19, 1);
    sprite.position.set(p.x, (step.heightCm ?? 0) / 100 + 0.08, p.z);
    labelGroup.add(sprite);
  }
}

function addFootprint(item, height, material, group, options = {}) {
  const baseY = options.baseY ?? officeElevation;
  if (item.shape === "segment") {
    const a = toWorld(item.x0, item.z0);
    const b = toWorld(item.x1, item.z1);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const thickness = Math.max((item.thicknessCm || 14) / 100, 0.04);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, height, thickness), material);
    mesh.position.set((a.x + b.x) / 2, baseY + height / 2, (a.z + b.z) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  const x0 = Math.min(item.x0, item.x1);
  const x1 = Math.max(item.x0, item.x1);
  const z0 = Math.min(item.z0, item.z1);
  const z1 = Math.max(item.z0, item.z1);
  const a = toWorld(x0, z0);
  const b = toWorld(x1, z1);
  const width = Math.max(Math.abs(b.x - a.x), 0.03);
  const depth = Math.max(Math.abs(b.z - a.z), 0.03);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set((a.x + b.x) / 2, baseY + height / 2, (a.z + b.z) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (item.kind === "wall" && height > 1 && options.cap !== false) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(width, 0.035, depth), materials.wallTop);
    cap.position.set(mesh.position.x, baseY + height + 0.018, mesh.position.z);
    cap.receiveShadow = true;
    group.add(cap);
  }
  return mesh;
}

function addDoor(item, group) {
  const hinge = toWorld(item.hinge.x, item.hinge.z);
  const endA = toWorld(item.endA.x, item.endA.z);
  const endB = toWorld(item.endB.x, item.endB.z);
  const va = { x: endA.x - hinge.x, z: endA.z - hinge.z };
  const vb = { x: endB.x - hinge.x, z: endB.z - hinge.z };
  const lenA = Math.hypot(va.x, va.z);
  const lenB = Math.hypot(vb.x, vb.z);
  const radius = Math.max((lenA + lenB) / 2, 0.45);
  let dir = { x: va.x + vb.x, z: va.z + vb.z };
  const dirLen = Math.hypot(dir.x, dir.z);
  if (dirLen < 0.05) dir = va;
  else {
    dir.x /= dirLen;
    dir.z /= dirLen;
  }

  const height = Math.min((data.defaults?.doorHeightCm ?? 198) / 100, Math.max(currentWallHeight - 0.02, 1.7));
  const length = Math.max(radius * 0.92, 0.68);
  const thickness = item.type === "narrow" ? 0.04 : 0.05;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(length, height, thickness), materials.door);
  panel.position.set(hinge.x + dir.x * length * 0.5, officeElevation + height * 0.5, hinge.z + dir.z * length * 0.5);
  panel.rotation.y = -Math.atan2(dir.z, dir.x);
  panel.castShadow = true;
  panel.receiveShadow = true;
  group.add(panel);

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), materials.metal);
  handle.position.set(hinge.x + dir.x * length * 0.78, officeElevation + Math.min(height * 0.54, 1.08), hinge.z + dir.z * length * 0.78);
  handle.castShadow = true;
  group.add(handle);

  const hingePost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, height, 10), materials.metal);
  hingePost.position.set(hinge.x, officeElevation + height / 2, hinge.z);
  hingePost.castShadow = true;
  group.add(hingePost);

  addDoorSwingArc(hinge, va, vb, radius, group);
}

function addDoorSwingArc(hinge, va, vb, radius, group) {
  const start = Math.atan2(va.z, va.x);
  const end = Math.atan2(vb.z, vb.x);
  let delta = end - start;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  const steps = 18;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = start + delta * t;
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.lineTo(0, 0);

  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), materials.doorArc);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(hinge.x, officeElevation + 0.033, hinge.z);
  group.add(mesh);
}

function addChair(item, workSurfaces = []) {
  const x = (item.x0 + item.x1) / 2;
  const z = (item.z0 + item.z1) / 2;
  const p = toWorld(x, z);
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), materials.chair);
  seat.position.y = 0.43;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.08), materials.chair);
  back.position.set(0, 0.66, -0.17);
  group.add(seat, back);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBoxToGroup(group, 0.035, 0.38, 0.035, materials.metal, sx * 0.13, 0.2, sz * 0.13);
    }
  }
  const nearest = workSurfaces
    .map((surface) => ({ surface, distance: Math.hypot(surface.cx - p.x, surface.cz - p.z) }))
    .sort((a, b) => a.distance - b.distance)[0]?.surface;
  if (nearest) {
    group.rotation.y = Math.atan2(nearest.cx - p.x, nearest.cz - p.z);
  }
  group.position.set(p.x, officeElevation, p.z);
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  furnitureGroup.add(group);
}

function ensureSelectedColumn() {
  if (!editableColumns.length) {
    selectedColumnId = null;
    return null;
  }
  if (!editableColumns.some((column) => column.__id === selectedColumnId)) {
    selectedColumnId = editableColumns[0].__id;
  }
  return getSelectedColumn();
}

function getSelectedColumn() {
  return editableColumns.find((column) => column.__id === selectedColumnId) ?? null;
}

function getColumnMetrics(column) {
  const x0 = Math.min(column.x0, column.x1);
  const x1 = Math.max(column.x0, column.x1);
  const z0 = Math.min(column.z0, column.z1);
  const z1 = Math.max(column.z0, column.z1);
  return {
    x: (x0 + x1) / 2,
    z: (z0 + z1) / 2,
    w: x1 - x0,
    d: z1 - z0,
  };
}

function setColumnMetrics(column, metrics) {
  const current = getColumnMetrics(column);
  const width = Math.max(Number(metrics.w) || current.w, 10);
  const depth = Math.max(Number(metrics.d) || current.d, 10);
  const x = Number.isFinite(Number(metrics.x)) ? Number(metrics.x) : current.x;
  const z = Number.isFinite(Number(metrics.z)) ? Number(metrics.z) : current.z;
  column.x0 = x - width / 2;
  column.x1 = x + width / 2;
  column.z0 = z - depth / 2;
  column.z1 = z + depth / 2;
  column.shape = "rect";
  column.kind = "column";
}

function syncColumnEditor() {
  const selected = ensureSelectedColumn();
  const disabled = !columnEditorOpen || !selected;
  Object.values(columnInputs).forEach((input) => {
    if (input) input.disabled = disabled;
  });
  document.querySelector("#deleteColumn")?.toggleAttribute("disabled", disabled);

  if (!columnHint) return;
  if (!columnEditorOpen) {
    columnHint.textContent = "重整後恢復原樣";
    return;
  }
  if (!selected) {
    columnHint.textContent = "目前 0 根柱；可按新增";
    return;
  }

  const index = editableColumns.findIndex((column) => column.__id === selected.__id) + 1;
  const metrics = getColumnMetrics(selected);
  columnInputs.x.value = Math.round(metrics.x);
  columnInputs.z.value = Math.round(metrics.z);
  columnInputs.w.value = Math.round(metrics.w);
  columnInputs.d.value = Math.round(metrics.d);
  columnHint.textContent = `第 ${index}/${editableColumns.length} 根；點住柱子可拖曳`;
}

function addColumnAtViewTarget() {
  const target = toPlan(controls.target.x, controls.target.z);
  const selected = getSelectedColumn();
  const size = selected ? getColumnMetrics(selected) : { w: 50, d: 50 };
  const column = {
    kind: "column",
    shape: "rect",
    x0: target.x - size.w / 2,
    x1: target.x + size.w / 2,
    z0: target.z - size.d / 2,
    z1: target.z + size.d / 2,
    source: "temporary-browser-column",
    __id: `column-${nextColumnId++}`,
  };
  editableColumns.push(column);
  selectedColumnId = column.__id;
  syncColumnEditor();
  rebuildWalls();
}

function deleteSelectedColumn() {
  if (!selectedColumnId) return;
  const index = editableColumns.findIndex((column) => column.__id === selectedColumnId);
  if (index < 0) return;
  editableColumns.splice(index, 1);
  selectedColumnId = editableColumns[Math.min(index, editableColumns.length - 1)]?.__id ?? null;
  syncColumnEditor();
  rebuildWalls();
}

function resetEditableColumns() {
  editableColumns = makeEditableColumns(data.columns);
  selectedColumnId = editableColumns[0]?.__id ?? null;
  syncColumnEditor();
  rebuildWalls();
}

function updateSelectedColumnFromFields() {
  const selected = getSelectedColumn();
  if (!selected) return;
  setColumnMetrics(selected, {
    x: Number(columnInputs.x.value),
    z: Number(columnInputs.z.value),
    w: Number(columnInputs.w.value),
    d: Number(columnInputs.d.value),
  });
  rebuildWalls();
}

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
}

function getColumnHitFromEvent(event) {
  if (!columnEditorOpen || !columnPickMeshes.length) return;
  setPointerFromEvent(event);
  return raycaster.intersectObjects(columnPickMeshes, false)[0] ?? raycaster.intersectObjects(columnMeshes, false)[0];
}

function getPlanPointFromEvent(event) {
  setPointerFromEvent(event);
  dragPlane.constant = -officeElevation;
  if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return null;
  return toPlan(dragPoint.x, dragPoint.z);
}

function startColumnDrag(event) {
  const hit = getColumnHitFromEvent(event);
  if (!hit?.object?.userData?.columnId) return;
  selectedColumnId = hit.object.userData.columnId;
  const selected = getSelectedColumn();
  const planPoint = getPlanPointFromEvent(event);
  if (!selected || !planPoint) return;
  const metrics = getColumnMetrics(selected);
  dragColumnOffset = {
    x: metrics.x - planPoint.x,
    z: metrics.z - planPoint.z,
  };
  draggingColumnId = selectedColumnId;
  controls.enabled = false;
  canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  syncColumnEditor();
  rebuildWalls();
}

function dragSelectedColumn(event) {
  if (!draggingColumnId) return;
  const selected = getSelectedColumn();
  const planPoint = getPlanPointFromEvent(event);
  if (!selected || !planPoint) return;
  const metrics = getColumnMetrics(selected);
  setColumnMetrics(selected, {
    x: planPoint.x + dragColumnOffset.x,
    z: planPoint.z + dragColumnOffset.z,
    w: metrics.w,
    d: metrics.d,
  });
  syncColumnEditor();
  rebuildWalls();
  event.preventDefault();
}

function endColumnDrag(event) {
  if (!draggingColumnId) return;
  draggingColumnId = null;
  controls.enabled = true;
  canvas.releasePointerCapture?.(event.pointerId);
  updateStatus();
}

function toWorld(xCm, zCm) {
  return {
    x: (xCm - center.x) / 100,
    z: (zCm - center.z) / 100,
  };
}

function toPlan(worldX, worldZ) {
  return {
    x: worldX * 100 + center.x,
    z: worldZ * 100 + center.z,
  };
}

function makeTextSprite(text) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 360;
  canvasEl.height = 84;
  const ctx = canvasEl.getContext("2d");
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  roundRect(ctx, 8, 8, canvasEl.width - 16, canvasEl.height - 16, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(61,74,82,0.22)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#314047";
  ctx.font = '34px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvasEl.width / 2, canvasEl.height / 2 + 2, canvasEl.width - 28);
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(1.8, 0.42, 1);
  return sprite;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function setCameraPreset(preset) {
  if (preset === "top") {
    camera.position.set(0, 30, 0.01);
    controls.target.set(0, officeElevation, 0);
  } else if (preset === "cad") {
    camera.position.set(0, 38, 0.001);
    controls.target.set(0, officeElevation, 0);
  } else if (preset === "walk") {
    camera.position.set(-5.4, 2.8, 4.5);
    controls.target.set(2.4, officeElevation + 0.9, -0.5);
  } else {
    camera.position.set(12.5, 13, 17);
    controls.target.set(0.4, officeElevation + 0.2, 0.3);
  }
  controls.update();
}

function updateStatus() {
  if (!data) return;
  const columnDelta = editableColumns.length - (data.columns?.length ?? 0);
  const columnText = columnDelta === 0 ? `${editableColumns.length} 根` : `${editableColumns.length} 根（臨時 ${columnDelta > 0 ? "+" : ""}${columnDelta}）`;
  const furnitureText = furnitureVisible ? "家具顯示中" : "家具已隱藏";
  const editText = columnEditorOpen ? "柱子臨時編輯中，重整會復原" : "柱子為原始/當次預覽狀態";
  const viewText = cadMode ? "黑白線條俯視圖" : "3D 預覽";
  statusEl.textContent = `裝潢佈置版：${viewText}；牆 ${data.walls.length} 段 / 門 ${data.doors?.length ?? 0} 組 / 柱 ${columnText} / 矮牆 ${data.lowWalls.length} 段 / 窗 ${WINDOW_ITEMS.length} 組 / 家具 ${DESIGN_ITEMS.length} 件；${furnitureText}；${editText}；手機支援單指旋轉、雙指縮放平移。牆高 ${currentWallHeight.toFixed(2)}m，室內地坪 +${Math.round(officeElevation * 100)}cm。`;
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse?.((obj) => {
      obj.geometry?.dispose();
    });
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
