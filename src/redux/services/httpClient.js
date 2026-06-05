import { getAuthToken, clearAuth } from "../../utils/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://rootverse-backend-5qoo.onrender.com";

function buildUrl(path) {
  const base = String(API_BASE_URL).replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${base}${cleanPath.replace(/^\/api/, "")}`;
  }

  return `${base}${cleanPath}`;
}

async function parseResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function httpClient(
  path,
  { method = "GET", body, auth = true, headers = {} } = {}
) {
  const token = getAuthToken();
  const isFormData = body instanceof FormData;

  const finalHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (!isFormData && body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    if (!token) {
      clearAuth();
      throw new Error("MISSING_OR_BAD_AUTH_HEADER");
    }

    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const url = buildUrl(path);

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: isFormData
      ? body
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });

  const data = await parseResponse(response);

  if (response.status === 401) {
    clearAuth();

    throw new Error(
      data?.error ||
        data?.message ||
        "INVALID_OR_EXPIRED_TOKEN"
    );
  }

  if (!response.ok || data?.success === false) {
    console.error("API FAILED:", {
      url,
      status: response.status,
      response: data,
    });

    throw new Error(
      data?.error ||
        data?.message ||
        data?.errors?.[0]?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

export default httpClient;