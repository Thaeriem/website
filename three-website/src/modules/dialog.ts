import * as THREE from "three";
import { ctx } from "../rendererContext";
import { toggleAnim } from "./input";
import type { DialogCharacter } from "../rendererContext";

const DIALOG_DATA: Record<string, DialogCharacter> = {
    yash: {
        speaker: "Yash",
        text: [
            "I've been waiting here for someone to find me...",
            "This island holds many secrets, you know."
        ],
        speed: [24, 24],
        color: "#d4af37"
    }
};

const ANCHOR_OFFSET = new THREE.Vector3(0, 0.62, 0);
const anchorWorldPosition = new THREE.Vector3();
const anchorScreenPosition = new THREE.Vector3();

export function initDialog(): void {
    const dialogElement = document.createElement("div");
    dialogElement.id = "dialog-bubble";
    dialogElement.className = "dialog-bubble hvid";
    dialogElement.innerHTML = `
        <div id="dialog-speaker" class="dialog-speaker"></div>
        <div id="dialog-text" class="dialog-text"></div>
    `;

    const style = document.createElement("style");
    style.textContent = `
        .dialog-bubble {
            position: fixed;
            left: 0;
            top: 0;
            z-index: 1000;
            display: none;
            width: max-content;
            max-width: calc(100vw - 32px);
            color: #fff6dc;
            text-align: left;
            pointer-events: none;
            transform: translate3d(-9999px, -9999px, 0);
            filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.42));
            opacity: 0;
        }

        .dialog-bubble.is-open {
            opacity: 1;
            transition: opacity 180ms ease;
        }

        .dialog-bubble.is-closing {
            opacity: 0;
            transition: opacity 80ms ease;
        }

        .dialog-speaker {
            margin-bottom: 4px;
            font-size: 18px;
            line-height: 1;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
        }

        .dialog-text {
            display: inline-block;
            max-width: calc(100vw - 32px);
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
            font-size: 18px;
            line-height: 1.35;
            white-space: normal;
            overflow-wrap: anywhere;
            word-spacing: 0.18em;
            text-shadow: 0 2px 0 rgba(0, 0, 0, 0.82), 0 0 8px rgba(0, 0, 0, 0.7);
        }

        .dialog-char {
            display: inline-block;
            opacity: 0;
            transform: translateY(10px) scale(0.96);
            filter: blur(5px);
            animation: dialogCharIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            animation-delay: calc(var(--char-index) * var(--char-speed));
            will-change: opacity, transform, filter;
        }

        .dialog-text.is-complete .dialog-char {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
            animation: none;
        }

        .dialog-cursor {
            display: inline-block;
            width: 0.62em;
            margin-left: 0.12em;
            color: #fff6dc;
            opacity: 1;
            text-shadow: 0 2px 0 rgba(0, 0, 0, 0.82), 0 0 8px rgba(0, 0, 0, 0.7);
            animation: dialogCursorBlink 850ms steps(1, end) infinite;
        }

        @keyframes dialogCharIn {
            0% {
                opacity: 0;
                transform: translateY(10px) scale(0.96);
                filter: blur(5px);
            }
            65% {
                opacity: 1;
                transform: translateY(-2px) scale(1.02);
                filter: blur(0);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0);
            }
        }

        @keyframes dialogCursorBlink {
            0%, 49% {
                opacity: 1;
            }
            50%, 100% {
                opacity: 0;
            }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(dialogElement);

    ctx.dialogElement = dialogElement;
    ctx.isDialogOpen = false;
    ctx.dialogStatus = "idle";
    ctx.currentDialogIndex = 0;
    ctx.currentLineIndex = 0;
    ctx.currentCharacter = null;
    ctx.isTyping = false;
    ctx.currentTypingIndex = 0;
    ctx.dialogAdvanceTimer = null;
}

export function openDialog(char: string): void {
    const character = DIALOG_DATA[char];
    if (!character || !ctx.dialogElement || ctx.isDialogOpen) return;

    ctx.isDialogOpen = true;
    ctx.dialogStatus = "opening";
    ctx.currentDialogIndex = 0;
    ctx.currentLineIndex = 0;
    ctx.currentCharacter = character;
    ctx.currentTypingIndex = 0;
    ctx.dialogElement.style.display = "block";
    ctx.dialogElement.classList.remove("is-closing", "is-waiting");
    ctx.dialogElement.classList.add("is-open");
    updateDialogPosition();
    showCurrentDialogLine();
}

export function nextDialogLine(): void {
    if (!ctx.isDialogOpen || !ctx.currentCharacter) return;

    if (ctx.isTyping) {
        finishCurrentLine();
        return;
    }

    ctx.currentLineIndex++;

    if (ctx.currentLineIndex >= ctx.currentCharacter.text.length) {
        closeDialog();
    } else {
        showCurrentDialogLine();
    }
}

export function closeDialog(): void {
    if (!ctx.dialogElement || !ctx.isDialogOpen || ctx.dialogStatus === "closing") return;

    clearDialogTimer();
    ctx.dialogStatus = "closing";
    ctx.isTyping = false;
    ctx.dialogElement.classList.remove("is-open", "is-waiting");
    ctx.dialogElement.classList.add("is-closing");
    ctx.dialogElement.style.display = "none";
    ctx.dialogElement.classList.remove("is-closing");
    ctx.isDialogOpen = false;
    ctx.dialogStatus = "idle";
    ctx.currentDialogIndex = 0;
    ctx.currentLineIndex = 0;
    ctx.currentCharacter = null;
    ctx.currentTypingIndex = 0;
    ctx.dialogAdvanceTimer = null;
    toggleAnim(true);
}

export function updateDialogPosition(): void {
    if (!ctx.dialogElement || !ctx.isDialogOpen || !ctx.yashModel) return;

    ctx.yashModel.getWorldPosition(anchorWorldPosition);
    anchorWorldPosition.add(ANCHOR_OFFSET);
    anchorScreenPosition.copy(anchorWorldPosition).project(ctx.camera);

    const x = (anchorScreenPosition.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-anchorScreenPosition.y * 0.5 + 0.5) * window.innerHeight;
    const zoomScale = THREE.MathUtils.clamp(ctx.camera.zoom / 0.72, 0.82, 1.12);

    ctx.dialogElement.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%) translateY(-2px) scale(${zoomScale})`;
}

