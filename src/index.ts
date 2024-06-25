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

import RenderPixelatedPass from "./shaders/pix-pass"
import grassShader from './shaders/grass';

import islandModelURL from '/island.glb?url'
import cloudModelURL from '/cloud.glb?url'
import boatModelURL from '/boat.glb?url'


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
let controls: MapControls
let prevTime = performance.now(), 
    time = performance.now()
let velocity = new THREE.Vector3();
let y_rotation: number = 0
let globalGroup = new THREE.Group();
let moveUp: boolean = false, 
    moveDown: boolean = false, 
    moveLeft: boolean = false, 
    moveRight: boolean = false, 
    rotateLeft: boolean = false, 
    rotateRight: boolean = false
let islandModel: THREE.Object3D, 
    cloudModel: THREE.Object3D, 
    boatModel: THREE.Object3D
let geometry: THREE.PlaneGeometry, 
    mesh: THREE.Mesh,
    outlineGeometry: THREE.PlaneGeometry, 
    outline: THREE.Mesh,
    cloudAmt: number = 10,
    cloudMesh: THREE.InstancedMesh,
    cloudMat: THREE.Material,
    boatMesh: THREE.Mesh,
    boatP: THREE.Plane,
    smokeParticles: THREE.InstancedMesh,
    grass: THREE.Mesh
let dummyVec: THREE.Vector3 = new THREE.Vector3(),
    dummyMat: THREE.Matrix4 = new THREE.Matrix4(),
    dummyPos: THREE.Vector3 = new THREE.Vector3(),
    dummyColor: THREE.Color = new THREE.Color(),
    dummyArr: number[] = []
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
    count: 75,
    opacity: 0.7,
    size: 0.1,
    scale: 0.002,
    maxHeight: 5,
    pos: new THREE.Vector3(0, 0.5, 1.75)
}
// -----------------------------------------------------------------------
// BOAT + OCEAN
const boatv0 = new THREE.Vector3(0, 0, 0), 
      boatv1 = new THREE.Vector3(0, 0, 0), 
      boatv2 = new THREE.Vector3(0, 0, 0);
const boatInd: number[] = [560, 561, 595]
const noise = SimplexNoise.createNoise2D();
const colorStart = new THREE.Color("#046997"), 
      colorEnd = new THREE.Color("#30b1ce");

// -----------------------------------------------------------------------
// SETUP
function setupCamera(screenResolution: Vector2) {
    let aspectRatio = screenResolution.x / screenResolution.y
    camera = new THREE.OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0.01, 2000);
    camera.position.set(-200, 80, -8)
    camera.zoom = 0.15
    camera.updateProjectionMatrix()
}

function setupRenderers(screenResolution: Vector2) {
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .75
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    // renderer.debug.checkShaderErrors = false;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild( renderer.domElement )

    rendererCss = new CSS3DRenderer();
    rendererCss.setSize( screenResolution.x, screenResolution.y )
    rendererCss.domElement.style.position = 'absolute';
    rendererCss.domElement.style.top = "0";
    document.body.appendChild( rendererCss.domElement );
}

