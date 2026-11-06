import { NextResponse } from "next/server";
const API_BASE_URL = process.env.API_BASE_URL;
async function GET(request) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured." },
      { status: 503 }
    );
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/restaurant/sidebar-buttons`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...request.headers.get("authorization") ? { Authorization: request.headers.get("authorization") } : {}
      },
      cache: "no-store"
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || "Backend returned a non-JSON response." };
    }
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: `Restaurant API is not reachable at ${API_BASE_URL}.` },
      { status: 503 }
    );
  }
}
export {
  GET
};
