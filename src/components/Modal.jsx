import { X } from "lucide-react";

export default function Modal({ open, title, children, onClose, className = "" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-4">
      <div
        className={[
          "max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20",
          className,
        ].join(" ")}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="scrollbar-hidden max-h-[calc(90dvh-73px)] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
