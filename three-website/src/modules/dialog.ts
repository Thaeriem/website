import { ctx } from "../rendererContext";
import { toggleAnim } from "./input";
import type { DialogCharacter } from "../rendererContext";

// Cat character dialog with new structure
const catCharacter: DialogCharacter = {
    speaker: "Yash",
    text: [
        "I've been waiting here for someone to find me...",
        "This island holds many secrets, you know.",
    ],
    speed: [30], // Speed for each line in milliseconds per character
    color: "#d4af37"
};

export function initDialog(): void {
    // Create dialog HTML element with full-width bottom styling
    const dialogBox = document.createElement('div');
    dialogBox.id = 'dialog-box';
    dialogBox.className = 'dialog-box hvid';
    dialogBox.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        background: linear-gradient(to top, rgba(40, 30, 20, 0.95), rgba(60, 45, 30, 0.85));
        color: #f4e6d7;
        padding: 30px 40px;
        border-top: 4px solid #8b7355;
        border-image: linear-gradient(90deg, #8b7355, #a0926b, #8b7355) 1;
        box-shadow: 0 -8px 25px rgba(20, 15, 10, 0.9), inset 0 2px 0 rgba(160, 146, 107, 0.3);
        z-index: 1000;
        display: none;
        animation: slideUp 0.4s ease-out;
    `;

    // Create speaker name element
    const speakerElement = document.createElement('div');
    speakerElement.id = 'dialog-speaker';
    speakerElement.className = 'hvid';
    speakerElement.style.cssText = `
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8), 1px 1px 0px rgba(139, 115, 85, 0.6);
        filter: drop-shadow(0 0 8px rgba(160, 146, 107, 0.4));
    `;

    // Create text content element
    const textElement = document.createElement('div');
    textElement.id = 'dialog-text';
    textElement.className = 'hvid';
    textElement.style.cssText = `
        font-size: 20px;
        line-height: 1.6;
        margin-bottom: 20px;
        min-height: 60px;
        color: #f4e6d7;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
        padding: 10px;
        background: rgba(60, 45, 30, 0.3);
        border-radius: 2px;
    `;

    // Create progress indicator
    const progressElement = document.createElement('div');
    progressElement.id = 'dialog-progress';
    progressElement.className = 'hvid';
    progressElement.style.cssText = `
        font-size: 14px;
        color: #a0926b;
        text-align: center;
        font-style: italic;
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
        text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.6);
        opacity: 0.8;
    `;

    dialogBox.appendChild(speakerElement);
    dialogBox.appendChild(textElement);
    dialogBox.appendChild(progressElement);

    // Add enhanced CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { 
                opacity: 0; 
                transform: translateY(100%); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0); 
            }
        }
        @keyframes slideDown {
            from { 
                opacity: 1; 
                transform: translateY(0); 
            }
            to { 
                opacity: 0; 
                transform: translateY(100%); 
            }
        }
        .dialog-box.slide-out {
            animation: slideDown 0.4s ease-in forwards;
    }
    `;
    document.head.appendChild(style);

    document.body.appendChild(dialogBox);
    ctx.dialogElement = dialogBox;

    // Initialize enhanced dialog state
    ctx.isDialogOpen = false;
    ctx.currentDialogIndex = 0;
    ctx.currentLineIndex = 0;
    ctx.currentCharacter = null;
    ctx.isTyping = false;
    ctx.currentTypingIndex = 0;
}

export function openDialog(character: DialogCharacter): void {
    if (ctx.dialogElement && !ctx.isDialogOpen) {
        ctx.isDialogOpen = true;
        ctx.currentDialogIndex = 0;
        ctx.currentLineIndex = 0;
        ctx.currentCharacter = character;
        ctx.isTyping = false;
        ctx.currentTypingIndex = 0;
        
        ctx.dialogElement.style.display = 'block';
        ctx.dialogElement.classList.remove('slide-out');
        
        showCurrentDialogLine();
    }
}

