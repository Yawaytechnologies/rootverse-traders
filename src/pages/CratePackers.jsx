import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye, Plus, RefreshCw, Search, X } from "lucide-react";

import {
  createCratePacker,
  getCratePackers,
} from "../redux/actions/trader.actions";
import traderService from "../redux/services/trader.service";
import TraderButton from "../components/ui/TraderButton";
import TraderInput from "../components/ui/TraderInput";
import TraderSelect from "../components/ui/TraderSelect";
import TraderTextarea from "../components/ui/TraderTextarea";
import TraderStatusBadge from "../components/ui/TraderStatusBadge";
import {
  buildHarvestReferenceLookup,
  extractHarvestList,
  getHarvestReference,
  REFERENCE_UNAVAILABLE,
} from "../utils/harvestReference";

const initialForm = {
  name: "",
  phone: "",
  address: "",
  email: "",
  date_of_birth: "",
  country_id: "",
  state_id: "",
  district_id: "",
  location_id: "",
  status: "active",
};

const tabs = [
  { key: "packers", label: "Crate Packers" },
  { key: "logs", label: "Packing Logs" },
];

function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function extractArray(response, key) {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;

  if (key && Array.isArray(data?.[key])) return data[key];
  if (key && Array.isArray(data?.data?.[key])) return data.data[key];

  if (Array.isArray(data?.countries)) return data.countries;
  if (Array.isArray(data?.states)) return data.states;
  if (Array.isArray(data?.districts)) return data.districts;
  if (Array.isArray(data?.locations)) return data.locations;
  if (Array.isArray(data?.crates)) return data.crates;

  return [];
}

function unwrapPayload(response) {
  return response?.data?.data || response?.data || response || {};
}

function getItemId(item) {
  return (
    item?.id ||
    item?._id ||
    item?.country_id ||
    item?.state_id ||
    item?.district_id ||
    item?.location_id ||
    ""
  );
}

function getItemName(item) {
  return (
    item?.name ||
    item?.country_name ||
    item?.countryName ||
    item?.state_name ||
    item?.stateName ||
    item?.district_name ||
    item?.districtName ||
    item?.location_name ||
    item?.locationName ||
    item?.title ||
    ""
  );
}

function getPackerId(item) {
  return item?.id;
}

function getPackerCode(item) {
  return item?.code || "";
}

function getPackerName(item) {
  return item?.name || "";
}

function getPackerPhone(item) {
  return item?.phone || "";
}

function getPackerEmail(item) {
  return item?.email || "";
}

function getPackerDateOfBirth(item) {
  return item?.date_of_birth || "";
}

function getPackerStatus(item) {
  const status = String(item?.status || "")
    .trim()
    .toLowerCase();

  if (status === "active" || status === "inactive") return status;

  return "Not available";
}

function getLocationName() {
  return "";
}

function getAddressLocation(item) {
  const address = item?.address || "";
  return address;
}

function getHarvestId(item) {
  return item?.harvest_id || item?.harvestId || item?.harvest?.id || "";
}

function getActivityHarvestReference(records = []) {
  const reference = records
    .map((record) => getHarvestReference(record, new Map()))
    .find((value) => value && value !== REFERENCE_UNAVAILABLE);

  return reference || "";
}

function sameId(left, right) {
  if (left === null || left === undefined || left === "") return false;
  if (right === null || right === undefined || right === "") return false;
  return String(left) === String(right);
}

