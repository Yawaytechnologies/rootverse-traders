import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  loginTrader,
  getLoggedTraderProfile,
} from "../redux/services/trader.service";
import { saveToken, saveUser, clearAuth } from "../utils/auth";

function extractToken(response) {
  return (
    response?.token ||
    response?.accessToken ||
    response?.access_token ||
    response?.data?.token ||
    response?.data?.accessToken ||
    response?.data?.access_token ||
    response?.data?.authToken ||
    null
  );
}

function extractUser(response) {
  return (
    response?.user ||
    response?.trader ||
    response?.data?.user ||
    response?.data?.trader ||
    response?.data ||
    null
  );
}

const Login = () => {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanMobile = mobile.replace(/\D/g, "").slice(0, 10);

    if (!cleanMobile) {
      setError("Mobile number is required");
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      setError("Enter a valid 10 digit mobile number");
      return;
    }

    try {
      setLoading(true);
      clearAuth();

      const response = await loginTrader({
        mobile: cleanMobile,
      });

      const token = extractToken(response);
      const user = extractUser(response);

      if (!token) {
        throw new Error(
          "Login failed. Token missing. Trader may not be approved or active."
        );
      }

      saveToken(token);
      saveUser(user);

      try {
        const profile = await getLoggedTraderProfile();
        saveUser(profile?.data || profile || user);
      } catch {
        // Token login success is enough. Profile failure should not block login.
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Trader Login
        </h1>

        <p className="mb-6 text-sm text-slate-500">
          Login using your registered trader mobile number.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Mobile Number
            </label>

            <input
              type="tel"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                setError("");
              }}
              placeholder="9876543210"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-5">
          <p className="mb-2 text-center text-sm text-slate-600">
            New trader?
          </p>

          <Link
            to="/register-trader"
            className="block w-full rounded-lg border border-emerald-600 bg-white py-3 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Register Trader
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;