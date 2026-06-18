import { clamp, hash3, hashStringToSeed } from "./random";
import { asciiThemes, getAsciiTheme } from "./themes";
import { asciiPalettes, colorFromPalette, getActiveAsciiPalette, setActiveAsciiPalette } from "./palettes";
import type { AsciiPalette, AsciiTheme, AsciiThemeId, Deposit, FieldContext, FieldSample, HitZone, LinkTarget, PointerState, Vec2 } from "./types";

type RendererOptions = {
    onClose: (origin?: Vec2) => void;
    links: LinkTarget[];
    seedText?: string;
};

type TransitionMode = "dither" | "radial" | "wipe" | "ripple";

type RenderState = {
    theme: AsciiTheme;
};

type StateTransition = {
    from: RenderState;
    to: RenderState;
    startTime: number;
    duration: number;
    mode: TransitionMode;
};

const transitionModes: TransitionMode[] = ["dither", "radial", "wipe", "ripple"];

export class AsciiInstallationRenderer {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private onClose: (origin?: Vec2) => void;
    private links: LinkTarget[];
    private theme: AsciiTheme = getAsciiTheme("descent");
    private palette: AsciiPalette = getActiveAsciiPalette();
    private transition: StateTransition | null = null;
    private transitionModeIndex = 0;
    private renderTime = 0;
    private width = 1;
    private height = 1;
    private pixelRatio = 1;
    private cellWidth = 12;
    private cellHeight = 18;
    private cols = 1;
    private rows = 1;
    private pointer: PointerState = { x: 0.5, y: 0.5, cellX: 0, cellY: 0, down: false };
    private deposits: Deposit[] = [];
    private pressureField = new Float32Array(0);
    private memoryField = new Float32Array(0);
    private hitZones: HitZone[] = [];
    private statusLine = "hover to lightly disturb the field";
    private seed: number;
    private lastTraceCell = "";
    private averageRenderMs = 0;
    private perfFrame = 0;
    private readonly fieldContext: FieldContext = {
        col: 0,
        row: 0,
        cols: 1,
        rows: 1,
        x: 0,
        y: 0,
        time: 0,
        seed: 0,
        pointer: this.pointer,
        pressure: 0,
        memory: 0,
        palette: this.palette
    };

    constructor(canvas: HTMLCanvasElement, options: RendererOptions) {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("ASCII renderer requires a 2D canvas context.");

        this.canvas = canvas;
        this.context = context;
        this.onClose = options.onClose;
        this.links = options.links;
        this.seed = hashStringToSeed(options.seedText ?? "yash-inner-ascii-descent-v1");
    }

