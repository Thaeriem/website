import * as THREE from "three"
import { Vector2 } from "three"
import TWEEN from '@tweenjs/tween.js'
import * as SimplexNoise from 'simplex-noise';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

import { MapControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import Stats from 'three/examples/jsm/libs/stats.module.js';
const stats:Stats = Stats();

import RenderPixelatedPass from "./shaders/pix-pass"
import grassShader from './shaders/grass';

// @ts-ignore  
import islandModelURL from '/island.glb?url'
// @ts-ignore  
import cloudModelURL from '/cloud.glb?url'
// @ts-ignore  
import boatModelURL from '/boat.glb?url'
// @ts-ignore  
import debrisModelURL from '/debris.glb?url'

// RENDERING
let prevTime = performance.now(), 
    time = performance.now()
let camera: THREE.OrthographicCamera, 
    scene: THREE.Scene, 
    sceneCss: THREE.Scene,
    renderer: THREE.WebGLRenderer, 
    rendererCss: CSS3DRenderer,
    composer: EffectComposer,
    pixelPass: RenderPixelatedPass
const cameraBounds = {
    minX: -270,
    maxX: -140,
    minZ: -50,
    maxZ: 45
};
let velocity = new THREE.Vector3();
let y_rotation: number = 0
let globalGroup = new THREE.Group();
// MOUSE CONTROLS
let controls: MapControls
let raycaster: THREE.Raycaster = new THREE.Raycaster(),
    mouse: THREE.Vector2 = new THREE.Vector2(1,1),
    intersects: Array<any>  = [],
    interact: Set<any> = new Set()
let moveUp: boolean = false, 
    moveDown: boolean = false, 
    moveLeft: boolean = false, 
    moveRight: boolean = false, 
    rotateLeft: boolean = false, 
    rotateRight: boolean = false
// MODELS
let islandModel: THREE.Object3D, 
    cloudModel: THREE.Object3D, 
    boatModel: THREE.Object3D,
    debrisModel: THREE.Object3D
// GEOMETRIES + MESHES
let geometry: THREE.PlaneGeometry, 
    mesh: THREE.Mesh,
    outlineGeometry: THREE.PlaneGeometry, 
    outline: THREE.Mesh,
    cloudAmt: number = 10,
    cloudMesh: THREE.InstancedMesh,
    cloudMat: THREE.Material,
    boatMesh: THREE.Mesh,
    boatP: THREE.Plane, 
    debrisMesh: THREE.Mesh,
    debrP: THREE.Plane,
    smokeParticles: THREE.InstancedMesh,
    fireParticles: THREE.InstancedMesh,
    grass: THREE.Mesh,
    kelpArr: THREE.InstancedMesh[] = []
// CSS OVERLAY
let cssHolder: CSS3DObject,
    anim: boolean = false,
    hoverIcon: THREE.Mesh
// DUMMY
let dummy: THREE.Object3D = new THREE.Object3D(),
    dummyVec: THREE.Vector3 = new THREE.Vector3(),
    dummyMat: THREE.Matrix4 = new THREE.Matrix4(),
    dummyPos: THREE.Vector3 = new THREE.Vector3(),
    dummyColor: THREE.Color = new THREE.Color(),
    dummyArr: number[] = []
interface TList {
    [key: string]: any;
}
let funcList: TList = {
    "Chest": onClickChest,
    "Github": onClickGithub
    },
    iconList: TList
// -----------------------------------------------------------------------
// TEXTURE LOADER
const texLoader = new THREE.TextureLoader();
function pixelTex( tex: THREE.Texture ) {
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
}
// -----------------------------------------------------------------------
// SMOKE
const pOptions = {
    count: 20,
    opacity: 0.8,
    size: 0.075,
    scale: 0.002,
    maxHeight: 3,
    width: 0.2,
    p: 0.975,
    pos: new THREE.Vector3(0.1, 0.8, 0.95)
}
// FIRE
const fOptions = {
    count: 20,
    opacity: 0.8,
    size: 0.075,
    scale: 0.002,
    maxHeight: 3,
    width: 0.2,
    p: 0.975,
    pos: new THREE.Vector3(0.1, 0.8, 0.95)
}
// -----------------------------------------------------------------------
// BOAT + OCEAN
const boatv0 = new THREE.Vector3(0, 0, 0), boatv1 = new THREE.Vector3(0, 0, 0), 
      boatv2 = new THREE.Vector3(0, 0, 0), debrv0 = new THREE.Vector3(0, 0, 0),
      debrv1 = new THREE.Vector3(0, 0, 0), debrv2 = new THREE.Vector3(0, 0, 0)
const bInd: number[] = [560, 561, 595], dInd: number[] = [560, 595, 594]
const noise = SimplexNoise.createNoise2D();
const colorStart = new THREE.Color("#046997"), 
      colorEnd = new THREE.Color("#30b1ce");

// -----------------------------------------------------------------------
// SETUP
function setupCamera(screenResolution: Vector2) {
    loadNext();
    let aspectRatio = screenResolution.x / screenResolution.y
    camera = new THREE.OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0, 2000);
    camera.position.set(-200, 80, 0.000001)
    camera.zoom = 0.25
    camera.updateProjectionMatrix()
}

