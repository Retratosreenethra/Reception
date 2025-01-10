import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireAuth = ({ allowedRoles }) => {
  const { user, loading, role } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  // Debug: Log user information
  console.log("User Email:", user.email);
  console.log("User Role:", role);

  // Allow access for emails ending with '@opdmail.com'
  if (user.email.trim().toLowerCase().endsWith("@opdmail.com")) {
    return window.location.pathname === "/work-order" ? (
      <Outlet />
    ) : (
      <Navigate to="/work-order" replace />
    );
  }

  if (user.email.trim().toLowerCase().endsWith("@insurancemail.com")) {
    return ["/insurance", "/insurance_cr"].includes(window.location.pathname) ? (
      <Outlet />
    ) : (
      <Navigate to="/insurance" replace />
    );
  }
  
  if (user.email.trim().toLowerCase().endsWith("@counsellingmail.com")) {
    return window.location.pathname === "/counselling" ? (
      <Outlet />
    ) : (
      <Navigate to="/counselling" replace />
    );
  }

  // Normal role-based access for other users
  if (!allowedRoles.includes(role)) {
    console.warn("Access denied. Current role:", role);
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