function setupControls() {
    controls = new MapControls( camera, rendererCss.domElement )
    controls.enablePan = false //
    controls.target.set( 0, 0, 0 )
    controls.maxZoom = 1
    controls.minZoom = 0.03
    controls.zoomSpeed = 1.5
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
    globalGroup.add(grass);
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
init();
function init() {
    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 4 )
    renderResolution.x |= 0
    renderResolution.y |= 0

    setupCamera(screenResolution);

    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )
    scene.add(globalGroup);
    sceneCss = new THREE.Scene();

    setupRenderers(screenResolution);

    pixelPass = new RenderPixelatedPass( renderResolution, scene, camera );
    composer = new EffectComposer( renderer )
    composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( pixelPass )
    let bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    composer.addPass( bloomPass )

    setupControls();

    const gltfLoader = new GLTFLoader()

    {
        gltfLoader.load(islandModelURL, (gltf) => {
            islandModel = gltf.scene;
            islandModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                child.frustumCulled = false;
            });
            islandModel.scale.set(1, 1, 1);
            islandModel.position.set(0, 0, 0); 
            globalGroup.add(islandModel);
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
            opacity: 0.95,
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
        updateOcean(0,0.1,0.3);
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
            boatMesh.scale.set(0.5,0.5,0.5);
            boatMesh.position.set(2,0,3.5);
            boatMesh.rotation.set(0,-1,0)
            globalGroup.add(boatMesh);
            const pos = geometry.attributes.position
            boatv0.set(pos.getX(boatInd[0]), pos.getZ(boatInd[0]), pos.getY(boatInd[0]))
            boatv1.set(pos.getX(boatInd[1]), pos.getZ(boatInd[1]), pos.getY(boatInd[1]))
            boatv2.set(pos.getX(boatInd[2]), pos.getZ(boatInd[2]), pos.getY(boatInd[2]))
            boatP = createPlane(boatv0, boatv1, boatv2);
        });
    
    }

    {
        const geometry = new THREE.SphereGeometry(pOptions.size, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: pOptions.opacity });
        smokeParticles = new THREE.InstancedMesh(geometry, material, pOptions.count);
        globalGroup.add(smokeParticles);

        // Initialize particles
        for (let i = 0; i < pOptions.count; i++) {
            resetParticle(i, true);
        }
        smokeParticles.instanceMatrix.needsUpdate = true;
        smokeParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
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
    // events
    window.addEventListener( 'resize', onWindowResize );
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("keyup", onKeyUp, false);
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
                  * amplitude + 0.3;
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
function resetParticle(index: number, init: boolean) {
    const scale = 0.5
    if (init) {
        dummyPos.set(
            (Math.random()-0.5)*scale + pOptions.pos.x,
            (Math.random() * pOptions.maxHeight/2) + pOptions.pos.y,
            (Math.random()-0.5)*scale + pOptions.pos.z
        )
    }
    else {
        dummyPos.set(
            (Math.random()-0.5)*scale + pOptions.pos.x,           
            pOptions.pos.y,
            (Math.random()-0.5)*scale + pOptions.pos.z
        )
    }
    dummyMat.setPosition(dummyPos)
    smokeParticles.setMatrixAt(index, dummyMat);
    smokeParticles.instanceMatrix.needsUpdate = true;
}

function smokeSpeed(y: number): number {
    return Math.log(y - pOptions.pos.y + 2);
}
function smokeDrift(y: number, d: number): number {
    return d*Math.log(y - pOptions.pos.y + 1);
}

function updateSmoke() {
    for (let i = 0; i < pOptions.count; i++) {
        smokeParticles.getMatrixAt(i, dummyMat);
        dummyPos.setFromMatrixPosition(dummyMat);
        dummyPos.y += 0.01 * smokeSpeed(dummyPos.y);
        dummyPos.x += Math.sin(time/500)*pOptions.scale;
        dummyPos.z += Math.cos(time/500)*pOptions.scale+smokeDrift(dummyPos.y, 0.005);
        dummyMat.setPosition(dummyPos);
        if (dummyPos.y > (pOptions.pos.y + pOptions.maxHeight/3)) {
            if (Math.random() > 0.98) resetParticle(i,false);
            else smokeParticles.setMatrixAt(i, dummyMat);
        }
        else {
            smokeParticles.setMatrixAt(i, dummyMat);
        }
    }

    smokeParticles.instanceMatrix.needsUpdate = true;
}
// -----------------------------------------------------------------------
// BOAT
function updateBoat(time: number) {
    if (boatMesh) {
        const pos = geometry.attributes.position
        boatv0.setY(pos.getZ(594)), boatv1.setY(pos.getZ(595)), boatv2.setY(pos.getZ(561))
        updatePlane(boatv0, boatv1, boatv2);
        dummyPos.copy(boatMesh.position);
        dummyPos.copy(projPlane(dummyPos, boatP));
        boatMesh.position.copy(dummyPos);
        const angle = oscillateValue(-0.2,0.2,1,time/2000);
        boatMesh.rotation.z = angle
    }   
}

