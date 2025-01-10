// client/src/App.jsx
import { useState, useEffect,useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import FetchLoyaltyPoints from "./pages/FetchLoyaltyPoints";
import OrderGenerationPage from "./pages/OrderGenerationPage";
import WorkOrderGeneration from "./pages/WorkOrderGeneration";
import SalesOrderGeneration from "./pages/SalesOrderGeneration";
import PrivilegeGeneration from "./pages/PrivilegeGeneration";
// import SettingsPage from './pages/SettingsPage';
import ReportGenerator from "./components/ReportGenerator";
import Unauthorized from "./pages/Unauthorized";
import RaiseRequest from "./pages/RaiseRequest";
import AdminActionRequired from "./pages/AdminActionRequired";
import ModifyOrder from "./pages/ModifyOrder";
import EmployeeActionRequired from "./pages/EmployeeActionRequired";
import StockManagement from "./pages/StockManagement";
import { supabase } from "./supabaseClient";
import EmployeeStockManagement from "./pages/EmployeeStockManagement";
import NotesReport from "./pages/Notes";
import ModifyOrderWrapper from "./components/ModifyOrderWrapper";
import CaptureCRGeneration from "./pages/CaptureCR";
import Consulting from "./pages/Consulting";
import All_sids from "./pages/All_sids";
import Insurance from "./pages/Insurance";
import Councelling from "./pages/Counselling";
import Insurance_CR from "./pages/Insurance_CR";
import Insurance_check from "./pages/insurance_checkout";
import Insurance_checkout from "./pages/insurance_checkout";


const App = () => {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch the current session
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error.message);
      }
      setUser(session?.user ?? null);
    };

    fetchSession();

    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Cleanup the listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const hideHeaderAndSidebar = location.pathname === "/login";

  const hasAccessToWorkOrderPage = useMemo(() => {
    return user?.email?.trim().toLowerCase().endsWith("@opdmail.com");
  }, [user]);
  
  

  // Lift `isCollapsed` and `selectedTab` state to App component
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTab, setSelectedTab] = useState("Dashboard");

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <AuthProvider>
      {/* Conditionally render the Header and Sidebar based on the path */}
      {!hideHeaderAndSidebar && (
        <Header selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      )}
      <div className="flex">
        {!hideHeaderAndSidebar && (
          <Sidebar
            isCollapsed={isCollapsed}
            toggleSidebar={toggleSidebar}
            selectedTab={selectedTab}
          />
        )}
        <div
          className={`flex-grow transition-all duration-300 ${
            hideHeaderAndSidebar ? "" : isCollapsed ? "ml-16" : "ml-48"
          } min-h-screen`}
        >
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes */}
            <Route
              element={
                <RequireAuth
                  allowedRoles={["super_admin", "admin", "employee"]}
                />
              }
            >
              <Route
                path="/home"
                element={<Home isCollapsed={isCollapsed} />}
              />

              <Route
                path="/order-generation"
                element={<OrderGenerationPage isCollapsed={isCollapsed} />}
              />
              <Route
                path="/modify-order/:orderType/:orderId"
                element={<ModifyOrderWrapper isCollapsed={isCollapsed} />}
              />
              <Route
                path="/work-order"
                element={
                  hasAccessToWorkOrderPage ? (
                    <WorkOrderGeneration isCollapsed={isCollapsed} />
                  ) : (
                    <Unauthorized />
                  )
                }
              />
              <Route
                path="/consulting"
                element={<Consulting isCollapsed={isCollapsed} />}
              />

<Route
                path="/insurance_cr"
                element={<Insurance_CR isCollapsed={isCollapsed} />}
              />

<Route
                path="/insurance_check"
                element={<Insurance_checkout isCollapsed={isCollapsed} />}
              />




              <Route
                path="/insurance"
                element={<Insurance isCollapsed={isCollapsed} />}
              />
              <Route
                path="/counselling"
                element={<Councelling isCollapsed={isCollapsed} />}
              />
              <Route
                path="/sales-order"
                element={<SalesOrderGeneration isCollapsed={isCollapsed} />}
              />
              <Route
                path="/CaptureCR"
                element={<CaptureCRGeneration isCollapsed={isCollapsed} />}
              />
              <Route
                path="/All_sids"
                element={<All_sids isCollapsed={isCollapsed} />}
              />
              <Route
                path="/privilege-generation"
                element={<PrivilegeGeneration isCollapsed={isCollapsed} />}
              />
              <Route
                path="/raise-request"
                element={<RaiseRequest isCollapsed={isCollapsed} />}
              />
              <Route
                path="/admin/action-required"
                element={<AdminActionRequired isCollapsed={isCollapsed} />}
              />
              <Route path="/modify-order/:orderId" element={<ModifyOrder />} />
              <Route
                path="/employee/action-required"
                element={<EmployeeActionRequired isCollapsed={isCollapsed} />}
              />
              <Route
                path="/reportgenerator"
                element={<ReportGenerator isCollapsed={isCollapsed} />}
              />
              <Route
                path="/notes"
                element={<NotesReport isCollapsed={isCollapsed} />}
              />

              <Route
                path="/loyaltypoints"
                element={<FetchLoyaltyPoints isCollapsed={isCollapsed} />}
              />
            </Route>
            {/* Employee Stock Management */}
            <Route
              path="/employee-stock-management"
              element={<EmployeeStockManagement isCollapsed={isCollapsed} />}
            />

            <Route
              element={<RequireAuth allowedRoles={["super_admin", "admin"]} />}
            >
              <Route
                path="/stock-manage"
                element={<StockManagement isCollapsed={isCollapsed} />}
              />
              {/* <Route path="/settings" element={<SettingsPage isCollapsed={isCollapsed} />} /> */}

              
            </Route>

            <Route >
                <Route
                  path="/signup"
                  element={<Signup isCollapsed={isCollapsed} />}
                />
              </Route>

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
};

export default App;
