import { useEffect, useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Clock, CheckCircle2, XCircle, Store, Calendar, Save, AlertCircle } from "lucide-react";
const TimetablesPage = () => {
  const { branches, updateBranch, activeBranchFilter, addToast } = useRestaurant();
  const liveBranches = branches.filter((b) => b.isActive !== false);
  const selectedBranch = activeBranchFilter !== "all" ? liveBranches.find((b) => b.id === activeBranchFilter) || liveBranches[0] : liveBranches[0];
  const [activeBranchId, setActiveBranchId] = useState(selectedBranch?.id || liveBranches[0]?.id);
  const currentBranch = liveBranches.find((b) => b.id === activeBranchId) || liveBranches.find((b) => b.id === selectedBranch?.id) || liveBranches[0];
  useEffect(() => {
    if (activeBranchFilter !== "all" && liveBranches.some((b) => b.id === activeBranchFilter)) {
      setActiveBranchId(activeBranchFilter);
    }
  }, [activeBranchFilter, liveBranches]);
  const defaultDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const getExistingHoursForDay = (branch, day) => {
    if (!branch) return null;
    if (Array.isArray(branch.operatingHours)) {
      return branch.operatingHours.find((h) => h.day === day);
    }
    if (Array.isArray(branch.weeklyTimetable)) {
      return branch.weeklyTimetable.find((h) => h.day === day);
    }
    return null;
  };
  const [schedule, setSchedule] = useState(() => {
    const initial = {};
    defaultDays.forEach((day) => {
      const existing = getExistingHoursForDay(currentBranch, day);
      initial[day] = {
        open: existing?.open || "11:00",
        close: existing?.close || "02:00",
        isClosed: existing?.isClosed ?? (existing?.isOpen !== void 0 ? !existing.isOpen : false)
      };
    });
    return initial;
  });
  const [holidayNotice, setHolidayNotice] = useState(currentBranch?.specialHolidayNotice || "");
  const handleBranchChange = (newBranchId) => {
    setActiveBranchId(newBranchId);
    const b = branches.find((item) => item.id === newBranchId);
    if (b) {
      const newSched = {};
      defaultDays.forEach((day) => {
        const existing = getExistingHoursForDay(b, day);
        newSched[day] = {
          open: existing?.open || "11:00",
          close: existing?.close || "02:00",
          isClosed: existing?.isClosed ?? (existing?.isOpen !== void 0 ? !existing.isOpen : false)
        };
      });
      setSchedule(newSched);
      setHolidayNotice(b.specialHolidayNotice || "");
    }
  };
  const handleDayChange = (day, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };
  const handleSaveSchedule = () => {
    if (!currentBranch) return;
    const operatingHoursList = defaultDays.map((day) => ({
      day,
      open: schedule[day].open,
      close: schedule[day].close,
      isClosed: schedule[day].isClosed,
      isOpen: !schedule[day].isClosed
    }));
    const updatedBranch = {
      ...currentBranch,
      operatingHours: operatingHoursList,
      weeklyTimetable: operatingHoursList,
      specialHolidayNotice: holidayNotice.trim() || void 0
    };
    updateBranch(updatedBranch);
    addToast("Timetable Saved", `Hours and holiday notice for ${currentBranch.name} updated.`, "success");
  };
  const now = /* @__PURE__ */ new Date();
  const currentDayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const todaySchedule = schedule[currentDayName];
  return <div className="space-y-6">
      {
    /* Header & Controls */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#FF5A1F]" />
            Branch Timetable &amp; Operating Hours
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Configure opening hours, closing times, off-days, and special holiday notices per branch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200">
            <Store className="w-4 h-4 text-neutral-500" />
            <select
    value={activeBranchId}
    onChange={(e) => handleBranchChange(e.target.value)}
    className="bg-transparent text-sm font-semibold text-neutral-800 outline-none cursor-pointer"
  >
              {liveBranches.map((b) => <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>)}
            </select>
          </div>

          <button
    onClick={handleSaveSchedule}
    className="flex items-center gap-2 bg-[#FF5A1F] hover:bg-[#E04810] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs transition cursor-pointer"
  >
            <Save className="w-4 h-4" />
            Save Timetable
          </button>
        </div>
      </div>

      {
    /* Live Status Card */
  }
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
    className={`w-3.5 h-3.5 rounded-full ${todaySchedule && !todaySchedule.isClosed ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
  />
            <div>
              <span className="text-sm font-bold text-neutral-900">
                Today ({currentDayName}):{" "}
                {todaySchedule?.isClosed ? "Closed" : `${todaySchedule?.open} – ${todaySchedule?.close}`}
              </span>
              <p className="text-xs text-neutral-500">
                Branch status visible to mobile customers and online ordering channels.
              </p>
            </div>
          </div>

          <span
    className={`text-xs px-3 py-1 font-bold rounded-full ${todaySchedule && !todaySchedule.isClosed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}
  >
            {todaySchedule && !todaySchedule.isClosed ? "BRANCH CURRENTLY OPEN" : "BRANCH CURRENTLY CLOSED"}
          </span>
        </div>
      </div>

      {
    /* Weekly Schedule Grid */
  }
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-500" />
            7-Day Operating Hours
          </h2>
          <span className="text-xs text-neutral-500">Time format: 24-Hour (HH:MM)</span>
        </div>

        <div className="divide-y divide-neutral-100">
          {defaultDays.map((day) => {
    const dayData = schedule[day] || { open: "11:00", close: "02:00", isClosed: false };
    const isToday = day === currentDayName;
    return <div
      key={day}
      className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${isToday ? "bg-amber-50/40" : "hover:bg-neutral-50/60"}`}
    >
                <div className="flex items-center gap-3 w-40">
                  <span
      className={`text-sm font-bold ${isToday ? "text-[#FF5A1F]" : "text-neutral-900"}`}
    >
                    {day}
                  </span>
                  {isToday && <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-[#FF5A1F] text-white rounded">
                      Today
                    </span>}
                </div>

                <div className="flex flex-wrap items-center gap-4 flex-1">
                  {
      /* Closed Toggle */
    }
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
      type="checkbox"
      checked={dayData.isClosed}
      onChange={(e) => handleDayChange(day, "isClosed", e.target.checked)}
      className="w-4 h-4 rounded border-neutral-300 text-[#FF5A1F] focus:ring-[#FF5A1F]"
    />
                    <span className="text-xs font-semibold text-neutral-600">Off-day / Closed</span>
                  </label>

                  {!dayData.isClosed ? <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-neutral-400">Open:</span>
                        <input
      type="time"
      value={dayData.open}
      onChange={(e) => handleDayChange(day, "open", e.target.value)}
      className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:border-[#FF5A1F]"
    />
                      </div>
                      <span className="text-neutral-400 text-xs">to</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-neutral-400">Close:</span>
                        <input
      type="time"
      value={dayData.close}
      onChange={(e) => handleDayChange(day, "close", e.target.value)}
      className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:border-[#FF5A1F]"
    />
                      </div>
                    </div> : <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md">
                      Closed all day
                    </span>}
                </div>

                <div className="shrink-0">
                  {dayData.isClosed ? <span className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                      <XCircle className="w-4 h-4" />
                      Closed
                    </span> : <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Active
                    </span>}
                </div>
              </div>;
  })}
        </div>
      </div>

      {
    /* Special Holiday Notice / Announcement */
  }
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold text-neutral-900">Special Holiday / Ramadan Notice</h2>
        </div>
        <p className="text-xs text-neutral-500">
          This message will be prominently shown in the customer timetable modal (e.g. &quot;Eid Holidays: Closed on 1st day&quot; or &quot;Ramadan Timing: Iftar to Sehri 5:00 PM – 4:00 AM&quot;).
        </p>

        <textarea
    rows={3}
    value={holidayNotice}
    onChange={(e) => setHolidayNotice(e.target.value)}
    placeholder="e.g., Ramadan Special: Operating from 5:00 PM to 4:00 AM daily."
    className="w-full p-3 text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:border-[#FF5A1F]"
  />

        <div className="flex justify-end">
          <button
    onClick={handleSaveSchedule}
    className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
  >
            <Save className="w-3.5 h-3.5" />
            Save Notice
          </button>
        </div>
      </div>
    </div>;
};
export {
  TimetablesPage
};
