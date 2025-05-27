// filepath: /Users/thaeriem/Documents/GitHub/website/three-website/src/rendererContext.ts
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { MapControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import RenderPixelatedPass from "./shaders/pix-pass";

export interface CameraBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ParticleOptions {
  count: number;
  opacity: number;
  size: number;
  scale: number;
  maxHeight: number;
  width: number;
  p: number;
  pos: THREE.Vector3;
}

export interface TList {
  [key: string]: any;
}

// Renderer and scene state
export interface RenderState {
  prevTime: number;
  time: number;
  camera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  sceneCss: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  rendererCss: CSS3DRenderer;
  composer: EffectComposer;
  pixelPass: RenderPixelatedPass;
  cameraBounds: CameraBounds;
  animTime: number;
  dZoom: number;
  velocity: THREE.Vector3;
  y_rotation: number;
  globalGroup: THREE.Group;
  audOcean: HTMLAudioElement;
}

// Input state for mouse and keyboard
export interface InputState {
  controls: MapControls;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  intersects: Array<any>;
  interact: Set<any>;
  moveUp: boolean;
  moveDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  hide: boolean;
  overlay: NodeListOf<Element>;
}

// Lighting state
export interface LightState {
  ambL: THREE.AmbientLight;
  dirL: THREE.DirectionalLight;
  sptL: THREE.SpotLight;
  pntL: THREE.PointLight;
  hmiL: THREE.HemisphereLight;
  trgO: THREE.Object3D;
  lightdark: boolean;
}

// Model state
export interface ModelState {
  islandModel: THREE.Object3D;
  cloudModel: THREE.Object3D;
  boatModel: THREE.Object3D;
  debrisModel: THREE.Object3D;
  islandModelURL: string;
  cloudModelURL: string;
  boatModelURL: string;
  debrisModelURL: string;
}

// Geometry state
export interface GeometryState {
  oceanGeo: THREE.PlaneGeometry;
  oceanMesh: THREE.Mesh;
  outlineGeo: THREE.PlaneGeometry;
  outlineMesh: THREE.Mesh;
  waterPlane: THREE.Mesh;
  cloudAmt: number;
  cloudMesh: THREE.InstancedMesh;
  cloudMat: THREE.Material;
  boatMesh: THREE.Mesh;
  boatP: THREE.Plane;
  debrisMesh: THREE.Mesh[];
  debrP: THREE.Plane;
  smokeParticles: THREE.InstancedMesh;
  osp: THREE.BufferGeometry;
  fireParticles: THREE.InstancedMesh;
  ofp: THREE.BufferGeometry;
  kelpArr: THREE.InstancedMesh[];
}

// CSS and overlay state
export interface OverlayState {
  cssHolder: CSS3DObject;
  anim: boolean;
  hoverIcon: THREE.Group;
  hoverTarget: THREE.Object3D;
  hoverColor: THREE.Color;
}

// Utility state
export interface UtilityState {
  dummy: THREE.Object3D;
  dummyVec: THREE.Vector3;
  dummyMat: THREE.Matrix4;
  dummyPos: THREE.Vector3;
  dummyColor: THREE.Color;
  dummyArr: number[];
  funcList: TList;
  icoList: TList;
  pOptions: ParticleOptions;
  fOptions: ParticleOptions;
  boatv0: THREE.Vector3;
  boatv1: THREE.Vector3;
  boatv2: THREE.Vector3;
  debrv0: THREE.Vector3;
  debrv1: THREE.Vector3;
  debrv2: THREE.Vector3;
  bInd: number[];
  dInd: number[];
  noise: (x: number, y: number) => number;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
}

// Main context interface combining all state
export interface RendererContext extends 
  RenderState, 
  InputState, 
  LightState, 
  ModelState, 
  GeometryState, 
  OverlayState, 
  UtilityState {}

// Create the context singleton
export const ctx: RendererContext = {} as RendererContext;
