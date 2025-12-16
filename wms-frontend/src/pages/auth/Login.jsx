import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      // Toast success is handled in AuthContext usually, but adding here just in case or if not
      toast.success("Login berhasil!");
      navigate("/"); // Redirect ke Dashboard setelah login
    } catch (err) {
      toast.error(
        err.response?.data?.msg || "Login gagal. Cek kredensial Anda."
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-sm p-8" noPadding>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg transform rotate-3 mb-4">
              <span className="text-3xl text-white">📦</span>
            </div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">
              WMS Login
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Masuk untuk mengelola gudang
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Masukkan username"
            />

            <Input
              label="Password"
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Masukkan password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center"
              isLoading={loading}
              size="lg"
            >
              Masuk Sekarang
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} WMS System. All rights reserved.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
