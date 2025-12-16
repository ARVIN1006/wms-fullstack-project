import { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

// Helper function untuk decode JWT dan mengambil role
const getRoleFromToken = (token) => {
  try {
    const payload = token.split(".")[1];
    const decodedPayload = JSON.parse(atob(payload)); // atob untuk base64 decode
    return decodedPayload.user.role; // Mengambil role yang kita masukkan di backend
  } catch (e) {
    return null;
  }
};

// --- Perbaikan untuk mencegah race condition (wajib di luar komponen) ---
const initialToken = localStorage.getItem("token");
if (initialToken) {
  axios.defaults.headers.common["x-auth-token"] = initialToken;
}
// --- Selesai Perbaikan ---

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(initialToken || null);
  const [userRole, setUserRole] = useState(
    getRoleFromToken(initialToken) || null
  ); // <-- STATE USER ROLE

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      axios.defaults.headers.common["x-auth-token"] = token;
      setUserRole(getRoleFromToken(token)); // Set role saat token baru datang
    } else {
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["x-auth-token"];
      setUserRole(null); // Reset role saat logout
    }
  }, [token]);

  // Interceptor untuk menangani 401 Unauthorized (Token Expired)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Jika error 401 (Unauthorized), berarti token expired atau tidak valid
        if (error.response && error.response.status === 401) {
          setToken(null); // Otomatis logout
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      setToken(res.data.token);
      return true;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
  };

  const value = {
    token,
    login,
    logout,
    isAuthenticated: !!token,
    userRole, // <-- KIRIM ROLE KE SEMUA KOMPONEN
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
