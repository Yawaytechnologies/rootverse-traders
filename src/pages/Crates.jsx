import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getCrates, updateCrateStatus } from "../redux/actions/trader.actions";

const STATUS_OPTIONS = [
  { value: "packed", label: "Packed" },
  { value: "scheduled_for_dispatch", label: "Scheduled for Dispatch" },
  { value: "in_transit", label: "In Transit" },
  {
    value: "received_at_collection_centre",
    label: "Received at Collection Centre",
  },
  { value: "delivered", label: "Delivered" },
  { value: "hold", label: "Hold" },
];

function getValue(item, keys, fallback = "-") {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function getNestedValue(item, paths, fallback = "-") {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], item);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function getCrateId(item) {
  return (
    item?.id ||
    item?._id ||
    item?.crate_id ||
    item?.crateId ||
    item?.crate_code ||
    item?.qr_code
  );
}

function getCrateDisplayId(item) {
  return getValue(item, ["crate_id", "crateId", "crate_code", "id", "_id"]);
}

function getStatusLabel(value) {
  const status = String(value || "").toLowerCase();
  const found = STATUS_OPTIONS.find((item) => item.value === status);

  if (found) return found.label;

  return String(value || "Packed")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClass(value) {
  const status = String(value || "").toLowerCase();

  if (status === "delivered") {
    return "bg-green-100 text-green-700";
  }

  if (status === "in_transit") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "scheduled_for_dispatch") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (status === "received_at_collection_centre") {
    return "bg-purple-100 text-purple-700";
  }

  if (status === "hold") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function formatWeight(value) {
  if (value === "-" || value === undefined || value === null || value === "") {
    return "-";
  }

  const stringValue = String(value);

  if (stringValue.toLowerCase().includes("kg")) {
    return stringValue;
  }

  return `${stringValue} kg`;
}

export default function Crates() {
  const dispatch = useDispatch();

  const traderState = useSelector(
    (state) => state.trader || state.traderReducer || {}
  );

  const { crates = [], loading, error } = traderState;

  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    dispatch(getCrates()).catch(() => {});
  }, [dispatch]);

  const stats = useMemo(() => {
    const list = Array.isArray(crates) ? crates : [];

    return {
      total: list.length,
      packed: list.filter(
        (item) => String(item?.status || "").toLowerCase() === "packed"
      ).length,
      scheduled: list.filter(
        (item) =>
          String(item?.status || "").toLowerCase() === "scheduled_for_dispatch"
      ).length,
      inTransit: list.filter(
        (item) => String(item?.status || "").toLowerCase() === "in_transit"
      ).length,
      delivered: list.filter(
        (item) => String(item?.status || "").toLowerCase() === "delivered"
      ).length,
    };
  }, [crates]);

  const handleStatusUpdate = async (crate, status) => {
    try {
      const crateId = getCrateId(crate);

      if (!crateId) {
        alert("Crate ID not found in API response.");
        return;
      }

      if (!status) {
        alert("Select a valid status.");
        return;
      }

      setUpdatingId(crateId);
      setSuccess("");

      await dispatch(
        updateCrateStatus(crateId, {
          status,
        })
      );

      setSuccess("Crate status updated successfully");
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crates</h1>
        <p className="text-sm text-gray-500">
          View traceable crates linked with harvest, quality inspection,
          packing and transport workflow.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard title="Total Crates" value={stats.total} />
        <StatCard title="Packed" value={stats.packed} />
        <StatCard title="Scheduled" value={stats.scheduled} />
        <StatCard title="In Transit" value={stats.inTransit} />
        <StatCard title="Delivered" value={stats.delivered} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Crate List</h2>
          <p className="text-sm text-gray-500">
            Data from GET /api/traders/crates
          </p>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-gray-500">Loading crates...</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Crate ID</th>
                <th className="px-4 py-3">QR Code</th>
                <th className="px-4 py-3">Harvest ID</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Quality Status</th>
                <th className="px-4 py-3">Packing Status</th>
                <th className="px-4 py-3">Transport Status</th>
                <th className="px-4 py-3">Dispatch ID</th>
                <th className="px-4 py-3">Update Status</th>
              </tr>
            </thead>

            <tbody>
              {!Array.isArray(crates) || crates.length === 0 ? (
                <tr>
                  <td
                    colSpan="12"
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No crates found
                  </td>
                </tr>
              ) : (
                crates.map((crate) => {
                  const crateId = getCrateId(crate);
                  const currentStatus = getValue(
                    crate,
                    ["status", "transport_status", "packing_status"],
                    "packed"
                  );

                  return (
                    <tr key={crateId} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {getCrateDisplayId(crate)}
                      </td>

                      <td className="px-4 py-3">
                        {getValue(crate, ["qr_code", "qrCode", "qr"])}
                      </td>

                      <td className="px-4 py-3">
                        {getValue(crate, ["harvest_id", "harvestId"])}
                      </td>

                      <td className="px-4 py-3">
                        {getNestedValue(crate, [
                          "source_name",
                          "source.name",
                          "farmer_name",
                          "farmer.name",
                          "fisher_name",
                          "fisher.name",
                        ])}
                      </td>

                      <td className="px-4 py-3">
                        {getNestedValue(crate, [
                          "product",
                          "product_name",
                          "seafood_type",
                          "species",
                          "crop_type",
                          "harvest.product",
                        ])}
                      </td>

                      <td className="px-4 py-3">
                        {formatWeight(
                          getValue(crate, [
                            "weight",
                            "crate_weight",
                            "net_weight",
                            "quantity",
                          ])
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {getValue(crate, [
                          "grade",
                          "quality_grade",
                          "product_grade",
                        ])}
                      </td>

                      <td className="px-4 py-3">
                        <SmallBadge
                          value={getValue(crate, [
                            "quality_status",
                            "qualityStatus",
                          ])}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <SmallBadge
                          value={getValue(crate, [
                            "packing_status",
                            "packingStatus",
                          ])}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge value={currentStatus} />
                      </td>

                      <td className="px-4 py-3">
                        {getValue(crate, ["dispatch_id", "dispatchId"])}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={String(currentStatus || "packed").toLowerCase()}
                          disabled={updatingId === crateId}
                          onChange={(e) =>
                            handleStatusUpdate(crate, e.target.value)
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600 disabled:bg-gray-100"
                        >
                          {STATUS_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  );
}

function StatusBadge({ value }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
        value
      )}`}
    >
      {getStatusLabel(value)}
    </span>
  );
}

function SmallBadge({ value }) {
  if (!value || value === "-") {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {getStatusLabel(value)}
    </span>
  );
}