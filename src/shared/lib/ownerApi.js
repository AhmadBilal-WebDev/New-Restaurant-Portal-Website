import { getOwnerSession } from "./ownerSession";
async function getSidebarButtons() {
  try {
    const session = getOwnerSession();
    const token = session?.token || (typeof window !== "undefined" ? localStorage.getItem("owner_token") : null);
    const response = await fetch("/api/restaurant/sidebar-buttons", {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...token ? { Authorization: `Bearer ${token}` } : {}
      }
    });
    const data = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    console.error("Sidebar Buttons API Error:", error);
    return {
      ok: false,
      status: 500,
      data: null
    };
  }
}
export {
  getSidebarButtons
};
