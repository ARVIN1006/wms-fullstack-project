import React from "react";
import TransactionItemRow from "./TransactionItemRow";
import Select from "react-select";
import Button from "../common/Button";
import Card from "../common/Card";

const TransactionItemsTable = ({
  fields,
  append,
  remove,
  register,
  errors,
  transactionType,
  locations,
  stockStatuses,
  loadProductOptions,
  setValue,
  watch,
  itemStockInfo,
  fetchStockInfo,
  categories,
  selectedCategoryFilter,
}) => {
  const categoryOptions = [
    { value: "", label: "Semua Kategori" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

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
      boxShadow: "none",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      zIndex: 10,
    }),
  };

  return (
    <div className="space-y-6">
      <Card className="!p-4 bg-gray-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800">
              Detail Item Transaksi
            </h2>
            <p className="text-gray-500 text-sm">
              Tambahkan produk yang akan{" "}
              {transactionType === "IN" ? "masuk" : "keluar"}
            </p>
          </div>

          <div className="w-full md:w-72">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Filter Kategori Produk
            </label>
            <Select
              options={categoryOptions}
              value={selectedCategoryFilter}
              onChange={(option) => setValue("categoryFilter", option)}
              placeholder="Semua Kategori"
              isClearable={true}
              styles={customSelectStyles}
              className="text-sm"
            />
          </div>
        </div>
      </Card>

      {errors.items && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium animate-pulse">
          ⚠️ Minimal harus ada 1 item transaksi.
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <TransactionItemRow
            key={field.id}
            index={index}
            register={register}
            errors={errors}
            remove={remove}
            transactionType={transactionType}
            locations={locations}
            stockStatuses={stockStatuses}
            loadProductOptions={loadProductOptions}
            setValue={setValue}
            watch={watch}
            itemStockInfo={itemStockInfo}
            fetchStockInfo={fetchStockInfo}
          />
        ))}
      </div>

      <div className="flex justify-center py-4 border-2 border-dashed border-gray-300 rounded-2xl hover:border-indigo-400 transition-colors bg-gray-50/30">
        <Button
          type="button"
          onClick={() =>
            append({
              product: null,
              location: null,
              stockStatus: stockStatuses.find((s) => s.name === "Good") || null,
              quantity: 1,
              purchasePrice: 0,
              sellingPrice: 0,
              batchNumber: "",
              expiryDate: "",
            })
          }
          variant="success"
          startIcon="+"
        >
          Tambah Item Baru
        </Button>
      </div>
    </div>
  );
};

export default TransactionItemsTable;
