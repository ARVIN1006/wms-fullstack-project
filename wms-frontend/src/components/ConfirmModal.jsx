function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    // Latar belakang gelap (overlay)
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      
      {/* Kotak Modal */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        
        {/* Tombol Aksi */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel} // Panggil onCancel saat klik Batal
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm} // Panggil onConfirm saat klik Lanjutkan
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
          >
            Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;