function setupRenderers(screenResolution: Vector2) {
    loadNext();
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .75
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    renderer.debug.checkShaderErrors = false;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById("scene")?.appendChild( renderer.domElement );

    rendererCss = new CSS3DRenderer();
    rendererCss.setSize( screenResolution.x, screenResolution.y )
    rendererCss.domElement.style.position = 'absolute';
    rendererCss.domElement.style.top = "0";
    document.getElementById("scene")?.appendChild( rendererCss.domElement );
}

function setupControls() {
    loadNext();
    controls = new MapControls( camera, rendererCss.domElement )
    // controls.enablePan = false //
    controls.target.set( 0, 0, 0 )
    controls.maxZoom = 1
    controls.minZoom = 0.03
    controls.zoomSpeed = 2
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.DOLLY,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE //
    }
    controls.update()
    // controls.minPolarAngle = controls.getPolarAngle() - Math.PI
    // controls.maxPolarAngle = controls.getPolarAngle() + (Math.PI / 24)
}
// -----------------------------------------------------------------------
// GRASS
const PLANE_SIZE = 3;
const BLADE_COUNT = 1000;
const BLADE_WIDTH = 0.1;
const BLADE_HEIGHT = 0.3;
const BLADE_HEIGHT_VARIATION = 0.4;

const startTime = performance.now();
const grassTexture = pixelTex(texLoader.load('grass.jpg'));

const timeUniform = { type: 'f', value: 0.0 };

// Grass Shader
const grassUniforms = {
  textures: { value: [grassTexture] },
  iTime: timeUniform
};

const grassMaterial = new THREE.ShaderMaterial({
  uniforms: grassUniforms,
  vertexShader: grassShader.vert,
  fragmentShader: grassShader.frag,
  vertexColors: true,
  side: THREE.DoubleSide
});

generateField();

function convertRange (val: number, oldMin: number, 
    oldMax: number, newMin: number, newMax: number) {
    return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
}
  
function generateField () {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
  
    for (let i = 0; i < BLADE_COUNT; i++) {
        const VERTEX_COUNT = 5;
        const surfaceMin = PLANE_SIZE / 2 * -1;
        const surfaceMax = PLANE_SIZE / 2;
        const radius = PLANE_SIZE / 2;
    
        const r = radius * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
    
        const pos = new THREE.Vector3(x, 0, y);
    
        const uv = [convertRange(pos.x, surfaceMin, surfaceMax, 0, 1), 
                    convertRange(pos.z, surfaceMin, surfaceMax, 0, 1)];
    
        const blade = generateBlade(pos, i * VERTEX_COUNT, uv);
        blade.verts.forEach(vert => {
            positions.push(...vert.pos);
            uvs.push(...vert.uv);
            colors.push(...vert.color);
        });
        blade.indices.forEach(indice => indices.push(indice));
    }
  
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
  
    grass = new THREE.Mesh(geom, grassMaterial);
    // globalGroup.add(grass);
}
  
