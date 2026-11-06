const SETTINGS_MENU = [
  { id: "userProfile", label: "Profile", title: "Open profile" },
  { id: "profile", label: "Store", title: "Open store" },
  { id: "theme", label: "Theme", title: "Open theme" },
  { id: "currency", label: "Currency", title: "Open currency" },
  { id: "contact", label: "Support", title: "Open support" }
];
let activeSettingsTab = "userProfile";
const listeners = /* @__PURE__ */ new Set();
function getSettingsTab() {
  return activeSettingsTab;
}
function openSettingsTab(tab) {
  activeSettingsTab = tab;
  listeners.forEach((listener) => listener(tab));
}
function subscribeSettingsTab(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export {
  SETTINGS_MENU,
  getSettingsTab,
  openSettingsTab,
  subscribeSettingsTab
};
