import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ctx } from "../rendererContext";
import { createPlane, pixelTex } from "./utilities";

const kelpPos: Array<Array<number>> = [
    [
        -1, -1.3, -8, -2, -1.4, -12
    ],
    [
        -4, -1.4, -9, 2, -1.3, -8, 0, -1.4, -10, 2, -1.5, -12
    ],
    [
        -3, -1.5, -7, 3, -1.6, -9.5
    ]
];

const gltfLoader = new GLTFLoader();

export function loadIslandModel(): Promise<void> {
    return new Promise((resolve, reject) => {
        gltfLoader.load(ctx.islandModelURL, (gltf) => {
            try {
                ctx.islandModel = gltf.scene;
                let toRem: THREE.Object3D[] = [];
                
                ctx.islandModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        if (child.name.slice(0, 4) === "Kelp") {
                            const ind = parseInt(child.name.slice(4)) - 1;
                            const kelp = ctx.islandModel.getObjectByName(child.name) as THREE.Mesh;
                            const instMesh = new THREE.InstancedMesh(kelp.geometry, kelp.material, kelpPos[ind].length);
                            ctx.globalGroup.add(instMesh);
                            
                            for (let i = 0; i < kelpPos[ind].length * 3; i += 3) {
                                ctx.dummyPos.set(kelpPos[ind][i], kelpPos[ind][i + 1], kelpPos[ind][i + 2]);
                                ctx.dummyMat.setPosition(ctx.dummyPos);
                                instMesh.setMatrixAt(i, ctx.dummyMat);
                            }
                            instMesh.instanceMatrix.needsUpdate = true;
                            instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                            ctx.kelpArr.push(instMesh);
                            toRem.push(child);
                            instMesh.scale.set(0.4, 0.4, 0.4);
                        }
                        
                        if (child.name.slice(0, 5) === "Chest" && !ctx.interact.has(child.parent)) {
                            ctx.interact.add(child.parent);
                            child.name = child.parent?.name as string;
                            ctx.hoverTarget.push(child as THREE.Mesh);
                            ctx.hoverColor.push((child.material as THREE.MeshStandardMaterial).color.clone());
                            if (child.name === "Chest-Top") ctx.chestModel = child.parent as THREE.Object3D;
                        }
                        
                        if (child.name.slice(0, 4) === "Camp" && !ctx.interact.has(child.parent)) {
                            ctx.interact.add(child.parent);
                        }
                    }
                    
                    if (child) child.frustumCulled = false;
                });
                
                toRem.forEach((val) => { ctx.islandModel.remove(val); });
                
                ctx.islandModel.scale.set(1, 1, 1);
                ctx.islandModel.position.set(0, 0, 0);
                ctx.globalGroup.add(ctx.islandModel);
                
                resolve();
            } catch (error) {
                reject(error);
            }
        }, undefined, (error) => {
            console.error('An error happened while loading the island model', error);
            reject(error);
        });
    });
}

export function loadCloudModel(): Promise<void> {
    return new Promise((resolve, reject) => {
        gltfLoader.load(ctx.cloudModelURL, (gltf) => {
            try {
                ctx.cloudModel = gltf.scene;
                ctx.cloudModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    child.frustumCulled = false;
                });
                
                const cloud = ctx.cloudModel.getObjectByName('Cloud') as THREE.Mesh;
                ctx.cloudMat = cloud.material as THREE.Material;
                ctx.cloudMat.transparent = true;
                ctx.cloudMat.opacity = 0.65;
                
                ctx.cloudMesh = new THREE.InstancedMesh(cloud.geometry, cloud.material, ctx.cloudAmt);
                ctx.cloudMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                
                for (let i = 0; i < ctx.cloudAmt; i++) {
                    ctx.dummyPos.set(
                        Math.floor(Math.random() * 400),
                        Math.floor(Math.random() * 50 - 25),
                        10
                    );
                    ctx.dummyMat.setPosition(ctx.dummyPos);
                    ctx.cloudMesh.setMatrixAt(i, ctx.dummyMat);
                }
                
                ctx.cloudMesh.rotation.x = -Math.PI / 2;
                ctx.cloudMesh.rotation.z = 15 * Math.PI / 11;
                ctx.cloudMesh.instanceMatrix.needsUpdate = true;
                ctx.globalGroup.add(ctx.cloudMesh);
                
                resolve();
            } catch (error) {
                reject(error);
            }
        }, undefined, (error) => {
            console.error('An error happened while loading the cloud model', error);
            reject(error);
        });
    });
}

export function loadBoatModel(): Promise<void> {
    return new Promise((resolve, reject) => {
        gltfLoader.load(ctx.boatModelURL, (gltf) => {
            try {
                ctx.boatModel = gltf.scene;
                ctx.boatModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    child.frustumCulled = false;
                });
                
                const boat = ctx.boatModel.getObjectByName('Boat') as THREE.Mesh;
                ctx.boatMesh = new THREE.Mesh(boat.geometry, boat.material);
                ctx.boatMesh.scale.set(0.3, 0.3, 0.3);
                ctx.boatMesh.position.set(-1, 0, 3.5);
                ctx.boatMesh.rotation.set(0, -0.8, 0);
                ctx.globalGroup.add(ctx.boatMesh);
                
                const pos = ctx.oceanGeo.attributes.position;
                ctx.boatv0.set(pos.getX(ctx.bInd[0]), pos.getZ(ctx.bInd[0]), pos.getY(ctx.bInd[0]));
                ctx.boatv1.set(pos.getX(ctx.bInd[1]), pos.getZ(ctx.bInd[1]), pos.getY(ctx.bInd[1]));
                ctx.boatv2.set(pos.getX(ctx.bInd[2]), pos.getZ(ctx.bInd[2]), pos.getY(ctx.bInd[2]));
                ctx.boatP = createPlane(ctx.boatv0, ctx.boatv1, ctx.boatv2);
                
                resolve();
            } catch (error) {
                reject(error);
            }
        }, undefined, (error) => {
            console.error('An error happened while loading the boat model', error);
            reject(error);
        });
    });
}