function generateBlade (center: THREE.Vector3, vArrOffset: number, uv: number[]) {
    const MID_WIDTH = BLADE_WIDTH * 0.5;
    const TIP_OFFSET = 0.1;
    const height = BLADE_HEIGHT + (Math.random() * BLADE_HEIGHT_VARIATION);
  
    const yaw = Math.random() * Math.PI * 2;
    const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const tipBend = Math.random() * Math.PI * 2;
    const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));
  
    // Find the Bottom Left, Bottom Right, Top Left, Top right, Top Center vertex positions
    const bl = new THREE.Vector3().addVectors(center, dummyVec.copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * 1));
    const br = new THREE.Vector3().addVectors(center, dummyVec.copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * -1));
    const tl = new THREE.Vector3().addVectors(center, dummyVec.copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
    const tr = new THREE.Vector3().addVectors(center, dummyVec.copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
    const tc = new THREE.Vector3().addVectors(center, dummyVec.copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));
  
    tl.y += height / 2;
    tr.y += height / 2;
    tc.y += height;
  
    // Vertex Colors
    const black = [0, 0, 0];
    const gray = [0.5, 0.5, 0.5];
    const white = [1.0, 1.0, 1.0];
  
    const verts = [
      { pos: bl.toArray(), uv: uv, color: black },
      { pos: br.toArray(), uv: uv, color: black },
      { pos: tr.toArray(), uv: uv, color: gray },
      { pos: tl.toArray(), uv: uv, color: gray },
      { pos: tc.toArray(), uv: uv, color: white }
    ];
  
    const indices = [
      vArrOffset,
      vArrOffset + 1,
      vArrOffset + 2,
      vArrOffset + 2,
      vArrOffset + 4,
      vArrOffset + 3,
      vArrOffset + 3,
      vArrOffset,
      vArrOffset + 2
    ];
  
    return { verts, indices };
}
// -----------------------------------------------------------------------
// KELP
const kelpPos: Array<Array<number>> = [
    [
        -1,-1.3,-8,-2,-1.4,-12
        
    ],
    [
        -4,-1.4,-9, 2, -1.3, -8, 0, -1.4, -10, 2, -1.5, -12
    ],
    [
        -3,-1.5,-7, 3,-1.6,-9.5, 
    ]
]
// -----------------------------------------------------------------------
// STARTUP
function loadNext() {
    const grid = document.getElementById("grid")
    if (grid && grid.dataset["row"]) grid.dataset["row"] = String(parseInt(grid.dataset["row"]) + 1);
}


