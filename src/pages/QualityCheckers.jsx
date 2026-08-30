import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye, Plus, RefreshCw, Search, X } from "lucide-react";

import {
  createQualityChecker,
  getQualityCheckers,
} from "../redux/actions/trader.actions";
import traderService from "../redux/services/trader.service";
import TraderButton from "../components/ui/TraderButton";
import TraderInput from "../components/ui/TraderInput";
import TraderSelect from "../components/ui/TraderSelect";
import TraderStatusBadge from "../components/ui/TraderStatusBadge";
import {
  buildHarvestReferenceLookup,
  extractHarvestList,
  getHarvestReference,
} from "../utils/harvestReference";
import {
  formatLocationLabel,
  mergeLocationLookup,
  normalizeLocation,
} from "../utils/locationNormalizers";

const initialForm = {
  checker_name: "",
  checker_email: "",
  checker_phone: "",
  country_id: "",
  state_id: "",
  district_id: "",
  location_id: "",
  checker_code: "",
  is_active: true,
};

const tabs = [
  { key: "inspectors", label: "Quality Inspectors" },
  { key: "logs", label: "Inspection Logs" },
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

  return [];
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
  const payload = unwrapObject(response);
  const arrays = collectArrays(payload);
  const usable = arrays.find((items) =>
    items.some((item) => item && typeof item === "object" && item?.harvest_id)
  );

  return usable || [];
}

