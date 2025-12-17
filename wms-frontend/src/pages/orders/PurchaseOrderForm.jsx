import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

const schema = yup.object().shape({
  supplier: yup.object().nullable().required("Supplier wajib dipilih."),
  notes: yup.string(),
  items: yup
    .array()
    .of(
      yup.object().shape({
        product: yup.object().nullable().required("Produk wajib dipilih."),
        quantity: yup.number().min(1, "Min 1").required("Wajib diisi."),
        unit_price: yup.number().min(0, "Min 0").required("Wajib diisi."),
      })
    )
    .min(1, "Minimal 1 item."),
});

function PurchaseOrderForm() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { items: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  useEffect(() => {
    axios
      .get("/api/suppliers?page=1&limit=1000")
      .then((res) =>
        setSuppliers(
          res.data.suppliers.map((s) => ({ value: s.id, label: s.name }))
        )
      )
      .catch((err) => toast.error("Gagal muat supplier"));
  }, []);

  const loadProductOptions = async (inputValue) => {
    try {
      const res = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}`
      );
      return res.data.products.map((p) => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`,
        purchase_price: p.purchase_price,
      }));
    } catch (err) {
      return [];
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        supplier_id: data.supplier.value,
        notes: data.notes,
        items: data.items.map((item) => ({
          product_id: item.product.value,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };
      await axios.post("/api/orders/purchase", payload);
      toast.success("Purchase Order berhasil dibuat!");
      navigate("/orders/purchase");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal membuat PO");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6">
          Buat Purchase Order Baru
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <Controller
                name="supplier"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={suppliers}
                    placeholder="Pilih Supplier..."
                  />
                )}
              />
              <p className="text-red-500 text-xs mt-1">
                {errors.supplier?.message}
              </p>
            </div>
            <div>
              <Input
                label="Catatan"
                {...register("notes")}
                placeholder="Catatan tambahan..."
              />
            </div>
          </div>

          {/* Items */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Item Pesanan
              </h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  append({ product: null, quantity: 1, unit_price: 0 })
                }
                icon="+"
              >
                Tambah Item
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg"
                >
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">
                      Produk
                    </label>
                    <Controller
                      name={`items.${index}.product`}
                      control={control}
                      render={({ field }) => (
                        <AsyncSelect
                          {...field}
                          loadOptions={loadProductOptions}
                          defaultOptions
                          placeholder="Cari Produk..."
                          onChange={(val) => {
                            field.onChange(val);
                            setValue(
                              `items.${index}.unit_price`,
                              val.purchase_price
                            );
                          }}
                        />
                      )}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.items?.[index]?.product?.message}
                    </p>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      label="Qty"
                      {...register(`items.${index}.quantity`)}
                      min="1"
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.items?.[index]?.quantity?.message}
                    </p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      label="Harga Beli"
                      {...register(`items.${index}.unit_price`)}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.items?.[index]?.unit_price?.message}
                    </p>
                  </div>
                  <div className="pb-3">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-red-500 text-xs mt-1">{errors.items?.message}</p>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Simpan PO
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PurchaseOrderForm;
