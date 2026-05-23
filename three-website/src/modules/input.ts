import * as THREE from "three";
import { ctx } from "../rendererContext";
import { onWindowResize } from "./render";
import { closeDialog, nextDialogLine } from "./dialog";
import { updateChest } from "./animations";
import { CameraController } from "./cameraController";

let cameraController: CameraController;

export function setupControls() {
    cameraController = new CameraController();
    ctx.controls = cameraController.controls;
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
    cameraController.setEnabled(enable);
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
        case 'ArrowDown':
        case 'KeyS':
        case 'KeyA':
        case 'ArrowLeft':
        case 'KeyD':
        case 'ArrowRight':
        case 'KeyE':
        case 'Period':
        case 'KeyQ':
        case 'Comma':
            cameraController.handleKeyDown(event.code);
            break;
        case 'F9':
            if (ctx.stats.domElement.style.display == 'block') ctx.stats.domElement.style.display = 'none';
            else ctx.stats.domElement.style.display = 'block';
            break;
    }
}

function onKeyUp(event: any) {
    cameraController.handleKeyUp(event.code);
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
    cameraController.reset(zlvl, ifAnim);
}

export function camFocus(target: THREE.Object3D) {
    cameraController.focus(target);
}

function mouseHover() {
    if (ctx.islandModel) {
        const amp = 1.5;
        
        if (ctx.intersects.length > 0) {
            const ele = ctx.intersects[0];
            if (ctx.hoverTarget.some(child => child.name === ele.name) && !ctx.isDialogOpen) {
                ctx.hoverColor.forEach((color, index) => {
                    ctx.dummyColor.setRGB(color.r*amp, color.g*amp, color.b*amp);
                    const mat = ctx.hoverTarget[index].material as THREE.MeshStandardMaterial;
                    mat.color.set(ctx.dummyColor);
                });
                updateChest(true);
            }
            document.querySelector('html')?.classList.add('active');
        } else {
            ctx.hoverColor.forEach((color, index) => {
                const mat = ctx.hoverTarget[index].material as THREE.MeshStandardMaterial;
                if (mat.color.r != color.r) mat.color.set(color);
            });
            document.querySelector('html')?.classList.remove('active');
            updateChest(false);
        }
    }
}

function mouseUpdate() {
    ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
    ctx.intersects = [];
    
    ctx.interact.forEach((val) => {
        const tmp = ctx.raycaster.intersectObject(val);
        tmp.forEach((val) => {
            if (val.object.parent?.name != "" && val.object.parent?.name != "Scene") 
                ctx.intersects.push(val.object.parent);
            else ctx.intersects.push(val.object);
        });
    });
    
    mouseHover();
}

export function initInputListeners() {
    window.addEventListener('resize', onWindowResize);
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("keyup", onKeyUp, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mousedown', onMouseClick, false);
}

export function processInput(delta: number) {
    cameraController.update(delta);
    mouseUpdate();
}
