import { NavLink } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
  },
  {
    title: "Profile",
    path: "/profile",
  },
  {
    title: "Quality Checkers",
    path: "/quality-checkers",
  },
  {
    title: "Crate Packers",
    path: "/crate-packers",
  },
  {
    title: "Transport Operators",
    path: "/transport-operators",
  },
  {
    title: "Crates",
    path: "/crates",
  },
  {
    title: "Reports",
    path: "/reports",
  },
];

const Sidebar = () => {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-emerald-700">RootVerse</h1>
        <p className="mt-1 text-xs text-slate-500">
          Trader Operations Portal
        </p>
      </div>

      <nav className="space-y-1 px-4 py-5">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                "block rounded-xl px-4 py-3 text-sm font-semibold transition",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700",
              ].join(" ")
            }
          >
            {item.title}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;