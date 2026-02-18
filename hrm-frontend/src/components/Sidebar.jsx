import { NavLink } from "react-router-dom";
import { LayoutDashboard, Calendar, Wallet } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r flex flex-col">

      <div className="p-6 text-xl font-bold border-b">
        ERP HRMS
      </div>

      <nav className="flex-1 p-4 space-y-2">

        <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
        <NavItem to="/attendance" icon={<Calendar size={18} />} label="Attendance" />
        <NavItem to="/payroll" icon={<Wallet size={18} />} label="Payroll" />

      </nav>

    </div>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition
        ${isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:bg-gray-100"}`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
