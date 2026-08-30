import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye, RefreshCw, Search, X } from "lucide-react";

import { getCrates } from "../redux/actions/trader.actions";
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

const PAGE_SIZE = 20;

function getPayload(response) {
  return response?.data?.data || response?.data || response || {};
}

function extractResponseArray(response) {
  const payload = getPayload(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.crates)) return payload.crates;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

function getPaginationMeta(response) {
  const payload = getPayload(response);
  const meta = payload?.pagination || payload?.meta?.pagination || payload?.meta || {};

  return {
    page: Number(payload?.page ?? meta?.page ?? 1) || 1,
    page_size: Number(payload?.page_size ?? payload?.pageSize ?? meta?.page_size ?? meta?.pageSize ?? PAGE_SIZE) || PAGE_SIZE,
    total: toFiniteNumber(payload?.total ?? payload?.total_count ?? payload?.count ?? meta?.total ?? meta?.total_count),
    total_pages: toFiniteNumber(payload?.total_pages ?? payload?.totalPages ?? meta?.total_pages ?? meta?.totalPages),
  };
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function valueOrNotAvailable(value) {
  if (value === undefined || value === null || value === "") return "Not available";
  if (typeof value === "number" && Number.isNaN(value)) return "Not available";
  if (typeof value === "object") return "Not available";
  return String(value);
}

function hasReadableValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  if (typeof value === "object") return false;
  return true;
}

function getPathValue(item, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], item);
}