function valueOrNotAvailable(value) {
  if (value === undefined || value === null || value === "") {
    return "Not available";
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    return "Not available";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not available";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function hasReadableValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  if (typeof value === "object") return false;
  return true;
}

function getFirstValue(item = {}, keys = []) {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function sumCrateWeights(crates = []) {
  return crates.reduce((sum, crate) => sum + toNumericWeight(crate?.weight_kg), 0);
}

function getTotalCratesValue(source = {}, crates = []) {
  return (
    getFirstValue(source, [
      "total_crates",
      "total_crates_packed",
      "totalCrates",
      "crate_count",
      "crateCount",
      "number_of_crates",
      "numberOfCrates",
      "packed_crates_count",
      "packedCratesCount",
    ]) ||
    (Array.isArray(source?.crates) ? source.crates.length : "") ||
    crates.length
  );
}

function getTotalWeightValue(source = {}, crates = []) {
  return (
    getFirstValue(source, [
      "total_weight",
      "totalWeight",
      "total_weight_kg",
      "totalWeightKg",
      "weight_kg",
      "weightKg",
      "packed_weight",
      "packedWeight",
    ]) ||
    sumCrateWeights(Array.isArray(source?.crates) ? source.crates : crates)
  );
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

function formatDate(value) {
  if (!value) return "Not available";
  return String(value).split("T")[0] || "Not available";
}

function formatDateTime(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return valueOrNotAvailable(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toNumericWeight(value) {
  const number = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatWeight(value) {
  if (typeof value === "string" && value.trim().toLowerCase().includes("kg")) {
    return value;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Not available";
  }

  return `${number.toFixed(2)} KG`;
}

function hasPaginationMetadata(payload) {
  if (!payload || typeof payload !== "object") return false;

  const data = payload.data;
  const meta = payload.meta;

  return Boolean(
    payload.page ||
      payload.page_size ||
      payload.pageSize ||
      payload.total ||
      payload.total_pages ||
      payload.pagination ||
      meta?.page ||
      meta?.page_size ||
      meta?.pagination ||
      data?.page ||
      data?.page_size ||
      data?.pagination
  );
}

function collectArrays(value, arrays = []) {
  if (Array.isArray(value)) {
    arrays.push(value);
    return arrays;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((child) => collectArrays(child, arrays));
  }

  return arrays;
}

function extractActivityRecords(response) {
  const payload = unwrapPayload(response);
  const arrays = collectArrays(payload);
  const usable = arrays.find((items) =>
    items.some((item) => item && typeof item === "object" && getHarvestId(item))
  );

  return {
    records: usable || [],
    paginated: hasPaginationMetadata(payload),
  };
}

function getLatestDate(records) {
  const timestamps = records
    .map((item) => item?.packed_at || item?.created_at || item?.updated_at)
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) return "";

  return new Date(Math.max(...timestamps)).toISOString();
}

function groupActivityByHarvest(records, paginated) {
  const map = new Map();

  records.forEach((record) => {
    const harvestId = getHarvestId(record);
    if (!harvestId) return;

    const key = String(harvestId);
    const current = map.get(key) || {
      harvest_id: harvestId,
      records: [],
    };

    current.records.push(record);
    map.set(key, current);
  });

  return Array.from(map.values()).map((item) => {
    const sourceWithTotals =
      item.records.find((record) =>
        hasReadableValue(
          getFirstValue(record, [
            "total_crates",
            "total_crates_packed",
            "totalCrates",
            "crate_count",
            "crateCount",
            "number_of_crates",
            "numberOfCrates",
            "packed_crates_count",
            "packedCratesCount",
          ])
        )
      ) ||
      item.records.find((record) =>
        hasReadableValue(
          getFirstValue(record, [
            "total_weight",
            "totalWeight",
            "total_weight_kg",
            "totalWeightKg",
            "weight_kg",
            "weightKg",
            "packed_weight",
            "packedWeight",
          ])
        )
      ) ||
      {};
    const totalCrates = getTotalCratesValue(sourceWithTotals, item.records);
    const totalWeight = getTotalWeightValue(sourceWithTotals, item.records);
    const status =
      item.records.find((record) => record?.packing_status)?.packing_status ||
      "";

    return {
      harvest_id: item.harvest_id,
      harvest_reference: getActivityHarvestReference(item.records),
      packing_date: getLatestDate(item.records),
      total_crates: totalCrates,
      total_weight: totalWeight,
      status,
      records: item.records,
      derivedFromLoadedRecords: !paginated && !hasReadableValue(sourceWithTotals?.total_crates),
    };
  });
}

function SkeletonRows({ rows = 4, cells = 7 }) {
  return Array.from({ length: rows }).map((_, rowIndex) => (
    <tr key={rowIndex}>
      {Array.from({ length: cells }).map((__, cellIndex) => (
        <td key={cellIndex} className="px-4 py-4">
          <div className="h-4 w-full max-w-32 animate-pulse rounded-full bg-slate-100" />
        </td>
      ))}
    </tr>
  ));
}

export default function CratePackers() {
  const dispatch = useDispatch();

  const traderState = useSelector(
    (state) => state.trader || state.traderReducer || {}
  );

  const { cratePackers = [], loading, error } = traderState;

  const [activeTab, setActiveTab] = useState("packers");
  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState("");

  const [selectedPacker, setSelectedPacker] = useState(null);
  const [packerHistory, setPackerHistory] = useState([]);
  const [activityPaginated, setActivityPaginated] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyUnsupported, setHistoryUnsupported] = useState(false);

  const [harvestDetail, setHarvestDetail] = useState(null);
  const [harvestCrates, setHarvestCrates] = useState([]);
  const [harvestLoading, setHarvestLoading] = useState(false);
  const [harvestError, setHarvestError] = useState("");
  const [harvestAttributionLimited, setHarvestAttributionLimited] =
    useState(false);
  const [harvestLookup, setHarvestLookup] = useState(() => new Map());
  const [harvestLookupStatus, setHarvestLookupStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;

    dispatch(getCratePackers()).catch(() => {});
    loadCountries();

    traderService
      .getHarvestRequests()
      .then((response) => {
        if (!ignore) {
          setHarvestLookup(buildHarvestReferenceLookup(extractHarvestList(response)));
          setHarvestLookupStatus("ready");
        }
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) {
          setHarvestLookup(new Map());
          setHarvestLookupStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [dispatch]);

  const filteredPackers = useMemo(() => {
    const list = Array.isArray(cratePackers) ? cratePackers : [];
    const query = searchText.trim().toLowerCase();

    return list.filter((item) => {
      const status = getPackerStatus(item);
      const statusMatches = statusFilter === "ALL" || status === statusFilter;
      const searchable = [
        getPackerCode(item),
        getPackerName(item),
        getPackerPhone(item),
        getPackerEmail(item),
        item?.address,
        getLocationName(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return statusMatches && (!query || searchable.includes(query));
    });
  }, [cratePackers, searchText, statusFilter]);

  async function refreshPackers() {
    setSuccess("");
    await dispatch(getCratePackers()).catch(() => {});
  }

  function resetCreateForm() {
    setForm(initialForm);
    setStates([]);
    setDistricts([]);
    setLocations([]);
  }

  function openCreateModal() {
    setSuccess("");
    setCreateError("");
    resetCreateForm();
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (createLoading) return;

    setCreateModalOpen(false);
    setCreateError("");
    resetCreateForm();
  }

  async function loadCountries() {
    try {
      setMasterLoading(true);
      setMasterError("");

      const response = await traderService.getCountries();
      setCountries(extractArray(response, "countries"));
    } catch (err) {
      console.error(err);
      setMasterError("Country list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  }

  async function loadStates(countryId) {
    if (!countryId) return;

    try {
      setMasterLoading(true);
      setMasterError("");

      const response = await traderService.getStatesByCountry(countryId);
      setStates(extractArray(response, "states"));
    } catch (err) {
      console.error(err);
      setMasterError("State list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  }

  async function loadDistricts(stateId) {
    if (!stateId) return;

    try {
      setMasterLoading(true);
      setMasterError("");

      const response = await traderService.getDistrictsByState(stateId);
      setDistricts(extractArray(response, "districts"));
    } catch (err) {
      console.error(err);
      setMasterError("District list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  }

  async function loadLocations(districtId) {
    if (!districtId) return;

    try {
      setMasterLoading(true);
      setMasterError("");

      const response = await traderService.getLocationsByDistrict(districtId);
      setLocations(extractArray(response, "locations"));
    } catch (err) {
      console.error(err);
      setMasterError("Location list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  }

  async function loadPackerHistory(packer) {
    const packerId = getPackerId(packer);

    if (!packerId) {
      setHistoryError("Crate packer reference is not available.");
      setPackerHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError("");
      setHistoryUnsupported(false);

      const response = await traderService.getCratePackerActivity(packerId, {
        page: 1,
        page_size: 20,
      });
      const { records, paginated } = extractActivityRecords(response);

      if (!records.length) {
        setHistoryUnsupported(true);
      }

      setActivityPaginated(paginated);
      setPackerHistory(groupActivityByHarvest(records, paginated));
    } catch (err) {
      console.error(err);
      setHistoryError(err?.message || "Unable to load packing history.");
      setPackerHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openPackerDetails(packer) {
    setSelectedPacker(packer);
    setPackerHistory([]);
    setHistoryError("");
    setHistoryUnsupported(false);
    setActivityPaginated(false);
    await loadPackerHistory(packer);
  }

  function closePackerDetails() {
    setSelectedPacker(null);
    setPackerHistory([]);
    setHistoryError("");
    setHistoryUnsupported(false);
    setHistoryLoading(false);
    setActivityPaginated(false);
  }

  async function openHarvestPackingDetails(historyRow) {
    const harvestId = historyRow?.harvest_id;
    const packerId = getPackerId(selectedPacker);

    if (!harvestId) {
      setHarvestDetail(historyRow || {});
      setHarvestError("Harvest reference is not available.");
      return;
    }

    try {
      setHarvestDetail(historyRow || { harvest_id: harvestId });
      setHarvestCrates([]);
      setHarvestLoading(true);
      setHarvestError("");
      setHarvestAttributionLimited(false);

      const response = await traderService.getHarvestPackedCrates(harvestId);
      const payload = unwrapPayload(response);
      const crates = extractArray(response, "data");
      const hasPackerField = crates.some(
        (crate) => crate?.crate_packer_id !== undefined && crate?.crate_packer_id !== null
      );
      const visibleCrates =
        hasPackerField && packerId
          ? crates.filter((crate) => sameId(crate?.crate_packer_id, packerId))
          : crates;

      setHarvestDetail({ ...(historyRow || { harvest_id: harvestId }), ...payload });
      setHarvestAttributionLimited(!hasPackerField && crates.length > 0);
      setHarvestCrates(visibleCrates);
    } catch (err) {
      console.error(err);
      setHarvestError(err?.message || "Unable to load harvest packing details.");
    } finally {
      setHarvestLoading(false);
    }
  }

  function closeHarvestPackingDetails() {
    setHarvestDetail(null);
    setHarvestCrates([]);
    setHarvestLoading(false);
    setHarvestError("");
    setHarvestAttributionLimited(false);
  }

  async function handleChange(e) {
    const { name, value } = e.target;

    setSuccess("");

    if (name === "country_id") {
      setForm((prev) => ({
        ...prev,
        country_id: value,
        state_id: "",
        district_id: "",
        location_id: "",
      }));
      setStates([]);
      setDistricts([]);
      setLocations([]);
      if (value) await loadStates(value);
      return;
    }

    if (name === "state_id") {
      setForm((prev) => ({
        ...prev,
        state_id: value,
        district_id: "",
        location_id: "",
      }));
      setDistricts([]);
      setLocations([]);
      if (value) await loadDistricts(value);
      return;
    }

    if (name === "district_id") {
      setForm((prev) => ({
        ...prev,
        district_id: value,
        location_id: "",
      }));
      setLocations([]);
      if (value) await loadLocations(value);
      return;
    }

    if (name === "phone") {
      setForm((prev) => ({
        ...prev,
        phone: cleanMobile(value),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();

    try {
      setCreateLoading(true);
      setCreateError("");

      const payload = {
        name: form.name.trim(),
        phone: cleanMobile(form.phone),
        address: form.address.trim(),
        email: form.email.trim(),
        date_of_birth: form.date_of_birth,
        location_id: Number(form.location_id),
        status: form.status || "active",
      };

      await dispatch(createCratePacker(payload));
      await dispatch(getCratePackers());
      resetCreateForm();
      setCreateModalOpen(false);
      setSuccess("Crate packer created successfully");
    } catch (err) {
      console.error(err);
      setCreateError(err?.message || "Unable to create Crate Packer.");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crate Packing</h1>
        <p className="text-sm text-gray-500">
          Manage trader-owned crate packers and review harvest packing records.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/60">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "min-h-10 rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15",
              activeTab === tab.key
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "packers" ? (
        <>
          {error ? (
            <InlineError
              message="Unable to load crate packers."
              detail={error}
              onRetry={refreshPackers}
            />
          ) : null}

          {masterError ? (
            <InlineError message={masterError} onRetry={loadCountries} />
          ) : null}

          {success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          <CratePackerList
            packers={filteredPackers}
            loading={loading}
            searchText={searchText}
            statusFilter={statusFilter}
            onSearchChange={setSearchText}
            onStatusFilterChange={setStatusFilter}
            onRefresh={refreshPackers}
            onCreate={openCreateModal}
            onView={openPackerDetails}
          />
        </>
      ) : (
        <PackingLogsUnsupported />
      )}

      {selectedPacker ? (
          <PackerDetailsModal
            packer={selectedPacker}
            history={packerHistory}
            harvestLookup={harvestLookup}
            harvestLookupStatus={harvestLookupStatus}
            loading={historyLoading}
          error={historyError}
          unsupported={historyUnsupported}
          paginated={activityPaginated}
          onClose={closePackerDetails}
          onRetry={() => loadPackerHistory(selectedPacker)}
          onViewHarvest={openHarvestPackingDetails}
        />
      ) : null}

      {harvestDetail || harvestLoading || harvestError ? (
          <HarvestPackingDetailModal
            packer={selectedPacker}
            harvest={harvestDetail}
            harvestLookup={harvestLookup}
            harvestLookupStatus={harvestLookupStatus}
            crates={harvestCrates}
          loading={harvestLoading}
          error={harvestError}
          attributionLimited={harvestAttributionLimited}
          onClose={closeHarvestPackingDetails}
          onRetry={() => openHarvestPackingDetails(harvestDetail)}
        />
      ) : null}

      {createModalOpen ? (
        <CreateModalShell
          title="Create Crate Packer"
          subtitle="Add a staff member under your Trader account."
          onClose={closeCreateModal}
          formId="create-crate-packer-form"
          loading={createLoading}
          submitLabel="Create Crate Packer"
        >
          {createError ? (
            <div className="mb-4">
              <InlineError message={createError} />
            </div>
          ) : null}
          <CreateCratePackerForm
            formId="create-crate-packer-form"
            form={form}
            countries={countries}
            states={states}
            districts={districts}
            locations={locations}
            masterLoading={masterLoading}
            onChange={handleChange}
            onSubmit={handleCreate}
          />
        </CreateModalShell>
      ) : null}
    </div>
  );
}

function CreateCratePackerForm({
  formId,
  form,
  countries,
  states,
  districts,
  locations,
  masterLoading,
  onChange,
  onSubmit,
}) {
  return (
      <form
        id={formId}
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <Input
          label="Name"
          name="name"
          value={form.name}
          onChange={onChange}
          required
        />

        <Input
          label="Phone"
          name="phone"
          value={form.phone}
          onChange={onChange}
          required
          maxLength={10}
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          required
        />

        <Input
          label="Date of Birth"
          name="date_of_birth"
          type="date"
          value={form.date_of_birth}
          onChange={onChange}
          required
        />

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Address
          </label>
          <TraderTextarea
            name="address"
            value={form.address}
            onChange={onChange}
            required
            rows={3}
            placeholder="Enter address"
          />
        </div>

        <Select
          label="Country"
          name="country_id"
          value={form.country_id}
          onChange={onChange}
          required
          disabled={masterLoading}
          options={countries}
        />

        <Select
          label="State"
          name="state_id"
          value={form.state_id}
          onChange={onChange}
          required
          disabled={!form.country_id || masterLoading}
          options={states}
        />

        <Select
          label="District"
          name="district_id"
          value={form.district_id}
          onChange={onChange}
          required
          disabled={!form.state_id || masterLoading}
          options={districts}
        />

        <Select
          label="Location"
          name="location_id"
          value={form.location_id}
          onChange={onChange}
          required
          disabled={!form.district_id || masterLoading}
          options={locations}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <TraderSelect
            name="status"
            value={form.status}
            onChange={onChange}
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </TraderSelect>
        </div>
      </form>
  );
}

function CratePackerList({
  packers,
  loading,
  searchText,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onRefresh,
  onCreate,
  onView,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="space-y-4 border-b border-gray-200 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Crate Packer List
            </h2>
            <p className="text-sm text-gray-500">
              Manage your crate packing team and review harvest packing activity.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <TraderButton type="button" variant="secondary" onClick={onRefresh}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </TraderButton>
            <TraderButton
              type="button"
              onClick={onCreate}
              title="Create Crate Packer"
              aria-label="Create Crate Packer"
            >
              <Plus size={16} aria-hidden="true" />
              Create Crate Packer
            </TraderButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
          <label className="relative block">
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <TraderInput
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search code, name, mobile, email, address or location"
              className="pl-10"
            />
          </label>

          <TraderSelect
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </TraderSelect>
        </div>
      </div>

      <div className="hidden md:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location / Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cells={7} /> : null}
            {!loading && packers.length === 0 ? (
              <EmptyTableRow colSpan={7} message="No crate packers available." />
            ) : null}
            {!loading
              ? packers.map((packer) => (
                  <PackerTableRow
                    key={
                      getPackerId(packer) ||
                      `${getPackerPhone(packer)}-${getPackerEmail(packer)}`
                    }
                    packer={packer}
                    onView={onView}
                  />
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {loading ? (
          <MobileSkeletonCards />
        ) : packers.length === 0 ? (
          <EmptyCard message="No crate packers available." />
        ) : (
          packers.map((packer) => (
            <PackerMobileCard
              key={
                getPackerId(packer) ||
                `${getPackerPhone(packer)}-${getPackerEmail(packer)}`
              }
              packer={packer}
              onView={onView}
            />
          ))
        )}
      </div>
    </section>
  );
}

function PackerTableRow({ packer, onView }) {
  return (
    <tr className="border-t border-gray-100">
      <TableCell className="font-bold text-slate-900">
        {valueOrNotAvailable(getPackerCode(packer))}
      </TableCell>
      <TableCell>{valueOrNotAvailable(getPackerName(packer))}</TableCell>
      <TableCell>{valueOrNotAvailable(getPackerPhone(packer))}</TableCell>
      <TableCell>{valueOrNotAvailable(getPackerEmail(packer))}</TableCell>
      <TableCell>{valueOrNotAvailable(getAddressLocation(packer))}</TableCell>
      <TableCell>
        <TraderStatusBadge status={getPackerStatus(packer)} />
      </TableCell>
      <TableCell className="text-right">
        <IconButton
          title="View Crate Packer"
          onClick={() => onView(packer)}
          disabled={!getPackerId(packer)}
        />
      </TableCell>
    </tr>
  );
}

function PackerMobileCard({ packer, onView }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {valueOrNotAvailable(getPackerName(packer))}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {valueOrNotAvailable(getPackerCode(packer))}
          </p>
        </div>
        <TraderStatusBadge status={getPackerStatus(packer)} />
      </div>
      <div className="mt-4 grid gap-3">
        <SummaryDetail label="Mobile" value={getPackerPhone(packer)} />
        <SummaryDetail
          label="Status"
          value={formatStatusLabel(getPackerStatus(packer))}
        />
      </div>
      <div className="mt-4">
        <TraderButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onView(packer)}
          disabled={!getPackerId(packer)}
        >
          <Eye size={16} aria-hidden="true" />
          View
        </TraderButton>
      </div>
    </div>
  );
}

function PackerDetailsModal({
  packer,
  history,
  harvestLookup,
  harvestLookupStatus,
  loading,
  error,
  unsupported,
  paginated,
  onClose,
  onRetry,
  onViewHarvest,
}) {
  return (
    <ModalShell title="Crate Packer Details" onClose={onClose}>
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          <SummaryDetail label="Packer Code" value={getPackerCode(packer)} />
          <SummaryDetail label="Name" value={getPackerName(packer)} />
          <SummaryDetail label="Mobile" value={getPackerPhone(packer)} />
          <SummaryDetail label="Email" value={getPackerEmail(packer)} />
          <SummaryDetail
            label="Address / Location"
            value={getAddressLocation(packer)}
          />
          <SummaryDetail
            label="Date of Birth"
            value={formatDate(getPackerDateOfBirth(packer))}
          />
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <div className="mt-2">
              <TraderStatusBadge status={getPackerStatus(packer)} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                Harvest Packing History
              </h3>
              {!loading && !error && !unsupported ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Harvests shown: {history.length}
                  {paginated
                    ? " (showing the current page of packing history)"
                    : " (based on the loaded packing records)"}
                </p>
              ) : null}
            </div>
            <TraderButton type="button" variant="secondary" onClick={onRetry}>
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </TraderButton>
          </div>

          {error ? (
            <div className="m-4">
              <InlineError
                message="Unable to load packing history."
                detail={error}
                onRetry={onRetry}
              />
            </div>
          ) : null}

          {!error && unsupported ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-500">
              No packing activity available for this crate packer.
            </div>
          ) : null}

          {!error && !unsupported ? (
            <HarvestHistoryTable
              history={history}
              harvestLookup={harvestLookup}
              harvestLookupStatus={harvestLookupStatus}
              loading={loading}
              paginated={paginated}
              onView={onViewHarvest}
            />
          ) : null}
        </section>
      </div>
    </ModalShell>
  );
}

function HarvestHistoryTable({
  history,
  harvestLookup,
  harvestLookupStatus,
  loading,
  paginated,
  onView,
}) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead className="w-[25%]">Harvest Reference</TableHead>
              <TableHead className="w-[20%]">Packing Date</TableHead>
              <TableHead className="w-[15%]">Total Crates</TableHead>
              <TableHead className="w-[15%]">Total Weight</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cells={6} /> : null}
            {!loading && history.length === 0 ? (
              <EmptyTableRow
                colSpan={6}
                message="No packing activity available for this crate packer."
              />
            ) : null}
            {!loading
              ? history.map((row) => (
                  <HarvestHistoryRow
                    key={row.harvest_id}
                    row={row}
                    harvestLookup={harvestLookup}
                    harvestLookupStatus={harvestLookupStatus}
                    paginated={paginated}
                    onView={onView}
                  />
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {loading ? (
          <MobileSkeletonCards />
        ) : history.length === 0 ? (
          <EmptyCard message="No packing activity available for this crate packer." />
        ) : (
          history.map((row) => (
            <HarvestHistoryMobileCard
              key={row.harvest_id}
              row={row}
              harvestLookup={harvestLookup}
              harvestLookupStatus={harvestLookupStatus}
              paginated={paginated}
              onView={onView}
            />
          ))
        )}
      </div>
    </>
  );
}

function HarvestHistoryRow({
  row,
  harvestLookup,
  harvestLookupStatus,
  onView,
}) {
  return (
    <tr className="border-t border-gray-100">
      <TableCell className="truncate font-bold text-slate-900">
        {getHarvestReference(row, harvestLookup, {
          loading: harvestLookupStatus === "loading",
          error: harvestLookupStatus === "error",
        })}
      </TableCell>
      <TableCell>{formatDateTime(row.packing_date)}</TableCell>
      <TableCell>
        {valueOrNotAvailable(row.total_crates)}
      </TableCell>
      <TableCell>
        {formatWeight(row.total_weight)}
      </TableCell>
      <TableCell>
        <TraderStatusBadge status={valueOrNotAvailable(row.status)} />
      </TableCell>
      <TableCell className="text-right">
        <IconButton
          title="View Harvest Packing"
          onClick={() => onView(row)}
          disabled={!row.harvest_id}
        />
      </TableCell>
    </tr>
  );
}

function HarvestHistoryMobileCard({
  row,
  harvestLookup,
  harvestLookupStatus,
  onView,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {getHarvestReference(row, harvestLookup, {
              loading: harvestLookupStatus === "loading",
              error: harvestLookupStatus === "error",
            })}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {formatDateTime(row.packing_date)}
          </p>
        </div>
        <TraderStatusBadge status={valueOrNotAvailable(row.status)} />
      </div>
      <div className="mt-4 grid gap-3">
        <SummaryDetail
          label="Total Crates"
          value={valueOrNotAvailable(row.total_crates)}
        />
        <SummaryDetail
          label="Total Weight"
          value={formatWeight(row.total_weight)}
        />
      </div>
      <div className="mt-4">
        <TraderButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onView(row)}
          disabled={!row.harvest_id}
        >
          <Eye size={16} aria-hidden="true" />
          View
        </TraderButton>
      </div>
    </div>
  );
}

function HarvestPackingDetailModal({
  packer,
  harvest,
  harvestLookup,
  harvestLookupStatus,
  crates,
  loading,
  error,
  attributionLimited,
  onClose,
  onRetry,
}) {
  const latestPackedAt = getLatestDate(crates);
  const totalCrates = getTotalCratesValue(harvest, crates);
  const totalWeight = getTotalWeightValue(harvest, crates);
  const harvestReference = getHarvestReference(harvest, harvestLookup, {
    loading: harvestLookupStatus === "loading",
    error: harvestLookupStatus === "error",
  });
  const pondCode =
    crates.find((crate) => crate?.pond_qr_code)?.pond_qr_code ||
    harvest?.pond_qr_code ||
    "";

  return (
    <ModalShell title="Harvest Packing Details" onClose={onClose}>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <InlineError
          message="Unable to load harvest packing details."
          detail={error}
          onRetry={onRetry}
        />
      ) : null}

      {!loading && !error ? (
        <div className="space-y-5">
          <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
            {hasReadableValue(harvestReference) ? (
              <SummaryDetail label="Harvest Reference" value={harvestReference} />
            ) : null}
            {hasReadableValue(pondCode) ? (
              <SummaryDetail label="Pond QR" value={pondCode} />
            ) : null}
            <SummaryDetail
              label="Crate Packer"
              value={getPackerName(packer)}
            />
            {hasReadableValue(getPackerCode(packer)) ? (
              <SummaryDetail label="Packer Code" value={getPackerCode(packer)} />
            ) : null}
            <SummaryDetail label="Total Crates" value={valueOrNotAvailable(totalCrates)} />
            <SummaryDetail
              label="Total Weight"
              value={formatWeight(totalWeight)}
            />
          </section>

          {hasReadableValue(latestPackedAt) ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                Timing
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <SummaryDetail
                  label="Latest Packed At"
                  value={formatDateTime(latestPackedAt)}
                />
              </div>
            </section>
          ) : null}

          {attributionLimited ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Some crate ownership details are not available for this harvest,
              so only the available packing records are shown.
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                Crates
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Total packed weight is calculated from the displayed crate weights.
              </p>
            </div>

            <CrateTable crates={crates} />
          </section>
        </div>
      ) : null}
    </ModalShell>
  );
}

function CrateTable({ crates }) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[13%]" />
            <col className="w-[17%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Crate Code</TableHead>
              <TableHead>Species</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Packing Status</TableHead>
              <TableHead>Packed At</TableHead>
            </tr>
          </thead>
          <tbody>
            {crates.length === 0 ? (
              <EmptyTableRow
                colSpan={7}
                message="No packed crates available for this harvest."
              />
            ) : (
              crates.map((crate) => (
                <tr
                  key={crate?.id || crate?.crate_code}
                  className="border-t border-gray-100"
                >
                  <TableCell className="font-bold text-slate-900">
                    {valueOrNotAvailable(crate?.crate_code)}
                  </TableCell>
                  <TableCell>{valueOrNotAvailable(crate?.species)}</TableCell>
                  <TableCell>{valueOrNotAvailable(crate?.grade)}</TableCell>
                  <TableCell>{valueOrNotAvailable(crate?.size_count_kg)}</TableCell>
                  <TableCell>{formatWeight(crate?.weight_kg)}</TableCell>
                  <TableCell>
                    <TraderStatusBadge
                      status={valueOrNotAvailable(crate?.packing_status)}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(crate?.packed_at)}</TableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {crates.length === 0 ? (
          <EmptyCard message="No packed crates available for this harvest." />
        ) : (
          crates.map((crate) => (
            <div
              key={crate?.id || crate?.crate_code}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {valueOrNotAvailable(crate?.crate_code)}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {valueOrNotAvailable(crate?.species)}
                  </p>
                </div>
                <TraderStatusBadge
                  status={valueOrNotAvailable(crate?.packing_status)}
                />
              </div>
              <div className="mt-4 grid gap-3">
                <SummaryDetail label="Grade" value={crate?.grade} />
                <SummaryDetail label="Size" value={crate?.size_count_kg} />
                <SummaryDetail label="Weight" value={formatWeight(crate?.weight_kg)} />
                <SummaryDetail label="Packed At" value={formatDateTime(crate?.packed_at)} />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function PackingLogsUnsupported() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm shadow-slate-200/60">
      <h2 className="text-lg font-black text-slate-950">Packing Logs</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
        Packing logs will appear when trader-wide packing history is available.
        Open a crate packer profile to review harvest packing activity.
      </p>
    </section>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <TraderInput
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </div>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  disabled = false,
  required = false,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <TraderSelect
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map((item) => (
          <option key={getItemId(item)} value={getItemId(item)}>
            {getItemName(item)}
          </option>
        ))}
      </TraderSelect>
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

function TableCell({ children, className = "" }) {
  return (
    <td className={["truncate whitespace-nowrap overflow-hidden px-3 py-3 align-middle text-sm text-slate-700", className].join(" ")}>
      {children}
    </td>
  );
}

function EmptyTableRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm font-semibold text-gray-500">
        {message}
      </td>
    </tr>
  );
}

function EmptyCard({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function MobileSkeletonCards() {
  return Array.from({ length: 3 }).map((_, index) => (
    <div
      key={index}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="h-4 w-40 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-4 grid gap-3">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  ));
}

function IconButton({ title, onClick, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
    >
      <Eye size={17} aria-hidden="true" />
    </button>
  );
}

function SummaryDetail({ label, value, wide = false }) {
  return (
    <div
      className={[
        "min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3",
        wide ? "sm:col-span-2" : "",
      ].join(" ")}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">
        {valueOrNotAvailable(value)}
      </p>
    </div>
  );
}

function InlineError({ message, detail, onRetry }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {message}
        {detail ? <span className="block font-medium">{detail}</span> : null}
      </span>
      {onRetry ? (
        <TraderButton type="button" variant="secondary" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" />
          Retry
        </TraderButton>
      ) : null}
    </div>
  );
}

function CreateModalShell({
  title,
  subtitle,
  onClose,
  formId,
  loading,
  submitLabel,
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-4">
      <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-black text-slate-950 sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
            aria-label="Close"
            title="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-5">
          {children}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white p-5 sm:flex-row sm:justify-end">
          <TraderButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </TraderButton>
          <TraderButton type="submit" form={formId} disabled={loading}>
            {loading ? "Creating..." : submitLabel}
          </TraderButton>
        </div>
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-4">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Crate Packing
            </p>
            <h2 className="mt-1 break-words text-xl font-black text-slate-950 sm:text-2xl">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
            aria-label="Close"
            title="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
