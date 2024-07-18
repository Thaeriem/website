// Setup
const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');
let simplex = new SimplexNoise();
let width, height;
const ampx = 0.03, ampy = 0.02;
let noiseOffset = 0;
const pixelSize = 10; 
const dotSize = 1.2; 
const coef = 1.4;
let cols, rows;
let opacities = [];
let hues = [];
let saturations = [];

const targetFPS = 12;
const frameTime = 1000 / targetFPS;
let lastFrameTime = 0;
const colorUpdateInterval = 24; 
const noiseSpeed = 0.03; 

// Track the column being updated
let currentColumn = 0;
const targetHue = 2;
const targetSaturation = 70;

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
        }
    }
}

function initColors() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) 
            hues[y * cols + x] = saturations[y * cols + x] = 0;
    }
}

// Initialize canvas and opacities
function initCanvas() {
    resizeCanvas();
    initOpacities(); 
    initColors(); 
    ctx.imageSmoothingEnabled = false;
}

// Update opacities based on Simplex Noise
function updateOpacities() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols - 1; x++) 
            opacities[y * cols + x] = opacities[y * cols + x + 1];
        opacities[y * cols + (cols - 1)] = generateNoise(cols - 1, y, noiseOffset, ampx, ampy);
    }
}

// Update hue and saturation sequentially
function updateColors(frameNumber) {
    if (frameNumber % colorUpdateInterval === 0) {
        console.log("UPDATE");

        // Transition to target hue and saturation for the current column
        for (let y = 0; y < rows; y++) {
            let currentHue = hues[y * cols + currentColumn] || 0;
            let currentSaturation = saturations[y * cols + currentColumn] || 0;
            
            // Transition towards target hue and saturation
            hues[y * cols + currentColumn] = Math.min(currentHue + 2, targetHue);
            saturations[y * cols + currentColumn] = Math.min(currentSaturation + 70, targetSaturation);
        }

        // Move to the next column, ensure we do not skip
        currentColumn = (currentColumn + 1) % cols;
    }
}

function norm(v, min, max) {
    return min + (v * (max - min));
}

// Draw dots to the canvas
function drawDots() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height); 

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const index = y * cols + x;
            const opacity = opacities[index];
            const hue = hues[index];
            const saturation = saturations[index];
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
        drawDots();
        noiseOffset += noiseSpeed; 
        lastFrameTime = timestamp;
    }
    requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    requestAnimationFrame(animate);
});
