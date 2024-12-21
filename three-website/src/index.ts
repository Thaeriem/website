import * as THREE from "three"
import { Vector2 } from "three"
import TWEEN from '@tweenjs/tween.js'
import * as SimplexNoise from 'simplex-noise';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

import { MapControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import RenderPixelatedPass from "./shaders/pix-pass"
import Stats from 'three/examples/jsm/libs/stats.module.js';
const stats:Stats = Stats();
const IFRAME_PAGE = import.meta.env.VITE_IFRAME_PAGE;

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
const animTime = 1200;
const overlay = document.querySelectorAll('.ov');
const audOcean = document.getElementById('ocean') as HTMLAudioElement;
audOcean.muted = true;
// const audJingle = document.getElementById('jingle') as HTMLAudioElement;
const dZoom = 0.3;
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
    rotateRight: boolean = false,
    hide: boolean = false
// LIGHTS
let ambL: THREE.AmbientLight,
    dirL: THREE.DirectionalLight,
    sptL: THREE.SpotLight,
    pntL: THREE.PointLight,
    hmiL: THREE.HemisphereLight,
    trgO: THREE.Object3D = new THREE.Object3D(),
    lightdark: boolean = false
// MODELS
let islandModel: THREE.Object3D, 
    cloudModel: THREE.Object3D, 
    boatModel: THREE.Object3D,
    debrisModel: THREE.Object3D
// GEOMETRIES + MESHES
let oceanGeo: THREE.PlaneGeometry, 
    oceanMesh: THREE.Mesh,
    outlineGeo: THREE.PlaneGeometry, 
    outlineMesh: THREE.Mesh,
    waterPlane: THREE.Mesh,
    cloudAmt: number = 10,
    cloudMesh: THREE.InstancedMesh,
    cloudMat: THREE.Material,
    boatMesh: THREE.Mesh,
    boatP: THREE.Plane, 
    debrisMesh: THREE.Mesh[] = [],
    debrP: THREE.Plane,
    smokeParticles: THREE.InstancedMesh,
    osp: THREE.BufferGeometry,
    fireParticles: THREE.InstancedMesh,
    ofp: THREE.BufferGeometry,
    kelpArr: THREE.InstancedMesh[] = []
// CSS OVERLAY
let cssHolder: CSS3DObject,
    anim: boolean = false,
    hoverIcon: THREE.Group,
    hoverTarget: THREE.Object3D,
    hoverColor: THREE.Color
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
    "Camp": onClickCamp
    }
let icoList: TList = {
    cube: new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    ),
    sphere: new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x0000ff })
    ),
    cone: new THREE.Mesh(
        new THREE.ConeGeometry(1, 2, 32),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    )
};
// -----------------------------------------------------------------------
// TEXTURE LOADER
// const texLoader = new THREE.TextureLoader();
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
    camera.zoom = dZoom
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
    controls.target.set( 0, 1, 0 )
    controls.maxZoom = 1
    controls.minZoom = 0.03
    controls.zoomSpeed = 2
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.DOLLY 
    }
    controls.update()
}

function setupDayLight() {
    globalGroup.remove(ambL);
    globalGroup.remove(dirL);
    globalGroup.remove(sptL);
    globalGroup.remove(trgO);
    globalGroup.remove(pntL);
    globalGroup.remove(hmiL);
    // LIGHTS
    ambL = new THREE.AmbientLight(0x2d3645, 8);
    dirL = new THREE.DirectionalLight(0xff6900, 4.5)
    dirL.position.set(-200, 80, -1000);
    dirL.castShadow = true;
    dirL.shadow.mapSize.set(4000, 4000);
    sptL = new THREE.SpotLight(0xffffff);
    sptL.position.set(0, 300, 0);
    sptL.angle = Math.PI / 6; 
    sptL.penumbra = 0.1; 
    sptL.decay = 1;
    sptL.distance = 400;
    trgO.position.set(0, 0, 0);
    sptL.target = trgO;
    pntL = new THREE.PointLight(0x7d5ba6, 0, 300);
    pntL.position.set(100, 150, -50);
    hmiL = new THREE.HemisphereLight(0x003366, 0x1a1a2e, 0);
    globalGroup.add(ambL);
    globalGroup.add(dirL);
    globalGroup.add(sptL);
    globalGroup.add(trgO);
    globalGroup.add(pntL);
    globalGroup.add(hmiL);
    // OCEAN
    const mat = (oceanMesh.material as THREE.MeshBasicMaterial)
    mat.color.set(0x046997)
    const mat2 = (outlineMesh.material as THREE.MeshBasicMaterial)
    mat2.opacity = 0.03

}

