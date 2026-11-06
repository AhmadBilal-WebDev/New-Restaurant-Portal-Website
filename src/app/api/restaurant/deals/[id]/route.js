import { proxyDealsRequest } from "../proxy";
async function PUT(request, context) {
  const { id } = await context.params;
  return proxyDealsRequest(request, `/${encodeURIComponent(id)}`, "PUT");
}
async function DELETE(request, context) {
  const { id } = await context.params;
  return proxyDealsRequest(request, `/${encodeURIComponent(id)}`, "DELETE");
}
export {
  DELETE,
  PUT
};
