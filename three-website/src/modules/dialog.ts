import { ctx } from "../rendererContext";
import { toggleAnim } from "./input";

// Cat dialog lines
const catDialogLines = [
    "Meow! *purrs softly*",
    "I've been waiting here for someone to find me...",
    "This island holds many secrets, you know.",
    "Sometimes I see strange lights in the water at night.",
    "Would you like to stay and watch the sunset with me?",
    "*stretches and curls up contentedly*"
];

export function initDialog(): void {
    // Create dialog HTML element
    const dialogBox = document.createElement('div');
    dialogBox.id = 'dialog-box';
    dialogBox.className = 'dialog-box';
    dialogBox.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 80%;
        min-width: 400px;
        text-align: center;
        font-family: monospace;
        font-size: 16px;
        border: 2px solid #333;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: none;
        animation: fadeIn 0.3s ease-in;
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translateX(-50%) translateY(0); }
            to { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
        .dialog-box.fade-out {
            animation: fadeOut 0.3s ease-out forwards;
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(dialogBox);
    ctx.dialogElement = dialogBox;

    // Initialize dialog state
    ctx.isDialogOpen = false;
    ctx.currentDialogIndex = 0;
    ctx.dialogLines = [];
}

export function openDialog(lines: string[]): void {
    if (ctx.dialogElement && !ctx.isDialogOpen) {
        ctx.isDialogOpen = true;
        ctx.currentDialogIndex = 0;
        ctx.dialogLines = lines;
        
        ctx.dialogElement.style.display = 'block';
        ctx.dialogElement.classList.remove('fade-out');
        
        showCurrentDialogLine();
    }
}

export function openCatDialog(): void {
    openDialog(catDialogLines);
}

function showCurrentDialogLine(): void {
    if (ctx.dialogElement && ctx.isDialogOpen) {
        const currentLine = ctx.dialogLines[ctx.currentDialogIndex];
        const progressIndicator = `[${ctx.currentDialogIndex + 1}/${ctx.dialogLines.length}] Press SPACE to continue`;
        
        ctx.dialogElement.innerHTML = `
            <div style="margin-bottom: 10px; line-height: 1.4;">${currentLine}</div>
            <div style="font-size: 12px; color: #aaa;">${progressIndicator}</div>
        `;
    }
}

export function nextDialogLine(): void {
    if (ctx.isDialogOpen) {
        ctx.currentDialogIndex++;
        
        if (ctx.currentDialogIndex >= ctx.dialogLines.length) {
            toggleAnim(true);
            closeDialog();
        } else {
            showCurrentDialogLine();
        }
    }
}

export function closeDialog(): void {
    if (ctx.dialogElement && ctx.isDialogOpen) {
        ctx.dialogElement.classList.add('fade-out');
        
        setTimeout(() => {
            if (ctx.dialogElement) {
                ctx.dialogElement.style.display = 'none';
                ctx.dialogElement.classList.remove('fade-out');
            }
            ctx.isDialogOpen = false;
            ctx.currentDialogIndex = 0;
            ctx.dialogLines = [];
        }, 100);
    }
}