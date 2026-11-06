'use client';

import { useRouter } from 'next/navigation';
import { GlobalToastContainer } from '@/components/Toast/GlobalToastContainer';
import { CustomerSite } from '@/components/Customer/CustomerSite';
import { RestaurantProvider } from '@/contexts/RestaurantContext';

export function CustomerApp() {
  const router = useRouter();

  return (
    <RestaurantProvider>
      <GlobalToastContainer />
      <CustomerSite onOpenAdmin={() => router.push('/admin/dashboard')} />
    </RestaurantProvider>
  );
}
