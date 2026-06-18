import { clamp } from "./random";
import type { AsciiPalette, PaletteColorRole } from "./types";

export const asciiPalettes: AsciiPalette[] = [
    {
        id: "red",
        label: "black/red",
        background: "#020000",
        ghost: { h: 0, s: 20, l: 5 },
        dim: { h: 358, s: 58, l: 13 },
        mid: { h: 0, s: 78, l: 27 },
        bright: { h: 2, s: 96, l: 60 },
        accent: { h: 356, s: 100, l: 50 },
        hot: { h: 12, s: 100, l: 64 },
        chrome: { h: 4, s: 100, l: 80 },
        muted: { h: 0, s: 20, l: 34 }
    },
    {
        id: "ember",
        label: "grey/orange",
        background: "#010101",
        ghost: { h: 190, s: 18, l: 12 },
        dim: { h: 188, s: 18, l: 22 },
        mid: { h: 182, s: 18, l: 36 },
        bright: { h: 170, s: 14, l: 58 },
        accent: { h: 22, s: 92, l: 45 },
        hot: { h: 18, s: 96, l: 58 },
        chrome: { h: 42, s: 88, l: 76 },
        muted: { h: 188, s: 8, l: 58 }
    },
    {
        id: "ultraviolet",
        label: "ultraviolet",
        background: "#03020a",
        ghost: { h: 240, s: 24, l: 12 },
        dim: { h: 246, s: 38, l: 22 },
        mid: { h: 258, s: 48, l: 40 },
        bright: { h: 282, s: 62, l: 68 },
        accent: { h: 205, s: 88, l: 60 },
        hot: { h: 318, s: 88, l: 64 },
        chrome: { h: 268, s: 88, l: 82 },
        muted: { h: 236, s: 16, l: 60 }
    }
];

let activePalette = asciiPalettes[1];

export function getActiveAsciiPalette(): AsciiPalette {
    return activePalette;
}

export function setActiveAsciiPalette(id: string): AsciiPalette {
    activePalette = asciiPalettes.find((palette) => palette.id === id) ?? activePalette;
    return activePalette;
}

export function colorFromPalette(
    palette: AsciiPalette,
    role: PaletteColorRole,
    alpha = 1,
    lightnessShift = 0,
    hueShift = 0
): string {
    const color = palette[role];
    return `hsla(${Math.round(color.h + hueShift)}, ${Math.round(color.s)}%, ${Math.round(clamp(color.l + lightnessShift, 0, 96))}%, ${clamp(alpha, 0, 1)})`;
}
