import { useState, useEffect } from 'react';

function CustomerForm({ onSave, onClose, customerToEdit }) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Efek untuk mengisi form saat mode Edit
  useEffect(() => {
    if (customerToEdit) {
      setIsEditing(true);
      setName(customerToEdit.name);
      setContactPerson(customerToEdit.contact_person || '');
      setPhone(customerToEdit.phone || '');
      setAddress(customerToEdit.address || '');
    } else {
      setIsEditing(false);
    }
  }, [customerToEdit]);

  // Fungsi saat tombol Simpan diklik
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) {
      alert('Nama Pelanggan wajib diisi!');
      return;
    }
    onSave({ 
      id: customerToEdit?.id,
      name, 
      contact_person: contactPerson, 
      phone, 
      address 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {isEditing ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Nama Pelanggan */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          
          {/* Contact Person */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Telepon */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Alamat */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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

export default CustomerForm;