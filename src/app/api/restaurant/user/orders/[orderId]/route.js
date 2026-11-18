import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

async function GET(request, context) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API_BASE_URL is not configured in .env file." },
      { status: 503 }
    );
  }

  const params = await context.params;
  const orderId = String(params?.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json({ message: "Order id is required." }, { status: 400 });
  }

  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const target = new URL(
    `${baseUrl}/api/restaurant/user/orders/${encodeURIComponent(orderId)}`
  );
  const frontendDomainUrl = request.nextUrl.searchParams.get("frontendDomainUrl");
  if (frontendDomainUrl) {
    target.searchParams.set("frontendDomainUrl", frontendDomainUrl);
  }

  const authHeader = request.headers.get("authorization");

  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {})
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

export { GET };
