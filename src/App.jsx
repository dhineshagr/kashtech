import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectDetails from "./pages/ProjectDetails";
import ManageEmployees from "./pages/ManageEmployees";
import ManageClients from "./pages/ManageClients";
import ManageTimesheet from "./pages/ManageTimesheet";
import ManageProjects from "./components/ManageProjects";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AccessDenied from "./pages/AccessDenied";
import ChangePassword from "./pages/ChangePassword";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import { SearchProvider } from "./context/SearchContext";
import { useTheme } from "./context/ThemeContext";

//import TimesheetHoursReport from "./pages/TimesheetHoursReport"; Some old report page
import WeeklyTimesheetReport from "./pages/WeeklyTimesheetReport";
import DailyTimesheetReport from "./pages/DailyTimesheetReport";

import ManageInvoices from "./pages/ManageInvoices";

const AppLayout = ({ children }) => {
  const { theme } = useTheme();
  return (
    <div className={`${theme} h-screen`}>
      <div className="relative h-full bg-[#f7f7fa] text-[#1b0f34] dark:bg-[#0e0e1a] dark:text-white overflow-hidden">
        <div className="fixed top-0 left-0 h-full w-20 z-10">
          <Sidebar />
        </div>
        <div className="ml-20 h-full flex flex-col overflow-y-auto">
          <Header />
          <div className="flex-1 px-6 py-4 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const decoded = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const role = decoded?.role;

  const withLayout = (Component) =>
    token ? <AppLayout><Component /></AppLayout> : <Navigate to="/login" />;

  const renderProtectedPage = (allowedRoles, Component) => {
    if (!token) return <Navigate to="/login" />;
    return allowedRoles.includes(role)
      ? <AppLayout><Component /></AppLayout>
      : <AppLayout><AccessDenied /></AppLayout>;
  };

  return (
    <Routes>
      <Route path="/login" element={<Login key={location.key} />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/projects/:sowId" element={withLayout(ProjectDetails)} />
      <Route path="/manage-projects/:companyId" element={<ManageProjects />} />
      <Route
        path="/manage-timesheet"
        element={renderProtectedPage(["Admin", "Super Admin", "Basic User"], ManageTimesheet)}
      />
      <Route
        path="/employee-dashboard"
        element={renderProtectedPage(["Basic User"], EmployeeDashboard)}
      />

      <Route path="/invoice-dashboard" element={renderProtectedPage(["Admin", "Super Admin"], ManageInvoices)} />


      {/* Admin and Super Admin Pages */}
      <Route path="/" element={renderProtectedPage(["Admin", "Super Admin"], Dashboard)} />
      <Route path="/manage-employees" element={renderProtectedPage(["Admin", "Super Admin"], ManageEmployees)} />
      <Route path="/manage-clients" element={renderProtectedPage(["Admin", "Super Admin"], ManageClients)} />
      <Route path="/timesheet-weekly-hours-report" element={renderProtectedPage(["Admin", "Super Admin"], WeeklyTimesheetReport)} />
      <Route path="/timesheet-daily-hours-report" element={renderProtectedPage(["Admin", "Super Admin"], DailyTimesheetReport)} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <SearchProvider>
      <Router>
        <AppRoutes />
      </Router>
    </SearchProvider>
  );
}

export default App;
