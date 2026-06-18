import { clamp, domainWarp, fbm, hash3, seededPoint } from "./random";
import { colorFromPalette } from "./palettes";
import type { AsciiTheme, FieldContext, FieldSample } from "./types";

const emptySample: FieldSample = { char: " ", color: "transparent" };

type RopeParam = {
    anchor: number;
    scale: number;
    drift: number;
    swayAmp: number;
    swayFreq: number;
    swayPhase: number;
    noiseAmp: number;
    noiseFreq: number;
    noisePhase: number;
    width: number;
    beadFreq: number;
    beadSpeed: number;
    beadPhase: number;
};

type RopeRowParam = {
    center: number;
    width: number;
    bead: number;
    broken: number;
    branchPhase: number;
    drift: number;
    beadPhase: number;
    index: number;
};

type RopeFrame = {
    seed: number;
    rows: number;
    time: number;
    rowData: RopeRowParam[][];
    diagonalData: { phase: number; bend: number }[];
};

type ChamberParam = {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
};

const ropeCache = new Map<number, RopeParam[]>();
const chamberCache = new Map<number, ChamberParam[]>();
let ropeFrameCache: RopeFrame | null = null;

export const asciiThemes: AsciiTheme[] = [
    {
        id: "descent",
        label: "descent",
        note: "falling rope field / warm knots in the descent",
        glyphs: "  ...ooOO0/|",
        background: "#010101",
        sample: sampleDescent
    },
    {
        id: "lava",
        label: "lava",
        note: "lava lamp blobs / heat cells rise and split",
        glyphs: "  ..ooOO00@@",
        background: "#020101",
        sample: sampleLava
    },
    {
        id: "bloom",
        label: "bloom",
        note: "seeded dot clusters / pressure opens warm cells",
        glyphs: "  ..ooOO00",
        background: "#010101",
        sample: sampleBloom
    },
    {
        id: "veil",
        label: "veil",
        note: "warped curtains / memory thickens the folds",
        glyphs: "  ..::++**##",
        background: "#020207",
        sample: sampleVeil
    }
];

export function getAsciiTheme(id: string): AsciiTheme {
    return asciiThemes.find((theme) => theme.id === id) ?? asciiThemes[0];
}

function sampleDescent(context: FieldContext): FieldSample {
    const descentY = context.y + context.time * 0.052;
    const rope = ropeField(context, descentY);
    const chamber = chamberField(context.seed, context.time, context.x, fract(descentY * 0.82));
    const mist = cheapMist(context.x, descentY, context.seed);
    const deposit = context.pressure * 1.08 + context.memory * 0.5;
    const density = clamp(rope.value + mist * 0.12 - chamber * 0.72 + deposit, 0, 1.7);
    const sparse = hash3(context.col * 0.73, context.row * 1.37, context.seed + 31);

    if (density < 0.18 + sparse * 0.54) return empty();

    const spark = hash3(Math.floor(context.x * 64), Math.floor(descentY * 58), context.seed + 97);
    const pulse = ridge(fract(descentY * (8.5 + rope.index * 0.31) - context.time * 0.72 + rope.phase) - 0.5, 0.085);
    const hot = spark > 0.962 || (context.pressure > 0.38 && rope.value > 0.35);
    const connector = rope.tension > 0.66 && density < 0.82;
    const glyphs = hot ? "0O" : connector ? (rope.slope > 0 ? "//" : "\\\\") : density > 1.04 ? "OO0" : density > 0.68 ? "ooO" : "...o";
    return {
        char: pick(glyphs, density + sparse * 0.2 + pulse * 0.28),
        color: pickDescentColor(context, hot, density, pulse)
    };
}

