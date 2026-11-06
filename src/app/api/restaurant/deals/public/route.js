import { proxyDealsRequest } from "../proxy";
async function GET(request) {
  return proxyDealsRequest(request, "/public", "GET", true);
}
export {
  GET
};
