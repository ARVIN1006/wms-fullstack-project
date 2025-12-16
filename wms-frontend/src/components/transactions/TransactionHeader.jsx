import React from "react";
import Select from "react-select";
import Card from "../common/Card";
import Input from "../common/Input";

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
      boxShadow: "none",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      zIndex: 10,
    }),
  };

  const currentParty =
    transactionType === "IN" ? watch("supplier") : watch("customer");

  return (
    <Card className="mb-6 !p-6 border border-gray-100 shadow-xl shadow-indigo-100/50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Supplier (IN) atau Customer (OUT) */}
        <div className="col-span-1">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            {transactionType === "IN" ? "Supplier" : "Pelanggan"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <Select
            options={partyOptions}
            value={currentParty}
            onChange={(option) => {
              const field = transactionType === "IN" ? "supplier" : "customer";
              setValue(field, option, { shouldValidate: true });
            }}
            placeholder={`Pilih ${
              transactionType === "IN" ? "Supplier" : "Pelanggan"
            }...`}
            isClearable={true}
            styles={customSelectStyles}
            className="text-sm"
          />
          <ErrorMessage
            error={transactionType === "IN" ? errors.supplier : errors.customer}
          />
        </div>

        {/* Catatan Transaksi */}
        <div className="col-span-2">
          <Input
            label="Catatan Transaksi"
            type="textarea"
            {...register("notes")}
            placeholder={
              transactionType === "IN"
                ? "Contoh: No. Faktur Invoice 12345..."
                : "Contoh: Pengiriman via JNE..."
            }
            className="h-[42px] min-h-[42px]" // Match height of standard input for alignment if single line, but it expands
          />
        </div>
      </div>
    </Card>
  );
};

export default TransactionHeader;
