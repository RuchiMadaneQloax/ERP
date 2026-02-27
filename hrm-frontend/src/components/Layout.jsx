import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex min-h-screen w-full bg-gray-50">

      {/* Main Section (full width) */}
      <div className="flex flex-col flex-1">

  {/* Topbar */}
  <Topbar />

        {/* Page Content */}
        <main className="overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
