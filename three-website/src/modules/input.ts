import * as THREE from "three";
import TWEEN from '@tweenjs/tween.js';
import { MapControls } from "three/examples/jsm/controls/OrbitControls";
import { ctx } from "../rendererContext";
import { onWindowResize } from "./render";
import { oscillateValue } from "./utilities";
import { closeDialog, nextDialogLine } from "./dialog";

export function setupControls() {
    ctx.controls = new MapControls(ctx.camera, ctx.rendererCss.domElement);
    ctx.controls.target.set(0, 1, 0);
    ctx.controls.maxZoom = 1;
    ctx.controls.minZoom = 0.03;
    ctx.controls.zoomSpeed = 2;
    ctx.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.DOLLY
    };
    ctx.controls.update();
}

function preventEvent(event: any) {
    event.stopPropagation();
}

export function toggleEvents(enable: boolean) {
    if (!enable) {
        window.addEventListener('touchstart', preventEvent, true);
        window.addEventListener('wheel', preventEvent, true);
    } else {
        setTimeout(() => {
            window.removeEventListener('touchstart', preventEvent, true);
            window.removeEventListener('wheel', preventEvent, true);
        }, 100);
    }
}

export function toggleControls(enable: boolean) {
    ctx.controls.enabled = enable;
    toggleEvents(enable);
}

export function toggleAnim(enable: boolean) {
    ctx.anim = !enable;
    if (!enable)  toggleControls(false);
    else toggleControls(true);
}

function onKeyDown(event: any) {
    switch (event.code) {
        case 'Space':
            if (ctx.isDialogOpen) {
                event.preventDefault();
                nextDialogLine();
            }
            break;
        case 'KeyZ':
        case 'Escape':
            if (!ctx.anim && !ctx.isDialogOpen) {
                ctx.moveUp = ctx.moveDown = ctx.moveLeft = ctx.moveRight = false;
                camReset(ctx.dZoom, false);
            }
            if (ctx.isDialogOpen) {
                event.preventDefault();
                toggleAnim(true);
                closeDialog();
            }
            break;
        case 'KeyW':
        case 'ArrowUp':
            if (ctx.controls.enabled) ctx.moveUp = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            if (ctx.controls.enabled) ctx.moveDown = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            if (ctx.controls.enabled) ctx.moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            if (ctx.controls.enabled) ctx.moveRight = true;
            break;
        case 'KeyE':
        case 'Period':
            if (ctx.controls.enabled) ctx.rotateRight = true;
            break;
        case 'KeyQ':
        case 'Comma':
            if (ctx.controls.enabled) ctx.rotateLeft = true;
            break;
        case 'F9':
            if (ctx.stats.domElement.style.display == 'block') ctx.stats.domElement.style.display = 'none';
            else ctx.stats.domElement.style.display = 'block';
            break;
    }
}

function onKeyUp(event: any) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            ctx.moveUp = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            ctx.moveDown = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            ctx.moveLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            ctx.moveRight = false;
            break;
        case 'KeyE':
        case 'Period':
            ctx.rotateRight = false;
            break;
        case 'KeyQ':
        case 'Comma':
            ctx.rotateLeft = false;
            break;
    }
}

