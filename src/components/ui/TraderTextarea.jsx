export default function TraderTextarea({ className = "", ...props }) {
  return (
    <textarea
      className={[
        "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