function ropeField(context: FieldContext, descentY: number): { value: number; tension: number; slope: number; phase: number; index: number } {
    let value = 0;
    let tension = 0;
    let slope = 0;
    let phase = 0;
    let activeIndex = 0;
    const ropes = getRopeFrame(context.seed, context.rows, context.time);
    const rowRopes = ropes.rowData[context.row] ?? [];

    for (let index = 0; index < rowRopes.length; index += 1) {
        const rope = rowRopes[index];
        const width = rope.width;
        const distance = Math.abs(context.x - rope.center);
        const core = ridge(distance, width);
        const halo = ridge(distance, width * 4.4) * 0.34;
        const strand = (core * (0.62 + rope.bead * 0.52) + halo * (0.35 + rope.bead * 0.35)) * rope.broken;
        const branch = ridge(rope.branchPhase - 0.5, 0.055) * ridge(distance - width * 4, width * 5) * 0.5;
        const candidate = Math.max(strand, branch);

        if (candidate > value) {
            value = candidate;
            tension = clamp(core + rope.bead * 0.5 + branch, 0, 1);
            slope = rope.drift;
            phase = rope.beadPhase;
            activeIndex = rope.index;
        }
    }

    const diagonal = ropes.diagonalData[context.row] ?? { phase: fract(descentY * 5.5), bend: 0 };
    const diagonalStrand = ridge(fract(context.x * 4.2 + diagonal.phase + diagonal.bend) - 0.5, 0.035) * 0.36;
    if (diagonalStrand > value) {
        value = diagonalStrand;
        tension = diagonalStrand;
        slope = 0.5;
        phase = diagonal.phase;
        activeIndex = rowRopes.length;
    }

    return { value, tension, slope, phase, index: activeIndex };
}

function getRopeFrame(seed: number, rows: number, time: number): RopeFrame {
    if (ropeFrameCache?.seed === seed && ropeFrameCache.rows === rows && ropeFrameCache.time === time) {
        return ropeFrameCache;
    }

    const ropes = getRopes(seed);
    const rowMax = Math.max(1, rows - 1);
    const rowData: RopeRowParam[][] = [];
    const diagonalData: { phase: number; bend: number }[] = [];

    for (let row = 0; row < rows; row += 1) {
        const y = row / rowMax;
        const descentY = y + time * 0.052;
        const ropeRows: RopeRowParam[] = [];

        for (let index = 0; index < ropes.length; index += 1) {
            const rope = ropes[index];
            const localY = descentY * rope.scale + rope.beadPhase * 3;
            const sway = Math.sin(localY * rope.swayFreq + rope.swayPhase) * rope.swayAmp;
            const noise = Math.sin(localY * rope.noiseFreq + rope.noisePhase) * rope.noiseAmp;
            const center = rope.anchor + sway + noise + (fract(descentY * 0.42 + index * 0.17) - 0.5) * rope.drift * 0.14;
            const beadPhase = fract(descentY * rope.beadFreq - time * rope.beadSpeed + index * 0.13);
            const broken = hash3(Math.floor(descentY * 16), index, seed + 57) > 0.08 ? 1 : 0.28;

            ropeRows.push({
                center,
                width: rope.width,
                bead: ridge(beadPhase - 0.5, 0.13),
                broken,
                branchPhase: fract(descentY * 4.7 + index * 0.23 + time * 0.04),
                drift: rope.drift,
                beadPhase,
                index
            });
        }

        rowData.push(ropeRows);
        diagonalData.push({
            phase: descentY * 5.5,
            bend: Math.sin(y * 2.1 + descentY * 1.6 + seed * 0.0001) * 0.28
        });
    }

    ropeFrameCache = { seed, rows, time, rowData, diagonalData };
    return ropeFrameCache;
}

function getRopes(seed: number): RopeParam[] {
    const cached = ropeCache.get(seed);
    if (cached) return cached;

    const count = 11;
    const ropes: RopeParam[] = [];
    for (let index = 0; index < count; index += 1) {
        ropes.push({
            anchor: (index + 0.5) / count + (hash3(index, seed, 1.1) - 0.5) * 0.08,
            scale: 0.86 + hash3(index, seed, 2.7) * 0.38,
            drift: (hash3(index, seed, 3.2) - 0.5) * 0.34,
            swayAmp: 0.018 + hash3(index, seed, 5.9) * 0.055,
            swayFreq: 2.3 + hash3(index, seed, 4.1) * 2.4,
            swayPhase: index * 1.7,
            noiseAmp: 0.025 + hash3(index, seed, 6.8) * 0.045,
            noiseFreq: 0.8 + hash3(index, seed, 7.8) * 1.4,
            noisePhase: hash3(index, seed, 12.8) * Math.PI * 2,
            width: 0.007 + hash3(index, seed, 7.3) * 0.015,
            beadFreq: 10 + hash3(index, seed, 8.5) * 8,
            beadSpeed: 0.35 + hash3(index, seed, 11.2) * 0.45,
            beadPhase: hash3(index, seed, 9.4)
        });
    }

    ropeCache.set(seed, ropes);
    return ropes;
}

