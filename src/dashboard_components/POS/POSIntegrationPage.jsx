import { useState } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useBranchScope } from '@/shared/lib/useBranchScope';
import {
  RefreshCw,
  Zap,
  Terminal,
  ShieldCheck,
  HardDrive
} from "lucide-react";
const POSIntegrationPage = () => {
  const { posStatus, syncPOS, addToast } = useRestaurant();
  const { liveBranches, isAllBranches, activeBranchFilter, branches } = useBranchScope();
  const [selectedProvider, setSelectedProvider] = useState(posStatus.provider);
  const [isSimulating, setIsSimulating] = useState(false);
  const scopedBranches = isAllBranches ? liveBranches : liveBranches.filter((b) => b.id === activeBranchFilter);
  const [logs, setLogs] = useState(
    () => liveBranches.flatMap((b, i) => [
      {
        id: i * 2 + 1,
        time: "20:21:40",
        branchId: b.id,
        text: `POS Gateway Handshake established for ${b.shortName}`
      },
      {
        id: i * 2 + 2,
        time: "20:22:01",
        branchId: b.id,
        text: `Hardware terminal #T-0${i + 1} connected (${b.shortName})`
      }
    ])
  );
  const visibleLogs = logs.filter(
    (log) => isAllBranches ? true : log.branchId === activeBranchFilter
  );
  const handleSync = async () => {
    setIsSimulating(true);
    await syncPOS();
    setIsSimulating(false);
    const target = activeBranchFilter === "all" ? "all live branches" : branches.find((b) => b.id === activeBranchFilter)?.shortName || "branch";
    setLogs((prev) => [
      {
        id: Date.now(),
        time: (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0],
        branchId: activeBranchFilter === "all" ? liveBranches[0]?.id || "" : activeBranchFilter,
        text: `Manual catalog and inventory sync completed for ${target} with ${selectedProvider} Gateway.`
      },
      ...prev
    ]);
    addToast("POS Sync Complete", `Synced ${target}.`, "success");
  };
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      {
    /* Page Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            POS & Terminal Integration
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Synchronize physical counter registers, cash drawers, and card terminals in real-time.
          </p>
        </div>

        <button
    onClick={handleSync}
    disabled={isSimulating}
    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04810] text-white text-xs font-bold transition-all shadow-md shadow-[#FF5A1F]/20 disabled:opacity-50"
  >
          <RefreshCw className={`w-4 h-4 ${isSimulating ? "animate-spin" : ""}`} />
          <span>{isSimulating ? "Syncing..." : "Sync Gateway Now"}</span>
        </button>
      </div>

      {
    /* Main Status Cards */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {
    /* Card 1: Connection Health */
  }
        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#00D084]/15 text-[#00D084] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-[#00D084]/15 text-[#00D084] border border-[#00D084]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D084] animate-pulse" />
              Connected
            </span>
          </div>

          <div>
            <div className="text-lg font-black text-white">Live Connection</div>
            <div className="text-xs text-neutral-400 mt-0.5">
              Provider: <strong className="text-white">{posStatus.provider}</strong>
            </div>
            <div className="text-[11px] text-neutral-500 mt-2 font-mono">
              Latency: 32ms · Response 99.98%
            </div>
          </div>
        </div>

        {
    /* Card 2: Connected Registers */
  }
        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-blue-400">
              {scopedBranches.length} Registers
            </span>
          </div>

          <div>
            <div className="text-lg font-black text-white">Branch Terminals</div>
            <div className="text-xs text-neutral-400 mt-0.5">
              Active across {scopedBranches.length} restaurant location
              {scopedBranches.length === 1 ? "" : "s"}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2 font-mono">
              Last Sync: {posStatus.lastSync}
            </div>
          </div>
        </div>

        {
    /* Card 3: Security & Encryption */
  }
        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#A855F7]/15 text-[#A855F7] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-400">PCI-DSS 4.0</span>
          </div>

          <div>
            <div className="text-lg font-black text-white">End-to-End Encrypted</div>
            <div className="text-xs text-neutral-400 mt-0.5">
              Tokenized transactions with instant kitchen relay
            </div>
            <div className="text-[11px] text-neutral-500 mt-2 font-mono">
              Hardware Secure Element verified
            </div>
          </div>
        </div>
      </div>

      {
    /* POS Provider Settings & Terminal Options */
  }
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-white tracking-tight">
            POS Hardware & Gateway Configuration
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-bold">
                Hardware Provider Gateway
              </label>
              <select
    value={selectedProvider}
    onChange={(e) => {
      setSelectedProvider(e.target.value);
      addToast("Provider Updated", `Set to ${e.target.value}`, "info");
    }}
    className="w-full bg-[#101216] border border-[#292D35] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF5A1F]"
  >
                <option value="RestaurantOS Smart Terminal">RestaurantOS Smart Terminal (Native)</option>
                <option value="Pax Android POS Gateway">Pax Android POS Gateway</option>
                <option value="Verifone Carbon Cloud">Verifone Carbon Cloud</option>
                <option value="Square for Restaurants API">Square for Restaurants API</option>
                <option value="Stripe Terminal (BBPOS / WisePOS)">Stripe Terminal</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-bold">
                Thermal Kitchen Slip Printing
              </label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#101216] border border-[#292D35]">
                <span className="text-neutral-300">Auto-print KDS ticket on payment</span>
                <span className="text-xs font-bold text-[#00D084]">Enabled</span>
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-bold">
                Offline Transaction Queue
              </label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#101216] border border-[#292D35]">
                <span className="text-neutral-300">Queue orders if internet disconnects</span>
                <span className="text-xs font-bold text-[#00D084]">Active (Store-and-Forward)</span>
              </div>
            </div>
          </div>
        </div>

        {
    /* Live POS Diagnostic Event Logs */
  }
        <div className="bg-[#191B20] border border-[#292D35] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#FF5A1F]" />
              <span>Real-Time Gateway Logs</span>
            </h3>
            <span className="text-[10px] font-mono text-neutral-500">Port 8080/wss</span>
          </div>

          <div className="bg-[#0A0C0E] border border-[#292D35] rounded-xl p-3.5 space-y-2 font-mono text-[11px] max-h-56 overflow-y-auto">
            {visibleLogs.map((log) => <div key={log.id} className="text-neutral-300 leading-relaxed">
                <span className="text-neutral-500 mr-2">[{log.time}]</span>
                <span className="text-emerald-400">INFO:</span> {log.text}
              </div>)}
          </div>
        </div>
      </div>
    </div>;
};
export {
  POSIntegrationPage
};
