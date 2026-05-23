import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { MapControls } from "three/examples/jsm/controls/OrbitControls";
import { ctx } from "../rendererContext";

type MoveState = {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    rotateLeft: boolean;
    rotateRight: boolean;
};

const HOME_CAMERA = new THREE.Vector3(-200, 80, 0.000001);
const HOME_TARGET = new THREE.Vector3(0, 1, 0);
const IFRAME_TARGET = new THREE.Vector3(0, 0, 0);
const PAN_PIXELS_PER_SECOND = 1160;
const PAN_ZOOMED_OUT_MULTIPLIER = 0.78;
const PAN_ZOOMED_IN_MULTIPLIER = 1.5;
const PAN_SMOOTHING = 20;
const ROTATION_RADIANS_PER_SECOND = 1.8;
const ROTATION_SMOOTHING = 16;
const WORLD_X_AXIS = new THREE.Vector3(1, 0, 0);
const WORLD_Z_AXIS = new THREE.Vector3(0, 0, 1);

export class CameraController {
    readonly controls: MapControls;

    private readonly velocity = new THREE.Vector3();
    private readonly moveState: MoveState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        rotateLeft: false,
        rotateRight: false
    };
    private rotationVelocity = 0;

    constructor() {
        this.controls = new MapControls(ctx.camera, ctx.rendererCss.domElement);
        this.controls.target.copy(HOME_TARGET);
        this.controls.maxZoom = 1;
        this.controls.minZoom = 0.03;
        this.controls.zoomSpeed = 1.25;
        this.controls.panSpeed = 0.85;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
        this.controls.update();
    }

    handleKeyDown(code: string) {
        if (!this.controls.enabled) return false;

        switch (code) {
            case "KeyW":
            case "ArrowUp":
                this.moveState.forward = true;
                return true;
            case "KeyS":
            case "ArrowDown":
                this.moveState.backward = true;
                return true;
            case "KeyA":
            case "ArrowLeft":
                this.moveState.left = true;
                return true;
            case "KeyD":
            case "ArrowRight":
                this.moveState.right = true;
                return true;
            case "KeyQ":
            case "Comma":
                this.moveState.rotateLeft = true;
                return true;
            case "KeyE":
            case "Period":
                this.moveState.rotateRight = true;
                return true;
            default:
                return false;
        }
    }

    handleKeyUp(code: string) {
        switch (code) {
            case "KeyW":
            case "ArrowUp":
                this.moveState.forward = false;
                return true;
            case "KeyS":
            case "ArrowDown":
                this.moveState.backward = false;
                return true;
            case "KeyA":
            case "ArrowLeft":
                this.moveState.left = false;
                return true;
            case "KeyD":
            case "ArrowRight":
                this.moveState.right = false;
                return true;
            case "KeyQ":
            case "Comma":
                this.moveState.rotateLeft = false;
                return true;
            case "KeyE":
            case "Period":
                this.moveState.rotateRight = false;
                return true;
            default:
                return false;
        }
    }

    setEnabled(enable: boolean) {
        this.controls.enabled = enable;
        if (!enable) this.clearMovement();
    }

    reset(zoomLevel: number, focusIframe: boolean) {
        const target = focusIframe ? IFRAME_TARGET : HOME_TARGET;

        ctx.anim = true;
        setTimeout(() => {
            this.controls.saveState();
            ctx.anim = false;
        }, ctx.animTime);

        if (!focusIframe) {
            ctx.cssHolder.visible = false;
            this.controls.target.copy(HOME_TARGET);
            this.controls.update();
        }

        new TWEEN.Tween(this.controls.target)
            .to(target, ctx.animTime)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween(ctx.camera.position)
            .to(HOME_CAMERA, ctx.animTime)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween({ zoom: ctx.camera.zoom })
            .to({ zoom: zoomLevel }, ctx.animTime)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(({ zoom }) => {
                ctx.camera.zoom = zoom;
                ctx.camera.updateProjectionMatrix();
            })
            .onComplete(() => {
                if (focusIframe) {
                    ctx.cssHolder.visible = true;
                    this.setEnabled(false);
                } else if (!this.controls.enabled) {
                    this.setEnabled(true);
                }
            })
            .start();

        ctx.globalGroup.rotation.set(0, 0, 0);
        this.clearMovement();
        this.resetParticleGeometry();
    }

    focus(target: THREE.Object3D) {
        new TWEEN.Tween(this.controls.target)
            .to(target.position, ctx.animTime)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween({ zoom: ctx.camera.zoom })
            .to({ zoom: 1.5 }, ctx.animTime)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(({ zoom }) => {
                ctx.camera.zoom = zoom;
                ctx.camera.updateProjectionMatrix();
            })
            .start();

        ctx.globalGroup.rotation.set(0, 0, 0);
        this.clearMovement();
    }

    update(delta: number) {
        if (!this.controls.enabled) {
            return;
        }

        const inputX = Number(this.moveState.forward) - Number(this.moveState.backward);
        const inputZ = Number(this.moveState.right) - Number(this.moveState.left);
        const inputLength = Math.hypot(inputX, inputZ) || 1;
        const targetVelocity = new THREE.Vector3(
            (inputX / inputLength) * this.axisWorldUnitsPerSecond(WORLD_X_AXIS, PAN_PIXELS_PER_SECOND),
            0,
            (inputZ / inputLength) * this.axisWorldUnitsPerSecond(WORLD_Z_AXIS, PAN_PIXELS_PER_SECOND)
        );
        const panAlpha = 1 - Math.exp(-PAN_SMOOTHING * delta);

        this.velocity.lerp(targetVelocity, panAlpha);

        ctx.camera.position.addScaledVector(this.velocity, delta);
        this.controls.target.addScaledVector(this.velocity, delta);
        this.applyBounds();

        const rotationInput = Number(this.moveState.rotateLeft) - Number(this.moveState.rotateRight);
        const targetRotationVelocity = rotationInput * ROTATION_RADIANS_PER_SECOND;
        const rotationAlpha = 1 - Math.exp(-ROTATION_SMOOTHING * delta);
        this.rotationVelocity = THREE.MathUtils.lerp(this.rotationVelocity, targetRotationVelocity, rotationAlpha);
        const rotationDelta = this.rotationVelocity * delta;
        ctx.globalGroup.rotateY(rotationDelta);
        this.rotateParticleGeometry(rotationDelta);

        this.controls.update();
    }

    private applyBounds() {
        const previousX = ctx.camera.position.x;
        const previousZ = ctx.camera.position.z;
        ctx.camera.position.x = THREE.MathUtils.clamp(ctx.camera.position.x, ctx.cameraBounds.minX, ctx.cameraBounds.maxX);
        ctx.camera.position.z = THREE.MathUtils.clamp(ctx.camera.position.z, ctx.cameraBounds.minZ, ctx.cameraBounds.maxZ);

        const deltaX = ctx.camera.position.x - previousX;
        const deltaZ = ctx.camera.position.z - previousZ;
        if (deltaX !== 0) {
            this.controls.target.x += deltaX;
            this.velocity.x = 0;
        }
        if (deltaZ !== 0) {
            this.controls.target.z += deltaZ;
            this.velocity.z = 0;
        }
    }

    private clearMovement() {
        this.moveState.forward = false;
        this.moveState.backward = false;
        this.moveState.left = false;
        this.moveState.right = false;
        this.moveState.rotateLeft = false;
        this.moveState.rotateRight = false;
        this.velocity.set(0, 0, 0);
        this.rotationVelocity = 0;
    }

    private axisWorldUnitsPerSecond(axis: THREE.Vector3, screenPixelsPerSecond: number) {
        const target = this.controls.target;
        const projectedStart = target.clone().project(ctx.camera);
        const projectedEnd = target.clone().add(axis).project(ctx.camera);
        const pixelsPerWorldUnit = Math.hypot(
            (projectedEnd.x - projectedStart.x) * window.innerWidth * 0.5,
            (projectedEnd.y - projectedStart.y) * window.innerHeight * 0.5
        );

        if (pixelsPerWorldUnit <= 0.0001) return 0;
        return (screenPixelsPerSecond * this.panZoomMultiplier()) / pixelsPerWorldUnit;
    }

    private panZoomMultiplier() {
        const range = this.controls.maxZoom - this.controls.minZoom;
        const normalizedZoom = THREE.MathUtils.clamp((ctx.camera.zoom - this.controls.minZoom) / range, 0, 1);
        const curvedZoom = THREE.MathUtils.smoothstep(normalizedZoom, 0, 1) ** 1.35;
        return THREE.MathUtils.lerp(PAN_ZOOMED_OUT_MULTIPLIER, PAN_ZOOMED_IN_MULTIPLIER, curvedZoom);
    }

    private resetParticleGeometry() {
        ctx.smokeParticles.geometry.copy(ctx.osp);
        ctx.fireParticles.geometry.copy(ctx.ofp);
        ctx.smokeParticles.instanceMatrix.needsUpdate = true;
        ctx.fireParticles.instanceMatrix.needsUpdate = true;
    }

    private rotateParticleGeometry(rotation: number) {
        ctx.dummyMat = new THREE.Matrix4().makeRotationY(-rotation);
        ctx.smokeParticles.geometry.applyMatrix4(ctx.dummyMat);
        ctx.fireParticles.geometry.applyMatrix4(ctx.dummyMat);
        ctx.smokeParticles.geometry.computeVertexNormals();
        ctx.fireParticles.geometry.computeVertexNormals();
    }
}
