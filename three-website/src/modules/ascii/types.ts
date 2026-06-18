export type Vec2 = {
    x: number;
    y: number;
};

export type AsciiThemeId = "descent" | "tide" | "bloom" | "veil";

export type PointerState = Vec2 & {
    cellX: number;
    cellY: number;
    down: boolean;
};

export type Deposit = Vec2 & {
    age: number;
    strength: number;
    mode: "hover" | "trace" | "memory";
};

export type FieldSample = {
    char: string;
    color: string;
};

export type FieldContext = {
    col: number;
    row: number;
    cols: number;
    rows: number;
    x: number;
    y: number;
    time: number;
    seed: number;
    pointer: PointerState;
    pressure: number;
    memory: number;
    palette: AsciiPalette;
};

export type AsciiTheme = {
    id: AsciiThemeId;
    label: string;
    note: string;
    glyphs: string;
    background: string;
    sample: (context: FieldContext) => FieldSample;
};

export type HitZone = {
    id: string;
    row: number;
    start: number;
    end: number;
};

export type LinkTarget = {
    label: string;
    href: string;
};

export type PaletteColorRole = "ghost" | "dim" | "mid" | "bright" | "accent" | "hot" | "chrome" | "muted";

export type HslColor = {
    h: number;
    s: number;
    l: number;
};

export type AsciiPalette = {
    id: string;
    label: string;
    background: string;
    ghost: HslColor;
    dim: HslColor;
    mid: HslColor;
    bright: HslColor;
    accent: HslColor;
    hot: HslColor;
    chrome: HslColor;
    muted: HslColor;
};
