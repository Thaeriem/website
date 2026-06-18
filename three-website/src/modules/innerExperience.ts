import { ctx } from "../rendererContext";
import { AsciiInstallationRenderer } from "./ascii/renderer";
import type { LinkTarget, Vec2 } from "./ascii/types";
import { runAsciiPortalTransition } from "./asciiPortalTransition";
import { toggleControls } from "./input";

const links: LinkTarget[] = [
    { label: "email", href: "mailto:kauly.cs@gmail.com" },
    { label: "github", href: "https://github.com/Thaeriem" },
    { label: "linkedin", href: "https://www.linkedin.com/in/yash-kaul/" }
];

let rootElement: HTMLElement | null = null;
let canvasElement: HTMLCanvasElement | null = null;
let renderer: AsciiInstallationRenderer | null = null;
let previousControlsEnabled = true;
let isOpen = false;
let isClosing = false;
let exitPortalStarted = false;
let animationFrame = 0;
let startTime = performance.now();
let closingStartTime = 0;
let closingOrigin: Vec2 = { x: 0.04, y: 0.04 };
const closeBlackoutMs = 760;

export function initInnerExperience(): void {
    if (rootElement) return;

    injectInnerExperienceStyles();

    rootElement = document.createElement("section");
    rootElement.id = "inner-experience";
    rootElement.className = "inner-experience hvid";
    rootElement.setAttribute("aria-hidden", "true");
    rootElement.innerHTML = `
        <div class="inner-installation" data-installation>
            <canvas class="inner-canvas" data-inner-canvas></canvas>
        </div>
    `;

    canvasElement = rootElement.querySelector("[data-inner-canvas]");
    if (canvasElement) {
        renderer = new AsciiInstallationRenderer(canvasElement, {
            links,
            onClose: requestCloseInnerExperience,
            seedText: "yash-kaul-inner-descent-2026"
        });
    }

    rootElement.addEventListener("pointerdown", onPointerDown);
    rootElement.addEventListener("pointermove", onPointerMove);
    rootElement.addEventListener("pointerup", onPointerUp);
    rootElement.addEventListener("pointercancel", onPointerUp);
    rootElement.addEventListener("wheel", stopIslandEvent, { passive: false });
    window.addEventListener("resize", resizeRenderer);
    window.addEventListener("keydown", onKeyDown, true);
    document.body.appendChild(rootElement);

    resizeRenderer();
}

export function openInnerExperience(): void {
    initInnerExperience();
    if (!rootElement || isOpen) return;

    isClosing = false;
    exitPortalStarted = false;
    previousControlsEnabled = ctx.controls?.enabled ?? true;
    toggleControls(false);
    isOpen = true;
    startTime = performance.now();
    rootElement.setAttribute("aria-hidden", "false");
    rootElement.classList.add("is-open");
    document.documentElement.classList.remove("active");
    resizeRenderer();
    animate();
}

export function closeInnerExperience(): void {
    if (!rootElement || !isOpen) return;

    isOpen = false;
    isClosing = false;
    exitPortalStarted = false;
    rootElement.classList.remove("is-open");
    rootElement.setAttribute("aria-hidden", "true");
    toggleControls(previousControlsEnabled);
    cancelAnimationFrame(animationFrame);
}

export function isInnerExperienceOpen(): boolean {
    return isOpen;
}

export function requestCloseInnerExperience(origin: Vec2 = { x: 0.04, y: 0.04 }): void {
    if (!isOpen || isClosing) return;

    isClosing = true;
    exitPortalStarted = false;
    closingStartTime = performance.now();
    closingOrigin = origin;
}

function onPointerDown(event: PointerEvent): void {
    if (!rootElement?.classList.contains("is-open") || isClosing) return;
    stopIslandEvent(event);
    renderer?.setPointer(event, rootElement);
    renderer?.pointerDown();
}

function onPointerMove(event: PointerEvent): void {
    if (!rootElement?.classList.contains("is-open") || isClosing) return;
    stopIslandEvent(event);
    renderer?.setPointer(event, rootElement);
    renderer?.pointerMove();
}

function onPointerUp(event: PointerEvent): void {
    if (!rootElement?.classList.contains("is-open") || isClosing) return;
    stopIslandEvent(event);
    renderer?.setPointer(event, rootElement);
    renderer?.pointerUp();
}

function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen) return;

    if (event.code === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestCloseInnerExperience();
        return;
    }

    if (!isClosing && (renderer?.keyDown(event) || isIslandShortcut(event))) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}

function animate(): void {
    if (!isOpen) return;
    const time = (performance.now() - startTime) / 1000;

    if (isClosing) {
        const blackoutProgress = Math.min(1, (performance.now() - closingStartTime) / closeBlackoutMs);
        renderer?.renderBlackout(time, easeInOutCubic(blackoutProgress));
        if (blackoutProgress >= 1 && !exitPortalStarted) {
            exitPortalStarted = true;
            runAsciiPortalTransition({
                direction: "exit",
                origin: closingOrigin,
                startCovered: true,
                onCovered: closeInnerExperience
            });
        }
    } else {
        renderer?.render(time);
    }

    animationFrame = requestAnimationFrame(animate);
}

function resizeRenderer(): void {
    if (!rootElement) return;
    renderer?.resize(rootElement);
}

function stopIslandEvent(event: Event): void {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
}

function isIslandShortcut(event: KeyboardEvent): boolean {
    return [
        "Space",
        "KeyZ",
        "KeyW",
        "ArrowUp",
        "ArrowDown",
        "KeyS",
        "KeyA",
        "ArrowLeft",
        "KeyD",
        "ArrowRight",
        "F9"
    ].includes(event.code);
}

function easeInOutCubic(value: number): number {
    return value < 0.5
        ? 4 * value * value * value
        : 1 - ((-2 * value + 2) ** 3) / 2;
}

function injectInnerExperienceStyles(): void {
    if (document.getElementById("inner-experience-styles")) return;

    const style = document.createElement("style");
    style.id = "inner-experience-styles";
    style.textContent = `
        .inner-experience {
            position: fixed;
            inset: 0;
            z-index: 2200;
            display: block;
            color: #fff6dc;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
        }

        .inner-experience.is-open {
            pointer-events: auto;
            opacity: 1;
            visibility: visible;
        }

        .inner-installation {
            position: relative;
            height: 100vh;
            min-height: 100vh;
            overflow: hidden;
            background: #010101;
            touch-action: none;
            cursor: crosshair;
        }

        .inner-canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
        }
    `;
    document.head.appendChild(style);
}
