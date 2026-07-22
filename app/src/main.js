import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createIcons, icons } from "lucide";

createIcons({ icons });

const canvas = document.querySelector("#scene");
const planOpacity = document.querySelector("#planOpacity");
const wallHeightInput = document.querySelector("#wallHeight");
const exteriorWallHeightInput = document.querySelector("#exteriorWallHeight");
const columnHeightInput = document.querySelector("#columnHeight");
const wallHeightPanel = document.querySelector("#wallHeightPanel");
const wallHeightValue = document.querySelector("#wallHeightValue");
const exteriorWallHeightValue = document.querySelector("#exteriorWallHeightValue");
const columnHeightValue = document.querySelector("#columnHeightValue");
const toggleWallHeightButton = document.querySelector("#toggleWallHeight");
const toggleFurnitureButton = document.querySelector("#toggleFurniture");
const toggleColumnEditorButton = document.querySelector("#toggleColumnEditor");
const toggleCadViewButton = document.querySelector("#toggleCadView");
const toggleRoofButton = document.querySelector("#toggleRoof");
const toggleDoorOpenButton = document.querySelector("#toggleDoorOpen");
const toggleLabelsButton = document.querySelector("#toggleLabels");
const togglePlanStorageButton = document.querySelector("#togglePlanStorage");
const planStoragePanel = document.querySelector("#planStoragePanel");
const closePlanStorageButton = document.querySelector("#closePlanStorage");
const planStorageStatus = document.querySelector("#planStorageStatus");
const saveDraftButton = document.querySelector("#saveDraft");
const loadDraftButton = document.querySelector("#loadDraft");
const importPlanFile = document.querySelector("#importPlanFile");
const schemeSelect = document.querySelector("#schemeSelect");
const newSchemeButton = document.querySelector("#newScheme");
const renameSchemeButton = document.querySelector("#renameScheme");
const deleteSchemeButton = document.querySelector("#deleteScheme");
const columnEditor = document.querySelector("#columnEditor");
const columnEditorBody = document.querySelector("#columnEditorBody");
const collapseColumnEditorButton = document.querySelector("#collapseColumnEditor");
const undoEditButton = document.querySelector("#undoEdit");
const redoEditButton = document.querySelector("#redoEdit");
const columnHint = document.querySelector("#columnHint");
const objectTypeOutput = document.querySelector("#objectType");
const objectIdOutput = document.querySelector("#objectId");
const objectHeightInput = document.querySelector("#objectHeight");
const objectHeightField = document.querySelector("#objectHeightField");
const objectRotationInput = document.querySelector("#objectRotation");
const objectRotationField = document.querySelector("#objectRotationField");
const objectVerticalField = document.querySelector("#objectVerticalField");
const objectVerticalInput = document.querySelector("#objectVertical");
const objectHeightLabel = document.querySelector("#objectHeightLabel");
const objectRelation = document.querySelector("#objectRelation");
const objectLinkedWall = document.querySelector("#objectLinkedWall");
const addObjectTypeSelect = document.querySelector("#addObjectType");
const addObjectButton = document.querySelector("#addObject");
const deleteObjectButton = document.querySelector("#deleteObject");
const splitWallButton = document.querySelector("#splitWall");
const flipDoorButton = document.querySelector("#flipDoor");
const columnInputs = {
  x: document.querySelector("#columnX"),
  z: document.querySelector("#columnZ"),
  w: document.querySelector("#columnW"),
  d: document.querySelector("#columnD"),
};
const columnFieldLabels = {
  x: document.querySelector("#columnXLabel"),
  z: document.querySelector("#columnZLabel"),
  w: document.querySelector("#columnWLabel"),
  d: document.querySelector("#columnDLabel"),
};
const columnXField = document.querySelector("#columnXField");
const columnZField = document.querySelector("#columnZField");
const columnDField = document.querySelector("#columnDField");
const objectEditorInputs = [...Object.values(columnInputs), objectHeightInput, objectRotationInput, objectVerticalInput];
const deferredEditorInputs = new Set([columnInputs.w, columnInputs.d, objectHeightInput, objectVerticalInput]);
const pendingEditorInputs = new WeakSet();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8ecef);
scene.fog = new THREE.Fog(0xe8ecef, 30, 68);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.enablePan = true;
controls.minDistance = 4;
controls.maxDistance = 160;
controls.maxPolarAngle = Math.PI * 0.49;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragPoint = new THREE.Vector3();
const PLAN_STORAGE_KEY = "phoenixes-b-office-3d-preview:draft:v1";
const WORKSPACE_STORAGE_KEY = "phoenixes-b-office-3d-preview:workspace:v1";
const PLAN_FORMAT = "phoenixes-office-column-plan";
const PLAN_SCHEMA_VERSION = 6;
const WORKSPACE_FORMAT = "phoenixes-office-design-workspace";
const WORKSPACE_SCHEMA_VERSION = 1;
const ORIGINAL_SCHEME_ID = "original";
const MAX_SCHEMES = 20;
const HISTORY_LIMIT = 50;
const STANDARD_DOOR_WIDTH_CM = 90;
const STANDARD_DOOR_HEIGHT_CM = 210;
const STANDARD_DOOR_THICKNESS_CM = 5;
const WALL_ENDPOINT_SNAP_CM = 20;
const DEFAULT_WALL_THICKNESS_CM = 14;
const DEFAULT_INTERIOR_WALL_HEIGHT_CM = 300;
const DEFAULT_EXTERIOR_WALL_HEIGHT_CM = 560;
const DEFAULT_COLUMN_HEIGHT_CM = 560;
const ENTRANCE_EXTERIOR_WALL_SOURCES = new Set(["orange-6830", "orange-6832", "orange-6833"]);
const ENTRANCE_DOOR_SOURCES = new Set(["door-arc-7424", "door-arc-7427"]);
const REMOVED_WALL_SOURCES = new Set(["orange-ring-6814:0"]);
const AUTOMATIC_DOOR_WIDTH_CM = 471;
const AUTOMATIC_DOOR_HEIGHT_CM = 430;
const WINDOW_FRAME_OVERHANG_CM = 6;
const WINDOW_COLUMN_CLEARANCE_CM = 1;

const root = new THREE.Group();
scene.add(root);

const floorGroup = new THREE.Group();
const wallGroup = new THREE.Group();
const furnitureGroup = new THREE.Group();
const fixtureGroup = new THREE.Group();
const labelGroup = new THREE.Group();
const cadGroup = new THREE.Group();
const roofGroup = new THREE.Group();
const interactionGroup = new THREE.Group();
root.add(floorGroup, wallGroup, furnitureGroup, fixtureGroup, labelGroup, roofGroup, cadGroup, interactionGroup);

const materials = {
  siteGround: new THREE.MeshStandardMaterial({ color: 0xe5e8e4, roughness: 0.86 }),
  floor: new THREE.MeshStandardMaterial({ color: 0xded5c5, roughness: 0.72 }),
  platformSide: new THREE.MeshStandardMaterial({ color: 0xbfc4bf, roughness: 0.8 }),
  step: new THREE.MeshStandardMaterial({ color: 0xd7d2c8, roughness: 0.78 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.78 }),
  wallTop: new THREE.MeshStandardMaterial({ color: 0xd8b174, roughness: 0.62 }),
  exteriorWall: new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: 0.84 }),
  exteriorWallTop: new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: 0.84 }),
  facadeTrim: new THREE.MeshStandardMaterial({ color: 0x20272a, roughness: 0.56, metalness: 0.22 }),
  corrugatedWall: new THREE.MeshStandardMaterial({ color: 0x626b6f, roughness: 0.7, metalness: 0.2 }),
  corrugatedRib: new THREE.MeshStandardMaterial({ color: 0x50585c, roughness: 0.62, metalness: 0.28 }),
  roof: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0 }),
  lowWall: new THREE.MeshPhysicalMaterial({
    color: 0x9ed0d0,
    roughness: 0.18,
    transmission: 0.16,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  }),
  column: new THREE.MeshStandardMaterial({ color: 0x343a3d, roughness: 0.64 }),
  selectedColumn: new THREE.MeshStandardMaterial({ color: 0x343a3d, roughness: 0.64, emissive: 0x111719, emissiveIntensity: 0.12 }),
  columnPick: new THREE.MeshBasicMaterial({ color: 0x2f8f7c, transparent: true, opacity: 0, depthWrite: false }),
  objectPick: new THREE.MeshBasicMaterial({ color: 0x2f8f7c, transparent: true, opacity: 0, depthWrite: false }),
  wallHandle: new THREE.MeshBasicMaterial({ color: 0x167565, transparent: true, opacity: 0.9, depthTest: false }),
  selectionLine: new THREE.LineBasicMaterial({ color: 0x167565, transparent: true, opacity: 0.95, depthTest: false }),
  wood: new THREE.MeshStandardMaterial({ color: 0xcaa58a, roughness: 0.64 }),
  paleWood: new THREE.MeshStandardMaterial({ color: 0xdfc6a7, roughness: 0.66 }),
  chair: new THREE.MeshStandardMaterial({ color: 0x79aa6f, roughness: 0.72 }),
  cabinet: new THREE.MeshStandardMaterial({ color: 0xc985b5, roughness: 0.62 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x9eb3d6, roughness: 0.58 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2f383d, roughness: 0.54 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf8f8f3, roughness: 0.42 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xa7aaa7, metalness: 0.45, roughness: 0.35 }),
  door: new THREE.MeshStandardMaterial({ color: 0xdcc7a6, roughness: 0.55 }),
  doorArc: new THREE.MeshBasicMaterial({ color: 0x1d6db5, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
  sill: new THREE.MeshStandardMaterial({ color: 0x6ec9dc, roughness: 0.42, transparent: true, opacity: 0.72, depthWrite: false }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x26343b,
    roughness: 0.2,
    transmission: 0.08,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -118,
  }),
  windowFrame: new THREE.MeshStandardMaterial({
    color: 0x151a1d,
    roughness: 0.42,
    metalness: 0.28,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  }),
  parking: new THREE.MeshStandardMaterial({ color: 0x8a908d, roughness: 0.92 }),
  road: new THREE.MeshStandardMaterial({ color: 0x555c5c, roughness: 0.96 }),
  marking: new THREE.MeshStandardMaterial({ color: 0xf1f0e9, roughness: 0.72 }),
  curb: new THREE.MeshStandardMaterial({ color: 0xc9cbc6, roughness: 0.86 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xbfc9c2, roughness: 0.88 }),
  cushion: new THREE.MeshStandardMaterial({ color: 0xe7e3da, roughness: 0.86 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xb8c7c0, roughness: 0.9, transparent: true, opacity: 0.72 }),
  porcelain: new THREE.MeshStandardMaterial({ color: 0xf7f7f2, roughness: 0.36 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x3e7d4a, roughness: 0.86 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd7a482, roughness: 0.65 }),
  humanCloth: new THREE.MeshStandardMaterial({ color: 0x6f8790, roughness: 0.78 }),
};

const cadMaterials = {
  grid: new THREE.LineBasicMaterial({ color: 0xaab2b2, transparent: true, opacity: 0.22, depthTest: false }),
  heavy: new THREE.LineBasicMaterial({ color: 0x0e1111, transparent: true, opacity: 0.95, depthTest: false }),
  medium: new THREE.LineBasicMaterial({ color: 0x1f2424, transparent: true, opacity: 0.78, depthTest: false }),
  light: new THREE.LineBasicMaterial({ color: 0x5b6262, transparent: true, opacity: 0.5, depthTest: false }),
  furniture: new THREE.LineBasicMaterial({ color: 0x252a2a, transparent: true, opacity: 0.62, depthTest: false }),
};

const stableWallMaterials = new Map();
const stableConnectionMaterials = new Map();

function getStableConnectionMaterial(baseMaterial, key, units) {
  if (!stableConnectionMaterials.has(key)) {
    const material = baseMaterial.clone();
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = units;
    stableConnectionMaterials.set(key, material);
  }
  return stableConnectionMaterials.get(key);
}

function getStableWallMaterial(category, index, finish = category) {
  const key = `${category}-${finish}-${index}`;
  if (!stableWallMaterials.has(key)) {
    const baseMaterial = category === "exterior" ? materials.exteriorWall : materials.wall;
    const material = baseMaterial.clone();
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -(index + 1) * 0.5;
    stableWallMaterials.set(key, material);
  }
  return stableWallMaterials.get(key);
}

function getStableWallTopMaterial(category, index, finish = category) {
  const key = `top-${category}-${finish}-${index}`;
  if (!stableWallMaterials.has(key)) {
    const baseMaterial = category === "exterior" ? materials.exteriorWallTop : materials.wallTop;
    const material = baseMaterial.clone();
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -(index + 1) * 0.5;
    stableWallMaterials.set(key, material);
  }
  return stableWallMaterials.get(key);
}

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
  { type: "chair", x: 2305, z: 795, rot: 0 },
  { type: "chair", x: 2465, z: 795, rot: 0 },
  { type: "plant", x: 2205, z: 1110 },
  { type: "plant", x: 2630, z: 1110 },
];

const SOUTH_FACADE_WINDOW_BAYS = [
  { label: "B-C", centerX: 1960, widths: [150, 150, 150], gap: 12 },
  { label: "C-D", centerX: 1418, widths: [150, 150, 150], gap: 12 },
  { label: "D-E", centerX: 869, widths: [150, 150, 150], gap: 12 },
  { label: "E-F", centerX: 345, widths: [150, 108, 150], gap: 12 },
];

const EAST_FACADE_WINDOW_BAYS = [
  { label: "5-4", centerZ: 290, widths: [150, 150, 150], gap: 12 },
  { label: "4-3", centerZ: 885, widths: [150, 150, 150], gap: 12 },
];

function getCenteredStripItems(center, widths, gap = 0) {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * gap;
  let cursor = center - totalWidth / 2;
  return widths.map((width) => {
    const position = cursor + width / 2;
    cursor += width + gap;
    return { position, width };
  });
}

const WINDOW_ITEMS = [
  ...EAST_FACADE_WINDOW_BAYS.flatMap((bay) => getCenteredStripItems(bay.centerZ, bay.widths, bay.gap).map((pane, index) => ({
    source: `東側 ${bay.label} 柱間落地窗 ${index + 1}`,
    constructionSized: true,
    x: 2755,
    z: pane.position,
    w: pane.width,
    d: 14,
    h: 560,
    sillCm: 0,
    rot: 90,
  }))),
  ...SOUTH_FACADE_WINDOW_BAYS.flatMap((bay) => getCenteredStripItems(bay.centerX, bay.widths, bay.gap).map((pane, index) => ({
    source: `南側 ${bay.label} 柱間落地窗 ${index + 1}`,
    constructionSized: true,
    x: pane.position,
    z: 1630,
    w: pane.width,
    d: 14,
    h: 560,
    sillCm: 0,
    rot: 0,
  }))),
  { source: "西側廁所高窗 1", constructionSized: true, x: 0, z: 720, w: 80, d: 14, h: 60, sillCm: 175, rot: 90 },
  { source: "西側廁所高窗 2", constructionSized: true, x: 0, z: 930, w: 80, d: 14, h: 60, sillCm: 175, rot: 90 },
];

const AREA_LABELS = [
  { text: "維修部儲藏室", x: 260, z: 210 },
  { text: "維修部", x: 835, z: 200 },
  { text: "倉庫區", x: 1620, z: 205 },
  { text: "20人會議室", x: 2440, z: 220 },
  { text: "產品展示/介紹室", x: 1510, z: 615 },
  { text: "廁所", x: 360, z: 800 },
  { text: "會計檔案室", x: 780, z: 760 },
  { text: "茶水間", x: 2350, z: 650 },
  { text: "總經理室", x: 245, z: 1390 },
  { text: "協理室", x: 690, z: 1390 },
  { text: "會計部", x: 1010, z: 1425 },
  { text: "業務辦公區", x: 1650, z: 1400 },
  { text: "櫃檯/行銷部", x: 2320, z: 935 },
];

const CONSTRUCTION_PLAN = {
  building: { x0: 0, z0: 0, x1: 2755, z1: 1630 },
  sourceBuilding: { width: 2705, depth: 1625 },
  siteBounds: { x0: -260, z0: -250, x1: 4100, z1: 2380 },
  levels: { southRoad: 15, eastParking: 25, porch: 30, threshold: 35, office: 45 },
  axesX: [
    { label: "F", value: 97 },
    { label: "E", value: 593 },
    { label: "D", value: 1145 },
    { label: "C", value: 1690 },
    { label: "B", value: 2230 },
    { label: "A", value: 2755 },
  ],
  axesZ: [
    { label: "5", value: 35 },
    { label: "4", value: 580 },
    { label: "3", value: 1190 },
    { label: "2", value: 1290 },
    { label: "1", value: 1580 },
  ],
  horizontalSegments: [97, 496, 552, 545, 540, 525],
  verticalSegments: [35, 545, 610, 100, 290, 50],
  eastSetbackCm: 420,
  eastParking: { x0: 2755, z0: 40, stallWidth: 250, stallDepth: 550, count: 4 },
  southParking: { startX: 180, centerZ: 1850, spacing: 430, stallWidth: 250, stallDepth: 500, count: 5, angle: 33 },
  southParkingDepth: 400,
  roadEdgeX: 3305,
  roadEdgeZ: 2030,
};

const HUMAN_SCALE = { x: 2275, z: 1355, rot: -25 };

let data;
let bounds;
let center;
let planMesh;
let baseFloor;
let officeElevation = 0.6;
let currentWallHeight = Number(wallHeightInput.value);
let currentExteriorWallHeight = Number(exteriorWallHeightInput.value);
let currentColumnHeight = Number(columnHeightInput.value);
let wallHeightPanelOpen = false;
let planStoragePanelOpen = false;
let furnitureVisible = true;
let columnEditorOpen = false;
let columnEditorCollapsed = false;
let editableWalls = [];
let editableLowWalls = [];
let editableColumns = [];
let editableDoors = [];
let editableWindows = [];
let editableFurniture = [];
let editableRoof = null;
let selectedColumnId = null;
let columnMeshes = [];
let columnPickMeshes = [];
let objectPickMeshes = [];
let objectDescriptors = new Map();
let selectedObject = null;
let nextColumnId = 1;
let draggingObjectId = null;
let draggingObjectMode = "move";
let activeDragPlaneY = officeElevation;
let fixedWallEndpoint = null;
let dragObjectOffset = { x: 0, z: 0 };
let roofResizeStart = null;
let roofResizeStartClientY = 0;
let workspace = createEmptyWorkspace();
let selectedSchemeId = ORIGINAL_SCHEME_ID;
let undoStack = [];
let redoStack = [];
let pendingHistoryAction = null;
let cadMode = false;
let doorsOpen = true;
let roofVisible = true;
let labelsVisible = false;
const defaultBackground = new THREE.Color(0xe8ecef);
const defaultFog = scene.fog;

init();

async function init() {
  data = await fetch("./model-data.json").then((res) => res.json());
  calibrateModelToConstruction(data);
  officeElevation = (data.levels?.officeCm ?? 60) / 100;
  wallHeightInput.min = "1.5";
  wallHeightInput.max = "6";
  wallHeightInput.step = "0.05";
  wallHeightInput.value = (DEFAULT_INTERIOR_WALL_HEIGHT_CM / 100).toFixed(2);
  exteriorWallHeightInput.min = "1.5";
  exteriorWallHeightInput.max = "6";
  exteriorWallHeightInput.step = "0.05";
  exteriorWallHeightInput.value = (DEFAULT_EXTERIOR_WALL_HEIGHT_CM / 100).toFixed(2);
  columnHeightInput.min = "1.5";
  columnHeightInput.max = "10";
  columnHeightInput.step = "0.05";
  columnHeightInput.value = (DEFAULT_COLUMN_HEIGHT_CM / 100).toFixed(2);
  currentWallHeight = Number(wallHeightInput.value);
  currentExteriorWallHeight = Number(exteriorWallHeightInput.value);
  currentColumnHeight = Number(columnHeightInput.value);
  updateWallHeightLabel();
  bounds = getBounds(data);
  center = {
    x: (bounds.x0 + bounds.x1) / 2,
    z: (bounds.z0 + bounds.z1) / 2,
  };
  editableRoof = createDefaultRoof();
  editableWalls = makeEditableFootprints(data.walls, "wall", DEFAULT_INTERIOR_WALL_HEIGHT_CM);
  normalizeEntranceFacadeWall(editableWalls);
  assignWallCategories(editableWalls);
  applyWallCategoryHeights();
  normalizeAmbiguousToiletWallStubs(editableWalls);
  editableLowWalls = makeEditableFootprints(data.lowWalls, "low-wall", data.defaults?.lowWallHeightCm ?? 130);
  editableColumns = makeEditableColumns(data.columns);
  editableDoors = makeEditableDoors(data.doors ?? [], data.doorSills ?? []);
  bridgeWallSegmentsAtDoors();
  editableWindows = makeEditableWindows(WINDOW_ITEMS);
  editableFurniture = makeEditableFurniture(DESIGN_ITEMS);
  refreshOpeningWallLinks();
  workspace = loadWorkspace();
  selectedSchemeId = ORIGINAL_SCHEME_ID;
  renderSchemeOptions();
  refreshPlanStorageStatus();
  setupLights();
  buildScene();
  setCameraPreset("default");
  bindControls();
  resize();
  animate();
}

