import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// --- PERBAIKAN DIMULAI DI SINI ---
// Kita baca localStorage dan pasang header SEKARANG (di luar komponen)
// Ini menjamin header sudah terpasang sebelum API manapun dipanggil
const initialToken = localStorage.getItem('token');
if (initialToken) {
  axios.defaults.headers.common['x-auth-token'] = initialToken;
}
// --- PERBAIKAN SELESAI ---

// 1. Buat "wadah" context-nya
const AuthContext = createContext(null);

// 2. Buat "Penyedia" (Provider)
export function AuthProvider({ children }) {
  // Gunakan token yang sudah kita baca tadi sebagai state awal
  const [token, setToken] = useState(initialToken || null);

  // useEffect ini sekarang HANYA bertugas saat login (token baru) atau logout (token null)
  useEffect(() => {
    if (token) {
      // Ini berjalan saat kita dapat token BARU dari login
      localStorage.setItem('token', token);
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      // Ini berjalan saat kita logout
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['x-auth-token'];
    }
  }, [token]); // Hanya berjalan saat 'token' berubah

  // Fungsi untuk login
  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      setToken(res.data.token); // Simpan token ke state, ini akan memicu useEffect
      return true;
    } catch (err) {
      console.error("Login gagal:", err);
      throw err;
    }
  };

  // Fungsi untuk logout
  const logout = () => {
    setToken(null); // Hapus token dari state, ini akan memicu useEffect
  };

  // Kirim nilai-nilai ini ke semua komponen di bawahnya
  const value = {
    token,
    login,
    logout,
    isAuthenticated: !!token // (true jika ada token, false jika null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 3. Buat "Hook"
export function useAuth() {
  return useContext(AuthContext);
}