function showCurrentDialogLine(): void {
    if (!ctx.dialogElement || !ctx.currentCharacter) return;

    clearDialogTimer();
    ctx.dialogStatus = "typing";
    ctx.isTyping = true;
    ctx.currentTypingIndex = 0;
    ctx.dialogElement.classList.remove("is-waiting");

    const text = ctx.currentCharacter.text[ctx.currentLineIndex];
    const speed = ctx.currentCharacter.speed[ctx.currentLineIndex] ?? 24;
    const speakerElement = ctx.dialogElement.querySelector("#dialog-speaker") as HTMLElement | null;
    const textElement = ctx.dialogElement.querySelector("#dialog-text") as HTMLElement | null;

    if (speakerElement) {
        speakerElement.textContent = ctx.currentCharacter.speaker;
        speakerElement.style.color = ctx.currentCharacter.color;
    }
    if (!textElement) return;

    textElement.classList.remove("is-complete");
    textElement.style.setProperty("--char-speed", `${speed}ms`);
    textElement.innerHTML = "";

    Array.from(text).forEach((char, index) => {
        const span = document.createElement("span");
        span.className = "dialog-char";
        span.style.setProperty("--char-index", String(index));
        span.textContent = char === " " ? "\u00a0" : char;
        textElement.appendChild(span);
    });

    textElement.appendChild(createCursorElement());

    ctx.dialogAdvanceTimer = window.setTimeout(finishCurrentLine, text.length * speed + 430);
}

function finishCurrentLine(): void {
    if (!ctx.dialogElement || !ctx.currentCharacter) return;

    clearDialogTimer();
    ctx.isTyping = false;
    ctx.dialogStatus = "waiting";
    ctx.currentTypingIndex = ctx.currentCharacter.text[ctx.currentLineIndex].length;
    ctx.dialogElement.classList.add("is-waiting");

    const textElement = ctx.dialogElement.querySelector("#dialog-text") as HTMLElement | null;
    textElement?.classList.add("is-complete");
}

function createCursorElement(): HTMLElement {
    const cursor = document.createElement("span");
    cursor.className = "dialog-cursor";
    cursor.textContent = "_";
    return cursor;
}

function clearDialogTimer(): void {
    if (ctx.dialogAdvanceTimer !== null) {
        window.clearTimeout(ctx.dialogAdvanceTimer);
        ctx.dialogAdvanceTimer = null;
    }
}