function calibrateModelToConstruction(model) {
  model.walls = (model.walls ?? []).filter((wall) => !REMOVED_WALL_SOURCES.has(wall.source));
  const scaleX = CONSTRUCTION_PLAN.building.x1 / CONSTRUCTION_PLAN.sourceBuilding.width;
  const scaleZ = CONSTRUCTION_PLAN.building.z1 / CONSTRUCTION_PLAN.sourceBuilding.depth;
  const scaleRect = (item) => {
    if (Number.isFinite(Number(item.x0))) item.x0 = Number(item.x0) * scaleX;
    if (Number.isFinite(Number(item.x1))) item.x1 = Number(item.x1) * scaleX;
    if (Number.isFinite(Number(item.z0))) item.z0 = Number(item.z0) * scaleZ;
    if (Number.isFinite(Number(item.z1))) item.z1 = Number(item.z1) * scaleZ;
    if (Number.isFinite(Number(item.x))) item.x = Number(item.x) * scaleX;
    if (Number.isFinite(Number(item.z))) item.z = Number(item.z) * scaleZ;
    return item;
  };
  ["walls", "lowWalls", "columns", "doorSills", "fixtures", "furniture"].forEach((key) => {
    (model[key] ?? []).forEach(scaleRect);
  });
  [...(model.walls ?? []), ...(model.lowWalls ?? [])].forEach((item) => {
    if (item.x0 < 0) item.x0 = 0;
    if (item.x1 < 0) item.x1 = 0;
    if (item.z0 < 0) item.z0 = 0;
    if (item.z1 < 0) item.z1 = 0;
  });
  const westExteriorWall = (model.walls ?? []).find((item) => item.source === "orange-poly-7419");
  if (westExteriorWall) westExteriorWall.thicknessCm = 14;
  (model.doors ?? []).forEach((door) => {
    [door.hinge, door.endA, door.endB].filter(Boolean).forEach((point) => {
      point.x *= scaleX;
      point.z *= scaleZ;
    });
  });
  DESIGN_ITEMS.forEach(scaleRect);
  AREA_LABELS.forEach(scaleRect);
  scaleRect(HUMAN_SCALE);
  WINDOW_ITEMS.forEach((item) => {
    if (item.constructionSized) return;
    const angle = ((item.rot ?? 0) * Math.PI) / 180;
    const alongScale = Math.hypot(Math.cos(angle) * scaleX, Math.sin(angle) * scaleZ);
    const normalScale = Math.hypot(Math.sin(angle) * scaleX, Math.cos(angle) * scaleZ);
    scaleRect(item);
    item.w *= alongScale;
    item.d *= normalScale;
    if (item.x < 0) item.x = 0;
    if (item.z < 0) item.z = 0;
  });

  // Match the rendered exterior wall envelope to the construction drawing's 2755 x 1630 cm.
  const eastExteriorWall = (model.walls ?? []).find((item) => item.source === "orange-poly-ring-6836:3");
  const southExteriorWall = (model.walls ?? []).find((item) => item.source === "orange-6820");
  const fitX0 = westExteriorWall
    ? Number(westExteriorWall.x0) - Number(westExteriorWall.thicknessCm ?? 14) / 2
    : 0;
  const fitX1 = eastExteriorWall ? Math.max(Number(eastExteriorWall.x0), Number(eastExteriorWall.x1)) : CONSTRUCTION_PLAN.building.x1;
  const fitZ0 = 0;
  const fitZ1 = southExteriorWall ? Math.max(Number(southExteriorWall.z0), Number(southExteriorWall.z1)) : CONSTRUCTION_PLAN.building.z1;
  const fitScaleX = CONSTRUCTION_PLAN.building.x1 / Math.max(fitX1 - fitX0, 1);
  const fitScaleZ = CONSTRUCTION_PLAN.building.z1 / Math.max(fitZ1 - fitZ0, 1);
  const fitRect = (item) => {
    if (Number.isFinite(Number(item.x0))) item.x0 = (Number(item.x0) - fitX0) * fitScaleX;
    if (Number.isFinite(Number(item.x1))) item.x1 = (Number(item.x1) - fitX0) * fitScaleX;
    if (Number.isFinite(Number(item.z0))) item.z0 = (Number(item.z0) - fitZ0) * fitScaleZ;
    if (Number.isFinite(Number(item.z1))) item.z1 = (Number(item.z1) - fitZ0) * fitScaleZ;
    if (Number.isFinite(Number(item.x))) item.x = (Number(item.x) - fitX0) * fitScaleX;
    if (Number.isFinite(Number(item.z))) item.z = (Number(item.z) - fitZ0) * fitScaleZ;
    return item;
  };
  ["walls", "lowWalls", "columns", "doorSills", "fixtures", "furniture"].forEach((key) => {
    (model[key] ?? []).forEach(fitRect);
  });
  if (westExteriorWall?.shape === "segment") westExteriorWall.thicknessCm *= fitScaleX;
  (model.doors ?? []).forEach((door) => {
    [door.hinge, door.endA, door.endB].filter(Boolean).forEach(fitRect);
  });
  DESIGN_ITEMS.forEach(fitRect);
  AREA_LABELS.forEach(fitRect);
  fitRect(HUMAN_SCALE);
  WINDOW_ITEMS.forEach((item) => {
    if (item.constructionSized) return;
    const angle = ((item.rot ?? 0) * Math.PI) / 180;
    const alongScale = Math.hypot(Math.cos(angle) * fitScaleX, Math.sin(angle) * fitScaleZ);
    const normalScale = Math.hypot(Math.sin(angle) * fitScaleX, Math.cos(angle) * fitScaleZ);
    fitRect(item);
    item.w *= alongScale;
    item.d *= normalScale;
  });

  const siteGround = model.floorAreas?.find((area) => area.kind === "site-ground");
  if (siteGround) Object.assign(siteGround, CONSTRUCTION_PLAN.siteBounds);
  const raised = model.floorAreas?.find((area) => area.kind === "raised-office-floor");
  if (raised) Object.assign(raised, { ...CONSTRUCTION_PLAN.building, heightCm: CONSTRUCTION_PLAN.levels.office });
  model.steps = [
    { kind: "entry-porch", shape: "rect", x0: 2150, z0: 1420, x1: 2755, z1: 1630, heightCm: CONSTRUCTION_PLAN.levels.porch, label: "+30" },
    { kind: "entry-threshold", shape: "rect", x0: 2150, z0: 1385, x1: 2755, z1: 1420, heightCm: CONSTRUCTION_PLAN.levels.threshold, label: "+35" },
  ];
  ensureConstructionColumns(model);
  model.levels = { ...(model.levels ?? {}), officeCm: CONSTRUCTION_PLAN.levels.office };
}

function ensureConstructionColumns(model) {
  const source = "施工圖第2頁 A-4 補柱";
  if ((model.columns ?? []).some((column) => column.source === source)) return;
  model.columns ??= [];
  model.columns.push({
    kind: "column",
    shape: "rect",
    x0: CONSTRUCTION_PLAN.building.x1 - 25,
    x1: CONSTRUCTION_PLAN.building.x1 + 25,
    z0: CONSTRUCTION_PLAN.axesZ.find((axis) => axis.label === "4").value - 25,
    z1: CONSTRUCTION_PLAN.axesZ.find((axis) => axis.label === "4").value + 25,
    source,
  });
}

function getBounds(model) {
  return { ...CONSTRUCTION_PLAN.siteBounds };
}

function makeEditableColumns(columns) {
  return makeEditableFootprints(columns, "column", DEFAULT_COLUMN_HEIGHT_CM);
}

function makeEditableFootprints(items, type, defaultHeightCm) {
  const usedIds = new Set();
  if (type === "column") nextColumnId = items.length + 1;
  return items.map((item, index) => {
    const preferredId = typeof item.id === "string" && item.id.length <= 120
      ? item.id
      : getModelObjectId(type, item, index);
    let id = preferredId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${preferredId}-${suffix++}`;
    usedIds.add(id);
    const x0 = Number(item.x0);
    const z0 = Number(item.z0);
    const x1 = Number(item.x1);
    const z1 = Number(item.z1);
    const rawWidth = Math.abs(x1 - x0);
    const rawDepth = Math.abs(z1 - z0);
    const isSegment = item.shape === "segment";
    const isHorizontal = rawWidth >= rawDepth;
    return {
      id,
      __id: id,
      type,
      kind: type === "low-wall" ? "low-wall" : type,
      x: (x0 + x1) / 2,
      z: (z0 + z1) / 2,
      w: isSegment ? Math.hypot(x1 - x0, z1 - z0) : Math.max(rawWidth, rawDepth),
      d: isSegment ? Number(item.thicknessCm ?? 14) : Math.max(Math.min(rawWidth, rawDepth), type === "column" ? 10 : 4),
      h: Number(item.h ?? item.heightCm ?? defaultHeightCm),
      rot: isSegment ? (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI : (isHorizontal ? 0 : 90),
      source: typeof item.source === "string" ? item.source : `${type}-${index + 1}`,
    };
  });
}

function inferWallCategory(wall) {
  if (wall.wallCategory === "exterior" || wall.wallCategory === "interior") return wall.wallCategory;
  if (ENTRANCE_EXTERIOR_WALL_SOURCES.has(wall.source)) return "exterior";
  const axis = getWallAxis(wall);
  const tolerance = Math.max(35, Number(wall.d ?? DEFAULT_WALL_THICKNESS_CM) * 2.5);
  const isHorizontal = Math.abs(axis.x) >= 0.98;
  const isVertical = Math.abs(axis.z) >= 0.98;
  const onHorizontalBoundary = Math.abs(wall.z - CONSTRUCTION_PLAN.building.z0) <= tolerance
    || Math.abs(wall.z - CONSTRUCTION_PLAN.building.z1) <= tolerance;
  const onVerticalBoundary = Math.abs(wall.x - CONSTRUCTION_PLAN.building.x0) <= tolerance
    || Math.abs(wall.x - CONSTRUCTION_PLAN.building.x1) <= tolerance;
  return (isHorizontal && onHorizontalBoundary) || (isVertical && onVerticalBoundary) ? "exterior" : "interior";
}

function inferWallFinish(wall) {
  if (inferWallCategory(wall) !== "exterior") return "interior";
  const axis = getWallAxis(wall);
  const tolerance = Math.max(35, Number(wall.d ?? DEFAULT_WALL_THICKNESS_CM) * 2.5);
  const isVertical = Math.abs(axis.z) >= 0.98;
  if (isVertical && Math.abs(wall.x - CONSTRUCTION_PLAN.building.x0) <= tolerance) return "corrugated";
  return "exterior";
}

function assignWallCategories(walls = editableWalls) {
  walls.forEach((wall) => {
    wall.wallCategory = inferWallCategory(wall);
  });
  return walls;
}

function applyWallCategoryHeights(walls = editableWalls) {
  walls.forEach((wall) => {
    wall.h = Math.round((wall.wallCategory === "exterior" ? currentExteriorWallHeight : currentWallHeight) * 100);
  });
}

function normalizeAmbiguousToiletWallStubs(walls) {
  const upperDoorStub = walls.find((wall) => wall.source === "orange-6805");
  if (upperDoorStub) upperDoorStub.rot = 90;
  const sideDoorStub = walls.find((wall) => wall.source === "orange-6809");
  if (sideDoorStub) sideDoorStub.rot = 0;
}

function normalizeEntranceFacadeWall(walls) {
  const facadePieces = walls.filter((wall) => ["orange-6832", "orange-6833"].includes(wall.source));
  const sideWall = walls.find((wall) => wall.source === "orange-6830");
  if (sideWall) sideWall.wallCategory = "exterior";
  if (facadePieces.length !== 2) return walls;

  const [target, redundant] = facadePieces;
  const x0 = Math.min(...facadePieces.map((wall) => wall.x - wall.w / 2));
  const x1 = Math.max(...facadePieces.map((wall) => wall.x + wall.w / 2));
  const z = facadePieces.reduce((sum, wall) => sum + wall.z, 0) / facadePieces.length;
  setWallFromEndpoints(target, { x: x0, z }, { x: x1, z });
  target.d = Math.max(...facadePieces.map((wall) => wall.d));
  target.source = "入口大門外牆";
  target.wallCategory = "exterior";
  const redundantIndex = walls.indexOf(redundant);
  if (redundantIndex >= 0) walls.splice(redundantIndex, 1);
  return walls;
}

function makeEditableDoors(doors, sills) {
  const editable = doors.map((door, index) => {
    const sill = sills[index];
    const fallbackRadius = Number(door.radiusCm ?? Math.hypot(door.endA.x - door.hinge.x, door.endA.z - door.hinge.z));
    let metrics;
    if (sill) {
      const width = Math.abs(sill.x1 - sill.x0);
      const depth = Math.abs(sill.z1 - sill.z0);
      metrics = {
        x: (sill.x0 + sill.x1) / 2,
        z: (sill.z0 + sill.z1) / 2,
        w: Math.max(width, depth),
        d: Math.max(Math.min(width, depth), 5),
        rot: width >= depth ? 0 : 90,
      };
    } else {
      const dirX = door.endA.x - door.hinge.x;
      const dirZ = door.endA.z - door.hinge.z;
      const length = Math.hypot(dirX, dirZ) || fallbackRadius || 90;
      metrics = {
        x: door.hinge.x + (dirX / length) * length * 0.5,
        z: door.hinge.z + (dirZ / length) * length * 0.5,
        w: length,
        d: 5,
        rot: (Math.atan2(dirZ, dirX) * 180) / Math.PI,
      };
    }
    const angle = (metrics.rot * Math.PI) / 180;
    const axisX = Math.cos(angle);
    const axisZ = Math.sin(angle);
    const hingeProjection = (door.hinge.x - metrics.x) * axisX + (door.hinge.z - metrics.z) * axisZ;
    const normalX = -axisZ;
    const normalZ = axisX;
    const openVector = [door.endA, door.endB]
      .map((point) => ({ x: point.x - door.hinge.x, z: point.z - door.hinge.z }))
      .sort((a, b) => Math.abs(b.x * normalX + b.z * normalZ) - Math.abs(a.x * normalX + a.z * normalZ))[0];
    const hingeAtStart = hingeProjection <= 0;
    const closedDirectionSign = hingeAtStart ? 1 : -1;
    const closedVector = { x: axisX * closedDirectionSign, z: axisZ * closedDirectionSign };
    const swingCross = closedVector.x * openVector.z - closedVector.z * openVector.x;
    return {
      id: getModelObjectId("door", door, index),
      __id: getModelObjectId("door", door, index),
      type: "door",
      kind: "door",
      ...metrics,
      w: STANDARD_DOOR_WIDTH_CM,
      d: STANDARD_DOOR_THICKNESS_CM,
      h: STANDARD_DOOR_HEIGHT_CM,
      hingeAtStart,
      swingSign: swingCross >= 0 ? 1 : -1,
      swingModelVersion: 2,
      source: typeof door.source === "string" ? door.source : `door-${index + 1}`,
    };
  });
  return replaceEntranceDoorsWithAutomaticDoor(editable);
}

function replaceEntranceDoorsWithAutomaticDoor(doors) {
  const entranceDoors = doors.filter((door) => ENTRANCE_DOOR_SOURCES.has(door.source));
  if (entranceDoors.length !== 2) return doors;
  const [first] = entranceDoors;
  const automaticDoor = {
    ...first,
    id: "door-entrance-automatic",
    __id: "door-entrance-automatic",
    x: entranceDoors.reduce((sum, door) => sum + door.x, 0) / entranceDoors.length,
    z: entranceDoors.reduce((sum, door) => sum + door.z, 0) / entranceDoors.length,
    w: AUTOMATIC_DOOR_WIDTH_CM,
    d: STANDARD_DOOR_THICKNESS_CM,
    h: AUTOMATIC_DOOR_HEIGHT_CM,
    rot: 0,
    doorStyle: "automatic",
    source: "圖1 入口自動門 471x430cm（上窗130cm）",
  };
  const insertionIndex = doors.findIndex((door) => ENTRANCE_DOOR_SOURCES.has(door.source));
  const remaining = doors.filter((door) => !ENTRANCE_DOOR_SOURCES.has(door.source));
  remaining.splice(Math.max(0, insertionIndex), 0, automaticDoor);
  return remaining;
}

function makeEditableWindows(items) {
  return items.map((item, index) => {
    const id = getModelObjectId("window", item, index);
    return {
      id,
      __id: id,
      type: "window",
      kind: "window",
      x: Number(item.x),
      z: Number(item.z),
      w: Number(item.w ?? 240),
      d: Number(item.d ?? 8),
      h: Number(item.h ?? 110),
      sillCm: Number(item.sillCm ?? 80),
      rot: Number(item.rot ?? 0),
      source: typeof item.source === "string" ? item.source : `window-${index + 1}`,
    };
  });
}

const FURNITURE_DEFAULTS = {
  chair: { w: 46, d: 46, h: 92 },
  lounge: { w: 66, d: 66, h: 92 },
  plant: { w: 52, d: 52, h: 100 },
  roundTable: { w: 120, d: 120, h: 76 },
  workbench: { w: 180, d: 60, h: 90 },
  desk: { w: 130, d: 70, h: 100 },
  conferenceTable: { w: 460, d: 160, h: 100 },
  reception: { w: 300, d: 80, h: 120 },
  sofa: { w: 180, d: 80, h: 90 },
  coffee: { w: 80, d: 50, h: 50 },
  cabinet: { w: 120, d: 42, h: 150 },
  shelf: { w: 150, d: 36, h: 180 },
  counter: { w: 140, d: 44, h: 100 },
  display: { w: 120, d: 36, h: 180 },
  rug: { w: 160, d: 100, h: 5 },
};

function makeEditableFurniture(items) {
  return items.map((item, index) => {
    const furnitureType = item.furnitureType ?? item.type;
    const defaults = FURNITURE_DEFAULTS[furnitureType] ?? { w: 80, d: 60, h: 100 };
    const diameter = Number(item.r) * 2;
    const id = typeof item.id === "string" ? item.id : `furniture-${furnitureType}-${index + 1}`;
    return {
      ...item,
      id,
      __id: id,
      type: "furniture",
      kind: "furniture",
      furnitureType,
      x: Math.round(Number(item.x)),
      z: Math.round(Number(item.z)),
      w: Math.round(Number(item.w ?? (Number.isFinite(diameter) ? diameter : defaults.w))),
      d: Math.round(Number(item.d ?? (Number.isFinite(diameter) ? diameter : defaults.d))),
      h: Math.round(Number(item.h ?? defaults.h)),
      rot: normalizeAngle(Math.round(Number(item.rot ?? item.rotation ?? 0))),
      source: typeof item.source === "string" ? item.source : `${furnitureType}-${index + 1}`,
    };
  });
}

function getModelObjectId(prefix, item, index) {
  const source = typeof item?.source === "string" ? item.source : `${index + 1}`;
  const safeSource = source.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || `${index + 1}`;
  return `${prefix}-${safeSource}`;
}

function createObjectId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-user-${Date.now().toString(36)}-${random}`;
}

function setWallHeightPanelOpen(open) {
  wallHeightPanelOpen = open;
  if (open && planStoragePanelOpen) setPlanStoragePanelOpen(false);
  if (open && columnEditorOpen) setColumnEditorCollapsed(true);
  if (wallHeightPanel) wallHeightPanel.hidden = !open;
  toggleWallHeightButton?.classList.toggle("is-active", open);
  toggleWallHeightButton?.setAttribute("aria-expanded", String(open));
}

function setPlanStoragePanelOpen(open) {
  planStoragePanelOpen = open;
  if (open) {
    setWallHeightPanelOpen(false);
    if (columnEditorOpen) setColumnEditorOpen(false);
    refreshPlanStorageStatus();
  }
  if (planStoragePanel) planStoragePanel.hidden = !open;
  togglePlanStorageButton?.classList.toggle("is-active", open);
  togglePlanStorageButton?.setAttribute("aria-expanded", String(open));
}

function updateWallHeightLabel() {
  const interiorLabel = `${currentWallHeight.toFixed(2)}m`;
  const exteriorLabel = `${currentExteriorWallHeight.toFixed(2)}m`;
  const columnLabel = `${currentColumnHeight.toFixed(2)}m`;
  if (wallHeightValue) wallHeightValue.textContent = interiorLabel;
  if (exteriorWallHeightValue) exteriorWallHeightValue.textContent = exteriorLabel;
  if (columnHeightValue) columnHeightValue.textContent = columnLabel;
  toggleWallHeightButton?.setAttribute("title", `外牆 ${exteriorLabel}／隔間 ${interiorLabel}／柱子 ${columnLabel}`);
  toggleWallHeightButton?.setAttribute("aria-label", `外牆 ${exteriorLabel}／隔間 ${interiorLabel}／柱子 ${columnLabel}`);
}

function setColumnEditorCollapsed(collapsed) {
  columnEditorCollapsed = collapsed;
  columnEditor?.classList.toggle("is-collapsed", collapsed);
  if (columnEditorBody) columnEditorBody.hidden = collapsed;
  collapseColumnEditorButton?.setAttribute("aria-expanded", String(!collapsed));
  collapseColumnEditorButton?.setAttribute("aria-label", collapsed ? "展開物件編輯" : "收合物件編輯");
  collapseColumnEditorButton?.setAttribute("title", collapsed ? "展開物件編輯" : "收合物件編輯");
}

function setColumnEditorOpen(open) {
  columnEditorOpen = open;
  columnEditor.hidden = !open;
  toggleColumnEditorButton?.classList.toggle("is-active", open);
  toggleColumnEditorButton?.setAttribute("aria-expanded", String(open));
  if (open) {
    setColumnEditorCollapsed(false);
    setWallHeightPanelOpen(false);
    setPlanStoragePanelOpen(false);
  } else {
    selectedColumnId = null;
    selectedObject = null;
  }
  syncColumnEditor();
  rebuildWalls();
}

function bindControls() {
  document.querySelector("#resetView").addEventListener("click", () => setCameraPreset("default"));
  document.querySelector("#topView").addEventListener("click", () => setCameraPreset("top"));
  toggleWallHeightButton?.addEventListener("click", () => setWallHeightPanelOpen(!wallHeightPanelOpen));
  togglePlanStorageButton?.addEventListener("click", () => setPlanStoragePanelOpen(!planStoragePanelOpen));
  closePlanStorageButton?.addEventListener("click", () => setPlanStoragePanelOpen(false));
  schemeSelect?.addEventListener("change", () => {
    selectedSchemeId = schemeSelect.value;
    refreshPlanStorageStatus();
  });
  newSchemeButton?.addEventListener("click", createScheme);
  renameSchemeButton?.addEventListener("click", renameSelectedScheme);
  deleteSchemeButton?.addEventListener("click", deleteSelectedScheme);
  undoEditButton?.addEventListener("click", undoEdit);
  redoEditButton?.addEventListener("click", redoEdit);
  toggleCadViewButton?.addEventListener("click", () => {
    cadMode = !cadMode;
    applyCadMode();
  });
  toggleRoofButton?.addEventListener("click", () => {
    roofVisible = !roofVisible;
    toggleRoofButton.classList.toggle("is-active", roofVisible);
    toggleRoofButton.setAttribute("aria-pressed", String(roofVisible));
    toggleRoofButton.setAttribute("title", roofVisible ? "隱藏平屋頂" : "顯示平屋頂");
    toggleRoofButton.setAttribute("aria-label", roofVisible ? "隱藏平屋頂" : "顯示平屋頂");
    if (!roofVisible && selectedObject?.type === "roof") {
      selectedObject = null;
    }
    rebuildWalls();
  });
  toggleDoorOpenButton?.addEventListener("click", () => {
    doorsOpen = !doorsOpen;
    toggleDoorOpenButton.classList.toggle("is-active", doorsOpen);
    toggleDoorOpenButton.setAttribute("title", doorsOpen ? "將門片關閉展示" : "將門片開啟展示");
    toggleDoorOpenButton.setAttribute("aria-label", doorsOpen ? "將門片關閉展示" : "將門片開啟展示");
    rebuildWalls();
  });
  toggleFurnitureButton?.addEventListener("click", () => {
    furnitureVisible = !furnitureVisible;
    furnitureGroup.visible = furnitureVisible && !cadMode;
    toggleFurnitureButton.classList.toggle("is-active", furnitureVisible);
    toggleFurnitureButton.setAttribute("aria-pressed", String(furnitureVisible));
    toggleFurnitureButton.setAttribute("aria-label", furnitureVisible ? "隱藏家具" : "顯示家具");
    rebuildWalls();
    updateStatus();
  });
  toggleColumnEditorButton?.addEventListener("click", () => setColumnEditorOpen(!columnEditorOpen));
  collapseColumnEditorButton?.addEventListener("click", () => setColumnEditorCollapsed(!columnEditorCollapsed));
  document.querySelector("#togglePlan")?.addEventListener("click", (event) => {
    if (!planMesh) return;
    planMesh.visible = !planMesh.visible;
    event.currentTarget.classList.toggle("is-active", planMesh.visible);
  });
  toggleLabelsButton?.addEventListener("click", () => {
    labelsVisible = !labelsVisible;
    labelGroup.visible = labelsVisible && !cadMode;
    toggleLabelsButton.classList.toggle("is-active", labelsVisible);
    toggleLabelsButton.setAttribute("aria-pressed", String(labelsVisible));
    toggleLabelsButton.setAttribute("title", labelsVisible ? "隱藏空間標籤" : "顯示空間標籤");
    toggleLabelsButton.setAttribute("aria-label", labelsVisible ? "隱藏空間標籤" : "顯示空間標籤");
  });
  planOpacity?.addEventListener("input", () => {
    if (planMesh) planMesh.material.opacity = Number(planOpacity.value);
  });
  wallHeightInput.addEventListener("input", () => {
    currentWallHeight = Number(wallHeightInput.value);
    const heightCm = Math.round(currentWallHeight * 100);
    editableWalls.filter((wall) => wall.wallCategory !== "exterior").forEach((wall) => {
      wall.h = heightCm;
    });
    updateWallHeightLabel();
    rebuildWalls();
  });
  exteriorWallHeightInput.addEventListener("input", () => {
    currentExteriorWallHeight = Number(exteriorWallHeightInput.value);
    const heightCm = Math.round(currentExteriorWallHeight * 100);
    editableWalls.filter((wall) => wall.wallCategory === "exterior").forEach((wall) => {
      wall.h = heightCm;
    });
    updateWallHeightLabel();
    rebuildWalls();
  });
  columnHeightInput.addEventListener("input", () => {
    currentColumnHeight = Number(columnHeightInput.value);
    const heightCm = Math.round(currentColumnHeight * 100);
    editableColumns.forEach((column) => {
      column.h = heightCm;
    });
    updateWallHeightLabel();
    rebuildWalls();
  });
  ["pointerdown", "focus"].forEach((eventName) => {
    wallHeightInput.addEventListener(eventName, () => beginHistoryAction("調整牆高"));
    exteriorWallHeightInput.addEventListener(eventName, () => beginHistoryAction("調整外牆高度"));
    columnHeightInput.addEventListener(eventName, () => beginHistoryAction("調整全部柱子高度"));
  });
  ["change", "blur"].forEach((eventName) => {
    wallHeightInput.addEventListener(eventName, commitHistoryAction);
    exteriorWallHeightInput.addEventListener(eventName, commitHistoryAction);
    columnHeightInput.addEventListener(eventName, commitHistoryAction);
  });
  addObjectButton?.addEventListener("click", () => {
    const type = addObjectTypeSelect?.value ?? "wall";
    performHistoryAction(`新增${type}`, () => addEditableObjectAtViewTarget(type));
  });
  deleteObjectButton?.addEventListener("click", () => performHistoryAction("刪除物件", deleteSelectedEditableObject));
  splitWallButton?.addEventListener("click", () => performHistoryAction("分割牆面", splitSelectedWall));
  flipDoorButton?.addEventListener("click", () => performHistoryAction("翻轉門片方向", flipSelectedDoor));
  document.querySelector("#resetColumns")?.addEventListener("click", () => performHistoryAction("重設柱子", resetEditableColumns));
  saveDraftButton?.addEventListener("click", saveDraft);
  loadDraftButton?.addEventListener("click", loadDraft);
  document.querySelector("#exportPlan")?.addEventListener("click", exportPlan);
  document.querySelector("#importPlan")?.addEventListener("click", () => importPlanFile?.click());
  document.querySelector("#restoreOriginal")?.addEventListener("click", restoreOriginalPlan);
  importPlanFile?.addEventListener("change", importPlanFromFile);
  objectEditorInputs.forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => {
      if (deferredEditorInputs.has(input)) {
        pendingEditorInputs.add(input);
        return;
      }
      updateSelectedObjectFromFields();
    });
    ["pointerdown", "focus"].forEach((eventName) => {
      input.addEventListener(eventName, () => {
        const typeLabel = selectedObject ? objectDescriptors.get(selectedObject.id)?.typeLabel : "物件";
        beginHistoryAction(`調整${typeLabel ?? "物件"}尺寸`);
      });
    });
    const applyPendingEditorInput = () => {
      if (pendingEditorInputs.has(input)) {
        pendingEditorInputs.delete(input);
        updateSelectedObjectFromFields();
      }
      commitHistoryAction();
    };
    ["change", "blur"].forEach((eventName) => {
      input.addEventListener(eventName, applyPendingEditorInput);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      applyPendingEditorInput();
      input.blur();
    });
  });
  canvas.addEventListener("pointerdown", startObjectInteraction);
  canvas.addEventListener("pointermove", dragSelectedObject);
  canvas.addEventListener("pointerup", endObjectDrag);
  canvas.addEventListener("pointercancel", endObjectDrag);
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
  rebuildFurniture();
  rebuildWalls();
  addFixtures();
  addLabels();
  labelGroup.visible = labelsVisible;
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
  addConstructionSite();

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

