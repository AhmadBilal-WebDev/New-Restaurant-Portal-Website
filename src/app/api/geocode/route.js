import { NextResponse } from "next/server";

async function GET(request) {
  const q = String(request.nextUrl.searchParams.get("q") || "").trim();
  const city = String(request.nextUrl.searchParams.get("city") || "").trim();
  if (!q) {
    return NextResponse.json({ message: "Query is required." }, { status: 400 });
  }

  const search = [q, city, "Pakistan"].filter(Boolean).join(", ");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", search);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "en");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "restaurnt-website-areas/1.0 (admin area picker)"
      },
      cache: "no-store"
    });
    if (!response.ok) {
      return NextResponse.json(
        { message: "Geocoding service unavailable." },
        { status: response.status }
      );
    }
    const rows = await response.json();
    const hit = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!hit) {
      return NextResponse.json({ ok: false, message: "Place not found.", result: null });
    }
    return NextResponse.json({
      ok: true,
      result: {
        name: hit.display_name || q,
        latitude: String(Number(hit.lat).toFixed(4)),
        longitude: String(Number(hit.lon).toFixed(4)),
        boundingBox: Array.isArray(hit.boundingbox) ? hit.boundingbox : null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Geocoding failed.";
    return NextResponse.json({ message }, { status: 503 });
  }
}

export { GET };