function setupNightLight() {
    globalGroup.remove(ambL);
    globalGroup.remove(dirL);
    globalGroup.remove(sptL);
    globalGroup.remove(trgO);
    globalGroup.remove(pntL);
    globalGroup.remove(hmiL);
    ambL = new THREE.AmbientLight(0x1a2b3c, 2)
    dirL = new THREE.DirectionalLight(0x8a47ff, 2);
    dirL.position.set(-200, 80, -1000);
    dirL.castShadow = true;
    dirL.shadow.mapSize.set(4000, 4000);
    sptL = new THREE.SpotLight(0x4a90e2, 0.5);
    sptL.position.set(50, 200, 100);
    sptL.angle = Math.PI / 4;
    sptL.penumbra = 0.3;
    sptL.decay = 1.2;
    sptL.distance = 500;
    trgO.position.set(0, 50, 0);
    sptL.target = trgO;
    pntL = new THREE.PointLight(0x7d5ba6, 1.8, 300);
    pntL.position.set(100, 150, -50);
    hmiL = new THREE.HemisphereLight(0x003366, 0x1a1a2e, 0.5);
    globalGroup.add(ambL);
    globalGroup.add(dirL);
    globalGroup.add(sptL);
    globalGroup.add(trgO);
    globalGroup.add(pntL);
    globalGroup.add(hmiL);
    // OCEAN
    const mat = (oceanMesh.material as THREE.MeshBasicMaterial)
    mat.color.set(0x1a2b3c)
    const mat2 = (outlineMesh.material as THREE.MeshBasicMaterial)
    mat2.opacity = 0.01
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
                    if (child.name.slice(0,5) == "Chest" && !interact.has(child.parent)) {
                        interact.add(child.parent)
                        hoverTarget = child.parent as THREE.Object3D
                        hoverColor = (child.material as THREE.MeshStandardMaterial).color.clone()
                    }
                    if (child.name.slice(0,4) == "Camp" && !interact.has(child.parent)) {
                        interact.add(child.parent)
                    }
                }
                if (child.name == "Icon") {
                    if (child instanceof THREE.Group) hoverIcon = child
                    else {
                        hoverIcon = new THREE.Group()
                        hoverIcon.add(child)
                    }
                    hoverIcon.scale.set(1.2,1.2,1.2)
                    globalGroup.add(hoverIcon)
                    toRem.push(child)
                }
                if (child) child.frustumCulled = false;
            });
            toRem.forEach((val) => { islandModel.remove(val) })
            islandModel.scale.set(1, 1, 1);
            islandModel.position.set(0, 0, 0); 
            globalGroup.add(islandModel);
            loadNext();
        }, undefined, (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    }
     // Geometry setup
     {
        const width = 400, height = 400, segmentsX = Math.floor(width / 12), segmentsY = Math.floor(height / 12);
        oceanGeo = outlineGeo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    
        // Create the material for the plane
        const material = new THREE.MeshBasicMaterial({
            color: 0x046997,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
    
        const material2 = new THREE.MeshBasicMaterial({
            wireframe: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.05
        });
    
        const material3 = new THREE.MeshBasicMaterial({
            color: 0x4a90e2, // Cool blue for the water plane
            side: THREE.DoubleSide
        });
        // Create the mesh for the plane
        oceanMesh = new THREE.Mesh(oceanGeo, material);
        oceanMesh.rotation.x = -Math.PI / 2;
        globalGroup.add(oceanMesh);
        // Create the mesh for the outline
        outlineMesh = new THREE.Mesh(outlineGeo, material2);
        outlineMesh.rotation.x = -Math.PI / 2;
        globalGroup.add(outlineMesh);
        waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material3);
        waterPlane.rotation.x = -Math.PI / 2;
        waterPlane.position.y = -0.5;
        globalGroup.add(waterPlane);

        // Adjust the vertices with noise
        updateOcean(0,0.1,0.1);
    }

    {
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
            cloud.geometry.rotateY(- Math.PI / 2);
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
            loadNext();
        }, undefined, (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    }

    {
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
            const pos = oceanGeo.attributes.position
            boatv0.set(pos.getX(bInd[0]), pos.getZ(bInd[0]), pos.getY(bInd[0]))
            boatv1.set(pos.getX(bInd[1]), pos.getZ(bInd[1]), pos.getY(bInd[1]))
            boatv2.set(pos.getX(bInd[2]), pos.getZ(bInd[2]), pos.getY(bInd[2]))
            boatP = createPlane(boatv0, boatv1, boatv2);
            loadNext();
        }, undefined,  (error) => {
            console.error('An error happened while loading the glb model', error);
        });

        gltfLoader.load(debrisModelURL, (gltf) => {
            debrisModel = gltf.scene;
            debrisModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material.map) child.material.map = pixelTex(child.material.map)
                    debrisMesh.push(child)
                }
                child.frustumCulled = false;
            });

            debrisModel.position.set(3,0,-0.8);
            debrisModel.rotation.set(0,0.8,0)
            globalGroup.add(debrisModel);
            const pos = oceanGeo.attributes.position
            debrv0.set(pos.getX(dInd[0]), pos.getZ(dInd[0]), pos.getY(dInd[0]))
            debrv1.set(pos.getX(dInd[1]), pos.getZ(dInd[1]), pos.getY(dInd[1]))
            debrv2.set(pos.getX(dInd[2]), pos.getZ(dInd[2]), pos.getY(dInd[2]))
            debrP = createPlane(debrv0, debrv1, debrv2);
            loadNext();
        }, undefined,  (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    
    }

    {
        const geo = new THREE.CircleGeometry(pOptions.size, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x555555,
            transparent: true,
            opacity: pOptions.opacity,
            side: THREE.DoubleSide,
        });
        smokeParticles = new THREE.InstancedMesh(geo, mat, pOptions.count);
        globalGroup.add(smokeParticles);

        for (let i = 0; i < pOptions.count; i++) {
            resetParticle(smokeParticles, i, true, pOptions);
        }
        smokeParticles.instanceMatrix.needsUpdate = true;
        smokeParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const fgeo = new THREE.CircleGeometry(pOptions.size, 32);
        const fmat = new THREE.MeshBasicMaterial({
            color: 0x737373,
            transparent: true,
            opacity: fOptions.opacity,
            side: THREE.DoubleSide,
        });
        fireParticles = new THREE.InstancedMesh(fgeo, fmat, fOptions.count);
        globalGroup.add(fireParticles);

        for (let i = 0; i < fOptions.count; i++) {
            resetParticle(fireParticles, i, true, fOptions);
        }
        fireParticles.instanceMatrix.needsUpdate = true;
        fireParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        osp = new THREE.BufferGeometry()
        ofp = new THREE.BufferGeometry()
        ofp.copy(fireParticles.geometry)
        osp.copy(smokeParticles.geometry)
    }

    Object.values(icoList).forEach(model => {
        model.visible = false;
        globalGroup.add(model);
    });
    animationManager();

    // Lights
    {
        setupDayLight();
    }
    
    renderHTML()
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
    const positionAttribute = oceanGeo.attributes.position;
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
    outlineGeo.setAttribute('color', new THREE.Float32BufferAttribute(dummyArr, 3));

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
    if (init) {
        dummyMat.makeRotationY(Math.PI / 2);
        dummyPos.set(
            (Math.random()-0.5)*opt.width + opt.pos.x,           
            (Math.random() * opt.maxHeight/2) + opt.pos.y,
            (Math.random()-0.5)*opt.width + opt.pos.z
        )
    }
    else {
         dummyPos.set(
        (Math.random()-0.5)*opt.width + opt.pos.x,           
        opt.pos.y,
        (Math.random()-0.5)*opt.width + opt.pos.z
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

function updateSmoke(opt: any, particles: any) {
    const sint = Math.sin(time / 500);
    const cost = Math.cos(time / 500);
    const xval = sint * opt.scale;
    const zval = cost * opt.scale;
    const sceneDiv = document.querySelector('body #scene');
    if (sceneDiv && getComputedStyle(sceneDiv).display === 'block') {
        for (let i = 0; i < opt.count; i++) {
            particles.getMatrixAt(i, dummyMat);
            dummyPos.setFromMatrixPosition(dummyMat);
            dummyPos.y += 0.01 * smokeSpeed(dummyPos.y, opt);
            dummyPos.x += xval;
            dummyPos.z += zval+smokeDrift(dummyPos.y, 0.005, opt);
            dummyMat.setPosition(dummyPos);
            if (dummyPos.y > (opt.pos.y + opt.maxHeight/3)) {
                if (Math.random() > opt.p) resetParticle(particles, i, false, opt);
                else particles.setMatrixAt(i, dummyMat);
            }
            else particles.setMatrixAt(i, dummyMat);
        }
    }
    else {
        for (let i = 0; i < opt.count; i++) resetParticle(particles, i, true, opt);
    }
    particles.instanceMatrix.needsUpdate = true;
}
// -----------------------------------------------------------------------
// BOAT
function updateBoat(time: number) {
    if (boatMesh) {
        const pos = oceanGeo.attributes.position
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
    if (debrisModel) {
        const pos = oceanGeo.attributes.position
        debrv0.setY(pos.getZ(594)), debrv1.setY(pos.getZ(561)), debrv2.setY(pos.getZ(560))
        updatePlane(debrP, debrv0, debrv1, debrv2);
        for (let i = 0; i < debrisMesh.length; i++) {
            dummyPos.copy(debrisMesh[i].position);
            dummyPos.copy(projPlane(dummyPos, debrP));
            debrisMesh[i].position.copy(dummyPos);

        }
        // dummyPos.copy(debrisModel.position);
        // dummyPos.copy(projPlane(dummyPos, debrP));
        // debrisModel.position.copy(dummyPos);
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
      window.addEventListener('touchstart', preventEvent, true);
      window.addEventListener('wheel', preventEvent, true);
    } else {
        setTimeout(()=> {
            window.removeEventListener('touchstart', preventEvent, true);
            window.removeEventListener('wheel', preventEvent, true);
        }, 100)
    }
}

function onKeyDown (event: any) {
    switch (event.code) {
        case 'KeyZ':
        case 'Escape':
            if (!anim) {
                moveUp = moveDown = moveLeft = moveRight = false;
                camReset(dZoom, false)
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
        case 'KeyH':
            if (controls.enabled) {
                hide = !hide;
                if (!hide) overlay.forEach((item: any) => { item.style.display = 'block' })
                else overlay.forEach((item: any) => { item.style.display = 'none' })
            }
            break;
        case 'KeyM':
            audOcean.muted = !audOcean.muted;
            // audJingle.muted = !audJingle.muted;
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

function onMouseClick(event: MouseEvent) {
    const iframe = document.getElementById('iframeid');
    if (document.getElementById('scene')?.style.display != "") {
        if (intersects.length > 0) {
            const ele = intersects[0];
            funcList[ele.name](ele);
        }

        if (!controls.enabled && iframe) {
            const rect = iframe.getBoundingClientRect();
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            if (
                mouseX <= rect.left ||
                mouseX >= rect.right ||
                mouseY <= rect.top ||
                mouseY >= rect.bottom
            ) {
                camReset(dZoom, false)
            } 
        }
    }
}

// refactor into two functionality, one as hovermodel and on hover effect
function placeIcon() {
    if (islandModel) {
        if (document.getElementById('scene')?.style.display != "") {
            if (hoverIcon) {
                hoverIcon.position.copy(hoverTarget.position);
                const height = oscillateValue(-0.025,0.025,3,time/3000);
                hoverIcon.position.y += height + 0.6;
                hoverIcon.rotation.y += 0.01; 
                hoverIcon.visible = true;
            }
            const child = hoverTarget.children[0] as THREE.Mesh
            const mat = child.material as THREE.MeshStandardMaterial
            const amp = 1.5
            if (intersects.length > 0) {
                const ele = intersects[0];
                if (ele) {
                    if (ele.name == hoverTarget.name) {
                        dummyColor.setRGB(hoverColor.r*amp, hoverColor.g*amp, hoverColor.b*amp)
                        mat.color.set(dummyColor)
                    } 
                    document.querySelector('html')?.classList.add('active');
                }
            } else {
                if (mat.color.r != hoverColor.r) mat.color.set(hoverColor)
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
        camReset(0.1, true)
        document.querySelector('html')?.classList.remove('active');
    }
}

function onClickCamp() {
    if (lightdark) setupDayLight();
    else setupNightLight();
    lightdark = !lightdark;
}

// code for future iframe animation
function focus(model: any) {
    model.position.set(0, 2, 0);

    const targetPosition = { 
        x: 0, 
        y: 0, 
        z: 0
    };
    
    const duration = 2000;
    const startTime = Date.now();

    function runlerp() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        model.position.y = THREE.MathUtils.lerp(camera.position.y - 10, targetPosition.y, progress);

        if (progress < 1) {
            requestAnimationFrame(runlerp);
        }
    }

    runlerp();
}

function animationManager(icon: string = "") {
    if (icon == "") return
    const model = icoList[icon];
    model.visible = true;
    focus(model);
}
// -----------------------------------------------------------------------
// CAMERA CONTROLS
const nnorm = (z: number) => (z-0.03)/(1-0.03);
const nzoom = (z: number, pow: number, disp: number) => (pow ** (1-z)-disp)/(pow-disp);
const ndrift = (val: number) => (6-1.5*val);
const nskew = (z: number, l: number, h: number) => l+(z)*(h-l);

function camReset(zlvl: any, ifAnim: boolean) {
    dummyVec.set(0,1,0);
    anim = true;
    setTimeout(()=>{controls.saveState(); anim=false; }, animTime)
    if (ifAnim) {
        overlay.forEach((item: any) => { item.style.display = 'none' })
        dummyVec.set(0,0,0);
    }
    else {
        cssHolder.visible = false;
        controls.target.set(0,1,0)
        controls.update()
    }

    new TWEEN.Tween(controls.target)
        .to(dummyVec, animTime) 
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween(camera.position)
        .to({ x: -200, y: 80, z: 0.000001 }, animTime)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween({ zoom: camera.zoom })
        .to({ zoom: zlvl }, animTime) 
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (object) {
            camera.zoom = object.zoom;
            camera.updateProjectionMatrix();
        })
        .onComplete(()=> {
            if (ifAnim) {
                cssHolder.visible = true
                toggleControls(false)
            } else {
                if (!hide) overlay.forEach((item: any) => { item.style.display = 'block' })
                if (!controls.enabled) toggleControls(!controls.enabled)
            }    
        })
        .start();
    globalGroup.rotation.set(0,0,0)
    velocity.set(0, 0, 0);
    smokeParticles.geometry.copy(osp);
    fireParticles.geometry.copy(ofp);
    smokeParticles.instanceMatrix.needsUpdate = true;
    fireParticles.instanceMatrix.needsUpdate = true;
    y_rotation = 0;
}

function onWindowResize() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    const aspect = screenResolution.x / screenResolution.y;
    let renderResolution = screenResolution.clone()
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
function renderHTML() {
    const iframe = document.createElement( 'iframe' );
    iframe.id = 'iframeid';
    iframe.style.cssText = 'width: 24em; height: 26em; border: 0; objectFit: cover';
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
    iframe.src = IFRAME_PAGE;

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

    if (controls.enabled || anim) {
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
        if (camera.position.x > cameraBounds.maxX) {
            controls.target.x = cameraBounds.maxX + 200
            camera.position.x = cameraBounds.maxX
        }
        if (camera.position.x < cameraBounds.minX) {
            controls.target.x = cameraBounds.minX + 200
            camera.position.x = cameraBounds.minX
        }
        if (camera.position.z > cameraBounds.maxZ) {
            controls.target.z = cameraBounds.maxZ
            camera.position.z = cameraBounds.maxZ
        }
        if (camera.position.z < cameraBounds.minZ) {
            controls.target.z = cameraBounds.minZ
            camera.position.z = cameraBounds.minZ
        }
        camera.position.add(velocity);
        controls.target.add(velocity);
        controls.update();

        y_rotation -= y_rotation * 10.0 * delta;
        if ( rotateLeft ) y_rotation += 1.0 * delta;
        if ( rotateRight ) y_rotation -= 1.0 * delta;
        globalGroup.rotateY(y_rotation);

        dummyMat = new THREE.Matrix4().makeRotationY(-1.0 * y_rotation);
        smokeParticles.geometry.applyMatrix4(dummyMat);
        fireParticles.geometry.applyMatrix4(dummyMat);
        smokeParticles.geometry.computeVertexNormals();
        fireParticles.geometry.computeVertexNormals();

        // object controls
        updateBoat(time);
        updateDebris();
        updateSmoke(pOptions, smokeParticles);
        updateSmoke(fOptions, fireParticles);
        updateKelp();
        mouseUpdate();

    }
    stats.update();
    TWEEN.update();
    composer.render();
    rendererCss.render( sceneCss, camera );
    requestAnimationFrame( animate )

    prevTime = time;
}
