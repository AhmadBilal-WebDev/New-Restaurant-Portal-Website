import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

function noBase() {
  return NextResponse.json(
    { message: "API_BASE_URL is not configured in .env file." },
    { status: 503 }
  );
}

function buildTarget(request) {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const target = new URL(`${baseUrl}/api/restaurant/user/orders`);
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

async function GET(request) {
  if (!API_BASE_URL) return noBase();

  const authHeader = request.headers.get("authorization");
  const target = buildTarget(request);

  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      cache: "no-store"
    });
    const data = await parseBackend(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend API is not reachable.";
    return NextResponse.json({ message }, { status: 503 });
  }
}

async function POST(request) {
  if (!API_BASE_URL) return noBase();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid or empty JSON body received." },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const target = buildTarget(request);
  const frontendDomainUrl =
    request.nextUrl.searchParams.get("frontendDomainUrl") ||
    (typeof body?.frontendDomainUrl === "string" ? body.frontendDomainUrl : "");
  if (frontendDomainUrl && !target.searchParams.get("frontendDomainUrl")) {
    target.searchParams.set("frontendDomainUrl", frontendDomainUrl);
  }

  try {
    const response = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify(body || {}),
      cache: "no-store"
    });
    const data = await parseBackend(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend API is not reachable.";
    return NextResponse.json({ message }, { status: 503 });
  }
}

export { GET, POST };
