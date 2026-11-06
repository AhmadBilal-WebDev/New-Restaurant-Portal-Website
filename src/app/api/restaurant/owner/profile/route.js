import { NextResponse } from "next/server";
const API_BASE_URL = process.env.API_BASE_URL;
async function proxyOwnerProfile(request, method) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured in .env file." },
      { status: 503 }
    );
  }
  let body = void 0;
  if (method === "PUT") {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid or empty JSON body received." },
        { status: 400 }
      );
    }
  }
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const target = new URL(`${baseUrl}/api/restaurant/owner/profile`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  const authHeader = request.headers.get("authorization");
  try {
    const response = await fetch(target.toString(), {
      method,
      headers: {
        Accept: "application/json",
        ...method === "PUT" ? { "Content-Type": "application/json" } : {},
        ...authHeader ? { Authorization: authHeader } : {}
      },
      ...method === "PUT" ? { body: JSON.stringify(body) } : {},
      cache: "no-store"
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { message: "Empty response from backend" };
    } catch {
      data = { message: text || "Backend returned non-JSON response." };
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend API is not reachable.";
    console.error("Owner Profile Route Handler Error:", error);
    return NextResponse.json({ message }, { status: 503 });
  }
}
function GET(request) {
  return proxyOwnerProfile(request, "GET");
}
function PUT(request) {
  return proxyOwnerProfile(request, "PUT");
}
export {
  GET,
  PUT
};
