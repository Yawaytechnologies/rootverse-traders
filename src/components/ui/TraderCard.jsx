export default function TraderCard({ as: Component = "section", className = "", children }) {
  return (
    <Component
      className={[
        "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60",
        className,
      ].join(" ")}
    >
      {children}
    </Component>
  );
}
