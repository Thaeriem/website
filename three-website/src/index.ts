import * as THREE from "three"
import TWEEN from '@tweenjs/tween.js'
import * as SimplexNoise from 'simplex-noise';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { ctx } from "./rendererContext";
import { setupCamera, setupRenderers, setupComposer, renderHTML } from "./modules/render";
import { initLighting } from "./modules/lighting";
import { initInputListeners, processInput, setupControls } from "./modules/input";
import { setupParticles, updateSmoke } from "./modules/particles";
import { onClickCamp, onClickChest, onClickCat } from "./modules/utilities";
import { updateBoat, updateCat, updateClouds, updateDebris, updateKelp, updateOcean } from "./modules/animations";
import { initModels } from "./modules/models";
import { initDialog } from "./modules/dialog";

const stats:Stats = Stats();
ctx.islandModelURL = '/island.glb';
ctx.cloudModelURL = '/cloud.glb';
ctx.boatModelURL = '/boat.glb';
ctx.debrisModelURL = '/debris.glb';
ctx.catModelURL = '/cat.glb';
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
// GEOMETRIES + MESHES
ctx.cloudAmt = 10;
ctx.debrisMesh = [], ctx.kelpArr = [];
// DUMMY
ctx.dummy = new THREE.Object3D(),
ctx.dummyVec = new THREE.Vector3(),
ctx.dummyMat = new THREE.Matrix4(),
ctx.dummyPos = new THREE.Vector3(),
ctx.dummyColor = new THREE.Color(),
ctx.dummyArr = []

ctx.funcList = {
    "Chest": onClickChest,
    "Camp": onClickCamp,
    "Cat": onClickCat,
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
// STARTUP

init().then(() => {
    animate();
}).catch((error) => {
    console.error('Initialization failed:', error);
});

async function init() {
    stats.dom.style.width = '80px';
    stats.dom.style.height = '48px';
    document.body.appendChild( stats.dom );

    let screenResolution = new THREE.Vector2( window.innerWidth, window.innerHeight )
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
    setupComposer(screenResolution, renderResolution);

    setupControls();

    // Initialize all models using the new models module
    await initModels();

    // Initialize ocean animation after models are loaded
    updateOcean(0, 0.1, 0.1);

    // PARTICLES
    setupParticles();
    // LIGHTING
    initLighting();
    
    // DIALOG SYSTEM
    initDialog();
    
    renderHTML();
    initInputListeners();
}

// -----------------------------------------------------------------------
function animate() {

    ctx.time = performance.now();
    const delta = ( ctx.time - ctx.prevTime ) / 1000;

    updateOcean(ctx.time * 0.0001,0.1,0.1);
    updateClouds(delta);

    if (ctx.controls.enabled || ctx.anim) {
        processInput(delta);
        updateBoat(ctx.time);
        updateCat(ctx.time);
        updateDebris();
        updateSmoke(ctx.pOptions, ctx.smokeParticles);
        updateSmoke(ctx.fOptions, ctx.fireParticles);
        updateKelp();
    }
    stats.update();
    TWEEN.update();
    ctx.composer.render();
    ctx.rendererCss.render( ctx.sceneCss, ctx.camera );
    requestAnimationFrame( animate )

    ctx.prevTime = ctx.time;
}
