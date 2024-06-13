import * as THREE from "three"
import { Vector2 } from "three"
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

let camera: THREE.OrthographicCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer
const cameraBounds = {
    minX: -270,
    maxX: -140,
    minZ: -50,
    maxZ: 45
};
let controls: MapControls
let islandModel: THREE.Object3D, 
    cloudModel: THREE.Object3D, 
    boatModel: THREE.Object3D
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
    rotateRight: boolean = false;
let geometry: THREE.PlaneGeometry, 
    mesh: THREE.Mesh,
    outlineGeometry: THREE.PlaneGeometry, 
    outline: THREE.Mesh,
    cloudAmt: number,
    cloudPos: THREE.Vector3[] = [], 
    cloudMesh: THREE.InstancedMesh,
    cloudMat: THREE.Material,
    boatMat: THREE.Material,
    boatMesh: THREE.Mesh,
    boatP: THREE.Plane,
    smokeParticles: THREE.InstancedMesh,
    dummy: THREE.Object3D = new THREE.Object3D(),
    dummyMat: THREE.Matrix4 = new THREE.Matrix4(),
    dummyPos: THREE.Vector3 = new THREE.Vector3()
const pOptions = {
    count: 100,
    maxHeight: 10,
    spawnheight: 1
}
const boatv0 = new THREE.Vector3(0, 0, 0), boatv1 = new THREE.Vector3(0, 0, 0), boatv2 = new THREE.Vector3(0, 0, 0);
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
    // composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )
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
        updateOcean();
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
            cloudAmt = 10
            // Create InstancedMesh
            const cloud = cloudModel.getObjectByName('Cloud') as THREE.Mesh
            cloudMat = cloud.material as THREE.Material
            cloudMat.transparent = true;
            cloudMat.opacity = 0.65
            cloudMesh = new THREE.InstancedMesh(cloud.geometry, cloud.material, cloudAmt);
            cloudMesh.instanceMatrix.needsUpdate = true;
            cloudMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            for (let i = 0; i < cloudAmt; i++) {
                let tmp_x = Math.floor(Math.random() * 400), tmp_y = Math.floor(Math.random() * 50-25);
                let position = new THREE.Vector3(tmp_x, tmp_y, 10);
                cloudPos.push(position);
                dummyMat.setPosition(position);
                cloudMesh.setMatrixAt(i, dummyMat);
            }
            cloudMesh.rotation.x = -Math.PI / 2;
            cloudMesh.rotation.z = 15*Math.PI/11;
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
            boatv0.add(new THREE.Vector3(pos.getX(boatInd[0]), pos.getZ(boatInd[0]), pos.getY(boatInd[0])))
            boatv1.add(new THREE.Vector3(pos.getX(boatInd[1]), pos.getZ(boatInd[1]), pos.getY(boatInd[1])))
            boatv2.add(new THREE.Vector3(pos.getX(boatInd[2]), pos.getZ(boatInd[2]), pos.getY(boatInd[2])))
            boatP = createPlane(boatv0, boatv1, boatv2);
        });
    
    }

    {
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
        smokeParticles = new THREE.InstancedMesh(geometry, material, pOptions.count);
        globalGroup.add(smokeParticles);

        // Initialize particles
        for (let i = 0; i < pOptions.count; i++) {
            resetParticle(i);
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

function updateOcean() {
    const time = Date.now() * 0.0001;
    const scale = 0.1;
    const amplitude = 0.4;
    const positionAttribute = geometry.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const z = noise(x * scale + time, y * scale + time) * amplitude + 0.2;
        positionAttribute.setZ(i, z);
        
        const zNormalized = (z + 0.2) / 0.4;

        let color = new THREE.Color().lerpColors(colorStart, colorEnd, zNormalized);
        colors.push(color.r, color.g, color.b)
    }
    positionAttribute.needsUpdate = true;
    outlineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

}
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
            let position = cloudPos[i];

            position.x += delta * 10;
            if (position.x > 200) {
                position.x -= 400;
            }
            
            let matrix = new THREE.Matrix4().setPosition(position);
            cloudMesh.setMatrixAt(i, matrix);
        }

        if (cloudMesh.visible) cloudMesh.instanceMatrix.needsUpdate = true;
    }
}
function resetParticle(index: number) {
    console.log(index)
    dummy.position.set(
        (Math.random() - 0.5) * 20,  // X position
        pOptions.spawnheight,                 // Y position
        (Math.random() - 0.5) * 20
    );
    dummy.updateMatrix();
    smokeParticles.setMatrixAt(index, dummy.matrix);
    smokeParticles.instanceMatrix.needsUpdate = true;
}
function updateSmoke() {
    for (let i = 0; i < pOptions.count; i++) {
        let matrix = new THREE.Matrix4();
        smokeParticles.getMatrixAt(i, matrix);
        dummy.matrix.copy(matrix);
        // dummy.position.y += 0.001;
        // dummy.position.x += (Math.random() - 0.5) * 0.01;
        // dummy.position.z += (Math.random() - 0.5) * 0.01;

        if (dummy.position.y > pOptions.maxHeight) {
            resetParticle(i);
        } else {
            dummy.updateMatrix();
            smokeParticles.setMatrixAt(i, dummy.matrix);
        }
    }

    smokeParticles.instanceMatrix.needsUpdate = true;
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

function updateBoat(time: number) {
    if (boatMesh) {
        const pos = geometry.attributes.position
        const zs = [pos.getZ(594), pos.getZ(595), pos.getZ(561)]
        boatv0.setY(zs[0]), boatv1.setY(zs[1]), boatv2.setY(zs[2])
        updatePlane(boatv0, boatv1, boatv2);
        const boatPosition = boatMesh.position.clone();
        const projectedPoint = projPlane(boatPosition, boatP);
        boatMesh.position.copy(projectedPoint);
        const angle = oscillateValue(-0.2,0.2,1,time/2000);
        boatMesh.rotation.z = angle
    }   
}

function onKeyDown (event: any) {
    switch (event.code) {
        case 'KeyZ':
        case 'Escape':
            moveUp = moveDown = moveLeft = moveRight = false;
            camera.position.set(-200, 80, -8);
            controls.target.set(0,0,0);
            velocity.set(0,0,0);
            globalGroup.rotation.set(0,0,0)
            y_rotation = 0
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

function normalizeZoom(zoom: any, low: any, high: any) {
    const minOriginal = 0.030563645913324056;
    const maxOriginal = 1;
    const normalizedValue = (zoom - minOriginal) / (maxOriginal - minOriginal);
    const newZoom = low + normalizedValue * (high - low);
    return newZoom;
}

function animate() {
    
    requestAnimationFrame( animate )
    let t = performance.now() / 1000

    time = performance.now();
    const delta = ( time - prevTime ) / 1000;

    // player controls
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
    updateOcean();
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