function pickDescentColor(context: FieldContext, hot: boolean, density: number, pulse: number): string {
    if (hot) {
        return colorFromPalette(context.palette, "hot", clamp(0.44 + density * 0.26 + context.pressure * 0.22, 0.44, 0.94), density * 10);
    }

    const role = density > 0.92 ? "bright" : density > 0.58 ? "mid" : "dim";
    return colorFromPalette(context.palette, role, clamp(0.14 + density * 0.56 + pulse * 0.18, 0.12, 0.88), density * 8);
}

function sampleBloom(context: FieldContext): FieldSample {
    let bloom = 0;
    for (let index = 0; index < 13; index += 1) {
        const point = seededPoint(context.seed, index);
        const pulse = Math.sin(context.time * (0.32 + index * 0.03) + index * 1.7) * 0.025;
        const radius = 0.035 + hash3(index, context.seed, 19.2) * 0.12 + pulse + context.memory * 0.08;
        bloom += ridge(Math.hypot(context.x - point.x, context.y - point.y) - radius, 0.035) * (0.42 + hash3(index, 2.2, context.seed) * 0.36);
    }

    const lattice = ridge(fbm(context.x * 8, context.y * 8, context.time * 0.06 + context.seed * 0.0001, 4), 0.32) * 0.22;
    const density = clamp(bloom + lattice + context.pressure * 1.2 + context.memory * 0.55, 0, 1.6);
    const sparse = hash3(context.col * 0.91, context.row * 0.83, context.seed + 73);

    if (density < 0.2 + sparse * 0.52) return empty();

    const warm = density > 1.08 || context.pressure > 0.28;
    const glyphs = warm ? "oO00" : density > 0.7 ? ".oOO" : "...o";
    return {
        char: pick(glyphs, density + sparse * 0.25),
        color: colorFromPalette(context.palette, warm ? "hot" : density > 0.76 ? "bright" : "mid", clamp(0.1 + density * 0.62, 0.08, 0.9), density * 18, warm ? context.pressure * 10 : -density * 16)
    };
}

function sampleLava(context: FieldContext): FieldSample {
    const upwardY = context.y - context.time * 0.045;
    const warped = domainWarp(
        context.x * 1.75 + Math.sin(upwardY * 5 + context.time * 0.45) * 0.05,
        upwardY * 2.35,
        context.seed * 0.00013 + context.time * 0.045,
        0.22
    );
    let blob = 0;

    for (let index = 0; index < 9; index += 1) {
        const baseX = 0.08 + hash3(index, context.seed, 12.4) * 0.84;
        const baseY = fract(hash3(index, context.seed, 31.2) + context.time * (0.025 + index * 0.002));
        const sway = Math.sin(context.time * (0.45 + index * 0.05) + index * 2.1 + upwardY * 4) * (0.035 + hash3(index, context.seed, 18.8) * 0.055);
        const radiusX = 0.045 + hash3(index, context.seed, 7.1) * 0.085;
        const radiusY = 0.075 + hash3(index, context.seed, 9.6) * 0.16;
        const dx = (warped.x - (baseX + sway)) / radiusX;
        const dy = shortestWrapDelta(warped.y, baseY) / radiusY;
        blob += ridge(Math.hypot(dx, dy), 1.2) * (0.42 + hash3(index, context.seed, 22.7) * 0.44);
    }

    const filament = ridge(Math.sin(warped.x * 9 + warped.y * 13 + context.time * 1.2), 0.22) * 0.22;
    const density = clamp(blob + filament + context.pressure * 1.1 + context.memory * 0.4, 0, 1.7);
    const sparse = hash3(context.col * 0.77, context.row * 1.19, context.seed + 167);

    if (density < 0.21 + sparse * 0.5) return empty();

    const hotCore = density > 1.08 || (sparse > 0.93 && density > 0.72);
    const glyphs = hotCore ? "0O@@00" : density > 0.78 ? "ooOO00" : "...oo";
    return {
        char: pick(glyphs, density + sparse * 0.22),
        color: colorFromPalette(
            context.palette,
            hotCore ? "hot" : density > 0.86 ? "accent" : "mid",
            clamp(0.1 + density * 0.62, 0.08, 0.92),
            density * 18,
            hotCore ? 8 : -10
        )
    };
}

