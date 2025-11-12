import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
  useLocation, // Import useLocation untuk memicu re-render
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


// --- BARU: Komponen Wrapper Animasi Sederhana ---
function PageWrapper() {
  const location = useLocation();
  // key={location.pathname} memaksa React merender ulang element div, yang kemudian memicu CSS animation
  return (
    <div 
      key={location.pathname}
      className="animate-fadeInSlideUp" // Kelas animasi baru
    >
      <Outlet />
    </div>
  );
}
// --- SELESAI KOMPONEN BARU ---


function MainLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto py-6">
        {/* Menggunakan PageWrapper untuk animasi per rute */}
        <PageWrapper /> 
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
          {/* Semua rute kini di-handle di dalam Outlet MainLayout */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/locations" element={<LocationList />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/movements" element={<MovementForm />} />
          <Route path="/stock-opname" element={<StockOpname />} />
          <Route path="/transactions" element={<TransactionForm />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/movement" element={<MovementReport />} />
          <Route
            path="/reports/performance"
            element={<PerformanceReport />}
          />
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
          <Route path="/admin" element={<AdminControl />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;