import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext"; // <-- 1. Impor useAuth

// Halaman
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import TransactionForm from "./pages/TransactionForm";
import Reports from "./pages/Reports";
import LoginPage from "./pages/Login";
import SupplierList from "./pages/SupplierList";

function MainLayout() {
  const { isAuthenticated } = useAuth(); 
  if (!isAuthenticated) {
    // Jika mencoba akses tapi belum login, tendang ke login
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto py-6">
        {/* <Outlet /> akan merender halaman anak (Dashboard, Produk, dll.) */}
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
        {/* RUTE PUBLIK (cth: Login) */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* RUTE AMAN / PROTECTED (Semua halaman WMS) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/transactions" element={<TransactionForm />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
