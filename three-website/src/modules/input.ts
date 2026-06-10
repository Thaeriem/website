import * as THREE from "three";
import { ctx } from "../rendererContext";
import { onWindowResize } from "./render";
import { closeDialog, nextDialogLine } from "./dialog";
import { updateChest } from "./animations";
import { CameraController } from "./cameraController";

let cameraController: CameraController;

type PointerTapState = {
    pointerId: number;
    x: number;
    y: number;
} | null;

const TAP_MOVE_THRESHOLD = 8;
let pointerTapState: PointerTapState = null;

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

function updatePointerPosition(event: MouseEvent | PointerEvent) {
    ctx.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    ctx.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onPointerMove(event: PointerEvent) {
    updatePointerPosition(event);
}

function onMouseMove(event: MouseEvent) {
    updatePointerPosition(event);
}

function onPointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    updatePointerPosition(event);
    pointerTapState = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY
    };
}

function onPointerUp(event: PointerEvent) {
    if (!pointerTapState || pointerTapState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - pointerTapState.x;
    const deltaY = event.clientY - pointerTapState.y;
    pointerTapState = null;

    if (Math.hypot(deltaX, deltaY) > TAP_MOVE_THRESHOLD) return;
    onSceneSelect(event);
}

function onSceneSelect(event: MouseEvent | PointerEvent) {
    if (ctx.isDialogOpen) {
        event.preventDefault();
        nextDialogLine();
        return;
    }

    updatePointerPosition(event);
    mouseUpdate();

    const iframe = document.getElementById('iframeid');
    if (document.getElementById('scene')?.style.display != "") {
        if (ctx.intersects.length > 0) {
            const ele = ctx.intersects[0];
            if (!ctx.anim && ctx.camera.zoom > 0.15) ctx.funcList[ele.name](ele);
        }

        if (!ctx.controls.enabled && iframe) {
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
    window.addEventListener('pointerdown', onPointerDown, false);
    window.addEventListener('pointermove', onPointerMove, false);
    window.addEventListener('pointerup', onPointerUp, false);
    window.addEventListener('pointercancel', () => { pointerTapState = null; }, false);
}

export function processInput(delta: number) {
    cameraController.update(delta);
    mouseUpdate();
}
