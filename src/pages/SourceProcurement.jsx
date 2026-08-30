import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CreditCard,
  ExternalLink,
  Eye,
  FilePlus,
  MapPin,
  Printer,
  RefreshCw,
} from "lucide-react";
import { traderService } from "../../src/redux/services/trader.service";
import Modal from "../components/Modal";
import TraderButton from "../components/ui/TraderButton";
import TraderInput from "../components/ui/TraderInput";
import TraderSelect from "../components/ui/TraderSelect";
import TraderStatusBadge from "../components/ui/TraderStatusBadge";
import TraderTextarea from "../components/ui/TraderTextarea";
import {
  formatCurrency,
  formatOptionalCurrency,
  normalizeProcurement,
  safeNumber,
  unwrapProcurementList,
} from "../utils/procurementPrint";

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

function getNestedObject(item = {}, keys = []) {
  for (const key of keys) {
    const value = item?.[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
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

  return labels[normalized] || formatStatusLabel(normalized);
}

function formatStatusLabel(status) {
  const value = String(status || "").trim();

  if (!value) return "Not available";

  const smallWords = new Set(["by", "for", "in", "of", "to", "at"]);

  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) =>
      index > 0 && smallWords.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
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

function getCompletionActionState(item) {
  const canonicalStatus = getCanonicalHarvestStatus(item);

  if (canonicalStatus === "COMPLETED") {
    return "COMPLETED";
  }

  if (canonicalStatus === "PENDING" && !hasAssignedTrader(item)) {
    return "ACCEPT";
  }

  return "INELIGIBLE";
}

function formatDispatchStatus(value) {
  return formatStatusLabel(value);
}

function getLatestDate(items = [], keys = []) {
  const timestamps = items
    .flatMap((item) => keys.map((key) => item?.[key]))
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) return "";

  return new Date(Math.max(...timestamps)).toISOString();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sumCrateWeight(crates = []) {
  return crates.reduce((sum, crate) => sum + toNumber(crate?.weight_kg), 0);
}

function getLoadedCratesValue(source = {}, crates = []) {
  return (
    getFirstValue(source, [
      "loaded_crates",
      "loadedCrates",
      "crates_loaded",
      "cratesLoaded",
      "total_loaded",
      "totalLoaded",
    ]) ||
    getFirstValue(source?.progress || {}, ["loaded"]) ||
    (Array.isArray(source?.crates) ? source.crates.length : "") ||
    crates.length ||
    ""
  );
}

function normalizePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, number));
}

function normalizeInspectionStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function getInspectionTime(item = {}) {
  const timestamps = [
    item.checked_at,
    item.inspected_at,
    item.updated_at,
    item.created_at,
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  return timestamps.length ? Math.max(...timestamps) : null;
}

function getLatestInspection(inspections = []) {
  if (!Array.isArray(inspections) || !inspections.length) return null;

  return inspections.reduce((latest, item) => {
    if (!latest) return item;

    const itemTime = getInspectionTime(item);
    const latestTime = getInspectionTime(latest);

    if (itemTime === null || latestTime === null) {
      return latestTime === null && itemTime !== null ? item : latest;
    }

    return itemTime > latestTime ? item : latest;
  }, null);
}

function getRecordTimestamp(value) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getRecordSortTime(item, fields = []) {
  for (const field of fields) {
    const timestamp = getRecordTimestamp(item?.[field] || item?.raw?.[field]);

    if (timestamp) return timestamp;
  }

  return 0;
}

function compareHarvestRequestsByLatestDate(left, right) {
  const businessDateDifference =
    getRecordSortTime(right, ["preferredTime"]) -
    getRecordSortTime(left, ["preferredTime"]);

  if (businessDateDifference) return businessDateDifference;

  const fallbackDateDifference =
    getRecordSortTime(right, ["created_at", "createdAt", "updated_at", "updatedAt"]) -
    getRecordSortTime(left, ["created_at", "createdAt", "updated_at", "updatedAt"]);

  if (fallbackDateDifference) return fallbackDateDifference;

  return toNumber(right?.id) - toNumber(left?.id);
}

function getProcurementHarvestKey(procurement) {
  const harvestId =
    procurement?.harvestId ||
    getFirstValue(procurement?.raw || {}, ["harvest_id", "harvestId"]) ||
    getFirstValue(procurement?.raw?.harvest || {}, [
      "id",
      "harvest_id",
      "harvestId",
      "booking_id",
    ]);

  return harvestId === null || harvestId === undefined || harvestId === ""
    ? ""
    : String(harvestId);
}

function buildProcurementLookup(procurements = []) {
  return procurements.reduce((lookup, procurement) => {
    const key = getProcurementHarvestKey(procurement);

    if (key) {
      lookup.set(key, procurement);
    }

    return lookup;
  }, new Map());
}

function getExistingProcurementForHarvest(item, procurementLookup) {
  if (!item?.id) return null;
  return procurementLookup.get(String(item.id)) || null;
}

function canManageProcurementForHarvest(item, loggedTraderId) {
  return (
    getCanonicalHarvestStatus(item) === "COMPLETED" &&
    isAssignedToLoggedTrader(item, loggedTraderId)
  );
}

function extractCreatedProcurement(response) {
  return (
    response?.data?.data?.procurement ||
    response?.data?.procurement ||
    response?.data?.data ||
    response?.data ||
    response?.procurement ||
    null
  );
}

function unwrapPrintableResponse(response) {
  if (typeof response === "string") return response;
  if (typeof response?.data === "string") return response.data;
  if (typeof response?.html === "string") return response.html;

  return "";
}

async function openProcurementPrintWindow(procurement) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Unable to open the print window. Please allow pop-ups and try again.");
  }

  printWindow.document.write(
    "<!doctype html><title>Preparing Procurement</title><body style=\"font-family: system-ui, sans-serif; padding: 24px;\">Preparing procurement...</body>"
  );
  printWindow.document.close();

  try {
    const response = await traderService.getProcurementReceiptPrint(procurement.id);
    const printable = unwrapPrintableResponse(response);

    if (!printable) {
      throw new Error("Printable procurement document is unavailable.");
    }

    const objectUrl = URL.createObjectURL(
      new Blob([printable], { type: "text/html;charset=utf-8" })
    );

    printWindow.location.href = objectUrl;
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    if (!printWindow.closed) {
      printWindow.close();
    }

    throw error;
  }
}

