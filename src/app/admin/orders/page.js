'use client';

import { useEffect, useState } from 'react';
import { OrdersPage } from '@/dashboard_components/Orders/OrdersPage';
import { useAdminOrderBridge } from '@/dashboard_components/Layout/AdminShell';

export default function Page() {
  const { selectedOrder, setSelectedOrder } = useAdminOrderBridge();
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (selectedOrder) {
      setInitial(selectedOrder);
      setSelectedOrder(null);
    }
  }, [selectedOrder, setSelectedOrder]);

  return <OrdersPage initialSelectedOrder={initial} />;
}
