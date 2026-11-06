import { NextResponse } from "next/server";
const API_BASE_URL = process.env.API_BASE_URL;
async function proxyDealsRequest(request, path, method, publicRequest = false) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured in .env file." },
      { status: 503 }
    );
  }
  const target = new URL(`${API_BASE_URL.replace(/\/$/, "")}/api/restaurant/deals${path}`);
  for (const key of ["domain", "branchName"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  let body;
  if (method === "POST" || method === "PUT") {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid or empty JSON body received." },
        { status: 400 }
      );
    }
  }
  try {
    const authHeader = publicRequest ? null : request.headers.get("authorization");
    const response = await fetch(target.toString(), {
      method,
      headers: {
        Accept: "application/json",
        ...body !== void 0 ? { "Content-Type": "application/json" } : {},
        ...authHeader ? { Authorization: authHeader } : {}
      },
      ...body !== void 0 ? { body: JSON.stringify(body) } : {},
      cache: "no-store"
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text || "Backend returned a non-JSON response." };
    }
    return response.status === 204 ? new NextResponse(null, { status: response.status }) : NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend API is not reachable.";
    return NextResponse.json({ message }, { status: 503 });
  }
}
export {
  proxyDealsRequest
};
