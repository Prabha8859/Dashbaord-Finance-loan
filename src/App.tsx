import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import Dashboard from "./pages/dashboard/Dashboard";
import MastersList from "./pages/masters/MastersList";
import MasterDetail from "./pages/masters/MasterDetail";
import LoanApplicationsList from "./pages/applications/LoanApplicationsList";
import PersonalLoanDetail from "./pages/applications/PersonalLoanDetail";
import CustomersList from "./pages/customers/CustomersList";
import StatesCitiesManager from "./pages/masters/StatesCitiesManager";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <CustomersList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/masters"
              element={
                <ProtectedRoute>
                  <MastersList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/masters/states-cities"
              element={
                <ProtectedRoute>
                  <StatesCitiesManager />
                </ProtectedRoute>
              }
            />

            <Route
              path="/masters/:id"
              element={
                <ProtectedRoute>
                  <MasterDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/applications/:loanType/:id"
              element={
                <ProtectedRoute>
                  <PersonalLoanDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/applications/:loanType"
              element={
                <ProtectedRoute>
                  <LoanApplicationsList />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
