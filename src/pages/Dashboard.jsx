import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLoggedTraderProfile,
  getTraderDashboard,
} from "../redux/services/trader.service";
import { clearAuth, saveUser } from "../utils/auth";

function unwrap(response) {
  return response?.data || response || {};
}

function getCount(value) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") return value;

  if (typeof value === "string") return value;

  if (Array.isArray(value)) return value.length;

  if (typeof value === "object") {
    return (
      value.total ||
      value.count ||
      value.length ||
      Object.values(value).reduce((sum, item) => {
        return sum + (typeof item === "number" ? item : 0);
      }, 0)
    );
  }

  return 0;
}

function getObjectDetails(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).map(([key, item]) => ({
    label: key.replaceAll("_", " "),
    value: item,
  }));
}

const Dashboard = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({});
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [profileResponse, dashboardResponse] = await Promise.all([
        getLoggedTraderProfile(),
        getTraderDashboard(),
      ]);

      const profileData = unwrap(profileResponse);
      const dashboardData = unwrap(dashboardResponse);

      console.log("PROFILE API DATA:", profileData);
      console.log("DASHBOARD API DATA:", dashboardData);

      setProfile(profileData);
      setDashboard(dashboardData);
      saveUser(profileData);
    } catch (err) {
      setError(err.message || "Dashboard fetch failed");

      if (
        err.message === "INVALID_OR_EXPIRED_TOKEN" ||
        err.message === "MISSING_OR_BAD_AUTH_HEADER" ||
        err.message?.toLowerCase().includes("unauthorized")
      ) {
        clearAuth();
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const qualityCheckersValue =
    dashboard?.quality_checkers_count ||
    dashboard?.qualityCheckersCount ||
    dashboard?.quality_checkers ||
    dashboard?.qualityCheckers ||
    0;

  const cratePackersValue =
    dashboard?.crate_packers_count ||
    dashboard?.cratePackersCount ||
    dashboard?.crate_packers ||
    dashboard?.cratePackers ||
    0;

  const transportOperatorsValue =
    dashboard?.transport_operators_count ||
    dashboard?.transportOperatorsCount ||
    dashboard?.transport_operators ||
    dashboard?.transportOperators ||
    0;

  const cratesValue =
    dashboard?.crates_count ||
    dashboard?.cratesCount ||
    dashboard?.crates ||
    dashboard?.crate_status ||
    dashboard?.crateStatus ||
    0;

  const cards = [
    {
      title: "Quality Checkers",
      value: qualityCheckersValue,
      path: "/quality-checkers",
    },
    {
      title: "Crate Packers",
      value: cratePackersValue,
      path: "/crate-packers",
    },
    {
      title: "Transport Operators",
      value: transportOperatorsValue,
      path: "/transport-operators",
    },
    {
      title: "Crates",
      value: cratesValue,
      path: "/crates",
    },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <p className="font-medium text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const details = getObjectDetails(card.value);

          return (
            <button
              key={card.title}
              type="button"
              onClick={() => navigate(card.path)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <p className="text-sm font-medium text-slate-500">
                {card.title}
              </p>

              <h3 className="mt-3 text-3xl font-bold text-slate-900">
                {getCount(card.value)}
              </h3>

              {details.length > 0 && (
                <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
                  {details.slice(0, 4).map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="capitalize text-slate-500">
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Trader Profile
            </h2>
            <p className="text-sm text-slate-500">
              Logged-in trader organization details
            </p>
          </div>

          <button
            onClick={() => navigate("/profile")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            View Full Profile
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Info label="Trader Name" value={profile.trader_name} />
          <Info label="Trader Type" value={profile.trader_type} />
          <Info label="Mobile" value={profile.mobile} />
          <Info label="Email" value={profile.email} />
          <Info label="Address" value={profile.address} />
          <Info
            label="Operational Districts"
            value={
              Array.isArray(profile.operational_districts)
                ? profile.operational_districts.join(", ")
                : profile.operational_districts
            }
          />
          <Info label="Years Of Experience" value={profile.years_of_experience} />
          <Info label="Markets" value={profile.markets} />
          <Info label="Status" value={profile.is_active ? "Active" : "Inactive"} />
          <Info label="Created At" value={formatDate(profile.created_at)} />
        </div>
      </section>
    </div>
  );
};

const Info = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value === 0 ? 0 : value || "-"}
      </p>
    </div>
  );
};

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default Dashboard;