function getWorkflowReadiness(workflowData) {
  const inspections = workflowData?.qualityInspections || [];
  const crates = workflowData?.crates || [];
  const transport = workflowData?.transportProgress || null;
  const transportCrates = Array.isArray(transport?.crates) ? transport.crates : [];
  const loadedCrates = getLoadedCratesValue(transport || {}, transportCrates);
  const totalWeight = sumCrateWeight(crates);
  const latestInspection = getLatestInspection(inspections);
  const checkedInspection =
    normalizeInspectionStatus(latestInspection?.inspection_status) === "CHECKED"
      ? latestInspection
      : null;

  const qualityReady = Boolean(checkedInspection);
  const crateReady = crates.length > 0 && totalWeight > 0;
  const totalPackedCrates = toNumber(transport?.total_packed_crates);
  const remainingCrates = toNumber(transport?.remaining_crates);
  const transportReady =
    String(transport?.dispatch_status || "").toUpperCase() ===
      "READY_FOR_DISPATCH" &&
    totalPackedCrates > 0 &&
    remainingCrates === 0;

  return {
    qualityReady,
    crateReady,
    transportReady,
    ready: qualityReady && crateReady && transportReady,
    totalWeight,
    loadedCrates,
    checkedInspection,
  };
}

function normalizeHarvest(item = {}) {
  const harvest = getNestedObject(item, ["harvest", "harvest_request", "harvestRequest"]);
  const harvestDetails = getNestedObject(item, [
    "harvest_details",
    "harvestDetails",
  ]);
  const internalHarvestId =
    item.id || item.harvest_id || item.harvestId || item.booking_id;

  const referenceCode =
    getFirstValue(item, [
      "harvest_code",
      "harvestCode",
      "reference_code",
      "referenceCode",
      "harvest_reference",
      "harvestReference",
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

  const actualHarvestWeightKg = getFirstValue(item, [
    "actual_harvest_weight_kg",
    "actualHarvestWeightKg",
    "actual_weight_kg",
    "actualWeightKg",
  ]);

  const expectedSize =
    getFirstValue(item, [
      "size_count",
      "sizeCount",
      "size",
      "count_per_kg",
      "countPerKg",
      "grade_size",
      "gradeSize",
    ]) ||
    getFirstValue(harvestDetails, [
      "size",
      "size_count",
      "sizeCount",
      "count_per_kg",
      "countPerKg",
      "grade_size",
      "gradeSize",
    ]) ||
    getFirstValue(item, [
      "expected_size",
      "expectedSize",
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

  const species =
    getFirstValue(item, ["species"]) ||
    getFirstValue(harvest, ["species"]) ||
    getFirstValue(harvestDetails, ["species"]) ||
    "-";

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
    actualHarvestWeightKg,
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
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [acceptRequest, setAcceptRequest] = useState(null);
  const [acceptRequestError, setAcceptRequestError] = useState("");
  const [completeHarvestRequest, setCompleteHarvestRequest] = useState(null);
  const [loggedTrader, setLoggedTrader] = useState(null);
  const [completeHarvestOpen, setCompleteHarvestOpen] = useState(false);
  const [completedAt, setCompletedAt] = useState(getLocalDateTimeValue());
  const [completeHarvestLoading, setCompleteHarvestLoading] = useState(false);
  const [completeHarvestError, setCompleteHarvestError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowData, setWorkflowData] = useState({
    qualityInspections: [],
    crates: [],
    transportProgress: null,
  });
  const [workflowErrors, setWorkflowErrors] = useState({
    quality: "",
    crates: "",
    transport: "",
  });
  const [procurements, setProcurements] = useState([]);
  const [procurementsLoading, setProcurementsLoading] = useState(true);
  const [procurementsError, setProcurementsError] = useState("");
  const [procurementPrintId, setProcurementPrintId] = useState("");
  const [procurementPrintError, setProcurementPrintError] = useState("");
  const [createProcurementRequest, setCreateProcurementRequest] = useState(null);
  const [createProcurementLoading, setCreateProcurementLoading] = useState(false);
  const [createProcurementError, setCreateProcurementError] = useState("");
  const [createdProcurement, setCreatedProcurement] = useState(null);
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [ratePerKg, setRatePerKg] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [traderGstin, setTraderGstin] = useState("");
  const [authorizedSignatory, setAuthorizedSignatory] = useState("");

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

  const loadProcurements = useCallback(async () => {
    try {
      setProcurementsLoading(true);
      setProcurementsError("");

      const response = await traderService.getPaymentProcurements();
      const list = unwrapProcurementList(response).map(normalizeProcurement);

      setProcurements(list);
      return list;
    } catch (err) {
      setProcurements([]);
      setProcurementsError(getErrorMessage(err));
      return [];
    } finally {
      setProcurementsLoading(false);
    }
  }, []);

  const refreshSourceProcurement = useCallback(async () => {
    const [harvestResult] = await Promise.allSettled([
      loadHarvestRequests(),
      loadProcurements(),
    ]);

    return harvestResult.status === "fulfilled" ? harvestResult.value : [];
  }, [loadHarvestRequests, loadProcurements]);

 useEffect(() => {
  const timer = window.setTimeout(() => {
    loadLoggedTrader();
    refreshSourceProcurement();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [loadLoggedTrader, refreshSourceProcurement]);

  const loggedTraderId = getLoggedTraderId(loggedTrader);
  const workflowReadiness = useMemo(
    () => getWorkflowReadiness(workflowData),
    [workflowData]
  );
  const procurementLookup = useMemo(
    () => buildProcurementLookup(procurements),
    [procurements]
  );

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

    const filteredRecords = requests.filter((item) => {
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

    return [...filteredRecords].sort(compareHarvestRequestsByLatestDate);
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
      const message = "Harvest request reference is missing. Please refresh and try again.";
      setError(message);
      setAcceptRequestError(message);
      return;
    }

    const traderId = getLoggedTraderId(loggedTrader);

    if (!traderId) {
      const message = "Logged-in trader ID is missing. Please login again.";
      setError(message);
      setAcceptRequestError(message);
      return;
    }

    try {
      setActionLoadingId(item.id);
      setError("");
      setAcceptRequestError("");
      setSuccessMessage("");

      await traderService.updateHarvestBooking(item.id, {
        booking_status: "booked",
        trader_id: traderId,
      });

      await loadHarvestRequests();
      setAcceptRequest(null);
      setSuccessMessage("Harvest request accepted successfully.");
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      setAcceptRequestError(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const resetCreateProcurementForm = useCallback(() => {
    setRatePerKg("");
    setAdjustmentAmount("");
    setTaxAmount("");
    setPaymentTerms("");
    setTraderGstin("");
    setAuthorizedSignatory("");
    setCreateProcurementError("");
  }, []);

  const openCreateProcurementModal = useCallback(
    (item) => {
      if (!canManageProcurementForHarvest(item, loggedTraderId)) {
        setProcurementPrintError("");
        setCreateProcurementError("This harvest is not eligible for procurement generation.");
        return;
      }

      if (procurementsLoading) return;

      if (procurementsError) {
        setProcurementPrintError("");
        setCreateProcurementError("Unable to load procurement status.");
        return;
      }

      if (getExistingProcurementForHarvest(item, procurementLookup)) {
        setProcurementPrintError("");
        setCreateProcurementError("Procurement already exists for this harvest.");
        return;
      }

      setCreatedProcurement(null);
      resetCreateProcurementForm();
      setCreateProcurementRequest(item);
    },
    [
      loggedTraderId,
      procurementLookup,
      procurementsError,
      procurementsLoading,
      resetCreateProcurementForm,
    ]
  );

  const closeCreateProcurementModal = useCallback(() => {
    if (createProcurementLoading) return;

    setCreateProcurementRequest(null);
    resetCreateProcurementForm();
  }, [createProcurementLoading, resetCreateProcurementForm]);

  const openProcurementDetails = useCallback((procurement) => {
    setSelectedProcurement(procurement || null);
    setProcurementPrintError("");
  }, []);

  const closeProcurementDetails = useCallback(() => {
    setSelectedProcurement(null);
    setProcurementPrintError("");
  }, []);

  const handlePrintProcurement = useCallback(async (procurement) => {
    setProcurementPrintError("");

    if (!procurement?.id) {
      setProcurementPrintError("Unable to prepare procurement for printing.");
      return;
    }

    try {
      setProcurementPrintId(String(procurement.id));
      await openProcurementPrintWindow(procurement);
    } catch {
      setProcurementPrintError("Unable to prepare procurement for printing.");
    } finally {
      setProcurementPrintId("");
    }
  }, []);

  const handleCreateProcurement = useCallback(
    async (event) => {
      event.preventDefault();

      if (!createProcurementRequest?.id) {
        setCreateProcurementError("Select a completed harvest.");
        return;
      }

      if (!canManageProcurementForHarvest(createProcurementRequest, loggedTraderId)) {
        setCreateProcurementError("This harvest is not eligible for procurement generation.");
        return;
      }

      if (procurementsLoading) return;

      if (procurementsError) {
        setCreateProcurementError("Unable to load procurement status.");
        return;
      }

      if (getExistingProcurementForHarvest(createProcurementRequest, procurementLookup)) {
        setCreateProcurementError("Procurement already exists for this harvest.");
        return;
      }

      const rate = Number(ratePerKg);

      if (!Number.isFinite(rate) || rate <= 0) {
        setCreateProcurementError("Enter a rate per kg greater than 0.");
        return;
      }

      const adjustment = adjustmentAmount === "" ? 0 : Number(adjustmentAmount);
      const tax = taxAmount === "" ? 0 : Number(taxAmount);

      if (!Number.isFinite(adjustment)) {
        setCreateProcurementError("Enter a valid adjustment amount.");
        return;
      }

      if (!Number.isFinite(tax)) {
        setCreateProcurementError("Enter a valid tax amount.");
        return;
      }

      try {
        setCreateProcurementLoading(true);
        setCreateProcurementError("");
        setSuccessMessage("");

        const response = await traderService.createPaymentProcurement({
          harvest_id: createProcurementRequest.id,
          rate_per_kg: rate,
          adjustment_amount: adjustment,
          tax_amount: tax,
          payment_terms: paymentTerms.trim(),
          trader_gstin: traderGstin.trim(),
          authorized_signatory: authorizedSignatory.trim(),
        });

        const list = await loadProcurements();
        const createdRaw = extractCreatedProcurement(response);
        const normalizedCreated =
          createdRaw && typeof createdRaw === "object"
            ? normalizeProcurement(createdRaw)
            : null;
        const createdFromList =
          list.find((item) => sameId(item.id, normalizedCreated?.id)) ||
          list.find((item) =>
            sameId(getProcurementHarvestKey(item), createProcurementRequest.id)
          ) ||
          null;
        const finalCreated = createdFromList || normalizedCreated;

        setSuccessMessage("Procurement created successfully.");
        setCreatedProcurement(finalCreated);
        setSelectedProcurement(finalCreated);
        setCreateProcurementRequest(null);
        resetCreateProcurementForm();
      } catch (err) {
        setCreateProcurementError(getErrorMessage(err));
      } finally {
        setCreateProcurementLoading(false);
      }
    },
    [
      adjustmentAmount,
      authorizedSignatory,
      createProcurementRequest,
      loadProcurements,
      loggedTraderId,
      paymentTerms,
      procurementLookup,
      procurementsError,
      procurementsLoading,
      ratePerKg,
      resetCreateProcurementForm,
      taxAmount,
      traderGstin,
    ]
  );

  const resetWorkflowState = () => {
    setWorkflowLoading(false);
    setWorkflowData({
      qualityInspections: [],
      crates: [],
      transportProgress: null,
    });
    setWorkflowErrors({
      quality: "",
      crates: "",
      transport: "",
    });
  };

  const loadHarvestWorkflow = async (item) => {
    if (!item?.id || !isAssignedToLoggedTrader(item, loggedTraderId)) {
      resetWorkflowState();
      return;
    }

    try {
      setWorkflowLoading(true);
      setWorkflowErrors({
        quality: "",
        crates: "",
        transport: "",
      });

      const [qualityResult, cratesResult, transportResult] = await Promise.allSettled([
        traderService.getQualityInspections({ harvest_id: item.id }),
        traderService.getHarvestPackedCrates(item.id),
        traderService.getTransportHarvestProgress(item.id),
      ]);

      setWorkflowData({
        qualityInspections:
          qualityResult.status === "fulfilled"
            ? unwrapList(qualityResult.value)
            : [],
        crates:
          cratesResult.status === "fulfilled" ? unwrapList(cratesResult.value) : [],
        transportProgress:
          transportResult.status === "fulfilled"
            ? unwrapObject(transportResult.value)
            : null,
      });

      setWorkflowErrors({
        quality:
          qualityResult.status === "rejected"
            ? getErrorMessage(qualityResult.reason)
            : "",
        crates:
          cratesResult.status === "rejected"
            ? getErrorMessage(cratesResult.reason)
            : "",
        transport:
          transportResult.status === "rejected"
            ? getErrorMessage(transportResult.reason)
            : "",
      });
    } finally {
      setWorkflowLoading(false);
    }
  };

  const openHarvestDetailsModal = (item) => {
    setAcceptRequest(null);
    setAcceptRequestError("");
    setCompleteHarvestOpen(false);
    setCompleteHarvestRequest(null);
    setCompleteHarvestError("");
    setSelectedRequest(item);
    resetWorkflowState();

    if (
      item?.id &&
      isAssignedToLoggedTrader(item, loggedTraderId) &&
      ["BOOKED", "COMPLETED"].includes(getCanonicalHarvestStatus(item))
    ) {
      loadHarvestWorkflow(item);
    }
  };

  const openAcceptRequestModal = (item) => {
    setSelectedRequest(null);
    setCompleteHarvestOpen(false);
    setCompleteHarvestRequest(null);
    setAcceptRequest(item);
    setAcceptRequestError("");
  };

  const closeAcceptRequestModal = () => {
    if (actionLoadingId === acceptRequest?.id) return;

    setAcceptRequest(null);
    setAcceptRequestError("");
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

    const currentReadiness = getWorkflowReadiness(workflowData);

    if (!currentReadiness.ready) {
      setCompleteHarvestError(
        "Operational workflow is not ready for final completion."
      );
      return;
    }

    setAcceptRequest(null);
    setAcceptRequestError("");
    setCompleteHarvestRequest(item);
    setCompletedAt(getLocalDateTimeValue());
    setCompleteHarvestError("");
    setCompleteHarvestOpen(true);
  };

  const closeCompleteHarvestModal = () => {
    if (completeHarvestLoading) return;

    setCompleteHarvestOpen(false);
    setCompleteHarvestRequest(null);
    setCompletedAt(getLocalDateTimeValue());
    setCompleteHarvestError("");
  };

  const handleCompleteHarvest = async (event) => {
    event.preventDefault();

    if (!completeHarvestRequest?.id) {
      setCompleteHarvestError("Harvest reference is missing. Please refresh and try again.");
      return;
    }

    if (!loggedTraderId) {
      setCompleteHarvestError("Trader profile is still loading. Please try again.");
      return;
    }

    if (!isAssignedToLoggedTrader(completeHarvestRequest, loggedTraderId)) {
      setCompleteHarvestError("This harvest is assigned to another trader.");
      return;
    }

    const currentReadiness = getWorkflowReadiness(workflowData);
    const weight = currentReadiness.totalWeight;

    if (!currentReadiness.ready) {
      setCompleteHarvestError(
        "Operational workflow is not ready for final completion."
      );
      return;
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      setCompleteHarvestError("Packed crate weight is not available.");
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

      await traderService.completeHarvestForPayment(completeHarvestRequest.id, {
        actual_harvest_weight_kg: weight,
        completed_at: completedDate.toISOString(),
      });

      const refreshedRequests = await loadHarvestRequests();
      const refreshedHarvest =
        refreshedRequests.find((item) => sameId(item.id, completeHarvestRequest.id)) ||
        null;
      await loadProcurements();

      if (refreshedHarvest) {
        setSelectedRequest(refreshedHarvest);
      }

      setSuccessMessage("Harvest completed successfully.");
      setCompleteHarvestOpen(false);
      setCompleteHarvestRequest(null);
      setCompletedAt(getLocalDateTimeValue());
    } catch (err) {
      setCompleteHarvestError(getErrorMessage(err));
    } finally {
      setCompleteHarvestLoading(false);
    }
  };

  const renderHarvestActions = (item, isBusy) => {
    const actionState = getCompletionActionState(item);
    const canManageProcurement = canManageProcurementForHarvest(
      item,
      loggedTraderId
    );
    const existingProcurement = getExistingProcurementForHarvest(
      item,
      procurementLookup
    );
    const baseButtonClass =
      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10";
    const createButtonClass =
      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10";
    const printButtonClass =
      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10";

    return (
      <>
        <button
          type="button"
          onClick={() => openHarvestDetailsModal(item)}
          title="View Harvest"
          aria-label="View Harvest"
          className={baseButtonClass}
        >
          <Eye size={18} aria-hidden="true" />
        </button>

        {actionState === "ACCEPT" ? (
          <button
            type="button"
            disabled={isBusy || !item.id}
            onClick={() => openAcceptRequestModal(item)}
            title="Accept Request"
            aria-label="Accept Request"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
          >
            <Check size={18} aria-hidden="true" />
          </button>
        ) : null}

        {canManageProcurement && procurementsLoading ? (
          <button
            type="button"
            disabled
            title="Checking procurement..."
            aria-label="Checking procurement status"
            className={baseButtonClass}
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        ) : null}

        {canManageProcurement && !procurementsLoading && procurementsError ? (
          <button
            type="button"
            disabled
            title="Unable to load procurement status"
            aria-label="Unable to load procurement status"
            className={baseButtonClass}
          >
            <FilePlus size={18} aria-hidden="true" />
          </button>
        ) : null}

        {canManageProcurement &&
        !procurementsLoading &&
        !procurementsError &&
        !existingProcurement ? (
          <button
            type="button"
            onClick={() => openCreateProcurementModal(item)}
            title="Generate Procurement"
            aria-label="Generate Procurement"
            className={createButtonClass}
          >
            <FilePlus size={18} aria-hidden="true" />
          </button>
        ) : null}

        {canManageProcurement &&
        !procurementsLoading &&
        !procurementsError &&
        existingProcurement ? (
          <>
            <button
              type="button"
              onClick={() => handlePrintProcurement(existingProcurement)}
              disabled={String(procurementPrintId) === String(existingProcurement.id)}
              title="Print / Save Procurement"
              aria-label="Print / Save Procurement"
              className={printButtonClass}
            >
              <Printer size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/payments")}
              title="Go to Payments"
              aria-label="Go to Payments"
              className={baseButtonClass}
            >
              <CreditCard size={18} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </>
    );
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
                  onClick={refreshSourceProcurement}
                  disabled={loading || procurementsLoading}
                  variant="secondary"
                >
                  {loading || procurementsLoading ? "Loading..." : "Refresh"}
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{successMessage}</span>
                  {createdProcurement?.id ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openProcurementDetails(createdProcurement)}
                        className="inline-flex min-h-9 items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                      >
                        View Procurement
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintProcurement(createdProcurement)}
                        className="inline-flex min-h-9 items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Print / Save PDF
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {procurementsError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>Unable to load procurement status.</span>
                  <button
                    type="button"
                    onClick={loadProcurements}
                    className="inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-50"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}

            {procurementPrintError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {procurementPrintError}
              </div>
            ) : null}
          </div>

          <div className="hidden p-4 md:block sm:p-6">
            <div className="rounded-2xl border border-slate-200">
              <div className="w-full">
                <table className="w-full table-fixed divide-y divide-slate-200 text-left">
                  <colgroup>
                    <col className="w-[15%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                    <col className="w-[14%]" />
                    <col className="w-[11%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Request</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Species</TableHead>
                      <TableHead>Size Count</TableHead>
                      <TableHead>Biomass</TableHead>
                      <TableHead>Preferred Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                        const isBusy = actionLoadingId === item.id;

                        return (
                          <tr
                            key={`${item.id || index}-${item.referenceCode}`}
                            className="hover:bg-slate-50"
                          >
                            <td className="truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle">
                              <p className="truncate text-sm font-black text-slate-950">
                                {item.referenceCode}
                              </p>
                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                {item.qrCode !== "-" ? `QR: ${item.qrCode}` : "No QR code"}
                              </p>
                            </td>

                            <td className="truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {item.sourceName}
                              </p>
                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                {item.farmName} • {item.pondName}
                              </p>
                            </td>

                            <td className="truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle text-sm font-semibold text-slate-700">
                              <span className="block truncate">{item.species}</span>
                            </td>

                            <td className="truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle text-sm font-semibold text-slate-700">
                              <span className="block truncate">
                                {formatExpectedSize(item.expectedSize)}
                              </span>
                            </td>

                            <td className="truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle text-sm font-semibold text-slate-700">
                              <span className="block truncate">
                                {formatKg(item.biomass)}
                              </span>
                            </td>

                            <td className="truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle text-sm font-semibold text-slate-700">
                              <span className="block truncate">
                                {formatDate(item.preferredTime)}
                              </span>
                            </td>

                            <td className="truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle">
                              <TraderStatusBadge
                                status={statusLabel(getCanonicalHarvestStatus(item))}
                              />
                            </td>

                            <td className="truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle">
                              <div className="flex flex-nowrap items-center justify-end gap-2">
                                {renderHarvestActions(item, isBusy)}
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

                      <div className="mt-4 flex flex-nowrap items-center gap-2">
                        {renderHarvestActions(item, isBusy)}
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
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
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
                onClick={() => {
                  setSelectedRequest(null);
                  resetWorkflowState();
                }}
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

              <WorkflowSection
                selectedRequest={selectedRequest}
                loggedTraderId={loggedTraderId}
                loading={workflowLoading}
                workflowData={workflowData}
                workflowErrors={workflowErrors}
                readiness={workflowReadiness}
                onRetry={() => loadHarvestWorkflow(selectedRequest)}
                onComplete={() => openCompleteHarvestModal(selectedRequest)}
                completeError={completeHarvestError}
              />

              <FinancialProcurementSection
                selectedRequest={selectedRequest}
                loggedTraderId={loggedTraderId}
                procurement={getExistingProcurementForHarvest(
                  selectedRequest,
                  procurementLookup
                )}
                loading={procurementsLoading}
                error={procurementsError}
                printLoadingId={procurementPrintId}
                onRetry={loadProcurements}
                onGenerate={() => openCreateProcurementModal(selectedRequest)}
                onView={openProcurementDetails}
                onPrint={handlePrintProcurement}
                onPayments={() => navigate("/payments")}
              />
            </div>

          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(acceptRequest)}
        title="Accept Harvest Request"
        onClose={closeAcceptRequestModal}
        className="max-w-xl"
      >
        <div className="space-y-5">
          <p className="text-sm font-semibold leading-6 text-slate-700">
            Are you sure you want to accept this harvest request?
          </p>

          <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
            <Detail label="Farmer Name" value={acceptRequest?.farmerName} />
            <Detail label="Harvest Reference" value={acceptRequest?.referenceCode} />
            <Detail label="Farm / Pond" value={`${acceptRequest?.farmName || ""} / ${acceptRequest?.pondName || ""}`} wide />
          </section>

          {acceptRequestError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {acceptRequestError}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <TraderButton
              type="button"
              variant="secondary"
              onClick={closeAcceptRequestModal}
              disabled={actionLoadingId === acceptRequest?.id}
            >
              Cancel
            </TraderButton>

            <TraderButton
              type="button"
              onClick={() => handleAccept(acceptRequest)}
              disabled={!acceptRequest?.id || actionLoadingId === acceptRequest?.id}
            >
              {actionLoadingId === acceptRequest?.id ? "Accepting..." : "Accept Request"}
            </TraderButton>
          </div>
        </div>
      </Modal>

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
              value={completeHarvestRequest?.referenceCode}
            />
            <Detail label="Farmer Name" value={completeHarvestRequest?.farmerName} />
            <Detail label="Farm Name" value={completeHarvestRequest?.farmName} />
            <Detail label="Species" value={completeHarvestRequest?.species} />
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail
              label="Actual Harvest Weight"
              value={`${sumCrateWeight(workflowData.crates).toFixed(2)} kg`}
            />
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

      <CreateProcurementModal
        open={Boolean(createProcurementRequest)}
        harvest={createProcurementRequest}
        ratePerKg={ratePerKg}
        setRatePerKg={setRatePerKg}
        adjustmentAmount={adjustmentAmount}
        setAdjustmentAmount={setAdjustmentAmount}
        taxAmount={taxAmount}
        setTaxAmount={setTaxAmount}
        paymentTerms={paymentTerms}
        setPaymentTerms={setPaymentTerms}
        traderGstin={traderGstin}
        setTraderGstin={setTraderGstin}
        authorizedSignatory={authorizedSignatory}
        setAuthorizedSignatory={setAuthorizedSignatory}
        error={createProcurementError}
        submitting={createProcurementLoading}
        onClose={closeCreateProcurementModal}
        onSubmit={handleCreateProcurement}
      />

      <ProcurementDetailsModal
        open={Boolean(selectedProcurement)}
        procurement={selectedProcurement}
        printLoading={Boolean(
          selectedProcurement?.id &&
            String(procurementPrintId) === String(selectedProcurement.id)
        )}
        printError={procurementPrintError}
        onClose={closeProcurementDetails}
        onPrint={() => handlePrintProcurement(selectedProcurement)}
        onPayments={() => navigate("/payments")}
      />
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
        "whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function WorkflowSection({
  selectedRequest,
  loggedTraderId,
  loading,
  workflowData,
  workflowErrors,
  readiness,
  onRetry,
  onComplete,
  completeError,
}) {
  const canonicalStatus = getCanonicalHarvestStatus(selectedRequest);
  const assignedToCurrentTrader = isAssignedToLoggedTrader(
    selectedRequest,
    loggedTraderId
  );
  const canLoadWorkflow =
    selectedRequest?.id &&
    assignedToCurrentTrader &&
    ["BOOKED", "COMPLETED"].includes(canonicalStatus);

  const inspections = workflowData.qualityInspections || [];
  const crates = workflowData.crates || [];
  const transport = workflowData.transportProgress;
  const latestInspection = getLatestInspection(inspections);
  const latestPackedAt = getLatestDate(crates, ["packed_at", "created_at"]);
  const progressValue = normalizePercent(transport?.loading_progress);

  if (!canLoadWorkflow) {
    return (
      <DetailSection title="Operational Workflow">
        <Detail
          label="Workflow Access"
          value={
            canonicalStatus === "PENDING"
              ? "Available after trader booking"
              : "Operational workflow is available only for the assigned trader"
          }
          wide
        />
      </DetailSection>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">
            Operational Workflow
          </h4>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Operational workflow status for this harvest reference.
          </p>
        </div>
        <TraderButton
          type="button"
          variant="secondary"
          onClick={onRetry}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {loading ? "Loading..." : "Refresh Workflow"}
        </TraderButton>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-500">
          Loading operational workflow...
        </div>
      ) : null}

      {!loading ? (
        <div className="space-y-4">
          <DetailSection title="Trader Booking">
            <Detail label="Assigned Trader" value={getAssignedTraderLabel(selectedRequest)} />
            <Detail label="Booking Status" value={statusLabel(canonicalStatus)} />
          </DetailSection>

          <DetailSection title="Quality Inspection">
            <Detail
              label="Inspection Status"
              value={
                latestInspection?.inspection_status
                  ? formatStatusLabel(latestInspection.inspection_status)
                  : workflowErrors.quality
                    ? "Unable to load"
                    : "Not available"
              }
            />
            <Detail label="Inspection ID" value={latestInspection?.id} />
            <Detail label="Quality Checker ID" value={latestInspection?.quality_checker_id} />
            <Detail label="Grade" value={latestInspection?.grade} />
            <Detail label="Inspected At" value={formatDateTime(latestInspection?.inspected_at)} />
            <Detail
              label="Ready"
              value={readiness.qualityReady ? "Yes" : "No"}
            />
            {workflowErrors.quality ? (
              <Detail label="Quality Data" value={workflowErrors.quality} wide />
            ) : null}
          </DetailSection>

          <DetailSection title="Crate Packing">
            <Detail label="Total Crates" value={crates.length} />
            <Detail
              label="Total Packed Weight"
              value={`${readiness.totalWeight.toFixed(2)} kg`}
            />
            <Detail label="Latest Packed At" value={formatDateTime(latestPackedAt)} />
            <Detail
              label="Packing Status"
              value={
                crates[0]?.packing_status
                  ? formatStatusLabel(crates[0].packing_status)
                  : "Not available"
              }
            />
            <Detail label="Ready" value={readiness.crateReady ? "Yes" : "No"} />
            {workflowErrors.crates ? (
              <Detail label="Crate Data" value={workflowErrors.crates} wide />
            ) : null}
          </DetailSection>

          <DetailSection title="Transport">
            <Detail label="Operator" value={transport?.transport_operator?.full_name} />
            <Detail label="Vehicle" value={transport?.vehicle_number} />
            <Detail label="Total Packed Crates" value={transport?.total_packed_crates} />
            <Detail label="Loaded Crates" value={readiness.loadedCrates} />
            <Detail label="Remaining Crates" value={transport?.remaining_crates} />
            <Detail
              label="Dispatch Status"
              value={formatDispatchStatus(transport?.dispatch_status)}
            />
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Loading Progress
              </p>
              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                {progressValue === null ? "Not available" : `${progressValue}%`}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${progressValue || 0}%` }}
                />
              </div>
            </div>
            <Detail label="Ready" value={readiness.transportReady ? "Yes" : "No"} />
            {workflowErrors.transport ? (
              <Detail label="Transport Data" value={workflowErrors.transport} wide />
            ) : null}
          </DetailSection>

          <DetailSection title="Final Harvest">
            <Detail label="Total Crates" value={crates.length} />
            <Detail
              label="Actual Harvest Weight"
              value={`${readiness.totalWeight.toFixed(2)} kg`}
            />
            <Detail
              label="Completion Readiness"
              value={readiness.ready ? "Ready" : "Not ready"}
            />
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Complete Harvest
              </p>
              <p className="mt-1.5 text-sm font-semibold text-slate-700">
                Final completion uses the packed crate weight calculated from
                recorded crate weights.
              </p>
              {completeError ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {completeError}
                </div>
              ) : null}
              <TraderButton
                type="button"
                className="mt-4"
                onClick={onComplete}
                disabled={!readiness.ready || canonicalStatus === "COMPLETED"}
              >
                {canonicalStatus === "COMPLETED"
                  ? "Harvest Completed"
                  : "Complete Harvest"}
              </TraderButton>
            </div>
          </DetailSection>
        </div>
      ) : null}
    </section>
  );
}

function FinancialProcurementSection({
  selectedRequest,
  loggedTraderId,
  procurement,
  loading,
  error,
  printLoadingId,
  onRetry,
  onGenerate,
  onView,
  onPrint,
  onPayments,
}) {
  if (!canManageProcurementForHarvest(selectedRequest, loggedTraderId)) {
    return null;
  }

  if (loading) {
    return (
      <DetailSection title="Financial / Procurement">
        <Detail label="Procurement Status" value="Checking procurement..." wide />
      </DetailSection>
    );
  }

  if (error) {
    return (
      <DetailSection title="Financial / Procurement">
        <Detail label="Procurement Status" value="Unable to load procurement status." />
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Actions
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Retry
          </button>
        </div>
      </DetailSection>
    );
  }

  if (!procurement) {
    return (
      <DetailSection title="Financial / Procurement">
        <Detail label="Status" value="Not Generated" />
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Actions
          </p>
          <button
            type="button"
            onClick={onGenerate}
            title="Generate Procurement"
            aria-label="Generate Procurement"
            className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
          >
            <FilePlus size={16} aria-hidden="true" />
            Generate Procurement
          </button>
        </div>
      </DetailSection>
    );
  }

  return (
    <DetailSection title="Financial / Procurement">
      <Detail label="Procurement No" value={procurement.procurementNo} />
      <Detail label="Status" value={formatStatusLabel(procurement.status)} />
      <Detail label="Total Value" value={formatCurrency(procurement.totalValue)} />
      <Detail label="Paid" value={formatCurrency(procurement.totalPaid)} />
      <Detail
        label="Outstanding"
        value={formatCurrency(procurement.outstandingBalance)}
      />
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Actions
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onView(procurement)}
            title="View Procurement"
            aria-label="View Procurement"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Eye size={16} aria-hidden="true" />
            View Procurement
          </button>
          <button
            type="button"
            onClick={() => onPrint(procurement)}
            disabled={String(printLoadingId) === String(procurement.id)}
            title="Print / Save PDF"
            aria-label="Print / Save PDF"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Printer size={16} aria-hidden="true" />
            {String(printLoadingId) === String(procurement.id)
              ? "Preparing..."
              : "Print / Save PDF"}
          </button>
          <button
            type="button"
            onClick={onPayments}
            title="Go to Payments"
            aria-label="Go to Payments"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <CreditCard size={16} aria-hidden="true" />
            Go to Payments
          </button>
        </div>
      </div>
    </DetailSection>
  );
}

function CreateProcurementModal({
  open,
  harvest,
  ratePerKg,
  setRatePerKg,
  adjustmentAmount,
  setAdjustmentAmount,
  taxAmount,
  setTaxAmount,
  paymentTerms,
  setPaymentTerms,
  traderGstin,
  setTraderGstin,
  authorizedSignatory,
  setAuthorizedSignatory,
  error,
  submitting,
  onClose,
  onSubmit,
}) {
  const weight = harvest?.actualHarvestWeightKg;
  const estimatedGrossAmount =
    weight && ratePerKg && safeNumber(weight) > 0 && safeNumber(ratePerKg) > 0
      ? safeNumber(weight) * safeNumber(ratePerKg)
      : null;

  return (
    <Modal open={open} title="CREATE PROCUREMENT" onClose={onClose} className="max-w-3xl">
      <form className="space-y-5" onSubmit={onSubmit}>
        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
          <Detail label="Harvest Reference" value={harvest?.referenceCode} />
          <Detail label="Farmer / Producer" value={harvest?.farmerName} />
          <Detail label="Farm" value={harvest?.farmName} />
          <Detail label="Species" value={harvest?.species} />
          <Detail
            label="Actual Harvest Weight"
            value={weight ? formatKg(weight) : "Not available"}
            wide
          />
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Rate Per Kg *">
            <TraderInput
              type="number"
              min="0"
              step="0.01"
              value={ratePerKg}
              onChange={(event) => setRatePerKg(event.target.value)}
              placeholder="0.00"
              required
              disabled={submitting}
            />
          </FormField>
          <FormField label="Adjustment Amount">
            <TraderInput
              type="number"
              step="0.01"
              value={adjustmentAmount}
              onChange={(event) => setAdjustmentAmount(event.target.value)}
              placeholder="0.00"
              disabled={submitting}
            />
          </FormField>
          <FormField label="Tax Amount">
            <TraderInput
              type="number"
              min="0"
              step="0.01"
              value={taxAmount}
              onChange={(event) => setTaxAmount(event.target.value)}
              placeholder="0.00"
              disabled={submitting}
            />
          </FormField>
          <FormField label="Trader GSTIN">
            <TraderInput
              value={traderGstin}
              onChange={(event) => setTraderGstin(event.target.value)}
              placeholder="GSTIN"
              disabled={submitting}
            />
          </FormField>
          <FormField label="Payment Terms" wide>
            <TraderTextarea
              rows={3}
              value={paymentTerms}
              onChange={(event) => setPaymentTerms(event.target.value)}
              placeholder="Enter settlement terms"
              disabled={submitting}
            />
          </FormField>
          <FormField label="Authorized Signatory">
            <TraderInput
              value={authorizedSignatory}
              onChange={(event) => setAuthorizedSignatory(event.target.value)}
              placeholder="Name"
              disabled={submitting}
            />
          </FormField>
        </div>

        {estimatedGrossAmount !== null ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Estimated Gross Amount
            </p>
            <p className="mt-1 text-sm font-black text-blue-950">
              {formatCurrency(estimatedGrossAmount)}
            </p>
            <p className="mt-1 text-xs font-semibold text-blue-700">
              Final settlement will use the confirmed system calculation.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <TraderButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </TraderButton>
          <TraderButton type="submit" disabled={!harvest?.id || submitting}>
            {submitting ? "Creating..." : "Create Procurement"}
          </TraderButton>
        </div>
      </form>
    </Modal>
  );
}

function ProcurementDetailsModal({
  open,
  procurement,
  printLoading,
  printError,
  onClose,
  onPrint,
  onPayments,
}) {
  const raw = procurement?.raw || {};

  return (
    <Modal open={open} title="Procurement Details" onClose={onClose} className="max-w-3xl">
      <div className="space-y-5">
        <DetailSection title="Procurement">
          <Detail label="Procurement No" value={procurement?.procurementNo} />
          <Detail label="Status" value={formatStatusLabel(procurement?.status)} />
          <Detail label="Harvest Reference" value={procurement?.harvest} />
          <Detail label="Producer / Farmer" value={procurement?.producer} />
          <Detail
            label="Actual Harvest Weight"
            value={
              procurement?.actualWeight &&
              procurement.actualWeight !== "Not available"
                ? formatKg(procurement.actualWeight)
                : "Not available"
            }
          />
          <Detail
            label="Rate / Kg"
            value={formatOptionalCurrency(getFirstValue(raw, ["rate_per_kg", "ratePerKg"]))}
          />
          <Detail label="Total Value" value={formatCurrency(procurement?.totalValue)} />
          <Detail label="Total Paid" value={formatCurrency(procurement?.totalPaid)} />
          <Detail
            label="Outstanding Balance"
            value={formatCurrency(procurement?.outstandingBalance)}
          />
          <Detail
            label="Payment Terms"
            value={getFirstValue(raw, ["payment_terms", "paymentTerms"])}
            wide
          />
        </DetailSection>

        {printError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {printError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <TraderButton type="button" variant="secondary" onClick={onClose}>
            Close
          </TraderButton>
          <TraderButton type="button" variant="secondary" onClick={onPayments}>
            <CreditCard size={17} aria-hidden="true" />
            Go to Payments
          </TraderButton>
          <TraderButton type="button" onClick={onPrint} disabled={!procurement?.id || printLoading}>
            <Printer size={17} aria-hidden="true" />
            {printLoading ? "Preparing..." : "Print / Save PDF"}
          </TraderButton>
        </div>
      </div>
    </Modal>
  );
}

function FormField({ label, children, wide = false }) {
  return (
    <label className={["block min-w-0", wide ? "sm:col-span-2" : ""].join(" ")}>
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
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
