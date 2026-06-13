import * as THREE from "three";
import { ctx } from "../rendererContext";
import { onWindowResize } from "./render";
import { closeDialog, nextDialogLine } from "./dialog";
import { unlockDialogAudio } from "./dialogAudio";
import { updateChest } from "./animations";
import { CameraController } from "./cameraController";

let cameraController: CameraController;

type PointerTapState = {
    pointerId: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    scrolled: boolean;
} | null;

const TAP_MOVE_THRESHOLD = 8;
let pointerTapState: PointerTapState = null;

function getIframe(): HTMLIFrameElement | null {
    return document.getElementById('iframeid') as HTMLIFrameElement | null;
}

function isIframeFocused() {
    return Boolean(ctx.isIframeOpen);
}

function getIframePoint(event: MouseEvent | PointerEvent | WheelEvent) {
    const iframe = getIframe();
    if (!iframe || !isIframeFocused()) return null;

    const rect = iframe.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;

    return { iframe, x, y };
}

function postIframeInput(type: "pointer" | "wheel", event: MouseEvent | PointerEvent | WheelEvent, extra = {}) {
    const point = getIframePoint(event);
    if (!point) return false;

    point.iframe.contentWindow?.postMessage({ type, x: point.x, y: point.y, ...extra }, '*');
    return true;
}

function resetFromIframeMode(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    pointerTapState = null;
    camReset(ctx.dZoom, false);
}

export function setupControls() {
    cameraController = new CameraController();
    ctx.controls = cameraController.controls;
}

function preventEvent(event: any) {
    if (getIframePoint(event)) return;
    event.stopPropagation();
}

export function toggleEvents(enable: boolean) {
    if (!enable) {
        window.addEventListener('wheel', preventEvent, true);
    } else {
        setTimeout(() => {
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
    unlockDialogAudio();

    switch (event.code) {
        case 'Space':
            if (ctx.isDialogOpen) {
                event.preventDefault();
                nextDialogLine();
            }
            break;
        case 'KeyZ':
        case 'Escape':
            if (isIframeFocused() && !ctx.isDialogOpen) {
                resetFromIframeMode(event);
                return;
            }
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
    if (getIframePoint(event)) {
        if (pointerTapState?.pointerId === event.pointerId) {
            const totalX = event.clientX - pointerTapState.x;
            const totalY = event.clientY - pointerTapState.y;
            const deltaX = pointerTapState.lastX - event.clientX;
            const deltaY = pointerTapState.lastY - event.clientY;
            pointerTapState.lastX = event.clientX;
            pointerTapState.lastY = event.clientY;

            if (Math.hypot(totalX, totalY) > TAP_MOVE_THRESHOLD) {
                pointerTapState.scrolled = true;
                postIframeInput("wheel", event, {
                    deltaX,
                    deltaY,
                    deltaMode: 0
                });
            }
        }
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    if (isIframeFocused()) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    updatePointerPosition(event);
}

function onMouseMove(event: MouseEvent) {
    if (isIframeFocused()) return;
    updatePointerPosition(event);
}

function onPointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    unlockDialogAudio();
    if (isIframeFocused()) {
        event.preventDefault();
        event.stopPropagation();
        pointerTapState = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            scrolled: false
        };
        return;
    }
    updatePointerPosition(event);
    pointerTapState = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        scrolled: false
    };
}

function onPointerUp(event: PointerEvent) {
    if (!pointerTapState || pointerTapState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - pointerTapState.x;
    const deltaY = event.clientY - pointerTapState.y;
    const hasScrolledIframe = pointerTapState.scrolled;
    pointerTapState = null;

    if (hasScrolledIframe) return;
    if (Math.hypot(deltaX, deltaY) > TAP_MOVE_THRESHOLD) return;
    if (isIframeFocused()) {
        event.preventDefault();
        event.stopPropagation();
        if (!postIframeInput("pointer", event)) resetFromIframeMode(event);
        return;
    }
    onSceneSelect(event);
}

function onTouchStart() {
    unlockDialogAudio();
}

function onSceneSelect(event: MouseEvent | PointerEvent) {
    if (ctx.isDialogOpen) {
        event.preventDefault();
        nextDialogLine();
        return;
    }

    const iframe = document.getElementById('iframeid');
    if (document.getElementById('scene')?.style.display != "") {
        if (isIframeFocused() && iframe) {
            const rect = iframe.getBoundingClientRect();
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            if (
                mouseX <= rect.left ||
                mouseX >= rect.right ||
                mouseY <= rect.top ||
                mouseY >= rect.bottom
            ) {
                resetFromIframeMode(event);
            }
            return;
        }

        updatePointerPosition(event);
        mouseUpdate();

        if (ctx.intersects.length > 0) {
            const ele = ctx.intersects[0];
            if (!ctx.anim && ctx.camera.zoom > 0.15) ctx.funcList[ele.name](ele);
        }
    }
}

function onWheel(event: WheelEvent) {
    const handled = postIframeInput("wheel", event, {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode
    });

    if (handled) {
        event.preventDefault();
        event.stopPropagation();
    }
}

function onIframeMessage(event: MessageEvent) {
    if (event.data === "close-iframe" && isIframeFocused()) {
        resetFromIframeMode();
    }
}

export function camReset(zlvl: any, ifAnim: boolean) {
    cameraController.reset(zlvl, ifAnim);
}

export function camFocus(target: THREE.Object3D) {
    cameraController.focus(target);
}

export function returnCameraFromFocus() {
    toggleEvents(true);
    cameraController.returnFromFocus();
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
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    window.addEventListener('pointerdown', onPointerDown, false);
    window.addEventListener('pointermove', onPointerMove, false);
    window.addEventListener('pointerup', onPointerUp, false);
    window.addEventListener('pointercancel', () => { pointerTapState = null; }, false);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    window.addEventListener('message', onIframeMessage);
}

export function processInput(delta: number) {
    if (ctx.isIframeOpen) return;

    cameraController.update(delta);
    mouseUpdate();
}