function addConstructionSite() {
  const { roadEdgeX, roadEdgeZ, eastParking, southParking, levels } = CONSTRUCTION_PLAN;
  addPlatform({ x0: bounds.x0, z0: roadEdgeZ, x1: bounds.x1, z1: bounds.z1, heightCm: levels.southRoad }, materials.road, floorGroup);
  addPlatform({ x0: roadEdgeX, z0: bounds.z0, x1: bounds.x1, z1: bounds.z1, heightCm: levels.southRoad }, materials.road, floorGroup);
  addPlatform({ x0: eastParking.x0, z0: eastParking.z0, x1: roadEdgeX, z1: 1120, heightCm: levels.eastParking }, materials.parking, floorGroup);
  addPlatform({ x0: 2180, z0: 1040, x1: roadEdgeX, z1: roadEdgeZ, heightCm: levels.eastParking }, materials.parking, floorGroup);
  addPlatform({ x0: -30, z0: CONSTRUCTION_PLAN.building.z1, x1: 2200, z1: roadEdgeZ, heightCm: levels.southRoad }, materials.parking, floorGroup);

  const eastBays = Array.from({ length: eastParking.count }, (_, index) => ({
    x: eastParking.x0 + eastParking.stallDepth / 2,
    z: eastParking.z0 + eastParking.stallWidth * (index + 0.5),
    w: eastParking.stallDepth,
    d: eastParking.stallWidth,
    rot: 0,
    levelCm: levels.eastParking,
  }));
  eastBays.forEach(addParkingBay3D);

  const southBays = Array.from({ length: southParking.count }, (_, index) => ({
    x: southParking.startX + southParking.spacing * index,
    z: southParking.centerZ,
    w: southParking.stallDepth,
    d: southParking.stallWidth,
    rot: southParking.angle,
    levelCm: levels.southRoad,
  }));
  southBays.forEach((bay) => {
    addParkingBay3D(bay);
  });

  addSiteCurb(roadEdgeX, (bounds.z0 + roadEdgeZ) / 2, 10, roadEdgeZ - bounds.z0, 0, levels.southRoad);
  addSiteCurb((bounds.x0 + roadEdgeX) / 2, roadEdgeZ, roadEdgeX - bounds.x0, 10, 0, levels.southRoad);
}

function addParkingBay3D(item) {
  const position = toWorld(item.x, item.z);
  const group = new THREE.Group();
  const width = item.w / 100;
  const depth = item.d / 100;
  const line = 0.045;
  const y = item.levelCm / 100 + 0.014;
  addBoxToGroup(group, width, 0.024, line, materials.marking, 0, y, -depth / 2);
  addBoxToGroup(group, width, 0.024, line, materials.marking, 0, y, depth / 2);
  addBoxToGroup(group, line, 0.024, depth, materials.marking, -width / 2, y, 0);
  addBoxToGroup(group, line, 0.024, depth, materials.marking, width / 2, y, 0);
  group.position.set(position.x, 0, position.z);
  group.rotation.y = -((item.rot ?? 0) * Math.PI) / 180;
  floorGroup.add(group);
}

function addSiteCurb(x, z, widthCm, depthCm, rot, levelCm) {
  const position = toWorld(x, z);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(widthCm / 100, 0.04), 0.16, Math.max(depthCm / 100, 0.04)), materials.curb);
  mesh.position.set(position.x, levelCm / 100 + 0.08, position.z);
  mesh.rotation.y = -((rot ?? 0) * Math.PI) / 180;
  mesh.receiveShadow = true;
  floorGroup.add(mesh);
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
  clearGroup(interactionGroup);
  columnMeshes = [];
  columnPickMeshes = [];
  objectPickMeshes = [];
  objectDescriptors = new Map();
  refreshOpeningWallLinks();
  editableWalls.forEach((item, index) => {
    const category = inferWallCategory(item);
    item.wallCategory = category;
    item.wallFinish = inferWallFinish(item);
    item.__renderIndex = index;
    addEditableWall(item, getWallOpenings(item), getStableWallMaterial(category, index, item.wallFinish));
    const wallLabel = category === "exterior" ? "外牆" : "隔間牆";
    registerEditableObject(item, index, wallLabel, { x: "X cm", z: "Z cm", w: "長 cm", d: "厚 cm" }, 1);
  });
  editableLowWalls.forEach((item, index) => {
    const material = getStableConnectionMaterial(materials.lowWall, `low-wall-${item.id}`, -(80 + index));
    addEditableWall(item, getColumnWallCuts(item), material);
    registerEditableObject(item, index, "矮牆", { x: "X cm", z: "Z cm", w: "長 cm", d: "厚 cm" }, 2);
  });
  editableColumns.forEach((item, index) => {
    const selected = columnEditorOpen && item.id === selectedObject?.id;
    const material = getStableConnectionMaterial(
      selected ? materials.selectedColumn : materials.column,
      `column-${item.id}-${selected ? "selected" : "normal"}`,
      -(160 + index),
    );
    const mesh = addEditableSolid(getColumnRenderItem(item), material);
    mesh.userData.columnId = item.__id;
    mesh.userData.isEditableColumn = true;
    columnMeshes.push(mesh);
    registerEditableObject(item, index, "柱子", { x: "X cm", z: "Z cm", w: "寬 cm", d: "深 cm" }, 3);
  });
  addWestCorrugatedCladding();
  editableDoors.forEach((item, index) => {
    addDoor(item, wallGroup, index);
    addEditableDoorSill(item, index);
    registerEditableObject(item, index, "門", { x: "X cm", z: "Z cm", w: "門寬 cm", d: "厚 cm" }, 5, findWallReferenceById(item.wallId));
  });
  editableWindows.forEach((item, index) => {
    addWindow(item, wallGroup, index);
    registerEditableObject(item, index, "窗戶", { x: "X cm", z: "Z cm", w: "窗寬 cm", d: "厚 cm" }, 6, findWallReferenceById(item.wallId), officeElevation + item.sillCm / 100);
  });
  if (furnitureVisible) {
    editableFurniture.forEach((item, index) => {
      const label = getFurnitureTypeLabel(item.furnitureType);
      registerEditableObject(item, index, label, { x: "X cm", z: "Z cm", w: "寬 cm", d: "深 cm" }, 4, null, officeElevation);
    });
  }
  rebuildRoofPreview();
  addSelectedObjectOutline();
  addSelectedWallEndpointHandles();
  addSelectedRoofResizeHandles();
  rebuildCadPlan();
  updateStatus();
  if (columnEditorOpen) syncColumnEditor();
}

function rebuildRoofPreview() {
  clearGroup(roofGroup);
  if (!editableRoof) return;
  const position = toWorld(editableRoof.x, editableRoof.z);
  const height = editableRoof.h / 100;
  const baseY = getRoofBaseY();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(editableRoof.w / 100, height, editableRoof.d / 100),
    materials.roof,
  );
  mesh.position.set(position.x, baseY + height / 2, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  roofGroup.add(mesh);
  roofGroup.visible = roofVisible && !cadMode;
  if (roofVisible && !cadMode) {
    registerEditableObject(
      editableRoof,
      0,
      "屋頂",
      { x: "X cm", z: "Z cm", w: "長 cm", d: "寬 cm" },
      8,
      null,
      baseY,
    );
  }
}

function createDefaultRoof() {
  const { building } = CONSTRUCTION_PLAN;
  const overhangCm = 45;
  return {
    id: "roof-main",
    __id: "roof-main",
    type: "roof",
    kind: "roof",
    x: Math.round((building.x0 + building.x1) / 2),
    z: Math.round((building.z0 + building.z1) / 2),
    w: Math.round(building.x1 - building.x0 + overhangCm * 2),
    d: Math.round(building.z1 - building.z0 + overhangCm * 2),
    h: 250,
    rot: 0,
    source: "純白平屋頂",
  };
}

function getRoofBaseY() {
  const exteriorWallHeights = editableWalls
    .filter((wall) => inferWallCategory(wall) === "exterior")
    .map((wall) => Number(wall.h) || 0);
  const highestExteriorWallCm = Math.max(currentExteriorWallHeight * 100, ...exteriorWallHeights);
  return officeElevation + highestExteriorWallCm / 100 + 0.025;
}

function registerEditableObject(item, index, typeLabel, fieldLabels, priority, linkedWall = null, baseY = officeElevation) {
  const descriptor = {
    id: item.id,
    type: item.type,
    typeLabel,
    sourceLabel: item.source || `${typeLabel} ${index + 1}`,
    item,
    metrics: getEditableMetrics(item),
    fieldLabels,
    linkedWall,
    editable: true,
    index,
  };
  const pickMetrics = { ...descriptor.metrics, d: Math.max(descriptor.metrics.d, item.type === "column" ? 36 : 18) };
  const pickMesh = addOrientedObjectHitbox(pickMetrics, descriptor, priority, baseY);
  if (item.type === "column") columnPickMeshes.push(pickMesh);
  registerSelectableObject(descriptor, pickMesh, priority);
}

function getEditableMetrics(item) {
  return { x: item.x, z: item.z, w: item.w, d: item.d, h: item.h, rot: item.rot ?? 0, sillCm: item.sillCm };
}

