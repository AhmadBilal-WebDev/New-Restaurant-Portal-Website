import { Check, ShoppingBag, X } from "lucide-react";
const ToastNotification = ({
  toast,
  onClose,
  onOpenCart
}) => {
  if (!toast) return null;
  return <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white rounded-2xl p-4 shadow-2xl border border-[#EEE7DC] flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-300">
      {
    /* Thumbnail or Icon */
  }
      {toast.image ? <img
    src={toast.image}
    alt={toast.title}
    referrerPolicy="no-referrer"
    className="w-12 h-12 rounded-xl object-cover bg-[#F7F1E7] flex-shrink-0"
  /> : <div className="w-10 h-10 rounded-xl bg-[#2E9B5B]/15 text-[#2E9B5B] flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 stroke-[2.5]" />
        </div>}

      {
    /* Message Text */
  }
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-black text-[#191919] truncate">{toast.title}</h4>
        <p className="text-[11px] text-[#777777] truncate">{toast.description}</p>
      </div>

      {
    /* View Cart Shortcut */
  }
      {toast.type === "cart" && <button
    onClick={() => {
      onClose();
      onOpenCart();
    }}
    className="bg-[#E51B23] hover:bg-[#B90F16] text-white text-xs font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors flex-shrink-0"
  >
          <ShoppingBag className="w-3 h-3" />
          <span>Cart</span>
        </button>}

      {
    /* Close button */
  }
      <button
    onClick={onClose}
    className="text-neutral-400 hover:text-[#191919] p-1 transition-colors"
    aria-label="Dismiss notification"
  >
        <X className="w-4 h-4" />
      </button>
    </div>;
};
export {
  ToastNotification
};
