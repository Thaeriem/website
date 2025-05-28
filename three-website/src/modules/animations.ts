import * as THREE from "three";
import { ctx } from "../rendererContext";
import { oscillateValue, projPlane, updatePlane } from "./utilities";


export function updateClouds(delta: number) {
    if (ctx.cloudMesh) {
        if (ctx.camera.zoom > 0.15) {
            if (ctx.camera.zoom > 0.28) ctx.cloudMesh.visible = false
            ctx.cloudMat.opacity = 0.2;
        }
        else {
            if (!ctx.cloudMesh.visible) ctx.cloudMesh.visible = true
            ctx.cloudMat.opacity = 0.65
        }
        for (let i = 0; i < ctx.cloudAmt; i++) {
            ctx.cloudMesh.getMatrixAt(i, ctx.dummyMat);
            ctx.dummyPos.setFromMatrixPosition(ctx.dummyMat);
            ctx.dummyPos.x += delta * 10
            if (ctx.dummyPos.x > 200) ctx.dummyPos.x -= 400;
            ctx.dummyMat.setPosition(ctx.dummyPos);
            ctx.cloudMesh.setMatrixAt(i, ctx.dummyMat);
        }
        if (ctx.cloudMesh.visible) ctx.cloudMesh.instanceMatrix.needsUpdate = true;
    }
}

export function updateOcean(time: number, scale: number, amplitude: number) {
    const positionAttribute = ctx.oceanGeo.attributes.position;
    ctx.dummyArr = [];
    let z = 0, zNorm = 0;

    for (let i = 0; i < positionAttribute.count; i++) {
        z = ctx.noise(positionAttribute.getX(i) * scale + time, 
                        positionAttribute.getY(i) * scale + time) 
                  * amplitude + 0.5;
        positionAttribute.setZ(i, z);
        
        zNorm = (z + 0.2) / 0.4;

        ctx.dummyColor.lerpColors(ctx.colorStart, ctx.colorEnd, zNorm);
        ctx.dummyArr.push(ctx.dummyColor.r, ctx.dummyColor.g, ctx.dummyColor.b)
    }
    positionAttribute.needsUpdate = true;
    ctx.outlineGeo.setAttribute('color', new THREE.Float32BufferAttribute(ctx.dummyArr, 3));

}

export function updateBoat(time: number) {
    if (ctx.boatMesh) {
        const pos = ctx.oceanGeo.attributes.position
        ctx.boatv0.setY(pos.getZ(594)), ctx.boatv1.setY(pos.getZ(595)), ctx.boatv2.setY(pos.getZ(560))
        updatePlane(ctx.boatP, ctx.boatv0, ctx.boatv1, ctx.boatv2);
        ctx.dummyPos.copy(ctx.boatMesh.position);
        ctx.dummyPos.copy(projPlane(ctx.dummyPos, ctx.boatP));
        ctx.boatMesh.position.copy(ctx.dummyPos);
        const angle = oscillateValue(-0.2,0.2,1,time/3000);
        ctx.boatMesh.rotation.z = angle
    }   
}

export function updateDebris() {
    if (ctx.debrisModel) {
        const pos = ctx.oceanGeo.attributes.position
        ctx.debrv0.setY(pos.getZ(594)), ctx.debrv1.setY(pos.getZ(561)), ctx.debrv2.setY(pos.getZ(560))
        updatePlane(ctx.debrP, ctx.debrv0, ctx.debrv1, ctx.debrv2);
        for (let i = 0; i < ctx.debrisMesh.length; i++) {
            ctx.dummyPos.copy(ctx.debrisMesh[i].position);
            ctx.dummyPos.copy(projPlane(ctx.dummyPos, ctx.debrP));
            ctx.debrisMesh[i].position.copy(ctx.dummyPos);

        }
        // ctx.dummyPos.copy(ctx.debrisModel.position);
        // ctx.dummyPos.copy(projPlane(ctx.dummyPos, ctx.debrP));
        // ctx.debrisModel.position.copy(ctx.dummyPos);
    }   
}


export function updateKelp() {
    if (ctx.islandModel) {
        const height = (ctx.debrv0.y + ctx.debrv1.y + ctx.debrv2.y)/3
        const hnorm = (((height - 0.25) / (0.55 - 0.25)) - 0.5)
        for (let i = 0; i < ctx.kelpArr.length; i++) {
            for (let j = 0; j < ctx.kelpArr[i].count; j++) {
                ctx.kelpArr[i].getMatrixAt(j, ctx.dummyMat);
                ctx.dummyMat.decompose(ctx.dummy.position,ctx.dummy.quaternion,ctx.dummy.scale);
                ctx.dummy.rotation.z = 0.2*(hnorm)+Math.PI
                ctx.dummy.rotation.x = 0.5*(hnorm)+Math.PI
                ctx.dummy.updateMatrix()
                ctx.kelpArr[i].setMatrixAt(j, ctx.dummy.matrix);
                ctx.kelpArr[i].instanceMatrix.needsUpdate = true;
            }
        }
    }
}