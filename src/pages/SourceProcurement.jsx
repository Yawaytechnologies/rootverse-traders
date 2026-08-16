import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, ExternalLink, Eye, MapPin } from "lucide-react";
import { traderService } from "../../src/redux/services/trader.service";
import Modal from "../components/Modal";
import TraderButton from "../components/ui/TraderButton";
import TraderInput from "../components/ui/TraderInput";
import TraderSelect from "../components/ui/TraderSelect";
import TraderStatusBadge from "../components/ui/TraderStatusBadge";

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
  if (value === null || value === undefined || value === "" || value === "-") {
    return "Not available";
  }
  if (typeof value === "number" && Number.isNaN(value)) {
    return "Not available";
  }
  if (typeof value === "object") {
    return "Not available";
  }
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

function normalizeCoordinate(value) {
  if (value === null || value === undefined || value === "") return "";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";

  return String(value).trim();
}

function hasGpsLocation(item) {
  return Boolean(item?.latitude && item?.longitude);
}

function normalizeStatus(value) {
  const raw = String(value || "PENDING").trim().toUpperCase();

  if (raw.includes("COMPLETE")) return "COMPLETED";
  if (raw === "ACTIVE") return "PENDING";
  if (raw === "REQUESTED") return "PENDING";
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
    COMPLETED: "Completed",
  };

  return labels[normalized] || normalized;
}

function getLocalDateTimeValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function sameId(left, right) {
  if (left === null || left === undefined || left === "") return false;
  if (right === null || right === undefined || right === "") return false;

  return String(left) === String(right);
}

function isAssignedToLoggedTrader(item, loggedTraderId) {
  return sameId(item?.assignedTraderId, loggedTraderId);
}

function hasAssignedTrader(item) {
  return Boolean(item?.assignedTraderId || item?.traderName || item?.traderCode);
}

function getAssignedTraderLabel(item) {
  if (!hasAssignedTrader(item)) {
    return "Unassigned";
  }

  return item?.traderName || item?.assignedTraderId || "Not available";
}

function getAssignedTraderCode(item) {
  if (!hasAssignedTrader(item)) {
    return "Unassigned";
  }

  return item?.traderCode || "Not available";
}

function getCanonicalHarvestStatus(item) {
  const harvestStatus = normalizeStatus(item?.harvestStatus);
  const bookingStatus = normalizeStatus(item?.bookingStatus);
  const displayStatus = normalizeStatus(item?.status);

  if (harvestStatus === "COMPLETED" || displayStatus === "COMPLETED") {
    return "COMPLETED";
  }

  if (bookingStatus === "BOOKED" || displayStatus === "BOOKED") {
    return "BOOKED";
  }

  if (bookingStatus === "PENDING" || displayStatus === "PENDING") {
    return "PENDING";
  }

  return displayStatus || bookingStatus || harvestStatus || "PENDING";
}

