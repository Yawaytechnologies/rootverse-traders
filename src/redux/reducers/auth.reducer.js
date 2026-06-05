import { getToken, getUser } from "../../utils/auth";

import {
  TRADER_LOGIN_SUCCESS,
  TRADER_LOGOUT,
} from "../types/trader.types";

const initialState = {
  token: getToken(),
  user: getUser(),
  isAuthenticated: Boolean(getToken()),
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case TRADER_LOGIN_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
      };

    case TRADER_LOGOUT:
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
      };

    default:
      return state;
  }
}