function getEditableCollection(type) {
  if (type === "roof") return editableRoof ? [editableRoof] : [];
  if (type === "wall") return editableWalls;
  if (type === "low-wall") return editableLowWalls;
  if (type === "column") return editableColumns;
  if (type === "door") return editableDoors;
  if (type === "window") return editableWindows;
  if (type === "furniture") return editableFurniture;
  return [];
}

function getEditableObjectById(id, type = null) {
  if (type) return getEditableCollection(type).find((item) => item.id === id) ?? null;
  return [[editableRoof].filter(Boolean), editableWalls, editableLowWalls, editableColumns, editableDoors, editableWindows, editableFurniture]
    .flat()
    .find((item) => item.id === id) ?? null;
}

function getSelectedEditableObject() {
  return selectedObject ? getEditableObjectById(selectedObject.id, selectedObject.type) : null;
}

function setEditableMetrics(item, metrics) {
  const minimumWidth = item.type === "window" ? 1 : item.type === "door" ? 40 : 10;
  const minimumDepth = ["column", "roof"].includes(item.type) ? 10 : 3;
  const minimumHeight = item.type === "door" ? 150 : item.type === "window" ? 30 : item.type === "roof" ? 5 : 10;
  const previousWall = item.type === "wall" ? { x: item.x, z: item.z, rot: item.rot ?? 0 } : null;
  const attachedOpenings = previousWall
    ? [...editableDoors, ...editableWindows]
      .filter((opening) => opening.wallId === item.id)
      .map((opening) => ({ opening, along: getOpeningAlongWall(opening, previousWall) }))
    : [];
  const roofCenterX = (CONSTRUCTION_PLAN.building.x0 + CONSTRUCTION_PLAN.building.x1) / 2;
  const roofCenterZ = (CONSTRUCTION_PLAN.building.z0 + CONSTRUCTION_PLAN.building.z1) / 2;
  item.x = item.type === "roof"
    ? Math.round(roofCenterX)
    : Math.round(Number.isFinite(Number(metrics.x)) ? Number(metrics.x) : item.x);
  item.z = item.type === "roof"
    ? Math.round(roofCenterZ)
    : Math.round(Number.isFinite(Number(metrics.z)) ? Number(metrics.z) : item.z);
  item.w = Math.round(Math.max(Number(metrics.w) || item.w, minimumWidth));
  if (!["door", "window"].includes(item.type)) {
    item.d = Math.round(Math.max(Number(metrics.d) || item.d, minimumDepth));
  }
  const maximumHeight = item.type === "column" ? 1000 : item.type === "wall" ? 600 : 500;
  item.h = Math.round(Math.min(maximumHeight, Math.max(Number(metrics.h) || item.h, minimumHeight)));
  item.rot = item.type === "roof"
    ? 0
    : normalizeAngle(Math.round(Number.isFinite(Number(metrics.rot)) ? Number(metrics.rot) : item.rot ?? 0));
  if (item.type === "window" && Number.isFinite(Number(metrics.sillCm))) item.sillCm = Math.max(0, Math.round(Number(metrics.sillCm)));
  if (item.type === "door" || item.type === "window") updateOpeningWallLink(item);
  if (item.type === "wall") {
    const axis = getWallAxis(item);
    attachedOpenings.forEach(({ opening, along }) => {
      opening.x = item.x + axis.x * along;
      opening.z = item.z + axis.z * along;
      snapOpeningToWall(opening, item);
    });
    refreshOpeningWallLinks();
  }
}

function getOpeningAlongWall(opening, wall) {
  const axis = getWallAxis(wall);
  return (opening.x - wall.x) * axis.x + (opening.z - wall.z) * axis.z;
}

function getFurnitureTypeLabel(type) {
  const labels = {
    workbench: "工作桌",
    desk: "辦公桌",
    chair: "椅子",
    roundTable: "圓桌",
    lounge: "休閒椅",
    plant: "植栽",
    conferenceTable: "會議桌",
    reception: "櫃檯",
    sofa: "沙發",
    coffee: "茶几",
    cabinet: "櫃體",
    shelf: "層架",
    counter: "吧檯",
    display: "展示架",
    rug: "地毯",
  };
  return labels[type] ?? "家具";
}

function normalizeAngle(value) {
  let angle = Number(value) || 0;
  while (angle > 180) angle -= 360;
  while (angle <= -180) angle += 360;
  return angle;
}

function getWallEndpoints(wall) {
  const angle = ((wall.rot ?? 0) * Math.PI) / 180;
  const halfX = Math.cos(angle) * wall.w * 0.5;
  const halfZ = Math.sin(angle) * wall.w * 0.5;
  return {
    start: { x: wall.x - halfX, z: wall.z - halfZ },
    end: { x: wall.x + halfX, z: wall.z + halfZ },
  };
}

function setWallFromEndpoints(wall, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.max(10, Math.hypot(dx, dz));
  if (length <= 10 && Math.hypot(dx, dz) < 1) return;
  wall.x = Math.round((start.x + end.x) / 2);
  wall.z = Math.round((start.z + end.z) / 2);
  wall.w = Math.round(length);
  wall.rot = normalizeAngle(Math.round((Math.atan2(dz, dx) * 180) / Math.PI));
}

function getWallAxis(wall) {
  const angle = ((wall.rot ?? 0) * Math.PI) / 180;
  return { x: Math.cos(angle), z: Math.sin(angle) };
}

function areWallsCollinear(a, b, toleranceCm = 8) {
  const axisA = getWallAxis(a);
  const axisB = getWallAxis(b);
  if (Math.abs(axisA.x * axisB.x + axisA.z * axisB.z) < 0.998) return false;
  const normal = { x: -axisA.z, z: axisA.x };
  return Math.abs((b.x - a.x) * normal.x + (b.z - a.z) * normal.z) <= toleranceCm;
}

function getWallIntervalOnAxis(wall, axis) {
  const endpoints = getWallEndpoints(wall);
  const values = [endpoints.start, endpoints.end].map((point) => point.x * axis.x + point.z * axis.z);
  return { min: Math.min(...values), max: Math.max(...values) };
}

function getIntervalGap(a, b) {
  if (a.max < b.min) return b.min - a.max;
  if (b.max < a.min) return a.min - b.max;
  return 0;
}

function mergeWallPair(target, source, walls = editableWalls, doors = editableDoors, windows = editableWindows) {
  if (!target || !source || target.id === source.id) return target;
  if (inferWallCategory(target) !== inferWallCategory(source)) return target;
  const axis = getWallAxis(target);
  const normal = { x: -axis.z, z: axis.x };
  const targetInterval = getWallIntervalOnAxis(target, axis);
  const sourceInterval = getWallIntervalOnAxis(source, axis);
  const min = Math.min(targetInterval.min, sourceInterval.min);
  const max = Math.max(targetInterval.max, sourceInterval.max);
  const normalOffset = target.x * normal.x + target.z * normal.z;
  const middle = (min + max) / 2;
  target.x = Math.round(axis.x * middle + normal.x * normalOffset);
  target.z = Math.round(axis.z * middle + normal.z * normalOffset);
  target.w = Math.round(max - min);
  [...doors, ...windows].forEach((opening) => {
    if (opening.wallId === source.id) opening.wallId = target.id;
  });
  const sourceIndex = walls.findIndex((wall) => wall.id === source.id);
  if (sourceIndex >= 0) walls.splice(sourceIndex, 1);
  if (walls === editableWalls && selectedObject?.id === source.id) selectedObject = { id: target.id, type: "wall" };
  return target;
}

function mergeTouchingCollinearWalls(maxGapCm = WALL_ENDPOINT_SNAP_CM, walls = editableWalls, doors = editableDoors, windows = editableWindows) {
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < walls.length && !merged; i += 1) {
      for (let j = i + 1; j < walls.length; j += 1) {
        const first = walls[i];
        const second = walls[j];
        if (inferWallCategory(first) !== inferWallCategory(second)) continue;
        if (Math.abs(first.d - second.d) > 1 || Math.abs(first.h - second.h) > 1) continue;
        if (!areWallsCollinear(first, second, Math.max(6, (first.d + second.d) / 2))) continue;
        const axis = getWallAxis(first);
        const gap = getIntervalGap(getWallIntervalOnAxis(first, axis), getWallIntervalOnAxis(second, axis));
        if (gap > maxGapCm) continue;
        mergeWallPair(first, second, walls, doors, windows);
        merged = true;
        break;
      }
    }
  }
}

function bridgeWallSegmentsAtDoors(walls = editableWalls, doors = editableDoors, windows = editableWindows) {
  for (const door of doors) {
    const axis = getWallAxis(door);
    const normal = { x: -axis.z, z: axis.x };
    const doorCenter = door.x * axis.x + door.z * axis.z;
    const candidates = walls
      .filter((wall) => {
        const wallAxis = getWallAxis(wall);
        const parallel = Math.abs(axis.x * wallAxis.x + axis.z * wallAxis.z) >= 0.998;
        const normalDistance = Math.abs((wall.x - door.x) * normal.x + (wall.z - door.z) * normal.z);
        return parallel && normalDistance <= Math.max(18, wall.d);
      })
      .map((wall) => ({ wall, interval: getWallIntervalOnAxis(wall, axis) }));
    if (candidates.some(({ interval }) => interval.min <= doorCenter - door.w / 2 && interval.max >= doorCenter + door.w / 2)) continue;
    const left = candidates
      .filter(({ interval }) => interval.max <= doorCenter + 8)
      .sort((a, b) => b.interval.max - a.interval.max)[0];
    const right = candidates
      .filter(({ interval }) => interval.min >= doorCenter - 8)
      .sort((a, b) => a.interval.min - b.interval.min)[0];
    if (!left || !right || left.wall.id === right.wall.id) continue;
    if (right.interval.min - left.interval.max > door.w + 70) continue;
    mergeWallPair(left.wall, right.wall, walls, doors, windows);
  }
  mergeTouchingCollinearWalls(3, walls, doors, windows);
}

function snapWallEndpoint(point, wallId) {
  let nearest = null;
  editableWalls.forEach((wall) => {
    if (wall.id === wallId) return;
    const endpoints = getWallEndpoints(wall);
    const dx = endpoints.end.x - endpoints.start.x;
    const dz = endpoints.end.z - endpoints.start.z;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared
      ? Math.max(0, Math.min(1, ((point.x - endpoints.start.x) * dx + (point.z - endpoints.start.z) * dz) / lengthSquared))
      : 0;
    const candidates = [
      endpoints.start,
      endpoints.end,
      { x: endpoints.start.x + dx * t, z: endpoints.start.z + dz * t },
    ];
    candidates.forEach((endpoint) => {
      const distance = Math.hypot(endpoint.x - point.x, endpoint.z - point.z);
      if (distance <= WALL_ENDPOINT_SNAP_CM && (!nearest || distance < nearest.distance)) nearest = { ...endpoint, distance };
    });
  });
  return nearest ? { x: nearest.x, z: nearest.z } : point;
}

function findNearestWallReference(x, z, minimumWidth = 0, walls = editableWalls) {
  let nearest = null;
  walls.forEach((wall, index) => {
    if (wall.w + 0.5 < minimumWidth) return;
    const distance = distanceToWallCenterline(x, z, wall);
    if (!nearest || distance < nearest.distance) {
      nearest = {
        id: wall.id,
        label: wall.source || `牆面 ${index + 1}`,
        distance,
        item: wall,
      };
    }
  });
  return nearest;
}

function distanceToWallCenterline(x, z, wall) {
  const angle = ((wall.rot ?? 0) * Math.PI) / 180;
  const halfX = Math.cos(angle) * wall.w * 0.5;
  const halfZ = Math.sin(angle) * wall.w * 0.5;
  return distancePointToSegment(x, z, wall.x - halfX, wall.z - halfZ, wall.x + halfX, wall.z + halfZ);
}

function distancePointToSegment(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const lengthSquared = dx * dx + dz * dz;
  if (!lengthSquared) return Math.hypot(px - x0, pz - z0);
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / lengthSquared));
  return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
}

function addOrientedObjectHitbox(metrics, descriptor, priority, baseY) {
  const width = Math.max(metrics.w / 100, 0.08);
  const depth = Math.max(metrics.d / 100, 0.08);
  const height = Math.max(metrics.h / 100, 0.08);
  const position = toWorld(metrics.x, metrics.z);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.objectPick);
  mesh.position.set(position.x, baseY + height / 2, position.z);
  mesh.rotation.y = -((metrics.rot ?? 0) * Math.PI) / 180;
  mesh.userData.objectId = descriptor.id;
  mesh.userData.objectType = descriptor.type;
  mesh.userData.pickPriority = priority;
  mesh.renderOrder = -1;
  interactionGroup.add(mesh);
  return mesh;
}

function findWallReferenceById(id, walls = editableWalls) {
  if (!id) return null;
  const index = walls.findIndex((wall) => wall.id === id);
  const wall = walls[index];
  return wall ? { id: wall.id, label: wall.source || `牆面 ${index + 1}`, distance: 0, item: wall } : null;
}

function snapOpeningToWall(item, wall) {
  const angle = ((wall.rot ?? 0) * Math.PI) / 180;
  const axisX = Math.cos(angle);
  const axisZ = Math.sin(angle);
  const rawAlong = (item.x - wall.x) * axisX + (item.z - wall.z) * axisZ;
  const maximumAlong = Math.max(0, (wall.w - item.w) / 2);
  const along = Math.max(-maximumAlong, Math.min(maximumAlong, rawAlong));
  item.x = Math.round(wall.x + axisX * along);
  item.z = Math.round(wall.z + axisZ * along);
  item.rot = normalizeAngle(Math.round(wall.rot ?? 0));
  item.d = Math.max(1, Math.round(wall.d));
  item.wallId = wall.id;
  if (item.type === "window") constrainWindowToWallBay(item, wall);
}

function constrainWindowToWallBay(item, wall) {
  const wallAngle = ((wall.rot ?? 0) * Math.PI) / 180;
  const wallAxis = { x: Math.cos(wallAngle), z: Math.sin(wallAngle) };
  const desiredAlong = (item.x - wall.x) * wallAxis.x + (item.z - wall.z) * wallAxis.z;
  const wallHalfWidth = wall.w / 2;
  const columnBlocks = editableColumns
    .map((column) => getColumnProjectionOnWall(wall, column))
    .filter(Boolean)
    .map((interval) => ({
      start: Math.max(-wallHalfWidth, interval.start - WINDOW_COLUMN_CLEARANCE_CM),
      end: Math.min(wallHalfWidth, interval.end + WINDOW_COLUMN_CLEARANCE_CM),
    }));
  const itemBottom = Number(item.sillCm ?? 0);
  const itemTop = itemBottom + Number(item.h ?? 0);
  const windowBlocks = editableWindows
    .filter((other) => other.id !== item.id && other.wallId === wall.id)
    .filter((other) => {
      const otherBottom = Number(other.sillCm ?? 0);
      const otherTop = otherBottom + Number(other.h ?? 0);
      return itemBottom < otherTop && itemTop > otherBottom;
    })
    .map((other) => {
      const otherAlong = (other.x - wall.x) * wallAxis.x + (other.z - wall.z) * wallAxis.z;
      const halfFootprint = other.w / 2 + WINDOW_FRAME_OVERHANG_CM;
      return { start: otherAlong - halfFootprint, end: otherAlong + halfFootprint };
    });
  const blocked = [...columnBlocks, ...windowBlocks]
    .filter((interval) => interval.end > -wallHalfWidth && interval.start < wallHalfWidth)
    .sort((a, b) => a.start - b.start);

  const freeIntervals = [];
  let cursor = -wallHalfWidth;
  for (const interval of blocked) {
    if (interval.start > cursor) freeIntervals.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < wallHalfWidth) freeIntervals.push({ start: cursor, end: wallHalfWidth });
  if (!freeIntervals.length) return;

  const edgeAllowance = WINDOW_FRAME_OVERHANG_CM;
  const candidates = freeIntervals.flatMap((interval) => {
    const maximumWidth = Math.floor(interval.end - interval.start - edgeAllowance * 2);
    if (maximumWidth < 1) return [];
    const width = Math.min(item.w, maximumWidth);
    const halfFootprint = width / 2 + edgeAllowance;
    const center = Math.max(interval.start + halfFootprint, Math.min(interval.end - halfFootprint, desiredAlong));
    return [{ center, width, distance: Math.abs(center - desiredAlong) }];
  });
  if (!candidates.length) return;
  candidates.sort((a, b) => a.distance - b.distance || b.width - a.width);
  const target = candidates[0];
  item.w = Math.max(1, Math.round(target.width));
  item.x = Math.round(wall.x + wallAxis.x * target.center);
  item.z = Math.round(wall.z + wallAxis.z * target.center);
}

function clampWindowVertical(item, wall) {
  if (item.type !== "window" || !wall) return;
  const wallHeight = Math.max(30, Number(wall.h ?? 200));
  item.h = Math.min(item.h, wallHeight);
  item.sillCm = Math.max(0, Math.min(Math.round(item.sillCm ?? 80), Math.max(0, wallHeight - item.h)));
}

function updateOpeningWallLink(item, { preferLinkedWall = false, walls = editableWalls } = {}) {
  const linkedWall = preferLinkedWall ? findWallReferenceById(item.wallId, walls) : null;
  const linkedWallFits = linkedWall?.item?.w + 0.5 >= item.w ? linkedWall : null;
  const wallReference = linkedWallFits
    ?? findNearestWallReference(item.x, item.z, item.w, walls)
    ?? findNearestWallReference(item.x, item.z, 40, walls);
  if (!wallReference?.item) {
    item.wallId = null;
    return;
  }
  const minimumWidth = item.type === "window" ? 1 : 40;
  if (item.w > wallReference.item.w) item.w = Math.max(minimumWidth, Math.round(wallReference.item.w));
  snapOpeningToWall(item, wallReference.item);
  clampWindowVertical(item, wallReference.item);
}

function refreshOpeningWallLinks(walls = editableWalls, doors = editableDoors, windows = editableWindows) {
  [...doors, ...windows].forEach((item) => updateOpeningWallLink(item, { preferLinkedWall: true, walls }));
  windows.forEach((item) => {
    const wall = findWallReferenceById(item.wallId, walls)?.item;
    if (!wall) return;
    constrainWindowToWallBay(item, wall);
    clampWindowVertical(item, wall);
  });
}

function getArchitecturalWallOpenings(wall) {
  const angle = ((wall.rot ?? 0) * Math.PI) / 180;
  const axisX = Math.cos(angle);
  const axisZ = Math.sin(angle);
  return [...editableDoors, ...editableWindows]
    .filter((item) => item.wallId === wall.id)
    .map((item) => {
      const along = (item.x - wall.x) * axisX + (item.z - wall.z) * axisZ;
      const clearance = item.type === "window" ? 1.5 : 0.5;
      return {
        id: item.id,
        start: along - item.w / 2 - clearance,
        end: along + item.w / 2 + clearance,
        bottom: item.type === "window" ? Math.max(0, item.sillCm - clearance) : 0,
        top: (item.type === "window" ? item.sillCm : 0) + item.h + clearance,
      };
    });
}

function getWallOpenings(wall) {
  return [...getArchitecturalWallOpenings(wall), ...getColumnWallCuts(wall)]
    .filter((opening) => opening.end > -wall.w / 2 && opening.start < wall.w / 2)
    .sort((a, b) => a.start - b.start);
}

function getColumnWallCuts(wall) {
  const seamCoverCm = 0.5;

  return editableColumns.flatMap((column) => {
    const interval = getColumnProjectionOnWall(wall, column);
    if (!interval) return [];
    return [{
      id: `column-cut-${column.id}`,
      start: interval.start + seamCoverCm,
      end: interval.end - seamCoverCm,
      bottom: 0,
      top: Math.min(Number(column.h) || 0, Number(wall.h) || 0),
    }];
  });
}

