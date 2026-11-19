'use client';

import dynamic from 'next/dynamic';
import { AdminBootLoader } from '@/dashboard_components/Layout/AdminBootLoader';

const AddStaffPage = dynamic(
  () =>
    import('@/dashboard_components/Staff/AddStaffPage').then((m) => m.AddStaffPage),
  {
    ssr: false,
    loading: () => <AdminBootLoader label="Loading Add Staff" />,
  },
);

export default function Page() {
  return <AddStaffPage />;
}