function firstValue(item, paths) {
  for (const path of paths) {
    const value = getPathValue(item, path);
    if (hasReadableValue(value)) return value;
  }

  return "";
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
  if (Number.isNaN(date.getTime())) return valueOrNotAvailable(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatWeight(value) {
  if (typeof value === "string" && value.trim().toLowerCase().includes("kg")) {
    return value;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) return "Not available";
  return `${number.toFixed(2)} kg`;
}

function getCrateInternalId(crate) {
  return crate?.id || crate?._id || crate?.crate_id || crate?.crateId || "";
}

function getCrateCode(crate) {
  return firstValue(crate, [
    "crate_code",
    "crateCode",
    "crate_qr_code",
    "qr_code",
    "qrCode",
    "crate_qr_id",
  ]);
}

function findRelatedCrate(crate, records = []) {
  const crateCode = getCrateCode(crate);
  const crateId = getCrateInternalId(crate);

  return (
    records.find((record) => record?.crate_code && record.crate_code === crateCode) ||
    records.find((record) => record?.crate_qr_code && record.crate_qr_code === crateCode) ||
    records.find((record) => String(record?.crate_packing_id || "") === String(crateId)) ||
    null
  );
}

function getCrateQr(crate) {
  return firstValue(crate, [
    "crate_qr_code",
    "qr_code",
    "qrCode",
    "crate_qr_id",
    "pond_qr_code",
  ]);
}

function getHarvestLabel(crate, harvestLookup, harvestLookupStatus) {
  return getHarvestReference(crate, harvestLookup, {
    loading: harvestLookupStatus === "loading",
    error: harvestLookupStatus === "error",
  });
}

function getSourceLabel(crate) {
  const parts = [
    firstValue(crate, [
      "farmer_name",
      "farmer.name",
      "farmer.full_name",
      "harvest.farmer_name",
      "harvest.farmer.name",
    ]),
    firstValue(crate, [
      "farm_name",
      "farm.name",
      "harvest.farm_name",
      "harvest.farm.name",
    ]),
    firstValue(crate, [
      "pond_name",
      "pond.name",
      "pond_code",
      "pond_qr_code",
      "harvest.pond_name",
      "harvest.pond.name",
    ]),
  ].filter(Boolean);

  return parts.join(" / ");
}

function getSpecies(crate) {
  return firstValue(crate, [
    "species",
    "product",
    "product_name",
    "seafood_type",
    "crop_type",
    "harvest.species",
    "harvest.product",
  ]);
}

function getGrade(crate) {
  return firstValue(crate, [
    "quality_grade",
    "grade",
    "inspection_grade",
    "product_grade",
    "inspection.quality_grade",
    "inspection.grade",
  ]);
}

function getWeight(crate) {
  return firstValue(crate, ["weight_kg", "weight", "crate_weight", "net_weight"]);
}

function getQualityStatus(crate) {
  return firstValue(crate, [
    "quality_grade",
    "grade",
    "inspection_grade",
    "quality",
    "inspection.quality_grade",
    "inspection.grade",
    "inspection_status",
    "quality_status",
    "qualityStatus",
    "quality_inspection.inspection_status",
    "qualityInspection.inspection_status",
    "inspection.inspection_status",
  ]);
}

function getPackingStatus(crate) {
  return firstValue(crate, ["packing_status", "packingStatus", "status"]);
}

function getTransportStatus(crate, transportProgressLookup = new Map()) {
  const progress = transportProgressLookup.get(String(crate?.harvest_id)) || {};
  const transportCrate = findRelatedCrate(
    crate,
    Array.isArray(progress?.crates) ? progress.crates : []
  );

  return (
    transportCrate?.chain_of_custody_status ||
    progress?.dispatch_status ||
    ""
  );
}

function getPrimaryStatus(crate, transportProgressLookup = new Map()) {
  return (
    getTransportStatus(crate, transportProgressLookup) ||
    getPackingStatus(crate) ||
    getQualityStatus(crate)
  );
}

function getVehicle(crate) {
  return firstValue(crate, [
    "vehicle_number",
    "vehicle_no",
    "transport.vehicle_number",
    "transport.vehicle_no",
  ]);
}

function getOperator(crate) {
  return firstValue(crate, [
    "transport_operator_name",
    "transport_operator.name",
    "transport_operator.full_name",
    "transportOperator.full_name",
    "operator.name",
    "operator_name",
  ]);
}

function getOperatorCode(crate) {
  return firstValue(crate, [
    "transport_operator_rv_id",
    "transport_operator.operator_rv_id",
    "transportOperator.operator_rv_id",
    "operator_rv_id",
  ]);
}

function matchesSearch(crate, query, harvestLookup, harvestLookupStatus) {
  if (!query) return true;

  const haystack = [
    getCrateCode(crate),
    getCrateQr(crate),
    getHarvestLabel(crate, harvestLookup, harvestLookupStatus),
    getSourceLabel(crate),
    getSpecies(crate),
    getGrade(crate),
    getQualityStatus(crate),
    getPackingStatus(crate),
    getTransportStatus(crate),
    getVehicle(crate),
    getOperator(crate),
    getOperatorCode(crate),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export default function Crates() {
  const dispatch = useDispatch();
  const traderState = useSelector(
    (state) => state.trader || state.traderReducer || {}
  );
  const { crates = [], loading, error } = traderState;

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: PAGE_SIZE,
    total: null,
    total_pages: null,
  });
  const [selectedCrate, setSelectedCrate] = useState(null);
  const [harvestLookup, setHarvestLookup] = useState(() => new Map());
  const [harvestLookupStatus, setHarvestLookupStatus] = useState("loading");
  const [qualityInspectionLookup, setQualityInspectionLookup] = useState(
    () => new Map()
  );
  const [packedCrateLookup, setPackedCrateLookup] = useState(() => new Map());
  const [transportProgressLookup, setTransportProgressLookup] = useState(
    () => new Map()
  );

  async function loadCrates(nextPage = page, nextStatus = statusFilter) {
    const params = {
      page: nextPage,
      page_size: PAGE_SIZE,
    };

    if (nextStatus !== "ALL") {
      params.status = nextStatus;
    }

    const response = await dispatch(getCrates(params));
    setPagination(getPaginationMeta(response));
  }

  useEffect(() => {
    let ignore = false;
    const params = {
      page: 1,
      page_size: PAGE_SIZE,
    };

    if (statusFilter !== "ALL") {
      params.status = statusFilter;
    }

    dispatch(getCrates(params))
      .then((response) => {
        if (!ignore) {
          setPagination(getPaginationMeta(response));
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [dispatch, statusFilter]);

  useEffect(() => {
    let ignore = false;

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
  }, []);

  useEffect(() => {
    let ignore = false;
    const visibleCrates = Array.isArray(crates) ? crates : [];
    const inspectionIds = Array.from(
      new Set(
        visibleCrates
          .map((crate) => crate?.quality_inspection_id)
          .filter((id) => id !== undefined && id !== null && id !== "")
          .map(String)
      )
    ).filter((id) => !qualityInspectionLookup.has(id));
    const harvestIds = Array.from(
      new Set(
        visibleCrates
          .map((crate) => crate?.harvest_id)
          .filter((id) => id !== undefined && id !== null && id !== "")
          .map(String)
      )
    );
    const packedHarvestIds = harvestIds.filter((id) => !packedCrateLookup.has(id));
    const transportHarvestIds = harvestIds.filter(
      (id) => !transportProgressLookup.has(id)
    );

    if (!inspectionIds.length && !packedHarvestIds.length && !transportHarvestIds.length) {
      return undefined;
    }

    Promise.all([
      Promise.all(
        inspectionIds.map((id) =>
          traderService
            .getQualityInspectionById(id)
            .then((response) => [id, getPayload(response)])
            .catch((err) => {
              console.error(err);
              return [id, null];
            })
        )
      ),
      Promise.all(
        packedHarvestIds.map((id) =>
          traderService
            .getHarvestPackedCrates(id)
            .then((response) => [id, extractResponseArray(response)])
            .catch((err) => {
              console.error(err);
              return [id, []];
            })
        )
      ),
      Promise.all(
        transportHarvestIds.map((id) =>
          traderService
            .getTransportHarvestProgress(id)
            .then((response) => [id, getPayload(response)])
            .catch((err) => {
              console.error(err);
              return [id, null];
            })
        )
      ),
    ]).then(([inspectionEntries, packedEntries, transportEntries]) => {
      if (ignore) return;

      if (inspectionEntries.length) {
        setQualityInspectionLookup((prev) => new Map([...prev, ...inspectionEntries]));
      }

      if (packedEntries.length) {
        setPackedCrateLookup((prev) => new Map([...prev, ...packedEntries]));
      }

      if (transportEntries.length) {
        setTransportProgressLookup((prev) => new Map([...prev, ...transportEntries]));
      }
    });

    return () => {
      ignore = true;
    };
  }, [
    crates,
    packedCrateLookup,
    qualityInspectionLookup,
    transportProgressLookup,
  ]);

  const list = useMemo(() => (Array.isArray(crates) ? crates : []), [crates]);
  const query = searchText.trim().toLowerCase();

  const filteredCrates = useMemo(
    () =>
      list.filter((crate) =>
        matchesSearch(crate, query, harvestLookup, harvestLookupStatus)
      ),
    [harvestLookup, harvestLookupStatus, list, query]
  );

  const statusOptions = useMemo(() => {
    const values = new Set();
    list.forEach((crate) => {
      const status = getPrimaryStatus(crate, transportProgressLookup);
      if (status) values.add(status);
    });
    if (statusFilter !== "ALL") values.add(statusFilter);
    return Array.from(values);
  }, [list, statusFilter, transportProgressLookup]);

  const stats = useMemo(() => {
    const counts = new Map();
    list.forEach((crate) => {
      const status = getPrimaryStatus(crate, transportProgressLookup);
      if (status) counts.set(status, (counts.get(status) || 0) + 1);
    });

    const total =
      query || statusFilter !== "ALL"
        ? filteredCrates.length
        : pagination.total ?? list.length;

    return {
      total,
      statusCounts: Array.from(counts.entries()).slice(0, 4),
      usingBackendTotal: !query && statusFilter === "ALL" && pagination.total !== null,
    };
  }, [
    filteredCrates.length,
    list,
    pagination.total,
    query,
    statusFilter,
    transportProgressLookup,
  ]);

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  async function handleRefresh() {
    await loadCrates(page, statusFilter).catch(() => {});
  }

  async function goToPage(nextPage) {
    if (nextPage < 1) return;
    setPage(nextPage);
    await loadCrates(nextPage, statusFilter).catch(() => {});
  }

  const totalPages = pagination.total_pages || null;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Management</h1>
        <p className="text-sm text-gray-500">
          Review traceable crates linked with harvest, quality inspection,
          packing and transport workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title={stats.usingBackendTotal ? "Total Crates" : "Loaded Crates"}
          value={stats.total}
        />
        {stats.statusCounts.map(([status, count]) => (
          <StatCard key={status} title={formatStatusLabel(status)} value={count} />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <div className="space-y-4 border-b border-gray-200 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Crate List</h2>
              <p className="text-sm text-gray-500">
                Review crate dispatch and movement information.
              </p>
            </div>
            <TraderButton type="button" variant="secondary" onClick={handleRefresh}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </TraderButton>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            <label className="relative block">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <TraderInput
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search crate, harvest, source, product, vehicle or operator"
                className="pl-10"
              />
            </label>

            <TraderSelect
              value={statusFilter}
              onChange={(event) => handleStatusFilterChange(event.target.value)}
            >
              <option value="ALL">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </TraderSelect>
          </div>
        </div>

        {error ? (
          <div className="m-5">
            <InlineError message="Unable to load crates." detail={error} onRetry={handleRefresh} />
          </div>
        ) : null}

        <CrateTable
          crates={filteredCrates}
          harvestLookup={harvestLookup}
          harvestLookupStatus={harvestLookupStatus}
          transportProgressLookup={transportProgressLookup}
          loading={loading}
          onView={setSelectedCrate}
        />

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {pagination.page || page}
            {totalPages ? ` of ${totalPages}` : ""}
          </span>
          <div className="flex gap-2">
            <TraderButton
              type="button"
              variant="secondary"
              disabled={loading || page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </TraderButton>
            <TraderButton
              type="button"
              variant="secondary"
              disabled={loading || (totalPages !== null && page >= totalPages)}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </TraderButton>
          </div>
        </div>
      </section>

      {selectedCrate ? (
        <CrateDetailsModal
          crate={selectedCrate}
          harvestLookup={harvestLookup}
          harvestLookupStatus={harvestLookupStatus}
          qualityInspectionLookup={qualityInspectionLookup}
          packedCrateLookup={packedCrateLookup}
          transportProgressLookup={transportProgressLookup}
          onClose={() => setSelectedCrate(null)}
        />
      ) : null}
    </div>
  );
}

function CrateTable({
  crates,
  harvestLookup,
  harvestLookupStatus,
  transportProgressLookup,
  loading,
  onView,
}) {
  return (
    <>
      <div className="hidden lg:block">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[16%]" />
            <col className="w-[9%]" />
            <col className="w-[11%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <TableHead>Crate</TableHead>
              <TableHead>Harvest</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Packing</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cells={10} /> : null}
            {!loading && crates.length === 0 ? (
              <EmptyTableRow
                colSpan={10}
                title="No crates available."
                message="Crates linked to your harvest operations will appear here."
              />
            ) : null}
            {!loading
              ? crates.map((crate) => (
                  <CrateRow
                    key={getCrateInternalId(crate) || getCrateCode(crate)}
                    crate={crate}
                    harvestLookup={harvestLookup}
                    harvestLookupStatus={harvestLookupStatus}
                    transportProgressLookup={transportProgressLookup}
                    onView={onView}
                  />
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {loading ? (
          <MobileSkeletonCards />
        ) : crates.length === 0 ? (
          <EmptyCard
            title="No crates available."
            message="Crates linked to your harvest operations will appear here."
          />
        ) : (
          crates.map((crate) => (
            <CrateMobileCard
              key={getCrateInternalId(crate) || getCrateCode(crate)}
              crate={crate}
              harvestLookup={harvestLookup}
              harvestLookupStatus={harvestLookupStatus}
              transportProgressLookup={transportProgressLookup}
              onView={onView}
            />
          ))
        )}
      </div>
    </>
  );
}

function CrateRow({
  crate,
  harvestLookup,
  harvestLookupStatus,
  transportProgressLookup,
  onView,
}) {
  return (
    <tr className="border-t border-gray-100">
      <TableCell className="truncate">
        <div className="font-bold text-slate-900">
          {valueOrNotAvailable(getCrateCode(crate))}
        </div>
        {hasReadableValue(getCrateQr(crate)) && getCrateQr(crate) !== getCrateCode(crate) ? (
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {getCrateQr(crate)}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="truncate">
        {valueOrNotAvailable(getHarvestLabel(crate, harvestLookup, harvestLookupStatus))}
      </TableCell>
      <TableCell className="truncate">{valueOrNotAvailable(getSourceLabel(crate))}</TableCell>
      <TableCell className="truncate">{valueOrNotAvailable(getSpecies(crate))}</TableCell>
      <TableCell className="truncate">{formatWeight(getWeight(crate))}</TableCell>
      <TableCell className="truncate">{valueOrNotAvailable(getGrade(crate))}</TableCell>
      <TableCell>
        <OptionalStatusBadge status={getQualityStatus(crate)} />
      </TableCell>
      <TableCell>
        <OptionalStatusBadge status={getPackingStatus(crate)} />
      </TableCell>
      <TableCell>
        <OptionalStatusBadge status={getTransportStatus(crate, transportProgressLookup)} />
      </TableCell>
      <TableCell className="text-right">
        <IconButton title="View Crate Details" onClick={() => onView(crate)} />
      </TableCell>
    </tr>
  );
}

function CrateMobileCard({
  crate,
  harvestLookup,
  harvestLookupStatus,
  transportProgressLookup,
  onView,
}) {
  const transportStatus = getTransportStatus(crate, transportProgressLookup);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {valueOrNotAvailable(getCrateCode(crate))}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {valueOrNotAvailable(getHarvestLabel(crate, harvestLookup, harvestLookupStatus))}
          </p>
        </div>
        <OptionalStatusBadge status={getPackingStatus(crate) || transportStatus} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryDetail label="Product" value={getSpecies(crate)} />
        <SummaryDetail label="Weight" value={formatWeight(getWeight(crate))} />
        <SummaryDetail label="Packing Status" value={formatStatusLabel(getPackingStatus(crate))} />
        <SummaryDetail label="Transport Status" value={formatStatusLabel(transportStatus)} />
      </div>
      <div className="mt-4">
        <TraderButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onView(crate)}
        >
          <Eye size={16} aria-hidden="true" />
          View
        </TraderButton>
      </div>
    </div>
  );
}

function CrateDetailsModal({
  crate,
  harvestLookup,
  harvestLookupStatus,
  qualityInspectionLookup,
  packedCrateLookup,
  transportProgressLookup,
  onClose,
}) {
  const qualityInspection =
    qualityInspectionLookup.get(String(crate?.quality_inspection_id)) || {};
  const packedCrates = packedCrateLookup.get(String(crate?.harvest_id)) || [];
  const packedCrate = findRelatedCrate(crate, packedCrates) || {};
  const transportProgress =
    transportProgressLookup.get(String(crate?.harvest_id)) || {};
  const transportCrate =
    findRelatedCrate(
      crate,
      Array.isArray(transportProgress?.crates) ? transportProgress.crates : []
    ) || {};
  const transportOperator = transportProgress?.transport_operator || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-4">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Dispatch Management
            </p>
            <h2 className="mt-1 break-words text-xl font-black text-slate-950 sm:text-2xl">
              Crate Details
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <DetailSection title="Crate">
            <SummaryDetail label="Crate Code" value={getCrateCode(crate)} />
            <SummaryDetail label="QR Code" value={getCrateQr(crate)} />
            <SummaryDetail label="Species" value={getSpecies(crate)} />
            <SummaryDetail label="Grade" value={getGrade(crate)} />
            <SummaryDetail label="Size" value={firstValue(crate, ["size_count_kg", "size", "size_count"])} />
            <SummaryDetail label="Weight" value={formatWeight(getWeight(crate))} />
            <StatusDetail label="Packing Status" status={getPackingStatus(crate)} />
          </DetailSection>

          <DetailSection title="Harvest">
            <SummaryDetail
              label="Harvest Reference"
              value={getHarvestLabel(crate, harvestLookup, harvestLookupStatus)}
            />
            <SummaryDetail label="Farmer" value={qualityInspection?.farmer_name} />
            <SummaryDetail label="Farm" value={qualityInspection?.farm_name} />
            <SummaryDetail
              label="Pond"
              value={qualityInspection?.pond_name || crate?.pond_name}
            />
          </DetailSection>

          <DetailSection title="Quality">
            <StatusDetail label="Inspection Status" status={getQualityStatus(crate)} />
            <SummaryDetail
              label="Inspection Date"
              value={formatDateTime(qualityInspection?.inspected_at)}
            />
            <SummaryDetail
              label="Quality Checker"
              value={qualityInspection?.checker_name}
            />
            <SummaryDetail label="Checker Code" value={qualityInspection?.checker_code} />
          </DetailSection>

          <DetailSection title="Packing">
            <SummaryDetail label="Crate Packer" value={packedCrate?.crate_packer_name} />
            <SummaryDetail label="Packer Code" value={packedCrate?.crate_packer_code} />
            <SummaryDetail
              label="Packed At"
              value={formatDateTime(packedCrate?.packed_at || crate?.packed_at)}
            />
            <StatusDetail
              label="Packing Status"
              status={packedCrate?.packing_status || crate?.packing_status}
            />
            <SummaryDetail label="Packing GPS" value={getGpsLabel(crate)} />
          </DetailSection>

          <DetailSection title="Transport">
            <SummaryDetail
              label="Transport Operator"
              value={
                transportCrate?.transport_operator_name ||
                transportOperator?.full_name
              }
            />
            <SummaryDetail
              label="Operator Code"
              value={
                transportCrate?.transport_operator_rv_id ||
                transportOperator?.operator_rv_id
              }
            />
            <SummaryDetail
              label="Vehicle"
              value={transportCrate?.vehicle_number || transportProgress?.vehicle_number}
            />
            <SummaryDetail
              label="Loaded At"
              value={formatDateTime(transportCrate?.loaded_at)}
            />
            <StatusDetail
              label="Transport Status"
              status={
                transportCrate?.chain_of_custody_status ||
                transportProgress?.dispatch_status
              }
            />
          </DetailSection>

          <DetailSection title="Timing">
            <SummaryDetail label="Created At" value={formatDateTime(firstValue(crate, ["created_at", "createdAt"]))} />
            <SummaryDetail label="Updated At" value={formatDateTime(firstValue(crate, ["updated_at", "updatedAt"]))} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

function getGpsLabel(crate) {
  const lat = firstValue(crate, ["gps_latitude", "packing_gps_latitude"]);
  const lng = firstValue(crate, ["gps_longitude", "packing_gps_longitude"]);

  if (lat && lng) return `${lat}, ${lng}`;
  return "";
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold text-gray-900">{value}</h3>
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

function EmptyTableRow({ colSpan, title, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center">
        <p className="text-sm font-bold text-slate-700">{title}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{message}</p>
      </td>
    </tr>
  );
}

function EmptyCard({ title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{message}</p>
    </div>
  );
}

function SkeletonRows({ rows = 4, cells = 10 }) {
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

function InlineError({ message, detail, onRetry }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {message}
        {detail ? <span className="block font-medium">{detail}</span> : null}
      </span>
      <TraderButton type="button" variant="secondary" onClick={onRetry}>
        <RefreshCw size={16} aria-hidden="true" />
        Retry
      </TraderButton>
    </div>
  );
}

function IconButton({ title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
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

function StatusDetail({ label, status }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2">
        <OptionalStatusBadge status={status} />
      </div>
    </div>
  );
}

function OptionalStatusBadge({ status }) {
  if (!status) return <span className="text-sm font-semibold text-slate-400">Not available</span>;
  return <TraderStatusBadge status={status} className="max-w-full truncate px-2" />;
}
