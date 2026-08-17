function getTone(status) {
  const value = String(status || "").toLowerCase();

  if (
    value.includes("active") ||
    value.includes("accept") ||
    value.includes("verified") ||
    value.includes("received") ||
    value.includes("delivered") ||
    value.includes("success")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value.includes("pending") || value.includes("scheduled") || value.includes("hold")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value.includes("reject") || value.includes("inactive") || value.includes("error")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    value.includes("packed") ||
    value.includes("loaded") ||
    value.includes("transit") ||
    value.includes("book")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function TraderStatusBadge({ status, children, className = "" }) {
  const value = children || status || "Unknown";

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        getTone(value),
        className,
      ].join(" ")}
    >
      {value}
    </span>
  );
}
