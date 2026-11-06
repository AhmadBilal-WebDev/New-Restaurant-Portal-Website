import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

async function POST(request, context) {
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

  const { branchId } = await context.params;
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const target = new URL(
    `${baseUrl}/api/restaurant/branches/${encodeURIComponent(branchId)}/check-service-area`
  );
  const frontendDomainUrl = request.nextUrl.searchParams.get("frontendDomainUrl");
  if (frontendDomainUrl) target.searchParams.set("frontendDomainUrl", frontendDomainUrl);

  try {
    const response = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
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

export { POST };
