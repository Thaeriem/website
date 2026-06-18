import { clamp, hashStringToSeed } from "./random";
import { asciiThemes, getAsciiTheme } from "./themes";
import type { AsciiTheme, AsciiThemeId, Deposit, FieldContext, HitZone, LinkTarget, PointerState } from "./types";

type RendererOptions = {
    onClose: () => void;
    links: LinkTarget[];
    seedText?: string;
};

export class AsciiInstallationRenderer {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private onClose: () => void;
    private links: LinkTarget[];
    private theme: AsciiTheme = getAsciiTheme("descent");
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
    private statusLine = "click or drag to bend the field";
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
        memory: 0
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
        this.addDeposit("memory", 0.95);
        this.addDeposit("trace", 0.8);
        this.statusLine = `${this.theme.label} / field deposit recorded`;
    }

    pointerMove(): void {
        if (!this.pointer.down) return;
        const traceCell = `${this.pointer.cellX}:${this.pointer.cellY}`;
        if (traceCell === this.lastTraceCell) return;
        this.lastTraceCell = traceCell;
        this.addDeposit("trace", 0.36);
    }

    pointerUp(): void {
        this.pointer.down = false;
        this.lastTraceCell = "";
    }

    keyDown(event: KeyboardEvent): boolean {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < asciiThemes.length) {
            this.switchTheme(asciiThemes[index].id);
            return true;
        }
        return false;
    }

    render(time: number): void {
        const renderStart = performance.now();
        this.updateDeposits();
        this.buildDepositFields();
        this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        this.context.fillStyle = this.theme.background;
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
                const sample = this.theme.sample(fieldContext);
                if (sample.char === " ") continue;

                this.context.fillStyle = sample.color;
                this.context.fillText(sample.char, col * this.cellWidth, row * this.cellHeight);
            }
        }

        this.drawAsciiChrome(time);
        this.recordPerf(performance.now() - renderStart);
    }

    private handleHit(id: string): void {
        if (id === "back") {
            this.onClose();
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
        this.theme = getAsciiTheme(id);
        this.statusLine = this.theme.note;
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
            const maxAge = deposit.mode === "memory" ? 1600 : 150;
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
            const radius = deposit.mode === "memory" ? 0.18 : 0.1;
            const radiusSq = radius * radius;
            const minCol = clamp(Math.floor((deposit.x - radius) * colMax), 0, this.cols - 1);
            const maxCol = clamp(Math.ceil((deposit.x + radius) * colMax), 0, this.cols - 1);
            const minRow = clamp(Math.floor((deposit.y - radius) * rowMax), 0, this.rows - 1);
            const maxRow = clamp(Math.ceil((deposit.y + radius) * rowMax), 0, this.rows - 1);
            const decay = deposit.mode === "memory"
                ? Math.max(0.18, 1 - deposit.age / 1600)
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
            };
        };

        const perf = {
            renderMs: Math.round(renderMs * 10) / 10,
            averageRenderMs: Math.round(this.averageRenderMs * 10) / 10,
            cols: this.cols,
            rows: this.rows,
            cells: this.cols * this.rows,
            deposits: this.deposits.length,
            theme: this.theme.id
        };

        debugWindow.__asciiPerf = perf;
        this.perfFrame += 1;
        if (this.perfFrame % 8 === 0) this.canvas.dataset.asciiPerf = JSON.stringify(perf);
    }

    private drawAsciiChrome(_time: number): void {
        this.drawText(1, 1, "[back]", "#fff6dc", "back");

        let col = 10;
        asciiThemes.forEach((theme, index) => {
            const label = this.theme.id === theme.id ? `[${index + 1}:${theme.label}]` : `${index + 1}:${theme.label}`;
            this.drawText(col, 1, label, this.theme.id === theme.id ? "#ff4a17" : "#8f9696", theme.id);
            col += label.length + 2;
        });

        this.drawText(1, this.rows - 2, `seed ${this.seed.toString(16)} / ${this.statusLine}`, "#8f9696");

        let linkCol = Math.max(1, this.cols - 28);
        this.links.forEach((link) => {
            this.drawText(linkCol, this.rows - 2, link.label, "#ff4a17", link.label);
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
