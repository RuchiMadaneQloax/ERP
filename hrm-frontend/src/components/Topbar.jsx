import { useLocation } from "react-router-dom";

export default function Topbar() {
  const location = useLocation();

  const getTitle = () => {
    if (location.pathname === "/") return "Dashboard";
    if (location.pathname === "/attendance") return "Attendance";
    if (location.pathname === "/payroll") return "Payroll";
    return "";
  };

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6">

      <h1 className="text-lg font-semibold text-gray-700">
        {getTitle()}
      </h1>

      <div className="w-8 h-8 rounded-full bg-gray-300"></div>

    </div>
  );
}
