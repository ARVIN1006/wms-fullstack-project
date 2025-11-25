import { useState, useEffect } from "react";
// --- BARU: Import Hook Form dan Yup ---
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// --- DEFINISI SKEMA VALIDASI YUP ---
const validationSchema = yup.object().shape({
    name: yup.string().required('Nama Lokasi wajib diisi.'),
    description: yup.string().nullable(),
    maxCapacityM3: yup.number()
        .typeError('Kapasitas harus berupa angka.')
        .min(0.01, 'Kapasitas minimal harus 0.01 m³.')
        .required('Kapasitas wajib diisi.'),
});

function LocationForm({ onSave, onClose, locationToEdit }) {
  // State lokal untuk isEditing (dipertahankan)
  const [isEditing, setIsEditing] = useState(false);
  
  // --- BARU: INISIALISASI REACT HOOK FORM ---
  const { 
    register, 
    handleSubmit, 
    setValue, 
    formState: { errors } 
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
        name: "",
        description: "",
        maxCapacityM3: 100, // Default nilai awal
    }
  });

  // Efek untuk mengisi form saat mode Edit
  useEffect(() => {
    if (locationToEdit) {
      setIsEditing(true);
      // Mengisi nilai dengan setValue dari RHF
      setValue('name', locationToEdit.name);
      setValue('description', locationToEdit.description || "");
      // Pastikan nilai kapasitas adalah number
      setValue('maxCapacityM3', parseFloat(locationToEdit.max_capacity_m3) || 100);
    } else {
      setIsEditing(false);
      // Reset form ke default values saat mode Add
      setValue('name', "");
      setValue('description', "");
      setValue('maxCapacityM3', 100);
    }
  }, [locationToEdit, setValue]);

  // Fungsi saat tombol Simpan diklik (MENGGUNAKAN RHF handleSubmit)
  const onSubmit = (data) => {
    onSave({
      id: locationToEdit?.id,
      name: data.name,
      description: data.description,
      max_capacity_m3: parseFloat(data.maxCapacityM3), // Kirim sebagai float
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
          {isEditing ? "Edit Lokasi" : "Tambah Lokasi Baru"}
        </h2>

        {/* MENGGUNAKAN handleSubmit DARI RHF */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Nama Lokasi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lokasi (cth: Rak A1) *
            </label>
            <input
              type="text"
              {...register('name')} // Integrasi RHF
              className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            <ErrorMessage error={errors.name} />
          </div>

          {/* Deskripsi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi/Keterangan
            </label>
            <textarea
              {...register('description')} // Integrasi RHF
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          {/* Input Kapasitas */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kapasitas Maksimum (m³) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register('maxCapacityM3')} // Integrasi RHF
              className={`w-full px-3 py-2 border rounded-md shadow-sm ${errors.maxCapacityM3 ? 'border-red-500' : 'border-gray-300'}`}
            />
            <ErrorMessage error={errors.maxCapacityM3} />
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