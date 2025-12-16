import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/common/Badge";

// --- DEFINISI SKEMA VALIDASI YUP ---
const validationSchema = yup.object().shape({
  product: yup.object().nullable().required("Produk wajib dipilih."),
  fromLocation: yup
    .object()
    .nullable()
    .required("Lokasi Asal wajib dipilih.")
    .test(
      "not-same-as-to",
      "Lokasi Asal tidak boleh sama dengan Lokasi Tujuan.",
      function (value) {
        return value?.value !== this.parent.toLocation?.value;
      }
    ),
  toLocation: yup
    .object()
    .nullable()
    .required("Lokasi Tujuan wajib dipilih.")
    .test(
      "not-same-as-from",
      "Lokasi Tujuan tidak boleh sama dengan Lokasi Asal.",
      function (value) {
        return value?.value !== this.parent.fromLocation?.value;
      }
    ),
  quantity: yup
    .number()
    .typeError("Jumlah harus berupa angka.")
    .min(1, "Jumlah minimal harus 1.")
    .required("Jumlah wajib diisi.")
    .test(
      "check-available-stock",
      "Jumlah melebihi stok yang tersedia di Lokasi Asal.",
      function (value) {
        // Gunakan availableStock dari state lokal yang telah diperbarui
        const { availableStock } = this.options.context;
        if (!availableStock && value > 0) return false;
        return value <= availableStock;
      }
    ),
  reason: yup.string().required("Alasan perpindahan wajib diisi."),
});
// --- END SKEMA ---

