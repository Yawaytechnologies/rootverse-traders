function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function getId(value) {
  return hasValue(value) ? String(value) : "";
}

export function normalizeLocation(location = {}, context = {}) {
  const district = context.district || {};
  const state = context.state || {};
  const country = context.country || {};

  const districtId = location.district_id ?? district.id;
  const stateId = location.state_id ?? district.state_id ?? state.id;
  const countryId =
    location.country_id ?? district.country_id ?? state.country_id ?? country.id;

  return {
    id: getId(location.id),
    name: location.name || "",
    districtId: getId(districtId),
    districtName: location.district_name || district.name || "",
    stateId: getId(stateId),
    stateName: location.state_name || district.state_name || state.name || "",
    countryId: getId(countryId),
    countryName:
      location.country_name ||
      district.country_name ||
      state.country_name ||
      country.name ||
      "",
    countryCode:
      location.country_code ||
      district.country_code ||
      state.country_code ||
      country.code ||
      "",
  };
}

export function buildLocationLookup(locations = [], context = {}) {
  const lookup = new Map();

  locations.forEach((location) => {
    const normalized = normalizeLocation(location, context);
    if (normalized.id) {
      lookup.set(normalized.id, normalized);
    }
  });

  return lookup;
}

export function mergeLocationLookup(baseLookup, locations = [], context = {}) {
  const next = new Map(baseLookup || []);
  buildLocationLookup(locations, context).forEach((location, id) => {
    next.set(id, location);
  });
  return next;
}

export function formatLocationLabel(location, options = {}) {
  if (!location || typeof location !== "object") return "";

  const { compact = true } = options;
  const parts = compact
    ? [location.name, location.districtName, location.stateName]
    : [
        location.name,
        location.districtName,
        location.stateName,
        location.countryName,
      ];

  return parts.filter(Boolean).join(", ");
}
