import { NextResponse } from "next/server";
const API_BASE_URL = process.env.API_BASE_URL;
async function POST(request) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured in .env file." },
      { status: 503 }
    );
  }
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const authHeader = request.headers.get("authorization");
  try {
    const response = await fetch(`${baseUrl}/api/restaurant/staff/remove-profilepitcher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeader ? { Authorization: authHeader } : {}
      },
      body: JSON.stringify({}),
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
    return NextResponse.json({ message }, { status: 503 });
  }
}
export {
  POST
};
