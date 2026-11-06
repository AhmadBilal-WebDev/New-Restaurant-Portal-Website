'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import { getFrontendDomainUrl } from '@/shared/lib/catalogApi';
import {
  createBranchArea,
  deleteBranchArea,
  getBranchAreas
} from '@/shared/lib/areasApi';
import {
  BranchServiceAreaEditor,
  radiusToPolygon
} from '@/dashboard_components/Branches/BranchServiceAreaEditor';
import {
  Edit2,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  X
} from "lucide-react";

const SURFACE =
  "rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14161B)]";

const INPUT =
  "w-full rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-input,#101216)] px-3 py-2 text-[var(--admin-text,#fff)] placeholder:text-[var(--admin-faint,#737373)] focus:outline-none focus:border-[var(--color-admin-accent,#FF5A1F)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_30%,transparent)]";

function AreasPage() {
  const { branches, setBranches, addToast } = useRestaurant();
  const { isAllBranches, activeBranchFilter, liveBranches } = useBranchScope();

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    branchId: "",
    radiusKm: 5,
    polygon: []
  });

  const scopedBranches = useMemo(() => {
    const source = liveBranches.length ? liveBranches : branches;
    return isAllBranches ? source : source.filter((b) => b.id === activeBranchFilter);
  }, [liveBranches, branches, isAllBranches, activeBranchFilter]);

  const selectedBranch = useMemo(
    () => scopedBranches.find((b) => b.id === form.branchId) || null,
    [scopedBranches, form.branchId]
  );

  const loadAreas = useCallback(
    async ({ silent = false } = {}) => {
      if (!scopedBranches.length) {
        setAreas([]);
        setLoading(false);
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);

      const domain = getFrontendDomainUrl();
      const results = await Promise.all(
        scopedBranches.map(async (branch) => {
          const result = await getBranchAreas(branch.id, domain);
          let list = (result.areas || []).map((area) => ({
            ...area,
            branchId: area.branchId || branch.id,
            branchName: branch.name,
            branchCode: branch.branchCode || branch.shortName || "",
            branchLatitude: branch.latitude || "",
            branchLongitude: branch.longitude || ""
          }));

          // Fallback: zones already nested on branch payload
          if ((!result.ok || result.status === 404 || list.length === 0) &&
              Array.isArray(branch.serviceAreas) &&
              branch.serviceAreas.length) {
            list = branch.serviceAreas.map((area, index) => ({
              id: area.id || `branch-area-${branch.id}-${index}`,
              branchId: branch.id,
              branchName: branch.name,
              branchCode: branch.branchCode || branch.shortName || "",
              branchLatitude: branch.latitude || "",
              branchLongitude: branch.longitude || "",
              radiusKm: area.radiusKm || 0,
              polygon: area.polygon || [],
              isActive: area.isActive !== false
            }));
          }

          return {
            ok: result.ok,
            status: result.status,
            message: result.message,
            areas: list
          };
        })
      );

      const collected = results.flatMap((r) => r.areas);
      const failures = results.filter((r) => !r.ok && r.status !== 404);
      const anyListSupported = results.some((r) => r.ok && r.status !== 404);
      setAreas((prev) => (anyListSupported || collected.length > 0 ? collected : prev));

      if (failures.length && !silent) {
        addToast(
          "Partial load",
          failures[0].message || "Some branch areas could not be loaded.",
          "warning"
        );
      }

      if (silent) setRefreshing(false);
      else setLoading(false);
    },
    [scopedBranches, addToast]
  );

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  const filteredAreas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return areas.filter((area) => {
      if (branchFilter !== "all" && area.branchId !== branchFilter) return false;
      if (!q) return true;
      return [area.branchName, area.branchCode, String(area.radiusKm || "")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [areas, searchQuery, branchFilter]);

  const stats = useMemo(() => {
    const withPolygon = areas.filter((a) => (a.polygon || []).length >= 3).length;
    const byBranch = scopedBranches.map((b) => ({
      id: b.id,
      label: b.name,
      value: areas.filter((a) => a.branchId === b.id).length
    }));
    const max = Math.max(...byBranch.map((b) => b.value), 1);
    return { total: areas.length, withPolygon, byBranch, max };
  }, [areas, scopedBranches]);

  const buildDefaultForm = (branchId) => {
    const branch = scopedBranches.find((b) => b.id === branchId);
    const lat = Number(branch?.latitude);
    const lng = Number(branch?.longitude);
    const radiusKm = 5;
    return {
      branchId: branchId || "",
      radiusKm,
      polygon:
        Number.isFinite(lat) && Number.isFinite(lng)
          ? radiusToPolygon(lat, lng, radiusKm)
          : []
    };
  };

  const openAdd = () => {
    const defaultBranch =
      branchFilter !== "all" ? branchFilter : scopedBranches[0]?.id || "";
    setEditing(null);
    setForm(buildDefaultForm(defaultBranch));
    setIsModalOpen(true);
  };

  const openEdit = (area) => {
    const branch = scopedBranches.find((b) => b.id === area.branchId);
    const lat = Number(branch?.latitude ?? area.branchLatitude);
    const lng = Number(branch?.longitude ?? area.branchLongitude);
    const radiusKm = area.radiusKm > 0 ? area.radiusKm : 5;
    setEditing(area);
    setForm({
      branchId: area.branchId,
      radiusKm,
      polygon:
        area.polygon?.length >= 3
          ? area.polygon
          : Number.isFinite(lat) && Number.isFinite(lng)
            ? radiusToPolygon(lat, lng, radiusKm)
            : []
    });
    setIsModalOpen(true);
  };

  const handleBranchChange = (branchId) => {
    // Switching branch resets pin to that restaurant and rebuilds zone around it.
    setForm(buildDefaultForm(branchId));
  };

  const handleMapChange = useCallback((next) => {
    setForm((prev) => ({
      ...prev,
      radiusKm: next.radiusKm,
      polygon: next.polygon || []
    }));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.branchId) {
      addToast("Branch required", "Select a branch first.", "error");
      return;
    }
    if (!selectedBranch?.latitude || !selectedBranch?.longitude) {
      addToast(
        "Location missing",
        "Selected branch has no latitude/longitude from the API.",
        "error"
      );
      return;
    }
    if (!(Number(form.radiusKm) > 0)) {
      addToast("Radius required", "Set how many km around the restaurant you cover.", "error");
      return;
    }
    if (!Array.isArray(form.polygon) || form.polygon.length < 3) {
      addToast("Zone required", "Draw or set a polygon with at least 3 points.", "error");
      return;
    }

    setSaving(true);
    const payload = {
      radiusKm: Number(form.radiusKm),
      polygon: form.polygon
    };
    const domain = getFrontendDomainUrl();
    // Backend upserts via PUT /branches/:id/areas (POST is not supported).
    const result = await createBranchArea(form.branchId, payload, domain);
    setSaving(false);

    if (!result.ok) {
      addToast(editing ? "Update failed" : "Create failed", result.message, "error");
      return;
    }

    const saved = {
      id: result.area?.id || editing?.id || `area_${Date.now()}`,
      branchId: form.branchId,
      branchName: selectedBranch.name,
      branchCode: selectedBranch.branchCode || selectedBranch.shortName || "",
      branchLatitude: selectedBranch.latitude,
      branchLongitude: selectedBranch.longitude,
      radiusKm: payload.radiusKm,
      polygon: payload.polygon,
      isActive: true
    };

    setAreas((prev) => {
      if (editing) {
        return prev.map((item) =>
          item.id === editing.id && item.branchId === editing.branchId ? saved : item
        );
      }
      return [saved, ...prev];
    });

    if (typeof setBranches === "function") {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === form.branchId
            ? {
                ...b,
                serviceAreas: [
                  {
                    id: saved.id,
                    radiusKm: saved.radiusKm,
                    polygon: saved.polygon,
                    isActive: true
                  }
                ]
              }
            : b
        )
      );
    }

    addToast(
      editing ? "Area updated" : "Area created",
      `${selectedBranch.name} service zone saved.`,
      "success"
    );
    setIsModalOpen(false);
    await loadAreas({ silent: true });
  };

  const handleDelete = async (area) => {
    if (!area?.branchId) return;
    setDeletingId(area.id || area.branchId);
    const result = await deleteBranchArea(area.branchId, area.id, getFrontendDomainUrl());
    setDeletingId("");
    if (!result.ok) {
      addToast("Delete failed", result.message, "error");
      return;
    }
    addToast("Area deleted", result.message, "success");
    // Collection DELETE clears the branch zone on backend.
    setAreas((prev) => prev.filter((item) => item.branchId !== area.branchId));
    if (typeof setBranches === "function") {
      setBranches((prev) =>
        prev.map((b) => (b.id === area.branchId ? { ...b, serviceAreas: [] } : b))
      );
    }
    await loadAreas({ silent: true });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-admin-accent,#FF5A1F)]">
            Delivery coverage
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--admin-text,#fff)] sm:text-3xl">
            Areas & Towns
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--admin-subtle,#A3A3A3)]">
            Select a branch — pin locks on that restaurant. Then set radius / polygon around it.
            Saved as <code className="text-[var(--color-admin-accent,#FF5A1F)]">radiusKm</code> +{" "}
            <code className="text-[var(--color-admin-accent,#FF5A1F)]">polygon</code> only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadAreas({ silent: true })}
            disabled={refreshing || loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--admin-border,#292D35)] px-3 py-2.5 text-sm font-bold text-[var(--admin-subtle,#A3A3A3)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Add area
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          {
            label: "Total zones",
            value: stats.total,
            icon: MapPin,
            tone: "text-[var(--color-admin-accent,#FF5A1F)] bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_12%,transparent)]"
          },
          {
            label: "With polygon",
            value: stats.withPolygon,
            icon: Layers,
            tone: "text-sky-400 bg-sky-500/10"
          },
          {
            label: "Branches",
            value: scopedBranches.length,
            icon: Store,
            tone: "text-violet-400 bg-violet-500/10"
          }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${SURFACE} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-faint,#737373)]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-black tabular-nums text-[var(--admin-text,#fff)]">
                    {card.value}
                  </p>
                </div>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14171C)] p-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle,#A3A3A3)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by branch..."
            className={`${INPUT} pl-10`}
          />
        </div>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className={`${INPUT} sm:w-52`}
        >
          <option value="all">All branches</option>
          {scopedBranches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${SURFACE} h-40 animate-pulse bg-[var(--admin-hover,#1A1D24)]`} />
          ))}
        </div>
      ) : filteredAreas.length === 0 ? (
        <div className={`${SURFACE} px-6 py-16 text-center`}>
          <MapPin className="mx-auto h-10 w-10 text-[var(--admin-faint,#737373)]" />
          <p className="mt-3 text-sm font-bold text-[var(--admin-text,#fff)]">No service zones yet</p>
          <p className="mt-1 text-xs text-[var(--admin-faint,#737373)]">
            Pick a branch and mark how far around the restaurant you deliver.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Add first area
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAreas.map((area) => (
            <div key={`${area.branchId}-${area.id}`} className={`${SURFACE} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-admin-accent,#FF5A1F)_12%,transparent)] text-[var(--color-admin-accent,#FF5A1F)]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 truncate text-base font-bold text-[var(--admin-text,#fff)]">
                    {area.branchName || "Branch"}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--admin-subtle,#A3A3A3)]">
                    Radius {area.radiusKm || 0} km · {(area.polygon || []).length} points
                  </p>
                  {(area.branchLatitude || area.branchLongitude) && (
                    <p className="mt-1 font-mono text-[10px] text-[var(--admin-faint,#737373)]">
                      Restaurant: {area.branchLatitude}, {area.branchLongitude}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(area)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--admin-border,#292D35)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--admin-subtle,#A3A3A3)]"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(area)}
                  disabled={deletingId === area.id}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--admin-border,#292D35)] px-2.5 py-1.5 text-[11px] font-bold text-red-400 disabled:opacity-50"
                >
                  {deletingId === area.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-elevated,#14161B)] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--admin-border,#292D35)] px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-[var(--admin-text,#fff)]">
                  {editing ? "Edit service area" : "Add service area"}
                </h2>
                <p className="text-[11px] text-[var(--admin-faint,#737373)]">
                  Pin = selected branch restaurant. Zone around it is what gets saved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-lg p-2 text-[var(--admin-subtle,#A3A3A3)] hover:bg-[var(--admin-hover,#1A1D24)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--admin-faint,#737373)]">
                  Branch
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className={INPUT}
                  required
                  disabled={Boolean(editing)}
                >
                  <option value="">Select branch</option>
                  {scopedBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.latitude && b.longitude ? "" : " (no coordinates)"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBranch ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                      Restaurant lat
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-[var(--admin-text,#fff)]">
                      {selectedBranch.latitude || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                      Restaurant lng
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-[var(--admin-text,#fff)]">
                      {selectedBranch.longitude || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                      City
                    </p>
                    <p className="mt-0.5 truncate text-sm font-bold text-[var(--admin-text,#fff)]">
                      {selectedBranch.city || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--admin-border,#292D35)] bg-[var(--admin-surface,#101216)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-[var(--admin-faint,#737373)]">
                      Code
                    </p>
                    <p className="mt-0.5 truncate text-sm font-bold text-[var(--admin-text,#fff)]">
                      {selectedBranch.branchCode || selectedBranch.shortName || "—"}
                    </p>
                  </div>
                </div>
              ) : null}

              <BranchServiceAreaEditor
                branchName={selectedBranch?.name || "Restaurant"}
                latitude={selectedBranch?.latitude}
                longitude={selectedBranch?.longitude}
                radiusKm={form.radiusKm}
                polygon={form.polygon}
                onChange={handleMapChange}
              />

              <div className="flex gap-2 border-t border-[var(--admin-border,#292D35)] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-[var(--admin-border,#292D35)] px-4 py-2.5 text-sm font-bold text-[var(--admin-subtle,#A3A3A3)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-admin-accent,#FF5A1F)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? "Save changes" : "Create area"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { AreasPage };
