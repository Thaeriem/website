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
import { ctx } from "./rendererContext";

ctx.islandModelURL = '/island.glb?url';
ctx.cloudModelURL = '/cloud.glb?url';
ctx.boatModelURL = '/boat.glb?url';
ctx.debrisModelURL = '/debris.glb?url';
// RENDERING
ctx.prevTime = performance.now();
ctx.time = performance.now();
ctx.cameraBounds = {
    minX: -270,
    maxX: -140,
    minZ: -50,
    maxZ: 45
}
ctx.animTime = 1200;
ctx.overlay = document.querySelectorAll('.ov');
ctx.audOcean = document.getElementById('ocean') as HTMLAudioElement;
ctx.audOcean.muted = true;
// const audJingle = document.getElementById('jingle') as HTMLAudioElement;
ctx.dZoom = 0.3;
// MOUSE CONTROLS
ctx.velocity = new THREE.Vector3();
ctx.y_rotation = 0;
ctx.globalGroup = new THREE.Group();
ctx.raycaster = new THREE.Raycaster();
ctx.mouse = new THREE.Vector2(1, 1);
ctx.intersects = [];
ctx.interact = new Set();
ctx.moveUp = ctx.moveDown = ctx.moveLeft = ctx.moveRight = ctx.rotateLeft = ctx.rotateRight = ctx.hide = ctx.lightdark = ctx.anim = false; 
// LIGHTS
ctx.trgO = new THREE.Object3D();
// MODELS
// GEOMETRIES + MESHES
ctx.cloudAmt = 10;
ctx.debrisMesh = [], ctx.kelpArr = [];
// CSS OVERLAY
// DUMMY
ctx.dummy = new THREE.Object3D(),
ctx.dummyVec = new THREE.Vector3(),
ctx.dummyMat = new THREE.Matrix4(),
ctx.dummyPos = new THREE.Vector3(),
ctx.dummyColor = new THREE.Color(),
ctx.dummyArr = []

ctx.funcList = {
    "Chest": onClickChest,
    "Camp": onClickCamp
    }
