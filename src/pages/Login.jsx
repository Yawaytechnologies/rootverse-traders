import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Boxes,
  ClipboardCheck,
  PackageSearch,
  ShieldCheck,
  Truck,
} from "lucide-react";
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
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:h-dvh">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1800px] lg:h-dvh lg:min-h-0 lg:grid-cols-[0.45fr_0.55fr]">
        <aside className="relative hidden overflow-hidden bg-slate-950 px-8 py-8 text-white lg:flex lg:h-dvh lg:flex-col lg:justify-between xl:px-12">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute -right-28 bottom-20 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:36px_36px]" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-bold text-white shadow-lg shadow-emerald-950/30">
                R
              </div>
              <div>
                <p className="text-xl font-bold leading-tight">RootVerse</p>
                <p className="text-sm font-medium text-slate-400">
                  Trader Portal
                </p>
              </div>
            </div>

            <div className="mt-14 max-w-xl xl:mt-16">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                <ShieldCheck size={15} aria-hidden="true" />
                RootVerse Connected Ecosystem
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                Connected operations.
                <br />
                Complete traceability.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 xl:text-base">
                Connecting every stage of the RootVerse ecosystem - from source
                procurement and quality inspection to packing, logistics and
                delivery.
              </p>
            </div>
          </div>

          <div className="relative grid gap-2.5 xl:grid-cols-2">
            <FeatureItem icon={PackageSearch} label="Source Procurement" />
            <FeatureItem icon={ClipboardCheck} label="Quality Inspection" />
            <FeatureItem icon={Boxes} label="Crate Traceability" />
            <FeatureItem icon={Truck} label="Transport Management" />
          </div>
        </aside>

        <main className="flex min-w-0 items-center justify-center px-4 py-6 sm:px-6 lg:h-dvh lg:px-10 lg:py-6 xl:px-16">
          <div className="w-full max-w-[460px]">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-sm">
                R
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold leading-tight text-slate-950">
                  RootVerse
                </p>
                <p className="truncate text-sm font-medium text-slate-500">
                  Trader Portal
                </p>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)] sm:p-6">
              <div className="mb-6">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Secure trader access
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Welcome Back
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                  Sign in to your Trader Portal
                </p>
              </div>

              {error && (
                <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle
                    size={18}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-red-600"
                  />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="trader-mobile"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mobile Number
                  </label>

                  <input
                    id="trader-mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setError("");
                    }}
                    placeholder="9876543210"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Sign In"}
                </button>
              </form>

              <div className="mt-5 border-t border-slate-200 pt-4 text-center">
                <p className="text-sm text-slate-600">
                  New to RootVerse?{" "}
                  <Link
                    to="/register-trader"
                    className="font-bold text-emerald-700 underline-offset-4 transition hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    Create Trader Account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

function FeatureItem({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-slate-200 backdrop-blur">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span>{label}</span>
    </div>
  );
}

export default Login;
