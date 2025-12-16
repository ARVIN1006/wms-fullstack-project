import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

const validationSchema = yup.object().shape({
  product: yup.object().nullable().required("Produk wajib dipilih."),
  location: yup.object().nullable().required("Lokasi wajib dipilih."),
  physicalCount: yup
    .number()
    .typeError("Hitungan fisik harus berupa angka.")
    .min(0, "Hitungan fisik tidak boleh negatif.")
    .required("Hitungan fisik wajib diisi."),
  notes: yup.string().when("physicalCount", {
    is: (val) => val !== yup.ref("$systemCount"),
    then: (schema) =>
      schema.required("Catatan wajib diisi jika ada perbedaan stok."),
    otherwise: (schema) => schema.nullable(),
  }),
});

function StockOpname() {
  const [locations, setLocations] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [systemCount, setSystemCount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(validationSchema),
    context: { systemCount },
    defaultValues: {
      product: null,
      location: null,
      physicalCount: 0,
      notes: "",
    },
  });

  const selectedProduct = watch("product");
  const selectedLocation = watch("location");
  const physicalCount = watch("physicalCount");

  useEffect(() => {
    let isMounted = true;
    async function fetchLocations() {
      try {
        const response = await axios.get("/api/locations");
        if (isMounted) setLocations(response.data);
      } catch (error) {
        if (isMounted) toast.error("Gagal memuat data lokasi.");
      } finally {
        if (isMounted) setLoadingMaster(false);
      }
    }
    fetchLocations();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchSystemCount = useCallback(async () => {
    if (!selectedProduct || !selectedLocation) {
      setSystemCount(null);
      return;
    }

    try {
      const res = await axios.get(
        `/api/stocks/specific/${selectedProduct.value}/${selectedLocation.value}`
      );
      const count = res.data.system_count || 0;
      setSystemCount(count);
      setValue("physicalCount", count);
    } catch (err) {
      setSystemCount(null);
      toast.error("Gagal memuat stok sistem untuk lokasi ini.");
    }
  }, [selectedProduct, selectedLocation, setValue]);

  useEffect(() => {
    fetchSystemCount();
  }, [fetchSystemCount]);

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

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    const isAdjustmentNeeded =
      parseInt(data.physicalCount) !== parseInt(systemCount);

    if (
      !isAdjustmentNeeded &&
      parseInt(data.physicalCount) === parseInt(systemCount)
    ) {
      toast.error(
        "Hitungan fisik sama dengan stok sistem. Tidak ada penyesuaian yang diperlukan."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        product_id: data.product.value,
        location_id: data.location.value,
        adjustment_quantity:
          parseInt(data.physicalCount) - parseInt(systemCount),
        physical_count: parseInt(data.physicalCount),
        system_count: parseInt(systemCount),
        notes: data.notes,
      };

      await axios.post("/api/stocks/opname", payload);

      toast.success("Stok opname berhasil dicatat dan disesuaikan!");
      reset();
      setSystemCount(null);
    } catch (err) {
      const errorMsg =
        err.response?.data?.msg ||
        "Gagal mencatat stok opname. Cek izin dan data.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
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

  const difference = parseInt(physicalCount || 0) - parseInt(systemCount || 0);
  const isDifference = difference !== 0;

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderColor: "#e5e7eb",
      borderRadius: "0.75rem",
      padding: "2px",
      minHeight: "42px",
      "&:hover": { borderColor: "#cbd5e1" },
      boxShadow: "none",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      zIndex: 20,
    }),
  };

  if (loadingMaster) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <Card className="!p-8 border-indigo-50 shadow-xl shadow-indigo-100/50">
        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
          <div className="p-4 bg-indigo-100 rounded-2xl text-indigo-600 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
              Stock Opname
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Sesuaikan stok fisik dengan sistem untuk akurasi inventaris
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* --- SELEKSI BARANG & LOKASI --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
            {/* 1. Produk */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Produk <span className="text-red-500">*</span>
              </label>
              <AsyncSelect
                loadOptions={loadProductOptions}
                defaultOptions
                value={selectedProduct}
                onChange={(option) => {
                  setValue("product", option, { shouldValidate: true });
                  setSystemCount(null);
                  setValue("physicalCount", 0);
                }}
                placeholder="Cari Produk (SKU/Nama)..."
                isClearable={true}
                styles={customSelectStyles}
                className="text-sm"
              />
              <ErrorMessage error={errors.product} />
            </div>

            {/* 2. Lokasi */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Lokasi <span className="text-red-500">*</span>
              </label>
              <Select
                options={locationOptions}
                value={selectedLocation}
                onChange={(option) => {
                  setValue("location", option, { shouldValidate: true });
                  setSystemCount(null);
                  setValue("physicalCount", 0);
                }}
                placeholder="Pilih Lokasi"
                isClearable={true}
                styles={customSelectStyles}
                className="text-sm"
              />
              <ErrorMessage error={errors.location} />
            </div>
          </div>

          {/* --- HASIL HITUNGAN STOK --- */}
          {selectedProduct && selectedLocation && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100">
              <h2 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-6">
                Verifikasi Stok
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stok Sistem */}
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Stok Sistem
                  </span>
                  <span className="text-4xl font-black text-gray-700 mt-2">
                    {systemCount !== null ? (
                      systemCount
                    ) : (
                      <span className="animate-pulse">...</span>
                    )}
                  </span>
                </div>

                {/* Hitungan Fisik */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-indigo-200 flex flex-col relative group focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                  <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest text-center mb-2">
                    Hitungan Fisik
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register("physicalCount", { valueAsNumber: true })}
                    className="w-full text-center text-4xl font-black text-indigo-600 border-none focus:ring-0 p-0 bg-transparent outline-none"
                    placeholder="0"
                  />
                  <ErrorMessage error={errors.physicalCount} />
                </div>

                {/* Selisih */}
                <div
                  className={`p-6 rounded-2xl shadow-sm border flex flex-col items-center justify-center transition-all duration-300 ${
                    isDifference
                      ? difference > 0
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-rose-50 border-rose-200"
                      : "bg-gray-50 border-gray-200 opacity-60"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isDifference
                        ? difference > 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                        : "text-gray-400"
                    }`}
                  >
                    Selisih / Adjust
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    {isDifference && (
                      <span className="text-2xl">
                        {difference > 0 ? "📈" : "📉"}
                      </span>
                    )}
                    <span
                      className={`text-4xl font-black ${
                        isDifference
                          ? difference > 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                          : "text-gray-400"
                      }`}
                    >
                      {difference > 0 ? `+${difference}` : difference}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Catatan */}
          <div
            className={`transition-all duration-500 ease-in-out ${
              isDifference
                ? "opacity-100 max-h-48 translate-y-0"
                : "opacity-0 max-h-0 -translate-y-4 overflow-hidden"
            }`}
          >
            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
              <label className="flex items-center gap-2 text-sm font-bold text-rose-700 mb-2">
                <span>📝</span> Catatan Penyesuaian (Wajib)
              </label>
              <Input
                type="textarea"
                {...register("notes")}
                placeholder="Jelaskan kenapa terjadi selisih stok (e.g., Barang rusak, Hilang, Salah input)..."
                error={errors.notes?.message}
                className="!bg-white !h-24"
              />
            </div>
          </div>

          {/* Tombol Submit */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedProduct ||
                !selectedLocation ||
                systemCount === null
              }
              isLoading={isSubmitting}
              variant="primary"
              size="lg"
              className="w-full md:w-auto px-8"
            >
              Simpan Opname
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default StockOpname;
