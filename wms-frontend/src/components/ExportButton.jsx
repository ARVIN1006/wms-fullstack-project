import React, { useState, useEffect, useRef } from "react";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-hot-toast";

function ExportButton({ data, headers, filename, children, className }) {
  const [loading, setLoading] = useState(false);
  const [dataToExport, setDataToExport] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch data if needed
  useEffect(() => {
    if (typeof data === "function") {
      setLoading(true);
      data()
        .then((res) => {
          setDataToExport(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setDataToExport(data);
    }
  }, [data]);

  const handlePdfExport = () => {
    if (!dataToExport || dataToExport.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(16);
      doc.text("Laporan WMS", 14, 15);
      doc.setFontSize(10);
      doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 22);

      // Table
      const tableHeaders = headers.map((h) => h.label);
      const tableBody = dataToExport.map((row) =>
        headers.map((h) => {
          // Handle nested properties or direct values
          const key = h.key;
          return row[key] !== undefined ? row[key] : "";
        })
      );

      autoTable(doc, {
        head: [tableHeaders],
        body: tableBody,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
      });

      doc.save(filename.replace(".csv", ".pdf"));
      toast.success("PDF berhasil diunduh!");
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat PDF");
    }
  };

  if (loading) {
    return (
      <button
        className={`bg-gray-400 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50 cursor-wait ${className}`}
        disabled
      >
        Memuat...
      </button>
    );
  }

  const isDisabled = !dataToExport || dataToExport.length === 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`inline-flex justify-center items-center gap-2 w-full rounded-md shadow-sm px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500 transition-all ${
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : className || "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {children || "Ekspor Data"}
        <svg
          className="-mr-1 ml-2 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className="py-1"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            <CSVLink
              data={dataToExport}
              headers={headers}
              filename={filename}
              className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <span className="mr-3 text-lg">📊</span> Ekspor CSV
            </CSVLink>
            <button
              onClick={handlePdfExport}
              className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors text-left"
            >
              <span className="mr-3 text-lg">⚠️</span>{" "}
              <span className="line-through text-gray-400">Ekspor PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
