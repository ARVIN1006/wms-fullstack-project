import { useState, useEffect } from 'react';

function LocationForm({ onSave, onClose, locationToEdit }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Efek untuk mengisi form saat mode Edit
  useEffect(() => {
    if (locationToEdit) {
      setIsEditing(true);
      setName(locationToEdit.name);
      setDescription(locationToEdit.description || '');
    } else {
      setIsEditing(false);
    }
  }, [locationToEdit]);

  // Fungsi saat tombol Simpan diklik
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) {
      alert('Nama Lokasi wajib diisi!');
      return;
    }
    onSave({ 
      id: locationToEdit?.id,
      name, 
      description
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Nama Lokasi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lokasi (cth: Rak A1) *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          
          {/* Deskripsi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi/Keterangan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LocationForm;