import * as THREE from "three"
import { GreaterEqualDepth, Vector2 } from "three"
import * as SimplexNoise from 'simplex-noise';

import { MapControls, OrbitControls } from "three/examples/jsm/controls/OrbitControls"
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

let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer
let controls: OrbitControls
let gltfModel: THREE.Object3D
let geometry: THREE.PlaneGeometry, mesh: THREE.Mesh
const noise = SimplexNoise.createNoise2D();

init()
animate()

function init() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 4 )
    renderResolution.x |= 0
    renderResolution.y |= 0
    let aspectRatio = screenResolution.x / screenResolution.y

    camera = new THREE.OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0.01, 1000);
    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )
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
    // composer.addPass( new PixelatePass( renderResolution ) )

    controls = new OrbitControls( camera, renderer.domElement )
    controls.target.set( 0, 0, 0 )
    camera.position.set(-9, 4, -0.4)
    controls.maxZoom = 10
    controls.update()
    // controls.minPolarAngle = controls.getPolarAngle() - Math.PI
    // controls.maxPolarAngle = controls.getPolarAngle() - (Math.PI / 12)

    const texLoader = new THREE.TextureLoader()
    const tex_checker = pixelTex( texLoader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
    const tex_checker2 = pixelTex( texLoader.load( "https://threejsfundamentals.org/threejs/resources/images/checker.png" ) )
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
            scene.add(gltfModel);
        }, undefined, (error) => {
            console.error('An error happened while loading the glb model', error);
        });
    }

     // Geometry setup
     {
        const width = 100;
        const height = 100;
        geometry = new THREE.PlaneGeometry(10, 10, width - 1, height - 1);
    
        // Create the material
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    
        // Create the mesh
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
    
        // Adjust the vertices with noise
        updateVertices();
     }

    // Lights
    // Ambient light for general illumination
    {
        scene.add(new THREE.AmbientLight(0x2d3645, 8));

        // Directional light for strong, directional lighting
        let directionalLight = new THREE.DirectionalLight(0xfffc9c, 0.5);
        directionalLight.position.set(100, 100, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(4000, 4000);
        scene.add(directionalLight);
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
    const amplitude = 0.5;
    const positionAttribute = geometry.attributes.position;
    
    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const z = noise(x * scale + time, y * scale + time);
        positionAttribute.setZ(i, z);
    }
    positionAttribute.needsUpdate = true;
}

function animate() {
    requestAnimationFrame( animate )
    let t = performance.now() / 1000

    // let mat = ( crystalMesh.material as THREE.MeshPhongMaterial )
    // mat.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5
    // crystalMesh.position.y = .7 + Math.sin( t * 2 ) * .05
    // crystalMesh.rotation.y = stopGoEased( t, 3, 4 ) * Math.PI / 2
    // crystalMesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI

    // if ( mech )
    //     mech.rotation.y = Math.floor( t * 8 ) * Math.PI / 32
    updateVertices();
    composer.render()
}

function pixelTex( tex: THREE.Texture ) {
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
}
