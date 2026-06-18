import { clamp, hash3, hashStringToSeed } from "./ascii/random";
import type { Vec2 } from "./ascii/types";

type PortalDirection = "enter" | "exit";

type PortalOptions = {
    direction: PortalDirection;
    origin: Vec2;
    startCovered?: boolean;
    onCovered?: () => void;
    onDone?: () => void;
};

type PortalRuntime = {
    cancel: () => void;
};

let activePortal: PortalRuntime | null = null;

const seed = hashStringToSeed("yash-ascii-portal-ripple-2026");

export function runAsciiPortalTransition(options: PortalOptions): void {
    activePortal?.cancel();

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
        options.onCovered?.();
        options.onDone?.();
        return;
    }

    canvas.className = "ascii-portal-transition";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2600",
        width: "100vw",
        height: "100vh",
        pointerEvents: "auto"
    });

    document.body.appendChild(canvas);

    let width = 1;
    let height = 1;
    let cellWidth = 10;
    let cellHeight = 17;
    let cols = 1;
    let rows = 1;
    let frameId = 0;
    let coveredTimeout = 0;
    let finishTimeout = 0;
    let coveredCalled = false;
    let cancelled = false;
    const startTime = performance.now();
    const coverMs = options.startCovered ? 0 : options.direction === "enter" ? 860 : 700;
    const revealMs = options.direction === "enter" ? 380 : 720;

    const resize = () => {
        width = Math.max(1, window.innerWidth);
        height = Math.max(1, window.innerHeight);
        const targetColumns = 150;
        const targetCellWidth = Math.max(3, width / targetColumns);
        cellHeight = clamp(Math.round(targetCellWidth / 0.62), 5, 19);
        context.font = `${cellHeight}px input, monospace`;
        cellWidth = Math.max(3, Math.ceil(context.measureText("0").width));
        cols = Math.max(1, Math.ceil(width / cellWidth));
        rows = Math.max(1, Math.ceil(height / cellHeight));
        canvas.width = width;
        canvas.height = height;
    };

    const finish = () => {
        if (cancelled) return;
        cancelled = true;
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(frameId);
        clearTimeout(coveredTimeout);
        clearTimeout(finishTimeout);
        canvas.remove();
        if (!coveredCalled) options.onCovered?.();
        options.onDone?.();
        if (activePortal?.cancel === cancel) activePortal = null;
    };

    const cancel = () => {
        cancelled = true;
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(frameId);
        clearTimeout(coveredTimeout);
        clearTimeout(finishTimeout);
        canvas.remove();
    };

    const callCovered = () => {
        if (coveredCalled) return;
        coveredCalled = true;
        options.onCovered?.();
    };

    const animate = (now: number) => {
        if (cancelled) return;

        const elapsed = now - startTime;
        const coverProgress = options.startCovered ? 1 : clamp(elapsed / coverMs, 0, 1);
        const revealProgress = clamp((elapsed - coverMs) / revealMs, 0, 1);
        canvas.dataset.portalProgress = `${Math.round(coverProgress * 1000) / 1000}:${Math.round(revealProgress * 1000) / 1000}`;
        canvas.dataset.portalDirection = options.direction;

        drawPortalFrame(context, {
            cols,
            rows,
            cellWidth,
            cellHeight,
            width,
            height,
            origin: options.origin,
            direction: options.direction,
            coverProgress: easeOutCubic(coverProgress),
            revealProgress: options.direction === "exit" ? revealProgress : easeInOutCubic(revealProgress),
            time: (now - startTime) / 1000
        });
        if (options.startCovered || coverProgress >= (options.direction === "exit" ? 0.985 : 0.88)) callCovered();

        if (elapsed >= coverMs + revealMs) {
            finish();
            return;
        }

        frameId = requestAnimationFrame(animate);
    };

    activePortal = { cancel };
    resize();
    window.addEventListener("resize", resize);
    if (!options.startCovered) {
        coveredTimeout = window.setTimeout(callCovered, coverMs * (options.direction === "exit" ? 0.985 : 0.88));
    }
    finishTimeout = window.setTimeout(finish, coverMs + revealMs + 120);
    frameId = requestAnimationFrame(animate);
}

function drawPortalFrame(
    context: CanvasRenderingContext2D,
    options: {
        cols: number;
        rows: number;
        cellWidth: number;
        cellHeight: number;
        width: number;
        height: number;
        origin: Vec2;
        direction: PortalDirection;
        coverProgress: number;
        revealProgress: number;
        time: number;
    }
): void {
    context.clearRect(0, 0, options.width, options.height);
    context.font = `${options.cellHeight}px input, monospace`;
    context.textAlign = "left";
    context.textBaseline = "top";

    const colMax = Math.max(1, options.cols - 1);
    const rowMax = Math.max(1, options.rows - 1);
    const aspect = options.width / Math.max(1, options.height);
    const maxDistance = farthestCornerDistance(options.origin, aspect);
    for (let row = 0; row < options.rows; row += 1) {
        const y = row / rowMax;
        for (let col = 0; col < options.cols; col += 1) {
            const x = col / colMax;
            const noise = hash3(col * 0.91, row * 1.17, seed + 19);
            const flicker = Math.sin(options.time * 5 + col * 0.13 + row * 0.09) * 0.035;
            const threshold = portalCoverThreshold({
                direction: options.direction,
                x,
                y,
                origin: options.origin,
                aspect,
                maxDistance,
                noise,
                flicker,
                time: options.time
            });
            const revealThreshold = portalRevealThreshold({
                direction: options.direction,
                x,
                y,
                origin: options.origin,
                aspect,
                maxDistance,
                noise,
                flicker,
                time: options.time
            });
            const coverage = getCellCoverage(options.direction, threshold, revealThreshold, options.coverProgress, options.revealProgress, noise);
            if (coverage <= 0.025) continue;

            const edge = clamp(1 - Math.abs(options.coverProgress - threshold) * 7, 0, 1);
            const density = clamp(options.coverProgress + edge * 0.45 + noise * 0.2, 0, 1);
            const glyph = options.direction === "exit" ? "@" : pickPortalGlyph(density, edge, noise);
            drawBlackPortalCell(context, options, col, row, glyph, coverage, density, edge);
        }
    }
}

