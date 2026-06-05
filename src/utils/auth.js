const TOKEN_KEY = "trader_token";
const USER_KEY = "trader_user";

export function saveAuth(token, user = null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("token", token);
    localStorage.setItem("auth_token", token);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function saveToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("token", token);
    localStorage.setItem("auth_token", token);
  }
}

export function getAuthToken() {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    ""
  );
}

export function getToken() {
  return getAuthToken();
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("auth_token");
}

export function saveUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function getUser() {
  try {
    return JSON.parse(
      localStorage.getItem(USER_KEY) ||
        localStorage.getItem("user") ||
        "null"
    );
  } catch {
    return null;
  }
}

export function removeUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("user");
}

export function getStoredTrader() {
  return getUser();
}

export function clearAuth() {
  removeToken();
  removeUser();
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export default {
  saveAuth,
  saveToken,
  getAuthToken,
  getToken,
  removeToken,
  saveUser,
  getUser,
  removeUser,
  getStoredTrader,
  clearAuth,
  isAuthenticated,
};