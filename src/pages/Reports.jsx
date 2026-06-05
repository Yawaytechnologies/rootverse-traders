import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getCrates,
  getTraderDashboard,
} from "../redux/actions/trader.actions";

import DataTable from "../components/DataTable";

export default function Reports() {
  const dispatch = useDispatch();
  const { dashboard, crates, loading, error } = useSelector(
    (state) => state.trader
  );

  useEffect(() => {
    dispatch(getTraderDashboard());
    dispatch(getCrates());
  }, [dispatch]);

  const columns = [
    { key: "crateId", label: "Crate ID" },
    { key: "qrCode", label: "QR Code" },
    { key: "harvestId", label: "Harvest ID" },
    { key: "weight", label: "Weight" },
    { key: "grade", label: "Grade" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Reports</h1>
        <p className="mt-2 text-sm text-slate-500">
          Basic report view using dashboard and crate APIs.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading reports...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <ReportCard title="Dashboard Data" value={dashboard ? "Loaded" : "No Data"} />
        <ReportCard title="Total Crates" value={Array.isArray(crates) ? crates.length : 0} />
        <ReportCard title="API Status" value={error ? "Error" : "Connected"} />
      </div>

      <DataTable columns={columns} data={Array.isArray(crates) ? crates : []} />
    </div>
  );
}

function ReportCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}