/**
 * Cross-device geolocation helper.
 * Mobile browsers block GPS on plain HTTP LAN IPs (not secure context).
 */

function isLocalHostname(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

function isGeolocationSecureContext() {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  // Some browsers treat localhost HTTP as OK for geolocation.
  return isLocalHostname(window.location?.hostname);
}

function geolocationSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

function mapGeoError(error, { insecure = false } = {}) {
  const code = error?.code;
  // 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT
  if (insecure || (!isGeolocationSecureContext() && code === 1)) {
    return {
      code: code || 1,
      message:
        "GPS needs a secure connection (HTTPS). On phone, open the site via HTTPS — or tap the map / search your area.",
      reason: "insecure_context"
    };
  }
  if (code === 1) {
    return {
      code: 1,
      message:
        "Location permission blocked. Allow location for this site in browser settings, then try again — or tap the map.",
      reason: "permission_denied"
    };
  }
  if (code === 2) {
    return {
      code: 2,
      message:
        "Could not detect GPS signal. Move near a window, turn on device location, or drop a pin on the map.",
      reason: "unavailable"
    };
  }
  if (code === 3) {
    return {
      code: 3,
      message: "Location request timed out. Try again, or tap the map to set your pin.",
      reason: "timeout"
    };
  }
  return {
    code: code || 0,
    message: "Could not read your current location. Allow GPS or set your pin on the map.",
    reason: "unknown"
  };
}

function getCurrentPositionPromise(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Request current position with mobile-friendly fallbacks.
 * Must be called from a user gesture (button click).
 */
async function requestCurrentPosition() {
  if (!geolocationSupported()) {
    return {
      ok: false,
      latitude: "",
      longitude: "",
      accuracy: null,
      message: "GPS is not available in this browser. Tap the map or search your area.",
      reason: "unsupported"
    };
  }

  const insecure = !isGeolocationSecureContext();
  if (insecure) {
    return {
      ok: false,
      latitude: "",
      longitude: "",
      accuracy: null,
      message:
        "Phone browsers block GPS on HTTP. Use HTTPS, or tap the map / search to set your location.",
      reason: "insecure_context"
    };
  }

  // Ask permission status when available (non-blocking).
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state === "denied") {
        return {
          ok: false,
          latitude: "",
          longitude: "",
          accuracy: null,
          message:
            "Location permission is denied. Enable it in browser site settings, then try again — or tap the map.",
          reason: "permission_denied"
        };
      }
    }
  } catch {
    // Permissions API not supported on all browsers — continue.
  }

  const attempts = [
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    },
    {
      // Faster / more reliable on many phones (Wi‑Fi / network location).
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 60000
    }
  ];

  let lastError = null;
  for (const options of attempts) {
    try {
      const position = await getCurrentPositionPromise(options);
      const latitude = Number(position?.coords?.latitude);
      const longitude = Number(position?.coords?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        lastError = { code: 2, message: "Invalid coordinates" };
        continue;
      }
      return {
        ok: true,
        latitude: latitude.toFixed(5),
        longitude: longitude.toFixed(5),
        accuracy:
          typeof position.coords.accuracy === "number" ? position.coords.accuracy : null,
        message: "Location detected.",
        reason: "ok"
      };
    } catch (error) {
      lastError = error;
      // Permission denied won't succeed on retry — stop early.
      if (error?.code === 1) break;
    }
  }

  const mapped = mapGeoError(lastError, { insecure });
  return {
    ok: false,
    latitude: "",
    longitude: "",
    accuracy: null,
    message: mapped.message,
    reason: mapped.reason
  };
}

export {
  geolocationSupported,
  isGeolocationSecureContext,
  requestCurrentPosition
};
