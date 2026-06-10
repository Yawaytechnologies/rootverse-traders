import httpClient from "./httpClient";

function cleanMobile(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return Boolean(value);
}

function buildTraderFormData(payload = {}) {
  const formData = new FormData();

  formData.append("trader_name", String(payload.trader_name || "").trim());
  formData.append(
    "trader_type",
    String(payload.trader_type || "Individual").trim()
  );
  formData.append("mobile", cleanMobile(payload.mobile));
  formData.append("email", String(payload.email || "").trim());
  formData.append("address", String(payload.address || "").trim());
  formData.append(
    "years_of_experience",
    String(payload.years_of_experience || 0)
  );
  formData.append("markets", String(payload.markets || "Export").trim());

  const districts = Array.isArray(payload.operational_districts)
    ? payload.operational_districts
    : String(payload.operational_districts || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  districts.forEach((district) => {
    formData.append("operational_districts", district);
  });

  if (
    typeof File !== "undefined" &&
    payload.profile_image instanceof File
  ) {
    formData.append("profile_image", payload.profile_image);
  }

  if (
    typeof File !== "undefined" &&
    payload.company_logo instanceof File
  ) {
    formData.append("company_logo", payload.company_logo);
  }

  return formData;
}

function buildQualityCheckerPayload(payload = {}) {
  return {
    checker_name: String(payload.checker_name || "").trim(),
    checker_email: String(payload.checker_email || "").trim(),
    checker_phone: cleanMobile(payload.checker_phone),
    location_id: toNumber(payload.location_id),
    checker_code: String(payload.checker_code || "").trim(),
    is_active: toBoolean(
      payload.is_active !== undefined ? payload.is_active : true
    ),
  };
}

function buildCratePackerPayload(payload = {}) {
  return {
    name: String(payload.name || "").trim(),
    phone: cleanMobile(payload.phone || payload.mobile),
    address: String(payload.address || "").trim(),
    email: String(payload.email || "").trim(),
    date_of_birth: String(
      payload.date_of_birth || payload.dateOfBirth || ""
    ).trim(),
    location_id: toNumber(payload.location_id),
    status: String(payload.status || "active").trim(),
  };
}

function buildTransportOperatorPayload(payload = {}) {
  return {
    operator_rv_id: String(payload.operator_rv_id || "").trim(),
    full_name: String(payload.full_name || "").trim(),
    email: String(payload.email || "").trim(),
    mobile: cleanMobile(payload.mobile),
    password: String(payload.password || "").trim(),
    transport_id: String(payload.transport_id || "").trim(),
    vehicle_no: String(payload.vehicle_no || "").trim(),
    route_name: String(payload.route_name || "").trim(),
    vehicle_type: String(payload.vehicle_type || "").trim(),
    is_active: toBoolean(
      payload.is_active !== undefined ? payload.is_active : true
    ),
  };
}

function buildHarvestBookingPayload(payload = {}) {
  const rawStatus = String(
    payload.booking_status ||
      payload.bookingStatus ||
      payload.status ||
      "booked"
  )
    .trim()
    .toLowerCase();

  let bookingStatus = "booked";

  if (rawStatus === "active") {
    bookingStatus = "active";
  }

  if (
    rawStatus === "booked" ||
    rawStatus === "accepted" ||
    rawStatus === "accept" ||
    rawStatus === "confirmed" ||
    rawStatus === "confirm"
  ) {
    bookingStatus = "booked";
  }

  const body = {
    booking_status: bookingStatus,
  };

  const traderId =
    payload.trader_id ||
    payload.traderId ||
    payload.id;

  if (bookingStatus === "booked") {
    const numericTraderId = Number(traderId);

    if (!Number.isFinite(numericTraderId) || numericTraderId <= 0) {
      throw new Error("Logged-in trader ID is missing. Please login again.");
    }

    body.trader_id = numericTraderId;
  }

  return body;
}

export const traderService = {
  login(payload = {}) {
    const mobile = cleanMobile(
      payload.mobile || payload.login_id || payload.loginId || payload.email
    );

    return httpClient("/api/traders/login", {
      method: "POST",
      auth: false,
      body: { mobile },
    });
  },

  createTrader(payload = {}) {
    return httpClient("/api/traders", {
      method: "POST",
      auth: false,
      body: buildTraderFormData(payload),
    });
  },

  getProfile() {
    return httpClient("/api/traders/me", {
      method: "GET",
      auth: true,
    });
  },

  getDashboard() {
    return httpClient("/api/traders/dashboard", {
      method: "GET",
      auth: true,
    });
  },

  getCountries() {
    return httpClient("/api/country", {
      method: "GET",
      auth: true,
    });
  },

  getStatesByCountry(countryId) {
    return httpClient(`/api/states/country/${countryId}`, {
      method: "GET",
      auth: true,
    });
  },

  getDistrictsByState(stateId) {
    return httpClient(`/api/states/${stateId}/districts`, {
      method: "GET",
      auth: true,
    });
  },

  getLocationsByDistrict(districtId) {
    return httpClient(`/api/locations/district/${districtId}`, {
      method: "GET",
      auth: true,
    });
  },

  getQualityCheckers() {
    return httpClient("/api/traders/quality-checkers", {
      method: "GET",
      auth: true,
    });
  },

  createQualityChecker(payload = {}) {
    return httpClient("/api/traders/quality-checkers", {
      method: "POST",
      auth: true,
      body: buildQualityCheckerPayload(payload),
    });
  },

  getCratePackers() {
    return httpClient("/api/traders/crate-packers", {
      method: "GET",
      auth: true,
    });
  },

  createCratePacker(payload = {}) {
    return httpClient("/api/traders/crate-packers", {
      method: "POST",
      auth: true,
      body: buildCratePackerPayload(payload),
    });
  },

  getTransportOperators() {
    return httpClient("/api/traders/transport-operators", {
      method: "GET",
      auth: true,
    });
  },

  createTransportOperator(payload = {}) {
    return httpClient("/api/traders/transport-operators", {
      method: "POST",
      auth: true,
      body: buildTransportOperatorPayload(payload),
    });
  },

  getCrates() {
    return httpClient("/api/traders/crates", {
      method: "GET",
      auth: true,
    });
  },

  updateCrateStatus(crateId, payload) {
    const body = typeof payload === "string" ? { status: payload } : payload;

    return httpClient(`/api/traders/crates/${crateId}/status`, {
      method: "PATCH",
      auth: true,
      body,
    });
  },

  getHarvestRequests() {
    return httpClient("/api/aquaculture/harvest", {
      method: "GET",
      auth: true,
    });
  },

 updateHarvestBooking(harvestId, payload = {}) {
  if (!harvestId) {
    return Promise.reject(new Error("Harvest request reference is missing"));
  }

  return httpClient(`/api/aquaculture/harvest/${harvestId}/booking`, {
    method: "PATCH",
    auth: true,
    body: buildHarvestBookingPayload(payload),
  });
},
};

export function registerTrader(payload) {
  return traderService.createTrader(payload);
}

export function loginTrader(payload) {
  return traderService.login(payload);
}

export const getLoggedTraderProfile = traderService.getProfile;
export const getTraderDashboard = traderService.getDashboard;

export const listCountries = traderService.getCountries;
export const listStatesByCountry = traderService.getStatesByCountry;
export const listDistrictsByState = traderService.getDistrictsByState;
export const listLocationsByDistrict = traderService.getLocationsByDistrict;

export const listQualityCheckers = traderService.getQualityCheckers;
export const createQualityChecker = traderService.createQualityChecker;

export const listCratePackers = traderService.getCratePackers;
export const createCratePacker = traderService.createCratePacker;

export const listTransportOperators = traderService.getTransportOperators;
export const createTransportOperator = traderService.createTransportOperator;

export const listCrates = traderService.getCrates;
export const updateCrateStatus = traderService.updateCrateStatus;

export const listHarvestRequests = traderService.getHarvestRequests;
export const updateHarvestBooking = traderService.updateHarvestBooking;

export default traderService;