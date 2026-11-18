import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

function noBase() {
  return NextResponse.json(
    { message: "API_BASE_URL is not configured in .env file." },
    { status: 503 }
  );
}

function buildTarget(request, itemId) {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const target = new URL(
    `${baseUrl}/api/restaurant/user/cart/items/${encodeURIComponent(itemId)}`
  );
  const frontendDomainUrl = request.nextUrl.searchParams.get("frontendDomainUrl");
  if (frontendDomainUrl) {
    target.searchParams.set("frontendDomainUrl", frontendDomainUrl);
  }
  return target;
}

async function parseBackend(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : { message: "Empty response from backend" };
  } catch {
    return { message: text || "Backend returned non-JSON response." };
  }
}

async function proxyMutation(request, context, method) {
  if (!API_BASE_URL) return noBase();

  const params = await context.params;
  const itemId = String(params?.itemId || "").trim();
  if (!itemId) {
    return NextResponse.json({ message: "Cart item id is required." }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  const target = buildTarget(request, itemId);

  let body;
  if (method === "PUT" || method === "PATCH" || method === "POST") {
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
    const response = await fetch(target.toString(), {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body || {}) } : {}),
      cache: "no-store"
    });
    const data = await parseBackend(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend API is not reachable.";
    return NextResponse.json({ message }, { status: 503 });
  }
}

async function POST(request, context) {
  return proxyMutation(request, context, "POST");
}

async function PUT(request, context) {
  return proxyMutation(request, context, "PUT");
}

async function PATCH(request, context) {
  return proxyMutation(request, context, "PATCH");
}

async function DELETE(request, context) {
  return proxyMutation(request, context, "DELETE");
}

export { DELETE, PATCH, POST, PUT };