function unwrapObject(response) {
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

function getCheckerId(item) {
  return item?.id;
}

function getInspectionId(item) {
  return item?.id || item?._id || item?.inspection_id || item?.inspectionId;
}

function getFirstValue(item = {}, keys = []) {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], item);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function valueOrNotAvailable(value) {
  if (value === undefined || value === null || value === "") {
    return "Not available";
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    return "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not available";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
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

function getLocationName(item, locationLookup = new Map()) {
  const locationId = item?.location_id;

  if (locationId === undefined || locationId === null || locationId === "") {
    return "";
  }

  return formatLocationLabel(locationLookup.get(String(locationId)), {
    compact: true,
  });
}

function getLocationDetails(item, locationLookup = new Map()) {
  const locationId = item?.location_id;

  if (locationId === undefined || locationId === null || locationId === "") {
    return null;
  }

  return locationLookup.get(String(locationId)) || null;
}

function getCheckerStatus(item) {
  if (item?.is_active === false) return "Inactive";
  if (item?.is_active === true) return "Active";
  return "Not available";
}

function getInspectionStatus(item) {
  return valueOrNotAvailable(item?.inspection_status);
}

function getFarmPondLabel(item) {
  const farm = getFirstValue(item, ["farm_name", "farmName", "farm.name"]);
  const pond = getFirstValue(item, ["pond_name", "pondName", "pond.name"]);

  if (farm && pond) return `${farm} / ${pond}`;
  if (farm) return farm;
  if (pond) return pond;

  return "Not available";
}

function getInspectorLabel(item) {
  return valueOrNotAvailable(
    getFirstValue(item, [
      "checker_name",
      "quality_checker_name",
      "inspector.checker_name",
      "inspector.name",
    ])
  );
}

function isUsableImageUrl(value) {
  return /^https?:\/\/.+/i.test(String(value || "").trim());
}

function hasReadableValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  if (typeof value === "object") return false;
  return true;
}

function isUsableLink(value) {
  return /^https?:\/\/.+/i.test(String(value || "").trim());
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

export default function QualityCheckers() {
  const dispatch = useDispatch();

  const traderState = useSelector(
    (state) => state.trader || state.traderReducer || {}
  );

  const { qualityCheckers = [], loading, error } = traderState;

  const [activeTab, setActiveTab] = useState("inspectors");
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
  const [locationLookup, setLocationLookup] = useState(() => new Map());
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState("");

  const [selectedInspector, setSelectedInspector] = useState(null);
  const [inspectorHistory, setInspectorHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [inspectionLogs, setInspectionLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [harvestLookup, setHarvestLookup] = useState(() => new Map());
  const [harvestLookupStatus, setHarvestLookupStatus] = useState("loading");

  const [inspectionDetail, setInspectionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const loadInspectionLogs = useCallback(
    async (force = false) => {
      if (logsLoading) return;
      if (logsLoaded && !force) return;

      try {
        setLogsLoading(true);
        setLogsError("");

        const response = await traderService.getQualityInspections();
        setInspectionLogs(extractArray(response, "data"));
        setLogsLoaded(true);
      } catch (err) {
        console.error(err);
        setLogsError(err?.message || "Inspection logs fetch failed");
        setInspectionLogs([]);
      } finally {
        setLogsLoading(false);
      }
    },
    [logsLoaded, logsLoading]
  );

  const loadLocationLookup = useCallback(async (countryList = []) => {
    try {
      const countryItems = Array.isArray(countryList) ? countryList : [];

      const stateLists = await Promise.all(
        countryItems.map(async (country) => {
          const countryId = getItemId(country);
          if (!countryId) return [];
          const response = await traderService.getStatesByCountry(countryId);
          return extractArray(response, "states").map((state) => ({
            state,
            country,
          }));
        })
      );

      const districtLists = await Promise.all(
        stateLists.flat().map(async ({ state, country }) => {
          const stateId = getItemId(state);
          if (!stateId) return [];
          const response = await traderService.getDistrictsByState(stateId);
          return extractArray(response, "districts").map((district) => ({
            district,
            state,
            country,
          }));
        })
      );

      const locationLists = await Promise.all(
        districtLists.flat().map(async ({ district, state, country }) => {
          const districtId = getItemId(district);
          if (!districtId) return [];
          const response = await traderService.getLocationsByDistrict(districtId);
          return {
            locations: extractArray(response, "locations"),
            context: { district, state, country },
          };
        })
      );

      const nextLookup = locationLists.reduce((lookup, entry) => {
        return mergeLocationLookup(lookup, entry.locations, entry.context);
      }, new Map());
      setLocationLookup(nextLookup);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const missingLocationIds = Array.from(
      new Set(
        (Array.isArray(qualityCheckers) ? qualityCheckers : [])
          .map((checker) => checker?.location_id)
          .filter((locationId) => locationId !== undefined && locationId !== null && locationId !== "")
          .map(String)
      )
    ).filter((locationId) => !locationLookup.has(locationId));

    if (!missingLocationIds.length) return undefined;

    Promise.all(
      missingLocationIds.map((locationId) =>
        traderService
          .getLocationById(locationId)
          .then((response) => normalizeLocation(unwrapObject(response)))
          .catch((err) => {
            console.error(err);
            return null;
          })
      )
    ).then((locations) => {
      if (ignore) return;
      setLocationLookup((prev) => {
        const next = new Map(prev);
        locations.filter(Boolean).forEach((location) => {
          if (location.id) {
            next.set(location.id, location);
          }
        });
        return next;
      });
    });

    return () => {
      ignore = true;
    };
  }, [locationLookup, qualityCheckers]);

  useEffect(() => {
    let ignore = false;

    dispatch(getQualityCheckers()).catch(() => {});
    loadCountries().then((items) => loadLocationLookup(items));

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
  }, [dispatch, loadLocationLookup]);

  const filteredInspectors = useMemo(() => {
    const list = Array.isArray(qualityCheckers) ? qualityCheckers : [];
    const query = searchText.trim().toLowerCase();

    return list.filter((item) => {
      const status = getCheckerStatus(item);
      const statusMatches = statusFilter === "ALL" || status === statusFilter;
      const searchable = [
        item?.checker_code,
        item?.checker_name,
        item?.checker_phone,
        item?.checker_email,
        getLocationName(item, locationLookup),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return statusMatches && (!query || searchable.includes(query));
    });
  }, [locationLookup, qualityCheckers, searchText, statusFilter]);

  function handleTabChange(tabKey) {
    setActiveTab(tabKey);

    if (tabKey === "logs") {
      loadInspectionLogs();
    }
  }

  async function refreshInspectors() {
    setSuccess("");
    await dispatch(getQualityCheckers()).catch(() => {});
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
      const list = extractArray(response, "countries");
      setCountries(list);
      return list;
    } catch (err) {
      console.error(err);
      setMasterError("Country list fetch failed");
      return [];
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
      const list = extractArray(response, "locations");
      setLocations(list);
      setLocationLookup((prev) => {
        const district = districts.find((item) => String(getItemId(item)) === String(districtId));
        const state = states.find((item) => String(getItemId(item)) === String(form.state_id));
        const country = countries.find((item) => String(getItemId(item)) === String(form.country_id));
        return mergeLocationLookup(prev, list, { district, state, country });
      });
    } catch (err) {
      console.error(err);
      setMasterError("Location list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  }

  async function loadInspectorHistory(inspector) {
    const checkerId = getCheckerId(inspector);

    if (!checkerId) {
      setHistoryError(
        "Inspection history is unavailable because this inspector is missing the required profile reference."
      );
      setInspectorHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await traderService.getQualityCheckerActivity(checkerId, {
        page: 1,
        page_size: 20,
      });
      setInspectorHistory(extractActivityRecords(response));
    } catch (err) {
      console.error(err);
      setHistoryError(err?.message || "Unable to load inspection history.");
      setInspectorHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openInspectorDetails(inspector) {
    setSelectedInspector(inspector);
    setInspectorHistory([]);
    setHistoryError("");
    await loadInspectorHistory(inspector);
  }

  function closeInspectorDetails() {
    setSelectedInspector(null);
    setInspectorHistory([]);
    setHistoryError("");
    setHistoryLoading(false);
  }

  async function openInspectionDetail(inspection) {
    const inspectionId = getInspectionId(inspection);

    if (!inspectionId) {
      setInspectionDetail({});
      setDetailError("Inspection reference is not available.");
      return;
    }

    try {
      setInspectionDetail(null);
      setDetailLoading(true);
      setDetailError("");

      const response = await traderService.getQualityInspectionById(
        inspectionId
      );
      setInspectionDetail(unwrapObject(response));
    } catch (err) {
      console.error(err);
      setDetailError(err?.message || "Inspection detail fetch failed");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeInspectionDetail() {
    setInspectionDetail(null);
    setDetailLoading(false);
    setDetailError("");
  }

  async function handleChange(e) {
    const { name, value, type, checked } = e.target;

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

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setCreateLoading(true);
      setCreateError("");

      const payload = {
        checker_name: form.checker_name.trim(),
        checker_email: form.checker_email.trim(),
        checker_phone: cleanMobile(form.checker_phone),
        location_id: Number(form.location_id),
        checker_code: form.checker_code.trim(),
        is_active: Boolean(form.is_active),
      };

      await dispatch(createQualityChecker(payload));
      await dispatch(getQualityCheckers());
      resetCreateForm();
      setCreateModalOpen(false);
      setSuccess("Quality checker created successfully");
    } catch (err) {
      console.error(err);
      setCreateError(err?.message || "Unable to create Quality Inspector.");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Quality Inspection
        </h1>
        <p className="text-sm text-gray-500">
          Manage trader-owned inspectors and review harvest inspection records.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/60">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
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

      {activeTab === "inspectors" ? (
        <>
          {error ? (
            <InlineError message={error} onRetry={refreshInspectors} />
          ) : null}

          {masterError ? (
            <InlineError message={masterError} onRetry={loadCountries} />
          ) : null}

          {success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          <InspectorList
            inspectors={filteredInspectors}
            loading={loading}
            searchText={searchText}
            statusFilter={statusFilter}
            onSearchChange={setSearchText}
            onStatusFilterChange={setStatusFilter}
            onRefresh={refreshInspectors}
            onCreate={openCreateModal}
            onView={openInspectorDetails}
            locationLookup={locationLookup}
          />
        </>
      ) : (
          <InspectionLogsTab
          inspections={inspectionLogs}
          harvestLookup={harvestLookup}
          harvestLookupStatus={harvestLookupStatus}
          loading={logsLoading}
          error={logsError}
          onRefresh={() => loadInspectionLogs(true)}
          onView={openInspectionDetail}
        />
      )}

      {createModalOpen ? (
        <CreateModalShell
          title="Create Quality Inspector"
          subtitle="Add a staff member under your Trader account."
          onClose={closeCreateModal}
          formId="create-quality-inspector-form"
          loading={createLoading}
          submitLabel="Create Quality Inspector"
        >
          {createError ? (
            <div className="mb-4">
              <InlineError message={createError} />
            </div>
          ) : null}
          <CreateInspectorForm
            formId="create-quality-inspector-form"
            form={form}
            countries={countries}
            states={states}
            districts={districts}
            locations={locations}
            masterLoading={masterLoading}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
        </CreateModalShell>
      ) : null}

      {selectedInspector ? (
          <InspectorDetailsModal
            inspector={selectedInspector}
            inspections={inspectorHistory}
            harvestLookup={harvestLookup}
            harvestLookupStatus={harvestLookupStatus}
            loading={historyLoading}
            error={historyError}
            locationLookup={locationLookup}
            onClose={closeInspectorDetails}
          onRetry={() => loadInspectorHistory(selectedInspector)}
          onViewInspection={openInspectionDetail}
        />
      ) : null}

      {inspectionDetail || detailLoading || detailError ? (
          <InspectionDetailModal
            inspection={inspectionDetail}
            harvestLookup={harvestLookup}
            harvestLookupStatus={harvestLookupStatus}
            loading={detailLoading}
            error={detailError}
            onClose={closeInspectionDetail}
        />
      ) : null}
    </div>
  );
}

function CreateInspectorForm({
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
        <FormField label="Checker Name">
          <TraderInput
            name="checker_name"
            value={form.checker_name}
            onChange={onChange}
            required
            placeholder="Enter checker name"
          />
        </FormField>

        <FormField label="Checker Email">
          <TraderInput
            type="email"
            name="checker_email"
            value={form.checker_email}
            onChange={onChange}
            required
            placeholder="Enter checker email"
          />
        </FormField>

        <FormField label="Checker Phone">
          <TraderInput
            name="checker_phone"
            value={form.checker_phone}
            onChange={onChange}
            required
            maxLength={10}
            placeholder="10 digit mobile number"
          />
        </FormField>

        <FormField label="Checker Code">
          <TraderInput
            name="checker_code"
            value={form.checker_code}
            onChange={onChange}
            required
            placeholder="QC-001"
          />
        </FormField>

        <SelectField
          label="Country"
          name="country_id"
          value={form.country_id}
          onChange={onChange}
          options={countries}
          disabled={masterLoading}
          required
        />

        <SelectField
          label="State"
          name="state_id"
          value={form.state_id}
          onChange={onChange}
          options={states}
          disabled={!form.country_id || masterLoading}
          required
        />

        <SelectField
          label="District"
          name="district_id"
          value={form.district_id}
          onChange={onChange}
          options={districts}
          disabled={!form.state_id || masterLoading}
          required
        />

        <SelectField
          label="Location"
          name="location_id"
          value={form.location_id}
          onChange={onChange}
          options={locations}
          disabled={!form.district_id || masterLoading}
          required
        />

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={onChange}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label className="text-sm font-medium text-gray-700">Active</label>
        </div>
      </form>
  );
}

function InspectorList({
  inspectors,
  loading,
  searchText,
  statusFilter,
  locationLookup,
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
              Quality Inspector List
            </h2>
            <p className="text-sm text-gray-500">
              Manage your quality inspection team and review harvest inspection activity.
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
              title="Create Quality Inspector"
              aria-label="Create Quality Inspector"
            >
              <Plus size={16} aria-hidden="true" />
              Create Quality Inspector
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
              placeholder="Search code, name, mobile, email or location"
              className="pl-10"
            />
          </label>

          <TraderSelect
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </TraderSelect>
        </div>
      </div>

      <div className="hidden md:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[17%]" />
            <col className="w-[14%]" />
            <col className="w-[24%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cells={7} /> : null}
            {!loading && inspectors.length === 0 ? (
              <EmptyTableRow colSpan={7} message="No quality inspectors available." />
            ) : null}
            {!loading
              ? inspectors.map((item) => (
                  <InspectorTableRow
                    key={getCheckerId(item)}
                    inspector={item}
                    locationLookup={locationLookup}
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
        ) : inspectors.length === 0 ? (
          <EmptyCard message="No quality inspectors available." />
        ) : (
          inspectors.map((item) => (
            <InspectorMobileCard
              key={getCheckerId(item)}
              inspector={item}
              locationLookup={locationLookup}
              onView={onView}
            />
          ))
        )}
      </div>
    </section>
  );
}

function InspectorTableRow({ inspector, locationLookup, onView }) {
  const locationLabel = getLocationName(inspector, locationLookup);

  return (
    <tr className="border-t border-gray-100">
      <TableCell className="font-bold text-slate-900">
        {valueOrNotAvailable(inspector?.checker_code)}
      </TableCell>
      <TableCell className="truncate">{valueOrNotAvailable(inspector?.checker_name)}</TableCell>
      <TableCell className="truncate">{valueOrNotAvailable(inspector?.checker_phone)}</TableCell>
      <TableCell className="truncate">{valueOrNotAvailable(inspector?.checker_email)}</TableCell>
      <TableCell className="truncate" title={locationLabel}>
        {valueOrNotAvailable(locationLabel)}
      </TableCell>
      <TableCell>
        <TraderStatusBadge status={getCheckerStatus(inspector)} />
      </TableCell>
      <TableCell className="text-right">
        <IconButton
          title="View Inspector"
          onClick={() => onView(inspector)}
          disabled={!getCheckerId(inspector)}
        />
      </TableCell>
    </tr>
  );
}

function InspectorMobileCard({ inspector, locationLookup, onView }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {valueOrNotAvailable(inspector?.checker_name)}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {valueOrNotAvailable(inspector?.checker_code)}
          </p>
        </div>
        <TraderStatusBadge status={getCheckerStatus(inspector)} />
      </div>
      <div className="mt-4 grid gap-3">
        <SummaryDetail label="Mobile" value={inspector?.checker_phone} />
        <SummaryDetail label="Email" value={inspector?.checker_email} />
        <SummaryDetail label="Location" value={getLocationName(inspector, locationLookup)} />
      </div>
      <div className="mt-4">
        <TraderButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onView(inspector)}
          disabled={!getCheckerId(inspector)}
        >
          <Eye size={16} aria-hidden="true" />
          View
        </TraderButton>
      </div>
    </div>
  );
}

function InspectorDetailsModal({
  inspector,
  inspections,
  harvestLookup,
  harvestLookupStatus,
  loading,
  error,
  locationLookup,
  onClose,
  onRetry,
  onViewInspection,
}) {
  const location = getLocationDetails(inspector, locationLookup);

  return (
    <ModalShell title="Quality Inspector Details" onClose={onClose}>
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          <SummaryDetail label="Checker Code" value={inspector?.checker_code} />
          <SummaryDetail label="Checker Name" value={inspector?.checker_name} />
          <SummaryDetail label="Mobile" value={inspector?.checker_phone} />
          <SummaryDetail label="Email" value={inspector?.checker_email} />
          <SummaryDetail label="Location" value={location?.name} />
          <SummaryDetail label="District" value={location?.districtName} />
          <SummaryDetail label="State" value={location?.stateName} />
          <SummaryDetail label="Country" value={location?.countryName} />
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <div className="mt-2">
              <TraderStatusBadge status={getCheckerStatus(inspector)} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                Harvest Inspection History
              </h3>
              {!loading && !error ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Inspections shown: {inspections.length}
                </p>
              ) : null}
            </div>
            {error ? (
              <TraderButton type="button" variant="secondary" onClick={onRetry}>
                <RefreshCw size={16} aria-hidden="true" />
                Retry
              </TraderButton>
            ) : null}
          </div>

          {error ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <InspectionHistoryTable
            inspections={inspections}
            harvestLookup={harvestLookup}
            harvestLookupStatus={harvestLookupStatus}
            loading={loading}
            onView={onViewInspection}
          />
        </section>
      </div>
    </ModalShell>
  );
}

function InspectionHistoryTable({
  inspections,
  harvestLookup,
  harvestLookupStatus,
  loading,
  onView,
}) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[22%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Harvest Reference</TableHead>
              <TableHead>Farm / Pond</TableHead>
              <TableHead>Inspection Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cells={6} /> : null}
            {!loading && inspections.length === 0 ? (
              <EmptyTableRow
                colSpan={6}
                message="No inspection activity available for this Quality Inspector."
              />
            ) : null}
            {!loading
              ? inspections.map((inspection) => (
                  <InspectionHistoryRow
                    key={getInspectionId(inspection)}
                    inspection={inspection}
                    harvestLookup={harvestLookup}
                    harvestLookupStatus={harvestLookupStatus}
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
        ) : inspections.length === 0 ? (
          <EmptyCard message="No inspection activity available for this Quality Inspector." />
        ) : (
          inspections.map((inspection) => (
            <InspectionMobileCard
              key={getInspectionId(inspection)}
              inspection={inspection}
              harvestLookup={harvestLookup}
              harvestLookupStatus={harvestLookupStatus}
              onView={onView}
            />
          ))
        )}
      </div>
    </>
  );
}

function InspectionHistoryRow({
  inspection,
  harvestLookup,
  harvestLookupStatus,
  onView,
}) {
  return (
    <tr className="border-t border-gray-100">
      <TableCell className="font-bold text-slate-900">
        {getHarvestReference(inspection, harvestLookup, {
          loading: harvestLookupStatus === "loading",
          error: harvestLookupStatus === "error",
        })}
      </TableCell>
      <TableCell>{getFarmPondLabel(inspection)}</TableCell>
      <TableCell>{formatDateTime(inspection?.inspected_at)}</TableCell>
      <TableCell>
        <TraderStatusBadge status={getInspectionStatus(inspection)} />
      </TableCell>
      <TableCell>{valueOrNotAvailable(inspection?.grade)}</TableCell>
      <TableCell className="text-right">
        <IconButton
          title="View Inspection"
          onClick={() => onView(inspection)}
          disabled={!getInspectionId(inspection)}
        />
      </TableCell>
    </tr>
  );
}

function InspectionMobileCard({
  inspection,
  harvestLookup,
  harvestLookupStatus,
  onView,
  showInspector = false,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {getHarvestReference(inspection, harvestLookup, {
              loading: harvestLookupStatus === "loading",
              error: harvestLookupStatus === "error",
            })}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {getFarmPondLabel(inspection)}
          </p>
        </div>
        <TraderStatusBadge status={getInspectionStatus(inspection)} />
      </div>
      <div className="mt-4 grid gap-3">
        {showInspector ? (
          <SummaryDetail label="Inspector" value={getInspectorLabel(inspection)} />
        ) : null}
        <SummaryDetail label="Grade" value={inspection?.grade} />
        <SummaryDetail label="Inspected At" value={formatDateTime(inspection?.inspected_at)} />
      </div>
      <div className="mt-4">
        <TraderButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onView(inspection)}
          disabled={!getInspectionId(inspection)}
        >
          <Eye size={16} aria-hidden="true" />
          View
        </TraderButton>
      </div>
    </div>
  );
}

function InspectionLogsTab({
  inspections,
  harvestLookup,
  harvestLookupStatus,
  loading,
  error,
  onRefresh,
  onView,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Inspection Logs
          </h2>
          <p className="text-sm text-gray-500">
            Review harvest inspection records captured by your team.
          </p>
        </div>
        <TraderButton type="button" variant="secondary" onClick={onRefresh}>
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </TraderButton>
      </div>

      {error ? (
        <div className="m-5">
          <InlineError message={error} onRetry={onRefresh} />
        </div>
      ) : null}

      <div className="hidden md:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Harvest Reference</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>Farm / Pond</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Inspection Status</TableHead>
              <TableHead>Inspected At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cells={7} /> : null}
            {!loading && inspections.length === 0 ? (
              <EmptyTableRow colSpan={7} message="No inspection logs available." />
            ) : null}
            {!loading
              ? inspections.map((inspection) => (
                  <tr key={getInspectionId(inspection)} className="border-t border-gray-100">
                    <TableCell className="font-bold text-slate-900">
                      {getHarvestReference(inspection, harvestLookup, {
                        loading: harvestLookupStatus === "loading",
                        error: harvestLookupStatus === "error",
                      })}
                    </TableCell>
                    <TableCell>{getInspectorLabel(inspection)}</TableCell>
                    <TableCell>{getFarmPondLabel(inspection)}</TableCell>
                    <TableCell>{valueOrNotAvailable(inspection?.grade)}</TableCell>
                    <TableCell>
                      <TraderStatusBadge status={getInspectionStatus(inspection)} />
                    </TableCell>
                    <TableCell>{formatDateTime(inspection?.inspected_at)}</TableCell>
                    <TableCell className="text-right">
                      <IconButton
                        title="View Inspection"
                        onClick={() => onView(inspection)}
                        disabled={!getInspectionId(inspection)}
                      />
                    </TableCell>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {loading ? (
          <MobileSkeletonCards />
        ) : inspections.length === 0 ? (
          <EmptyCard message="No inspection logs available." />
        ) : (
          inspections.map((inspection) => (
            <InspectionMobileCard
              key={getInspectionId(inspection)}
              inspection={inspection}
              harvestLookup={harvestLookup}
              harvestLookupStatus={harvestLookupStatus}
              onView={onView}
              showInspector
            />
          ))
        )}
      </div>
    </section>
  );
}

function InspectionDetailModal({
  inspection,
  harvestLookup,
  harvestLookupStatus,
  loading,
  error,
  onClose,
}) {
  const images = Array.isArray(inspection?.shrimp_images)
    ? inspection.shrimp_images.filter(isUsableImageUrl)
    : [];
  const harvestReference = getHarvestReference(inspection, harvestLookup, {
    loading: harvestLookupStatus === "loading",
    error: harvestLookupStatus === "error",
  });
  const farmName = getFirstValue(inspection, [
    "farm_name",
    "farmName",
    "farm.name",
  ]);
  const pondName = getFirstValue(inspection, [
    "pond_name",
    "pondName",
    "pond.name",
  ]);
  const checkerName = getFirstValue(inspection, [
    "quality_checker_name",
    "checker_name",
    "quality_checker.checker_name",
    "quality_checker.name",
  ]);
  const checkerCode = getFirstValue(inspection, [
    "quality_checker_code",
    "checker_code",
    "quality_checker.checker_code",
    "quality_checker.code",
  ]);
  const traderName = getFirstValue(inspection, [
    "trader_name",
    "trader.trader_name",
    "trader.name",
  ]);
  const traderCode = getFirstValue(inspection, [
    "trader_code",
    "trader.trader_code",
    "trader.code",
  ]);

  return (
    <ModalShell title="Harvest Inspection Details" onClose={onClose}>
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error && inspection ? (
        <div className="space-y-4">
          <DetailSection title="Harvest / Location">
            <SummaryDetail label="Pond QR" value={inspection?.pond_qr_scan} />
            {hasReadableValue(harvestReference) ? (
              <SummaryDetail label="Harvest Reference" value={harvestReference} />
            ) : null}
            {hasReadableValue(farmName) ? (
              <SummaryDetail label="Farm" value={farmName} />
            ) : null}
            {hasReadableValue(pondName) ? (
              <SummaryDetail label="Pond" value={pondName} />
            ) : null}
          </DetailSection>

          <DetailSection title="Inspector">
            <SummaryDetail label="Quality Checker" value={checkerName} />
            <SummaryDetail label="Quality Checker Code" value={checkerCode} />
            {hasReadableValue(traderName) ? (
              <SummaryDetail label="Trader" value={traderName} />
            ) : null}
            {hasReadableValue(traderCode) ? (
              <SummaryDetail label="Trader Code" value={traderCode} />
            ) : null}
          </DetailSection>

          <DetailSection title="Sampling">
            <SummaryDetail label="Sample Count" value={inspection?.sample_count} />
            <SummaryDetail label="Sample Weight" value={inspection?.sample_weight} />
            <SummaryDetail label="ABW" value={inspection?.abw_g} />
            <SummaryDetail label="Size Count / KG" value={inspection?.size_count_kg} />
            <SummaryDetail
              label="Expected Biomass"
              value={inspection?.expected_biomass}
            />
          </DetailSection>

          <DetailSection title="Quality">
            <SummaryDetail label="Grade" value={inspection?.grade} />
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Inspection Status
              </p>
              <div className="mt-2">
                <TraderStatusBadge status={getInspectionStatus(inspection)} />
              </div>
            </div>
            <SummaryDetail
              label="Disease Observation"
              value={inspection?.disease_observation}
            />
            <SummaryDetail label="Disease Notes" value={inspection?.disease_notes} />
            <SummaryDetail label="Remarks" value={inspection?.remarks} wide />
          </DetailSection>

          <DetailSection title="Location / GPS">
            <SummaryDetail label="Farm Address" value={inspection?.farm_address} wide />
            <SummaryDetail
              label="Farm Gate Latitude"
              value={inspection?.farm_gate_latitude}
            />
            <SummaryDetail
              label="Farm Gate Longitude"
              value={inspection?.farm_gate_longitude}
            />
            {isUsableLink(inspection?.pond_gps) ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Pond GPS
                </p>
                <a
                  href={inspection.pond_gps}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View Pond Location"
                  aria-label="View Pond Location"
                  className="mt-1 inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-800"
                >
                  View Pond Location
                </a>
              </div>
            ) : hasReadableValue(inspection?.pond_gps) ? (
              <SummaryDetail label="Pond GPS" value={inspection?.pond_gps} />
            ) : null}
            <SummaryDetail
              label="Inspection Latitude"
              value={inspection?.inspection_latitude}
            />
            <SummaryDetail
              label="Inspection Longitude"
              value={inspection?.inspection_longitude}
            />
          </DetailSection>

          <DetailSection title="Media">
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Shrimp Images
              </p>
              {images.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((src) => (
                    <a
                      key={src}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <img
                        src={src}
                        alt="Shrimp inspection"
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-bold text-slate-900">
                  Not available
                </div>
              )}
            </div>
          </DetailSection>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
              Timing
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <SummaryDetail
              label="Inspected At"
              value={formatDateTime(inspection?.inspected_at)}
            />
            <SummaryDetail
              label="Created At"
              value={formatDateTime(inspection?.created_at)}
            />
            <SummaryDetail
              label="Updated At"
              value={formatDateTime(inspection?.updated_at)}
            />
            </div>
          </section>
        </div>
      ) : null}
    </ModalShell>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  disabled,
  required,
}) {
  return (
    <FormField label={label}>
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
    </FormField>
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

function SummaryDetail({ label, value, wide = false, pre = false }) {
  const text = valueOrNotAvailable(value);

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
      {pre ? (
        <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap break-words text-sm font-bold text-slate-900">
          {text}
        </pre>
      ) : (
        <p className="mt-1 break-words text-sm font-bold text-slate-900">
          {text}
        </p>
      )}
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function InlineError({ message, onRetry }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
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
              Quality Inspection
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