init();
function init() {
    stats.dom.style.width = '80px';
    stats.dom.style.height = '48px';
    document.body.appendChild( stats.dom );

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 4 )
    renderResolution.x |= 0
    renderResolution.y |= 0

    setupCamera(screenResolution);

    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )
    scene.add(globalGroup);
    sceneCss = new THREE.Scene();
    sceneCss.scale.set(0.05, 0.05, 0.05);

    setupRenderers(screenResolution);

    composer = new EffectComposer( renderer )
    composer.addPass( new RenderPass( scene, camera ) )
    pixelPass = new RenderPixelatedPass( renderResolution, scene, camera );
    composer.addPass( pixelPass )
    let bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    composer.addPass(bloomPass)
    

    setupControls();

    loadNext();
    const gltfLoader = new GLTFLoader()

    {
        loadNext();
        gltfLoader.load(islandModelURL, (gltf) => {
            islandModel = gltf.scene;
            let toRem:THREE.Object3D[] = []
            islandModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.name.slice(0,4) == "Kelp") {
                        const ind = parseInt(child.name.slice(4)) - 1
                        const kelp = islandModel.getObjectByName(child.name) as THREE.Mesh
                        const instMesh = new THREE.InstancedMesh(kelp.geometry, kelp.material, kelpPos[ind].length);
                        globalGroup.add(instMesh)
                        for (let i = 0; i < kelpPos[ind].length*3; i+= 3) {
                            dummyPos.set(kelpPos[ind][i], kelpPos[ind][i+1], kelpPos[ind][i+2]);
                            dummyMat.setPosition(dummyPos);
                            instMesh.setMatrixAt(i, dummyMat);
                        }
                        instMesh.instanceMatrix.needsUpdate = true;
                        instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                        kelpArr.push(instMesh)
                        toRem.push(child)
                        instMesh.scale.set(0.4,0.4,0.4);

                    }
                    if (child.name.slice(0,5) == "Chest" && !interact.has(child.parent) ) interact.add(child.parent)
                    if (child.name == "Icon") {
                        hoverIcon = child
                        globalGroup.add(hoverIcon)
                        toRem.push(child)
                    }
                }
                if (child) child.frustumCulled = false;
            });
            toRem.forEach((val) => { islandModel.remove(val) })
            islandModel.scale.set(1, 1, 1);
            islandModel.position.set(0, 0, 0); 
            globalGroup.add(islandModel);
            iconList = {
                "Chest": hoverIcon,
                "Github": undefined
            }
        }, undefined, (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    }
     // Geometry setup
     {
        const width = 400, height = 400, segmentsX = Math.floor(width / 12), segmentsY = Math.floor(height / 12);
        geometry = outlineGeometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    
        // Create the material for the plane
        const material = new THREE.MeshBasicMaterial({
            color: 0x046997,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        // Create the material for the outline with gradient
        const material2 = new THREE.MeshBasicMaterial({
            wireframe: true,
            vertexColors: true,
            transparent:true,
            opacity:0.05
        });
        const material3 = new THREE.MeshBasicMaterial({
            color: 0x046997,
            side: THREE.DoubleSide
        });
        // Create the mesh for the plane
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        globalGroup.add(mesh);
        // Create the mesh for the outline
        outline = new THREE.Mesh(outlineGeometry, material2);
        outline.rotation.x = -Math.PI / 2;
        globalGroup.add(outline);
        const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material3);
        waterPlane.rotation.x = -Math.PI / 2;
        waterPlane.position.y = -0.5;
        globalGroup.add(waterPlane);


        // Adjust the vertices with noise
        updateOcean(0,0.1,0.1);
    }

    {
        loadNext();
        gltfLoader.load(cloudModelURL, (gltf) => {
            cloudModel = gltf.scene;
            cloudModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                child.frustumCulled = false;
            });
            // Create InstancedMesh
            const cloud = cloudModel.getObjectByName('Cloud') as THREE.Mesh
            cloudMat = cloud.material as THREE.Material
            cloudMat.transparent = true;
            cloudMat.opacity = 0.65;
            cloudMesh = new THREE.InstancedMesh(cloud.geometry, cloud.material, cloudAmt);
            cloudMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            for (let i = 0; i < cloudAmt; i++) {
                dummyPos.set(Math.floor(Math.random() * 400), Math.floor(Math.random() * 50-25), 10)
                dummyMat.setPosition(dummyPos);
                cloudMesh.setMatrixAt(i, dummyMat);
            }
            cloudMesh.rotation.x = -Math.PI / 2;
            cloudMesh.rotation.z = 15*Math.PI/11;
            cloudMesh.instanceMatrix.needsUpdate = true;
            globalGroup.add(cloudMesh);

        }, undefined, (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    }

    {
        loadNext();
        gltfLoader.load(boatModelURL, (gltf) => {
            boatModel = gltf.scene;
            boatModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                child.frustumCulled = false;
            });
            const boat = boatModel.getObjectByName('Boat') as THREE.Mesh
            boatMesh = new THREE.Mesh(boat.geometry, boat.material);
            boatMesh.scale.set(0.3,0.3,0.3);
            boatMesh.position.set(-1,0,3.5);
            boatMesh.rotation.set(0,-0.8,0)
            globalGroup.add(boatMesh);
            const pos = geometry.attributes.position
            boatv0.set(pos.getX(bInd[0]), pos.getZ(bInd[0]), pos.getY(bInd[0]))
            boatv1.set(pos.getX(bInd[1]), pos.getZ(bInd[1]), pos.getY(bInd[1]))
            boatv2.set(pos.getX(bInd[2]), pos.getZ(bInd[2]), pos.getY(bInd[2]))
            boatP = createPlane(boatv0, boatv1, boatv2);
        }, undefined,  (error) => {
            console.error('An error happened while loading the glb model', error);
        });

        loadNext();
        gltfLoader.load(debrisModelURL, (gltf) => {
            debrisModel = gltf.scene;
            debrisModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                child.frustumCulled = false;
            });
            debrisMesh = debrisModel.getObjectByName('Debris') as THREE.Mesh
            debrisMesh.position.set(0,2,-4);
            debrisMesh.rotation.set(0,0.8,0)
            globalGroup.add(debrisMesh);
            const pos = geometry.attributes.position
            debrv0.set(pos.getX(dInd[0]), pos.getZ(dInd[0]), pos.getY(dInd[0]))
            debrv1.set(pos.getX(dInd[1]), pos.getZ(dInd[1]), pos.getY(dInd[1]))
            debrv2.set(pos.getX(dInd[2]), pos.getZ(dInd[2]), pos.getY(dInd[2]))
            debrP = createPlane(debrv0, debrv1, debrv2);
        }, undefined,  (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    
    }

    {
        const geo = new THREE.SphereGeometry(pOptions.size, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: pOptions.opacity });
        smokeParticles = new THREE.InstancedMesh(geo, mat, pOptions.count);
        globalGroup.add(smokeParticles);

        for (let i = 0; i < pOptions.count; i++) {
            resetParticle(smokeParticles, i, true, pOptions);
        }
        smokeParticles.instanceMatrix.needsUpdate = true;
        smokeParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const fgeo = new THREE.SphereGeometry(pOptions.size, 8, 8);
        const fmat = new THREE.MeshBasicMaterial({ color: 0x737373, transparent: true, opacity: fOptions.opacity });
        fireParticles = new THREE.InstancedMesh(fgeo, fmat, fOptions.count);
        globalGroup.add(fireParticles);

        for (let i = 0; i < fOptions.count; i++) {
            resetParticle(fireParticles, i, true, fOptions);
        }
        fireParticles.instanceMatrix.needsUpdate = true;
        fireParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }

    {
        grass.position.set(0.2,0.3,0.2);
        grass.rotation.set(0,Math.PI/2, 0);
    }

    // Lights
    // Ambient light for general illumination
    {
        globalGroup.add(new THREE.AmbientLight(0x2d3645, 8));

        // Directional light for strong, directional lighting
        let directionalLight = new THREE.DirectionalLight(0xff6900, 4.5);
        directionalLight.position.set(-200, 80, -1000);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(4000, 4000);
        globalGroup.add(directionalLight);

        const spotLight = new THREE.SpotLight(0xffffff);
        spotLight.position.set(0, 300, 0);
        spotLight.angle = Math.PI / 6; 
        spotLight.penumbra = 0.1; 
        spotLight.decay = 1;
        spotLight.distance = 400;
        globalGroup.add(spotLight);
        spotLight.target = islandModel;

        // Add a target for the spotlight to look at
        const targetObject = new THREE.Object3D();
        targetObject.position.set(0, 0, 0);
        globalGroup.add(targetObject);
        spotLight.target = targetObject;
    }
    renderHTML()
    const bg = new THREE.BoxGeometry(1, 1, 1);
    const mg = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const box = new THREE.Mesh(bg, mg);
    box.position.set(-3,0,1)
    box.name = 'Github'
    interact.add(box)

    globalGroup.add(box);
    // events
    window.addEventListener( 'resize', onWindowResize );
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("keyup", onKeyUp, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mousedown', onMouseClick, false);
}
// -----------------------------------------------------------------------
// Ocean
function updateOcean(time: number, scale: number, amplitude: number) {
    const positionAttribute = geometry.attributes.position;
    dummyArr = [];
    let z = 0, zNorm = 0;

    for (let i = 0; i < positionAttribute.count; i++) {
        z = noise(positionAttribute.getX(i) * scale + time, 
                        positionAttribute.getY(i) * scale + time) 
                  * amplitude + 0.5;
        positionAttribute.setZ(i, z);
        
        zNorm = (z + 0.2) / 0.4;

        dummyColor.lerpColors(colorStart, colorEnd, zNorm);
        dummyArr.push(dummyColor.r, dummyColor.g, dummyColor.b)
    }
    positionAttribute.needsUpdate = true;
    outlineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(dummyArr, 3));

}
// -----------------------------------------------------------------------
// Clouds
function updateClouds(delta: number) {
    if (cloudMesh) {
        if (camera.zoom > 0.15) {
            if (camera.zoom > 0.28) cloudMesh.visible = false
            cloudMat.opacity = 0.2;
        }
        else {
            if (!cloudMesh.visible) cloudMesh.visible = true
            cloudMat.opacity = 0.65
        }
        for (let i = 0; i < cloudAmt; i++) {
            cloudMesh.getMatrixAt(i, dummyMat);
            dummyPos.setFromMatrixPosition(dummyMat);
            dummyPos.x += delta * 10
            if (dummyPos.x > 200) dummyPos.x -= 400;
            dummyMat.setPosition(dummyPos);
            cloudMesh.setMatrixAt(i, dummyMat);
        }
        if (cloudMesh.visible) cloudMesh.instanceMatrix.needsUpdate = true;
    }
}
// -----------------------------------------------------------------------
// Smoke
function resetParticle(mesh: THREE.InstancedMesh, index: number, init: boolean, opt: any) {
    const scale = opt.width
    if (init) {
        dummyPos.set(
            (Math.random()-0.5)*scale + opt.pos.x,
            (Math.random() * opt.maxHeight/2) + opt.pos.y,
            (Math.random()-0.5)*scale + opt.pos.z
        )
    }
    else {
        dummyPos.set(
            (Math.random()-0.5)*scale + opt.pos.x,           
            opt.pos.y,
            (Math.random()-0.5)*scale + opt.pos.z
        )
    }
    dummyMat.setPosition(dummyPos)
    mesh.setMatrixAt(index, dummyMat);
    mesh.instanceMatrix.needsUpdate = true;
}

