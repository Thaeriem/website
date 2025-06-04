import * as THREE from 'three';
import { camReset, camFocus, toggleAnim } from './input';
import { toggleLighting } from './lighting';
import { openDialog } from './dialog';

export function onClickChest(_ele: THREE.Object3D) {
    camReset(0.1, true)
    document.querySelector('html')?.classList.remove('active');
}

export function onClickCamp(_ele: THREE.Object3D) {
    toggleLighting();
}

export function onClickYash(_ele: THREE.Object3D) {
    camFocus(_ele);
    toggleAnim(false);
    openDialog('yash');
}

export function onClickSmith(_ele: THREE.Object3D) {
    camFocus(_ele);
    toggleAnim(false);
    openDialog('smith');
}

export function projPlane(point: THREE.Vector3, plane: THREE.Plane) {
    const projectedPoint = new THREE.Vector3();
    plane.projectPoint(point, projectedPoint);
    return projectedPoint;
}
export function updatePlane(plane: THREE.Plane, v0: THREE.Vector3, v1:THREE.Vector3, v2:THREE.Vector3) {
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    plane.normal.crossVectors(edge1, edge2).normalize();
    plane.constant = -plane.normal.dot(v0);
}
export function createPlane(v0: THREE.Vector3, v1:THREE.Vector3, v2:THREE.Vector3) {
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    const constant = -normal.dot(v0);
    return new THREE.Plane(normal, constant);
}

export function oscillateValue(min: number, max: number, frequency: number, time: number) {
    const range = max - min;
    const amplitude = range / 2;
    const offset = min + amplitude;
    return amplitude * Math.sin(frequency * time) + offset;
}

export function pixelTex(tex: THREE.Texture): THREE.Texture {
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}