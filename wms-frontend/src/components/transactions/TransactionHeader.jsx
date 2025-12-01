import React from "react";
import Select from "react-select";

const TransactionHeader = ({
  transactionType,
  control,
  register,
  errors,
  suppliers,
  customers,
  setValue,
  watch,
}) => {
  const partyOptions =
    transactionType === "IN"
      ? suppliers.map((s) => ({ value: s.id, label: s.name }))
      : customers.map((c) => ({ value: c.id, label: c.name }));

  // Helper untuk menampilkan error
  const ErrorMessage = ({ error }) => {
    return error ? (
      <p className="text-red-500 text-xs mt-1">{error.message}</p>
    ) : null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
      {/* Supplier (IN) atau Customer (OUT) */}
      <div className="col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {transactionType === "IN" ? "Pilih Supplier *" : "Pilih Pelanggan *"}
        </label>
        <Select
          options={partyOptions}
          // Memilih field yang tepat berdasarkan transactionType
          value={
            transactionType === "IN" ? watch("supplier") : watch("customer")
          }
          onChange={(option) => {
            const field = transactionType === "IN" ? "supplier" : "customer";
            setValue(field, option, { shouldValidate: true });
          }}
          placeholder={`Pilih ${
            transactionType === "IN" ? "Supplier" : "Pelanggan"
          }...`}
          isClearable={true}
          classNamePrefix="react-select"
        />
        {/* Menampilkan error header */}
        <ErrorMessage
          error={transactionType === "IN" ? errors.supplier : errors.customer}
        />
      </div>

      {/* Catatan Transaksi */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Catatan
        </label>
        <textarea
          {...register("notes")}
          className="w-full px-3 py-2 border rounded-md shadow-sm"
        />
      </div>
    </div>
  );
};

export default TransactionHeader;
