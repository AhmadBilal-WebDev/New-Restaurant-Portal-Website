import { proxyBannerRequest } from "../proxy";
async function PUT(request, context) {
  const { id } = await context.params;
  return proxyBannerRequest(request, `/${encodeURIComponent(id)}`, "PUT");
}
async function DELETE(request, context) {
  const { id } = await context.params;
  return proxyBannerRequest(request, `/${encodeURIComponent(id)}`, "DELETE");
}
export {
  DELETE,
  PUT
};
