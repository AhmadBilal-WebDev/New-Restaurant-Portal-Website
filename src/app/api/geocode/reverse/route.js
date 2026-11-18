import { NextResponse } from "next/server";

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function buildLabel(parts) {
  return parts.filter(Boolean).join(", ");
}

async function GET(request) {
  const lat = String(request.nextUrl.searchParams.get("lat") || "").trim();
  const lon = String(
    request.nextUrl.searchParams.get("lon") ||
      request.nextUrl.searchParams.get("lng") ||
      ""
  ).trim();

  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { ok: false, message: "Valid lat and lon are required.", result: null },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "restaurnt-website/1.0 (reverse geocode)"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: "Reverse geocoding unavailable.", result: null },
        { status: response.status }
      );
    }

    const data = await response.json();
    const address = data?.address && typeof data.address === "object" ? data.address : {};
    const shortName = buildLabel([
      text(address.road) || text(address.pedestrian) || text(address.path),
      text(address.neighbourhood) || text(address.suburb) || text(address.quarter),
      text(address.village) || text(address.town) || text(address.city) || text(address.county),
      text(address.state)
    ]);
    const displayName = text(data?.display_name) || shortName || `${latitude}, ${longitude}`;

    return NextResponse.json({
      ok: true,
      result: {
        name: displayName,
        shortName: shortName || displayName,
        latitude: latitude.toFixed(5),
        longitude: longitude.toFixed(5),
        address
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reverse geocoding failed.";
    return NextResponse.json({ ok: false, message, result: null }, { status: 503 });
  }
}

export { GET };
