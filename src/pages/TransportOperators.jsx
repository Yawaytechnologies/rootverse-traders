import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye, Plus, RefreshCw, Search, X } from "lucide-react";

import {
  createTransportOperator,
  getTransportOperators,
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
  REFERENCE_UNAVAILABLE,
} from "../utils/harvestReference";

const initialForm = {
  operator_rv_id: "",
  full_name: "",
  email: "",
  mobile: "",
  password: "",
  transport_id: "",
  vehicle_no: "",
  route_name: "",
  vehicle_type: "",
  is_active: true,
};

const tabs = [
  { key: "operators", label: "Transport Operators" },
  { key: "logs", label: "Transport Logs" },
];

function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function unwrapPayload(response) {
  return response?.data?.data || response?.data || response || {};
}

function getInternalOperatorId(item) {
  return item?.id || "";
}

function getOperatorRvId(item) {
  return item?.operator_rv_id || "";
}

function getOperatorName(item) {
  return item?.full_name || "";
}

function getOperatorMobile(item) {
  return item?.mobile || "";
}

function getOperatorEmail(item) {
  return item?.email || "";
}

function getVehicleNumber(item) {
  return item?.vehicle_no || "";
}

function getVehicleType(item) {
  return item?.vehicle_type || "";
}

function getRouteName(item) {
  return item?.route_name || "";
}

function getOperatorStatus(item) {
  if (item?.is_active === false) {
    return "Inactive";
  }

  if (item?.is_active === true) {
    return "Active";
  }

  return "Not available";
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

function hasReadableValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  if (typeof value === "object") return false;
  return true;
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
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatWeight(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Not available";
  }

  return `${number.toFixed(2)} kg`;
}

function formatDispatchStatus(value) {
  return formatStatusLabel(value);
}

function normalizeProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, number));
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
    .map((item) => item?.loaded_at || item?.created_at || item?.updated_at)
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
    const vehicle =
      item.records.find((record) => record?.vehicle_number)?.vehicle_number ||
      item.records.find((record) => record?.vehicle_no)?.vehicle_no ||
      "";
    const status =
      item.records.find((record) => record?.dispatch_status)?.dispatch_status ||
      item.records.find((record) => record?.chain_of_custody_status)
        ?.chain_of_custody_status ||
      item.records.find((record) => record?.packing_status)?.packing_status ||
      "";

    return {
      harvest_id: item.harvest_id,
      harvest_reference: getActivityHarvestReference(item.records),
      vehicle_number: vehicle,
      loaded_records: paginated ? null : item.records.length,
      status,
      date: getLatestDate(item.records),
      records: item.records,
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

export default function TransportOperators() {
  const dispatch = useDispatch();

  const traderState = useSelector(
    (state) => state.trader || state.traderReducer || {}
  );

  const { transportOperators = [], loading, error } = traderState;

  const [activeTab, setActiveTab] = useState("operators");
  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedOperator, setSelectedOperator] = useState(null);
  const [operatorHistory, setOperatorHistory] = useState([]);
  const [activityPaginated, setActivityPaginated] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyUnavailable, setHistoryUnavailable] = useState(false);

  const [harvestDetail, setHarvestDetail] = useState(null);
  const [harvestProgress, setHarvestProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [harvestLookup, setHarvestLookup] = useState(() => new Map());
  const [harvestLookupStatus, setHarvestLookupStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;

    dispatch(getTransportOperators()).catch(() => {});

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

  const filteredOperators = useMemo(() => {
    const list = Array.isArray(transportOperators) ? transportOperators : [];
    const query = searchText.trim().toLowerCase();

    return list.filter((item) => {
      const status = getOperatorStatus(item);
      const statusMatches = statusFilter === "ALL" || status === statusFilter;
      const searchable = [
        getOperatorRvId(item),
        getOperatorName(item),
        getOperatorMobile(item),
        getOperatorEmail(item),
        getVehicleNumber(item),
        getVehicleType(item),
        getRouteName(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return statusMatches && (!query || searchable.includes(query));
    });
  }, [transportOperators, searchText, statusFilter]);

  async function refreshOperators() {
    setSuccess("");
    await dispatch(getTransportOperators()).catch(() => {});
  }

  function resetCreateForm() {
    setForm(initialForm);
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

  async function loadOperatorHistory(operator) {
    const operatorId = getInternalOperatorId(operator);

    if (!operatorId) {
      setHistoryUnavailable(true);
      setHistoryError("");
      setOperatorHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError("");
      setHistoryUnavailable(false);

      const response = await traderService.getTransportOperatorActivity(
        operatorId,
        {
          page: 1,
          page_size: 20,
        }
      );
      const { records, paginated } = extractActivityRecords(response);

      if (!records.length) {
        setHistoryUnavailable(true);
      }

      setActivityPaginated(paginated);
      setOperatorHistory(groupActivityByHarvest(records, paginated));
    } catch (err) {
      console.error(err);
      setHistoryError(err?.message || "Unable to load transport history.");
      setOperatorHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openOperatorDetails(operator) {
    setSelectedOperator(operator);
    setOperatorHistory([]);
    setActivityPaginated(false);
    setHistoryError("");
    setHistoryUnavailable(false);
    await loadOperatorHistory(operator);
  }

  function closeOperatorDetails() {
    setSelectedOperator(null);
    setOperatorHistory([]);
    setActivityPaginated(false);
    setHistoryError("");
    setHistoryUnavailable(false);
    setHistoryLoading(false);
  }

  async function openHarvestTransportDetails(historyRow) {
    const harvestId = historyRow?.harvest_id;

    if (!harvestId) {
      setHarvestDetail(historyRow || {});
      setProgressError("Harvest reference is not available.");
      return;
    }

    try {
      setHarvestDetail(historyRow || { harvest_id: harvestId });
      setHarvestProgress(null);
      setProgressLoading(true);
      setProgressError("");

      const response = await traderService.getTransportHarvestProgress(
        harvestId
      );

      setHarvestProgress(unwrapPayload(response));
    } catch (err) {
      console.error(err);
      setProgressError(
        err?.message || "Unable to load transport details for this harvest."
      );
    } finally {
      setProgressLoading(false);
    }
  }

  function closeHarvestTransportDetails() {
    setHarvestDetail(null);
    setHarvestProgress(null);
    setProgressLoading(false);
    setProgressError("");
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    if (name === "mobile") {
      setForm((prev) => ({
        ...prev,
        mobile: cleanMobile(value),
      }));
      setSuccess("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setCreateLoading(true);
      setCreateError("");

      const payload = {
        operator_rv_id: form.operator_rv_id.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        mobile: cleanMobile(form.mobile),
        password: form.password.trim(),
        transport_id: form.transport_id.trim(),
        vehicle_no: form.vehicle_no.trim(),
        route_name: form.route_name.trim(),
        vehicle_type: form.vehicle_type.trim(),
        is_active: Boolean(form.is_active),
      };

      await dispatch(createTransportOperator(payload));
      await dispatch(getTransportOperators());

      resetCreateForm();
      setCreateModalOpen(false);
      setSuccess("Transport operator created successfully");
    } catch (err) {
      console.error(err);
      setCreateError(err?.message || "Unable to create Transport Operator.");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Transport Tracking
        </h1>
        <p className="text-sm text-gray-500">
          Manage trader-owned operators and review harvest transport loading.
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

      {activeTab === "operators" ? (
        <>
          {error ? (
            <InlineError
              message="Unable to load transport operators."
              detail={error}
              onRetry={refreshOperators}
            />
          ) : null}

          {success ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          <TransportOperatorList
            operators={filteredOperators}
            loading={loading}
            searchText={searchText}
            statusFilter={statusFilter}
            onSearchChange={setSearchText}
            onStatusFilterChange={setStatusFilter}
            onRefresh={refreshOperators}
            onCreate={openCreateModal}
            onView={openOperatorDetails}
          />
        </>
      ) : (
        <TransportLogsUnsupported />
      )}

      {selectedOperator ? (
          <OperatorDetailsModal
            operator={selectedOperator}
            history={operatorHistory}
            harvestLookup={harvestLookup}
            harvestLookupStatus={harvestLookupStatus}
            loading={historyLoading}
          error={historyError}
          unavailable={historyUnavailable}
          paginated={activityPaginated}
          onClose={closeOperatorDetails}
          onRetry={() => loadOperatorHistory(selectedOperator)}
          onViewHarvest={openHarvestTransportDetails}
        />
      ) : null}

      {harvestDetail || progressLoading || progressError ? (
          <HarvestTransportDetailModal
            harvest={harvestDetail}
            harvestLookup={harvestLookup}
            harvestLookupStatus={harvestLookupStatus}
            progress={harvestProgress}
          loading={progressLoading}
          error={progressError}
          onClose={closeHarvestTransportDetails}
          onRetry={() => openHarvestTransportDetails(harvestDetail)}
        />
      ) : null}

      {createModalOpen ? (
        <CreateModalShell
          title="Create Transport Operator"
          subtitle="Add a staff member under your Trader account."
          onClose={closeCreateModal}
          formId="create-transport-operator-form"
          loading={createLoading}
          submitLabel="Create Transport Operator"
        >
          {createError ? (
            <div className="mb-4">
              <InlineError message={createError} />
            </div>
          ) : null}
          <CreateTransportOperatorForm
            formId="create-transport-operator-form"
            form={form}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
        </CreateModalShell>
      ) : null}
    </div>
  );
}

function CreateTransportOperatorForm({ formId, form, onChange, onSubmit }) {
  return (
      <form
        id={formId}
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <Input
          label="Operator RV ID"
          name="operator_rv_id"
          value={form.operator_rv_id}
          onChange={onChange}
          placeholder="OP-RV-001"
          required
        />

        <Input
          label="Full Name"
          name="full_name"
          value={form.full_name}
          onChange={onChange}
          placeholder="Enter full name"
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="Enter email"
          required
        />

        <Input
          label="Mobile"
          name="mobile"
          value={form.mobile}
          onChange={onChange}
          placeholder="10 digit mobile number"
          maxLength={10}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          placeholder="Enter password"
          required
        />

        <Input
          label="Transport ID"
          name="transport_id"
          value={form.transport_id}
          onChange={onChange}
          placeholder="TRN-001"
          required
        />

        <Input
          label="Vehicle Number"
          name="vehicle_no"
          value={form.vehicle_no}
          onChange={onChange}
          placeholder="TN 09 AB 1234"
          required
        />

        <Input
          label="Route Name"
          name="route_name"
          value={form.route_name}
          onChange={onChange}
          placeholder="Chennai to Madurai"
          required
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Vehicle Type
          </label>
          <TraderSelect
            name="vehicle_type"
            value={form.vehicle_type}
            onChange={onChange}
            required
          >
            <option value="">Select vehicle type</option>
            <option value="Mini Truck">Mini Truck</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Container">Container</option>
            <option value="Refrigerated Truck">Refrigerated Truck</option>
          </TraderSelect>
        </div>

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

function TransportOperatorList({
  operators,
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="space-y-4 border-b border-gray-200 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transport Operator List
            </h2>
            <p className="text-sm text-gray-500">
              Manage your transport operators and review harvest transport activity.
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
              title="Create Transport Operator"
              aria-label="Create Transport Operator"
            >
              <Plus size={16} aria-hidden="true" />
              Create Transport Operator
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
              placeholder="Search code, name, mobile, email, vehicle or route"
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
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Operator Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cells={7} /> : null}
            {!loading && operators.length === 0 ? (
              <EmptyTableRow colSpan={7} message="No transport operators available." />
            ) : null}
            {!loading
              ? operators.map((operator) => (
                  <OperatorTableRow
                    key={
                      getInternalOperatorId(operator) ||
                      getOperatorRvId(operator) ||
                      operator?.transport_id
                    }
                    operator={operator}
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
        ) : operators.length === 0 ? (
          <EmptyCard message="No transport operators available." />
        ) : (
          operators.map((operator) => (
            <OperatorMobileCard
              key={
                getInternalOperatorId(operator) ||
                getOperatorRvId(operator) ||
                operator?.transport_id
              }
              operator={operator}
              onView={onView}
            />
          ))
        )}
      </div>
    </section>
  );
}

function OperatorTableRow({ operator, onView }) {
  return (
    <tr className="border-t border-gray-100">
      <TableCell className="font-bold text-slate-900">
        {valueOrNotAvailable(getOperatorRvId(operator))}
      </TableCell>
      <TableCell>{valueOrNotAvailable(getOperatorName(operator))}</TableCell>
      <TableCell>{valueOrNotAvailable(getOperatorMobile(operator))}</TableCell>
      <TableCell>{valueOrNotAvailable(getVehicleNumber(operator))}</TableCell>
      <TableCell>{valueOrNotAvailable(getVehicleType(operator))}</TableCell>
      <TableCell>
        <TraderStatusBadge status={getOperatorStatus(operator)} />
      </TableCell>
      <TableCell className="text-right">
        <IconButton
          title="View Transport Operator"
          onClick={() => onView(operator)}
        />
      </TableCell>
    </tr>
  );
}

function OperatorMobileCard({ operator, onView }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {valueOrNotAvailable(getOperatorName(operator))}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {valueOrNotAvailable(getOperatorRvId(operator))}
          </p>
        </div>
        <TraderStatusBadge status={getOperatorStatus(operator)} />
      </div>
      <div className="mt-4 grid gap-3">
        <SummaryDetail label="Mobile" value={getOperatorMobile(operator)} />
        <SummaryDetail label="Vehicle" value={getVehicleNumber(operator)} />
      </div>
      <div className="mt-4">
        <TraderButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onView(operator)}
        >
          <Eye size={16} aria-hidden="true" />
          View
        </TraderButton>
      </div>
    </div>
  );
}

function OperatorDetailsModal({
  operator,
  history,
  harvestLookup,
  harvestLookupStatus,
  loading,
  error,
  unavailable,
  paginated,
  onClose,
  onRetry,
  onViewHarvest,
}) {
  const operatorId = getInternalOperatorId(operator);

  return (
    <ModalShell title="Transport Operator Details" onClose={onClose}>
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          <SummaryDetail label="Operator Code" value={getOperatorRvId(operator)} />
          <SummaryDetail label="Name" value={getOperatorName(operator)} />
          <SummaryDetail label="Mobile" value={getOperatorMobile(operator)} />
          <SummaryDetail label="Email" value={getOperatorEmail(operator)} />
          <SummaryDetail label="Vehicle Number" value={getVehicleNumber(operator)} />
          <SummaryDetail
            label="Vehicle Type"
            value={getVehicleType(operator)}
          />
          <SummaryDetail label="Route" value={getRouteName(operator)} />
          <SummaryDetail
            label="Transport ID"
            value={operator?.transport_id}
          />
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <div className="mt-2">
              <TraderStatusBadge status={getOperatorStatus(operator)} />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                Harvest Transport History
              </h3>
              {!loading && !error && !unavailable ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Harvests shown: {history.length}
                  {paginated
                    ? " (showing the current page of transport history)"
                    : " (based on the loaded transport records)"}
                </p>
              ) : null}
            </div>
            {operatorId ? (
              <TraderButton type="button" variant="secondary" onClick={onRetry}>
                <RefreshCw size={16} aria-hidden="true" />
                Retry
              </TraderButton>
            ) : null}
          </div>

          {error ? (
            <div className="m-4">
              <InlineError
                message="Unable to load transport history."
                detail={error}
                onRetry={onRetry}
              />
            </div>
          ) : null}

          {!error && unavailable ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-500">
              {operatorId
                ? "Transport history is not available for this operator yet."
                : "Transport history is unavailable because this operator is missing the required profile reference."}
            </div>
          ) : null}

          {!error && !unavailable ? (
            <TransportHistoryTable
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

function TransportHistoryTable({
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
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Harvest Reference</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Loaded Crates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cells={6} /> : null}
            {!loading && history.length === 0 ? (
              <EmptyTableRow
                colSpan={6}
                message="No transport activity available for this operator."
              />
            ) : null}
            {!loading
              ? history.map((row) => (
                  <TransportHistoryRow
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
          <EmptyCard message="No transport activity available for this operator." />
        ) : (
          history.map((row) => (
            <TransportHistoryMobileCard
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

function TransportHistoryRow({
  row,
  harvestLookup,
  harvestLookupStatus,
  paginated,
  onView,
}) {
  return (
    <tr className="border-t border-gray-100">
      <TableCell className="font-bold text-slate-900">
        {getHarvestReference(row, harvestLookup, {
          loading: harvestLookupStatus === "loading",
          error: harvestLookupStatus === "error",
        })}
      </TableCell>
      <TableCell>{valueOrNotAvailable(row.vehicle_number)}</TableCell>
      <TableCell>
        {paginated ? "Not available" : valueOrNotAvailable(row.loaded_records)}
      </TableCell>
      <TableCell>
        <TraderStatusBadge status={formatDispatchStatus(row.status)} />
      </TableCell>
      <TableCell>{formatDateTime(row.date)}</TableCell>
      <TableCell className="text-right">
        <IconButton
          title="View Harvest Transport"
          onClick={() => onView(row)}
          disabled={!row.harvest_id}
        />
      </TableCell>
    </tr>
  );
}

function TransportHistoryMobileCard({
  row,
  harvestLookup,
  harvestLookupStatus,
  paginated,
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
            {valueOrNotAvailable(row.vehicle_number)}
          </p>
        </div>
        <TraderStatusBadge status={formatDispatchStatus(row.status)} />
      </div>
      <div className="mt-4 grid gap-3">
        <SummaryDetail
          label="Loaded Crates"
          value={paginated ? "Not available" : row.loaded_records}
        />
        <SummaryDetail label="Date" value={formatDateTime(row.date)} />
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

function HarvestTransportDetailModal({
  harvest,
  harvestLookup,
  harvestLookupStatus,
  progress,
  loading,
  error,
  onClose,
  onRetry,
}) {
  const crates = Array.isArray(progress?.crates) ? progress.crates : [];
  const progressValue = normalizeProgress(progress?.loading_progress);
  const harvestReference = getHarvestReference(
    { ...(harvest || {}), ...(progress || {}) },
    harvestLookup,
    {
      loading: harvestLookupStatus === "loading",
      error: harvestLookupStatus === "error",
    }
  );
  const latestLoadedAt = getLatestDate(crates);

  return (
    <ModalShell title="Harvest Transport Details" onClose={onClose}>
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
          message="Unable to load transport details for this harvest."
          detail={error}
          onRetry={onRetry}
        />
      ) : null}

      {!loading && !error ? (
        progress ? (
          <div className="space-y-5">
            <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              {hasReadableValue(harvestReference) ? (
                <SummaryDetail label="Harvest Reference" value={harvestReference} />
              ) : null}
              <SummaryDetail
                label="Transport Operator"
                value={progress?.transport_operator?.full_name}
              />
              <SummaryDetail
                label="Operator Code"
                value={progress?.transport_operator?.operator_rv_id}
              />
              <SummaryDetail label="Vehicle Number" value={progress?.vehicle_number} />
              <SummaryDetail
                label="Vehicle Type"
                value={
                  progress?.vehicle_type ||
                  progress?.transport_operator?.vehicle_type
                }
              />
              <SummaryDetail label="Total Packed Crates" value={progress?.total_packed_crates} />
              <SummaryDetail label="Loaded Crates" value={progress?.loaded_crates} />
              <SummaryDetail label="Remaining Crates" value={progress?.remaining_crates} />
              <SummaryDetail
                label="Dispatch Status"
                value={formatDispatchStatus(progress?.dispatch_status)}
              />
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Loading Progress
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {progressValue === null ? "Not available" : `${progressValue}%`}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${progressValue || 0}%` }}
                  />
                </div>
              </div>
            </section>

            {hasReadableValue(latestLoadedAt) ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Timing
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <SummaryDetail
                    label="Latest Loaded At"
                    value={formatDateTime(latestLoadedAt)}
                  />
                </div>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                  Crate Loading Details
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Loading progress and crate movement details are shown for this harvest.
                </p>
              </div>
              <CrateLoadingTable crates={crates} />
            </section>
          </div>
        ) : (
          <EmptyCard message="No transport loading data available for this harvest." />
        )
      ) : null}
    </ModalShell>
  );
}

function CrateLoadingTable({ crates }) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Crate Code</TableHead>
              <TableHead>Species</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Packing Status</TableHead>
              <TableHead>Loaded</TableHead>
              <TableHead>Loaded At</TableHead>
              <TableHead>Chain of Custody</TableHead>
            </tr>
          </thead>
          <tbody>
            {crates.length === 0 ? (
              <EmptyTableRow
                colSpan={8}
                message="No transport loading data available for this harvest."
              />
            ) : (
              crates.map((crate) => (
                <tr
                  key={crate?.crate_packing_id || crate?.crate_code}
                  className="border-t border-gray-100"
                >
                  <TableCell className="font-bold text-slate-900">
                    {valueOrNotAvailable(crate?.crate_code)}
                  </TableCell>
                  <TableCell>{valueOrNotAvailable(crate?.species)}</TableCell>
                  <TableCell>{valueOrNotAvailable(crate?.grade)}</TableCell>
                  <TableCell>{formatWeight(toNumericWeight(crate?.weight_kg))}</TableCell>
                  <TableCell>
                    <TraderStatusBadge status={valueOrNotAvailable(crate?.packing_status)} />
                  </TableCell>
                  <TableCell>{crate?.loaded ? "Yes" : "No"}</TableCell>
                  <TableCell>{formatDateTime(crate?.loaded_at)}</TableCell>
                  <TableCell>{valueOrNotAvailable(crate?.chain_of_custody_status)}</TableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {crates.length === 0 ? (
          <EmptyCard message="No transport loading data available for this harvest." />
        ) : (
          crates.map((crate) => (
            <div
              key={crate?.crate_packing_id || crate?.crate_code}
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
                <TraderStatusBadge status={valueOrNotAvailable(crate?.packing_status)} />
              </div>
              <div className="mt-4 grid gap-3">
                <SummaryDetail label="Grade" value={crate?.grade} />
                <SummaryDetail label="Weight" value={formatWeight(toNumericWeight(crate?.weight_kg))} />
                <SummaryDetail label="Loaded" value={crate?.loaded ? "Yes" : "No"} />
                <SummaryDetail label="Loaded At" value={formatDateTime(crate?.loaded_at)} />
                <SummaryDetail
                  label="Chain of Custody"
                  value={crate?.chain_of_custody_status}
                />
                <SummaryDetail
                  label="Operator"
                  value={
                    crate?.transport_operator_name ||
                    crate?.transport_operator_rv_id
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function TransportLogsUnsupported() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm shadow-slate-200/60">
      <h2 className="text-lg font-black text-slate-950">Transport Logs</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
        Transport logs are available from each Transport Operator&apos;s View
        history.
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
  placeholder,
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
        placeholder={placeholder}
      />
    </div>
  );
}

function TableHead({ children, className = "" }) {
  return (
    <th
      className={[
        "whitespace-nowrap px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function TableCell({ children, className = "" }) {
  return (
    <td className={["px-4 py-4 align-middle text-sm text-slate-700", className].join(" ")}>
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
    >
      <Eye size={17} aria-hidden="true" />
    </button>
  );
}

function SummaryDetail({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
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
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
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
              Transport Tracking
            </p>
            <h2 className="mt-1 break-words text-xl font-black text-slate-950 sm:text-2xl">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
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
