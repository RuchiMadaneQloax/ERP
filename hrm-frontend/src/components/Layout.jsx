import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">

      {/* Main Section (full width) */}
      <div className="flex flex-col flex-1">

  {/* Topbar */}
  <Topbar />

        {/* Page Content */}
        <main className="p-6 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
