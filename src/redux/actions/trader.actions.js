import { traderService } from "../services/trader.service";
import { saveToken, saveUser, removeToken, removeUser } from "../../utils/auth";

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
} from "../types/trader.types";

function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function extractToken(response) {
  return (
    response?.token ||
    response?.accessToken ||
    response?.access_token ||
    response?.data?.token ||
    response?.data?.accessToken ||
    response?.data?.access_token ||
    response?.data?.authToken ||
    response?.data?.auth_token ||
    null
  );
}

function extractUser(response) {
  return (
    response?.user ||
    response?.trader ||
    response?.data?.user ||
    response?.data?.trader ||
    response?.data?.admin ||
    response?.data ||
    null
  );
}

function extractList(response, key) {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];

  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.qualityCheckers)) return data.qualityCheckers;
  if (Array.isArray(data?.quality_checkers)) return data.quality_checkers;

  if (Array.isArray(data?.cratePackers)) return data.cratePackers;
  if (Array.isArray(data?.crate_packers)) return data.crate_packers;

  if (Array.isArray(data?.transportOperators)) return data.transportOperators;
  if (Array.isArray(data?.transport_operators)) return data.transport_operators;

  if (Array.isArray(data?.crates)) return data.crates;

  return [];
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.data?.error ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
}

export const clearTraderError = () => ({
  type: TRADER_CLEAR_ERROR,
});

export const traderLogin = (payload) => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    const mobile = cleanMobile(
      payload?.mobile || payload?.login_id || payload?.loginId || payload?.email
    );

    if (!mobile) {
      throw new Error("Mobile number is required");
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      throw new Error("Enter a valid 10 digit mobile number");
    }

    const response = await traderService.login({ mobile });

    const token = extractToken(response);
    const user = extractUser(response);

    if (!token) {
      throw new Error(
        "Login failed. Token missing. Trader may not be approved or active."
      );
    }

    saveToken(token);
    saveUser(user);

    dispatch({
      type: TRADER_LOGIN_SUCCESS,
      payload: {
        token,
        user,
      },
    });

    dispatch({ type: TRADER_CLEAR_ERROR });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Trader login failed"),
    });

    throw error;
  }
};

export const traderLogout = () => (dispatch) => {
  removeToken();
  removeUser();

  dispatch({
    type: TRADER_LOGOUT,
  });
};

export const createTrader = (payload) => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    const traderPayload = {
      trader_name: payload?.trader_name || payload?.traderName || "",
      trader_type: payload?.trader_type || payload?.traderType || "Individual",
      mobile: cleanMobile(payload?.mobile),
      email: payload?.email || "",
      address: payload?.address || "",
      operational_districts:
        payload?.operational_districts ||
        payload?.operationalDistricts ||
        [],
      years_of_experience:
        payload?.years_of_experience || payload?.yearsOfExperience || 0,
      markets: payload?.markets || "Export",
      profile_image: payload?.profile_image || payload?.profileImage || null,
      company_logo: payload?.company_logo || payload?.companyLogo || null,
    };

    if (!traderPayload.trader_name.trim()) {
      throw new Error("Trader name is required");
    }

    if (!traderPayload.mobile) {
      throw new Error("Mobile number is required");
    }

    if (!/^[0-9]{10}$/.test(traderPayload.mobile)) {
      throw new Error("Enter a valid 10 digit mobile number");
    }

    if (!traderPayload.email.trim()) {
      throw new Error("Email is required");
    }

    if (!traderPayload.address.trim()) {
      throw new Error("Address is required");
    }

    const response = await traderService.createTrader(traderPayload);

    dispatch({ type: TRADER_CLEAR_ERROR });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Create trader failed"),
    });

    throw error;
  }
};

export const getTraderProfile = () => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    const response = await traderService.getProfile();

    dispatch({
      type: TRADER_PROFILE_SUCCESS,
      payload: response?.data || response,
    });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Profile fetch failed"),
    });

    throw error;
  }
};

export const getTraderDashboard = () => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    const response = await traderService.getDashboard();

    dispatch({
      type: TRADER_DASHBOARD_SUCCESS,
      payload: response?.data || response,
    });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Dashboard fetch failed"),
    });

    throw error;
  }
};

export const getQualityCheckers = () => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    const response = await traderService.getQualityCheckers();

    dispatch({
      type: QUALITY_CHECKERS_SUCCESS,
      payload: extractList(response, "qualityCheckers"),
    });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Quality checkers fetch failed"),
    });

    throw error;
  }
};

