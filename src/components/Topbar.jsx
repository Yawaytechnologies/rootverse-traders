import { Link, useNavigate } from "react-router-dom";
import { clearAuth, getUser } from "../utils/auth";

const Topbar = () => {
  const navigate = useNavigate();
  const user = getUser();

  const logout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");

    if (!confirmLogout) {
      return;
    }

    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Trader Dashboard
          </h2>
          <p className="text-xs text-slate-500">Logged in Trader</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {user?.trader_name || user?.mobile || "Profile"}
          </Link>

          <button
            onClick={logout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;