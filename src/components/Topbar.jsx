import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { clearAuth, getUser } from "../utils/auth";
import { traderNavItems } from "./Sidebar";

function getInitial(user) {
  const name = user?.trader_name || user?.name || user?.mobile || "T";
  return String(name).trim().charAt(0).toUpperCase() || "T";
}

const Topbar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  const currentSection =
    traderNavItems.find((item) => item.path === location.pathname)?.title ||
    "Trader Portal";

  const profileLabel = user?.trader_name || user?.mobile || "Profile";

  const logout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");

    if (!confirmLogout) {
      return;
    }

    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <header className="z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-14 min-w-0 items-center justify-between gap-3 px-4 sm:h-16 sm:px-5 lg:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-slate-900 sm:text-lg">
              {currentSection}
            </h2>
            <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
              RootVerse Trader Portal
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/profile"
            aria-label="Open trader profile"
            className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
              {getInitial(user)}
            </span>
            <span className="hidden max-w-44 truncate md:inline">
              {profileLabel}
            </span>
            <UserCircle className="hidden h-4 w-4 text-slate-400 sm:block md:hidden" />
          </Link>

          <button
            type="button"
            onClick={logout}
            aria-label="Logout"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 sm:w-auto sm:px-3"
          >
            <LogOut size={18} aria-hidden="true" />
            <span className="hidden pl-2 text-sm font-bold sm:inline">
              Logout
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
