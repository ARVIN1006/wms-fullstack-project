import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import MainLayout from "./components/MainLayout";
import PublicLayout from "./components/PublicLayout"; // Assuming PublicLayout is also moved to a component file

const queryClient = new QueryClient();

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";

// Auth
import LoginPage from "./pages/auth/Login";
import AdminControl from "./pages/auth/AdminControl";
import Profile from "./pages/auth/Profile";

// Inventory
import ProductList from "./pages/inventory/ProductList";
import MovementForm from "./pages/inventory/MovementForm";
import StockOpname from "./pages/inventory/StockOpname";

// Transactions
import TransactionForm from "./pages/transactions/TransactionForm";

// Master Data
import SupplierList from "./pages/master/SupplierList";
import LocationList from "./pages/master/LocationList";
import CustomerList from "./pages/master/CustomerList";

// Reports
import Reports from "./pages/reports/Reports";
import MovementReport from "./pages/reports/MovementReport";
import PerformanceReport from "./pages/reports/PerformanceReport";
import FinancialReport from "./pages/reports/FinancialReport";
import UserActivityReport from "./pages/reports/UserActivityReport";
import CustomerOrderReport from "./pages/reports/CustomerOrderReport";
import StatusInventoryReport from "./pages/reports/StatusInventoryReport";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
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
                <Route
                  path="/transactions"
                  element={<Navigate to="/transactions/in" replace />}
                />
                {/* 2. Tambahkan parameter :type (in atau out) */}
                <Route
                  path="/transactions/:type"
                  element={<TransactionForm />}
                />
                {/* RUTE PELAPORAN (Pastikan Semua Ada) */}
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/movement" element={<MovementReport />} />
                <Route
                  path="/reports/performance"
                  element={<PerformanceReport />}
                />{" "}
                {/* <-- INI PERBAIKANNYA */}
                <Route
                  path="/reports/activity"
                  element={<UserActivityReport />}
                />
                <Route
                  path="/reports/customer-order"
                  element={<CustomerOrderReport />}
                />
                <Route
                  path="/reports/financial"
                  element={<FinancialReport />}
                />
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
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