function getColumnProjectionOnWall(wall, column) {
  const wallAngle = ((wall.rot ?? 0) * Math.PI) / 180;
  const wallAxis = { x: Math.cos(wallAngle), z: Math.sin(wallAngle) };
  const wallNormal = { x: -wallAxis.z, z: wallAxis.x };
  const wallHalfDepth = Math.max(Number(wall.d ?? DEFAULT_WALL_THICKNESS_CM) / 2, 2);
  const columnAngle = ((column.rot ?? 0) * Math.PI) / 180;
  const columnAxis = { x: Math.cos(columnAngle), z: Math.sin(columnAngle) };
  const columnNormal = { x: -columnAxis.z, z: columnAxis.x };
  const halfWidth = Math.max(Number(column.w) / 2, 1);
  const halfDepth = Math.max(Number(column.d) / 2, 1);
  const extentAlong = Math.abs(wallAxis.x * columnAxis.x + wallAxis.z * columnAxis.z) * halfWidth
    + Math.abs(wallAxis.x * columnNormal.x + wallAxis.z * columnNormal.z) * halfDepth;
  const extentNormal = Math.abs(wallNormal.x * columnAxis.x + wallNormal.z * columnAxis.z) * halfWidth
    + Math.abs(wallNormal.x * columnNormal.x + wallNormal.z * columnNormal.z) * halfDepth;
  const delta = { x: column.x - wall.x, z: column.z - wall.z };
  const normalDistance = Math.abs(delta.x * wallNormal.x + delta.z * wallNormal.z);
  if (normalDistance > wallHalfDepth + extentNormal + 0.5) return null;
  const along = delta.x * wallAxis.x + delta.z * wallAxis.z;
  return { start: along - extentAlong, end: along + extentAlong };
}

function addEditableWall(wall, openings, material) {
  const seamOverlapCm = ["wall", "cladding"].includes(wall.type) ? 0.8 : 0;
  if (!openings.length) {
    addEditableSolid({ ...wall, w: wall.w + seamOverlapCm }, material, 0, wall.h, true);
    return;
  }
  let cursor = -wall.w / 2;
  for (const opening of openings) {
    const start = Math.max(cursor, Math.max(-wall.w / 2, opening.start));
    const end = Math.max(start, Math.min(wall.w / 2, opening.end));
    if (start - cursor >= 2) addWallPiece(wall, (cursor + start) / 2, start - cursor, 0, wall.h, material, true);
    const openingLength = end - start;
    const bottomHeight = Math.max(0, Math.min(opening.bottom, wall.h));
    const topStart = Math.max(0, Math.min(opening.top, wall.h));
    if (openingLength >= 2 && bottomHeight >= 2) addWallPiece(wall, (start + end) / 2, openingLength, 0, bottomHeight, material, false);
    if (openingLength >= 2 && wall.h - topStart >= 2) addWallPiece(wall, (start + end) / 2, openingLength, topStart, wall.h - topStart, material, true);
    cursor = Math.max(cursor, end);
  }
  if (wall.w / 2 - cursor >= 2) addWallPiece(wall, (cursor + wall.w / 2) / 2, wall.w / 2 - cursor, 0, wall.h, material, true);
}

function addWallPiece(wall, alongCenterCm, lengthCm, baseCm, heightCm, material, cap) {
  const angle = ((wall.rot ?? 0) * Math.PI) / 180;
  const seamOverlapCm = ["wall", "cladding"].includes(wall.type) ? 0.8 : 0;
  return addEditableSolid({
    ...wall,
    x: wall.x + Math.cos(angle) * alongCenterCm,
    z: wall.z + Math.sin(angle) * alongCenterCm,
    w: lengthCm + seamOverlapCm,
    h: heightCm,
  }, material, baseCm, heightCm, cap);
}

function addEditableSolid(item, material, baseCm = 0, heightCm = item.h, cap = false) {
  const position = toWorld(item.x, item.z);
  const height = Math.max(heightCm / 100, 0.02);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(item.w / 100, 0.02), height, Math.max(item.d / 100, 0.02)), material);
  mesh.position.set(position.x, officeElevation + baseCm / 100 + height / 2, position.z);
  mesh.rotation.y = -((item.rot ?? 0) * Math.PI) / 180;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  wallGroup.add(mesh);
  if (cap && item.type === "wall") {
    const capMaterial = getStableWallTopMaterial(item.wallCategory, item.__renderIndex ?? 0, item.wallFinish);
    const capMesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(item.w / 100, 0.02), 0.035, Math.max(item.d / 100, 0.02)), capMaterial);
    capMesh.position.set(position.x, officeElevation + (baseCm + heightCm) / 100 + 0.018, position.z);
    capMesh.rotation.y = mesh.rotation.y;
    capMesh.receiveShadow = true;
    wallGroup.add(capMesh);
  }
  return mesh;
}

function getColumnRenderItem(item) {
  const { building } = CONSTRUCTION_PLAN;
  const revealDepthCm = 30;
  const edgeToleranceCm = 130;
  const seamCoverCm = 1;
  const nearWest = Math.abs(item.x - building.x0) <= edgeToleranceCm;
  const nearEast = Math.abs(item.x - building.x1) <= edgeToleranceCm;
  const nearNorth = Math.abs(item.z - building.z0) <= edgeToleranceCm;
  const nearSouth = Math.abs(item.z - building.z1) <= edgeToleranceCm;
  if (!nearWest && !nearEast && !nearNorth && !nearSouth) {
    return { ...item, w: item.w + seamCoverCm, d: item.d + seamCoverCm };
  }

  const angle = ((item.rot ?? 0) * Math.PI) / 180;
  const halfExtentX = Math.abs(Math.cos(angle)) * item.w / 2 + Math.abs(Math.sin(angle)) * item.d / 2;
  const halfExtentZ = Math.abs(Math.sin(angle)) * item.w / 2 + Math.abs(Math.cos(angle)) * item.d / 2;
  let x0 = item.x - halfExtentX - seamCoverCm / 2;
  let x1 = item.x + halfExtentX + seamCoverCm / 2;
  let z0 = item.z - halfExtentZ - seamCoverCm / 2;
  let z1 = item.z + halfExtentZ + seamCoverCm / 2;
  if (nearWest) {
    const renderedWidth = x1 - x0;
    x0 = building.x0 - DEFAULT_WALL_THICKNESS_CM / 2;
    x1 = x0 + renderedWidth;
  }
  if (nearEast) x1 = Math.max(x1, building.x1 + revealDepthCm);
  if (nearNorth) z0 = Math.min(z0, building.z0 - revealDepthCm);
  if (nearSouth) z1 = Math.max(z1, building.z1 + revealDepthCm);

  return {
    ...item,
    x: (x0 + x1) / 2,
    z: (z0 + z1) / 2,
    w: x1 - x0,
    d: z1 - z0,
    rot: 0,
  };
}

function addWestCorrugatedCladding() {
  const westWalls = editableWalls.filter((wall) => inferWallFinish(wall) === "corrugated");
  if (!westWalls.length) return;
  const claddingDepthCm = 1.8;
  const surfaceGapM = 0.004;
  const ribDepth = 0.026;
  const ribWidth = 0.022;

  westWalls.forEach((wall) => {
    const wallDepthCm = Number(wall.d) || DEFAULT_WALL_THICKNESS_CM;
    const wallHeightCm = Number(wall.h) || DEFAULT_EXTERIOR_WALL_HEIGHT_CM;
    const wallOpenings = getArchitecturalWallOpenings(wall)
      .filter((opening) => opening.end > -wall.w / 2 && opening.start < wall.w / 2)
      .sort((a, b) => a.start - b.start);
    const claddingX = wall.x - wallDepthCm / 2 - claddingDepthCm / 2 - surfaceGapM * 100;
    const claddingWall = {
      ...wall,
      type: "cladding",
      x: claddingX,
      d: claddingDepthCm,
      wallCategory: "exterior",
      wallFinish: "corrugated",
    };
    addEditableWall(claddingWall, wallOpenings, materials.corrugatedWall);

    const wallStart = wall.z - wall.w / 2;
    const wallEnd = wall.z + wall.w / 2;
    for (let z = wallStart + 12; z < wallEnd; z += 24) {
      const along = z - wall.z;
      const verticalCuts = wallOpenings
        .filter((opening) => along >= opening.start && along <= opening.end)
        .map((opening) => ({
          start: Math.max(0, opening.bottom),
          end: Math.min(wallHeightCm, opening.top),
        }))
        .filter((opening) => opening.end > opening.start)
        .sort((a, b) => a.start - b.start);
      let cursor = 0;
      const ribSegments = [];
      verticalCuts.forEach((cut) => {
        if (cut.start - cursor >= 1) ribSegments.push({ start: cursor, end: cut.start });
        cursor = Math.max(cursor, cut.end);
      });
      if (wallHeightCm - cursor >= 1) ribSegments.push({ start: cursor, end: wallHeightCm });

      const position = toWorld(claddingX, z);
      ribSegments.forEach((segment) => {
        const segmentHeight = (segment.end - segment.start) / 100;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(ribDepth, segmentHeight, ribWidth), materials.corrugatedRib);
        rib.position.set(
          position.x - claddingDepthCm / 200 - ribDepth / 2 - surfaceGapM,
          officeElevation + segment.start / 100 + segmentHeight / 2,
          position.z,
        );
        rib.castShadow = true;
        rib.receiveShadow = true;
        rib.renderOrder = 6;
        wallGroup.add(rib);
      });
    }
  });
}

function addEditableDoorSill(item, index) {
  const material = getStableConnectionMaterial(materials.sill, `door-sill-${item.id}`, -(220 + index));
  const mesh = addEditableSolid({ ...item, h: 4 }, material, 1, 4, false);
  mesh.renderOrder = 6;
}

function registerSelectableObject(descriptor, pickMesh, priority = 1) {
  descriptor.pickMesh = pickMesh;
  objectDescriptors.set(descriptor.id, descriptor);
  pickMesh.userData.objectId = descriptor.id;
  pickMesh.userData.objectType = descriptor.type;
  pickMesh.userData.pickPriority = priority;
  objectPickMeshes.push(pickMesh);
}

function addSelectedObjectOutline() {
  if (!columnEditorOpen || !selectedObject) return;
  const descriptor = objectDescriptors.get(selectedObject.id);
  const pickMesh = descriptor?.pickMesh;
  if (!pickMesh?.geometry) return;
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(pickMesh.geometry), materials.selectionLine);
  outline.position.copy(pickMesh.position);
  outline.quaternion.copy(pickMesh.quaternion);
  outline.scale.copy(pickMesh.scale);
  outline.renderOrder = 50;
  interactionGroup.add(outline);
}

function addSelectedWallEndpointHandles() {
  if (!columnEditorOpen || selectedObject?.type !== "wall") return;
  const wall = getSelectedEditableObject();
  if (!wall) return;
  const endpoints = getWallEndpoints(wall);
  Object.entries(endpoints).forEach(([endpointName, point]) => {
    const world = toWorld(point.x, point.z);
    const visibleHandle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12), materials.wallHandle);
    visibleHandle.position.set(world.x, officeElevation + 0.11, world.z);
    visibleHandle.renderOrder = 60;
    interactionGroup.add(visibleHandle);
    const hitHandle = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), materials.objectPick);
    hitHandle.position.copy(visibleHandle.position);
    hitHandle.userData.objectId = wall.id;
    hitHandle.userData.objectType = "wall";
    hitHandle.userData.wallEndpoint = endpointName;
    hitHandle.userData.pickPriority = 20;
    interactionGroup.add(hitHandle);
    objectPickMeshes.push(hitHandle);
  });
}

function addSelectedRoofResizeHandles() {
  if (!columnEditorOpen || selectedObject?.type !== "roof" || !roofVisible || cadMode) return;
  const roof = getSelectedEditableObject();
  if (!roof) return;
  const centerWorld = toWorld(roof.x, roof.z);
  const roofTopY = getRoofBaseY() + roof.h / 100;
  const handles = [
    { axis: "w", x: centerWorld.x + roof.w / 200, y: roofTopY + 0.1, z: centerWorld.z },
    { axis: "w", x: centerWorld.x - roof.w / 200, y: roofTopY + 0.1, z: centerWorld.z },
    { axis: "d", x: centerWorld.x, y: roofTopY + 0.1, z: centerWorld.z + roof.d / 200 },
    { axis: "d", x: centerWorld.x, y: roofTopY + 0.1, z: centerWorld.z - roof.d / 200 },
    { axis: "h", x: centerWorld.x, y: roofTopY + 0.42, z: centerWorld.z },
  ];

  const guide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(centerWorld.x, roofTopY + 0.02, centerWorld.z),
      new THREE.Vector3(centerWorld.x, roofTopY + 0.42, centerWorld.z),
    ]),
    materials.selectionLine,
  );
  guide.renderOrder = 58;
  interactionGroup.add(guide);

  handles.forEach((handle) => {
    const visibleHandle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), materials.wallHandle);
    visibleHandle.position.set(handle.x, handle.y, handle.z);
    visibleHandle.renderOrder = 60;
    interactionGroup.add(visibleHandle);
    const hitHandle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), materials.objectPick);
    hitHandle.position.copy(visibleHandle.position);
    hitHandle.userData.objectId = roof.id;
    hitHandle.userData.objectType = "roof";
    hitHandle.userData.roofResizeAxis = handle.axis;
    hitHandle.userData.pickPriority = 30;
    interactionGroup.add(hitHandle);
    objectPickMeshes.push(hitHandle);
  });
}

function rebuildCadPlan() {
  clearGroup(cadGroup);
  const y = officeElevation + 3.15;
  addCadMeterGrid(y);
  addConstructionCad(y);
  for (const item of editableWalls) addCadOrientedRect(item.x, item.z, item.w, item.d, item.rot, cadMaterials.heavy, y);
  for (const item of editableLowWalls) addCadOrientedRect(item.x, item.z, item.w, item.d, item.rot, cadMaterials.medium, y);
  for (const item of editableColumns) addCadOrientedRect(item.x, item.z, item.w, item.d, item.rot, item.id === selectedObject?.id ? cadMaterials.medium : cadMaterials.heavy, y);
  for (const item of editableDoors) addCadDoor(item, y);
  for (const item of editableWindows) addCadOrientedRect(item.x, item.z, item.w, Math.max(item.d, 8), item.rot, cadMaterials.light, y);
  if (furnitureVisible) {
    for (const item of editableFurniture) addCadFurniture(item, y);
    for (const item of data.fixtures ?? []) addCadFixture(item, y);
  }
  for (const item of AREA_LABELS) addCadAreaLabel(item, y + 0.03);
  cadGroup.visible = cadMode;
}

function addCadMeterGrid(y) {
  const { building } = CONSTRUCTION_PLAN;
  for (let x = building.x0; x <= building.x1; x += 100) {
    addCadPlanPolyline([[x, building.z0], [x, building.z1]], cadMaterials.grid, y - 0.015);
  }
  for (let z = building.z0; z <= building.z1; z += 100) {
    addCadPlanPolyline([[building.x0, z], [building.x1, z]], cadMaterials.grid, y - 0.015);
  }
}

function addConstructionCad(y) {
  const { building, axesX, axesZ, eastParking, southParking, roadEdgeX, roadEdgeZ, levels } = CONSTRUCTION_PLAN;
  addCadPlanPolyline([
    [building.x0, building.z0],
    [building.x1, building.z0],
    [building.x1, building.z1],
    [building.x0, building.z1],
    [building.x0, building.z0],
  ], cadMaterials.heavy, y);
  addCadPlanPolyline([[roadEdgeX, bounds.z0], [roadEdgeX, roadEdgeZ]], cadMaterials.medium, y);
  addCadPlanPolyline([[bounds.x0, roadEdgeZ], [roadEdgeX, roadEdgeZ]], cadMaterials.medium, y);
  addCadArc(roadEdgeX, roadEdgeZ + 350, 350, -90, 0, cadMaterials.medium, y);

  axesX.forEach((axis) => {
    addCadPlanPolyline([[axis.value, -35], [axis.value, building.z1]], cadMaterials.light, y);
    addCadTextAt(axis.label, axis.value, -48, y, 0.55);
  });
  axesZ.forEach((axis) => {
    addCadPlanPolyline([[-35, axis.value], [building.x1, axis.value]], cadMaterials.light, y);
    addCadTextAt(axis.label, -48, axis.value, y, 0.55);
  });

  const eastBays = Array.from({ length: eastParking.count }, (_, index) => ({
    x: eastParking.x0 + eastParking.stallDepth / 2,
    z: eastParking.z0 + eastParking.stallWidth * (index + 0.5),
    w: eastParking.stallDepth,
    d: eastParking.stallWidth,
    rot: 0,
  }));
  eastBays.forEach((bay) => addCadOrientedRect(bay.x, bay.z, bay.w, bay.d, bay.rot, cadMaterials.medium, y));
  addCadTextAt("東側停車 4 格｜250×550cm", 3030, 1085, y, 1.05);

  const southBays = Array.from({ length: southParking.count }, (_, index) => ({
    x: southParking.startX + southParking.spacing * index,
    z: southParking.centerZ,
    w: southParking.stallDepth,
    d: southParking.stallWidth,
    rot: southParking.angle,
  }));
  southBays.forEach((bay) => addCadOrientedRect(bay.x, bay.z, bay.w, bay.d, bay.rot, cadMaterials.medium, y));
  addCadTextAt("南側斜列 5 格｜約33°（估算）", 1050, 2135, y, 1.15);
  addCadTextAt("身障車位（估）", 180, 1740, y, 0.78);
  addCadTextAt("污水設施 200×500cm", 420, 1980, y, 0.85);
  addCadTextAt("退縮騎樓地", 2670, 1785, y, 0.95);
  addCadTextAt("15M 永華一路", 3650, 880, y, 1.05);
  addCadTextAt("主3號－15M計畫道路（永華路）", 2380, 2255, y, 1.18);
  addCadTextAt(`室內 +${levels.office}cm`, 1380, 1545, y, 0.82);

  addCadDimensionHorizontal(0, 2755, -205, "2755cm / 27.55m", y, 1.05);
  addCadDimensionHorizontal(2755, 3175, -135, "420cm", y, 0.82);
  let cursorX = 0;
  CONSTRUCTION_PLAN.horizontalSegments.forEach((segment) => {
    addCadDimensionHorizontal(cursorX, cursorX + segment, -90, `${segment}`, y, 0.48);
    cursorX += segment;
  });
  addCadDimensionVertical(0, 1630, -205, "1630cm / 16.30m", y, 1.05);
  let cursorZ = 0;
  CONSTRUCTION_PLAN.verticalSegments.forEach((segment) => {
    addCadDimensionVertical(cursorZ, cursorZ + segment, -90, `${segment}`, y, 0.48);
    cursorZ += segment;
  });
  addCadDimensionVertical(1630, 2030, 2110, "400cm（圖面帶深）", y, 0.55);
  addCadDimensionVertical(1420, 1630, 2830, "入口 210cm", y, 0.55);
}

function addCadPlanPolyline(points, material, y) {
  addCadPolyline(points.map(([x, z]) => {
    const point = toWorld(x, z);
    return [point.x, point.z];
  }), material, y);
}

function addCadArc(centerX, centerZ, radiusCm, startDeg, endDeg, material, y) {
  const points = [];
  for (let index = 0; index <= 32; index += 1) {
    const angle = ((startDeg + (endDeg - startDeg) * (index / 32)) * Math.PI) / 180;
    points.push([centerX + Math.cos(angle) * radiusCm, centerZ + Math.sin(angle) * radiusCm]);
  }
  addCadPlanPolyline(points, material, y);
}

function addCadTextAt(text, x, z, y, scale = 1) {
  const sprite = makeCadTextSprite(text);
  const point = toWorld(x, z);
  sprite.scale.multiplyScalar(scale);
  sprite.position.set(point.x, y + 0.035, point.z);
  cadGroup.add(sprite);
}

function addCadDimensionHorizontal(x0, x1, z, text, y, textScale = 0.62) {
  const tick = 10;
  addCadPlanPolyline([[x0, z], [x1, z]], cadMaterials.medium, y);
  addCadPlanPolyline([[x0, z - tick], [x0, z + tick], [x0 - tick, z + tick], [x0 + tick, z - tick]], cadMaterials.medium, y);
  addCadPlanPolyline([[x1, z - tick], [x1, z + tick], [x1 - tick, z + tick], [x1 + tick, z - tick]], cadMaterials.medium, y);
  addCadTextAt(text, (x0 + x1) / 2, z - 18, y, textScale);
}

