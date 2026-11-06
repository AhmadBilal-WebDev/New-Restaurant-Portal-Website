import React from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { getOwnerIdentity, subscribeOwnerIdentity } from '@/shared/lib/ownerProfile';
const AdminFooter = () => {
  const { config } = useRestaurant();
  const [restaurantName, setRestaurantName] = React.useState(getOwnerIdentity().restaurantName);
  React.useEffect(() => {
    const unsubscribe = subscribeOwnerIdentity(() => {
      setRestaurantName(getOwnerIdentity().restaurantName);
    });
    return () => {
      unsubscribe();
    };
  }, []);
  return <footer className="border-t border-[#292D35] bg-[var(--admin-bg,#0D0F12)] py-2.5 px-6 text-neutral-400 text-xs select-none">
      {
    /* <span className="font-bold text-white tracking-wide">{restaurantName || config.name}</span> */
  }
    </footer>;
};
export {
  AdminFooter
};
