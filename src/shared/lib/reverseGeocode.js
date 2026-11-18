async function reverseGeocodeLatLng(latitude, longitude) {
  const lat = String(latitude ?? "").trim();
  const lon = String(longitude ?? "").trim();
  if (!lat || !lon) {
    return { ok: false, message: "Coordinates required.", result: null };
  }

  try {
    const params = new URLSearchParams({ lat, lon });
    const response = await fetch(`/api/geocode/reverse?${params}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok || !data?.ok || !data?.result) {
      return {
        ok: false,
        message: data?.message || "Could not resolve address.",
        result: null
      };
    }
    return { ok: true, result: data.result, message: "OK" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Reverse geocode failed.",
      result: null
    };
  }
}

export { reverseGeocodeLatLng };
