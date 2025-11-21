import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import LocationForm from '../components/LocationForm'; 
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';

function LocationList() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  // Fungsi Fetch Lokasi (dengan Total Stok)
  async function fetchLocations(isMounted) { // BARU: Terima flag isMounted
    try {
      if (isMounted) setLoading(true); // Cek sebelum set loading
      // API locations sekarang mengembalikan 'total_stock'
      const response = await axios.get(`/api/locations`); 
      if (isMounted) setLocations(response.data); // Cek sebelum set state
    } catch (err) {
      if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
        toast.error('Gagal memuat data lokasi.');
      }
    } finally {
      if (isMounted) setLoading(false); // Cek sebelum set loading
    }
  }

  // --- Perbaikan useEffect dengan Cleanup Function ---
  useEffect(() => {
    let isMounted = true; // BARU: Flag untuk cleanup
    fetchLocations(isMounted); // Kirim flag ke fungsi fetch

    return () => {
      isMounted = false; // Cleanup function
    };
  }, []);

  // --- Handlers Modal & CRUD (Logic tetap sama, hanya memanggil fetchLocations) ---
  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingLocation(null);
  };

  const handleAddClick = () => {
    setEditingLocation(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (location) => {
    if (!isAdmin) return;
    setEditingLocation(location);
    setIsFormModalOpen(true);
  };

  const handleSaveLocation = async (locationData) => {
    try {
      if (locationData.id) {
        await axios.put(`/api/locations/${locationData.id}`, locationData);
        toast.success('Lokasi berhasil diupdate!');
      } else {
        await axios.post('/api/locations', locationData);
        toast.success('Lokasi baru berhasil ditambahkan!');
      }
      handleCloseFormModal();
      fetchLocations(true); // Re-fetch
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menyimpan lokasi.');
    }
  };

  const handleDeleteClick = (location) => {
    setLocationToDelete(location);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setLocationToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!locationToDelete) return;
    try {
      await axios.delete(`/api/locations/${locationToDelete.id}`); 
      toast.success(`Lokasi "${locationToDelete.name}" berhasil dihapus.`);
      fetchLocations(true); // Re-fetch
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menghapus lokasi.');
    } finally {
      handleCloseConfirmModal();
    }
  };

  const UtilizationBar = ({ percentage }) => {
      const perc = Math.min(Math.max(percentage, 0), 100); // Batasi 0-100
      let bgColor = 'bg-green-500';
      if (perc > 75) bgColor = 'bg-yellow-500';
      if (perc > 90) bgColor = 'bg-red-500';
      
      return (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                  className={`${bgColor} h-2.5 rounded-full`} 
                  style={{ width: `${perc}%` }}
              ></div>
          </div>
      );
  };
  return (
    <div className="p-6 bg-white shadow-lg rounded-lg relative"> 
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Lokasi Gudang</h1>
        
        {/* Tombol Tambah (Hanya untuk Admin) */}
        {isAdmin && (
          <button onClick={handleAddClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            + Tambah Lokasi
          </button>
        )}
      </div>

      {/* Tabel */}
      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {/* PERBAIKAN WHITESPACE: Semua <th> berdekatan */}
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Lokasi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisasi Kapasitas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Stok Barang</th> 
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locations.map((location) => (
                  <tr key={location.id}>
                    {/* PERBAIKAN WHITESPACE: Semua <td> berdekatan */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{location.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                            <div className="w-2/3">
                                <UtilizationBar percentage={location.utilization_percentage} />
                            </div>
                            <span className="ml-2 text-xs font-medium text-gray-700">
                                {parseFloat(location.utilization_percentage || 0).toFixed(1)}%
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{location.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold">
                        {location.total_stock}
                    </td> 
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {/* Tombol Aksi (Hanya untuk Admin) */}
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleEditClick(location)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(location)} 
                            className="text-red-600 hover:text-red-900"
                          >
                            Hapus
                          </button>
                        </>
                      )}
                      {!isAdmin && (
                          <span className="text-gray-400 text-xs">Lihat saja</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Form */}
      {isFormModalOpen && (
        <LocationForm 
          onClose={handleCloseFormModal}
          onSave={handleSaveLocation}
          locationToEdit={editingLocation} 
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {isConfirmModalOpen && (
        <ConfirmModal
          title="Hapus Lokasi"
          message={`Apakah Anda yakin ingin menghapus lokasi "${locationToDelete?.name}"? Lokasi ini akan dihapus dari transaksi.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
}

export default LocationList;