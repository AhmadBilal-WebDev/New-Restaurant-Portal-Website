import { NextResponse } from "next/server";
const API_BASE_URL = process.env.API_BASE_URL;
const ALLOWED_ACTIONS = /* @__PURE__ */ new Set([
  "update-role",
  "block-role",
  "activate-role",
  "delete-role"
]);
async function proxyStaffRole(request, action, id, method) {
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ message: `Unsupported staff action: ${action}` }, { status: 400 });
  }
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured in .env file." },
      { status: 503 }
    );
  }
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const authHeader = request.headers.get("authorization");
  const target = new URL(`${baseUrl}/api/restaurant/staff/${action}/${id}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  try {
    const response = await fetch(target.toString(), {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
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
async function PUT(request, context) {
  const { action, id } = await context.params;
  return proxyStaffRole(request, action, id, "PUT");
}
async function POST(request, context) {
  const { action, id } = await context.params;
  return proxyStaffRole(request, action, id, "POST");
}
async function DELETE(request, context) {
  const { action, id } = await context.params;
  return proxyStaffRole(request, action, id, "DELETE");
}
export {
  DELETE,
  POST,
  PUT
};
