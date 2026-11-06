import { proxyBannerRequest } from './proxy';
async function GET(request) {
  return proxyBannerRequest(request, "", "GET");
}
async function POST(request) {
  return proxyBannerRequest(request, "", "POST");
}
export {
  GET,
  POST
};
