'use client';

import { DashboardPage } from '@/dashboard_components/Dashboard/DashboardPage';
import { useAdminNavigate } from '@/dashboard_components/useAdminNavigate';
import { useAdminOrderBridge } from '@/dashboard_components/Layout/AdminShell';

export default function Page() {
  const navigateAdmin = useAdminNavigate();
  const { setSelectedOrder } = useAdminOrderBridge();

  return (
    <DashboardPage
      onNavigateTab={(tab) => navigateAdmin(tab)}
      onSelectOrderDetails={(order) => {
        setSelectedOrder(order);
        navigateAdmin('orders');
      }}
    />
  );
}
