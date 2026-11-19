/**
 * Order alert sound — Mixkit chime (~2.5s).
 * Browsers require one user tap to unlock audio; after that alerts play automatically.
 */

const ALERT_SRC = "/sounds/order-alert.mp3";
const ALERT_MAX_SEC = 2.5;

let unlocked = false;
let pendingAlert = false;
let alertAudio = null;
let listenersBound = false;
let stopTimer = null;

function clearStopTimer() {
  if (stopTimer) {
    window.clearTimeout(stopTimer);
    stopTimer = null;
  }
}

function getAlertAudio() {
  if (typeof window === "undefined") return null;
  if (alertAudio) return alertAudio;
  const audio = new Audio(ALERT_SRC);
  audio.preload = "auto";
  audio.playsInline = true;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  try {
    audio.load();
  } catch {
    // ignore
  }
  alertAudio = audio;
  return audio;
}

function buzz() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([160, 70, 160, 70, 220]);
    }
  } catch {
    // ignore
  }
}

function scheduleStop(audio) {
  clearStopTimer();
  stopTimer = window.setTimeout(() => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
    stopTimer = null;
  }, Math.round(ALERT_MAX_SEC * 1000));
}

async function unlockOrderAlertSound() {
  if (typeof window === "undefined") return false;
  const audio = getAlertAudio();
  if (!audio) return false;

  // Already unlocked — don't interrupt a ringing alert.
  if (unlocked) {
    if (pendingAlert) {
      pendingAlert = false;
      window.setTimeout(() => {
        void playOrderAlertSound({ force: true });
      }, 40);
    }
    return true;
  }

  try {
    clearStopTimer();
    audio.muted = false;
    audio.volume = 0.01;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    unlocked = true;

    if (pendingAlert) {
      pendingAlert = false;
      window.setTimeout(() => {
        void playOrderAlertSound({ force: true });
      }, 40);
    }
    return true;
  } catch {
    unlocked = false;
    return false;
  }
}

function ensureUnlockListeners() {
  if (typeof window === "undefined" || listenersBound) return;
  listenersBound = true;

  const unlock = () => {
    void unlockOrderAlertSound().then((ok) => {
      if (!ok) return;
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("click", unlock, true);
    });
  };

  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("touchstart", unlock, true);
  window.addEventListener("keydown", unlock, true);
  window.addEventListener("click", unlock, true);
}

async function playOrderAlertSound({ force = false } = {}) {
  if (typeof window === "undefined") return;
  ensureUnlockListeners();
  buzz();

  const audio = getAlertAudio();
  if (!audio) return;

  try {
    clearStopTimer();
    audio.muted = false;
    audio.volume = 1;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      await playPromise;
    }
    scheduleStop(audio);
    unlocked = true;
    pendingAlert = false;
  } catch {
    // Autoplay blocked until user taps once — play on next gesture.
    if (!force) pendingAlert = true;
    void unlockOrderAlertSound();
  }
}

export { ensureUnlockListeners, playOrderAlertSound, unlockOrderAlertSound };
