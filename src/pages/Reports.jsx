import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getCrates,
  getTraderDashboard,
} from "../redux/actions/trader.actions";

import DataTable from "../components/DataTable";
import TraderCard from "../components/ui/TraderCard";
import { getHarvestReference } from "../utils/harvestReference";

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
    { key: "harvestReference", label: "Harvest Reference" },
    { key: "weight", label: "Weight" },
    { key: "grade", label: "Grade" },
    { key: "status", label: "Status" },
  ];

  const reportCrates = Array.isArray(crates)
    ? crates.map((crate) => ({
        ...crate,
        harvestReference: getHarvestReference(crate),
      }))
    : [];

  return (
    <div className="space-y-6">
      <TraderCard className="p-5 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Reports</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review trader performance, crate movement, and operational summaries.
        </p>
      </TraderCard>

      {loading && <p className="text-sm text-slate-500">Loading reports...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <ReportCard title="Dashboard Data" value={dashboard ? "Loaded" : "No Data"} />
        <ReportCard title="Total Crates" value={reportCrates.length} />
        <ReportCard title="System Status" value={error ? "Needs attention" : "Available"} />
      </div>

      <DataTable columns={columns} data={reportCrates} />
    </div>
  );
}

function ReportCard({ title, value }) {
  return (
    <TraderCard className="p-5">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
    </TraderCard>
  );
}
