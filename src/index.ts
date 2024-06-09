import * as THREE from "three"
import { GreaterEqualDepth, Vector2 } from "three"
import * as SimplexNoise from 'simplex-noise';

import { MapControls } from "three/examples/jsm/controls/OrbitControls"
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

import RenderPixelatedPass from "./RenderPixelatedPass"
import PixelatePass from "./PixelatePass"

import { stopGoEased } from "./math"

import warningStipesURL from "./assets/warningStripes.png"
import crateURL from "./assets/TileCrate.png"
import gltfModelURL from "./assets/island.glb"

let camera: THREE.OrthographicCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer
const cameraBounds = {
    minX: -270,
    maxX: -120,
    minZ: -60,
    maxZ: 45
};
let controls: MapControls
let gltfModel: THREE.Object3D
let prevTime = performance.now(), time = performance.now();
let velocity = new THREE.Vector3();
let y_rotation: number = 0;
let globalGroup = new THREE.Group();
let moveUp: boolean, moveDown: boolean, moveLeft: boolean, moveRight: boolean, rotateLeft: boolean, rotateRight: boolean;
let geometry: THREE.PlaneGeometry, mesh: THREE.Mesh,outlineGeometry: THREE.PlaneGeometry, outline: THREE.Mesh
const noise = SimplexNoise.createNoise2D();
const colorStart = new THREE.Color("#046997"), colorEnd = new THREE.Color("#30b1ce");

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
    // scene.background = new THREE.Color( 0xffffff )

    // Renderer
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .75
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )
    let bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    composer.addPass( bloomPass )

    controls = new MapControls( camera, renderer.domElement )
    controls.enablePan = false
    controls.target.set( 0, 0, 0 )
    controls.maxZoom = 1
    controls.minZoom = 0.03
    controls.zoomSpeed = 0.7
    controls.update()
    controls.minPolarAngle = controls.getPolarAngle() - Math.PI
    controls.maxPolarAngle = controls.getPolarAngle() + (Math.PI / 24)

    const texLoader = new THREE.TextureLoader()
    const tex_checker = pixelTex( texLoader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    const tex_checker2 = pixelTex( texLoader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    // const tex_water = pixelTex(texLoader.load());
    tex_checker.repeat.set( 3, 3 )
    tex_checker2.repeat.set( 1.5, 1.5 )

    {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(gltfModelURL, (gltf) => {
            console.log('Model loaded', gltf);
            gltfModel = gltf.scene;
            gltfModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                child.frustumCulled = false;
            });

            gltfModel.scale.set(1, 1, 1); // Set appropriate scale
            gltfModel.position.set(0, 0, 0); // Set appropriate position
            globalGroup.add(gltfModel);
        }, undefined, (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    }

     // Geometry setup
     {
        const width = 400;
        const height = 400;
        const segmentsX = width / 12;
        const segmentsY = height / 12;
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
        updateVertices();
    }
    

    // Lights
    // Ambient light for general illumination
    {
        globalGroup.add(new THREE.AmbientLight(0x2d3645, 8));

        // Directional light for strong, directional lighting
        let directionalLight = new THREE.DirectionalLight(0xfffc9c, 0.5);
        directionalLight.position.set(100, 100, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(4000, 4000);
        globalGroup.add(directionalLight);
    }

    // Spotlight for focused lighting on a specific target
    // let spotLight = new THREE.SpotLight(0xff8800, 1, 10, Math.PI / 16, 0.02, 2);
    // spotLight.position.set(2, 2, 0);
    // let target = new THREE.Object3D();
    // scene.add(target);
    // target.position.set(0, 0, 0);
    // spotLight.target = target;
    // spotLight.castShadow = true;
    // scene.add(spotLight);
}

function updateVertices() {
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

        const color = new THREE.Color().lerpColors(colorStart, colorEnd, zNormalized);
        colors.push(color.r, color.g, color.b)
    }
    positionAttribute.needsUpdate = true;
    outlineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function onKeyDown (event: any) {
    switch (event.code) {
        case 'KeyZ':
        case 'Escape':
            moveUp = moveDown = moveLeft = moveRight = false;
            camera.position.set(-200, 80, -8);
            controls.target.set(0,0,0);
            velocity.set(0,0,0);
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

    const new_zoom = normalizeZoom(camera.zoom, 0, 0.97);
1
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

    // let mat = ( crystalMesh.material as THREE.MeshPhongMaterial )
    // mat.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5
    // crystalMesh.position.y = .7 + Math.sin( t * 2 ) * .05
    // crystalMesh.rotation.y = stopGoEased( t, 3, 4 ) * Math.PI / 2
    // crystalMesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI

    // if ( mech )
    //     mech.rotation.y = Math.floor( t * 8 ) * Math.PI / 32
    // console.log(camera.position)
    controls.update();
    updateVertices();
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