function addCadDimensionVertical(z0, z1, x, text, y, textScale = 0.62) {
  const tick = 10;
  addCadPlanPolyline([[x, z0], [x, z1]], cadMaterials.medium, y);
  addCadPlanPolyline([[x - tick, z0], [x + tick, z0], [x + tick, z0 - tick], [x - tick, z0 + tick]], cadMaterials.medium, y);
  addCadPlanPolyline([[x - tick, z1], [x + tick, z1], [x + tick, z1 - tick], [x - tick, z1 + tick]], cadMaterials.medium, y);
  addCadTextAt(text, x - 42, (z0 + z1) / 2, y, textScale);
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
  if (item.doorStyle === "automatic") {
    addCadOrientedRect(item.x, item.z, item.w, Math.max(item.d, 6), item.rot ?? 0, cadMaterials.medium, y);
    const angle = ((item.rot ?? 0) * Math.PI) / 180;
    const axis = { x: Math.cos(angle), z: Math.sin(angle) };
    const center = toWorld(item.x, item.z);
    const halfCenterBay = (item.w / 100) * (190 / 471) * 0.5;
    addCadPolyline([
      [center.x - axis.x * halfCenterBay, center.z - axis.z * halfCenterBay],
      [center.x + axis.x * halfCenterBay, center.z + axis.z * halfCenterBay],
    ], cadMaterials.light, y);
    addCadPolyline([
      [center.x, center.z],
      [center.x + axis.x * (doorsOpen ? halfCenterBay * 0.82 : 0.04), center.z + axis.z * (doorsOpen ? halfCenterBay * 0.82 : 0.04)],
    ], cadMaterials.medium, y);
    return;
  }
  const angle = (item.rot * Math.PI) / 180;
  const axis = { x: Math.cos(angle), z: Math.sin(angle) };
  const hingeSign = item.hingeAtStart ? -1 : 1;
  const hingePlan = { x: item.x + axis.x * item.w * 0.5 * hingeSign, z: item.z + axis.z * item.w * 0.5 * hingeSign };
  const closedDir = { x: axis.x * -hingeSign, z: axis.z * -hingeSign };
  const hinge = toWorld(hingePlan.x, hingePlan.z);
  const radius = Math.max(item.w / 100, 0.45);
  const start = Math.atan2(closedDir.z, closedDir.x);
  const delta = (item.swingSign ?? 1) * Math.PI * 0.5;
  addCadPolyline([[hinge.x, hinge.z], [hinge.x + closedDir.x * radius, hinge.z + closedDir.z * radius]], cadMaterials.medium, y);
  if (!doorsOpen) return;
  const points = [];
  for (let i = 0; i <= 24; i += 1) {
    const arcAngle = start + delta * (i / 24);
    points.push([hinge.x + Math.cos(arcAngle) * radius, hinge.z + Math.sin(arcAngle) * radius]);
  }
  addCadPolyline(points, cadMaterials.light, y);
}

function addCadAreaLabel(item, y) {
  const sprite = makeCadTextSprite(item.text);
  sprite.scale.multiplyScalar(0.82);
  const position = toWorld(item.x, item.z);
  sprite.position.set(position.x, y, position.z);
  cadGroup.add(sprite);
}

function addCadFurniture(item, y) {
  const rot = item.rot ?? item.rotation ?? 0;
  const furnitureType = item.furnitureType ?? item.type;
  if (furnitureType === "roundTable") {
    addCadCircle(item.x, item.z, item.w / 2, cadMaterials.furniture, y);
    return;
  }
  if (furnitureType === "plant") {
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
  const [width, depth] = defaults[furnitureType] ?? [item.w ?? 80, item.d ?? 60];
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

function addWindow(item, group, index = 0) {
  const p = toWorld(item.x, item.z);
  const rotation = ((item.rot ?? 0) * Math.PI) / 180;
  const width = item.w / 100;
  const depth = Math.max(item.d / 100, 0.025);
  const linkedWallDepth = (findWallReferenceById(item.wallId)?.item?.d ?? item.d) / 100;
  const glassDepth = Math.min(depth, 0.045);
  const frameDepth = Math.max(depth + 0.04, linkedWallDepth + 0.04, 0.1);
  const windowGroup = new THREE.Group();
  const glassHeight = Math.max(item.h / 100, 0.3);
  const openingBase = officeElevation + item.sillCm / 100;
  const surfaceInset = Math.min(0.012, glassHeight * 0.025);
  const renderHeight = Math.max(glassHeight - surfaceInset * 2, 0.28);
  const sillHeight = openingBase + glassHeight / 2;
  const frameBar = Math.min(0.065, glassHeight * 0.12);
  const materialOffset = index * 10;
  const glassMaterial = getStableConnectionMaterial(materials.glass, `window-${item.id}-glass`, -(320 + materialOffset));
  const frameMaterials = Array.from({ length: 5 }, (_, partIndex) => getStableConnectionMaterial(
    materials.windowFrame,
    `window-${item.id}-frame-${partIndex}`,
    -(330 + materialOffset + partIndex),
  ));

  addBoxToGroup(windowGroup, width, renderHeight, glassDepth, glassMaterial, 0, sillHeight, 0).renderOrder = 7;
  addBoxToGroup(windowGroup, width + 0.06, frameBar, frameDepth, frameMaterials[0], 0, openingBase + glassHeight - frameBar / 2 - surfaceInset, 0).renderOrder = 8;
  addBoxToGroup(windowGroup, width + 0.06, frameBar, frameDepth, frameMaterials[1], 0, openingBase + frameBar / 2 + surfaceInset, 0).renderOrder = 8;
  addBoxToGroup(windowGroup, width + 0.04, frameBar, frameDepth, frameMaterials[2], 0, sillHeight, 0).renderOrder = 8;
  addBoxToGroup(windowGroup, 0.055, renderHeight, frameDepth, frameMaterials[3], -width / 2 - 0.03, sillHeight, 0).renderOrder = 8;
  addBoxToGroup(windowGroup, 0.055, renderHeight, frameDepth, frameMaterials[4], width / 2 + 0.03, sillHeight, 0).renderOrder = 8;

  windowGroup.position.set(p.x, 0, p.z);
  windowGroup.rotation.y = rotation;
  group.add(windowGroup);
}

function addFurniture() {
  for (const item of editableFurniture) {
    const furnitureType = item.furnitureType ?? item.type;
    if (furnitureType === "desk") addDeskAt(item);
    if (furnitureType === "chair") addChairAt(item);
    if (furnitureType === "conferenceTable") addConferenceTableAt(item);
    if (furnitureType === "cabinet") addCabinetAt(item);
    if (furnitureType === "shelf") addShelfAt(item);
    if (furnitureType === "workbench") addWorkbenchAt(item);
    if (furnitureType === "counter") addCounterAt(item);
    if (furnitureType === "display") addDisplayAt(item);
    if (furnitureType === "roundTable") addRoundTableAt({ ...item, r: item.w / 2 });
    if (furnitureType === "reception") addReceptionAt(item);
    if (furnitureType === "sofa") addSofaAt(item);
    if (furnitureType === "lounge") addLoungeAt(item);
    if (furnitureType === "coffee") addCoffeeAt(item);
    if (furnitureType === "plant") addPlant(item.x, item.z);
    if (furnitureType === "rug") addRugAt(item);
  }
}

function rebuildFurniture() {
  clearGroup(furnitureGroup);
  addFurniture();
  furnitureGroup.visible = furnitureVisible && !cadMode;
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
    roofGroup.visible = false;
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
    labelGroup.visible = labelsVisible;
    roofGroup.visible = roofVisible;
    cadGroup.visible = false;
    scene.background = defaultBackground.clone();
    scene.fog = defaultFog;
    toggleCadViewButton?.classList.remove("is-active");
    setCameraPreset("default");
  }
  rebuildWalls();
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
  for (const item of AREA_LABELS) {
    const sprite = makeTextSprite(item.text);
    const p = toWorld(item.x, item.z);
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

function addDoor(item, group, index = 0) {
  if (item.doorStyle === "automatic") {
    addAutomaticDoor(item, group, index);
    return;
  }
  const angle = (item.rot * Math.PI) / 180;
  const axis = { x: Math.cos(angle), z: Math.sin(angle) };
  const hingeSign = item.hingeAtStart ? -1 : 1;
  const closedDir = { x: axis.x * -hingeSign, z: axis.z * -hingeSign };
  const hingePlan = { x: item.x + axis.x * item.w * 0.5 * hingeSign, z: item.z + axis.z * item.w * 0.5 * hingeSign };
  const hinge = toWorld(hingePlan.x, hingePlan.z);
  const closedAngle = Math.atan2(closedDir.z, closedDir.x);
  const openAngle = closedAngle + (doorsOpen ? (item.swingSign ?? 1) * Math.PI * 0.5 : 0);
  const dir = { x: Math.cos(openAngle), z: Math.sin(openAngle) };
  const height = Math.max(item.h / 100, 1.5);
  const length = Math.max(item.w / 100, 0.4);
  const thickness = Math.max(item.d / 100, 0.035);
  const panelMaterial = getStableConnectionMaterial(materials.door, `door-${item.id}`, -(260 + index));
  const panel = new THREE.Mesh(new THREE.BoxGeometry(length, height, thickness), panelMaterial);
  panel.position.set(hinge.x + dir.x * length * 0.5, officeElevation + height * 0.5, hinge.z + dir.z * length * 0.5);
  panel.rotation.y = -Math.atan2(dir.z, dir.x);
  panel.castShadow = true;
  panel.receiveShadow = true;
  panel.renderOrder = 7;
  group.add(panel);

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), materials.metal);
  handle.position.set(hinge.x + dir.x * length * 0.78, officeElevation + Math.min(height * 0.54, 1.08), hinge.z + dir.z * length * 0.78);
  handle.castShadow = true;
  group.add(handle);

  const hingePost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, height, 10), materials.metal);
  hingePost.position.set(hinge.x, officeElevation + height / 2, hinge.z);
  hingePost.castShadow = true;
  group.add(hingePost);

  const closedVector = { x: closedDir.x * length, z: closedDir.z * length };
  const openVector = { x: dir.x * length, z: dir.z * length };
  if (doorsOpen) addDoorSwingArc(hinge, closedVector, openVector, length, group);
}

function addAutomaticDoor(item, group, index = 0) {
  const position = toWorld(item.x, item.z);
  const width = Math.max(item.w / 100, 1.9);
  const height = Math.max(item.h / 100, 3);
  const lowerHeight = Math.min(height, 3);
  const upperHeight = height - lowerHeight;
  const centerWidth = width * (190 / 471);
  const sideWidth = (width - centerWidth) / 2;
  const linkedWallDepth = (findWallReferenceById(item.wallId)?.item?.d ?? item.d) / 100;
  const glassDepth = Math.min(Math.max(item.d / 100, 0.025), 0.045);
  const frameDepth = Math.max(linkedWallDepth + 0.04, 0.1);
  const bar = Math.min(0.075, width * 0.018);
  const doorGroup = new THREE.Group();
  const materialOffset = index * 20;
  const glassMaterial = getStableConnectionMaterial(materials.glass, `door-${item.id}-glass`, -(520 + materialOffset));
  const frameMaterials = Array.from({ length: 14 }, (_, partIndex) => getStableConnectionMaterial(
    materials.windowFrame,
    `door-${item.id}-frame-${partIndex}`,
    -(540 + materialOffset + partIndex),
  ));
  let frameIndex = 0;
  const addFrame = (w, h, x, y, z = 0) => {
    const mesh = addBoxToGroup(doorGroup, w, h, frameDepth, frameMaterials[frameIndex++ % frameMaterials.length], x, y, z);
    mesh.renderOrder = 9;
    return mesh;
  };
  const addGlass = (w, h, x, y, z = 0) => {
    const mesh = addBoxToGroup(doorGroup, Math.max(w - bar * 1.35, 0.08), Math.max(h - bar * 1.35, 0.08), glassDepth, glassMaterial, x, y, z);
    mesh.renderOrder = 8;
    return mesh;
  };

  const baseY = officeElevation;
  const lowerCenterY = baseY + lowerHeight / 2;
  const upperCenterY = baseY + lowerHeight + upperHeight / 2;
  const leftCenter = -(centerWidth + sideWidth) / 2;
  const rightCenter = -leftCenter;
  addGlass(sideWidth, lowerHeight, leftCenter, lowerCenterY);
  addGlass(sideWidth, lowerHeight, rightCenter, lowerCenterY);
  addGlass(sideWidth, upperHeight, leftCenter, upperCenterY);
  addGlass(centerWidth, upperHeight, 0, upperCenterY);
  addGlass(sideWidth, upperHeight, rightCenter, upperCenterY);

  const leafWidth = centerWidth / 2;
  const slideOffset = doorsOpen ? leafWidth * 0.84 : 0;
  const leafPositions = [-leafWidth / 2 - slideOffset, leafWidth / 2 + slideOffset];
  leafPositions.forEach((x, leafIndex) => {
    addGlass(leafWidth, lowerHeight, x, lowerCenterY, doorsOpen ? -0.025 : 0);
    addFrame(bar, lowerHeight, x + (leafIndex === 0 ? leafWidth / 2 : -leafWidth / 2), lowerCenterY, doorsOpen ? -0.035 : 0);
  });

  addFrame(width + bar, bar, 0, baseY + bar / 2);
  addFrame(width + bar, bar, 0, baseY + height - bar / 2);
  addFrame(bar, height, -width / 2, baseY + height / 2);
  addFrame(bar, height, width / 2, baseY + height / 2);
  addFrame(width, bar, 0, baseY + lowerHeight);
  addFrame(bar, height, -centerWidth / 2, baseY + height / 2);
  addFrame(bar, height, centerWidth / 2, baseY + height / 2);
  if (!doorsOpen) addFrame(bar, lowerHeight, 0, lowerCenterY, 0.012);

  const handleY = baseY + Math.min(1.08, lowerHeight * 0.52);
  for (const sign of [-1, 1]) {
    addBoxToGroup(doorGroup, 0.025, 0.34, 0.035, materials.metal, sign * 0.075, handleY, frameDepth / 2 + 0.025).renderOrder = 10;
  }

  doorGroup.position.set(position.x, 0, position.z);
  doorGroup.rotation.y = ((item.rot ?? 0) * Math.PI) / 180;
  group.add(doorGroup);
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
  return editableColumns.find((column) => column.id === selectedColumnId) ?? null;
}

function getColumnMetrics(column) {
  return getEditableMetrics(column);
}

function setColumnMetrics(column, metrics) {
  setEditableMetrics(column, metrics);
}

function syncColumnEditor() {
  const descriptor = selectedObject ? objectDescriptors.get(selectedObject.id) : null;
  const selected = descriptor ? getEditableObjectById(descriptor.id, descriptor.type) : null;
  const editable = Boolean(columnEditorOpen && descriptor?.editable && selected);
  const wallOpeningSelected = ["door", "window"].includes(descriptor?.type);
  const roofSelected = descriptor?.type === "roof";
  objectEditorInputs.forEach((input) => {
    if (input) input.disabled = !editable;
  });
  if (objectRotationInput && (wallOpeningSelected || roofSelected)) {
    objectRotationInput.disabled = true;
  }
  columnEditor?.classList.toggle("is-roof-selected", roofSelected);
  if (columnXField) columnXField.hidden = roofSelected;
  if (columnZField) columnZField.hidden = roofSelected;
  if (columnDField) columnDField.hidden = wallOpeningSelected;
  if (columnInputs.d && wallOpeningSelected) columnInputs.d.disabled = true;
  if (objectHeightField) objectHeightField.hidden = false;
  if (objectRotationField) objectRotationField.hidden = roofSelected;
  if (columnInputs.w) columnInputs.w.min = descriptor?.type === "window" ? "1" : descriptor?.type === "door" ? "40" : "10";
  if (objectHeightInput) {
    objectHeightInput.min = roofSelected ? "5" : "1";
    objectHeightInput.max = descriptor?.type === "column" ? "1000" : ["wall", "door", "window"].includes(descriptor?.type) ? "600" : "500";
  }
  if (objectVerticalField) objectVerticalField.hidden = descriptor?.type !== "window";
  if (objectVerticalInput) objectVerticalInput.disabled = !editable || descriptor?.type !== "window";
  if (descriptor?.type === "furniture") {
    columnInputs.w.disabled = true;
    columnInputs.d.disabled = true;
    objectHeightInput.disabled = true;
  }
  deleteObjectButton?.toggleAttribute("disabled", !editable || roofSelected);
  splitWallButton?.toggleAttribute("disabled", descriptor?.type !== "wall");
  flipDoorButton?.toggleAttribute("disabled", descriptor?.type !== "door" || selected?.doorStyle === "automatic");
  updateHistoryButtons();

  if (!columnHint) return;
  if (!columnEditorOpen) {
    columnHint.textContent = "點選屋頂、牆、柱、門、窗或家具";
    return;
  }
  if (!descriptor) {
    objectEditorInputs.forEach((input) => {
      if (input) input.value = "";
    });
    if (objectTypeOutput) objectTypeOutput.textContent = "尚未選取";
    if (objectIdOutput) objectIdOutput.textContent = "點選模型中的物件";
    if (columnXField) columnXField.hidden = false;
    if (columnZField) columnZField.hidden = false;
    if (columnDField) columnDField.hidden = false;
    if (objectHeightField) objectHeightField.hidden = false;
    if (objectRotationField) objectRotationField.hidden = false;
    if (objectVerticalField) objectVerticalField.hidden = true;
    if (objectRelation) objectRelation.hidden = true;
    Object.entries({ x: "X", z: "Z", w: "寬", d: "深" }).forEach(([key, label]) => {
      if (columnFieldLabels[key]) columnFieldLabels[key].textContent = label;
    });
    columnHint.textContent = "點選屋頂、牆、柱、門、窗或家具";
    return;
  }

  const metrics = descriptor.metrics;
  columnInputs.x.value = Math.round(metrics.x);
  columnInputs.z.value = Math.round(metrics.z);
  columnInputs.w.value = Math.round(metrics.w);
  columnInputs.d.value = Math.round(metrics.d);
  if (objectHeightInput) objectHeightInput.value = Math.round(metrics.h);
  if (objectRotationInput) objectRotationInput.value = Math.round(metrics.rot ?? 0);
  if (objectVerticalInput && descriptor.type === "window") {
    const wallHeight = descriptor.linkedWall?.item?.h ?? 600;
    objectVerticalInput.max = String(Math.max(0, Math.round(wallHeight - metrics.h)));
    objectVerticalInput.value = Math.round(metrics.sillCm ?? 0);
  }
  if (objectHeightLabel) objectHeightLabel.textContent = roofSelected ? "厚 cm" : "高 cm";
  Object.entries(descriptor.fieldLabels ?? {}).forEach(([key, label]) => {
    if (columnFieldLabels[key]) columnFieldLabels[key].textContent = label;
  });
  if (objectTypeOutput) objectTypeOutput.textContent = descriptor.typeLabel;
  if (objectIdOutput) objectIdOutput.textContent = descriptor.sourceLabel;
  if (descriptor.linkedWall) {
    if (objectRelation) objectRelation.hidden = false;
    if (objectLinkedWall) objectLinkedWall.textContent = descriptor.linkedWall.label;
  } else if (objectRelation) {
    objectRelation.hidden = true;
  }

  if (editable) {
    const collection = getEditableCollection(descriptor.type);
    const index = collection.findIndex((item) => item.id === selected.id) + 1;
    const wallConstraint = ["door", "window"].includes(descriptor.type) ? "；位置與角度會吸附牆面" : "";
    const wallResizeHint = descriptor.type === "wall" ? "；拖曳兩端圓點伸縮" : "";
    const furnitureHint = descriptor.type === "furniture" ? "；僅移動與轉向" : "";
    const roofHint = descriptor.type === "roof" ? "；固定置中，拖曳邊緣與頂部控制點調整長、寬、厚度" : "";
    columnHint.textContent = `${descriptor.typeLabel} ${index}/${collection.length}；可拖曳或輸入整數公分${wallConstraint}${wallResizeHint}${furnitureHint}${roofHint}`;
  } else {
    columnHint.textContent = `${descriptor.typeLabel}；可拖曳或輸入整數公分`;
  }
}

