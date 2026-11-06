import { proxyBannerRequest } from "../proxy";
async function GET(request) {
  return proxyBannerRequest(request, "/public", "GET", true);
}
export {
  GET
};
