import * as THREE from "three"
import { Vector2 } from "three"
import TWEEN from '@tweenjs/tween.js'
import * as SimplexNoise from 'simplex-noise';

import { MapControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

import RenderPixelatedPass from "./RenderPixelatedPass"
import PixelatePass from "./PixelatePass"

import { stopGoEased } from "./math"

import islandModelURL from "./assets/island.glb"
import cloudModelURL from "./assets/cloud.glb"
import boatModelURL from "./assets/boat.glb"

let camera: THREE.OrthographicCamera, 
    scene: THREE.Scene, 
    renderer: THREE.WebGLRenderer, 
    composer: EffectComposer
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
    boatMat: THREE.Material,
    boatMesh: THREE.Mesh,
    boatP: THREE.Plane,
    smokeParticles: THREE.InstancedMesh
let dummy: THREE.Object3D = new THREE.Object3D(),
    dummyMat: THREE.Matrix4 = new THREE.Matrix4(),
    dummyPos: THREE.Vector3 = new THREE.Vector3(),
    dummyColor: THREE.Color = new THREE.Color(),
    dummyArr: number[] = []
const pOptions = {
    count: 75,
    opacity: 0.7,
    size: 0.1,
    scale: 0.002,
    maxHeight: 5,
    pos: new THREE.Vector3(0, 0.5, 1.75)
}
const boatv0 = new THREE.Vector3(0, 0, 0), 
      boatv1 = new THREE.Vector3(0, 0, 0), 
      boatv2 = new THREE.Vector3(0, 0, 0);
const boatInd: number[] = [560, 561, 595]
const noise = SimplexNoise.createNoise2D();
const colorStart = new THREE.Color("#046997"), 
      colorEnd = new THREE.Color("#30b1ce");

init()
animate()

function init() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 4 )
    renderResolution.x |= 0
    renderResolution.y |= 0
    let aspectRatio = screenResolution.x / screenResolution.y

    camera = new THREE.OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0.01, 2000);
    camera.position.set(-200, 80, -8)
    camera.zoom = 0.15
    camera.updateProjectionMatrix()
    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )
    scene.add(globalGroup);

    // Renderer
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .75
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    // renderer.debug.checkShaderErrors = false;
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )
    let bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    composer.addPass( bloomPass )

    controls = new MapControls( camera, renderer.domElement )
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

    const texLoader = new THREE.TextureLoader()
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
            opacity: 0.6,
            side: THREE.DoubleSide
        });
    
        // Create the material for the outline with gradient
        const material2 = new THREE.MeshBasicMaterial({
            wireframe: true,
            vertexColors: true,
            transparent:true,
            opacity:0.05
        });
    
        // Create the mesh for the plane
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        globalGroup.add(mesh);
        // Create the mesh for the outline
        outline = new THREE.Mesh(outlineGeometry, material2);
        outline.rotation.x = -Math.PI / 2;
        globalGroup.add(outline);
        // Adjust the vertices with noise
        updateOcean(0,0.1,0.4);
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
            cloudMat.opacity = 0.65
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
            boatMat = boat.material as THREE.Material
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

    // Lights
    // Ambient light for general illumination
    {
        globalGroup.add(new THREE.AmbientLight(0x2d3645, 8));

        // Directional light for strong, directional lighting
        let directionalLight = new THREE.DirectionalLight(0xff6900, 4.5);
        directionalLight.position.set(100, 100, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(4000, 4000);
        globalGroup.add(directionalLight);
    }
}
// ---------------------------------
// Ocean
function updateOcean(time: number, scale: number, amplitude: number) {
    const positionAttribute = geometry.attributes.position;
    dummyArr = [];
    let z = 0, zNorm = 0;

    for (let i = 0; i < positionAttribute.count; i++) {
        z = noise(positionAttribute.getX(i) * scale + time, 
                        positionAttribute.getY(i) * scale + time) 
                  * amplitude + 0.2;
        positionAttribute.setZ(i, z);
        
        zNorm = (z + 0.2) / 0.4;

        dummyColor.lerpColors(colorStart, colorEnd, zNorm);
        dummyArr.push(dummyColor.r, dummyColor.g, dummyColor.b)
    }
    positionAttribute.needsUpdate = true;
    outlineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(dummyArr, 3));

}
// ---------------------------------
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
// ---------------------------------
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
// ---------------------------------
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
// ---------------------------------
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

document.addEventListener("keydown", onKeyDown, false);
document.addEventListener("keyup", onKeyUp, false);
// ---------------------------------
// Camera Controls
function normalizeZoom(zoom: any, low: any, high: any) {
    const minOriginal = 0.030563645913324056;
    const maxOriginal = 1;
    const normalizedValue = (zoom - minOriginal) / (maxOriginal - minOriginal);
    const newZoom = low + normalizedValue * (high - low);
    return newZoom;
}
// ---------------------------------

function animate() {
    
    requestAnimationFrame( animate )

    time = performance.now();
    const delta = ( time - prevTime ) / 1000;


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
    updateOcean(time * 0.0001,0.1,0.4);
    updateSmoke();


    // let mat = ( crystalMesh.material as THREE.MeshPhongMaterial )
    // mat.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5
    // crystalMesh.position.y = .7 + Math.sin( t * 2 ) * .05
    // crystalMesh.rotation.y = stopGoEased( t, 3, 4 ) * Math.PI / 2
    // crystalMesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI

    // if ( mech )
    //     mech.rotation.y = Math.floor( t * 8 ) * Math.PI / 32
    // console.log(camera.position)
    controls.update();
    TWEEN.update();
    composer.render();

    prevTime = time;
}

function pixelTex( tex: THREE.Texture ) {
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
}
