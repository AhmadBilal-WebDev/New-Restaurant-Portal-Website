function branchSearchText(branch) {
  return [branch.id, branch.name, branch.shortName, branch.city, branch.area].filter(Boolean).join(" ").toLowerCase();
}
const KEYWORD_ALIASES = [
  { oldIds: ["branch-renala"], keywords: ["renala", "renalakhurd", "renala khurd"] },
  { oldIds: ["branch-okara"], keywords: ["okara", "cantonment", "cantt"] },
  {
    oldIds: ["branch-downtown", "downtown-central"],
    keywords: ["downtown", "lahore", "gulberg", "central"]
  },
  { oldIds: ["westside-boulevard"], keywords: ["westside", "marina", "west"] }
];
function buildBranchIdRemap(apiBranches) {
  const live = apiBranches.filter((b) => b.isActive !== false);
  if (!live.length) return {};
  const map = {};
  for (const branch of live) map[branch.id] = branch.id;
  const findByKeyword = (keyword) => live.find((branch) => branchSearchText(branch).includes(keyword.toLowerCase()));
  for (const alias of KEYWORD_ALIASES) {
    let matched;
    for (const keyword of alias.keywords) {
      matched = findByKeyword(keyword);
      if (matched) break;
    }
    if (!matched) continue;
    for (const oldId of alias.oldIds) map[oldId] = matched.id;
  }
  const leftovers = [
    "branch-renala",
    "branch-okara",
    "branch-downtown",
    "downtown-central",
    "westside-boulevard"
  ];
  leftovers.forEach((oldId, index) => {
    if (!map[oldId]) map[oldId] = live[index % live.length].id;
  });
  return map;
}
function remapBranchId(id, map, liveIds, fallbackIndex = 0) {
  if (!id || id === "all") return id || "all";
  if (map[id]) return map[id];
  if (liveIds.includes(id)) return id;
  if (!liveIds.length) return id;
  return liveIds[fallbackIndex % liveIds.length];
}
function belongsToActiveBranch(entityBranchId, activeBranchFilter, liveBranchIds) {
  if (!entityBranchId) return activeBranchFilter === "all";
  if (entityBranchId === "all") return true;
  if (activeBranchFilter === "all") return liveBranchIds.has(entityBranchId);
  return entityBranchId === activeBranchFilter;
}
function productVisibleForBranch(availability, activeBranchFilter, liveBranchIds) {
  if (!availability || availability.length === 0) return activeBranchFilter === "all" || liveBranchIds.size > 0;
  if (activeBranchFilter === "all") {
    return availability.some((id) => liveBranchIds.has(id) || id === "all");
  }
  return availability.includes(activeBranchFilter) || availability.includes("all");
}
export {
  belongsToActiveBranch,
  branchSearchText,
  buildBranchIdRemap,
  productVisibleForBranch,
  remapBranchId
};
