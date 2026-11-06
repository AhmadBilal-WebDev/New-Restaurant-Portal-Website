/** Client-only Leaflet loader (avoids Next SSR "window is not defined"). */

let leafletPromise = null;

async function loadLeaflet() {
  if (typeof window === "undefined") {
    throw new Error("Leaflet can only load in the browser.");
  }
  if (!leafletPromise) {
    leafletPromise = Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css")
    ]).then(([mod]) => mod.default || mod);
  }
  return leafletPromise;
}

export { loadLeaflet };
