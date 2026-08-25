import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Building2,
  LayoutDashboard,
  Package,
  PackageSearch,
  Truck,
  User,
  Wallet,
} from "lucide-react";

export const traderNavItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Source Procurement",
    path: "/source-procurement",
    icon: PackageSearch,
  },
  {
    title: "Quality Inspection",
    path: "/quality-checkers",
    icon: ClipboardCheck,
  },
  {
    title: "Crate Packing",
    path: "/crate-packers",
    icon: Package,
  },
  {
    title: "Transport Tracking",
    path: "/transport-operators",
    icon: Truck,
  },
  {
    title: "Dispatch Management",
    path: "/crates",
    icon: Boxes,
  },
  {
    title: "Payments",
    path: "/payments",
    icon: Wallet,
  },
  {
    title: "Reports",
    path: "/reports",
    icon: BarChart3,
  },
  {
    title: "Profile",
    path: "/profile",
    icon: User,
  },
];

export function SidebarBrand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-black text-white shadow-lg shadow-emerald-950/20">
        R
      </div>

      {!compact && (
        <div className="min-w-0">
          <h1 className="truncate text-lg font-black leading-tight text-white">
            RootVerse
          </h1>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            Trader Portal
          </p>
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ onNavigate }) {
  return (
    <nav className="scrollbar-hidden min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3">
      {traderNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-300",
                isActive
                  ? "bg-emerald-500/15 text-white shadow-sm ring-1 ring-emerald-400/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                    isActive
                      ? "bg-emerald-400/20 text-emerald-300"
                      : "text-slate-400 group-hover:text-emerald-200",
                  ].join(" ")}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate">{item.title}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

const Sidebar = () => {
  return (
    <aside className="hidden h-dvh w-[272px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-950 lg:flex">
      <div className="shrink-0 border-b border-white/10 px-5 py-4">
        <SidebarBrand />
      </div>

      <SidebarNav />

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200">
            <Building2 size={17} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              Blue Ocean Traders
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
              Trader Admin
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
