import { Clock, X, Calendar, Phone, MapPin, Sparkles } from "lucide-react";
const BranchTimetableModal = ({
  isOpen,
  onClose,
  branch
}) => {
  if (!isOpen) return null;
  const currentDayName = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "long" });
  const timetable = branch?.weeklyTimetable || [
    { day: "Monday", open: "10:30 AM", close: "11:30 PM", isOpen: true },
    { day: "Tuesday", open: "10:30 AM", close: "11:30 PM", isOpen: true },
    { day: "Wednesday", open: "10:30 AM", close: "11:30 PM", isOpen: true },
    { day: "Thursday", open: "10:30 AM", close: "11:30 PM", isOpen: true },
    { day: "Friday", open: "10:30 AM", close: "12:00 AM", isOpen: true },
    { day: "Saturday", open: "10:30 AM", close: "12:30 AM", isOpen: true },
    { day: "Sunday", open: "10:30 AM", close: "11:30 PM", isOpen: true }
  ];
  const todaySchedule = timetable.find((t) => t.day.toLowerCase() === currentDayName.toLowerCase()) || timetable[0];
  const isBranchOpen = branch?.isOpen !== void 0 ? branch.isOpen : true;
  return <div
    id="branch-timetable-modal"
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    onClick={onClose}
  >
      <div
    className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EEE7DC] overflow-hidden transform transition-all"
    onClick={(e) => e.stopPropagation()}
  >
        {
    /* Header with Brand styling */
  }
        <div className="bg-[#191919] text-white p-5 sm:p-6 relative">
          <button
    onClick={onClose}
    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
    aria-label="Close modal"
  >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F5B82E] mb-1">
            <Clock className="w-4 h-4" />
            <span>Branch Operating Hours</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black font-['Outfit']">
            {branch?.name || "Bite & Burger"}
          </h3>

          <p className="text-xs text-neutral-300 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#E51B23] shrink-0" />
            <span className="truncate">{branch?.address || "Main Branch"}</span>
          </p>

          {
    /* Today's Status Banner */
  }
          <div className="mt-4 flex items-center justify-between p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
            <div className="flex items-center gap-2">
              <span
    className={`flex h-3 w-3 rounded-full ${isBranchOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}
  />
              <span className="text-sm font-black">
                {isBranchOpen ? "Open Now" : "Currently Closed"}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-neutral-300 uppercase font-semibold">Today ({currentDayName})</div>
              <div className="text-xs font-bold text-[#F5B82E]">
                {todaySchedule?.open} – {todaySchedule?.close}
              </div>
            </div>
          </div>
        </div>

        {
    /* Weekly Timetable List */
  }
        <div className="p-5 sm:p-6 space-y-4 max-h-[55vh] overflow-y-auto no-scrollbar">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#777777] mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#E51B23]" />
              <span>Weekly Schedule</span>
            </h4>

            <div className="divide-y divide-[#EEE7DC]/70 border border-[#EEE7DC] rounded-2xl overflow-hidden bg-[#FAF6F0]/50">
              {timetable.map((dayItem) => {
    const isToday = dayItem.day.toLowerCase() === currentDayName.toLowerCase();
    return <div
      key={dayItem.day}
      className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${isToday ? "bg-[#FF5A1F]/10 font-black text-[#191919]" : "text-neutral-700 font-medium"}`}
    >
                    <div className="flex items-center gap-2">
                      <span className={isToday ? "text-[#FF5A1F] font-black" : ""}>{dayItem.day}</span>
                      {isToday && <span className="bg-[#FF5A1F] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                          Today
                        </span>}
                    </div>

                    <div className="flex items-center gap-2">
                      {dayItem.isOpen ? <span className="font-semibold text-neutral-800">
                          {dayItem.open} – {dayItem.close}
                        </span> : <span className="text-red-500 font-bold uppercase text-[10px]">Closed</span>}
                    </div>
                  </div>;
  })}
            </div>
          </div>

          {
    /* Special Notes / Holiday announcements */
  }
          <div className="p-3.5 rounded-2xl bg-[#FFF9EF] border border-[#F5B82E]/40 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#F5B82E] shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-700 leading-relaxed">
              <span className="font-black text-[#191919] block mb-0.5">Special Announcement:</span>
              Kitchen prepares fresh patties until 30 minutes before closing. Delivery available up to 45 minutes prior. Timetable settings managed in real time by restaurant administration.
            </div>
          </div>

          {
    /* Quick Call Button */
  }
          {branch?.phone && <a
    href={`tel:${branch.phone.replace(/[^0-9+]/g, "")}`}
    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#E51B23] hover:bg-[#B90F16] text-white font-black text-sm shadow-md transition-transform active:scale-98"
  >
              <Phone className="w-4 h-4" />
              <span>Call Branch: {branch.phone}</span>
            </a>}
        </div>
      </div>
    </div>;
};
export {
  BranchTimetableModal
};
