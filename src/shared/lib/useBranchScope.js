import { useMemo } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { belongsToActiveBranch, productVisibleForBranch } from "./branchScope";
import { filterBranchesForStaff, getStaffAccess, isStaffSession } from "./staffAccess";
function useBranchScope() {
  const { branches, activeBranchFilter } = useRestaurant();
  return useMemo(() => {
    const staffAccess = isStaffSession() ? getStaffAccess() : null;
    const scopedBranches = filterBranchesForStaff(branches, staffAccess);
    const liveBranches = scopedBranches.filter((b) => b.isActive !== false);
    const liveIds = new Set(liveBranches.map((b) => b.id));
    const primaryBranchId = activeBranchFilter !== "all" && liveIds.has(activeBranchFilter) ? activeBranchFilter : liveBranches[0]?.id || "";
    const matchesBranch = (branchId) => belongsToActiveBranch(branchId, activeBranchFilter, liveIds);
    const matchesAvailability = (availability) => productVisibleForBranch(availability, activeBranchFilter, liveIds);
    const filterByBranch = (rows) => rows.filter((row) => matchesBranch(row.branchId));
    return {
      branches: scopedBranches,
      liveBranches,
      liveIds,
      activeBranchFilter,
      primaryBranchId,
      isAllBranches: activeBranchFilter === "all",
      matchesBranch,
      matchesAvailability,
      filterByBranch,
      staffAccess,
      canSwitchBranches: liveBranches.length > 1
    };
  }, [branches, activeBranchFilter]);
}
export {
  useBranchScope
};