export const createQualityChecker = (payload) => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    if (!payload?.checker_name?.trim()) {
      throw new Error("Checker name is required");
    }

    if (!payload?.checker_email?.trim()) {
      throw new Error("Checker email is required");
    }

    if (!/^[0-9]{10}$/.test(cleanMobile(payload?.checker_phone))) {
      throw new Error("Enter a valid 10 digit checker phone number");
    }

    if (!payload?.location_id) {
      throw new Error("Location is required");
    }

    if (!payload?.checker_code?.trim()) {
      throw new Error("Checker code is required");
    }

    const finalPayload = {
      checker_name: payload.checker_name.trim(),
      checker_email: payload.checker_email.trim(),
      checker_phone: cleanMobile(payload.checker_phone),
      location_id: Number(payload.location_id),
      checker_code: payload.checker_code.trim(),
      is_active: Boolean(payload.is_active),
    };

    const response = await traderService.createQualityChecker(finalPayload);

    await dispatch(getQualityCheckers());
    dispatch({ type: TRADER_CLEAR_ERROR });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Create quality checker failed"),
    });

    throw error;
  }
};

export const getCratePackers = () => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    const response = await traderService.getCratePackers();

    dispatch({
      type: CRATE_PACKERS_SUCCESS,
      payload: extractList(response, "cratePackers"),
    });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Crate packers fetch failed"),
    });

    throw error;
  }
};

export const createCratePacker = (payload) => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    if (!payload?.name?.trim()) {
      throw new Error("Name is required");
    }

    if (!/^[0-9]{10}$/.test(cleanMobile(payload?.phone))) {
      throw new Error("Enter a valid 10 digit phone number");
    }

    if (!payload?.address?.trim()) {
      throw new Error("Address is required");
    }

    if (!payload?.email?.trim()) {
      throw new Error("Email is required");
    }

    if (!payload?.date_of_birth) {
      throw new Error("Date of birth is required");
    }

    if (!payload?.location_id) {
      throw new Error("Location is required");
    }

    const finalPayload = {
      name: payload.name.trim(),
      phone: cleanMobile(payload.phone),
      address: payload.address.trim(),
      email: payload.email.trim(),
      date_of_birth: payload.date_of_birth,
      location_id: Number(payload.location_id),
      status: payload.status || "active",
    };

    const response = await traderService.createCratePacker(finalPayload);

    await dispatch(getCratePackers());
    dispatch({ type: TRADER_CLEAR_ERROR });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Create crate packer failed"),
    });

    throw error;
  }
};

export const getTransportOperators = () => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    const response = await traderService.getTransportOperators();

    dispatch({
      type: TRANSPORT_OPERATORS_SUCCESS,
      payload: extractList(response, "transportOperators"),
    });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Transport operators fetch failed"),
    });

    throw error;
  }
};

export const createTransportOperator = (payload) => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    if (!payload?.operator_rv_id?.trim()) {
      throw new Error("Operator RV ID is required");
    }

    if (!payload?.full_name?.trim()) {
      throw new Error("Full name is required");
    }

    if (!payload?.email?.trim()) {
      throw new Error("Email is required");
    }

    if (!/^[0-9]{10}$/.test(cleanMobile(payload?.mobile))) {
      throw new Error("Enter a valid 10 digit mobile number");
    }

    if (!payload?.password?.trim()) {
      throw new Error("Password is required");
    }

    if (!payload?.transport_id?.trim()) {
      throw new Error("Transport ID is required");
    }

    if (!payload?.vehicle_no?.trim()) {
      throw new Error("Vehicle number is required");
    }

    if (!payload?.route_name?.trim()) {
      throw new Error("Route name is required");
    }

    if (!payload?.vehicle_type?.trim()) {
      throw new Error("Vehicle type is required");
    }

    const finalPayload = {
      operator_rv_id: payload.operator_rv_id.trim(),
      full_name: payload.full_name.trim(),
      email: payload.email.trim(),
      mobile: cleanMobile(payload.mobile),
      password: payload.password.trim(),
      transport_id: payload.transport_id.trim(),
      vehicle_no: payload.vehicle_no.trim(),
      route_name: payload.route_name.trim(),
      vehicle_type: payload.vehicle_type.trim(),
      is_active: Boolean(payload.is_active),
    };

    const response = await traderService.createTransportOperator(finalPayload);

    await dispatch(getTransportOperators());
    dispatch({ type: TRADER_CLEAR_ERROR });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Create transport operator failed"),
    });

    throw error;
  }
};

export const getCrates = () => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    const response = await traderService.getCrates();

    dispatch({
      type: CRATES_SUCCESS,
      payload: extractList(response, "crates"),
    });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Crates fetch failed"),
    });

    throw error;
  }
};

export const updateCrateStatus = (crateId, payload) => async (dispatch) => {
  try {
    dispatch({ type: TRADER_LOADING });

    if (!crateId) {
      throw new Error("Crate ID is required");
    }

    const finalPayload =
      typeof payload === "string"
        ? { status: payload }
        : {
            status: payload?.status,
          };

    if (!finalPayload.status) {
      throw new Error("Status is required");
    }

    const response = await traderService.updateCrateStatus(
      crateId,
      finalPayload
    );

    await dispatch(getCrates());
    dispatch({ type: TRADER_CLEAR_ERROR });

    return response;
  } catch (error) {
    dispatch({
      type: TRADER_ERROR,
      payload: getErrorMessage(error, "Crate status update failed"),
    });

    throw error;
  }
};