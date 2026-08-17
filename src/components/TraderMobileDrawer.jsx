import { useEffect } from "react";
import { Building2, X } from "lucide-react";
import { SidebarBrand, SidebarNav } from "./Sidebar";

export default function TraderMobileDrawer({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close navigation overlay"
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/55"
        onClick={onClose}
      />

      <aside className="absolute left-0 top-0 flex h-dvh w-[min(85vw,320px)] flex-col overflow-hidden border-r border-white/10 bg-slate-950 shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-4">
          <SidebarBrand />

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <SidebarNav onNavigate={onClose} />

        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200">
              <Building2 size={17} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                Blue Ocean Traders
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                Trader Admin
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
