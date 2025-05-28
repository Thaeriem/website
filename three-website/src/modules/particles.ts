import { ctx } from "../rendererContext";
import * as THREE from "three";

export function setupParticles() {
    const geo = new THREE.CircleGeometry(ctx.pOptions.size, 32);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x555555,
                transparent: true,
                opacity: ctx.pOptions.opacity,
                side: THREE.DoubleSide,
            });
            ctx.smokeParticles = new THREE.InstancedMesh(geo, mat, ctx.pOptions.count);
            ctx.globalGroup.add(ctx.smokeParticles);
    
            for (let i = 0; i < ctx.pOptions.count; i++) {
                resetParticle(ctx.smokeParticles, i, true, ctx.pOptions);
            }
            ctx.smokeParticles.instanceMatrix.needsUpdate = true;
            ctx.smokeParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
            const fgeo = new THREE.CircleGeometry(ctx.pOptions.size, 32);
            const fmat = new THREE.MeshBasicMaterial({
                color: 0x737373,
                transparent: true,
                opacity: ctx.fOptions.opacity,
                side: THREE.DoubleSide,
            });
            ctx.fireParticles = new THREE.InstancedMesh(fgeo, fmat, ctx.fOptions.count);
            ctx.globalGroup.add(ctx.fireParticles);
    
            for (let i = 0; i < ctx.fOptions.count; i++) {
                resetParticle(ctx.fireParticles, i, true, ctx.fOptions);
            }
            ctx.fireParticles.instanceMatrix.needsUpdate = true;
            ctx.fireParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            ctx.osp = new THREE.BufferGeometry()
            ctx.ofp = new THREE.BufferGeometry()
            ctx.ofp.copy(ctx.fireParticles.geometry)
            ctx.osp.copy(ctx.smokeParticles.geometry)
}

export function resetParticle(mesh: THREE.InstancedMesh, index: number, init: boolean, opt: any) {
    if (init) {
        ctx.dummyMat.makeRotationY(Math.PI / 2);
        ctx.dummyPos.set(
            (Math.random()-0.5)*opt.width + opt.pos.x,           
            (Math.random() * opt.maxHeight/2) + opt.pos.y,
            (Math.random()-0.5)*opt.width + opt.pos.z
        )
    }
    else {
         ctx.dummyPos.set(
        (Math.random()-0.5)*opt.width + opt.pos.x,           
        opt.pos.y,
        (Math.random()-0.5)*opt.width + opt.pos.z
        )
    }
    ctx.dummyMat.setPosition(ctx.dummyPos)
    mesh.setMatrixAt(index, ctx.dummyMat);
    mesh.instanceMatrix.needsUpdate = true;
}

function smokeSpeed(y: number, opt: any): number {
    return Math.log(y - opt.pos.y + 2);
}
function smokeDrift(y: number, d: number, opt: any): number {
    return d*Math.log(y - opt.pos.y + 1);
}

export function updateSmoke(opt: any, particles: any) {
    const sint = Math.sin(ctx.time / 500);
    const cost = Math.cos(ctx.time / 500);
    const xval = sint * opt.scale;
    const zval = cost * opt.scale;
    const sceneDiv = document.querySelector('body #scene');
    if (sceneDiv && getComputedStyle(sceneDiv).display === 'block') {
        for (let i = 0; i < opt.count; i++) {
            particles.getMatrixAt(i, ctx.dummyMat);
            ctx.dummyPos.setFromMatrixPosition(ctx.dummyMat);
            ctx.dummyPos.y += 0.01 * smokeSpeed(ctx.dummyPos.y, opt);
            ctx.dummyPos.x += xval;
            ctx.dummyPos.z += zval+smokeDrift(ctx.dummyPos.y, 0.005, opt);
            ctx.dummyMat.setPosition(ctx.dummyPos);
            if (ctx.dummyPos.y > (opt.pos.y + opt.maxHeight/3)) {
                if (Math.random() > opt.p) resetParticle(particles, i, false, opt);
                else particles.setMatrixAt(i, ctx.dummyMat);
            }
            else particles.setMatrixAt(i, ctx.dummyMat);
        }
    }
    else {
        for (let i = 0; i < opt.count; i++) resetParticle(particles, i, true, opt);
    }
    particles.instanceMatrix.needsUpdate = true;
}