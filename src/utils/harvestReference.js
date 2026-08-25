export const REFERENCE_UNAVAILABLE = "Reference unavailable";
export const REFERENCE_LOADING = "Loading reference...";
export const REFERENCE_ERROR = "Unable to load reference";

const HARVEST_REFERENCE_FIELDS = [
  "harvest_code",
  "harvestCode",
  "reference_code",
  "referenceCode",
  "harvest_reference",
  "harvestReference",
  "harvest_ref",
  "harvestRef",
  "request_code",
  "requestCode",
  "booking_code",
  "bookingCode",
  "qr_code",
  "qrCode",
  "qrs_code",
  "qr_value",
];

const HARVEST_ID_FIELDS = [
  "id",
  "harvest_id",
  "harvestId",
  "_id",
  "booking_id",
  "bookingId",
];

function hasValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  if (typeof value === "object") return false;
  return true;
}

function getPathValue(item, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], item);
}

export function getHarvestInternalId(item = {}) {
  for (const field of HARVEST_ID_FIELDS) {
    const value = getPathValue(item, field);
    if (hasValue(value)) return value;
  }

  const nestedValue =
    getPathValue(item, "harvest.id") ||
    getPathValue(item, "harvest.harvest_id") ||
    getPathValue(item, "harvest.harvestId");

  return hasValue(nestedValue) ? nestedValue : "";
}

export function getDirectHarvestReference(item = {}) {
  for (const field of HARVEST_REFERENCE_FIELDS) {
    const value = getPathValue(item, field);
    if (hasValue(value)) return String(value);
  }

  const harvest = item?.harvest || item?.harvest_request || item?.harvestRequest;

  if (harvest && typeof harvest === "object") {
    for (const field of HARVEST_REFERENCE_FIELDS) {
      const value = getPathValue(harvest, field);
      if (hasValue(value)) return String(value);
    }
  }

  return "";
}

export function buildHarvestReferenceLookup(harvests = []) {
  const lookup = new Map();

  harvests.forEach((harvest) => {
    const id = getHarvestInternalId(harvest);
    const reference = getDirectHarvestReference(harvest);

    if (hasValue(id) && reference) {
      lookup.set(String(id), reference);
    }

    HARVEST_ID_FIELDS.forEach((field) => {
      const alternateId = getPathValue(harvest, field);

      if (hasValue(alternateId) && reference) {
        lookup.set(String(alternateId), reference);
      }
    });
  });

  return lookup;
}

export function extractHarvestList(response) {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.harvests)) return data.harvests;
  if (Array.isArray(data?.harvest_requests)) return data.harvest_requests;
  if (Array.isArray(data?.harvestRequests)) return data.harvestRequests;
  if (Array.isArray(data?.data?.harvests)) return data.data.harvests;
  if (Array.isArray(data?.data?.harvest_requests)) return data.data.harvest_requests;
  if (Array.isArray(data?.data?.harvestRequests)) return data.data.harvestRequests;

  return [];
}

export function getHarvestReference(record = {}, lookup = new Map(), state = {}) {
  const directReference = getDirectHarvestReference(record);
  if (directReference) return directReference;

  const harvestId =
    record?.harvest_id ||
    record?.harvestId ||
    record?.harvest?.id ||
    record?.harvest?.harvest_id ||
    record?.harvest?.harvestId;

  if (hasValue(harvestId)) {
    const resolvedReference = lookup.get(String(harvestId));

    if (resolvedReference) return resolvedReference;
    if (state.loading) return REFERENCE_LOADING;
    if (state.error) return REFERENCE_ERROR;

    return REFERENCE_UNAVAILABLE;
  }

  return REFERENCE_UNAVAILABLE;
}