export function loadDebrisModel(): Promise<void> {
    return new Promise((resolve, reject) => {
        gltfLoader.load(ctx.debrisModelURL, (gltf) => {
            try {
                ctx.debrisModel = gltf.scene;
                ctx.debrisModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material.map) {
                            child.material.map = pixelTex(child.material.map);
                        }
                        ctx.debrisMesh.push(child);
                    }
                    child.frustumCulled = false;
                });
                ctx.debrisModel.position.set(3, 0, -0.8);
                ctx.debrisModel.rotation.set(0, 0.8, 0);
                ctx.globalGroup.add(ctx.debrisModel);
                const pos = ctx.oceanGeo.attributes.position;
                ctx.debrv0.set(pos.getX(ctx.dInd[0]), pos.getZ(ctx.dInd[0]), pos.getY(ctx.dInd[0]));
                ctx.debrv1.set(pos.getX(ctx.dInd[1]), pos.getZ(ctx.dInd[1]), pos.getY(ctx.dInd[1]));
                ctx.debrv2.set(pos.getX(ctx.dInd[2]), pos.getZ(ctx.dInd[2]), pos.getY(ctx.dInd[2]));
                ctx.debrP = createPlane(ctx.debrv0, ctx.debrv1, ctx.debrv2);
                
                resolve();
            } catch (error) {
                reject(error);
            }
        }, undefined, (error) => {
            console.error('An error happened while loading the debris model', error);
            reject(error);
        });
    });
}

export function loadYashModel(): Promise<void> {
    return new Promise((resolve, reject) => {
        gltfLoader.load(ctx.yashModelURL, (gltf) => {
            try {
                ctx.yashModel = gltf.scene;
                ctx.yashModel.name = "Yash";
                ctx.yashModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material.map) {
                            child.material.map = pixelTex(child.material.map);
                        }
                    }
                    child.frustumCulled = false;
                });
                
                // Position the cat on top of the island
                ctx.yashModel.position.set(0, 1.1, -1); // Elevated above the island
                ctx.yashModel.scale.set(0.2, 0.2, 0.2); // Scale it down to appropriate size
                ctx.yashModel.rotation.set(0, 2, -0.1); // Neutral rotation
                
                ctx.globalGroup.add(ctx.yashModel);
                ctx.interact.add(ctx.yashModel);
                
                resolve();
            } catch (error) {
                reject(error);
            }
        }, undefined, (error) => {
            console.error('An error happened while loading the cat model', error);
            reject(error);
        });
    });
}
export function loadSmithModel(): Promise<void> {
    return new Promise((resolve, reject) => {
        gltfLoader.load(ctx.smithModelURL, (gltf) => {
            try {
                ctx.smithModel = gltf.scene;
                ctx.smithModel.name = "Smith";
                ctx.smithModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material.map) {
                            child.material.map = pixelTex(child.material.map);
                        }
                    }
                    if (child.name.slice(0, 7) === "Raccoon") ctx.interact.add(child);
                    child.frustumCulled = false;
                });
                
                // Position the cat on top of the island
                ctx.smithModel.position.set(-20, 1, 20); // Elevated above the island
                ctx.smithModel.scale.set(0.2, 0.2, 0.2); // Scale it down to appropriate size
                ctx.smithModel.rotation.set(0, -2.5, 0); // Neutral rotation
                
                ctx.globalGroup.add(ctx.smithModel);
                
                resolve();
            } catch (error) {
                reject(error);
            }
        }, undefined, (error) => {
            console.error('An error happened while loading the cat model', error);
            reject(error);
        });
    });
}
export function setupOceanGeometry(): void {
    const width = 400, height = 400;
    const segmentsX = Math.floor(width / 12);
    const segmentsY = Math.floor(height / 12);
    
    ctx.oceanGeo = ctx.outlineGeo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
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
        color: 0x4a90e2,
        side: THREE.DoubleSide
    });
    ctx.oceanMesh = new THREE.Mesh(ctx.oceanGeo, material);
    ctx.oceanMesh.rotation.x = -Math.PI / 2;
    ctx.globalGroup.add(ctx.oceanMesh);
    
    ctx.outlineMesh = new THREE.Mesh(ctx.outlineGeo, material2);
    ctx.outlineMesh.rotation.x = -Math.PI / 2;
    ctx.globalGroup.add(ctx.outlineMesh);
    
    ctx.waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material3);
    ctx.waterPlane.rotation.x = -Math.PI / 2;
    ctx.waterPlane.position.y = -0.5;
    ctx.globalGroup.add(ctx.waterPlane);
}

export async function initModels(): Promise<void> {
    try {
        setupOceanGeometry();
        
        await Promise.all([
            loadIslandModel(),
            loadCloudModel(),
            loadBoatModel(),
            loadDebrisModel(),
            loadYashModel(),
            loadSmithModel()
        ]);
        
        console.log('All models loaded successfully');
    } catch (error) {
        console.error('Error loading models:', error);
        throw error;
    }
}