function MovementForm() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableStock, setAvailableStock] = useState(0); // State untuk stok yang tersedia

  // --- BARU: INISIALISASI REACT HOOK FORM dengan context ---
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError, // Untuk error kustom
    clearErrors, // Untuk menghapus error
  } = useForm({
    resolver: yupResolver(validationSchema),
    context: { availableStock }, // Kirim availableStock ke Yup
    defaultValues: {
      product: null,
      fromLocation: null,
      toLocation: null,
      quantity: 1,
      reason: "",
    },
  });

  // Watch values dari RHF
  const selectedProduct = watch("product");
  const selectedFromLocation = watch("fromLocation");
  const quantity = watch("quantity");

  // --- Ambil Data Master: Lokasi ---
  useEffect(() => {
    let isMounted = true;
    async function fetchLocations() {
      try {
        const response = await axios.get("/api/locations");
        if (isMounted) setLocations(response.data);
      } catch (error) {
        if (isMounted) toast.error("Gagal memuat data lokasi.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLocations();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- BARU: Efek untuk meng-AUTO-FILL LOKASI ASAL TERBAIK saat Produk Dipilih ---
  useEffect(() => {
    let isMounted = true;
    // Hanya auto-fill jika produk dipilih dan lokasi asal BELUM dipilih
    if (selectedProduct && !selectedFromLocation && locations.length > 0) {
      async function autoFillLocation() {
        try {
          const res = await axios.get(
            `/api/products/${selectedProduct.value}/main-stock`
          );
          const info = res.data;

          if (isMounted && info.quantity > 0) {
            const defaultLocation = locations
              .map((l) => ({ value: l.id, label: l.name }))
              .find((l) => l.value === info.location_id);

            if (defaultLocation) {
              setValue("fromLocation", defaultLocation, {
                shouldValidate: true,
              });
            }
          }
        } catch (err) {
          // Silently fail if product has no stock or API error
        }
      }
      autoFillLocation();
    }

    if (!selectedProduct) {
      setValue("fromLocation", null, { shouldValidate: true });
    }

    return () => {
      isMounted = false;
    };
  }, [selectedProduct, selectedFromLocation, locations, setValue]);

  // --- Efek untuk mengecek stok yang tersedia (REAL-TIME) ---
  const checkStock = useCallback(async () => {
    if (selectedProduct && selectedFromLocation) {
      try {
        const res = await axios.get(
          `/api/products/${selectedProduct.value}/main-stock?locationId=${selectedFromLocation.value}`
        );
        const currentStock = res.data.quantity || 0;
        setAvailableStock(currentStock);

        if (quantity > currentStock) {
          setError("quantity", {
            type: "manual",
            message: `Stok tersedia: ${currentStock} unit. Jumlah perpindahan melebihi stok.`,
          });
        } else {
          clearErrors("quantity");
        }
      } catch (err) {
        setAvailableStock(0);
        setError("quantity", {
          type: "manual",
          message: "Gagal mendapatkan stok lokasi asal.",
        });
      }
    } else {
      setAvailableStock(0);
      clearErrors("quantity");
    }
  }, [selectedProduct, selectedFromLocation, quantity, setError, clearErrors]);

  // Panggil checkStock saat Product, Location, atau Quantity berubah
  useEffect(() => {
    checkStock();
  }, [checkStock]);

  // --- Fungsi Pencarian Produk Asynchronous ---
  const loadProductOptions = async (inputValue) => {
    try {
      const response = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}`
      );
      return response.data.products.map((p) => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`,
      }));
    } catch (err) {
      return [];
    }
  };

  // --- Fungsi Submit Utama ---
  const onSubmit = async (data) => {
    try {
      const payload = {
        product_id: data.product.value,
        from_location_id: data.fromLocation.value,
        to_location_id: data.toLocation.value,
        quantity: parseInt(data.quantity),
        reason: data.reason,
      };

      await axios.post("/api/movements", payload);
      toast.success("Perpindahan stok berhasil dicatat!");
      navigate("/movements");
    } catch (err) {
      const errorMsg =
        err.response?.data?.msg || "Gagal mencatat perpindahan stok.";
      toast.error(errorMsg);
    }
  };

  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: l.name,
  }));

  const ErrorMessage = ({ error }) => {
    return error ? (
      <p className="text-red-500 text-xs mt-1 font-medium">{error.message}</p>
    ) : null;
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderColor: "#e5e7eb",
      borderRadius: "0.75rem",
      padding: "2px",
      "&:hover": {
        borderColor: "#cbd5e1",
      },
      boxShadow: "none", // You might want to add focus styles if needed
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      zIndex: 10,
    }),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
          Form Perpindahan Stok
        </h1>
        <p className="text-gray-500 mt-2">
          Pindahkan stok antar lokasi gudang dengan mudah
        </p>
      </div>

      <Card className="!p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Produk */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Produk <span className="text-red-500">*</span>
            </label>
            <AsyncSelect
              loadOptions={loadProductOptions}
              defaultOptions
              value={selectedProduct}
              onChange={(option) =>
                setValue("product", option, { shouldValidate: true })
              }
              placeholder="Ketik SKU atau Nama Produk..."
              isClearable={true}
              styles={customSelectStyles}
              className="text-sm"
            />
            <ErrorMessage error={errors.product} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lokasi Asal */}
            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Dari Lokasi <span className="text-red-500">*</span>
              </label>
              <Select
                options={locationOptions}
                value={selectedFromLocation}
                onChange={(option) =>
                  setValue("fromLocation", option, { shouldValidate: true })
                }
                placeholder="Pilih Lokasi Asal"
                isClearable={true}
                styles={customSelectStyles}
                className="text-sm"
              />
              <ErrorMessage error={errors.fromLocation} />

              {/* Stok Info Overlay / Badge */}
              {selectedProduct && selectedFromLocation && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Stok Tersedia:</span>
                  <Badge
                    variant={availableStock > 0 ? "success" : "danger"}
                    size="sm"
                  >
                    {availableStock} Unit
                  </Badge>
                </div>
              )}
            </div>

            {/* Lokasi Tujuan */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Ke Lokasi <span className="text-red-500">*</span>
              </label>
              <Select
                options={locationOptions}
                value={watch("toLocation")}
                onChange={(option) =>
                  setValue("toLocation", option, { shouldValidate: true })
                }
                placeholder="Pilih Lokasi Tujuan"
                isClearable={true}
                styles={customSelectStyles}
                className="text-sm"
              />
              <ErrorMessage error={errors.toLocation} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Jumlah Pindah */}
            <div>
              <Input
                label="Jumlah Pindah *"
                type="number"
                min="1"
                {...register("quantity", { valueAsNumber: true })}
                error={errors.quantity?.message}
                placeholder="0"
              />
            </div>
            {/* Alasan */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Alasan Perpindahan <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register("reason")}
                className={`w-full px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-gray-800 resize-none h-[42px] min-h-[42px] ${
                  errors.reason ? "border-red-500 focus:ring-red-200" : ""
                }`}
                placeholder="Contoh: Penataan ulang gudang..."
              />
              <ErrorMessage error={errors.reason} />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full md:w-auto"
            >
              Konfirmasi Perpindahan
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default MovementForm;
