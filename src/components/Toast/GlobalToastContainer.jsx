import { useRestaurant } from '@/contexts/RestaurantContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
const GlobalToastContainer = () => {
  const { toasts, removeToast } = useRestaurant();
  if (!toasts || toasts.length === 0) return null;
  return <div className="fixed top-[82px] right-4 z-[70] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => {
    const isSuccess = toast.type === "success" || !toast.type;
    const isWarning = toast.type === "warning";
    const isError = toast.type === "error";
    const isInfo = toast.type === "info";
    return <div
      key={toast.id}
      className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-[#191B20]/95 backdrop-blur-md border border-[#292D35] text-white shadow-2xl transition-all duration-300 animate-in slide-in-from-top-3"
    >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-[#00D084]" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-[#F4C20D]" />}
              {isError && <AlertCircle className="w-5 h-5 text-[#FF5A1F]" />}
              {isInfo && <Info className="w-5 h-5 text-[#3B82F6]" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-neutral-100 leading-snug">{toast.title}</div>
              <div className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{toast.message}</div>
            </div>

            <button
      onClick={() => removeToast(toast.id)}
      className="shrink-0 text-neutral-500 hover:text-neutral-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
    >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>;
  })}
    </div>;
};
export {
  GlobalToastContainer
};