function sampleVeil(context: FieldContext): FieldSample {
    const warped = domainWarp(context.x * 2.6, context.y * 1.9, context.time * 0.08 + context.seed * 0.0001, 0.2 + context.memory * 0.05);
    const ribbon = Math.sin(warped.x * 12 + fbm(warped.y * 5.4, context.time * 0.16, context.seed * 0.0001, 4) * 6 + context.time * 1.1);
    const fold = Math.cos((context.x - 0.5) * 10 + context.y * 8 - context.time * 0.85);
    const density = clamp(ridge(ribbon, 0.5) * 0.58 + ridge(fold, 0.3) * 0.22 + context.pressure * 1.05 + context.memory * 0.48, 0, 1.5);
    const sparse = hash3(context.col, context.row, context.seed + 101);

    if (density < 0.18 + sparse * 0.45) return empty();

    const hot = context.pressure > 0.34 && sparse > 0.66;
    const glyphs = hot ? "**##" : density > 0.9 ? "++**##" : "..::++";
    return {
        char: pick(glyphs, density + sparse * 0.2),
        color: colorFromPalette(context.palette, hot ? "hot" : density > 0.82 ? "accent" : "mid", clamp(0.09 + density * 0.6 + context.memory * 0.2, 0.07, 0.9), density * 16 + context.memory * 14, Math.sin(context.time + context.y * 8) * 12)
    };
}

function chamberField(seed: number, time: number, x: number, y: number): number {
    let mask = 0;
    const chambers = getChambers(seed);

    for (let index = 0; index < chambers.length; index += 1) {
        const chamber = chambers[index];
        const cy = fract(chamber.y + time * chamber.speed);
        const dx = Math.abs(x - chamber.x) - chamber.width;
        const dy = Math.abs(shortestWrapDelta(y, cy)) - chamber.height;
        mask = Math.max(mask, ridge(Math.max(dx, dy), 0.03));
    }
    return clamp(mask, 0, 1);
}

function getChambers(seed: number): ChamberParam[] {
    const cached = chamberCache.get(seed);
    if (cached) return cached;

    const chambers: ChamberParam[] = [];
    for (let index = 0; index < 9; index += 1) {
        const point = seededPoint(seed + 443, index);
        chambers.push({
            x: point.x,
            y: point.y,
            width: 0.045 + hash3(index, seed, 2.1) * 0.14,
            height: 0.05 + hash3(index, seed, 8.7) * 0.16,
            speed: 0.018 * (index % 2 === 0 ? 1 : -0.65)
        });
    }

    chamberCache.set(seed, chambers);
    return chambers;
}

function cheapMist(x: number, y: number, seed: number): number {
    const seedPhase = seed * 0.00013;
    const soft = Math.sin(x * 15.7 + y * 7.4 + seedPhase);
    const cross = Math.sin(x * 26.2 - y * 9.1 + seedPhase * 1.7);
    const slow = Math.cos((x + y) * 5.8 + seedPhase * 0.6);
    return clamp(0.5 + soft * 0.22 + cross * 0.18 + slow * 0.1, 0, 1);
}

function pick(glyphs: string, value: number): string {
    const index = clamp(Math.floor(value * glyphs.length), 0, glyphs.length - 1);
    return glyphs[index] ?? " ";
}

function empty(): FieldSample {
    return emptySample;
}

function ridge(value: number, width: number): number {
    return clamp(1 - Math.abs(value) / width, 0, 1);
}

function fract(value: number): number {
    return value - Math.floor(value);
}

function shortestWrapDelta(a: number, b: number): number {
    const diff = a - b;
    if (diff > 0.5) return diff - 1;
    if (diff < -0.5) return diff + 1;
    return diff;
}
