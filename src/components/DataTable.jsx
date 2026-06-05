export default function StatusBadge({ status }) {
  const value = status || "Unknown";

  const styles = {
    Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",

    Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",

    Packed: "bg-blue-100 text-blue-700 border-blue-200",
    packed: "bg-blue-100 text-blue-700 border-blue-200",

    Loaded: "bg-indigo-100 text-indigo-700 border-indigo-200",
    loaded: "bg-indigo-100 text-indigo-700 border-indigo-200",

    Received: "bg-emerald-100 text-emerald-700 border-emerald-200",
    received: "bg-emerald-100 text-emerald-700 border-emerald-200",

    Rejected: "bg-red-100 text-red-700 border-red-200",
    rejected: "bg-red-100 text-red-700 border-red-200",

    Verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
    verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[value] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {value}
    </span>
  );
}