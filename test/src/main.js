// Setup
const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');
let simplex = new SimplexNoise();
let width, height;
const ampx = 0.03, ampy = 0.02;
let noiseOffset = 0;
const pixelSize = 12; 
const dotSize = 1.2; 
const coef = 1.4;
let cols, rows;
let opacities = [];
let mask = [];
let cVal = [];
const color1 = "f4d941";
const color2 = "e62314";
let colors = [];

const targetFPS = 12;
const frameTime = 1000 / targetFPS;
let lastFrameTime = 0;
const colorUpdateInterval = 2; 
const noiseSpeed = 0.03; 

// Track the column being updated
const tHue = 0;
const tSat = 100;
const decayFactor = 0.3; 
const spreadFactor = 1.5;
const impactRadius = 30; 
const spawn = 0.15;

// Initialize canvas size
function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cols = Math.floor(width / pixelSize);
    rows = Math.floor(height / pixelSize);
    initOpacities();
    initColors();
}

// Generate noise value using Simplex Noise
function generateNoise(x, y, offset, ampx, ampy) {
    return (simplex.noise2D(x * ampx + offset, y * ampy) + 1) / 2;
}

// Initialize opacities array with Simplex Noise values
function initOpacities() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            opacities[y * cols + x] = generateNoise(x, y, noiseOffset, ampx, ampy);
            mask[y * cols + x] = 0;
        }
    }
}

function initColors() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) cVal[y * cols + x] = 0;
    }
}

// Initialize canvas and opacities
function initCanvas() {
    resizeCanvas();
    colors = generateGradient(color1, color2, width / pixelSize)
    ctx.imageSmoothingEnabled = false;
}

// Update opacities based on Simplex Noise
function updateOpacities() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols - 1; x++) opacities[y * cols + x] = opacities[y * cols + x + 1];
        opacities[y * cols + (cols - 1)] = generateNoise(cols - 1, y, noiseOffset, ampx, ampy);
    }
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function hexToHSL(hex) {
    // Convert hex to RGB
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);

    // Convert RGB to HSL
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s * 100, l * 100];
}

function generateGradient(color1, color2, n) {
    let [h1, s1, l1] = hexToHSL(color1);
    let [h2, s2, l2] = hexToHSL(color2);
    let gradient = [];

    for (let i = 0; i < n; i++) {
        let t = i / (n - 1);
        let h = lerp(h1, h2, t);
        let s = lerp(s1, s2, t);
        let l = lerp(l1, l2, t);
        gradient.push([h, s, l]);
    }
    console.log(gradient)
    return gradient;
}

// Update hue and saturation sequentially
function updateColors(frameNumber) {
    if (frameNumber % colorUpdateInterval === 0) {
        let vals = [];
        
        // Random chance for any index on the leftmost side to turn to 1
        for (let y = 0; y < rows; y++) {
            if (Math.random() <= spawn && !cVal[y * cols]) {
                vals.push([y, 0]);
            }
        }

        // Check the four neighbors and update the current square
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (!cVal[y * cols + x]) {
                    let val = 0;
                    if (x > 0 && cVal[y * cols + (x - 1)] 
                        && Math.random()*spreadFactor > opacities[y * cols + x]) val = 1; 
                    if (x < cols - 1 && cVal[y * cols + (x + 1)]
                        && Math.random()*spreadFactor > opacities[y * cols + x]) val = 1; 
                    if (y > 0 && cVal[(y - 1) * cols + x]
                        && Math.random()*spreadFactor > opacities[y * cols + x]) val = 1;
                    if (y < rows - 1 && cVal[(y + 1) * cols + x]
                        && Math.random()*spreadFactor > opacities[y * cols + x]) val = 1; 
                    if (val) vals.push([y, x]);
                }
            }
        }

        // Update cVal array
        for (let i = 0; i < vals.length; i++) {
            cVal[vals[i][0] * cols + vals[i][1]] = 1;
        }
    }
}

function norm(v, min, max) {
    return min + (v * (max - min));
}

// Update mask values to lerp back to 0
function updateMaskValues() {
    for (let i = 0; i < mask.length; i++) {
        if (mask[i] > 0) {
            mask[i] *= decayFactor;
            if (mask[i] < 0.01) mask[i] = 0; 
        }
    }
}

// Update mask based on mouse position
function updateMask(mouseX, mouseY) {
    const col = Math.floor(mouseX / pixelSize);
    const row = Math.floor(mouseY / pixelSize);

    for (let y = row - impactRadius; y <= row + impactRadius; y++) {
        for (let x = col - impactRadius; x <= col + impactRadius; x++) {
            if (x >= 0 && x < cols && y >= 0 && y < rows) {
                const distance = Math.sqrt((x - col) ** 2 + (y - row) ** 2);
                if (distance <= impactRadius) {
                    mask[y * cols + x] = Math.max(mask[y * cols + x], 1 - distance / impactRadius);
                }
            }
        }
    }
}

// Draw dots to the canvas
function drawDots() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height); 

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const index = y * cols + x;
            const opacity = opacities[index] + mask[index];
            const hue =  cVal[index] * colors[x][0];
            const saturation =  cVal[index] * colors[x][1];
            const lightness = Math.floor(norm(opacity, 10, 60)); 
            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

            ctx.fillRect(
                x * pixelSize + (pixelSize - dotSize) / 2, // Center X
                y * pixelSize + (pixelSize - dotSize) / 2, // Center Y
                dotSize * (1 + opacity) * coef,            // Width
                dotSize * (1 + opacity) * coef             // Height
            );
        }
    }
}

// Animation loop
function animate(timestamp) {
    if (timestamp - lastFrameTime > frameTime) {
        updateOpacities();
        updateColors(Math.floor(timestamp / frameTime));
        updateMaskValues(); // Update mask values each frame
        drawDots();
        noiseOffset += noiseSpeed; 
        lastFrameTime = timestamp;
    }
    requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    updateMask(mouseX, mouseY);
});
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    requestAnimationFrame(animate);
});
