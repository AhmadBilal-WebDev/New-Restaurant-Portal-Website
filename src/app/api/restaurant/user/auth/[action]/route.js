import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;
const POST_ACTIONS = new Set([
  "request-otp",
  "signin",
  "verify-otp",
  "resend-otp",
  "logout",
  "upload-profilepitcher",
  "profile"
]);
const PUT_ACTIONS = new Set(["profile"]);

function noBase() {
  return NextResponse.json(
    { message: "API_BASE_URL is not configured in .env file." },
    { status: 503 }
  );
}

function buildTarget(action, request) {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const target = new URL(`${baseUrl}/api/restaurant/user/auth/${action}`);
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

async function POST(request, context) {
  if (!API_BASE_URL) return noBase();

  const params = await context.params;
  const action = String(params?.action || "").trim();
  if (!POST_ACTIONS.has(action)) {
    return NextResponse.json({ message: "Unsupported auth action." }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  const target = buildTarget(action, request);

  try {
    if (action === "upload-profilepitcher") {
      const formData = await request.formData();
      const response = await fetch(target.toString(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: formData,
        cache: "no-store"
      });
      const data = await parseBackend(response);
      return NextResponse.json(data, { status: response.status });
    }

    let body = {};
    if (action !== "logout") {
      try {
        body = await request.json();
      } catch {
        if (action !== "logout") {
          return NextResponse.json(
            { message: "Invalid or empty JSON body received." },
            { status: 400 }
          );
        }
      }
    } else {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }

    const needsAuth = action === "logout" || action === "profile";
    const response = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(needsAuth && authHeader ? { Authorization: authHeader } : {})
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

async function PUT(request, context) {
  if (!API_BASE_URL) return noBase();

  const params = await context.params;
  const action = String(params?.action || "").trim();
  if (!PUT_ACTIONS.has(action)) {
    return NextResponse.json({ message: "Unsupported auth action." }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid or empty JSON body received." }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  const target = buildTarget(action, request);

  try {
    const response = await fetch(target.toString(), {
      method: "PUT",
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

async function GET(request, context) {
  if (!API_BASE_URL) return noBase();

  const params = await context.params;
  const action = String(params?.action || "").trim();
  if (action !== "profile") {
    return NextResponse.json({ message: "Unsupported auth action." }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  const target = buildTarget(action, request);

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

const DELETE_ACTIONS = new Set(["remove-profilepitcher", "profile"]);

async function DELETE(request, context) {
  if (!API_BASE_URL) return noBase();

  const params = await context.params;
  const action = String(params?.action || "").trim();
  if (!DELETE_ACTIONS.has(action)) {
    return NextResponse.json({ message: "Unsupported auth action." }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  const target = buildTarget(action, request);

  try {
    const response = await fetch(target.toString(), {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify({}),
      cache: "no-store"
    });
    const data = await parseBackend(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend API is not reachable.";
    return NextResponse.json({ message }, { status: 503 });
  }
}

export { DELETE, GET, POST, PUT };
