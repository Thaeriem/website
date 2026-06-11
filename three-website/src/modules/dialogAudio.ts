type DialogVoice = {
    waveform: OscillatorType;
    baseFrequency: number;
    variance: number;
    duration: number;
    volume: number;
    minInterval: number;
};

const DEFAULT_VOICE: DialogVoice = {
    waveform: "triangle",
    baseFrequency: 420,
    variance: 110,
    duration: 0.032,
    volume: 0.05,
    minInterval: 0.028
};

const VOICES: Record<string, DialogVoice> = {
    yash: {
        waveform: "triangle",
        baseFrequency: 360,
        variance: 85,
        duration: 0.034,
        volume: 0.055,
        minInterval: 0.03
    }
};

let audioContext: AudioContext | null = null;
let lastBlipTime = 0;
let isAudioPrimed = false;
let isAudioUnlocked = false;
let resumeAttempt: Promise<void> | null = null;

export function unlockDialogAudio(): void {
    const context = getAudioContext();
    if (!context || context.state === "closed") return;

    if (context.state === "running") {
        isAudioUnlocked = true;
        primeAudioContext(context);
        return;
    }

    if (!resumeAttempt) {
        resumeAttempt = context.resume()
            .then(() => {
                isAudioUnlocked = context.state === "running";
                if (isAudioUnlocked) {
                    primeAudioContext(context);
                }
            })
            .catch(() => {
                resumeAttempt = null;
            });
    }
}

export function playDialogBlip(char: string, voiceKey: string): void {
    if (!shouldPlayChar(char) || isSoundMuted()) return;

    const context = getAudioContext();
    if (!context || context.state === "closed") return;
    if (context.state !== "running" || !isAudioUnlocked) {
        unlockDialogAudio();
        return;
    }

    primeAudioContext(context);

    const voice = VOICES[voiceKey] ?? DEFAULT_VOICE;
    const now = context.currentTime;
    if (now - lastBlipTime < voice.minInterval) return;

    lastBlipTime = now;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const frequency = frequencyForChar(char, voice);

    oscillator.type = voice.waveform;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.92, now + voice.duration);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency * 1.8, now);
    filter.Q.setValueAtTime(6, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(voice.volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + voice.duration + 0.01);
}

function primeAudioContext(context: AudioContext): void {
    if (isAudioPrimed) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    gain.gain.setValueAtTime(0.0001, now);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.01);
    isAudioPrimed = true;
}

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioContext) {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return null;
        audioContext = new AudioContextCtor();
    }
    return audioContext;
}

function frequencyForChar(char: string, voice: DialogVoice): number {
    const normalized = char.toLowerCase();
    const vowelLift = /[aeiou]/.test(normalized) ? 42 : 0;
    const consonantDip = /[bcdfghjklmnpqrstvwxyz]/.test(normalized) ? -18 : 0;
    const randomOffset = (Math.random() - 0.5) * voice.variance;
    return Math.max(90, voice.baseFrequency + vowelLift + consonantDip + randomOffset);
}

function shouldPlayChar(char: string): boolean {
    return /[a-z0-9]/i.test(char);
}

function isSoundMuted(): boolean {
    const soundToggle = document.getElementById("sound-toggle");
    return soundToggle?.classList.contains("muted") === true;
}

declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}
