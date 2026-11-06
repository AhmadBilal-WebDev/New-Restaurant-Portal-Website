import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

function backendBase() {
  return String(API_BASE_URL || "").replace(/\/$/, "");
}

function targetUrl(branchId, areaId, searchParams) {
  const target = new URL(
    `${backendBase()}/api/restaurant/owner/branches/${encodeURIComponent(branchId)}/areas/${encodeURIComponent(areaId)}`
  );
  const frontendDomainUrl = searchParams.get("frontendDomainUrl");
  if (frontendDomainUrl) target.searchParams.set("frontendDomainUrl", frontendDomainUrl);
  return target;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : { message: "Empty response from backend" };
  } catch {
    return { message: text || "Backend returned non-JSON response." };
  }
}

async function PUT(request, context) {
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
  const { branchId, areaId } = await context.params;
  const authHeader = request.headers.get("authorization");
  try {
    const response = await fetch(
      targetUrl(branchId, areaId, request.nextUrl.searchParams).toString(),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify(body),
        cache: "no-store"
      }
    );
    const data = await parseJsonSafe(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend API is not reachable.";
    return NextResponse.json({ message }, { status: 503 });
  }
}

async function DELETE(request, context) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured in .env file." },
      { status: 503 }
    );
  }
  const { branchId, areaId } = await context.params;
  const authHeader = request.headers.get("authorization");
  try {
    const response = await fetch(
      targetUrl(branchId, areaId, request.nextUrl.searchParams).toString(),
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        cache: "no-store"
      }
    );
    const data = await parseJsonSafe(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend API is not reachable.";
    return NextResponse.json({ message }, { status: 503 });
  }
}

export { DELETE, PUT };
