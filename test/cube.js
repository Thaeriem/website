const cubeElement = document.getElementById('cube');
let cols, rows;

function resizeCanvas() {
    const rect = document.documentElement.getBoundingClientRect();
    cols = Math.floor(rect.width / 10);
    rows = Math.floor(rect.height / 10);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const vertices = [
    [-1, -1, -1],
    [ 1, -1, -1],
    [ 1,  1, -1],
    [-1,  1, -1],
    [-1, -1,  1],
    [ 1, -1,  1],
    [ 1,  1,  1],
    [-1,  1,  1],
];

const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
];

let lastTime = 0;
let angleX = 0;
let angleY = 0;
let angleZ = 0;

const chars = '@#*••*#@';


function getCharForDistance(distance) {
    return chars[Math.floor(distance * (chars.length - 1))];
}

function rotateX(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
        x,
        y * cos - z * sin,
        y * sin + z * cos
    ];
}

function rotateY(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
        x * cos + z * sin,
        y,
        -x * sin + z * cos
    ];
}

function rotateZ(point, angle) {
    const [x, y, z] = point;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
        x * cos - y * sin,
        x * sin + y * cos,
        z
    ];
}

function project(point) {
    const [x, y, z] = point;
    const scale = 8 / (8 + z);
    return [
        Math.round(x * scale * 10) + Math.floor(cols / 2),
        Math.round(y * scale * 10) + Math.floor(rows / 2),
        scale
    ];
}

function draw() {
    const points = vertices.map(v => rotateX(rotateY(rotateZ(v, angleZ), angleY), angleX)).map(project);

    const canvas = Array.from({ length: rows }, () => Array(cols).fill(' '));

    edges.forEach(([i, j]) => {
        const [x0, y0, scale0] = points[i];
        const [x1, y1, scale1] = points[j];

        let x = x0, y = y0;
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (x >= 0 && x < cols && y >= 0 && y < rows) {
                const distance = Math.hypot(x - x0, y - y0) / Math.hypot(dx, dy);
                canvas[y][x] = getCharForDistance(distance);
            }
            if (x === x1 && y === y1) break;
            const e2 = err * 2;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    });

    cubeElement.textContent = canvas.map(row => row.join('')).join('\n');
}

const fps = 60;
const interval = 1000 / fps;


function animate(time) {
    if (!lastTime) lastTime = time;
    const deltaTime = time - lastTime;

    if (deltaTime >= interval) {
        lastTime = time - (deltaTime % interval);

        const rotationSpeed = 0.02; 

        angleX += rotationSpeed;
        angleY += rotationSpeed;

        draw();
    }
    
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
