import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";

// Halaman
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import SupplierList from "./pages/SupplierList";
import LocationList from "./pages/LocationList";
import CustomerList from "./pages/CustomerList";
import MovementForm from "./pages/MovementForm";
import TransactionForm from "./pages/TransactionForm";
import Reports from "./pages/Reports";
import StockOpname from "./pages/StockOpname";

// Rute Laporan
import MovementReport from "./pages/MovementReport";
import PerformanceReport from "./pages/PerformanceReport";
import FinancialReport from "./pages/FinancialReport";
import UserActivityReport from "./pages/UserActivityReport";
import CustomerOrderReport from "./pages/CustomerOrderReport";
import StatusInventoryReport from "./pages/StatusInventoryReport";

import LoginPage from "./pages/Login";
import AdminControl from "./pages/AdminControl";
import Profile from "./pages/Profile";

function MainLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto py-6">
        <Outlet />
      </div>
    </div>
  );
}

function PublicLayout() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <Routes>
        {/* RUTE PUBLIK */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* RUTE AMAN / PROTECTED */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/locations" element={<LocationList />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/movements" element={<MovementForm />} />
          <Route path="/stock-opname" element={<StockOpname />} />
          
          {/* PERBAIKAN ROUTING TRANSAKSI */}
          {/* 1. Redirect /transactions ke /transactions/in (Default) */}
          <Route path="/transactions" element={<Navigate to="/transactions/in" replace />} />
          {/* 2. Tambahkan parameter :type (in atau out) */}
          <Route path="/transactions/:type" element={<TransactionForm />} /> 
          
          {/* RUTE PELAPORAN (Pastikan Semua Ada) */}
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/movement" element={<MovementReport />} />
          <Route
            path="/reports/performance"
            element={<PerformanceReport />}
          />{" "}
          {/* <-- INI PERBAIKANNYA */}
          <Route path="/reports/activity" element={<UserActivityReport />} />
          <Route
            path="/reports/customer-order"
            element={<CustomerOrderReport />}
          />
          <Route path="/reports/financial" element={<FinancialReport />} />
          <Route
            path="/reports/status-inventory"
            element={<StatusInventoryReport />}
          />
          {/* RUTE ADMIN/PROFILE */}
          <Route path="/admin" element={<AdminControl />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
