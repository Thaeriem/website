import * as THREE from "three"
import TWEEN from '@tweenjs/tween.js'
import * as SimplexNoise from 'simplex-noise';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { ctx } from "./rendererContext";
import { setupCamera, setupRenderers, setupComposer, renderHTML } from "./modules/render";
import { initLighting } from "./modules/lighting";
import { initInputListeners, processInput, setupControls } from "./modules/input";
import { setupParticles, updateSmoke } from "./modules/particles";
import { onClickCamp, onClickChest, onClickYash } from "./modules/utilities";
import { updateBoat, updateCat, updateClouds, updateDebris, updateKelp, updateOcean } from "./modules/animations";
import { initModels } from "./modules/models";
import { initDialog, updateDialogPosition } from "./modules/dialog";
import { initInnerExperience, isInnerExperienceOpen } from "./modules/innerExperience";

type BloomModeSettings = {
    scale: number;
    strength: number;
    radius: number;
    threshold: number;
};

const LOW_BLOOM_SETTINGS: BloomModeSettings = {
    scale: 0.25,
    strength: 0.22,
    radius: 0.04,
    threshold: 0.92
};

ctx.stats = Stats();
ctx.islandModelURL = '/island.glb';
ctx.cloudModelURL = '/cloud.glb';
ctx.boatModelURL = '/boat.glb';
ctx.debrisModelURL = '/debris.glb';
ctx.yashModelURL = '/yash.glb';
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
// const audJingle = document.getElementById('jingle') as HTMLAudioElement;
ctx.dZoom = 0.3;
ctx.globalGroup = new THREE.Group();
ctx.animateOcean = true;
ctx.renderCss = true;
ctx.shadowsEnabled = !window.matchMedia("(pointer: coarse)").matches;
// MOUSE CONTROLS
ctx.raycaster = new THREE.Raycaster();
ctx.mouse = new THREE.Vector2(1, 1);
ctx.intersects = [];
ctx.interact = new Set();
ctx.hide = ctx.lightdark = ctx.anim = false; 
ctx.isIframeOpen = false;
// LIGHTS
ctx.trgO = new THREE.Object3D();
// GEOMETRIES + MESHES
ctx.cloudAmt = 10;
ctx.debrisMesh = [], ctx.kelpArr = [];
// DUMMY
ctx.dummy = new THREE.Object3D(),
ctx.dummyMat = new THREE.Matrix4(),
ctx.dummyPos = new THREE.Vector3(),
ctx.dummyColor = new THREE.Color(),
ctx.dummyArr = []

ctx.funcList = {
    "Chest-Base": onClickChest,
    "Chest-Top": onClickChest,
    "Camp": onClickCamp,
    "Yash": onClickYash,
}
ctx.hoverTarget = [];
ctx.hoverColor = [];
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
    ctx.stats.dom.style.width = '80px';
    ctx.stats.dom.style.height = '48px';
    ctx.stats.dom.style.zIndex = '2000';
    ctx.stats.dom.style.pointerEvents = 'none';
    document.body.appendChild( ctx.stats.dom );
    ctx.stats.domElement.style.display = 'block';

    let screenResolution = new THREE.Vector2( window.innerWidth, window.innerHeight )
    setupCamera(screenResolution);

    ctx.scene = new THREE.Scene()
    ctx.scene.background = new THREE.Color( 0x151729 )
    ctx.scene.add(ctx.globalGroup);
    ctx.sceneCss = new THREE.Scene();
    ctx.sceneCss.scale.set(0.05, 0.05, 0.05);

    setupRenderers(screenResolution);
    setupComposer(screenResolution);
    applyLowBloom();
    window.addEventListener("resize", applyLowBloom);
    ctx.renderer.shadowMap.enabled = ctx.shadowsEnabled;

    setupControls();

    // Initialize all models using the new models module
    await initModels();

    // Initialize ocean animation after models are loaded
    updateOcean(0, 0.1, 0.1);

    // PARTICLES
    setupParticles();
    // LIGHTING
    initLighting();
    setSceneShadows(ctx.shadowsEnabled);

    initDialog();
    initInnerExperience();
    
    renderHTML();
    initFpsToggle();
    initInputListeners();
}

// -----------------------------------------------------------------------
function animate() {

    ctx.time = performance.now();
    const delta = ( ctx.time - ctx.prevTime ) / 1000;
    const innerExperienceOpen = isInnerExperienceOpen();

    if (innerExperienceOpen) {
        ctx.stats.update();
        requestAnimationFrame(animate);
        ctx.prevTime = ctx.time;
        return;
    }

    if (ctx.animateOcean) {
        updateOcean(ctx.time * 0.0001,0.1,0.1);
    }
    updateClouds(delta);

    const shouldUpdateWorld = ctx.controls.enabled || ctx.anim;

    if (shouldUpdateWorld) {
        processInput(delta);
        updateBoat(ctx.time);
        updateCat(ctx.time);
        updateDebris();
        updateSmoke(ctx.pOptions, ctx.smokeParticles);
        updateSmoke(ctx.fOptions, ctx.fireParticles);
        updateKelp();
    } else if (ctx.isDialogOpen) {
        updateCat(ctx.time);
    }
    ctx.stats.update();
    updateDialogPosition();
    TWEEN.update();
    ctx.composer.render();
    if (ctx.renderCss) {
        ctx.rendererCss.render( ctx.sceneCss, ctx.camera );
    }
    requestAnimationFrame( animate )

    ctx.prevTime = ctx.time;
}

function initFpsToggle() {
    const panel = document.createElement("div");
    panel.id = "perf-debug-controls";
    panel.style.cssText = [
        "position:fixed",
        "left:0",
        "top:52px",
        "z-index:2000",
        "padding:4px",
        "font:10px monospace",
        "background:rgba(0,0,0,0.45)",
        "pointer-events:auto"
    ].join(";");

    const button = document.createElement("button");
    const syncButton = () => {
        const enabled = ctx.stats.domElement.style.display !== "none";
        button.textContent = `FPS: ${enabled ? "ON" : "OFF"}`;
        button.style.cssText = [
            "height:24px",
            "padding:0 6px",
            "border:1px solid rgba(255,255,255,0.45)",
            `background:${enabled ? "rgba(212,175,55,0.92)" : "rgba(20,20,20,0.8)"}`,
            `color:${enabled ? "#18130a" : "#fff"}`,
            "font:10px monospace",
            "font-weight:700"
        ].join(";");
    };
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        ctx.stats.domElement.style.display = ctx.stats.domElement.style.display === "none" ? "block" : "none";
        syncButton();
    });
    syncButton();
    panel.appendChild(button);
    document.body.appendChild(panel);
}

function applyLowBloom() {
    ctx.pixelPass.edgeStrength = 0.05;
    ctx.bloomPass.enabled = true;
    ctx.bloomPass.strength = LOW_BLOOM_SETTINGS.strength;
    ctx.bloomPass.radius = LOW_BLOOM_SETTINGS.radius;
    ctx.bloomPass.threshold = LOW_BLOOM_SETTINGS.threshold;
    ctx.bloomPass.setSize(
        Math.max(1, Math.floor(window.innerWidth * LOW_BLOOM_SETTINGS.scale)),
        Math.max(1, Math.floor(window.innerHeight * LOW_BLOOM_SETTINGS.scale))
    );
}

function setSceneShadows(enabled: boolean) {
    ctx.globalGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = enabled;
            child.receiveShadow = enabled;
        }
    });
    if (ctx.dirL) ctx.dirL.castShadow = enabled;
    if (ctx.sptL) ctx.sptL.castShadow = enabled;
}