    resize(root: HTMLElement): void {
        const rect = root.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width || window.innerWidth));
        this.height = Math.max(1, Math.floor(rect.height || window.innerHeight));
        this.pixelRatio = 1;
        this.cellHeight = this.width < 700 ? 14 : this.width > 1600 ? 19 : 17;
        this.context.font = `${this.cellHeight}px input, monospace`;
        this.cellWidth = Math.max(Math.ceil(this.context.measureText("0").width), Math.round(this.cellHeight * 0.6));
        this.cols = Math.max(1, Math.floor(this.width / this.cellWidth));
        this.rows = Math.max(1, Math.floor(this.height / this.cellHeight));
        this.ensureFieldBuffers();
        this.canvas.width = Math.floor(this.width * this.pixelRatio);
        this.canvas.height = Math.floor(this.height * this.pixelRatio);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
    }

    setPointer(event: PointerEvent, root: HTMLElement): void {
        const rect = root.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        this.pointer.x = clamp(localX / rect.width, 0, 1);
        this.pointer.y = clamp(localY / rect.height, 0, 1);
        this.pointer.cellX = clamp(Math.floor(localX / this.cellWidth), 0, this.cols - 1);
        this.pointer.cellY = clamp(Math.floor(localY / this.cellHeight), 0, this.rows - 1);
    }

    pointerDown(): void {
        const hit = this.hitZones.find((zone) => (
            this.pointer.cellY === zone.row
            && this.pointer.cellX >= zone.start
            && this.pointer.cellX <= zone.end
        ));

        if (hit) {
            this.handleHit(hit.id);
            return;
        }

        this.pointer.down = true;
        this.lastTraceCell = `${this.pointer.cellX}:${this.pointer.cellY}`;
    }

    pointerMove(): void {
        const hoverCell = `${this.pointer.cellX}:${this.pointer.cellY}`;
        if (hoverCell === this.lastTraceCell) return;
        this.lastTraceCell = hoverCell;
        this.addDeposit("hover", 0.075);
    }

    pointerUp(): void {
        this.pointer.down = false;
        this.lastTraceCell = "";
    }

    keyDown(event: KeyboardEvent): boolean {
        if (event.key === "Tab") {
            this.cycleTransitionMode();
            return true;
        }

        const index = Number(event.key) - 1;
        if (index >= 0 && index < asciiThemes.length) {
            this.switchTheme(asciiThemes[index].id);
            return true;
        }

        const paletteIndex = Number(event.key) - 6;
        if (paletteIndex >= 0 && paletteIndex < asciiPalettes.length) {
            this.switchPalette(asciiPalettes[paletteIndex].id);
            return true;
        }

        return false;
    }

    render(time: number): void {
        const renderStart = performance.now();
        this.renderTime = time;
        this.updateDeposits();
        this.buildDepositFields();
        this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        this.context.fillStyle = this.palette.background;
        this.context.fillRect(0, 0, this.width, this.height);
        this.context.font = `${this.cellHeight}px input, monospace`;
        this.context.textAlign = "left";
        this.context.textBaseline = "top";
        this.hitZones = [];
        const colMax = Math.max(1, this.cols - 1);
        const rowMax = Math.max(1, this.rows - 1);
        const fieldContext = this.fieldContext;
        fieldContext.cols = this.cols;
        fieldContext.rows = this.rows;
        fieldContext.time = time;
        fieldContext.seed = this.seed;
        fieldContext.pointer = this.pointer;
        fieldContext.palette = this.palette;

        for (let row = 0; row < this.rows; row += 1) {
            const rowOffset = row * this.cols;
            const y = row / rowMax;

            for (let col = 0; col < this.cols; col += 1) {
                const fieldIndex = rowOffset + col;
                fieldContext.col = col;
                fieldContext.row = row;
                fieldContext.x = col / colMax;
                fieldContext.y = y;
                fieldContext.pressure = this.pressureField[fieldIndex] ?? 0;
                fieldContext.memory = this.memoryField[fieldIndex] ?? 0;
                const sample = this.sampleCurrentState(fieldContext, time);
                if (sample.char === " ") continue;

                this.context.fillStyle = sample.color;
                this.context.fillText(sample.char, col * this.cellWidth, row * this.cellHeight);
            }
        }

        this.drawAsciiChrome(time);
        this.recordPerf(performance.now() - renderStart);
    }

    renderBlackout(time: number, progress: number): void {
        const easedProgress = clamp(progress, 0, 1);

        if (easedProgress >= 0.995) {
            this.context.fillStyle = "#000000";
            this.context.fillRect(0, 0, this.width, this.height);
            return;
        }

        const colMax = Math.max(1, this.cols - 1);
        const rowMax = Math.max(1, this.rows - 1);
        this.context.fillStyle = "#000000";

        for (let row = 0; row < this.rows; row += 1) {
            const y = row / rowMax;
            for (let col = 0; col < this.cols; col += 1) {
                const x = col / colMax;
                const noise = hash3(col * 1.13, row * 0.87, this.seed + 1207);
                const wave = Math.sin((x + y) * 12 + time * 2.1) * 0.035;
                const threshold = clamp(noise * 0.72 + y * 0.2 + wave, 0, 1);
                if (easedProgress < threshold) continue;
                this.context.fillRect(col * this.cellWidth, row * this.cellHeight, this.cellWidth, this.cellHeight);
            }
        }
    }

    private handleHit(id: string): void {
        if (id === "back") {
            this.onClose({
                x: clamp(this.pointer.cellX / Math.max(1, this.cols - 1), 0, 1),
                y: clamp(this.pointer.cellY / Math.max(1, this.rows - 1), 0, 1)
            });
            return;
        }

        if (id === "transition-mode") {
            this.cycleTransitionMode();
            return;
        }

        const paletteId = id.startsWith("palette:") ? id.slice("palette:".length) : "";
        if (paletteId) {
            this.switchPalette(paletteId);
            return;
        }

        const theme = asciiThemes.find((item) => item.id === id);
        if (theme) {
            this.switchTheme(theme.id);
            return;
        }

        const link = this.links.find((item) => item.label === id);
        if (link) {
            window.open(link.href, link.href.startsWith("mailto:") ? "_self" : "_blank", "noreferrer");
        }
    }

    private switchTheme(id: AsciiThemeId): void {
        const theme = getAsciiTheme(id);
        this.beginTransition(theme, theme.note);
    }

    private beginTransition(theme: AsciiTheme, status: string): void {
        const previousTheme = this.theme;

        if (previousTheme.id === theme.id) {
            this.statusLine = `${status} / mode ${this.transitionMode}`;
            return;
        }

        this.theme = theme;
        this.transition = {
            from: { theme: previousTheme },
            to: { theme },
            startTime: this.renderTime,
            duration: 1.15,
            mode: this.transitionMode
        };
        this.statusLine = `${status} / ${this.transitionMode}`;
    }

    private cycleTransitionMode(): void {
        this.transitionModeIndex = (this.transitionModeIndex + 1) % transitionModes.length;
        this.statusLine = `transition mode / ${this.transitionMode}`;
    }

    private switchPalette(id: string): void {
        this.palette = setActiveAsciiPalette(id);
        this.fieldContext.palette = this.palette;
        this.statusLine = `palette / ${this.palette.label}`;
    }

    private get transitionMode(): TransitionMode {
        return transitionModes[this.transitionModeIndex] ?? "dither";
    }

    private sampleCurrentState(context: FieldContext, time: number): FieldSample {
        if (!this.transition) {
            return this.sampleRenderState({ theme: this.theme }, context);
        }

        const rawProgress = clamp((time - this.transition.startTime) / this.transition.duration, 0, 1);
        if (rawProgress >= 1) {
            const target = this.transition.to;
            this.transition = null;
            return this.sampleRenderState(target, context);
        }

        const progress = easeInOutCubic(rawProgress);
        const threshold = this.transitionThreshold(context, this.transition.mode, time);
        const state = progress >= threshold ? this.transition.to : this.transition.from;
        return this.sampleRenderState(state, context);
    }

    private sampleRenderState(state: RenderState, context: FieldContext): FieldSample {
        return state.theme.sample(context);
    }

    private transitionThreshold(context: FieldContext, mode: TransitionMode, time: number): number {
        const jitter = (hash3(context.col * 0.97, context.row * 1.13, this.seed + mode.length * 101) - 0.5) * 0.16;
        const dx = context.x - 0.5;
        const dy = context.y - 0.5;
        const distance = Math.hypot(dx, dy) / 0.72;

        if (mode === "radial") {
            return clamp(distance + jitter, 0, 1);
        }

        if (mode === "wipe") {
            const wave = Math.sin(context.y * 12 + time * 1.3) * 0.07;
            return clamp(context.x + wave + jitter, 0, 1);
        }

        if (mode === "ripple") {
            const ripple = Math.sin(distance * 28 - time * 6) * 0.08;
            return clamp(distance + ripple + jitter, 0, 1);
        }

        const dither = hash3(context.col, context.row, this.seed + 911) * 0.92 + context.y * 0.08;
        return clamp(dither, 0, 1);
    }

    private addDeposit(mode: Deposit["mode"], strength: number): void {
        this.deposits.push({
            x: this.pointer.x,
            y: this.pointer.y,
            age: 0,
            strength,
            mode
        });

        if (this.deposits.length > 48) {
            this.deposits.splice(0, this.deposits.length - 48);
        }
    }

    private updateDeposits(): void {
        for (let index = this.deposits.length - 1; index >= 0; index -= 1) {
            const deposit = this.deposits[index];
            deposit.age += 1;
            const maxAge = deposit.mode === "memory" ? 1600 : deposit.mode === "hover" ? 52 : 150;
            if (deposit.age >= maxAge) this.deposits.splice(index, 1);
        }
    }

    private ensureFieldBuffers(): void {
        const cellCount = this.cols * this.rows;
        if (this.pressureField.length !== cellCount) {
            this.pressureField = new Float32Array(cellCount);
            this.memoryField = new Float32Array(cellCount);
        }
    }

    private buildDepositFields(): void {
        this.ensureFieldBuffers();
        this.pressureField.fill(0);
        this.memoryField.fill(0);
        if (this.deposits.length === 0) return;

        const colMax = Math.max(1, this.cols - 1);
        const rowMax = Math.max(1, this.rows - 1);

        this.deposits.forEach((deposit) => {
            const radius = deposit.mode === "memory" ? 0.18 : deposit.mode === "hover" ? 0.075 : 0.1;
            const radiusSq = radius * radius;
            const minCol = clamp(Math.floor((deposit.x - radius) * colMax), 0, this.cols - 1);
            const maxCol = clamp(Math.ceil((deposit.x + radius) * colMax), 0, this.cols - 1);
            const minRow = clamp(Math.floor((deposit.y - radius) * rowMax), 0, this.rows - 1);
            const maxRow = clamp(Math.ceil((deposit.y + radius) * rowMax), 0, this.rows - 1);
            const decay = deposit.mode === "memory"
                ? Math.max(0.18, 1 - deposit.age / 1600)
                : deposit.mode === "hover"
                    ? Math.max(0, 1 - deposit.age / 52)
                : Math.max(0, 1 - deposit.age / 150);

            for (let row = minRow; row <= maxRow; row += 1) {
                const y = row / rowMax;
                const dy = y - deposit.y;
                for (let col = minCol; col <= maxCol; col += 1) {
                    const x = col / colMax;
                    const dx = x - deposit.x;
                    const distanceSq = dx * dx + dy * dy;
                    if (distanceSq >= radiusSq) continue;

                    const falloff = 1 - distanceSq / radiusSq;
                    const value = falloff * falloff * deposit.strength * decay;
                    const index = col + row * this.cols;

                    if (deposit.mode === "memory") this.memoryField[index] = Math.min(1, this.memoryField[index] + value);
                    else this.pressureField[index] = Math.min(1, this.pressureField[index] + value);
                }
            }
        });
    }

    private recordPerf(renderMs: number): void {
        this.averageRenderMs = this.averageRenderMs === 0
            ? renderMs
            : this.averageRenderMs * 0.9 + renderMs * 0.1;

        const debugWindow = window as Window & {
            __asciiPerf?: {
                renderMs: number;
                averageRenderMs: number;
                cols: number;
                rows: number;
                cells: number;
                deposits: number;
                theme: string;
                transitionMode: string;
                palette: string;
            };
        };

        const perf = {
            renderMs: Math.round(renderMs * 10) / 10,
            averageRenderMs: Math.round(this.averageRenderMs * 10) / 10,
            cols: this.cols,
            rows: this.rows,
            cells: this.cols * this.rows,
            deposits: this.deposits.length,
            theme: this.theme.id,
            transitionMode: this.transitionMode,
            palette: this.palette.id
        };

        debugWindow.__asciiPerf = perf;
        this.perfFrame += 1;
        if (this.perfFrame % 8 === 0) this.canvas.dataset.asciiPerf = JSON.stringify(perf);
    }

    private drawAsciiChrome(_time: number): void {
        this.drawText(1, 1, "[back]", colorFromPalette(this.palette, "chrome", 0.96, 4), "back");

        let col = 10;
        asciiThemes.forEach((theme, index) => {
            const label = this.theme.id === theme.id ? `[${index + 1}:${theme.label}]` : `${index + 1}:${theme.label}`;
            this.drawText(
                col,
                1,
                label,
                this.theme.id === theme.id
                    ? colorFromPalette(this.palette, "accent", 0.96, 4)
                    : colorFromPalette(this.palette, "muted", 0.84),
                theme.id
            );
            col += label.length + 2;
        });

        const modeLabel = `[mode:${this.transitionMode}]`;
        this.drawText(
            col,
            1,
            modeLabel,
            this.transition ? colorFromPalette(this.palette, "accent", 0.96, 4) : colorFromPalette(this.palette, "muted", 0.84),
            "transition-mode"
        );

        const paletteRow = Math.max(2, this.rows - 3);
        let paletteCol = 1;
        asciiPalettes.forEach((palette, index) => {
            const label = this.palette.id === palette.id ? `[${index + 1}:${palette.label}]` : `${index + 1}:${palette.label}`;
            this.drawText(
                paletteCol,
                paletteRow,
                label,
                this.palette.id === palette.id
                    ? colorFromPalette(this.palette, "accent", 0.96, 4)
                    : colorFromPalette(this.palette, "muted", 0.82),
                `palette:${palette.id}`
            );
            paletteCol += label.length + 2;
        });

        this.drawText(1, this.rows - 2, `seed ${this.seed.toString(16)} / ${this.statusLine}`, colorFromPalette(this.palette, "muted", 0.86));

        let linkCol = Math.max(1, this.cols - 28);
        this.links.forEach((link) => {
            this.drawText(linkCol, this.rows - 2, link.label, colorFromPalette(this.palette, "accent", 0.94), link.label);
            linkCol += link.label.length + 2;
        });
    }

    private drawText(col: number, row: number, text: string, color: string, hitId?: string): void {
        this.context.fillStyle = color;
        this.context.fillText(text, col * this.cellWidth, row * this.cellHeight);

        if (hitId) {
            this.hitZones.push({ id: hitId, row, start: col, end: col + text.length - 1 });
        }
    }
}

function easeInOutCubic(value: number): number {
    return value < 0.5
        ? 4 * value * value * value
        : 1 - ((-2 * value + 2) ** 3) / 2;
}
