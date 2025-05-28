import * as THREE from "three";
import { ctx } from "../rendererContext";

export function setupDayLight() {
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

export function setupNightLight() {
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

export function initLighting() {
    ctx.trgO = new THREE.Object3D();
    setupDayLight();
}

export function toggleLighting() {
    if (ctx.lightdark) setupDayLight();
    else setupNightLight();
    ctx.lightdark = !ctx.lightdark;
}
