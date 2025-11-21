import { useState } from 'react';
import { useAuth } from '../context/AuthContext'; 
import { useNavigate } from 'react-router-dom'; 
import { toast } from 'react-hot-toast';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth(); 
  const navigate = useNavigate(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password); 
      toast.success('Login berhasil!');
      navigate('/'); // Redirect ke Dashboard setelah login
    } catch (err) {
      // Tangkap error yang dilempar dari context (misal: Username/Password salah)
      toast.error(err.response?.data?.msg || 'Login gagal. Cek kredensial Anda.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-lg rounded-lg w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
          WMS Login
        </h1>
        <form onSubmit={handleSubmit}>
          
          {/* Input Username */}
          <div className="mb-4">
            {/* Label terhubung ke input via htmlFor="username" */}
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              id="username" // <-- FIX: Tambah ID
              name="username" // <-- FIX: Tambah NAME (untuk Autofill)
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Input Password */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              id="password" // <-- FIX: Tambah ID
              name="password" // <-- FIX: Tambah NAME (untuk Autofill)
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Tombol Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;