function addColumnAtViewTarget() {
  const target = toPlan(controls.target.x, controls.target.z);
  const selected = getSelectedColumn();
  const size = selected ? getColumnMetrics(selected) : { w: 50, d: 50 };
  const id = createObjectId("column");
  const column = {
    id,
    __id: id,
    type: "column",
    kind: "column",
    x: Math.round(target.x),
    z: Math.round(target.z),
    w: Math.round(size.w),
    d: Math.round(size.d),
    h: Math.round(selected?.h ?? DEFAULT_COLUMN_HEIGHT_CM),
    rot: 0,
    source: "temporary-browser-column",
  };
  nextColumnId += 1;
  editableColumns.push(column);
  selectedColumnId = column.__id;
  selectedObject = { id: column.__id, type: "column" };
  syncColumnEditor();
  rebuildWalls();
}

function addEditableObjectAtViewTarget(type) {
  if (type === "column") {
    addColumnAtViewTarget();
    return;
  }
  const target = toPlan(controls.target.x, controls.target.z);
  const id = createObjectId(type);
  if (type === "wall") {
    const wall = {
      id,
      __id: id,
      type: "wall",
      kind: "wall",
      x: Math.round(target.x),
      z: Math.round(target.z),
      w: 300,
      d: DEFAULT_WALL_THICKNESS_CM,
      h: Math.round(currentWallHeight * 100),
      rot: 0,
      wallCategory: "interior",
      source: "user-wall",
    };
    editableWalls.push(wall);
    selectedObject = { id, type: "wall" };
  }
  if (type === "door") {
    if (!editableWalls.length) return;
    const door = {
      id,
      __id: id,
      type: "door",
      kind: "door",
      x: Math.round(target.x),
      z: Math.round(target.z),
      w: STANDARD_DOOR_WIDTH_CM,
      d: STANDARD_DOOR_THICKNESS_CM,
      h: STANDARD_DOOR_HEIGHT_CM,
      rot: 0,
      hingeAtStart: true,
      swingSign: 1,
      swingModelVersion: 2,
      wallId: null,
      source: "user-door",
    };
    updateOpeningWallLink(door);
    editableDoors.push(door);
    selectedObject = { id, type: "door" };
  }
  if (type === "window") {
    if (!editableWalls.length) return;
    const windowItem = {
      id,
      __id: id,
      type: "window",
      kind: "window",
      x: Math.round(target.x),
      z: Math.round(target.z),
      w: 180,
      d: 8,
      h: 110,
      sillCm: 80,
      rot: 0,
      wallId: null,
      source: "user-window",
    };
    updateOpeningWallLink(windowItem);
    editableWindows.push(windowItem);
    selectedObject = { id, type: "window" };
  }
  selectedColumnId = null;
  rebuildWalls();
}

function deleteSelectedEditableObject() {
  const selected = getSelectedEditableObject();
  if (!selected) return;
  const collection = getEditableCollection(selected.type);
  const index = collection.findIndex((item) => item.id === selected.id);
  if (index < 0) return;
  if (selected.type === "wall") {
    editableDoors = editableDoors.filter((item) => item.wallId !== selected.id);
    editableWindows = editableWindows.filter((item) => item.wallId !== selected.id);
  }
  collection.splice(index, 1);
  selectedObject = null;
  selectedColumnId = null;
  if (selected.type === "furniture") rebuildFurniture();
  rebuildWalls();
}

function splitSelectedWall() {
  const wall = getSelectedEditableObject();
  if (!wall || wall.type !== "wall" || wall.w < 40) return;
  const original = { x: wall.x, z: wall.z, w: wall.w, rot: wall.rot };
  const endpoints = getWallEndpoints(wall);
  const middle = { x: (endpoints.start.x + endpoints.end.x) / 2, z: (endpoints.start.z + endpoints.end.z) / 2 };
  const secondId = createObjectId("wall");
  const second = { ...wall, id: secondId, __id: secondId, source: `${wall.source}-split` };
  setWallFromEndpoints(wall, endpoints.start, middle);
  setWallFromEndpoints(second, middle, endpoints.end);
  const axis = getWallAxis(original);
  [...editableDoors, ...editableWindows].forEach((opening) => {
    if (opening.wallId !== wall.id) return;
    const along = (opening.x - original.x) * axis.x + (opening.z - original.z) * axis.z;
    if (along >= 0) opening.wallId = second.id;
  });
  editableWalls.push(second);
  refreshOpeningWallLinks();
  selectedObject = { id: second.id, type: "wall" };
  rebuildWalls();
}

function flipSelectedDoor() {
  const door = getSelectedEditableObject();
  if (!door || door.type !== "door" || door.doorStyle === "automatic") return;
  door.swingSign = door.swingSign === -1 ? 1 : -1;
  rebuildWalls();
}

function deleteSelectedColumn() {
  if (!selectedColumnId) return;
  const index = editableColumns.findIndex((column) => column.__id === selectedColumnId);
  if (index < 0) return;
  editableColumns.splice(index, 1);
  selectedColumnId = editableColumns[Math.min(index, editableColumns.length - 1)]?.__id ?? null;
  selectedObject = selectedColumnId ? { id: selectedColumnId, type: "column" } : null;
  syncColumnEditor();
  rebuildWalls();
}

function resetEditableColumns() {
  editableColumns = makeEditableColumns(data.columns);
  currentColumnHeight = DEFAULT_COLUMN_HEIGHT_CM / 100;
  columnHeightInput.value = currentColumnHeight.toFixed(2);
  selectedColumnId = editableColumns[0]?.__id ?? null;
  selectedObject = selectedColumnId ? { id: selectedColumnId, type: "column" } : null;
  updateWallHeightLabel();
  syncColumnEditor();
  rebuildWalls();
}

function getCurrentPlanState() {
  return {
    format: PLAN_FORMAT,
    schemaVersion: PLAN_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    wallHeightM: Number(currentWallHeight.toFixed(2)),
    exteriorWallHeightM: Number(currentExteriorWallHeight.toFixed(2)),
    columnHeightM: Number(currentColumnHeight.toFixed(2)),
    walls: editableWalls.map(serializeEditableItem),
    lowWalls: editableLowWalls.map(serializeEditableItem),
    columns: editableColumns.map(serializeEditableItem),
    doors: editableDoors.map(serializeEditableItem),
    windows: editableWindows.map(serializeEditableItem),
    furniture: editableFurniture.map(serializeEditableItem),
    roof: serializeEditableItem(editableRoof),
  };
}

function serializeEditableItem(item) {
  const result = {
    id: item.id,
    type: item.type,
    kind: item.kind,
    x: Math.round(item.x),
    z: Math.round(item.z),
    w: Math.round(item.w),
    d: Math.round(item.d),
    h: Math.round(item.h),
    rot: Math.round(item.rot ?? 0),
    source: String(item.source ?? item.id).slice(0, 120),
  };
  if (item.type === "door") {
    result.doorStyle = item.doorStyle === "automatic" ? "automatic" : "swing";
    result.hingeAtStart = Boolean(item.hingeAtStart);
    result.swingSign = item.swingSign === -1 ? -1 : 1;
    result.swingModelVersion = 2;
    result.wallId = item.wallId ?? null;
  }
  if (item.type === "window") {
    result.sillCm = Math.round(item.sillCm ?? 80);
    result.wallId = item.wallId ?? null;
  }
  if (item.type === "wall") result.wallCategory = inferWallCategory(item);
  if (item.type === "furniture") result.furnitureType = item.furnitureType;
  return result;
}

function getOriginalEditableState(
  wallHeightM = DEFAULT_INTERIOR_WALL_HEIGHT_CM / 100,
  exteriorWallHeightM = DEFAULT_EXTERIOR_WALL_HEIGHT_CM / 100,
  columnHeightM = DEFAULT_COLUMN_HEIGHT_CM / 100,
) {
  const original = {
    walls: makeEditableFootprints(data.walls, "wall", Math.round(wallHeightM * 100)),
    lowWalls: makeEditableFootprints(data.lowWalls, "low-wall", data.defaults?.lowWallHeightCm ?? 130),
    columns: makeEditableColumns(data.columns),
    doors: makeEditableDoors(data.doors ?? [], data.doorSills ?? []),
    windows: makeEditableWindows(WINDOW_ITEMS),
    furniture: makeEditableFurniture(DESIGN_ITEMS),
    roof: createDefaultRoof(),
  };
  normalizeEntranceFacadeWall(original.walls);
  assignWallCategories(original.walls);
  original.walls.forEach((wall) => {
    wall.h = Math.round((wall.wallCategory === "exterior" ? exteriorWallHeightM : wallHeightM) * 100);
  });
  original.columns.forEach((column) => {
    column.h = Math.round(columnHeightM * 100);
  });
  normalizeAmbiguousToiletWallStubs(original.walls);
  bridgeWallSegmentsAtDoors(original.walls, original.doors, original.windows);
  refreshOpeningWallLinks(original.walls, original.doors, original.windows);
  return original;
}

function normalizeEditableItems(items, type, limit = 200) {
  if (!Array.isArray(items) || items.length > limit) throw new Error(`${type} 資料數量不正確`);
  const usedIds = new Set();
  return items.map((item, index) => {
    const numeric = ["x", "z", "w", "d", "h", "rot"].reduce((values, key) => ({ ...values, [key]: Number(item?.[key]) }), {});
    if (Object.values(numeric).some((value) => !Number.isFinite(value) || Math.abs(value) > 100000)) {
      throw new Error(`${type} 第 ${index + 1} 筆尺寸不正確`);
    }
    const minimumWidth = type === "window" ? 1 : type === "door" ? 40 : 10;
    const minimumDepth = ["column", "roof"].includes(type) ? 10 : 3;
    const minimumHeight = type === "door" ? 150 : type === "window" ? 30 : type === "furniture" ? 1 : type === "roof" ? 5 : 10;
    if (numeric.w < minimumWidth || numeric.d < minimumDepth || numeric.h < minimumHeight) {
      throw new Error(`${type} 第 ${index + 1} 筆尺寸過小`);
    }
    const preferredId = typeof item.id === "string" && item.id.trim() && item.id.length <= 120
      ? item.id.trim()
      : getModelObjectId(type, item, index);
    let id = preferredId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${preferredId}-${suffix++}`;
    usedIds.add(id);
    const normalized = {
      id,
      __id: id,
      type,
      kind: type,
      x: type === "roof" ? Math.round((CONSTRUCTION_PLAN.building.x0 + CONSTRUCTION_PLAN.building.x1) / 2) : Math.round(numeric.x),
      z: type === "roof" ? Math.round((CONSTRUCTION_PLAN.building.z0 + CONSTRUCTION_PLAN.building.z1) / 2) : Math.round(numeric.z),
      w: Math.round(numeric.w),
      d: Math.round(numeric.d),
      h: Math.round(Math.min(numeric.h, type === "column" ? 1000 : ["wall", "door", "window"].includes(type) ? 600 : 500)),
      rot: type === "roof" ? 0 : normalizeAngle(Math.round(numeric.rot)),
      source: typeof item.source === "string" ? item.source.slice(0, 120) : `imported-${type}`,
    };
    if (type === "door") {
      normalized.doorStyle = item.doorStyle === "automatic" ? "automatic" : "swing";
      normalized.hingeAtStart = Boolean(item.hingeAtStart);
      const savedSwingSign = item.swingSign === -1 ? -1 : 1;
      normalized.swingSign = Number(item.swingModelVersion) >= 2 || normalized.hingeAtStart
        ? savedSwingSign
        : -savedSwingSign;
      normalized.swingModelVersion = 2;
      normalized.wallId = typeof item.wallId === "string" ? item.wallId : null;
    }
    if (type === "window") {
      normalized.sillCm = Math.max(0, Math.round(Number(item.sillCm ?? 80)));
      normalized.wallId = typeof item.wallId === "string" ? item.wallId : null;
    }
    if (type === "wall") {
      normalized.wallCategory = item.wallCategory === "exterior" || item.wallCategory === "interior"
        ? item.wallCategory
        : inferWallCategory(normalized);
    }
    if (type === "furniture") {
      normalized.furnitureType = typeof item.furnitureType === "string" ? item.furnitureType.slice(0, 40) : "desk";
    }
    return normalized;
  });
}

function normalizePlanState(plan) {
  const schemaVersion = Number(plan?.schemaVersion);
  if (!plan || typeof plan !== "object" || plan.format !== PLAN_FORMAT || ![1, 2, 3, 4, 5, PLAN_SCHEMA_VERSION].includes(schemaVersion)) {
    throw new Error("不是相容的封王 288 號備份檔");
  }
  if (!Array.isArray(plan.columns) || plan.columns.length > 100) {
    throw new Error("柱子資料數量不正確");
  }

  const wallHeightM = Number(plan.wallHeightM);
  const exteriorWallHeightM = Number(plan.exteriorWallHeightM ?? wallHeightM);
  const columnHeightM = Number(plan.columnHeightM ?? ((plan.columns[0]?.h ?? DEFAULT_COLUMN_HEIGHT_CM) / 100));
  const minWallHeight = Number(wallHeightInput.min);
  const maxWallHeight = Number(wallHeightInput.max);
  const minColumnHeight = Number(columnHeightInput.min);
  const maxColumnHeight = Number(columnHeightInput.max);
  if (!Number.isFinite(wallHeightM) || wallHeightM < minWallHeight || wallHeightM > maxWallHeight) {
    throw new Error(`牆高必須介於 ${minWallHeight.toFixed(2)}m 到 ${maxWallHeight.toFixed(2)}m`);
  }
  if (!Number.isFinite(exteriorWallHeightM) || exteriorWallHeightM < minWallHeight || exteriorWallHeightM > maxWallHeight) {
    throw new Error(`外牆高度必須介於 ${minWallHeight.toFixed(2)}m 到 ${maxWallHeight.toFixed(2)}m`);
  }
  if (!Number.isFinite(columnHeightM) || columnHeightM < minColumnHeight || columnHeightM > maxColumnHeight) {
    throw new Error(`柱子高度必須介於 ${minColumnHeight.toFixed(2)}m 到 ${maxColumnHeight.toFixed(2)}m`);
  }

  let collections;
  if (schemaVersion < 3) {
    collections = getOriginalEditableState(wallHeightM, exteriorWallHeightM, columnHeightM);
    collections.columns = makeEditableFootprints(plan.columns, "column", DEFAULT_COLUMN_HEIGHT_CM);
  } else {
    const fallback = getOriginalEditableState(wallHeightM, exteriorWallHeightM, columnHeightM);
    collections = {
      walls: normalizeEditableItems(plan.walls ?? fallback.walls, "wall"),
      lowWalls: normalizeEditableItems(plan.lowWalls ?? fallback.lowWalls, "low-wall"),
      columns: normalizeEditableItems(plan.columns, "column", 100),
      doors: normalizeEditableItems(plan.doors ?? fallback.doors, "door", 100),
      windows: normalizeEditableItems(plan.windows ?? fallback.windows, "window", 100),
      furniture: normalizeEditableItems(plan.furniture ?? fallback.furniture, "furniture", 200),
      roof: normalizeEditableItems([plan.roof ?? fallback.roof], "roof", 1)[0],
    };
  }
  if (schemaVersion < 4) {
    collections.doors.forEach((door) => {
      door.w = STANDARD_DOOR_WIDTH_CM;
      door.d = STANDARD_DOOR_THICKNESS_CM;
      door.h = STANDARD_DOOR_HEIGHT_CM;
    });
  }
  assignWallCategories(collections.walls);
  collections.walls = collections.walls.filter((wall) => !REMOVED_WALL_SOURCES.has(wall.source));

  const savedAt = new Date(plan.savedAt);
  return {
    format: PLAN_FORMAT,
    schemaVersion: PLAN_SCHEMA_VERSION,
    savedAt: Number.isNaN(savedAt.getTime()) ? new Date().toISOString() : savedAt.toISOString(),
    wallHeightM: Number(wallHeightM.toFixed(2)),
    exteriorWallHeightM: Number(exteriorWallHeightM.toFixed(2)),
    columnHeightM: Number(columnHeightM.toFixed(2)),
    walls: collections.walls.map(serializeEditableItem),
    lowWalls: collections.lowWalls.map(serializeEditableItem),
    columns: collections.columns.map(serializeEditableItem),
    doors: collections.doors.map(serializeEditableItem),
    windows: collections.windows.map(serializeEditableItem),
    furniture: collections.furniture.map(serializeEditableItem),
    roof: serializeEditableItem(collections.roof),
  };
}

function createOriginalPlanState() {
  const defaultWallHeightM = DEFAULT_INTERIOR_WALL_HEIGHT_CM / 100;
  const defaultExteriorWallHeightM = DEFAULT_EXTERIOR_WALL_HEIGHT_CM / 100;
  const defaultColumnHeightM = DEFAULT_COLUMN_HEIGHT_CM / 100;
  return normalizePlanState({
    format: PLAN_FORMAT,
    schemaVersion: PLAN_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    wallHeightM: defaultWallHeightM,
    exteriorWallHeightM: defaultExteriorWallHeightM,
    columnHeightM: defaultColumnHeightM,
    ...getOriginalEditableState(defaultWallHeightM, defaultExteriorWallHeightM, defaultColumnHeightM),
  });
}

function applyPlanState(plan, { clearHistory = true, preserveSelection = false } = {}) {
  const normalized = normalizePlanState(plan);
  const previousSelection = preserveSelection && selectedObject ? { ...selectedObject } : null;
  currentWallHeight = normalized.wallHeightM;
  currentExteriorWallHeight = normalized.exteriorWallHeightM;
  currentColumnHeight = normalized.columnHeightM;
  wallHeightInput.value = currentWallHeight.toFixed(2);
  exteriorWallHeightInput.value = currentExteriorWallHeight.toFixed(2);
  columnHeightInput.value = currentColumnHeight.toFixed(2);
  editableWalls = normalizeEditableItems(normalized.walls, "wall");
  editableLowWalls = normalizeEditableItems(normalized.lowWalls, "low-wall");
  editableColumns = normalizeEditableItems(normalized.columns, "column", 100);
  editableDoors = normalizeEditableItems(normalized.doors, "door", 100);
  editableWindows = normalizeEditableItems(normalized.windows, "window", 100);
  editableFurniture = normalizeEditableItems(normalized.furniture, "furniture", 200);
  editableRoof = normalizeEditableItems([normalized.roof], "roof", 1)[0];
  bridgeWallSegmentsAtDoors();
  refreshOpeningWallLinks();
  selectedObject = previousSelection && getEditableObjectById(previousSelection.id, previousSelection.type) ? previousSelection : null;
  selectedColumnId = selectedObject?.type === "column" ? selectedObject.id : null;
  draggingObjectId = null;
  controls.enabled = true;
  if (clearHistory) clearEditHistory();
  updateWallHeightLabel();
  rebuildFurniture();
  rebuildWalls();
  return normalized;
}

function createEmptyWorkspace() {
  return {
    format: WORKSPACE_FORMAT,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    schemes: [],
  };
}

function createSchemeId(prefix = "scheme") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSchemeName(value, fallback = "未命名版本") {
  const name = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  return name || fallback;
}

function normalizeWorkspace(value) {
  if (!value || typeof value !== "object" || value.format !== WORKSPACE_FORMAT || Number(value.schemaVersion) !== WORKSPACE_SCHEMA_VERSION) {
    throw new Error("版本資料格式不相容");
  }
  if (!Array.isArray(value.schemes) || value.schemes.length > MAX_SCHEMES) {
    throw new Error(`版本數量不得超過 ${MAX_SCHEMES} 個`);
  }

  const usedIds = new Set();
  const schemes = value.schemes.map((scheme, index) => {
    const preferredId = typeof scheme?.id === "string" && scheme.id.trim() && scheme.id.length <= 120
      ? scheme.id.trim()
      : createSchemeId(`scheme-${index + 1}`);
    let id = preferredId === ORIGINAL_SCHEME_ID ? `${preferredId}-copy` : preferredId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${preferredId}-${suffix++}`;
    usedIds.add(id);
    const createdAt = new Date(scheme?.createdAt);
    const updatedAt = new Date(scheme?.updatedAt);
    return {
      id,
      name: normalizeSchemeName(scheme?.name === "舊版草稿" ? "舊存檔（自動保留）" : scheme?.name, `版本 ${index + 1}`),
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
      updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date().toISOString() : updatedAt.toISOString(),
      plan: normalizePlanState(scheme?.plan),
    };
  });
  return { format: WORKSPACE_FORMAT, schemaVersion: WORKSPACE_SCHEMA_VERSION, schemes };
}

