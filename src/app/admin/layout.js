'use client';

import dynamic from 'next/dynamic';
import { RestaurantProvider } from '@/contexts/RestaurantContext';
import { GlobalToastContainer } from '@/components/Toast/GlobalToastContainer';
import { AdminBootLoader } from '@/dashboard_components/Layout/AdminBootLoader';

const AdminShell = dynamic(
  () =>
    import('@/dashboard_components/Layout/AdminShell').then((m) => m.AdminShell),
  {
    ssr: false,
    loading: () => <AdminBootLoader />,
  },
);

export default function AdminLayout({ children }) {
  return (
    <RestaurantProvider>
      <GlobalToastContainer />
      <AdminShell>{children}</AdminShell>
    </RestaurantProvider>
  );
}
