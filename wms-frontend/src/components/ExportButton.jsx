
import React, { useState, useEffect } from 'react';
import { CSVLink } from 'react-csv'; // Import CSVLink

function ExportButton({ data, headers, filename, children }) {
  // Jika data berupa fungsi (untuk async fetching), kita panggil fungsi itu
  const finalData = typeof data === 'function' ? data() : data;
  
  // Render loading state jika data berupa Promise (jika kita menggunakan fungsi async)
  const [loading, setLoading] = useState(false);
  const [dataToExport, setDataToExport] = useState(null);

  // Logic untuk menangani fungsi asynchronous (saat data=fungsi)
  useEffect(() => {
    if (typeof data === 'function') {
      setLoading(true);
      data().then(res => {
        setDataToExport(res);
        setLoading(false);
      });
    } else {
      setDataToExport(data);
    }
  }, [data]);


  if (loading) {
      return (
          <button className="bg-indigo-400 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50" disabled>
              Memproses...
          </button>
      );
  }

  // Pastikan data tidak kosong sebelum merender CSVLink
  if (!dataToExport || dataToExport.length === 0) {
    return (
      <button 
        className="bg-gray-400 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
        disabled
      >
        {children || 'Ekspor Data'}
      </button>
    );
  }

  return (
    <CSVLink
      data={dataToExport}
      headers={headers}
      filename={filename}
      // Tambahkan style di sini
      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition"
    >
      {children || 'Ekspor Data'}
    </CSVLink>
  );
}

export default ExportButton;