function projPlane(point: THREE.Vector3, plane: THREE.Plane) {
    const projectedPoint = new THREE.Vector3();
    plane.projectPoint(point, projectedPoint);
    return projectedPoint;
}
function updatePlane(v0: THREE.Vector3, v1:THREE.Vector3, v2:THREE.Vector3) {
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    boatP.normal.crossVectors(edge1, edge2).normalize();
    boatP.constant = -boatP.normal.dot(v0);
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
// -----------------------------------------------------------------------
// Keyboard Controls
function camReset() {
    
    new TWEEN.Tween(camera.position)
        .to({ x: -200, y: 80, z: -8 }, 1500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween(controls.target)
        .to({ x: 0, y: 0, z: 0 }, 1500) 
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween({ zoom: camera.zoom })
        .to({ zoom: 0.15 }, 1500) 
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (object) {
            camera.zoom = object.zoom;
            camera.updateProjectionMatrix();
        })
        .start();
    globalGroup.rotation.set(0,0,0)
    velocity.set(0, 0, 0);
    y_rotation = 0;
}

function onKeyDown (event: any) {
    switch (event.code) {
        case 'KeyZ':
        case 'Escape':
            moveUp = moveDown = moveLeft = moveRight = false;
            camReset()
            break;
        case 'KeyW':
        case 'ArrowUp':
            moveUp = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveDown = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = true;
            break;
        case 'KeyE':
            rotateRight = true;
            break;
        case 'KeyQ':
            rotateLeft = true;
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
            rotateRight = false;
            break;
        case 'KeyQ':
            rotateLeft = false;
            break;
    }
};
// -----------------------------------------------------------------------
// Camera Controls
function normalizeZoom(zoom: any, low: any, high: any) {
    const minOriginal = 0.030563645913324056;
    const maxOriginal = 1;
    const normalizedValue = (zoom - minOriginal) / (maxOriginal - minOriginal);
    const newZoom = low + normalizedValue * (high - low);
    return newZoom;
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
function renderHTML() {
    const cssElement = document.getElementById('test-element') as HTMLElement;
    const cssObject = new CSS3DObject(cssElement);
    cssObject.position.set(10, 4, 0);
    cssObject.rotation.set(0,Math.PI/2, 0)
    // sceneCss.add(cssObject);
    // sceneCss.rotateY(Math.PI)
}
// -----------------------------------------------------------------------
animate()
function animate() {

    time = performance.now();
    const delta = ( time - prevTime ) / 1000;

    grassUniforms.iTime.value = time - startTime;

    const new_zoom = normalizeZoom(camera.zoom, 0, 0.90);
    velocity.z -= velocity.z * 30.0 * (1.1-new_zoom) * delta;
    velocity.x -= velocity.x * 30.0 * (1.1-new_zoom) * delta;
    if ( moveUp ) velocity.x += 20.0 * (1.01-new_zoom) * delta;
    if (moveDown )  velocity.x -= 20.0 * (1.01-new_zoom) * delta;
    if ( moveLeft ) velocity.z -= 10.0 * (1.01-new_zoom) * delta;
    if (moveRight ) velocity.z += 10.0 * (1.01-new_zoom) * delta;
    
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
    updateClouds(delta);
    updateBoat(time);
    updateOcean(time * 0.0001,0.1,0.3);
    updateSmoke();

    controls.update();
    TWEEN.update();
    requestAnimationFrame( animate )
    composer.render();
    rendererCss.render( sceneCss, camera );

    prevTime = time;
}