function onMouseMove(event: any) {
    ctx.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    ctx.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick(event: MouseEvent) {
    const iframe = document.getElementById('iframeid');
    if (document.getElementById('scene')?.style.display != "") {
        if (ctx.intersects.length > 0) {
            const ele = ctx.intersects[0];
            if (!ctx.anim && !ctx.isDialogOpen && ctx.camera.zoom > 0.15) ctx.funcList[ele.name](ele);
        }

        if (!ctx.controls.enabled && iframe && !ctx.isDialogOpen) {
            const rect = iframe.getBoundingClientRect();
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            if (
                mouseX <= rect.left ||
                mouseX >= rect.right ||
                mouseY <= rect.top ||
                mouseY >= rect.bottom
            ) {
                camReset(ctx.dZoom, false);
            }
        }
    }
}

export function camReset(zlvl: any, ifAnim: boolean) {
    ctx.dummyVec.set(0, 1, 0);
    ctx.anim = true;
    setTimeout(() => { ctx.controls.saveState(); ctx.anim = false; }, ctx.animTime);
    
    if (ifAnim) {
        ctx.dummyVec.set(0, 0, 0);
    } else {
        ctx.cssHolder.visible = false;
        ctx.controls.target.set(0, 1, 0);
        ctx.controls.update();
    }

    new TWEEN.Tween(ctx.controls.target)
        .to(ctx.dummyVec, ctx.animTime)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
        
    new TWEEN.Tween(ctx.camera.position)
        .to({ x: -200, y: 80, z: 0.000001 }, ctx.animTime)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
        
    new TWEEN.Tween({ zoom: ctx.camera.zoom })
        .to({ zoom: zlvl }, ctx.animTime)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (object) {
            ctx.camera.zoom = object.zoom;
            ctx.camera.updateProjectionMatrix();
        })
        .onComplete(() => {
            if (ifAnim) {
                ctx.cssHolder.visible = true;
                toggleControls(false);
            } else {
                if (!ctx.controls.enabled) toggleControls(!ctx.controls.enabled);
            }
        })
        .start();
        
    ctx.globalGroup.rotation.set(0, 0, 0);
    ctx.velocity.set(0, 0, 0);
    ctx.smokeParticles.geometry.copy(ctx.osp);
    ctx.fireParticles.geometry.copy(ctx.ofp);
    ctx.smokeParticles.instanceMatrix.needsUpdate = true;
    ctx.fireParticles.instanceMatrix.needsUpdate = true;
    ctx.y_rotation = 0;
}

export function camFocus(target: THREE.Object3D) {
    ctx.dummyVec.copy(target.position);
    ctx.controls.target.copy(ctx.dummyVec);
    ctx.controls.update();
    new TWEEN.Tween(ctx.controls.target)
        .to(ctx.dummyVec, ctx.animTime)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween({ zoom: ctx.camera.zoom })
        .to({ zoom: 1.5 }, ctx.animTime)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (object) {
            ctx.camera.zoom = object.zoom;
            ctx.camera.updateProjectionMatrix();
        })
        .start();
    ctx.globalGroup.rotation.set(0, 0, 0);
    ctx.velocity.set(0, 0, 0);
    ctx.y_rotation = 0;
}

function placeIcon() {
    if (ctx.islandModel) {
        if (document.getElementById('scene')?.style.display != "") {
            if (ctx.hoverIcon) {
                ctx.hoverIcon.position.copy(ctx.hoverTarget.position);
                const height = oscillateValue(-0.025, 0.025, 3, ctx.time/3000);
                ctx.hoverIcon.position.y += height + 0.6;
                ctx.hoverIcon.rotation.y += 0.01;
                ctx.hoverIcon.visible = true;
            }
            
            const child = ctx.hoverTarget.children[0] as THREE.Mesh;
            const mat = child.material as THREE.MeshStandardMaterial;
            const amp = 1.5;
            
            if (ctx.intersects.length > 0) {
                const ele = ctx.intersects[0];
                if (ele) {
                    if (ele.name == ctx.hoverTarget.name) {
                        ctx.dummyColor.setRGB(ctx.hoverColor.r*amp, ctx.hoverColor.g*amp, ctx.hoverColor.b*amp);
                        mat.color.set(ctx.dummyColor);
                    }
                    document.querySelector('html')?.classList.add('active');
                }
            } else {
                if (mat.color.r != ctx.hoverColor.r) mat.color.set(ctx.hoverColor);
                document.querySelector('html')?.classList.remove('active');
            }
        }
    }
}