function smokeSpeed(y: number, opt: any): number {
    return Math.log(y - opt.pos.y + 2);
}
function smokeDrift(y: number, d: number, opt: any): number {
    return d*Math.log(y - opt.pos.y + 1);
}

function updateSmoke() {
    for (let i = 0; i < pOptions.count; i++) {
        smokeParticles.getMatrixAt(i, dummyMat);
        dummyPos.setFromMatrixPosition(dummyMat);
        dummyPos.y += 0.01 * smokeSpeed(dummyPos.y, pOptions);
        dummyPos.x += Math.sin(time/500)*pOptions.scale;
        dummyPos.z += Math.cos(time/500)*pOptions.scale+smokeDrift(dummyPos.y, 0.005, pOptions);
        dummyMat.setPosition(dummyPos);
        if (dummyPos.y > (pOptions.pos.y + pOptions.maxHeight/3)) {
            if (Math.random() > pOptions.p) resetParticle(smokeParticles,i,false, pOptions);
            else smokeParticles.setMatrixAt(i, dummyMat);
        }
        else smokeParticles.setMatrixAt(i, dummyMat);
    }
    smokeParticles.instanceMatrix.needsUpdate = true;
}
function updateFire() {
    for (let i = 0; i < fOptions.count; i++) {
        fireParticles.getMatrixAt(i, dummyMat);
        dummyPos.setFromMatrixPosition(dummyMat);
        dummyPos.y += 0.01 * smokeSpeed(dummyPos.y, fOptions);
        dummyPos.x += Math.sin(time/500)*fOptions.scale;
        dummyPos.z += Math.cos(time/500)*fOptions.scale+smokeDrift(dummyPos.y, 0.005, fOptions);
        dummyMat.setPosition(dummyPos);
        if (dummyPos.y > (fOptions.pos.y + fOptions.maxHeight/3)) {
            if (Math.random() > fOptions.p) resetParticle(fireParticles,i,false, fOptions);
            else fireParticles.setMatrixAt(i, dummyMat);
        }
        else fireParticles.setMatrixAt(i, dummyMat);
    }
    fireParticles.instanceMatrix.needsUpdate = true;
}
// -----------------------------------------------------------------------
// BOAT
function updateBoat(time: number) {
    if (boatMesh) {
        const pos = geometry.attributes.position
        boatv0.setY(pos.getZ(594)), boatv1.setY(pos.getZ(595)), boatv2.setY(pos.getZ(560))
        updatePlane(boatP, boatv0, boatv1, boatv2);
        dummyPos.copy(boatMesh.position);
        dummyPos.copy(projPlane(dummyPos, boatP));
        boatMesh.position.copy(dummyPos);
        const angle = oscillateValue(-0.2,0.2,1,time/3000);
        boatMesh.rotation.z = angle
    }   
}

