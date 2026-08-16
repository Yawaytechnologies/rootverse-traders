const variants = {
  primary:
    "border-transparent bg-emerald-600 text-white shadow-sm shadow-emerald-900/10 hover:bg-emerald-700 active:bg-emerald-800",
  secondary:
    "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  danger:
    "border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  ghost:
    "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  outline:
    "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
};

export default function TraderButton({
  as: Component = "button",
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  return (
    <Component
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant] || variants.primary,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}