function mouseUpdate() {
    ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
    ctx.intersects = [];
    
    ctx.interact.forEach((val) => {
        const tmp = ctx.raycaster.intersectObject(val);
        tmp.forEach((val) => {
            if (val.object.parent?.name != "") ctx.intersects.push(val.object.parent);
            else ctx.intersects.push(val.object);
        });
    });
    
    placeIcon();
}

export function initInputListeners() {
    window.addEventListener('resize', onWindowResize);
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("keyup", onKeyUp, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mousedown', onMouseClick, false);
}

const nnorm = (z: number) => (z-0.03)/(1-0.03);
const nzoom = (z: number, pow: number, disp: number) => (pow ** (1-z)-disp)/(pow-disp);
const ndrift = (val: number) => (6-1.5*val);
const nskew = (z: number, l: number, h: number) => l+(z)*(h-l);

export function processInput(delta: number) {
    const newZoom = nnorm(ctx.camera.zoom)
    const coef = nzoom(newZoom, 200, 0.99);

    ctx.velocity.z -= ctx.velocity.z * ndrift(coef) * delta;
    ctx.velocity.x -= ctx.velocity.x * ndrift(coef) * delta;
    if ( ctx.moveUp ) ctx.velocity.x += nskew(coef, 1.5,10) * delta;
    if ( ctx.moveDown )  ctx.velocity.x -= nskew(coef, 1.5,10) * delta;
    if ( ctx.moveLeft ) ctx.velocity.z -= nskew(coef, 0.75,5) * delta;
    if ( ctx.moveRight ) ctx.velocity.z += nskew(coef, 0.75,5) * delta;
    
    const new_x = ctx.camera.position.x + ctx.velocity.x, new_z = ctx.camera.position.z + ctx.velocity.z;
    if (new_x > ctx.cameraBounds.maxX) ctx.velocity.x = 0;
    if (new_x < ctx.cameraBounds.minX) ctx.velocity.x = 0;
    if (new_z > ctx.cameraBounds.maxZ) ctx.velocity.z = 0;
    if (new_z < ctx.cameraBounds.minZ) ctx.velocity.z = 0;
    if (ctx.camera.position.x > ctx.cameraBounds.maxX) {
        ctx.controls.target.x = ctx.cameraBounds.maxX + 200
        ctx.camera.position.x = ctx.cameraBounds.maxX
    }
    if (ctx.camera.position.x < ctx.cameraBounds.minX) {
        ctx.controls.target.x = ctx.cameraBounds.minX + 200
        ctx.camera.position.x = ctx.cameraBounds.minX
    }
    if (ctx.camera.position.z > ctx.cameraBounds.maxZ) {
        ctx.controls.target.z = ctx.cameraBounds.maxZ
        ctx.camera.position.z = ctx.cameraBounds.maxZ
    }
    if (ctx.camera.position.z < ctx.cameraBounds.minZ) {
        ctx.controls.target.z = ctx.cameraBounds.minZ
        ctx.camera.position.z = ctx.cameraBounds.minZ
    }
    ctx.camera.position.add(ctx.velocity);
    ctx.controls.target.add(ctx.velocity);
    ctx.controls.update();

    ctx.y_rotation -= ctx.y_rotation * 10.0 * delta;
    if ( ctx.rotateLeft ) ctx.y_rotation += 1.0 * delta;
    if ( ctx.rotateRight ) ctx.y_rotation -= 1.0 * delta;
    ctx.globalGroup.rotateY(ctx.y_rotation);

    ctx.dummyMat = new THREE.Matrix4().makeRotationY(-1.0 * ctx.y_rotation);
    ctx.smokeParticles.geometry.applyMatrix4(ctx.dummyMat);
    ctx.fireParticles.geometry.applyMatrix4(ctx.dummyMat);
    ctx.smokeParticles.geometry.computeVertexNormals();
    ctx.fireParticles.geometry.computeVertexNormals();    

    mouseUpdate();
}