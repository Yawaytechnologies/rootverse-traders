import {
  TRADER_LOADING,
  TRADER_ERROR,
  TRADER_CLEAR_ERROR,
  TRADER_LOGIN_SUCCESS,
  TRADER_LOGOUT,
  TRADER_PROFILE_SUCCESS,
  TRADER_DASHBOARD_SUCCESS,
  QUALITY_CHECKERS_SUCCESS,
  CRATE_PACKERS_SUCCESS,
  TRANSPORT_OPERATORS_SUCCESS,
  CRATES_SUCCESS,
  REPORTS_SUCCESS,
} from "../types/trader.types";

const initialState = {
  loading: false,
  error: null,

  token: localStorage.getItem("trader_token") || localStorage.getItem("token") || null,
  user: null,

  dashboardStats: {
    totalQualityCheckers: 0,
    totalCratePackers: 0,
    totalTransportOperators: 0,
    totalCrates: 0,
    activeCrates: 0,
    pendingReports: 0,
  },

  profile: {
    traderName: "RootVerse Trader",
    traderId: "TRD-001",
    email: "trader@example.com",
    phone: "+91 98765 43210",
    location: "Chennai, Tamil Nadu",
    status: "Active",
  },

  qualityCheckers: [],
  cratePackers: [],
  transportOperators: [],
  crates: [],
  reports: [],
};

function normalizeDashboard(payload = {}) {
  const data = payload?.data || payload;

  return {
    totalQualityCheckers:
      data.totalQualityCheckers ||
      data.quality_checkers ||
      data.total_quality_checkers ||
      0,

    totalCratePackers:
      data.totalCratePackers ||
      data.crate_packers ||
      data.total_crate_packers ||
      0,

    totalTransportOperators:
      data.totalTransportOperators ||
      data.transport_operators ||
      data.total_transport_operators ||
      0,

    totalCrates:
      data.totalCrates ||
      data.crates ||
      data.total_crates ||
      0,

    activeCrates:
      data.activeCrates ||
      data.active_crates ||
      0,

    pendingReports:
      data.pendingReports ||
      data.pending_reports ||
      0,
  };
}

function normalizeProfile(payload = {}) {
  const data = payload?.data || payload;

  return {
    traderName:
      data.traderName ||
      data.trader_name ||
      data.name ||
      data.full_name ||
      "RootVerse Trader",

    traderId:
      data.traderId ||
      data.trader_id ||
      data.trader_code ||
      data.id ||
      "TRD-001",

    email: data.email || "",
    phone: data.phone || data.mobile || "",
    location: data.location || data.address || "",
    status: data.status || (data.is_active === false ? "Inactive" : "Active"),

    ...data,
  };
}

const traderReducer = (state = initialState, action) => {
  switch (action.type) {
    case TRADER_LOADING:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case TRADER_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case TRADER_CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case TRADER_LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        token: action.payload?.token || null,
        user: action.payload?.user || null,
        error: null,
      };

    case TRADER_LOGOUT:
      return {
        ...initialState,
        token: null,
        user: null,
      };

    case TRADER_PROFILE_SUCCESS:
      return {
        ...state,
        loading: false,
        profile: {
          ...state.profile,
          ...normalizeProfile(action.payload),
        },
        error: null,
      };

    case TRADER_DASHBOARD_SUCCESS:
      return {
        ...state,
        loading: false,
        dashboardStats: {
          ...state.dashboardStats,
          ...normalizeDashboard(action.payload),
        },
        error: null,
      };

    case QUALITY_CHECKERS_SUCCESS:
      return {
        ...state,
        loading: false,
        qualityCheckers: Array.isArray(action.payload) ? action.payload : [],
        error: null,
      };

    case CRATE_PACKERS_SUCCESS:
      return {
        ...state,
        loading: false,
        cratePackers: Array.isArray(action.payload) ? action.payload : [],
        error: null,
      };

    case TRANSPORT_OPERATORS_SUCCESS:
      return {
        ...state,
        loading: false,
        transportOperators: Array.isArray(action.payload)
          ? action.payload
          : [],
        error: null,
      };

    case CRATES_SUCCESS:
      return {
        ...state,
        loading: false,
        crates: Array.isArray(action.payload) ? action.payload : [],
        error: null,
      };

    case REPORTS_SUCCESS:
      return {
        ...state,
        loading: false,
        reports: Array.isArray(action.payload) ? action.payload : [],
        error: null,
      };

    default:
      return state;
  }
};

export default traderReducer;