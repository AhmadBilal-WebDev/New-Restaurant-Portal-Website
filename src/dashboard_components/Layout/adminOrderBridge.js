"use client";

import { createContext, useContext } from "react";

const AdminOrderBridgeContext = createContext({
  selectedOrder: null,
  setSelectedOrder: () => {}
});

function useAdminOrderBridge() {
  return useContext(AdminOrderBridgeContext);
}

export { AdminOrderBridgeContext, useAdminOrderBridge };
