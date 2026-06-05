import { combineReducers } from "redux";
import authReducer from "./auth.reducer";
import traderReducer from "./trader.reducer";

const rootReducer = combineReducers({
  auth: authReducer,
  trader: traderReducer,
});

export default rootReducer;