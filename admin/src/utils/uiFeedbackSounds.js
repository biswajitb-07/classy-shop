let audioContext = null;
let unlockListenersBound = false;

const SOUND_COOLDOWN_MS = 120;
const lastPlayedAt = new Map();

const getAudioContext = () => {
  if (typeof window === "undefined") return null;

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext || null;

  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
};

const tryResumeAudio = async () => {
  const context = getAudioContext();

  if (!context) return null;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (_error) {
      return context;
    }
  }

  return context;
};

const bindUnlockListeners = () => {
  if (typeof window === "undefined" || unlockListenersBound) return;

  const unlock = () => {
    void tryResumeAudio();
  };

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, unlock, { passive: true });
  });

  unlockListenersBound = true;
};

const withCooldown = (key, callback) => {
  const now = Date.now();
  const previous = lastPlayedAt.get(key) || 0;

  if (now - previous < SOUND_COOLDOWN_MS) {
    return;
  }

  lastPlayedAt.set(key, now);
  callback();
};

const runToneSequence = (context, key, tones) => {
  withCooldown(key, () => {
    const startAt = context.currentTime + 0.01;

    tones.forEach((tone, index) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const toneStart = startAt + index * (tone.gap ?? 0.08);
      const toneDuration = tone.duration ?? 0.08;
      const peakGain = tone.gain ?? 0.06;

      oscillator.type = tone.type || "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, toneStart);

      gainNode.gain.setValueAtTime(0.0001, toneStart);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, toneStart + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        toneStart + toneDuration,
      );

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(toneStart);
      oscillator.stop(toneStart + toneDuration + 0.02);
    });
  });
};

const playToneSequence = async (key, tones) => {
  bindUnlockListeners();

  const context = getAudioContext();

  if (!context) return;

  const readyContext =
    context.state === "running" ? context : await tryResumeAudio();

  if (!readyContext || readyContext.state !== "running") {
    return;
  }

  runToneSequence(readyContext, key, tones);
};

export const primeUiFeedbackSounds = () => {
  bindUnlockListeners();
  void tryResumeAudio();
};

export const waitForNextPaint = () =>
  new Promise((resolve) => {
    if (
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      setTimeout(resolve, 0);
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

export const playChatSendSound = () => {
  void playToneSequence("chat-send", [
    { frequency: 700, duration: 0.06, gain: 0.05, type: "triangle" },
    { frequency: 980, duration: 0.09, gain: 0.04, type: "triangle", gap: 0.05 },
  ]);
};

export const playChatReceiveSound = () => {
  void playToneSequence("chat-receive", [
    { frequency: 560, duration: 0.08, gain: 0.05, type: "sine" },
    { frequency: 820, duration: 0.1, gain: 0.055, type: "sine", gap: 0.06 },
  ]);
};
