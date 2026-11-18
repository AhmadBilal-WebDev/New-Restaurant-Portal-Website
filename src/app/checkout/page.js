'use client';

import { GlobalToastContainer } from '@/components/Toast/GlobalToastContainer';
import { CheckoutReviewPage } from '@/components/Customer/CheckoutReviewPage';
import { RestaurantProvider } from '@/contexts/RestaurantContext';

export default function CheckoutPage() {
  return (
    <RestaurantProvider>
      <GlobalToastContainer />
      <CheckoutReviewPage />
    </RestaurantProvider>
  );
}
