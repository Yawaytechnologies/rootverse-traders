import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, ClipboardCheck, Package, Truck } from "lucide-react";
import {
  getLoggedTraderProfile,
  getTraderDashboard,
} from "../redux/services/trader.service";
import { clearAuth, saveUser } from "../utils/auth";
import TraderButton from "../components/ui/TraderButton";
import TraderCard from "../components/ui/TraderCard";
import TraderStatusBadge from "../components/ui/TraderStatusBadge";

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
      icon: ClipboardCheck,
    },
    {
      title: "Crate Packers",
      value: cratePackersValue,
      path: "/crate-packers",
      icon: Package,
    },
    {
      title: "Transport Operators",
      value: transportOperatorsValue,
      path: "/transport-operators",
      icon: Truck,
    },
    {
      title: "Crates",
      value: cratesValue,
      path: "/crates",
      icon: Boxes,
    },
  ];

  if (loading) {
    return (
      <TraderCard className="p-6">
        <p className="font-medium text-slate-600">Loading dashboard...</p>
      </TraderCard>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const details = getObjectDetails(card.value);
          const Icon = card.icon;

          return (
            <button
              key={card.title}
              type="button"
              onClick={() => navigate(card.path)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/10"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                <Icon size={21} aria-hidden="true" />
              </div>

              <h3 className="text-3xl font-bold tracking-tight text-slate-950">
                {getCount(card.value)}
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {card.title}
              </p>

              {details.length > 0 && (
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
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

      <TraderCard className="p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Trader Profile
            </h2>
            <p className="text-sm text-slate-500">
              Logged-in trader organization details
            </p>
          </div>

          <TraderButton
            type="button"
            onClick={() => navigate("/profile")}
            className="w-full sm:w-auto"
          >
            View Full Profile
          </TraderButton>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          <Info
            label="Status"
            value={
              <TraderStatusBadge
                status={profile.is_active ? "Active" : "Inactive"}
              />
            }
          />
          <Info label="Created At" value={formatDate(profile.created_at)} />
        </div>
      </TraderCard>
    </div>
  );
};

const Info = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1.5 break-words text-sm font-semibold text-slate-900">
        {value === 0 ? 0 : value || "-"}
      </div>
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