export function openCatDialog(): void {
    openDialog(catCharacter);
}

function showCurrentDialogLine(): void {
    if (ctx.dialogElement && ctx.isDialogOpen && ctx.currentCharacter && ctx.currentLineIndex < ctx.currentCharacter.text.length) {
        const character = ctx.currentCharacter;
        const currentText = character.text[ctx.currentLineIndex];
        const currentSpeed = character.speed[ctx.currentLineIndex];
        
        // Update speaker name with character color
        const speakerElement = ctx.dialogElement.querySelector('#dialog-speaker') as HTMLElement;
        if (speakerElement) {
            speakerElement.textContent = character.speaker;
            speakerElement.style.color = character.color;
        }

        // Update progress indicator
        const progressElement = ctx.dialogElement.querySelector('#dialog-progress') as HTMLElement;
        if (progressElement) {
            progressElement.textContent = `[${ctx.currentLineIndex + 1}/${character.text.length}] Press SPACE to continue`;
        }

        // Start typing animation
        startTypingAnimation(currentText, currentSpeed);
    }
}

function startTypingAnimation(text: string, speed: number): void {
    const textElement = ctx.dialogElement?.querySelector('#dialog-text') as HTMLElement;
    if (!textElement) return;

    ctx.isTyping = true;
    ctx.currentTypingIndex = 0;
    textElement.innerHTML = '';

    const typeNextCharacter = () => {
        if (!ctx.isTyping || ctx.currentTypingIndex >= text.length) {
            // Typing completed
            ctx.isTyping = false;
            updateProgressIndicator();
            return;
        }

        const char = text[ctx.currentTypingIndex];
        textElement.innerHTML = text.substring(0, ctx.currentTypingIndex + 1);
        ctx.currentTypingIndex++;

        // Schedule next character with variable delay based on character type
        let delay = speed;
        if (char === '.' || char === '!' || char === '?') {
            delay *= 2; // Pause longer at sentence endings
        } else if (char === ',') {
            delay *= 1.5; // Pause slightly at commas
        }
        
        setTimeout(typeNextCharacter, delay);
    };

    typeNextCharacter();
}

function updateProgressIndicator(): void {
    if (!ctx.currentCharacter) return;
    
    const progressElement = ctx.dialogElement?.querySelector('#dialog-progress') as HTMLElement;
    if (progressElement) {
        progressElement.textContent = `[${ctx.currentLineIndex + 1}/${ctx.currentCharacter.text.length}] Press SPACE to continue`;
    }
}

export function nextDialogLine(): void {
    if (!ctx.isDialogOpen || !ctx.currentCharacter) return;

    // If currently typing, skip the animation
    if (ctx.isTyping) {
        ctx.isTyping = false;
        const textElement = ctx.dialogElement?.querySelector('#dialog-text') as HTMLElement;
        if (textElement) {
            const currentText = ctx.currentCharacter.text[ctx.currentLineIndex];
            textElement.innerHTML = currentText;
            textElement.classList.remove('typing-cursor');
            updateProgressIndicator();
        }
        return;
    }

    // Move to next dialog line
    ctx.currentLineIndex++;
    
    if (ctx.currentLineIndex >= ctx.currentCharacter.text.length) {
        toggleAnim(true);
        closeDialog();
    } else {
        showCurrentDialogLine();
    }
}

export function closeDialog(): void {
    if (ctx.dialogElement && ctx.isDialogOpen) {
        ctx.dialogElement.classList.add('slide-out');
        
        setTimeout(() => {
            if (ctx.dialogElement) {
                ctx.dialogElement.style.display = 'none';
                ctx.dialogElement.classList.remove('slide-out');
            }
            ctx.isDialogOpen = false;
            ctx.currentDialogIndex = 0;
            ctx.currentLineIndex = 0;
            ctx.currentCharacter = null;
            ctx.isTyping = false;
            ctx.currentTypingIndex = 0;
        }, 100);
    }
}