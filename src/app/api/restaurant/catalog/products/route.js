import { NextResponse } from "next/server";
const API_BASE_URL = process.env.API_BASE_URL;
async function GET(request) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured in .env file." },
      { status: 503 }
    );
  }
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const authHeader = request.headers.get("authorization");
  const target = new URL(`${baseUrl}/api/restaurant/catalog/products`);
  for (const key of ["frontendDomainUrl", "branchName", "showAllBranches", "tag"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...authHeader ? { Authorization: authHeader } : {}
      },
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
async function POST(request) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured in .env file." },
      { status: 503 }
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid or empty JSON body received." }, { status: 400 });
  }
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const authHeader = request.headers.get("authorization");
  try {
    const response = await fetch(`${baseUrl}/api/restaurant/catalog/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeader ? { Authorization: authHeader } : {}
      },
      body: JSON.stringify(body),
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
  GET,
  POST
};
