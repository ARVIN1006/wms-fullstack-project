import React from 'react';
import { CSVLink } from 'react-csv'; // Import CSVLink

function ExportButton({ data, headers, filename, children }) {
  // Pastikan data tidak kosong sebelum merender
  if (!data || data.length === 0) {
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
      data={data}
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