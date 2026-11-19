import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

async function GET() {
  const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (!socketUrl) {
    return NextResponse.json(
      {
        success: false,
        message: "Socket URL is not configured (API_BASE_URL / NEXT_PUBLIC_SOCKET_URL).",
        socketUrl: ""
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    socketUrl,
    path: process.env.SOCKET_IO_PATH || "/socket.io"
  });
}

export { GET };
