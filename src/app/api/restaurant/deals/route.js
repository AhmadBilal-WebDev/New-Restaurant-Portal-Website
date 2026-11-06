import { proxyDealsRequest } from './proxy';
async function GET(request) {
  return proxyDealsRequest(request, "", "GET");
}
async function POST(request) {
  return proxyDealsRequest(request, "", "POST");
}
export {
  GET,
  POST
};
