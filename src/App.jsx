import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import RegisterTrader from "./pages/RegisterTrader";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import QualityCheckers from "./pages/QualityCheckers";
import CratePackers from "./pages/CratePackers";
import TransportOperators from "./pages/TransportOperators";
import Crates from "./pages/Crates";
import Reports from "./pages/Reports";

import TraderLayout from "./layouts/TraderLayout";
import { isAuthenticated } from "./utils/auth";

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterTrader />} />
        <Route path="/register-trader" element={<RegisterTrader />} />

        <Route
          element={
            <ProtectedRoute>
              <TraderLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/quality-checkers" element={<QualityCheckers />} />
          <Route path="/crate-packers" element={<CratePackers />} />
          <Route path="/transport-operators" element={<TransportOperators />} />
          <Route path="/crates" element={<Crates />} />
          <Route path="/reports" element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;