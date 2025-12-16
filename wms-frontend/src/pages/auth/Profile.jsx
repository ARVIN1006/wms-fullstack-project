import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

const passwordSchema = yup.object().shape({
  oldPassword: yup.string().required("Password lama wajib diisi."),
  newPassword: yup
    .string()
    .min(6, "Password baru minimal 6 karakter.")
    .required("Password baru wajib diisi."),
  confirmNewPassword: yup
    .string()
    .oneOf(
      [yup.ref("newPassword"), null],
      "Konfirmasi password harus sama dengan password baru."
    )
    .required("Konfirmasi password wajib diisi."),
});

function Profile() {
  const { userRole, token, logout } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUsernameFromToken = (token) => {
    try {
      if (!token) return "Pengguna";
      const payload = token.split(".")[1];
      const decodedPayload = JSON.parse(atob(payload));
      return decodedPayload.user.username || "Admin/Staff";
    } catch (e) {
      return "Pengguna Tidak Dikenal";
    }
  };

  const currentUsername = getUsernameFromToken(token);

  const onSubmitPassword = async (data) => {
    setIsSubmitting(true);
    try {
      await axios.put("/api/auth/password", {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        newPasswordConfirm: data.confirmNewPassword,
      });

      toast.success("Kata sandi berhasil diubah. Silakan login kembali.");
      logout();
    } catch (err) {
      const errorMsg = err.response?.data?.msg || "Gagal mengubah kata sandi.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
      reset();
    }
  };

  return (
    <div className="animate-fade-in-up max-w-2xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <Card className="!p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-none shadow-xl shadow-indigo-200">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/30 flex items-center justify-center text-4xl shadow-inner">
            👤
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              {currentUsername}
            </h1>
            <p className="text-indigo-100 font-medium opacity-90 text-lg">
              {userRole?.toUpperCase() || "USER"}
            </p>
            <div className="mt-4 flex gap-2 justify-center md:justify-start">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold border border-white/10 shadow-sm">
                Active Now
              </span>
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold border border-white/10 shadow-sm">
                WMS v1.0
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password Form */}
      <Card
        title="Ganti Kata Sandi"
        className="border border-gray-100 shadow-lg shadow-gray-100/50"
      >
        <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-5">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Untuk keamanan, Anda akan diminta login kembali setelah
                  mengubah kata sandi.
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Password Lama"
            type="password"
            {...register("oldPassword")}
            error={errors.oldPassword?.message}
            placeholder="Masukkan password saat ini"
          />

          <Input
            label="Password Baru"
            type="password"
            {...register("newPassword")}
            error={errors.newPassword?.message}
            placeholder="Minimal 6 karakter"
          />

          <Input
            label="Konfirmasi Password Baru"
            type="password"
            {...register("confirmNewPassword")}
            error={errors.confirmNewPassword?.message}
            placeholder="Ulangi password baru"
          />

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              variant="danger"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full md:w-auto"
            >
              Ubah Kata Sandi
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default Profile;
