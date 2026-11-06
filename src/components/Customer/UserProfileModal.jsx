import { useState } from "react";
import { X, Package, LogOut, CheckCircle2 } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const UserProfileModal = ({
  isOpen,
  onClose,
  onOpenOrders
}) => {
  const { customerUser, updateCustomerProfile, logoutCustomerUser } = useRestaurant();
  const [name, setName] = useState(customerUser?.name || "");
  const [phone, setPhone] = useState(customerUser?.phone || "");
  const [dob, setDob] = useState(customerUser?.dob || "");
  const [isSaved, setIsSaved] = useState(false);
  if (!isOpen || !customerUser) return null;
  const handleSave = (e) => {
    e.preventDefault();
    updateCustomerProfile({
      name,
      phone,
      dob
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };
  const handleLogout = () => {
    logoutCustomerUser();
    onClose();
  };
  const initial = customerUser.name ? customerUser.name.charAt(0).toUpperCase() : "U";
  return <div
    id="user-profile-modal"
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    onClick={onClose}
  >
      <div
    className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EEE7DC] overflow-hidden transform transition-all"
    onClick={(e) => e.stopPropagation()}
  >
        <button
    onClick={onClose}
    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors z-10"
  >
          <X className="w-5 h-5" />
        </button>

        {
    /* Profile Card Header */
  }
        <div className="bg-[#FFF9EF] p-6 text-center border-b border-[#EEE7DC]">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#E51B23] text-white flex items-center justify-center text-3xl font-black shadow-lg mb-3">
            {initial}
          </div>
          <h3 className="text-xl font-black text-[#191919] font-['Outfit']">{customerUser.name}</h3>
          <p className="text-xs text-neutral-500 font-medium">{customerUser.email}</p>
        </div>

        {
    /* Form Body */
  }
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {isSaved && <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profile changes saved successfully!</span>
            </div>}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-700 mb-1">
              Full Name
            </label>
            <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full px-3.5 py-2 rounded-2xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
  />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-700 mb-1">
              Phone Number
            </label>
            <input
    type="tel"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    placeholder="+92 300 0000000"
    className="w-full px-3.5 py-2 rounded-2xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
  />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-700 mb-1">
              Date of Birth
            </label>
            <input
    type="date"
    value={dob}
    onChange={(e) => setDob(e.target.value)}
    className="w-full px-3.5 py-2 rounded-2xl border border-[#EEE7DC] bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#E51B23] text-xs font-medium text-[#191919]"
  />
          </div>

          <div className="flex gap-2 pt-2">
            <button
    type="submit"
    className="flex-1 py-2.5 rounded-2xl bg-[#E51B23] hover:bg-[#B90F16] text-white font-black text-xs uppercase tracking-wider shadow-sm transition-transform active:scale-98"
  >
              Save Changes
            </button>
            <button
    type="button"
    onClick={() => {
      onClose();
      onOpenOrders();
    }}
    className="px-4 py-2.5 rounded-2xl border border-[#EEE7DC] bg-white hover:bg-neutral-50 text-[#191919] font-black text-xs uppercase tracking-wider flex items-center gap-1.5"
  >
              <Package className="w-3.5 h-3.5 text-[#E51B23]" />
              <span>My Orders</span>
            </button>
          </div>

          <button
    type="button"
    onClick={handleLogout}
    className="w-full py-2.5 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors mt-2"
  >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </div>;
};
export {
  UserProfileModal
};