function projPlane(point: THREE.Vector3, plane: THREE.Plane) {
    const projectedPoint = new THREE.Vector3();
    plane.projectPoint(point, projectedPoint);
    return projectedPoint;
}
function updatePlane(plane: THREE.Plane, v0: THREE.Vector3, v1:THREE.Vector3, v2:THREE.Vector3) {
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    plane.normal.crossVectors(edge1, edge2).normalize();
    plane.constant = -plane.normal.dot(v0);
}
function createPlane(v0: THREE.Vector3, v1:THREE.Vector3, v2:THREE.Vector3) {
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    const constant = -normal.dot(v0);
    return new THREE.Plane(normal, constant);
}
function oscillateValue(min:number, max:number, frequency:number, time:number) {
    const range = max - min;
    const amplitude = range / 2;
    const offset = min + amplitude;
    return amplitude * Math.sin(frequency * time) + offset;
}
// DEBRIS
function updateDebris() {
    if (debrisMesh) {
        const pos = geometry.attributes.position
        debrv0.setY(pos.getZ(594)), debrv1.setY(pos.getZ(561)), debrv2.setY(pos.getZ(560))
        updatePlane(debrP, debrv0, debrv1, debrv2);
        dummyPos.copy(debrisMesh.position);
        dummyPos.copy(projPlane(dummyPos, debrP));
        debrisMesh.position.copy(dummyPos);
    }   
}
// -----------------------------------------------------------------------
// KELP
function updateKelp() {
    if (islandModel) {
        const height = (debrv0.y + debrv1.y + debrv2.y)/3
        const hnorm = (((height - 0.25) / (0.55 - 0.25)) - 0.5)
        for (let i = 0; i < kelpArr.length; i++) {
            for (let j = 0; j < kelpArr[i].count; j++) {
                kelpArr[i].getMatrixAt(j, dummyMat);
                dummyMat.decompose(dummy.position,dummy.quaternion,dummy.scale);
                dummy.rotation.z = 0.2*(hnorm)+Math.PI
                dummy.rotation.x = 0.5*(hnorm)+Math.PI
                dummy.updateMatrix()
                kelpArr[i].setMatrixAt(j, dummy.matrix);
                kelpArr[i].instanceMatrix.needsUpdate = true;
            }
        }
    }
}
// -----------------------------------------------------------------------
// KEYBOARD + MOUSE
function preventEvent(event: any) {
    event.stopPropagation();
}

