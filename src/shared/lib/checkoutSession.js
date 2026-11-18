const CHECKOUT_SESSION_KEY = "bite_checkout_session";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readCheckoutSession() {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeCheckoutSession(payload) {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(
      CHECKOUT_SESSION_KEY,
      JSON.stringify(payload && typeof payload === "object" ? payload : {})
    );
  } catch {
    // Ignore quota / private mode.
  }
}

function clearCheckoutSession() {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
  } catch {
    // Ignore.
  }
}

export {
  CHECKOUT_SESSION_KEY,
  clearCheckoutSession,
  readCheckoutSession,
  writeCheckoutSession
};
