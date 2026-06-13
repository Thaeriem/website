import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { ctx } from "../rendererContext";
import RenderPixelatedPass from "../shaders/pix-pass";
const IFRAME_PAGE = import.meta.env.VITE_IFRAME_PAGE;
const IFRAME_VIEWPORT_WIDTH = 720;
const IFRAME_VIEWPORT_HEIGHT = 780;
const IFRAME_VISUAL_WIDTH = 384;
const IFRAME_VISUAL_HEIGHT = 416;
const MAX_DEVICE_PIXEL_RATIO = 1;

export function setupCamera(screenResolution: THREE.Vector2) {
    let aspectRatio = screenResolution.x / screenResolution.y
    ctx.camera = new THREE.OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0, 2000);
    ctx.camera.position.set(-200, 80, 0.000001)
    ctx.camera.zoom = ctx.dZoom
    ctx.camera.updateProjectionMatrix()
}

export function setupRenderers(screenResolution: THREE.Vector2) {
    ctx.renderer = new THREE.WebGLRenderer( { antialias: false } )
    ctx.renderer.toneMapping = THREE.ACESFilmicToneMapping
    ctx.renderer.toneMappingExposure = .75
    ctx.renderer.shadowMap.enabled = true
    ctx.renderer.setSize( screenResolution.x, screenResolution.y )
    ctx.renderer.debug.checkShaderErrors = false;
    ctx.renderer.setPixelRatio(getRenderPixelRatio());
    document.getElementById("scene")?.appendChild( ctx.renderer.domElement );

    ctx.rendererCss = new CSS3DRenderer();
    ctx.rendererCss.setSize( screenResolution.x, screenResolution.y )
    ctx.rendererCss.domElement.style.position = 'absolute';
    ctx.rendererCss.domElement.style.top = "0";
    ctx.rendererCss.domElement.style.touchAction = "none";
    document.getElementById("scene")?.appendChild( ctx.rendererCss.domElement );
}

export function setupComposer(screenResolution: THREE.Vector2, renderResolution: THREE.Vector2) {
    ctx.composer = new EffectComposer( ctx.renderer )
    ctx.pixelPass = new RenderPixelatedPass( renderResolution, ctx.scene, ctx.camera );
    ctx.composer.addPass( ctx.pixelPass )
    ctx.bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    ctx.bloomPass.enabled = false
    ctx.composer.addPass(ctx.bloomPass)
}

export function onWindowResize() {
    let screenResolution = new THREE.Vector2( window.innerWidth, window.innerHeight )
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
    ctx.renderer.setPixelRatio(getRenderPixelRatio());
    ctx.rendererCss.setSize( screenResolution.x, screenResolution.y );
}

function getRenderPixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
}

export function renderHTML() {
    const iframe = document.createElement( 'iframe' );
    iframe.id = 'iframeid';
    iframe.style.cssText = [
        `width: ${IFRAME_VIEWPORT_WIDTH}px`,
        `height: ${IFRAME_VIEWPORT_HEIGHT}px`,
        "border: 0",
        "object-fit: cover",
        "pointer-events: auto",
        "touch-action: auto"
    ].join(";");
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
    iframe.src = IFRAME_PAGE;

    ctx.cssHolder = new CSS3DObject(iframe);
    ctx.cssHolder.scale.set(
        IFRAME_VISUAL_WIDTH / IFRAME_VIEWPORT_WIDTH,
        IFRAME_VISUAL_HEIGHT / IFRAME_VIEWPORT_HEIGHT,
        1
    );
    ctx.cssHolder.frustumCulled = false;
    ctx.cssHolder.position.set(0, 0, 0);
    ctx.cssHolder.rotation.set(0,Math.PI/2, 0);
    ctx.cssHolder.visible = false
    ctx.sceneCss.add(ctx.cssHolder);
    ctx.sceneCss.rotateY(Math.PI)
}
