import { NextResponse } from "next/server";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function toCoord(value, digits = 5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(digits);
}

function buildLabel(parts) {
  return parts.filter(Boolean).join(", ");
}

function mapNominatimRow(row) {
  const lat = toCoord(row?.lat);
  const lng = toCoord(row?.lon);
  if (!lat || !lng) return null;
  const address = row?.address && typeof row.address === "object" ? row.address : {};
  const name =
    text(row?.display_name) ||
    buildLabel([
      text(address.name),
      text(address.road),
      text(address.suburb) || text(address.neighbourhood),
      text(address.city) || text(address.town) || text(address.village),
      text(address.state)
    ]);
  return {
    id: text(row?.place_id) || `${lat},${lng}`,
    name: name || "Selected location",
    latitude: lat,
    longitude: lng,
    boundingBox: Array.isArray(row?.boundingbox) ? row.boundingbox : null,
    source: "nominatim"
  };
}

function mapPhotonFeature(feature) {
  const props = feature?.properties && typeof feature.properties === "object" ? feature.properties : {};
  const coords = asArray(feature?.geometry?.coordinates);
  const lng = toCoord(coords[0]);
  const lat = toCoord(coords[1]);
  if (!lat || !lng) return null;
  const name =
    text(props.name) ||
    text(props.street) ||
    buildLabel([
      text(props.name),
      text(props.street),
      text(props.district) || text(props.locality),
      text(props.city) || text(props.town) || text(props.village),
      text(props.state),
      text(props.country)
    ]);
  const subtitle = buildLabel([
    text(props.street),
    text(props.district) || text(props.locality),
    text(props.city) || text(props.town) || text(props.village),
    text(props.state),
    text(props.country)
  ]);
  return {
    id: text(props.osm_id) || `${lat},${lng}`,
    name: name || subtitle || "Selected location",
    subtitle: subtitle && subtitle !== name ? subtitle : "",
    latitude: lat,
    longitude: lng,
    boundingBox: null,
    source: "photon"
  };
}

function dedupeResults(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (!row) continue;
    const key = `${row.latitude}|${row.longitude}|${String(row.name || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function searchPhoton({ q, limit, lat, lon }) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("lang", "en");
  // Bias toward Pakistan / nearby branch when possible.
  url.searchParams.set("lat", lat || "30.3753");
  url.searchParams.set("lon", lon || "69.3451");
  if (lat && lon) {
    url.searchParams.set("location_bias_scale", "0.5");
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) return [];
  const data = await response.json();
  return asArray(data?.features).map(mapPhotonFeature).filter(Boolean);
}

async function searchNominatim({ q, limit, lat, lon }) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "pk");
  url.searchParams.set("accept-language", "en");
  if (lat && lon) {
    const pad = 0.45;
    const south = Number(lat) - pad;
    const north = Number(lat) + pad;
    const west = Number(lon) - pad;
    const east = Number(lon) + pad;
    url.searchParams.set("viewbox", `${west},${north},${east},${south}`);
    url.searchParams.set("bounded", "0");
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "restaurnt-website/1.0 (customer location search)"
    },
    cache: "no-store"
  });
  if (!response.ok) return [];
  const rows = await response.json();
  return asArray(rows).map(mapNominatimRow).filter(Boolean);
}

async function GET(request) {
  const q = String(request.nextUrl.searchParams.get("q") || "").trim();
  const city = String(request.nextUrl.searchParams.get("city") || "").trim();
  const lat = String(request.nextUrl.searchParams.get("lat") || "").trim();
  const lon = String(request.nextUrl.searchParams.get("lon") || "").trim();
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || 8);
  const limit = Math.min(12, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 8));

  if (!q) {
    return NextResponse.json({ message: "Query is required." }, { status: 400 });
  }
  if (q.length < 2) {
    return NextResponse.json({ ok: true, results: [], result: null });
  }

  // Multiple query shapes — local area names often fail if we force branch name as city.
  const queries = [...new Set(
    [q, city ? `${q}, ${city}` : "", city ? `${q}, ${city}, Pakistan` : "", `${q}, Pakistan`].filter(
      Boolean
    )
  )];

  try {
    let results = [];

    for (const query of queries) {
      const photonHits = await searchPhoton({
        q: query,
        limit,
        lat: lat || "",
        lon: lon || ""
      });
      results = dedupeResults([...results, ...photonHits]);
      if (results.length >= limit) break;
    }

    if (results.length < 3) {
      for (const query of queries) {
        const nominatimHits = await searchNominatim({
          q: query,
          limit,
          lat: lat || "",
          lon: lon || ""
        });
        results = dedupeResults([...results, ...nominatimHits]);
        if (results.length >= limit) break;
      }
    }

    results = results.slice(0, limit);
    const first = results[0] || null;

    return NextResponse.json({
      ok: results.length > 0,
      result: first,
      results,
      message: results.length ? "OK" : "Place not found."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Geocoding failed.";
    return NextResponse.json({ ok: false, message, result: null, results: [] }, { status: 503 });
  }
}

export { GET };