function toggleControls(enable: boolean) {
    controls.enabled = enable;
    if (!enable) {
      window.addEventListener('mousedown', preventEvent, true);
      window.addEventListener('touchstart', preventEvent, true);
      window.addEventListener('wheel', preventEvent, true);
    } else {
        setTimeout(()=> {
            window.removeEventListener('mousedown', preventEvent, true);
            window.removeEventListener('touchstart', preventEvent, true);
            window.removeEventListener('wheel', preventEvent, true);
        }, 100)
    }
}

function onKeyDown (event: any) {
    switch (event.code) {
        case 'KeyZ':
        case 'Escape':
            if (controls.enabled) {
                moveUp = moveDown = moveLeft = moveRight = false;
                camReset(0.25, false)
            }
            else {
                toggleControls(!controls.enabled)
                cssHolder.visible = !cssHolder.visible
            }
            break;
        case 'KeyW':
        case 'ArrowUp':
            if (controls.enabled) moveUp = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            if (controls.enabled) moveDown = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            if (controls.enabled) moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            if (controls.enabled) moveRight = true;
            break;
        case 'KeyE':
        case 'Period':
            if (controls.enabled) rotateRight = true;
            break;
        case 'KeyQ':
        case 'Comma':
            if (controls.enabled) rotateLeft = true;
            break;
    }
};

function onKeyUp (event: any) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveUp = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveDown = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = false;
            break;
        case 'KeyE':
        case 'Period':
            rotateRight = false;
            break;
        case 'KeyQ':
        case 'Comma':
            rotateLeft = false;
            break;
    }
};

function onMouseMove(event: any) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick() {
    if (document.getElementById('scene')?.style.display != "") {
        if (intersects.length > 0) {
            const ele = intersects[0];
            funcList[ele.name](ele)
        }
    }
}

function placeIcon() {
    if (islandModel) {
        if (document.getElementById('scene')?.style.display != "") {
            if (intersects.length > 0) {
                const ele = intersects[0];
                if (ele) {
                    const icon = iconList[ele.name]
                    if (icon) {
                        icon.position.copy(ele.position);
                        icon.position.x += 0.1;
                        icon.position.y += 0.6; 
                        icon.rotation.y += 0.02; 
                        icon.visible = true;
                    }
                    document.querySelector('html')?.classList.add('active');
                }
            } else {
                for (let key in iconList) { if (iconList[key]) iconList[key].visible = false}
                document.querySelector('html')?.classList.remove('active');
            }
        }
    }
}

function mouseUpdate() {
    raycaster.setFromCamera(mouse, camera);
    intersects = []
    interact.forEach((val) => {
        const tmp = raycaster.intersectObject(val)
        tmp.forEach((val)=> { 
            if (val.object.parent?.name != "") intersects.push(val.object.parent)
            else intersects.push(val.object) 
        })
    })
    placeIcon()
}
// -----------------------------------------------------------------------
// INTERACTIONS

function onClickChest() {
    if (!anim) {
        if (!cssHolder.visible) camReset(0.1, true)
        toggleControls(!controls.enabled)
        cssHolder.visible = !cssHolder.visible
    }
}

function onClickGithub() {
    window.open('https://github.com/Thaeriem', '_blank')?.focus();
}


// -----------------------------------------------------------------------
// CAMERA CONTROLS
const nnorm = (z: number) => (z-0.03)/(1-0.03);
const nzoom = (z: number, pow: number, disp: number) => (pow ** (1-z)-disp)/(pow-disp);
const ndrift = (val: number) => (6-1.5*val);
const nskew = (z: number, l: number, h: number) => l+(z)*(h-l);

