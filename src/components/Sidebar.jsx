import { NavLink } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: "▦",
  },
  {
    title: "Source Procurement",
    path: "/source-procurement",
    icon: "▣",
  },
  {
    title: "Quality Inspection",
    path: "/quality-checkers",
    icon: "◈",
  },
  {
    title: "Crate Packing",
    path: "/crate-packers",
    icon: "⬡",
  },
  {
    title: "Dispatch Management",
    path: "/reports",
    icon: "▰",
  },
  {
    title: "Transport Tracking",
    path: "/transport-operators",
    icon: "▰",
  },
  {
    title: "Receiving / Centre",
    path: "/crates",
    icon: "▤",
  },
  {
    title: "Buyers & Users",
    path: "/profile",
    icon: "◌",
  },
];

const Sidebar = () => {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white">
            R
          </div>

          <div>
            <h1 className="text-lg font-black leading-tight text-slate-950">
              RootVerse
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Trader Portal
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700",
              ].join(" ")
            }
          >
            <span className="flex h-6 w-6 items-center justify-center text-base">
              {item.icon}
            </span>
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-950">
            Blue Ocean Traders
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Trader Admin
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;