function portalCoverThreshold(options: {
    direction: PortalDirection;
    x: number;
    y: number;
    origin: Vec2;
    aspect: number;
    maxDistance: number;
    noise: number;
    flicker: number;
    time: number;
}): number {
    if (options.direction === "exit") {
        const distance = Math.hypot((options.x - options.origin.x) * options.aspect, options.y - options.origin.y) / options.maxDistance;
        const crawl = Math.sin((options.x + options.y) * 13 + options.time * 2.2) * 0.035;
        return clamp(distance * 0.62 + options.noise * 0.38 + crawl + options.flicker, 0, 1);
    }

    const distance = Math.hypot((options.x - options.origin.x) * options.aspect, options.y - options.origin.y) / options.maxDistance;
    return clamp(distance + (options.noise - 0.5) * 0.18 + options.flicker, 0, 1);
}

function portalRevealThreshold(options: {
    direction: PortalDirection;
    x: number;
    y: number;
    origin: Vec2;
    aspect: number;
    maxDistance: number;
    noise: number;
    flicker: number;
    time: number;
}): number {
    if (options.direction === "enter") return options.noise;

    const slowBand = Math.sin(options.x * 7 + options.y * 5 + options.time * 1.2) * 0.04;
    return clamp(options.noise * 0.9 + options.y * 0.1 + slowBand + options.flicker, 0, 1);
}

function getCellCoverage(
    direction: PortalDirection,
    coverThreshold: number,
    revealThreshold: number,
    coverProgress: number,
    revealProgress: number,
    noise: number
): number {
    const coverSoftness = direction === "enter" ? 0.09 : 0.075;
    const revealSoftness = direction === "enter" ? 0.11 : 0.08;
    const coverAlpha = smoothstep(coverThreshold - coverSoftness, coverThreshold + coverSoftness, coverProgress);

    if (revealProgress <= 0) return coverAlpha;

    if (direction === "enter") {
        const revealAlpha = 1 - smoothstep(noise - revealSoftness, noise + revealSoftness, revealProgress * 0.96);
        return coverAlpha * revealAlpha;
    }

    if (revealProgress >= 0.985) return 0;

    const tailBias = clamp(revealProgress * 1.045, 0, 1);
    return smoothstep(revealThreshold + revealSoftness, revealThreshold - revealSoftness, tailBias);
}

function drawBlackPortalCell(
    context: CanvasRenderingContext2D,
    options: {
        cellWidth: number;
        cellHeight: number;
    },
    col: number,
    row: number,
    glyph: string,
    coverage: number,
    density: number,
    edge: number
): void {
    const x = col * options.cellWidth;
    const y = row * options.cellHeight;
    const cellAlpha = clamp(coverage, 0, 1);

    context.fillStyle = `rgba(0, 0, 0, ${cellAlpha})`;
    context.fillRect(x, y, options.cellWidth + 0.5, options.cellHeight + 0.5);

    const glyphAlpha = clamp(cellAlpha * (0.18 + edge * 0.18 + density * 0.12), 0, 0.48);
    if (!glyph || glyphAlpha <= 0.02) return;

    context.fillStyle = `rgba(22, 22, 22, ${glyphAlpha})`;
    context.fillText(glyph, x, y);
}

function pickPortalGlyph(density: number, edge: number, noise: number): string {
    if (edge > 0.55) return pick("..//oo00", density + noise * 0.2);
    if (density > 0.92) return pick("00O#@", density + noise * 0.08);
    if (density > 0.68) return pick("ooO0//", density + noise * 0.12);
    if (density > 0.42) return pick("..o//", density + noise * 0.16);
    return pick(" .:", density + noise * 0.2);
}

function pick(glyphs: string, value: number): string {
    const index = clamp(Math.floor(value * glyphs.length), 0, glyphs.length - 1);
    return glyphs[index] ?? " ";
}

function smoothstep(edge0: number, edge1: number, value: number): number {
    if (edge0 === edge1) return value < edge0 ? 0 : 1;
    const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return amount * amount * (3 - 2 * amount);
}

function farthestCornerDistance(origin: Vec2, aspect: number): number {
    return Math.max(
        Math.hypot((0 - origin.x) * aspect, 0 - origin.y),
        Math.hypot((1 - origin.x) * aspect, 0 - origin.y),
        Math.hypot((0 - origin.x) * aspect, 1 - origin.y),
        Math.hypot((1 - origin.x) * aspect, 1 - origin.y)
    );
}

function easeOutCubic(value: number): number {
    return 1 - (1 - value) ** 3;
}

function easeInOutCubic(value: number): number {
    return value < 0.5
        ? 4 * value * value * value
        : 1 - ((-2 * value + 2) ** 3) / 2;
}