function loadWorkspace() {
  const rawWorkspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (rawWorkspace) {
    try {
      return normalizeWorkspace(JSON.parse(rawWorkspace));
    } catch (error) {
      console.warn("Stored workspace could not be read", error);
      return createEmptyWorkspace();
    }
  }

  const emptyWorkspace = createEmptyWorkspace();
  const legacyDraft = window.localStorage.getItem(PLAN_STORAGE_KEY);
  if (!legacyDraft) return emptyWorkspace;
  try {
    const plan = normalizePlanState(JSON.parse(legacyDraft));
    const now = new Date().toISOString();
    emptyWorkspace.schemes.push({
      id: createSchemeId("legacy"),
      name: "舊存檔（自動保留）",
      createdAt: plan.savedAt || now,
      updatedAt: plan.savedAt || now,
      plan,
    });
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(emptyWorkspace));
  } catch (error) {
    console.warn("Legacy draft could not be migrated", error);
  }
  return emptyWorkspace;
}

function persistWorkspace() {
  workspace = normalizeWorkspace(workspace);
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

function getSelectedScheme() {
  return workspace.schemes.find((scheme) => scheme.id === selectedSchemeId) ?? null;
}

function renderSchemeOptions() {
  if (!schemeSelect) return;
  const validSchemeIds = new Set(workspace.schemes.map((scheme) => scheme.id));
  if (selectedSchemeId !== ORIGINAL_SCHEME_ID && !validSchemeIds.has(selectedSchemeId)) {
    selectedSchemeId = ORIGINAL_SCHEME_ID;
  }
  schemeSelect.replaceChildren(new Option("系統基準（不可覆寫）", ORIGINAL_SCHEME_ID));
  workspace.schemes.forEach((scheme) => {
    schemeSelect.add(new Option(scheme.name, scheme.id));
  });
  schemeSelect.value = selectedSchemeId;
}

function formatDraftTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時間未知";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function refreshPlanStorageStatus(message = "") {
  const selectedScheme = getSelectedScheme();
  const isOriginal = selectedSchemeId === ORIGINAL_SCHEME_ID;
  if (saveDraftButton) saveDraftButton.disabled = isOriginal;
  if (loadDraftButton) loadDraftButton.disabled = !isOriginal && !selectedScheme;
  if (renameSchemeButton) renameSchemeButton.disabled = isOriginal || !selectedScheme;
  if (deleteSchemeButton) deleteSchemeButton.disabled = isOriginal || !selectedScheme;
  if (!planStorageStatus) return;
  if (message) {
    planStorageStatus.textContent = message;
    return;
  }

  const referencePlan = isOriginal ? createOriginalPlanState() : selectedScheme?.plan;
  const matches = referencePlan ? planStatesMatch(getCurrentPlanState(), referencePlan) : false;
  if (isOriginal) {
    planStorageStatus.textContent = matches ? "系統基準（不可覆寫）" : "目前調整尚未儲存，請新增版本";
  } else if (!selectedScheme) {
    planStorageStatus.textContent = "找不到選取的版本";
  } else if (matches) {
    planStorageStatus.textContent = `已儲存 ${formatDraftTime(selectedScheme.updatedAt)}`;
  } else {
    planStorageStatus.textContent = "目前畫面與所選版本不同";
  }
}

function saveDraft() {
  try {
    const scheme = getSelectedScheme();
    if (!scheme) {
      refreshPlanStorageStatus("系統基準不可覆寫，請先新增版本");
      return;
    }
    const now = new Date().toISOString();
    scheme.plan = getCurrentPlanState();
    scheme.updatedAt = now;
    persistWorkspace();
    renderSchemeOptions();
    refreshPlanStorageStatus(`「${scheme.name}」已儲存 ${formatDraftTime(now)}`);
  } catch (error) {
    refreshPlanStorageStatus(`儲存失敗：${error.message}`);
  }
}

function loadDraft() {
  try {
    const scheme = getSelectedScheme();
    const isOriginal = selectedSchemeId === ORIGINAL_SCHEME_ID;
    if (!isOriginal && !scheme) throw new Error("找不到選取的版本");
    applyPlanState(isOriginal ? createOriginalPlanState() : scheme.plan);
    refreshPlanStorageStatus(isOriginal ? "已套用系統基準" : `已套用「${scheme.name}」`);
  } catch (error) {
    refreshPlanStorageStatus(`載入失敗：${error.message}`);
  }
}

function getUniqueSchemeName(value, ignoredId = null) {
  const base = normalizeSchemeName(value);
  const names = new Set(workspace.schemes.filter((scheme) => scheme.id !== ignoredId).map((scheme) => scheme.name.toLocaleLowerCase("zh-TW")));
  if (!names.has(base.toLocaleLowerCase("zh-TW"))) return base;
  let suffix = 2;
  while (names.has(`${base} ${suffix}`.toLocaleLowerCase("zh-TW"))) suffix += 1;
  return `${base} ${suffix}`;
}

function createScheme() {
  if (workspace.schemes.length >= MAX_SCHEMES) {
    refreshPlanStorageStatus(`最多可建立 ${MAX_SCHEMES} 個版本`);
    return;
  }
  const now = new Date().toISOString();
  const scheme = {
    id: createSchemeId(),
    name: getUniqueSchemeName(`版本 ${workspace.schemes.length + 1}`),
    createdAt: now,
    updatedAt: now,
    plan: getCurrentPlanState(),
  };
  workspace.schemes.push(scheme);
  selectedSchemeId = scheme.id;
  persistWorkspace();
  renderSchemeOptions();
  refreshPlanStorageStatus(`已建立並儲存「${scheme.name}」`);
}

function renameSelectedScheme() {
  const scheme = getSelectedScheme();
  if (!scheme) return;
  const proposedName = window.prompt("重新命名版本", scheme.name);
  if (proposedName === null) return;
  scheme.name = getUniqueSchemeName(proposedName, scheme.id);
  scheme.updatedAt = new Date().toISOString();
  persistWorkspace();
  renderSchemeOptions();
  refreshPlanStorageStatus(`版本已重新命名為「${scheme.name}」`);
}

function deleteSelectedScheme() {
  const scheme = getSelectedScheme();
  if (!scheme) return;
  if (!window.confirm(`刪除「${scheme.name}」？此動作不會改變目前畫面。`)) return;
  workspace.schemes = workspace.schemes.filter((item) => item.id !== scheme.id);
  selectedSchemeId = ORIGINAL_SCHEME_ID;
  persistWorkspace();
  renderSchemeOptions();
  refreshPlanStorageStatus(`已刪除「${scheme.name}」`);
}

function getPlanFilename(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  const schemeName = getSelectedScheme()?.name ?? "original";
  const safeName = schemeName.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, "-").replace(/^-+|-+$/g, "") || "plan";
  return `phoenixes-288-${safeName}-${stamp}.json`;
}

function exportPlan() {
  const plan = getCurrentPlanState();
  const blob = new Blob([`${JSON.stringify(plan, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getPlanFilename();
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  refreshPlanStorageStatus("目前畫面的備份檔已下載");
}

async function importPlanFromFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 512 * 1024) throw new Error("檔案超過 512KB");
    if (workspace.schemes.length >= MAX_SCHEMES) throw new Error(`版本已達 ${MAX_SCHEMES} 個上限`);
    const imported = normalizePlanState(JSON.parse(await file.text()));
    const now = new Date().toISOString();
    const scheme = {
      id: createSchemeId("import"),
      name: getUniqueSchemeName(file.name.replace(/\.json$/i, "")),
      createdAt: now,
      updatedAt: now,
      plan: imported,
    };
    workspace.schemes.push(scheme);
    selectedSchemeId = scheme.id;
    persistWorkspace();
    renderSchemeOptions();
    applyPlanState(imported);
    refreshPlanStorageStatus(`已從備份新增「${scheme.name}」`);
  } catch (error) {
    refreshPlanStorageStatus(`匯入失敗：${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function restoreOriginalPlan() {
  const confirmed = window.confirm("將牆、柱、門、窗、家具、屋頂與牆高全部恢復為系統基準？已儲存版本不會被刪除。");
  if (!confirmed) return;
  performHistoryAction("回到系統基準", () => applyPlanState(createOriginalPlanState(), { clearHistory: false }));
  selectedSchemeId = ORIGINAL_SCHEME_ID;
  renderSchemeOptions();
  refreshPlanStorageStatus("已回到系統基準；已儲存版本仍保留");
}

function planStateSignature(plan) {
  const serializeCollection = (items) => items.map((item) => ({
    id: item.id,
    x: Number(item.x),
    z: Number(item.z),
    w: Number(item.w),
    d: Number(item.d),
    h: Number(item.h),
    rot: Number(item.rot),
    sillCm: item.sillCm == null ? undefined : Number(item.sillCm),
    hingeAtStart: item.hingeAtStart,
    swingSign: item.swingSign,
    doorStyle: item.doorStyle,
    wallCategory: item.wallCategory,
    furnitureType: item.furnitureType,
    source: item.source,
  }));
  return JSON.stringify({
    wallHeightM: Number(Number(plan.wallHeightM).toFixed(2)),
    exteriorWallHeightM: Number(Number(plan.exteriorWallHeightM ?? plan.wallHeightM).toFixed(2)),
    columnHeightM: Number(Number(plan.columnHeightM ?? DEFAULT_COLUMN_HEIGHT_CM / 100).toFixed(2)),
    walls: serializeCollection(plan.walls),
    lowWalls: serializeCollection(plan.lowWalls),
    columns: serializeCollection(plan.columns),
    doors: serializeCollection(plan.doors),
    windows: serializeCollection(plan.windows),
    furniture: serializeCollection(plan.furniture),
    roof: serializeCollection([plan.roof]),
  });
}

function planStatesMatch(a, b) {
  return planStateSignature(normalizePlanState(a)) === planStateSignature(normalizePlanState(b));
}

function captureEditableState() {
  return getCurrentPlanState();
}

function beginHistoryAction(label) {
  if (pendingHistoryAction) return;
  pendingHistoryAction = { label, before: captureEditableState() };
}

function commitHistoryAction() {
  if (!pendingHistoryAction) return;
  const action = pendingHistoryAction;
  pendingHistoryAction = null;
  const after = captureEditableState();
  if (planStatesMatch(action.before, after)) {
    updateHistoryButtons();
    return;
  }
  undoStack.push({ label: action.label, state: action.before });
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
  refreshPlanStorageStatus();
}

function performHistoryAction(label, action) {
  commitHistoryAction();
  beginHistoryAction(label);
  action();
  commitHistoryAction();
}

function clearEditHistory() {
  pendingHistoryAction = null;
  undoStack = [];
  redoStack = [];
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const undoAction = undoStack.at(-1);
  const redoAction = redoStack.at(-1);
  if (undoEditButton) {
    undoEditButton.disabled = !undoAction;
    undoEditButton.title = undoAction ? `復原：${undoAction.label}` : "復原";
    undoEditButton.setAttribute("aria-label", undoEditButton.title);
  }
  if (redoEditButton) {
    redoEditButton.disabled = !redoAction;
    redoEditButton.title = redoAction ? `重做：${redoAction.label}` : "重做";
    redoEditButton.setAttribute("aria-label", redoEditButton.title);
  }
}

function undoEdit() {
  commitHistoryAction();
  const action = undoStack.pop();
  if (!action) return;
  redoStack.push({ label: action.label, state: captureEditableState() });
  applyPlanState(action.state, { clearHistory: false, preserveSelection: true });
  updateHistoryButtons();
  refreshPlanStorageStatus(`已復原：${action.label}`);
}

function redoEdit() {
  commitHistoryAction();
  const action = redoStack.pop();
  if (!action) return;
  undoStack.push({ label: action.label, state: captureEditableState() });
  applyPlanState(action.state, { clearHistory: false, preserveSelection: true });
  updateHistoryButtons();
  refreshPlanStorageStatus(`已重做：${action.label}`);
}

function updateSelectedObjectFromFields() {
  const selected = getSelectedEditableObject();
  if (!selected) return;
  setEditableMetrics(selected, {
    x: Number(columnInputs.x.value),
    z: Number(columnInputs.z.value),
    w: Number(columnInputs.w.value),
    d: Number(columnInputs.d.value),
    h: Number(objectHeightInput.value),
    rot: Number(objectRotationInput.value),
    sillCm: Number(objectVerticalInput?.value),
  });
  if (selected.type === "furniture") rebuildFurniture();
  rebuildWalls();
}

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
}

function getObjectHitFromEvent(event) {
  if (!columnEditorOpen || !objectPickMeshes.length) return null;
  setPointerFromEvent(event);
  const hits = raycaster.intersectObjects(objectPickMeshes, false);
  if (!hits.length) return null;
  const nearbyHits = hits.filter((hit) => hit.distance <= hits[0].distance + 0.4);
  nearbyHits.sort((a, b) => {
    const priorityDifference = Number(b.object.userData.pickPriority ?? 0) - Number(a.object.userData.pickPriority ?? 0);
    return priorityDifference || a.distance - b.distance;
  });
  return nearbyHits[0];
}

function getPlanPointFromEvent(event) {
  setPointerFromEvent(event);
  dragPlane.constant = -activeDragPlaneY;
  if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return null;
  return toPlan(dragPoint.x, dragPoint.z);
}

function startObjectInteraction(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const hit = getObjectHitFromEvent(event);
  if (!hit?.object?.userData?.objectId) {
    if (selectedObject) {
      selectedObject = null;
      selectedColumnId = null;
      rebuildWalls();
    }
    return;
  }

  const objectId = hit.object.userData.objectId;
  const descriptor = objectDescriptors.get(objectId);
  if (!descriptor) return;
  selectedObject = { id: objectId, type: descriptor.type };
  selectedColumnId = descriptor.type === "column" ? objectId : null;

  const selected = getSelectedEditableObject();
  const roofResizeAxis = hit.object.userData.roofResizeAxis;
  activeDragPlaneY = selected?.type === "roof"
    ? getRoofBaseY() + selected.h / 100
    : officeElevation;
  const planPoint = getPlanPointFromEvent(event);
  if (selected?.type === "roof" && !roofResizeAxis) {
    rebuildWalls();
    return;
  }
  if (selected && planPoint) {
    beginHistoryAction(selected.type === "roof" ? "調整屋頂尺寸" : `拖曳${descriptor.typeLabel}`);
    const wallEndpoint = hit.object.userData.wallEndpoint;
    if (selected.type === "roof" && roofResizeAxis) {
      draggingObjectMode = `roof-${roofResizeAxis}`;
      roofResizeStart = { ...getEditableMetrics(selected) };
      roofResizeStartClientY = event.clientY;
      fixedWallEndpoint = null;
      dragObjectOffset = { x: 0, z: 0 };
    } else if (selected.type === "wall" && wallEndpoint) {
      const endpoints = getWallEndpoints(selected);
      draggingObjectMode = `wall-${wallEndpoint}`;
      fixedWallEndpoint = wallEndpoint === "start" ? endpoints.end : endpoints.start;
      dragObjectOffset = { x: 0, z: 0 };
    } else {
      draggingObjectMode = "move";
      fixedWallEndpoint = null;
      dragObjectOffset = {
        x: selected.x - planPoint.x,
        z: selected.z - planPoint.z,
      };
    }
    draggingObjectId = selected.id;
    controls.enabled = false;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
  rebuildWalls();
}

function dragSelectedObject(event) {
  if (!draggingObjectId) return;
  const selected = getEditableObjectById(draggingObjectId);
  const planPoint = getPlanPointFromEvent(event);
  if (!selected || !planPoint) return;
  if (selected.type === "roof" && draggingObjectMode.startsWith("roof-") && roofResizeStart) {
    const axis = draggingObjectMode.slice(5);
    const metrics = { ...getEditableMetrics(selected) };
    if (axis === "w") metrics.w = Math.max(10, Math.round(Math.abs(planPoint.x - selected.x) * 2));
    if (axis === "d") metrics.d = Math.max(10, Math.round(Math.abs(planPoint.z - selected.z) * 2));
    if (axis === "h") metrics.h = Math.max(5, Math.min(500, Math.round(roofResizeStart.h + (roofResizeStartClientY - event.clientY) * 2)));
    setEditableMetrics(selected, metrics);
  } else if (selected.type === "wall" && draggingObjectMode.startsWith("wall-") && fixedWallEndpoint) {
    const movingPoint = snapWallEndpoint({ x: Math.round(planPoint.x), z: Math.round(planPoint.z) }, selected.id);
    if (draggingObjectMode === "wall-start") setWallFromEndpoints(selected, movingPoint, fixedWallEndpoint);
    else setWallFromEndpoints(selected, fixedWallEndpoint, movingPoint);
    refreshOpeningWallLinks();
  } else {
    setEditableMetrics(selected, {
      ...getEditableMetrics(selected),
      x: planPoint.x + dragObjectOffset.x,
      z: planPoint.z + dragObjectOffset.z,
    });
  }
  if (selected.type === "furniture") rebuildFurniture();
  syncColumnEditor();
  rebuildWalls();
  event.preventDefault();
}

function endObjectDrag(event) {
  if (!draggingObjectId) return;
  const dragged = getEditableObjectById(draggingObjectId);
  if (dragged?.type === "wall" && draggingObjectMode.startsWith("wall-")) {
    mergeTouchingCollinearWalls();
    refreshOpeningWallLinks();
    rebuildWalls();
  }
  draggingObjectId = null;
  draggingObjectMode = "move";
  activeDragPlaneY = officeElevation;
  fixedWallEndpoint = null;
  roofResizeStart = null;
  roofResizeStartClientY = 0;
  controls.enabled = true;
  canvas.releasePointerCapture?.(event.pointerId);
  commitHistoryAction();
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
  const buildingTarget = toWorld(1377.5, 815);
  const siteTarget = toWorld((bounds.x0 + bounds.x1) / 2, (bounds.z0 + bounds.z1) / 2);
  if (preset === "top") {
    camera.position.set(buildingTarget.x, 42, buildingTarget.z + 0.01);
    controls.target.set(buildingTarget.x, officeElevation, buildingTarget.z);
  } else if (preset === "cad") {
    const verticalFov = (camera.fov * Math.PI) / 180;
    const width = (bounds.x1 - bounds.x0 + 420) / 100;
    const depth = (bounds.z1 - bounds.z0 + 420) / 100;
    const heightForDepth = depth / (2 * Math.tan(verticalFov / 2));
    const heightForWidth = width / (2 * Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.25));
    const cameraHeight = Math.max(42, heightForDepth, heightForWidth) * 1.08;
    camera.position.set(siteTarget.x, cameraHeight, siteTarget.z + 0.001);
    controls.target.set(siteTarget.x, officeElevation, siteTarget.z);
  } else if (preset === "walk") {
    camera.position.set(buildingTarget.x - 5.4, 2.8, buildingTarget.z + 4.5);
    controls.target.set(buildingTarget.x + 2.4, officeElevation + 0.9, buildingTarget.z - 0.5);
  } else {
    const narrowScreenScale = camera.aspect < 0.75 ? Math.min(2.15, 0.9 / camera.aspect) : 1;
    camera.position.set(
      buildingTarget.x + 18.5 * narrowScreenScale,
      18.5 * narrowScreenScale,
      buildingTarget.z + 25.5 * narrowScreenScale,
    );
    controls.target.set(buildingTarget.x + 0.4, officeElevation + 0.2, buildingTarget.z + 0.3);
  }
  controls.update();
}

function updateStatus() {
  if (!data) return;
  updateWallHeightLabel();
}

function makeCadTextSprite(text) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 480;
  canvasEl.height = 96;
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.fillStyle = "#111515";
  ctx.font = '700 34px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvasEl.width / 2, canvasEl.height / 2, canvasEl.width - 16);
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(3, 0.6, 1);
  sprite.renderOrder = 30;
  return sprite;
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
