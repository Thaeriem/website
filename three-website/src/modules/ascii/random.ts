export function hashStringToSeed(input: string): number {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function hash3(x: number, y: number, z: number): number {
    const value = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
    return value - Math.floor(value);
}

export function valueNoise(x: number, y: number, z: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = smoothstep(x - ix);
    const fy = smoothstep(y - iy);
    const fz = smoothstep(z - iz);

    const x00 = lerp(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), fx);
    const x10 = lerp(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), fx);
    const x01 = lerp(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), fx);
    const x11 = lerp(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), fx);
    return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz) * 2 - 1;
}

export function fbm(x: number, y: number, z: number, octaves = 4): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let octave = 0; octave < octaves; octave += 1) {
        value += valueNoise(x * frequency, y * frequency, z * frequency) * amplitude;
        frequency *= 2.03;
        amplitude *= 0.52;
    }
    return value;
}

export function domainWarp(x: number, y: number, z: number, amount: number): { x: number; y: number } {
    return {
        x: x + fbm(x * 1.4 + 11.7, y * 1.4, z, 3) * amount,
        y: y + fbm(x * 1.4, y * 1.4 + 19.3, z, 3) * amount
    };
}

export function seededPoint(seed: number, index: number): { x: number; y: number } {
    return {
        x: hash3(seed * 0.001 + index * 17.1, 3.7, 9.2),
        y: hash3(seed * 0.001 - index * 11.3, 8.1, 2.4)
    };
}

export function smoothstep(value: number): number {
    return value * value * (3 - 2 * value);
}

export function lerp(a: number, b: number, value: number): number {
    return a + (b - a) * value;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