function getCompletionActionState(item, loggedTraderId) {
  const canonicalStatus = getCanonicalHarvestStatus(item);

  if (canonicalStatus === "COMPLETED") {
    return "COMPLETED";
  }

  if (canonicalStatus === "BOOKED") {
    return isAssignedToLoggedTrader(item, loggedTraderId) ? "COMPLETE" : "INELIGIBLE";
  }

  if (canonicalStatus === "PENDING" && !hasAssignedTrader(item)) {
    return "ACCEPT";
  }

  return "INELIGIBLE";
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

  const farmerName =
    getFirstValue(item, ["farmer_name", "farmerName"]) || sourceName;

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

  const farmAddress =
    getFirstValue(item, ["farm_address", "farmAddress", "address"]) || "";

  const village =
    getFirstValue(item, ["village", "village_name", "villageName"]) || "";

  const latitude = normalizeCoordinate(
    getFirstValue(item, ["latitude", "lat"])
  );

  const longitude = normalizeCoordinate(
    getFirstValue(item, ["longitude", "lng", "lon"])
  );

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

  const assignedTraderId = getFirstValue(item, [
    "trader_id",
    "traderId",
    "assigned_trader_id",
    "assignedTraderId",
  ]);

  const rawBookingStatus =
    getFirstValue(item, [
      "booking_status",
      "bookingStatus",
      "status",
    ]) || (hasTrader ? "ACCEPTED" : "PENDING");

  const rawHarvestStatus =
    getFirstValue(item, [
      "harvest_status",
      "harvestStatus",
    ]) || "";

  let status = rawHarvestStatus || rawBookingStatus;

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
    getFirstValue(item, ["trader_name", "traderName"]) || "";

  const traderCode =
    getFirstValue(item, ["trader_code", "traderCode"]) || "";

  const species = getFirstValue(item, ["species"]) || "-";

  const harvestMethod =
    getFirstValue(item, ["harvest_method", "harvestMethod"]) || "-";

  const harvestReason =
    getFirstValue(item, ["harvest_reason", "harvestReason"]) || "-";

  const doc =
    getFirstValue(item, ["doc", "days_of_culture", "daysOfCulture"]) || "";

  const locationSummary = [district, sourceType]
    .filter((value) => value && value !== "-")
    .join(" • ");

  return {
    raw: item,
    id: internalHarvestId,
    referenceCode,
    sourceName,
    farmerName,
    farmName,
    farmAddress,
    village,
    pondName,
    cultureCycle,
    district,
    latitude,
    longitude,
    sourceType,
    locationSummary: locationSummary || "-",
    biomass,
    expectedSize,
    preferredTime,
    status,
    bookingStatus: rawBookingStatus,
    harvestStatus: rawHarvestStatus,
    assignedTraderId,
    phone,
    species,
    harvestMethod,
    harvestReason,
    doc,
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

function getLoggedTraderId(profile) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  return (
    profile.trader_id ||
    profile.traderId ||
    profile.id ||
    profile.data?.trader_id ||
    profile.data?.traderId ||
    profile.data?.id ||
    profile.user_id ||
    profile.userId ||
    null
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
  const [completeHarvestOpen, setCompleteHarvestOpen] = useState(false);
  const [actualHarvestWeight, setActualHarvestWeight] = useState("");
  const [completedAt, setCompletedAt] = useState(getLocalDateTimeValue());
  const [completeHarvestLoading, setCompleteHarvestLoading] = useState(false);
  const [completeHarvestError, setCompleteHarvestError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadLoggedTrader = useCallback(async () => {
  try {
    const response = await traderService.getProfile();
    const profile = unwrapObject(response);
    setLoggedTrader(profile);
  } catch {
    setLoggedTrader(null);
  }
}, []);

  const loadHarvestRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await traderService.getHarvestRequests();
      const list = unwrapList(response).map(normalizeHarvest);

      setRequests(list);
      return list;
    } catch (err) {
      setError(getErrorMessage(err));
      setRequests([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

 useEffect(() => {
  const timer = window.setTimeout(() => {
    loadLoggedTrader();
    loadHarvestRequests();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [loadHarvestRequests, loadLoggedTrader]);

  const loggedTraderId = getLoggedTraderId(loggedTrader);

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
        statusFilter === "ALL" || getCanonicalHarvestStatus(item) === statusFilter;

      return searchMatch && districtMatch && sourceTypeMatch && statusMatch;
    });
  }, [requests, search, districtFilter, sourceTypeFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(
        (item) => getCanonicalHarvestStatus(item) === "PENDING"
      ).length,
      accepted: requests.filter(
        (item) => getCanonicalHarvestStatus(item) === "ACCEPTED"
      ).length,
      rejected: requests.filter(
        (item) => getCanonicalHarvestStatus(item) === "REJECTED"
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

  const openCompleteHarvestModal = (item) => {
    if (!loggedTraderId) {
      setCompleteHarvestError("Trader profile is still loading. Please try again.");
      return;
    }

    if (!isAssignedToLoggedTrader(item, loggedTraderId)) {
      setCompleteHarvestError("This harvest is assigned to another trader.");
      return;
    }

    setSelectedRequest(item);
    setActualHarvestWeight("");
    setCompletedAt(getLocalDateTimeValue());
    setCompleteHarvestError("");
    setCompleteHarvestOpen(true);
  };

  const closeCompleteHarvestModal = () => {
    if (completeHarvestLoading) return;

    setCompleteHarvestOpen(false);
    setActualHarvestWeight("");
    setCompletedAt(getLocalDateTimeValue());
    setCompleteHarvestError("");
  };

  const handleCompleteHarvest = async (event) => {
    event.preventDefault();

    if (!selectedRequest?.id) {
      setCompleteHarvestError("Harvest reference is missing. Please refresh and try again.");
      return;
    }

    if (!loggedTraderId) {
      setCompleteHarvestError("Trader profile is still loading. Please try again.");
      return;
    }

    if (!isAssignedToLoggedTrader(selectedRequest, loggedTraderId)) {
      setCompleteHarvestError("This harvest is assigned to another trader.");
      return;
    }

    const weight = Number(actualHarvestWeight);

    if (!Number.isFinite(weight) || weight <= 0) {
      setCompleteHarvestError("Enter an actual harvest weight greater than 0.");
      return;
    }

    if (!completedAt) {
      setCompleteHarvestError("Select the completed date and time.");
      return;
    }

    const completedDate = new Date(completedAt);

    if (Number.isNaN(completedDate.getTime())) {
      setCompleteHarvestError("Select a valid completed date and time.");
      return;
    }

    try {
      setCompleteHarvestLoading(true);
      setCompleteHarvestError("");
      setSuccessMessage("");

      await traderService.completeHarvestForPayment(selectedRequest.id, {
        actual_harvest_weight_kg: weight,
        completed_at: completedDate.toISOString(),
      });

      const refreshedRequests = await loadHarvestRequests();
      const refreshedSelectedRequest = refreshedRequests.find(
        (item) => item.id === selectedRequest.id
      );

      setSelectedRequest(refreshedSelectedRequest || null);
      setSuccessMessage("Harvest completed successfully.");
      setCompleteHarvestOpen(false);
      setActualHarvestWeight("");
      setCompletedAt(getLocalDateTimeValue());
    } catch (err) {
      setCompleteHarvestError(getErrorMessage(err));
    } finally {
      setCompleteHarvestLoading(false);
    }
  };

  return (
    <div className="min-w-0">
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
              <TraderSelect
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
              >
                <option value="ALL">District</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </TraderSelect>

              <TraderSelect
                value={sourceTypeFilter}
                onChange={(event) => setSourceTypeFilter(event.target.value)}
              >
                <option value="ALL">Source Type</option>
                {sourceTypes.map((sourceType) => (
                  <option key={sourceType} value={sourceType}>
                    {sourceType}
                  </option>
                ))}
              </TraderSelect>

              <TraderSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="col-span-2 sm:col-span-1"
              >
                <option value="ALL">Status</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="BOOKED">Booked</option>
                <option value="COMPLETED">Completed</option>
              </TraderSelect>
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
                <TraderInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search source, farm, pond, district, QR"
                  className="sm:w-80"
                />

                <TraderButton
                  type="button"
                  onClick={loadHarvestRequests}
                  disabled={loading}
                  variant="secondary"
                >
                  {loading ? "Loading..." : "Refresh"}
                </TraderButton>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {successMessage}
              </div>
            ) : null}
          </div>

          <div className="hidden p-4 md:block sm:p-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-w-full overflow-hidden">
                <table className="w-full table-fixed divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead className="w-[18%]">Request</TableHead>
                      <TableHead className="w-[25%]">Source</TableHead>
                      <TableHead className="w-[12%]">Biomass</TableHead>
                      <TableHead className="w-[15%]">Preferred Time</TableHead>
                      <TableHead className="w-[12%]">Status</TableHead>
                      <TableHead className="w-[18%] text-right">Actions</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          Loading harvest requests...
                        </td>
                      </tr>
                    ) : filteredRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                        >
                          No harvest requests found.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((item, index) => {
                        const actionState = getCompletionActionState(
                          item,
                          loggedTraderId
                        );
                        const isBusy = actionLoadingId === item.id;

                        return (
                          <tr
                            key={`${item.id || index}-${item.referenceCode}`}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-5 py-5 align-middle">
                              <p className="truncate text-sm font-black text-slate-950">
                                {item.referenceCode}
                              </p>
                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                {item.qrCode !== "-" ? `QR: ${item.qrCode}` : "No QR code"}
                              </p>
                            </td>

                            <td className="px-5 py-5 align-middle">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {item.sourceName}
                              </p>
                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                {item.farmName} • {item.pondName}
                              </p>
                            </td>

                            <td className="px-5 py-5 align-middle text-sm font-semibold text-slate-700">
                              <span className="block truncate">
                                {formatKg(item.biomass)}
                              </span>
                            </td>

                            <td className="px-5 py-5 align-middle text-sm font-semibold text-slate-700">
                              <span className="block truncate">
                                {formatDate(item.preferredTime)}
                              </span>
                            </td>

                            <td className="px-5 py-5 align-middle">
                              <TraderStatusBadge
                                status={statusLabel(getCanonicalHarvestStatus(item))}
                              />
                            </td>

                            <td className="px-5 py-5 align-middle">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedRequest(item)}
                                  title="View Details"
                                  aria-label="View harvest details"
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
                                >
                                  <Eye size={18} aria-hidden="true" />
                                </button>
                                {actionState === "ACCEPT" ? (
                                  <button
                                    type="button"
                                    disabled={isBusy || !item.id}
                                    onClick={() => handleAccept(item)}
                                    title="Accept Request"
                                    aria-label="Accept harvest request"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
                                  >
                                    <Check size={18} aria-hidden="true" />
                                  </button>
                                ) : null}

                                {actionState === "COMPLETE" ? (
                                  <button
                                    type="button"
                                    disabled={!item.id}
                                    onClick={() => openCompleteHarvestModal(item)}
                                    title="Complete Harvest"
                                    aria-label="Complete harvest"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
                                  >
                                    <ClipboardCheck size={18} aria-hidden="true" />
                                  </button>
                                ) : null}
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

          <div className="p-4 md:hidden">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-500">
                Loading harvest requests...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-500">
                No harvest requests found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((item, index) => {
                  const actionState = getCompletionActionState(item, loggedTraderId);
                  const isBusy = actionLoadingId === item.id;

                  return (
                    <div
                      key={`${item.id || index}-${item.referenceCode}-card`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {item.referenceCode}
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                            {item.qrCode !== "-" ? `QR: ${item.qrCode}` : "No QR code"}
                          </p>
                        </div>
                        <TraderStatusBadge
                          status={statusLabel(getCanonicalHarvestStatus(item))}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <Detail label="Source" value={item.sourceName} />
                        <Detail label="Farm / Pond" value={`${item.farmName} / ${item.pondName}`} />
                        <Detail label="Biomass" value={formatKg(item.biomass)} />
                        <Detail label="Preferred Time" value={formatDate(item.preferredTime)} />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(item)}
                          title="View Details"
                          aria-label="View harvest details"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
                        >
                          <Eye size={18} aria-hidden="true" />
                        </button>

                        {actionState === "ACCEPT" ? (
                          <button
                            type="button"
                            disabled={isBusy || !item.id}
                            onClick={() => handleAccept(item)}
                            title="Accept Request"
                            aria-label="Accept harvest request"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
                          >
                            <Check size={18} aria-hidden="true" />
                          </button>
                        ) : null}

                        {actionState === "COMPLETE" ? (
                          <button
                            type="button"
                            disabled={!item.id}
                            onClick={() => openCompleteHarvestModal(item)}
                            title="Complete Harvest"
                            aria-label="Complete harvest"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
                          >
                            <ClipboardCheck size={18} aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-4">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            <div className="shrink-0 flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                  Harvest Request Details
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  {selectedRequest.farmerName}
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

            <div className="scrollbar-hidden min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <DetailSection title="Harvest Request">
                <Detail label="Reference Code" value={selectedRequest.referenceCode} />
                <Detail
                  label="Status"
                  value={statusLabel(getCanonicalHarvestStatus(selectedRequest))}
                />
              </DetailSection>

              <DetailSection title="Farmer Details">
                <Detail label="Farmer Name" value={selectedRequest.farmerName} />
                <Detail label="Mobile Number" value={selectedRequest.phone} />
              </DetailSection>

              <DetailSection title="Farm Details">
                <Detail label="Farm Name" value={selectedRequest.farmName} />
                <Detail label="Pond" value={selectedRequest.pondName} />
                <Detail label="Village" value={selectedRequest.village} />
                <Detail label="District" value={selectedRequest.district} />
                <Detail
                  label="Farm Address"
                  value={selectedRequest.farmAddress}
                  wide
                />
                <Detail
                  label="Culture Cycle"
                  value={selectedRequest.cultureCycle}
                  wide
                />
              </DetailSection>

              <DetailSection title="GPS Location">
                <Detail label="Latitude" value={selectedRequest.latitude} />
                <Detail label="Longitude" value={selectedRequest.longitude} />
                <div className="sm:col-span-2">
                  {hasGpsLocation(selectedRequest) ? (
                    <a
                      href={`https://www.google.com/maps?q=${selectedRequest.latitude},${selectedRequest.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
                    >
                      <MapPin size={17} aria-hidden="true" />
                      View on Map
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>
                  ) : (
                    <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500">
                      <MapPin size={17} aria-hidden="true" />
                      GPS location not available
                    </div>
                  )}
                </div>
              </DetailSection>

              <DetailSection title="Harvest Details">
                <Detail label="Species" value={selectedRequest.species} />
                <Detail
                  label="Expected Size"
                  value={formatExpectedSize(selectedRequest.expectedSize)}
                />
                <Detail label="Biomass" value={formatKg(selectedRequest.biomass)} />
                <Detail label="DOC" value={selectedRequest.doc} />
                <Detail
                  label="Preferred Time"
                  value={formatDateTime(selectedRequest.preferredTime)}
                />
                <Detail
                  label="Harvest Method"
                  value={selectedRequest.harvestMethod}
                />
                <Detail
                  label="Harvest Reason"
                  value={selectedRequest.harvestReason}
                  wide
                />
              </DetailSection>

              <DetailSection title="Trader Assignment">
                <Detail
                  label="Assigned Trader"
                  value={getAssignedTraderLabel(selectedRequest)}
                />
                <Detail
                  label="Trader Code"
                  value={getAssignedTraderCode(selectedRequest)}
                />
              </DetailSection>
            </div>

            {getCompletionActionState(selectedRequest, loggedTraderId) === "ACCEPT" ||
            getCompletionActionState(selectedRequest, loggedTraderId) === "COMPLETE" ? (
              <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white p-5 sm:flex-row sm:justify-end sm:p-6">
                {getCompletionActionState(selectedRequest, loggedTraderId) === "ACCEPT" ? (
                  <TraderButton
                    type="button"
                    disabled={actionLoadingId === selectedRequest.id || !selectedRequest.id}
                    onClick={async () => {
                      await handleAccept(selectedRequest);
                      setSelectedRequest(null);
                    }}
                  >
                    {actionLoadingId === selectedRequest.id
                      ? "Saving..."
                      : "Accept Request"}
                  </TraderButton>
                ) : null}

                {getCompletionActionState(selectedRequest, loggedTraderId) === "COMPLETE" ? (
                  <TraderButton
                    type="button"
                    disabled={!selectedRequest.id}
                    onClick={() => openCompleteHarvestModal(selectedRequest)}
                  >
                    Complete Harvest
                  </TraderButton>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal
        open={completeHarvestOpen}
        title="Complete Harvest"
        onClose={closeCompleteHarvestModal}
        className="max-w-2xl"
      >
        <form className="space-y-5" onSubmit={handleCompleteHarvest}>
          <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
            <Detail
              label="Harvest Reference"
              value={selectedRequest?.referenceCode}
            />
            <Detail label="Farmer Name" value={selectedRequest?.farmerName} />
            <Detail label="Farm Name" value={selectedRequest?.farmName} />
            <Detail label="Species" value={selectedRequest?.species} />
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Actual Harvest Weight (kg) *
              </span>
              <TraderInput
                type="number"
                min="0"
                step="0.01"
                value={actualHarvestWeight}
                onChange={(event) => setActualHarvestWeight(event.target.value)}
                placeholder="0.00"
                required
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Completed At *
              </span>
              <TraderInput
                type="datetime-local"
                value={completedAt}
                onChange={(event) => setCompletedAt(event.target.value)}
                required
              />
            </label>
          </div>

          {completeHarvestError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {completeHarvestError}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <TraderButton
              type="button"
              variant="secondary"
              onClick={closeCompleteHarvestModal}
              disabled={completeHarvestLoading}
            >
              Cancel
            </TraderButton>

            <TraderButton type="submit" disabled={completeHarvestLoading}>
              {completeHarvestLoading ? "Completing..." : "Complete Harvest"}
            </TraderButton>
          </div>
        </form>
      </Modal>
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

function TableHead({ children, className = "" }) {
  return (
    <th
      className={[
        "whitespace-nowrap px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Detail({ label, value, wide = false }) {
  return (
    <div
      className={[
        "rounded-xl border border-slate-200 bg-white px-4 py-3",
        wide ? "sm:col-span-2" : "",
      ].join(" ")}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-semibold text-slate-900">
        {valueOrDash(value)}
      </p>
    </div>
  );
}