ctx.icoList = {
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
ctx.pOptions = {
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
ctx.fOptions = {
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
ctx.boatv0 = new THREE.Vector3(0, 0, 0), ctx.boatv1 = new THREE.Vector3(0, 0, 0), 
ctx.boatv2 = new THREE.Vector3(0, 0, 0), ctx.debrv0 = new THREE.Vector3(0, 0, 0),
ctx.debrv1 = new THREE.Vector3(0, 0, 0), ctx.debrv2 = new THREE.Vector3(0, 0, 0)
ctx.bInd = [560, 561, 595], ctx.dInd = [560, 595, 594]
ctx.noise = SimplexNoise.createNoise2D();
ctx.colorStart = new THREE.Color("#046997"), ctx.colorEnd = new THREE.Color("#30b1ce");

// -----------------------------------------------------------------------
// SETUP
function setupCamera(screenResolution: Vector2) {
    loadNext();
    let aspectRatio = screenResolution.x / screenResolution.y
    ctx.camera = new THREE.OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0, 2000);
    ctx.camera.position.set(-200, 80, 0.000001)
    ctx.camera.zoom = ctx.dZoom
    ctx.camera.updateProjectionMatrix()
}

function setupRenderers(screenResolution: Vector2) {
    loadNext();
    ctx.renderer = new THREE.WebGLRenderer( { antialias: false } )
    ctx.renderer.toneMapping = THREE.ACESFilmicToneMapping
    ctx.renderer.toneMappingExposure = .75
    ctx.renderer.shadowMap.enabled = true
    ctx.renderer.setSize( screenResolution.x, screenResolution.y )
    ctx.renderer.debug.checkShaderErrors = false;
    ctx.renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById("scene")?.appendChild( ctx.renderer.domElement );

    ctx.rendererCss = new CSS3DRenderer();
    ctx.rendererCss.setSize( screenResolution.x, screenResolution.y )
    ctx.rendererCss.domElement.style.position = 'absolute';
    ctx.rendererCss.domElement.style.top = "0";
    document.getElementById("scene")?.appendChild( ctx.rendererCss.domElement );
}

function setupControls() {
    loadNext();
    ctx.controls = new MapControls( ctx.camera, ctx.rendererCss.domElement )
    ctx.controls.target.set( 0, 1, 0 )
    ctx.controls.maxZoom = 1
    ctx.controls.minZoom = 0.03
    ctx.controls.zoomSpeed = 2
    ctx.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.DOLLY 
    }
    ctx.controls.update()
}

function setupDayLight() {
    ctx.globalGroup.remove(ctx.ambL);
    ctx.globalGroup.remove(ctx.dirL);
    ctx.globalGroup.remove(ctx.sptL);
    ctx.globalGroup.remove(ctx.trgO);
    ctx.globalGroup.remove(ctx.pntL);
    ctx.globalGroup.remove(ctx.hmiL);
    // LIGHTS
    ctx.ambL = new THREE.AmbientLight(0x2d3645, 8);
    ctx.dirL = new THREE.DirectionalLight(0xff6900, 4.5)
    ctx.dirL.position.set(-200, 80, -1000);
    ctx.dirL.castShadow = true;
    ctx.dirL.shadow.mapSize.set(4000, 4000);
    ctx.sptL = new THREE.SpotLight(0xffffff);
    ctx.sptL.position.set(0, 300, 0);
    ctx.sptL.angle = Math.PI / 6; 
    ctx.sptL.penumbra = 0.1; 
    ctx.sptL.decay = 1;
    ctx.sptL.distance = 400;
    ctx.trgO.position.set(0, 0, 0);
    ctx.sptL.target = ctx.trgO;
    ctx.pntL = new THREE.PointLight(0x7d5ba6, 0, 300);
    ctx.pntL.position.set(100, 150, -50);
    ctx.hmiL = new THREE.HemisphereLight(0x003366, 0x1a1a2e, 0);
    ctx.globalGroup.add(ctx.ambL);
    ctx.globalGroup.add(ctx.dirL);
    ctx.globalGroup.add(ctx.sptL);
    ctx.globalGroup.add(ctx.trgO);
    ctx.globalGroup.add(ctx.pntL);
    ctx.globalGroup.add(ctx.hmiL);
    // OCEAN
    const mat = (ctx.oceanMesh.material as THREE.MeshBasicMaterial)
    mat.color.set(0x046997)
    const mat2 = (ctx.outlineMesh.material as THREE.MeshBasicMaterial)
    mat2.opacity = 0.03

}

function setupNightLight() {
    ctx.globalGroup.remove(ctx.ambL);
    ctx.globalGroup.remove(ctx.dirL);
    ctx.globalGroup.remove(ctx.sptL);
    ctx.globalGroup.remove(ctx.trgO);
    ctx.globalGroup.remove(ctx.pntL);
    ctx.globalGroup.remove(ctx.hmiL);
    ctx.ambL = new THREE.AmbientLight(0x1a2b3c, 2)
    ctx.dirL = new THREE.DirectionalLight(0x8a47ff, 2);
    ctx.dirL.position.set(-200, 80, -1000);
    ctx.dirL.castShadow = true;
    ctx.dirL.shadow.mapSize.set(4000, 4000);
    ctx.sptL = new THREE.SpotLight(0x4a90e2, 0.5);
    ctx.sptL.position.set(50, 200, 100);
    ctx.sptL.angle = Math.PI / 4;
    ctx.sptL.penumbra = 0.3;
    ctx.sptL.decay = 1.2;
    ctx.sptL.distance = 500;
    ctx.trgO.position.set(0, 50, 0);
    ctx.sptL.target = ctx.trgO;
    ctx.pntL = new THREE.PointLight(0x7d5ba6, 1.8, 300);
    ctx.pntL.position.set(100, 150, -50);
    ctx.hmiL = new THREE.HemisphereLight(0x003366, 0x1a1a2e, 0.5);
    ctx.globalGroup.add(ctx.ambL);
    ctx.globalGroup.add(ctx.dirL);
    ctx.globalGroup.add(ctx.sptL);
    ctx.globalGroup.add(ctx.trgO);
    ctx.globalGroup.add(ctx.pntL);
    ctx.globalGroup.add(ctx.hmiL);
    // OCEAN
    const mat = (ctx.oceanMesh.material as THREE.MeshBasicMaterial)
    mat.color.set(0x1a2b3c)
    const mat2 = (ctx.outlineMesh.material as THREE.MeshBasicMaterial)
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

    ctx.scene = new THREE.Scene()
    ctx.scene.background = new THREE.Color( 0x151729 )
    ctx.scene.add(ctx.globalGroup);
    ctx.sceneCss = new THREE.Scene();
    ctx.sceneCss.scale.set(0.05, 0.05, 0.05);

    setupRenderers(screenResolution);

    ctx.composer = new EffectComposer( ctx.renderer )
    ctx.composer.addPass( new RenderPass( ctx.scene, ctx.camera ) )
    ctx.pixelPass = new RenderPixelatedPass( renderResolution, ctx.scene, ctx.camera );
    ctx.composer.addPass( ctx.pixelPass )
    const bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    ctx.composer.addPass(bloomPass)
    

    setupControls();

    loadNext();
    const gltfLoader = new GLTFLoader()

    {
        gltfLoader.load(ctx.islandModelURL, (gltf) => {
            ctx.islandModel = gltf.scene;
            let toRem:THREE.Object3D[] = []
            ctx.islandModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.name.slice(0,4) == "Kelp") {
                        const ind = parseInt(child.name.slice(4)) - 1
                        const kelp = ctx.islandModel.getObjectByName(child.name) as THREE.Mesh
                        const instMesh = new THREE.InstancedMesh(kelp.geometry, kelp.material, kelpPos[ind].length);
                        ctx.globalGroup.add(instMesh)
                        for (let i = 0; i < kelpPos[ind].length*3; i+= 3) {
                            ctx.dummyPos.set(kelpPos[ind][i], kelpPos[ind][i+1], kelpPos[ind][i+2]);
                            ctx.dummyMat.setPosition(ctx.dummyPos);
                            instMesh.setMatrixAt(i, ctx.dummyMat);
                        }
                        instMesh.instanceMatrix.needsUpdate = true;
                        instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                        ctx.kelpArr.push(instMesh)
                        toRem.push(child)
                        instMesh.scale.set(0.4,0.4,0.4);

                    }
                    if (child.name.slice(0,5) == "Chest" && !ctx.interact.has(child.parent)) {
                        ctx.interact.add(child.parent)
                        ctx.hoverTarget = child.parent as THREE.Object3D
                        ctx.hoverColor = (child.material as THREE.MeshStandardMaterial).color.clone()
                    }
                    if (child.name.slice(0,4) == "Camp" && !ctx.interact.has(child.parent)) {
                        ctx.interact.add(child.parent)
                    }
                }
                if (child.name == "Icon") {
                    if (child instanceof THREE.Group) ctx.hoverIcon = child
                    else {
                        ctx.hoverIcon = new THREE.Group()
                        ctx.hoverIcon.add(child)
                    }
                    ctx.hoverIcon.scale.set(1.2,1.2,1.2)
                    ctx.globalGroup.add(ctx.hoverIcon)
                    toRem.push(child)
                }
                if (child) child.frustumCulled = false;
            });
            toRem.forEach((val) => { ctx.islandModel.remove(val) })
            ctx.islandModel.scale.set(1, 1, 1);
            ctx.islandModel.position.set(0, 0, 0); 
            ctx.globalGroup.add(ctx.islandModel);
            loadNext();
        }, undefined, (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    }
     // Geometry setup
     {
        const width = 400, height = 400, segmentsX = Math.floor(width / 12), segmentsY = Math.floor(height / 12);
        ctx.oceanGeo = ctx.outlineGeo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    
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
        ctx.oceanMesh = new THREE.Mesh(ctx.oceanGeo, material);
        ctx.oceanMesh.rotation.x = -Math.PI / 2;
        ctx.globalGroup.add(ctx.oceanMesh);
        // Create the mesh for the outline
        ctx.outlineMesh = new THREE.Mesh(ctx.outlineGeo, material2);
        ctx.outlineMesh.rotation.x = -Math.PI / 2;
        ctx.globalGroup.add(ctx.outlineMesh);
        ctx.waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material3);
        ctx.waterPlane.rotation.x = -Math.PI / 2;
        ctx.waterPlane.position.y = -0.5;
        ctx.globalGroup.add(ctx.waterPlane);

        // Adjust the vertices with noise
        updateOcean(0,0.1,0.1);
    }

    {
        gltfLoader.load(ctx.cloudModelURL, (gltf) => {
            ctx.cloudModel = gltf.scene;
            ctx.cloudModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                child.frustumCulled = false;
            });
            // Create InstancedMesh
            const cloud = ctx.cloudModel.getObjectByName('Cloud') as THREE.Mesh
            ctx.cloudMat = cloud.material as THREE.Material
            ctx.cloudMat.transparent = true;
            ctx.cloudMat.opacity = 0.65;
            cloud.geometry.rotateY(- Math.PI / 2);
            ctx.cloudMesh = new THREE.InstancedMesh(cloud.geometry, cloud.material, ctx.cloudAmt);
            ctx.cloudMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            for (let i = 0; i < ctx.cloudAmt; i++) {
                ctx.dummyPos.set(Math.floor(Math.random() * 400), Math.floor(Math.random() * 50-25), 10)
                ctx.dummyMat.setPosition(ctx.dummyPos);
                ctx.cloudMesh.setMatrixAt(i, ctx.dummyMat);
            }
            ctx.cloudMesh.rotation.x = -Math.PI / 2;
            ctx.cloudMesh.rotation.z = 15*Math.PI/11;
            ctx.cloudMesh.instanceMatrix.needsUpdate = true;
            ctx.globalGroup.add(ctx.cloudMesh);
            loadNext();
        }, undefined, (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    }

    {
        gltfLoader.load(ctx.boatModelURL, (gltf) => {
            ctx.boatModel = gltf.scene;
            ctx.boatModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                child.frustumCulled = false;
            });
            const boat = ctx.boatModel.getObjectByName('Boat') as THREE.Mesh
            ctx.boatMesh = new THREE.Mesh(boat.geometry, boat.material);
            ctx.boatMesh.scale.set(0.3,0.3,0.3);
            ctx.boatMesh.position.set(-1,0,3.5);
            ctx.boatMesh.rotation.set(0,-0.8,0)
            ctx.globalGroup.add(ctx.boatMesh);
            const pos = ctx.oceanGeo.attributes.position
            ctx.boatv0.set(pos.getX(ctx.bInd[0]), pos.getZ(ctx.bInd[0]), pos.getY(ctx.bInd[0]))
            ctx.boatv1.set(pos.getX(ctx.bInd[1]), pos.getZ(ctx.bInd[1]), pos.getY(ctx.bInd[1]))
            ctx.boatv2.set(pos.getX(ctx.bInd[2]), pos.getZ(ctx.bInd[2]), pos.getY(ctx.bInd[2]))
            ctx.boatP = createPlane(ctx.boatv0, ctx.boatv1, ctx.boatv2);
            loadNext();
        }, undefined,  (error) => {
            console.error('An error happened while loading the glb model', error);
        });

        gltfLoader.load(ctx.debrisModelURL, (gltf) => {
            ctx.debrisModel = gltf.scene;
            ctx.debrisModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material.map) child.material.map = pixelTex(child.material.map)
                    ctx.debrisMesh.push(child)
                }
                child.frustumCulled = false;
            });

            ctx.debrisModel.position.set(3,0,-0.8);
            ctx.debrisModel.rotation.set(0,0.8,0)
            ctx.globalGroup.add(ctx.debrisModel);
            const pos = ctx.oceanGeo.attributes.position
            ctx.debrv0.set(pos.getX(ctx.dInd[0]), pos.getZ(ctx.dInd[0]), pos.getY(ctx.dInd[0]))
            ctx.debrv1.set(pos.getX(ctx.dInd[1]), pos.getZ(ctx.dInd[1]), pos.getY(ctx.dInd[1]))
            ctx.debrv2.set(pos.getX(ctx.dInd[2]), pos.getZ(ctx.dInd[2]), pos.getY(ctx.dInd[2]))
            ctx.debrP = createPlane(ctx.debrv0, ctx.debrv1, ctx.debrv2);
            loadNext();
        }, undefined,  (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    
    }

    {
        const geo = new THREE.CircleGeometry(ctx.pOptions.size, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x555555,
            transparent: true,
            opacity: ctx.pOptions.opacity,
            side: THREE.DoubleSide,
        });
        ctx.smokeParticles = new THREE.InstancedMesh(geo, mat, ctx.pOptions.count);
        ctx.globalGroup.add(ctx.smokeParticles);

        for (let i = 0; i < ctx.pOptions.count; i++) {
            resetParticle(ctx.smokeParticles, i, true, ctx.pOptions);
        }
        ctx.smokeParticles.instanceMatrix.needsUpdate = true;
        ctx.smokeParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const fgeo = new THREE.CircleGeometry(ctx.pOptions.size, 32);
        const fmat = new THREE.MeshBasicMaterial({
            color: 0x737373,
            transparent: true,
            opacity: ctx.fOptions.opacity,
            side: THREE.DoubleSide,
        });
        ctx.fireParticles = new THREE.InstancedMesh(fgeo, fmat, ctx.fOptions.count);
        ctx.globalGroup.add(ctx.fireParticles);

        for (let i = 0; i < ctx.fOptions.count; i++) {
            resetParticle(ctx.fireParticles, i, true, ctx.fOptions);
        }
        ctx.fireParticles.instanceMatrix.needsUpdate = true;
        ctx.fireParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        ctx.osp = new THREE.BufferGeometry()
        ctx.ofp = new THREE.BufferGeometry()
        ctx.ofp.copy(ctx.fireParticles.geometry)
        ctx.osp.copy(ctx.smokeParticles.geometry)
    }

    Object.values(ctx.icoList).forEach(model => {
        model.visible = false;
        ctx.globalGroup.add(model);
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
    const positionAttribute = ctx.oceanGeo.attributes.position;
    ctx.dummyArr = [];
    let z = 0, zNorm = 0;

    for (let i = 0; i < positionAttribute.count; i++) {
        z = ctx.noise(positionAttribute.getX(i) * scale + time, 
                        positionAttribute.getY(i) * scale + time) 
                  * amplitude + 0.5;
        positionAttribute.setZ(i, z);
        
        zNorm = (z + 0.2) / 0.4;

        ctx.dummyColor.lerpColors(ctx.colorStart, ctx.colorEnd, zNorm);
        ctx.dummyArr.push(ctx.dummyColor.r, ctx.dummyColor.g, ctx.dummyColor.b)
    }
    positionAttribute.needsUpdate = true;
    ctx.outlineGeo.setAttribute('color', new THREE.Float32BufferAttribute(ctx.dummyArr, 3));

}
// -----------------------------------------------------------------------
// Clouds
function updateClouds(delta: number) {
    if (ctx.cloudMesh) {
        if (ctx.camera.zoom > 0.15) {
            if (ctx.camera.zoom > 0.28) ctx.cloudMesh.visible = false
            ctx.cloudMat.opacity = 0.2;
        }
        else {
            if (!ctx.cloudMesh.visible) ctx.cloudMesh.visible = true
            ctx.cloudMat.opacity = 0.65
        }
        for (let i = 0; i < ctx.cloudAmt; i++) {
            ctx.cloudMesh.getMatrixAt(i, ctx.dummyMat);
            ctx.dummyPos.setFromMatrixPosition(ctx.dummyMat);
            ctx.dummyPos.x += delta * 10
            if (ctx.dummyPos.x > 200) ctx.dummyPos.x -= 400;
            ctx.dummyMat.setPosition(ctx.dummyPos);
            ctx.cloudMesh.setMatrixAt(i, ctx.dummyMat);
        }
        if (ctx.cloudMesh.visible) ctx.cloudMesh.instanceMatrix.needsUpdate = true;
    }
}
// -----------------------------------------------------------------------
// Smoke
function resetParticle(mesh: THREE.InstancedMesh, index: number, init: boolean, opt: any) {
    if (init) {
        ctx.dummyMat.makeRotationY(Math.PI / 2);
        ctx.dummyPos.set(
            (Math.random()-0.5)*opt.width + opt.pos.x,           
            (Math.random() * opt.maxHeight/2) + opt.pos.y,
            (Math.random()-0.5)*opt.width + opt.pos.z
        )
    }
    else {
         ctx.dummyPos.set(
        (Math.random()-0.5)*opt.width + opt.pos.x,           
        opt.pos.y,
        (Math.random()-0.5)*opt.width + opt.pos.z
        )
    }
    ctx.dummyMat.setPosition(ctx.dummyPos)
    mesh.setMatrixAt(index, ctx.dummyMat);
    mesh.instanceMatrix.needsUpdate = true;
}

function smokeSpeed(y: number, opt: any): number {
    return Math.log(y - opt.pos.y + 2);
}
function smokeDrift(y: number, d: number, opt: any): number {
    return d*Math.log(y - opt.pos.y + 1);
}

function updateSmoke(opt: any, particles: any) {
    const sint = Math.sin(ctx.time / 500);
    const cost = Math.cos(ctx.time / 500);
    const xval = sint * opt.scale;
    const zval = cost * opt.scale;
    const sceneDiv = document.querySelector('body #scene');
    if (sceneDiv && getComputedStyle(sceneDiv).display === 'block') {
        for (let i = 0; i < opt.count; i++) {
            particles.getMatrixAt(i, ctx.dummyMat);
            ctx.dummyPos.setFromMatrixPosition(ctx.dummyMat);
            ctx.dummyPos.y += 0.01 * smokeSpeed(ctx.dummyPos.y, opt);
            ctx.dummyPos.x += xval;
            ctx.dummyPos.z += zval+smokeDrift(ctx.dummyPos.y, 0.005, opt);
            ctx.dummyMat.setPosition(ctx.dummyPos);
            if (ctx.dummyPos.y > (opt.pos.y + opt.maxHeight/3)) {
                if (Math.random() > opt.p) resetParticle(particles, i, false, opt);
                else particles.setMatrixAt(i, ctx.dummyMat);
            }
            else particles.setMatrixAt(i, ctx.dummyMat);
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
    if (ctx.boatMesh) {
        const pos = ctx.oceanGeo.attributes.position
        ctx.boatv0.setY(pos.getZ(594)), ctx.boatv1.setY(pos.getZ(595)), ctx.boatv2.setY(pos.getZ(560))
        updatePlane(ctx.boatP, ctx.boatv0, ctx.boatv1, ctx.boatv2);
        ctx.dummyPos.copy(ctx.boatMesh.position);
        ctx.dummyPos.copy(projPlane(ctx.dummyPos, ctx.boatP));
        ctx.boatMesh.position.copy(ctx.dummyPos);
        const angle = oscillateValue(-0.2,0.2,1,time/3000);
        ctx.boatMesh.rotation.z = angle
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
    if (ctx.debrisModel) {
        const pos = ctx.oceanGeo.attributes.position
        ctx.debrv0.setY(pos.getZ(594)), ctx.debrv1.setY(pos.getZ(561)), ctx.debrv2.setY(pos.getZ(560))
        updatePlane(ctx.debrP, ctx.debrv0, ctx.debrv1, ctx.debrv2);
        for (let i = 0; i < ctx.debrisMesh.length; i++) {
            ctx.dummyPos.copy(ctx.debrisMesh[i].position);
            ctx.dummyPos.copy(projPlane(ctx.dummyPos, ctx.debrP));
            ctx.debrisMesh[i].position.copy(ctx.dummyPos);

        }
        // ctx.dummyPos.copy(ctx.debrisModel.position);
        // ctx.dummyPos.copy(projPlane(ctx.dummyPos, ctx.debrP));
        // ctx.debrisModel.position.copy(ctx.dummyPos);
    }   
}
// -----------------------------------------------------------------------
// KELP
function updateKelp() {
    if (ctx.islandModel) {
        const height = (ctx.debrv0.y + ctx.debrv1.y + ctx.debrv2.y)/3
        const hnorm = (((height - 0.25) / (0.55 - 0.25)) - 0.5)
        for (let i = 0; i < ctx.kelpArr.length; i++) {
            for (let j = 0; j < ctx.kelpArr[i].count; j++) {
                ctx.kelpArr[i].getMatrixAt(j, ctx.dummyMat);
                ctx.dummyMat.decompose(ctx.dummy.position,ctx.dummy.quaternion,ctx.dummy.scale);
                ctx.dummy.rotation.z = 0.2*(hnorm)+Math.PI
                ctx.dummy.rotation.x = 0.5*(hnorm)+Math.PI
                ctx.dummy.updateMatrix()
                ctx.kelpArr[i].setMatrixAt(j, ctx.dummy.matrix);
                ctx.kelpArr[i].instanceMatrix.needsUpdate = true;
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
    ctx.controls.enabled = enable;
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
            if (!ctx.anim) {
                ctx.moveUp = ctx.moveDown = ctx.moveLeft = ctx.moveRight = false;
                camReset(ctx.dZoom, false)
            }
            break;
        case 'KeyW':
        case 'ArrowUp':
            if (ctx.controls.enabled) ctx.moveUp = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            if (ctx.controls.enabled) ctx.moveDown = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            if (ctx.controls.enabled) ctx.moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            if (ctx.controls.enabled) ctx.moveRight = true;
            break;
        case 'KeyE':
        case 'Period':
            if (ctx.controls.enabled) ctx.rotateRight = true;
            break;
        case 'KeyQ':
        case 'Comma':
            if (ctx.controls.enabled) ctx.rotateLeft = true;
            break;
        case 'KeyH':
            if (ctx.controls.enabled) {
                ctx.hide = !ctx.hide;
                if (!ctx.hide) ctx.overlay.forEach((item: any) => { item.style.display = 'block' })
                else ctx.overlay.forEach((item: any) => { item.style.display = 'none' })
            }
            break;
        case 'KeyM':
            ctx.audOcean.muted = !ctx.audOcean.muted;
            // audJingle.muted = !audJingle.muted;
            break;
    }
};

function onKeyUp (event: any) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            ctx.moveUp = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            ctx.moveDown = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            ctx.moveLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            ctx.moveRight = false;
            break;
        case 'KeyE':
        case 'Period':
            ctx.rotateRight = false;
            break;
        case 'KeyQ':
        case 'Comma':
            ctx.rotateLeft = false;
            break;
    }
};

function onMouseMove(event: any) {
    ctx.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    ctx.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick(event: MouseEvent) {
    const iframe = document.getElementById('iframeid');
    if (document.getElementById('scene')?.style.display != "") {
        if (ctx.intersects.length > 0) {
            const ele = ctx.intersects[0];
            ctx.funcList[ele.name](ele);
        }

        if (!ctx.controls.enabled && iframe) {
            const rect = iframe.getBoundingClientRect();
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            if (
                mouseX <= rect.left ||
                mouseX >= rect.right ||
                mouseY <= rect.top ||
                mouseY >= rect.bottom
            ) {
                camReset(ctx.dZoom, false)
            } 
        }
    }
}

// refactor into two functionality, one as hovermodel and on hover effect
function placeIcon() {
    if (ctx.islandModel) {
        if (document.getElementById('scene')?.style.display != "") {
            if (ctx.hoverIcon) {
                ctx.hoverIcon.position.copy(ctx.hoverTarget.position);
                const height = oscillateValue(-0.025,0.025,3,ctx.time/3000);
                ctx.hoverIcon.position.y += height + 0.6;
                ctx.hoverIcon.rotation.y += 0.01; 
                ctx.hoverIcon.visible = true;
            }
            const child = ctx.hoverTarget.children[0] as THREE.Mesh
            const mat = child.material as THREE.MeshStandardMaterial
            const amp = 1.5
            if (ctx.intersects.length > 0) {
                const ele = ctx.intersects[0];
                if (ele) {
                    if (ele.name == ctx.hoverTarget.name) {
                        ctx.dummyColor.setRGB(ctx.hoverColor.r*amp, ctx.hoverColor.g*amp, ctx.hoverColor.b*amp)
                        mat.color.set(ctx.dummyColor)
                    } 
                    document.querySelector('html')?.classList.add('active');
                }
            } else {
                if (mat.color.r != ctx.hoverColor.r) mat.color.set(ctx.hoverColor)
                document.querySelector('html')?.classList.remove('active');
            }
        }
    }
}

function mouseUpdate() {
    ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
    ctx.intersects = []
    ctx.interact.forEach((val) => {
        const tmp = ctx.raycaster.intersectObject(val)
        tmp.forEach((val)=> { 
            if (val.object.parent?.name != "") ctx.intersects.push(val.object.parent)
            else ctx.intersects.push(val.object) 
        })
    })
    placeIcon()
}
// -----------------------------------------------------------------------
// INTERACTIONS

function onClickChest() {
    if (!ctx.anim) {
        camReset(0.1, true)
        document.querySelector('html')?.classList.remove('active');
    }
}

function onClickCamp() {
    if (ctx.lightdark) setupDayLight();
    else setupNightLight();
    ctx.lightdark = !ctx.lightdark;
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

        model.position.y = THREE.MathUtils.lerp(ctx.camera.position.y - 10, targetPosition.y, progress);

        if (progress < 1) {
            requestAnimationFrame(runlerp);
        }
    }

    runlerp();
}

function animationManager(icon: string = "") {
    if (icon == "") return
    const model = ctx.icoList[icon];
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
    ctx.dummyVec.set(0,1,0);
    ctx.anim = true;
    setTimeout(()=>{ctx.controls.saveState(); ctx.anim=false; }, ctx.animTime)
    if (ifAnim) {
        ctx.overlay.forEach((item: any) => { item.style.display = 'none' })
        ctx.dummyVec.set(0,0,0);
    }
    else {
        ctx.cssHolder.visible = false;
        ctx.controls.target.set(0,1,0)
        ctx.controls.update()
    }

    new TWEEN.Tween(ctx.controls.target)
        .to(ctx.dummyVec, ctx.animTime) 
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween(ctx.camera.position)
        .to({ x: -200, y: 80, z: 0.000001 }, ctx.animTime)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween({ zoom: ctx.camera.zoom })
        .to({ zoom: zlvl }, ctx.animTime) 
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (object) {
            ctx.camera.zoom = object.zoom;
            ctx.camera.updateProjectionMatrix();
        })
        .onComplete(()=> {
            if (ifAnim) {
                ctx.cssHolder.visible = true
                toggleControls(false)
            } else {
                if (!ctx.hide) ctx.overlay.forEach((item: any) => { item.style.display = 'block' })
                if (!ctx.controls.enabled) toggleControls(!ctx.controls.enabled)
            }    
        })
        .start();
    ctx.globalGroup.rotation.set(0,0,0)
    ctx.velocity.set(0, 0, 0);
    ctx.smokeParticles.geometry.copy(ctx.osp);
    ctx.fireParticles.geometry.copy(ctx.ofp);
    ctx.smokeParticles.instanceMatrix.needsUpdate = true;
    ctx.fireParticles.instanceMatrix.needsUpdate = true;
    ctx.y_rotation = 0;
}

function onWindowResize() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    const aspect = screenResolution.x / screenResolution.y;
    let renderResolution = screenResolution.clone()
    renderResolution.x |= 0
    renderResolution.y |= 0

    ctx.camera.left = -aspect;
    ctx.camera.right = aspect;
    ctx.camera.top = 1;
    ctx.camera.bottom = -1;
    ctx.pixelPass.resolution = renderResolution
    ctx.camera.updateProjectionMatrix();

    ctx.renderer.setSize( screenResolution.x, screenResolution.y );

    ctx.rendererCss.setSize( screenResolution.x, screenResolution.y );
}
// -----------------------------------------------------------------------
// HTML Render
function renderHTML() {
    const iframe = document.createElement( 'iframe' );
    iframe.id = 'iframeid';
    iframe.style.cssText = 'width: 24em; height: 26em; border: 0; objectFit: cover';
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
    iframe.src = IFRAME_PAGE;

    ctx.cssHolder = new CSS3DObject(iframe);
    ctx.cssHolder.frustumCulled = false;
    ctx.cssHolder.position.set(0, 0, 0);
    ctx.cssHolder.rotation.set(0,Math.PI/2, 0);
    ctx.cssHolder.visible = false
    ctx.sceneCss.add(ctx.cssHolder);
    ctx.sceneCss.rotateY(Math.PI)
}
// -----------------------------------------------------------------------
animate()
function animate() {

    ctx.time = performance.now();
    const delta = ( ctx.time - ctx.prevTime ) / 1000;

    updateOcean(ctx.time * 0.0001,0.1,0.1);
    updateClouds(delta);

    if (ctx.controls.enabled || ctx.anim) {
        const newZoom = nnorm(ctx.camera.zoom)
        const coef = nzoom(newZoom, 200, 0.99);
        

        ctx.velocity.z -= ctx.velocity.z * ndrift(coef) * delta;
        ctx.velocity.x -= ctx.velocity.x * ndrift(coef) * delta;
        if ( ctx.moveUp ) ctx.velocity.x += nskew(coef, 1.5,10) * delta;
        if ( ctx.moveDown )  ctx.velocity.x -= nskew(coef, 1.5,10) * delta;
        if ( ctx.moveLeft ) ctx.velocity.z -= nskew(coef, 0.75,5) * delta;
        if ( ctx.moveRight ) ctx.velocity.z += nskew(coef, 0.75,5) * delta;
        
        const new_x = ctx.camera.position.x + ctx.velocity.x, new_z = ctx.camera.position.z + ctx.velocity.z;
        if (new_x > ctx.cameraBounds.maxX) ctx.velocity.x = 0;
        if (new_x < ctx.cameraBounds.minX) ctx.velocity.x = 0;
        if (new_z > ctx.cameraBounds.maxZ) ctx.velocity.z = 0;
        if (new_z < ctx.cameraBounds.minZ) ctx.velocity.z = 0;
        if (ctx.camera.position.x > ctx.cameraBounds.maxX) {
            ctx.controls.target.x = ctx.cameraBounds.maxX + 200
            ctx.camera.position.x = ctx.cameraBounds.maxX
        }
        if (ctx.camera.position.x < ctx.cameraBounds.minX) {
            ctx.controls.target.x = ctx.cameraBounds.minX + 200
            ctx.camera.position.x = ctx.cameraBounds.minX
        }
        if (ctx.camera.position.z > ctx.cameraBounds.maxZ) {
            ctx.controls.target.z = ctx.cameraBounds.maxZ
            ctx.camera.position.z = ctx.cameraBounds.maxZ
        }
        if (ctx.camera.position.z < ctx.cameraBounds.minZ) {
            ctx.controls.target.z = ctx.cameraBounds.minZ
            ctx.camera.position.z = ctx.cameraBounds.minZ
        }
        ctx.camera.position.add(ctx.velocity);
        ctx.controls.target.add(ctx.velocity);
        ctx.controls.update();

        ctx.y_rotation -= ctx.y_rotation * 10.0 * delta;
        if ( ctx.rotateLeft ) ctx.y_rotation += 1.0 * delta;
        if ( ctx.rotateRight ) ctx.y_rotation -= 1.0 * delta;
        ctx.globalGroup.rotateY(ctx.y_rotation);

        ctx.dummyMat = new THREE.Matrix4().makeRotationY(-1.0 * ctx.y_rotation);
        ctx.smokeParticles.geometry.applyMatrix4(ctx.dummyMat);
        ctx.fireParticles.geometry.applyMatrix4(ctx.dummyMat);
        ctx.smokeParticles.geometry.computeVertexNormals();
        ctx.fireParticles.geometry.computeVertexNormals();

        // object ctx.controls
        updateBoat(ctx.time);
        updateDebris();
        updateSmoke(ctx.pOptions, ctx.smokeParticles);
        updateSmoke(ctx.fOptions, ctx.fireParticles);
        updateKelp();
        mouseUpdate();

    }
    stats.update();
    TWEEN.update();
    ctx.composer.render();
    ctx.rendererCss.render( ctx.sceneCss, ctx.camera );
    requestAnimationFrame( animate )

    ctx.prevTime = ctx.time;
}
