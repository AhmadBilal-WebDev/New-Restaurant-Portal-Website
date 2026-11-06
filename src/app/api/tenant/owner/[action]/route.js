import { NextResponse } from "next/server";
import { proxyTenantOwnerAction } from '@/shared/lib/backendProxy';
async function POST(request, context) {
  const { action } = await context.params;
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { status, data } = await proxyTenantOwnerAction(action, body);
  return NextResponse.json(data, { status });
}
export {
  POST
};
