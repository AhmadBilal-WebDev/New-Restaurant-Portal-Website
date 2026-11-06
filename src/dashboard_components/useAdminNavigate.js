'use client';

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { tabIdToHref } from '@/dashboard_components/adminRoutes';
function useAdminNavigate() {
  const router = useRouter();
  const { setActiveAdminTab } = useRestaurant();
  return useCallback(
    (tabId, options) => {
      const href = tabIdToHref(tabId);
      setActiveAdminTab(tabId);
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [router, setActiveAdminTab]
  );
}
export {
  useAdminNavigate
};
