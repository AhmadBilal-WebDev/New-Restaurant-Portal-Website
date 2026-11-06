const AdminBootLoader = ({ label = "Loading Admin" }) => {
  return <div className="min-h-screen bg-[#0D0F12] flex flex-col justify-center items-center gap-4 text-white font-sans">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF5A1F] to-[#E04810] text-white flex items-center justify-center font-black text-xl shadow-xl shadow-[#FF5A1F]/30">
        R
      </div>
      <div className="flex items-center gap-2 text-sm text-neutral-300">
        <span className="w-4 h-4 rounded-full border-2 border-[#FF5A1F] border-t-transparent animate-spin" />
        <span>{label}...</span>
      </div>
    </div>;
};
export {
  AdminBootLoader
};