function camReset(zlvl: any, ifAnim: boolean) {
    
    new TWEEN.Tween(camera.position)
        .to({ x: -200, y: 80, z: 0.000001 }, 1500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween(controls.target)
        .to({ x: 0, y: 0, z: 0 }, 1500) 
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween({ zoom: camera.zoom })
        .to({ zoom: zlvl }, 1500) 
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (object) {
            camera.zoom = object.zoom;
            camera.updateProjectionMatrix();
        })
        .start();
    if (ifAnim) {
        anim = true;
        setTimeout(()=>{controls.saveState(); anim=false; }, 1500)
    }
    globalGroup.rotation.set(0,0,0)
    velocity.set(0, 0, 0);
    y_rotation = 0;
}

function onWindowResize() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    const aspect = screenResolution.x / screenResolution.y;
    let renderResolution = screenResolution.clone().divideScalar( 4 )
    renderResolution.x |= 0
    renderResolution.y |= 0

    camera.left = -aspect;
    camera.right = aspect;
    camera.top = 1;
    camera.bottom = -1;
    pixelPass.resolution = renderResolution
    camera.updateProjectionMatrix();

    renderer.setSize( screenResolution.x, screenResolution.y );

    rendererCss.setSize( screenResolution.x, screenResolution.y );
}
// -----------------------------------------------------------------------
// HTML Render
// function githubButton() {
//     const element = document.createElement('div');
//     element.style.cssText = 'position: absolute;';

//     const link = document.createElement('a');
//     link.className = 'github';
//     link.href = 'https://google.com';
//     link.style.cssText = 'pointer-events: auto;';
//     link.addEventListener('pointerdown', (event) => {
//         event.preventDefault(); 
//         window.location.href = link.href;
//     });
    

//     const icon = document.createElement('i');
//     icon.className = 'fab fa-github';
//     icon.style.cssText = 'font-size: 3.1em;';
    
//     link.appendChild(icon);
//     element.appendChild(link);
//     const cssObject = new CSS3DObject(element);
//     cssObject.position.set(0, 0, 0); 
//     cssObject.rotation.set(0,Math.PI/2, 0);
//     sceneCss.add(cssObject);
// }


function renderHTML() {
    // githubButton();
    const iframe = document.createElement( 'iframe' );
    iframe.style.cssText = 'width: 24em; height: 26em; border: 0; objectFit: cover';
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
    iframe.src = 'http://localhost:8000/index.html';

    cssHolder = new CSS3DObject(iframe);
    cssHolder.frustumCulled = false;
    cssHolder.position.set(0, 0, 0);
    cssHolder.rotation.set(0,Math.PI/2, 0);
    cssHolder.visible = false
    sceneCss.add(cssHolder);
    sceneCss.rotateY(Math.PI)
}
// -----------------------------------------------------------------------
animate()
function animate() {

    time = performance.now();
    const delta = ( time - prevTime ) / 1000;

    updateOcean(time * 0.0001,0.1,0.1);
    updateClouds(delta);

    if (controls.enabled) {
        grassUniforms.iTime.value = time - startTime;
        const newZoom = nnorm(camera.zoom)
        const coef = nzoom(newZoom, 200, 0.99);
        

        velocity.z -= velocity.z * ndrift(coef) * delta;
        velocity.x -= velocity.x * ndrift(coef) * delta;
        if ( moveUp ) velocity.x += nskew(coef, 1.5,10) * delta;
        if (moveDown )  velocity.x -= nskew(coef, 1.5,10) * delta;
        if ( moveLeft ) velocity.z -= nskew(coef, 0.75,5) * delta;
        if (moveRight ) velocity.z += nskew(coef, 0.75,5) * delta;
        
        const new_x = camera.position.x + velocity.x, new_z = camera.position.z + velocity.z;
        if (new_x > cameraBounds.maxX) velocity.x = 0;
        if (new_x < cameraBounds.minX) velocity.x = 0;
        if (new_z > cameraBounds.maxZ) velocity.z = 0;
        if (new_z < cameraBounds.minZ) velocity.z = 0;
        camera.position.add(velocity);
        controls.target.add(velocity);

        y_rotation -= y_rotation * 10.0 * delta;
        if ( rotateLeft ) y_rotation += 1.0 * delta;
        if ( rotateRight ) y_rotation -= 1.0 * delta;
        globalGroup.rotateY(y_rotation);

        // object controls
        updateBoat(time);
        updateDebris();
        updateSmoke();
        updateFire();
        updateKelp();
        mouseUpdate();
        controls.update();
    }
    stats.update();
    TWEEN.update();
    composer.render();
    rendererCss.render( sceneCss, camera );
    requestAnimationFrame( animate )

    prevTime = time;
}
