import { useState, useEffect } from 'react';
// --- BARU: Import Hook Form dan Yup ---
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// --- DEFINISI SKEMA VALIDASI YUP ---
const validationSchema = yup.object().shape({
    name: yup.string().required('Nama Pelanggan wajib diisi.'),
    contactPerson: yup.string().nullable(),
    phone: yup.string().nullable(),
    address: yup.string().nullable(),
});

function CustomerForm({ onSave, onClose, customerToEdit }) {
  // --- BARU: INISIALISASI REACT HOOK FORM ---
  const { 
    register, 
    handleSubmit, 
    setValue, 
    formState: { errors } 
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
        name: '',
        contactPerson: '',
        phone: '',
        address: '',
    }
  });
  
  const [isEditing, setIsEditing] = useState(false);

  // Efek untuk mengisi form saat mode Edit
  useEffect(() => {
    if (customerToEdit) {
      setIsEditing(true);
      // Mengisi nilai dengan setValue dari RHF
      setValue('name', customerToEdit.name);
      setValue('contactPerson', customerToEdit.contact_person || '');
      setValue('phone', customerToEdit.phone || '');
      setValue('address', customerToEdit.address || '');
    } else {
      setIsEditing(false);
      // Reset form ke default values saat mode Add
      setValue('name', '');
      setValue('contactPerson', '');
      setValue('phone', '');
      setValue('address', '');
    }
  }, [customerToEdit, setValue]);

  // Fungsi saat tombol Simpan diklik (MENGGUNAKAN RHF handleSubmit)
  const onSubmit = (data) => {
    onSave({ 
      id: customerToEdit?.id,
      name: data.name, 
      contact_person: data.contactPerson, 
      phone: data.phone, 
      address: data.address
    });
  };

  // Helper untuk menampilkan error
  const ErrorMessage = ({ error }) => {
    return error ? <p className="text-red-500 text-xs mt-1">{error.message}</p> : null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {customerToEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
        </h2>
        
        {/* MENGGUNAKAN handleSubmit DARI RHF */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Nama Pelanggan */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan *</label>
            <input
              type="text"
              {...register('name')} // Integrasi RHF
              className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            <ErrorMessage error={errors.name} />
          </div>
          
          {/* Contact Person */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input
              type="text"
              {...register('contactPerson')} // Integrasi RHF
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Telepon */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
            <input
              type="text"
              {...register('phone')} // Integrasi RHF
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Alamat */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              {...register('address')} // Integrasi RHF
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