import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

async function proxyThemeRequest(request, method) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: 'API_BASE_URL is not configured in .env file.' },
      { status: 503 },
    );
  }

  const target = new URL(
    `${API_BASE_URL.replace(/\/$/, '')}/api/restaurant/theme`,
  );

  const domain = request.nextUrl.searchParams.get('domain');
  if (domain) {
    target.searchParams.set('domain', domain);
  }

  let body;
  if (method === 'PUT' || method === 'POST' || method === 'PATCH') {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: 'Invalid or empty JSON body received.' },
        { status: 400 },
      );
    }

    const theme =
      typeof body?.theme === 'string' ? body.theme.trim().toLowerCase() : '';
    if (theme !== 'dark' && theme !== 'light') {
      return NextResponse.json(
        { message: 'theme must be "dark" or "light".' },
        { status: 400 },
      );
    }
    body = { theme };
  }

  try {
    const authHeader = request.headers.get('authorization');
    const response = await fetch(target.toString(), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });

    const responseText = await response.text();
    let data;
    try {
      data = responseText
        ? JSON.parse(responseText)
        : { message: 'Empty response from backend.' };
    } catch {
      data = {
        message: responseText || 'Backend returned a non-JSON response.',
      };
    }

    return response.status === 204
      ? new NextResponse(null, { status: response.status })
      : NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Backend API is not reachable.';
    return NextResponse.json({ message }, { status: 503 });
  }
}

export function GET(request) {
  return proxyThemeRequest(request, 'GET');
}

export function PUT(request) {
  return proxyThemeRequest(request, 'PUT');
}

export function POST(request) {
  return proxyThemeRequest(request, 'POST');
}
