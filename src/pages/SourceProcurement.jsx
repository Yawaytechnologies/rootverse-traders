import { useEffect, useMemo, useState } from "react";
import { traderService } from "../../src/redux/services/trader.service";

function unwrapList(response) {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.harvests)) return data.harvests;
  if (Array.isArray(data?.harvest_requests)) return data.harvest_requests;
  if (Array.isArray(data?.harvestRequests)) return data.harvestRequests;

  return [];
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.data?.message ||
    error?.data?.error ||
    error?.message ||
    "Something went wrong"
  );
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getFirstValue(item = {}, keys = []) {
  for (const key of keys) {
    const value = item[key];

    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return "";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatKg(value) {
  if (value === null || value === undefined || value === "") return "-";

  const text = String(value);

  if (text.toLowerCase().includes("kg")) {
    return text;
  }

  return `${text} KG`;
}

function formatExpectedSize(value) {
  if (value === null || value === undefined || value === "") return "-";

  const text = String(value);

  if (text.toLowerCase().includes("count")) {
    return text;
  }

  return `${text} Count/kg`;
}

function normalizeStatus(value) {
  const raw = String(value || "PENDING").trim().toUpperCase();

  if (raw === "ACTIVE") return "PENDING";
  if (raw.includes("ACCEPT")) return "ACCEPTED";
  if (raw.includes("REJECT")) return "REJECTED";
  if (raw.includes("CONFIRM")) return "PENDING";
  if (raw.includes("PENDING")) return "PENDING";
  if (raw.includes("BOOK")) return "BOOKED";

  return raw;
}

function statusLabel(status) {
  const normalized = normalizeStatus(status);

  const labels = {
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    PENDING: "Pending",
    BOOKED: "Booked",
  };

  return labels[normalized] || normalized;
}

function statusClass(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "ACCEPTED") {
    return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  }

  if (normalized === "REJECTED") {
    return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
  }

  if (normalized === "BOOKED") {
    return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
  }

  return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
}

function normalizeHarvest(item = {}) {
  const internalHarvestId =
    item.id || item.harvest_id || item.harvestId || item.booking_id;

  const referenceCode =
    getFirstValue(item, [
      "harvest_code",
      "harvestCode",
      "request_code",
      "requestCode",
      "booking_code",
      "bookingCode",
      "qr_code",
      "qrCode",
      "qrs_code",
      "qr_value",
    ]) || "Harvest Request";

  const sourceName =
    getFirstValue(item, [
      "source_name",
      "sourceName",
      "farmer_name",
      "farmerName",
      "fisher_name",
      "fisherName",
      "farm_name",
      "farmName",
      "pond_name",
      "pondName",
    ]) || "Harvest Source";

  const farmName =
    getFirstValue(item, [
      "farm_name",
      "farmName",
      "farm_title",
      "farmTitle",
      "farm_code",
      "farmCode",
    ]) || "Farm details not available";

  const pondName =
    getFirstValue(item, [
      "pond_name",
      "pondName",
      "pond_title",
      "pondTitle",
      "pond_code",
      "pondCode",
    ]) || "Pond details not available";

  const cultureCycle =
    getFirstValue(item, [
      "culture_code",
      "cultureCode",
      "culture_name",
      "cultureName",
      "culture_cycle_code",
      "cultureCycleCode",
      "culture_cycle_name",
      "cultureCycleName",
    ]) || "Culture details not available";

  const district =
    getFirstValue(item, [
      "district_name",
      "districtName",
      "district",
      "location_district",
      "locationDistrict",
      "city",
      "location",
    ]) || "-";

  const sourceType =
    getFirstValue(item, [
      "source_type",
      "sourceType",
      "type",
      "harvest_source_type",
      "harvestSourceType",
      "species",
    ]) || "Farm";

  const hasTrader =
    Boolean(item.trader_id || item.traderId || item.trader_name || item.traderName);

  let status =
    getFirstValue(item, [
      "booking_status",
      "bookingStatus",
      "status",
      "harvest_status",
      "harvestStatus",
    ]) || (hasTrader ? "ACCEPTED" : "PENDING");

  if (String(status).toUpperCase() === "ACTIVE" && hasTrader) {
    status = "ACCEPTED";
  }

  const phone =
    getFirstValue(item, [
      "farmer_mobile",
      "farmerMobile",
      "mobile",
      "phone",
      "contact_mobile",
      "contactMobile",
      "trader_mobile",
      "traderMobile",
    ]) || "";

  const preferredTime =
    getFirstValue(item, [
      "preferred_harvest_time",
      "preferredHarvestTime",
      "harvest_date",
      "harvestDate",
      "created_at",
      "createdAt",
    ]) || "";

  const biomass =
    getFirstValue(item, [
      "expected_biomass",
      "expectedBiomass",
      "biomass",
      "harvest_biomass",
      "harvestBiomass",
    ]) || "-";

  const expectedSize =
    getFirstValue(item, [
      "expected_size",
      "expectedSize",
      "size",
      "count",
      "harvest_size",
      "harvestSize",
    ]) || "-";

  const qrCode =
    getFirstValue(item, ["qr_code", "qrCode", "qrs_code", "qr_value"]) || "-";

  const traderName =
    getFirstValue(item, ["trader_name", "traderName"]) || "-";

  const traderCode =
    getFirstValue(item, ["trader_code", "traderCode"]) || "-";

  const species = getFirstValue(item, ["species"]) || "-";

  const harvestMethod =
    getFirstValue(item, ["harvest_method", "harvestMethod"]) || "-";

  const harvestReason =
    getFirstValue(item, ["harvest_reason", "harvestReason"]) || "-";

  const locationSummary = [district, sourceType]
    .filter((value) => value && value !== "-")
    .join(" • ");

  return {
    raw: item,
    id: internalHarvestId,
    referenceCode,
    sourceName,
    farmName,
    pondName,
    cultureCycle,
    district,
    sourceType,
    locationSummary: locationSummary || "-",
    biomass,
    expectedSize,
    preferredTime,
    status,
    phone,
    species,
    harvestMethod,
    harvestReason,
    qrCode,
    traderName,
    traderCode,
  };
}

function unwrapObject(response) {
  return (
    response?.data?.data ||
    response?.data?.trader ||
    response?.data?.user ||
    response?.data ||
    response?.trader ||
    response?.user ||
    response ||
    {}
  );
}

function getLoggedTraderId(profile = {}) {
  return (
    profile.trader_id ||
    profile.traderId ||
    profile.id ||
    profile.user_id ||
    profile.userId ||
    ""
  );
}
export default function SourceProcurement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loggedTrader, setLoggedTrader] = useState(null);

  const loadLoggedTrader = async () => {
  try {
    const response = await traderService.getProfile();
    const profile = unwrapObject(response);
    setLoggedTrader(profile);
  } catch (err) {
    setLoggedTrader(null);
  }
};

  const loadHarvestRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await traderService.getHarvestRequests();
      const list = unwrapList(response).map(normalizeHarvest);

      setRequests(list);
    } catch (err) {
      setError(getErrorMessage(err));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  loadLoggedTrader();
  loadHarvestRequests();
}, []);

  const districts = useMemo(() => {
    return Array.from(
      new Set(
        requests
          .map((item) => item.district)
          .filter((item) => item && item !== "-")
      )
    );
  }, [requests]);

  const sourceTypes = useMemo(() => {
    return Array.from(
      new Set(
        requests
          .map((item) => item.sourceType)
          .filter((item) => item && item !== "-")
      )
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return requests.filter((item) => {
      const searchMatch =
        !searchText ||
        [
          item.referenceCode,
          item.sourceName,
          item.farmName,
          item.pondName,
          item.cultureCycle,
          item.district,
          item.sourceType,
          item.qrCode,
          item.status,
          item.species,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchText);

      const districtMatch =
        districtFilter === "ALL" || item.district === districtFilter;

      const sourceTypeMatch =
        sourceTypeFilter === "ALL" || item.sourceType === sourceTypeFilter;

      const statusMatch =
        statusFilter === "ALL" || normalizeStatus(item.status) === statusFilter;

      return searchMatch && districtMatch && sourceTypeMatch && statusMatch;
    });
  }, [requests, search, districtFilter, sourceTypeFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(
        (item) => normalizeStatus(item.status) === "PENDING"
      ).length,
      accepted: requests.filter(
        (item) => normalizeStatus(item.status) === "ACCEPTED"
      ).length,
      rejected: requests.filter(
        (item) => normalizeStatus(item.status) === "REJECTED"
      ).length,
    };
  }, [requests]);

  const handleAccept = async (item) => {
  if (!item?.id) {
    setError("Harvest request reference is missing. Please refresh and try again.");
    return;
  }

  const traderId = getLoggedTraderId(loggedTrader);

  if (!traderId) {
    setError("Logged-in trader ID is missing. Please login again.");
    return;
  }

  const confirmed = window.confirm(
    `Accept harvest request from ${item.sourceName}?`
  );

  if (!confirmed) return;

  try {
    setActionLoadingId(item.id);
    setError("");

    await traderService.updateHarvestBooking(item.id, {
      booking_status: "booked",
      trader_id: traderId,
    });

    await loadHarvestRequests();
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setActionLoadingId(null);
  }
};

  const handleCall = (phone) => {
    if (!phone) {
      alert("Phone number not available");
      return;
    }

    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-100">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700">
                RootVerse Trader Portal
              </span>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                Source Procurement
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Harvest requests received from farmers and fishers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <select
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">District</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>

              <select
                value={sourceTypeFilter}
                onChange={(event) => setSourceTypeFilter(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">Source Type</option>
                {sourceTypes.map((sourceType) => (
                  <option key={sourceType} value={sourceType}>
                    {sourceType}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="col-span-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:col-span-1"
              >
                <option value="ALL">Status</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="BOOKED">Booked</option>
              </select>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard label="Total Requests" value={stats.total} />
          <StatsCard label="Pending" value={stats.pending} valueClass="text-amber-600" />
          <StatsCard label="Accepted" value={stats.accepted} valueClass="text-emerald-600" />
          <StatsCard label="Rejected" value={stats.rejected} valueClass="text-rose-600" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Harvest Requests
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Accept or review harvest intent requests.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search source, farm, pond, district, QR"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-80"
                />

                <button
                  type="button"
                  onClick={loadHarvestRequests}
                  disabled={loading}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="p-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Request</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Biomass</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Preferred Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading harvest requests...
                        </td>
                      </tr>
                    ) : filteredRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          No harvest requests found.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((item, index) => {
                        const normalizedStatus = normalizeStatus(item.status);
                        const isAccepted = normalizedStatus === "ACCEPTED";
                        const isRejected = normalizedStatus === "REJECTED";
                        const isBooked = normalizedStatus === "BOOKED";
                        const isBusy = actionLoadingId === item.id;

                        return (
                          <tr
                            key={`${item.id || index}-${item.referenceCode}`}
                            className="hover:bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-5 py-5">
                              <p className="text-sm font-black text-slate-950">
                                {item.referenceCode}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {item.qrCode !== "-" ? `QR: ${item.qrCode}` : "No QR code"}
                              </p>
                            </td>

                            <td className="px-5 py-5">
                              <p className="whitespace-nowrap text-sm font-bold text-slate-800">
                                {item.sourceName}
                              </p>
                              <p className="mt-1 whitespace-nowrap text-xs font-semibold text-slate-500">
                                {item.farmName} • {item.pondName}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-700">
                              {item.locationSummary}
                            </td>

                            <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-700">
                              {formatKg(item.biomass)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-700">
                              {formatExpectedSize(item.expectedSize)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-700">
                              {formatDate(item.preferredTime)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-5">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                  item.status
                                )}`}
                              >
                                {statusLabel(item.status)}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-5">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCall(item.phone)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                  title="Call"
                                >
                                  ☎
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedRequest(item)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                  title="View"
                                >
                                  👁
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    isAccepted ||
                                    isRejected ||
                                    isBooked ||
                                    isBusy ||
                                    !item.id
                                  }
                                  onClick={() => handleAccept(item)}
                                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  {isBusy
                                    ? "Saving..."
                                    : isAccepted
                                    ? "Accepted"
                                    : isRejected
                                    ? "Rejected"
                                    : isBooked
                                    ? "Booked"
                                    : "Accept"}
                                </button>
                              </div>
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
        </section>
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                  Harvest Request Details
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  {selectedRequest.sourceName}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedRequest.referenceCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <Detail label="Source Name" value={selectedRequest.sourceName} />
              <Detail label="Source Type" value={selectedRequest.sourceType} />
              <Detail label="Farm" value={selectedRequest.farmName} />
              <Detail label="Pond" value={selectedRequest.pondName} />
              <Detail label="Culture Cycle" value={selectedRequest.cultureCycle} />
              <Detail label="District" value={selectedRequest.district} />
              <Detail label="Status" value={statusLabel(selectedRequest.status)} />
              <Detail label="Biomass" value={formatKg(selectedRequest.biomass)} />
              <Detail
                label="Expected Size"
                value={formatExpectedSize(selectedRequest.expectedSize)}
              />
              <Detail
                label="Preferred Time"
                value={formatDateTime(selectedRequest.preferredTime)}
              />
              <Detail label="Phone" value={selectedRequest.phone || "-"} />
              <Detail label="QR Code" value={selectedRequest.qrCode} />
              <Detail label="Species" value={selectedRequest.species} />
              <Detail label="Harvest Method" value={selectedRequest.harvestMethod} />
              <Detail label="Assigned Trader" value={selectedRequest.traderName} />
              <Detail label="Trader Code" value={selectedRequest.traderCode} />

              <div className="sm:col-span-2">
                <Detail
                  label="Harvest Reason"
                  value={selectedRequest.harvestReason}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  normalizeStatus(selectedRequest.status) === "ACCEPTED" ||
                  normalizeStatus(selectedRequest.status) === "REJECTED" ||
                  normalizeStatus(selectedRequest.status) === "BOOKED" ||
                  actionLoadingId === selectedRequest.id ||
                  !selectedRequest.id
                }
                onClick={async () => {
                  await handleAccept(selectedRequest);
                  setSelectedRequest(null);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {actionLoadingId === selectedRequest.id
                  ? "Saving..."
                  : "Accept Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatsCard({ label, value, valueClass = "text-slate-950" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <h2 className={`mt-2 text-2xl font-black ${valueClass}`}>
        {value}
      </h2>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">
        {valueOrDash(value)}
      </p>
    </div>
  );
}