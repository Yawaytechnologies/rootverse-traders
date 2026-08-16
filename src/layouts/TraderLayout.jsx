import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TraderMobileDrawer from "../components/TraderMobileDrawer";

const TraderLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-dvh min-w-0 overflow-hidden">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar onMenuClick={() => setMobileNavOpen(true)} />

          <main className="scrollbar-hidden min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-8 xl:py-7">
            <div className="mx-auto w-full max-w-[1600px] min-w-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <TraderMobileDrawer open={mobileNavOpen} onClose={closeMobileNav} />
    </div>
  );
};

export default TraderLayout;
