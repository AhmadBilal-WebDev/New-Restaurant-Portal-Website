import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Bike, Plus, Search, Phone, Edit2, Trash2, Car } from "lucide-react";
const RidersPage = () => {
  const { riders, addRider, updateRider, deleteRider, branches, activeBranchFilter, addToast } = useRestaurant();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("bike");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [status, setStatus] = useState("available");
  const openCreateModal = () => {
    setEditingRider(null);
    setName("");
    setPhone("+92 300 ");
    setVehicleType("bike");
    setVehiclePlate("LHR-");
    setBranchId(activeBranchFilter !== "all" ? activeBranchFilter : branches[0]?.id || "");
    setStatus("available");
    setIsModalOpen(true);
  };
  const openEditModal = (rider) => {
    setEditingRider(rider);
    setName(rider.name);
    setPhone(rider.phone);
    const riderVehicleType = rider.vehicleType === "car" || rider.vehicleType === "van" ? rider.vehicleType : "bike";
    setVehicleType(riderVehicleType);
    setVehiclePlate(rider.vehiclePlate);
    setBranchId(rider.branchId);
    const riderStatus = rider.status === "inactive" || rider.status === "on_delivery" ? rider.status : "available";
    setStatus(riderStatus);
    setIsModalOpen(true);
  };
  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      addToast("Please provide rider name and phone number.", "warning");
      return;
    }
    const assignedB = branches.find((b) => b.id === branchId) || branches[0];
    const riderData = {
      id: editingRider ? editingRider.id : `rider-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      vehicle: vehicleType || "Bike",
      vehicleType,
      vehiclePlate: vehiclePlate.trim() || "BIKE-001",
      branchId: assignedB.id,
      branchName: assignedB.name,
      status,
      completedOrdersCount: editingRider ? editingRider.completedOrdersCount : 0,
      rating: editingRider ? editingRider.rating : 5,
      currentLat: editingRider ? editingRider.currentLat : 30.9612,
      currentLng: editingRider ? editingRider.currentLng : 73.6015
    };
    if (editingRider) {
      updateRider(riderData);
      addToast(`Rider "${riderData.name}" updated successfully.`, "success");
    } else {
      addRider(riderData);
      addToast(`Rider "${riderData.name}" added successfully.`, "success");
    }
    setIsModalOpen(false);
  };
  const liveIds = new Set(branches.filter((b) => b.isActive !== false).map((b) => b.id));
  const filteredRiders = riders.filter((r) => {
    const matchesBranch = liveIds.size > 0 && (activeBranchFilter === "all" ? liveIds.has(r.branchId) : r.branchId === activeBranchFilter);
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.phone.toLowerCase().includes(searchQuery.toLowerCase()) || r.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {
    /* Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Bike className="w-6 h-6 text-[#FF5A1F]" />
            <span>Delivery Fleet & Riders</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Manage your delivery personnel, fleet vehicles, order assignment, and live shift status.
          </p>
        </div>

        <button
    onClick={openCreateModal}
    className="flex items-center gap-2 bg-[#FF5A1F] hover:bg-[#E04810] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-[#FF5A1F]/20 transition-all cursor-pointer self-start sm:self-auto"
  >
          <Plus className="w-4 h-4" />
          <span>Add New Rider</span>
        </button>
      </div>

      {
    /* Summary Stats */
  }
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#14171C] border border-[#292D35] rounded-xl p-4">
          <div className="text-[11px] text-neutral-400 font-bold uppercase">Total Fleet</div>
          <div className="text-2xl font-black text-white mt-1">{riders.length}</div>
        </div>
        <div className="bg-[#14171C] border border-[#292D35] rounded-xl p-4">
          <div className="text-[11px] text-emerald-400 font-bold uppercase">Available</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {riders.filter((r) => r.status === "available" || r.status === "idle").length}
          </div>
        </div>
        <div className="bg-[#14171C] border border-[#292D35] rounded-xl p-4">
          <div className="text-[11px] text-amber-400 font-bold uppercase">On Delivery</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {riders.filter((r) => r.status === "on_delivery" || r.status === "on_the_way").length}
          </div>
        </div>
        <div className="bg-[#14171C] border border-[#292D35] rounded-xl p-4">
          <div className="text-[11px] text-neutral-500 font-bold uppercase">Off Shift</div>
          <div className="text-2xl font-black text-neutral-400 mt-1">
            {riders.filter((r) => r.status === "inactive").length}
          </div>
        </div>
      </div>

      {
    /* Search Input */
  }
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search riders by name, phone, or plate..."
    className="w-full bg-[#191B20] border border-[#292D35] rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#FF5A1F]"
  />
      </div>

      {
    /* Riders List Table */
  }
      <div className="bg-[#14171C] border border-[#292D35] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#191B20] text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#292D35]">
              <tr>
                <th className="py-3 px-4">Rider</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Deliveries</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292D35]/60 text-neutral-200">
              {filteredRiders.map((rider) => <tr key={rider.id} className="hover:bg-[#191B20]/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{rider.name}</div>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-neutral-500" />
                      <span>{rider.phone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-bold capitalize">
                      {rider.vehicleType === "bike" ? <Bike className="w-3.5 h-3.5 text-[#FF5A1F]" /> : <Car className="w-3.5 h-3.5 text-blue-400" />}
                      <span>{rider.vehicleType}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">{rider.vehiclePlate}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-neutral-300">{rider.branchName}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
    value={rider.status}
    onChange={(e) => updateRider({ ...rider, status: e.target.value })}
    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border border-transparent cursor-pointer ${rider.status === "available" || rider.status === "idle" ? "bg-emerald-500/15 text-emerald-400" : rider.status === "on_delivery" || rider.status === "on_the_way" ? "bg-amber-500/15 text-amber-400" : "bg-neutral-800 text-neutral-400"}`}
  >
                      <option value="available" className="bg-[#191B20] text-emerald-400">Available</option>
                      <option value="on_delivery" className="bg-[#191B20] text-amber-400">On Delivery</option>
                      <option value="inactive" className="bg-[#191B20] text-neutral-400">Inactive / Off Shift</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-white">{rider.completedOrdersCount || 0}</span>
                    <span className="text-[10px] text-neutral-500 ml-1">orders</span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    <button
    onClick={() => openEditModal(rider)}
    className="p-1.5 rounded-lg bg-[#1D2128] hover:bg-[#252A33] text-neutral-300 hover:text-white transition-colors cursor-pointer"
  >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
    onClick={() => {
      if (confirm(`Remove rider "${rider.name}" from fleet?`)) {
        deleteRider(rider.id);
        addToast("Rider removed successfully.", "info");
      }
    }}
    className="p-1.5 rounded-lg bg-[#1D2128] hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
  >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>)}

              {filteredRiders.length === 0 && <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    No riders found matching the current filter.
                  </td>
                </tr>}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Modal for Add / Edit Rider */
  }
      {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#14171C] rounded-2xl border border-[#292D35] shadow-2xl z-10 overflow-hidden text-xs">
            <div className="p-5 border-b border-[#292D35] flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                {editingRider ? "Edit Delivery Rider" : "Register New Rider"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-neutral-300 font-bold mb-1">Rider Full Name</label>
                <input
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="e.g. Usman Tariq"
    className="w-full bg-[#1D2128] border border-[#292D35] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
  />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Phone Number</label>
                <input
    type="tel"
    required
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    placeholder="+92 300 1234567"
    className="w-full bg-[#1D2128] border border-[#292D35] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
  />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Vehicle Type</label>
                  <select
    value={vehicleType}
    onChange={(e) => setVehicleType(e.target.value)}
    className="w-full bg-[#1D2128] border border-[#292D35] rounded-xl px-3 py-2 text-white"
  >
                    <option value="bike">Motorcycle / Bike</option>
                    <option value="car">Car</option>
                    <option value="van">Delivery Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">License Plate</label>
                  <input
    type="text"
    required
    value={vehiclePlate}
    onChange={(e) => setVehiclePlate(e.target.value)}
    placeholder="e.g. LHR-7892"
    className="w-full bg-[#1D2128] border border-[#292D35] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#FF5A1F]"
  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Assigned Branch</label>
                <select
    value={branchId}
    onChange={(e) => setBranchId(e.target.value)}
    className="w-full bg-[#1D2128] border border-[#292D35] rounded-xl px-3 py-2 text-white"
  >
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.city})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Duty Status</label>
                <select
    value={status}
    onChange={(e) => setStatus(e.target.value)}
    className="w-full bg-[#1D2128] border border-[#292D35] rounded-xl px-3 py-2 text-white"
  >
                  <option value="available">Available for Orders</option>
                  <option value="on_delivery">Currently On Delivery</option>
                  <option value="inactive">Off Duty / Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#292D35] flex justify-end gap-2">
                <button
    type="button"
    onClick={() => setIsModalOpen(false)}
    className="px-4 py-2 rounded-xl bg-[#1D2128] text-neutral-300"
  >
                  Cancel
                </button>
                <button
    type="submit"
    className="px-5 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] text-white font-bold"
  >
                  Save Rider
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
export {
  RidersPage
};
