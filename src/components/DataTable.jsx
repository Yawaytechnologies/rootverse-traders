import TraderStatusBadge from "./ui/TraderStatusBadge";

function getValue(row, key) {
  return key.split(".").reduce((acc, item) => acc?.[item], row);
}

export default function DataTable({ columns = [], data = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="scrollbar-hidden max-w-full overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-4 py-3">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!Array.isArray(data) || data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="px-4 py-10 text-center text-sm font-medium text-slate-500"
                >
                  No data found
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={row?.id || row?._id || rowIndex} className="transition hover:bg-slate-50/80">
                  {columns.map((column) => {
                    const value = getValue(row, column.key);

                    return (
                      <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {column.key.toLowerCase().includes("status") ? (
                          <TraderStatusBadge status={value || "-"} />
                        ) : (
                          value || "-"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
