import { ChevronDown } from "lucide-react";

export default function TraderSelect({ className = "", children, ...props }) {
  return (
    <div className="relative w-full">
      <select
        className={[
          "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}
