import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import LocationForm from "../../components/LocationForm";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { useMasterData } from "../../hooks/useMasterData";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";

// --- KOMPONEN SKELETON BARU ---
const LocationListSkeleton = () => {
  return (
    <div className="p-6 animate-pulse space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-300 rounded w-48"></div>
        <div className="h-10 bg-gray-300 rounded w-32"></div>
      </div>
      <div className="h-64 bg-white/50 rounded-xl"></div>
    </div>
  );
};

function LocationList() {
  const {
    data: locations,
    loading,
    refetch: fetchLocations,
  } = useMasterData("/api/locations");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  // --- Handlers Modal & CRUD ---
  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingLocation(null);
  };

  const handleAddClick = () => {
    if (!isAdmin) return;
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
        toast.success("Lokasi berhasil diupdate!");
      } else {
        await axios.post("/api/locations", locationData);
        toast.success("Lokasi baru berhasil ditambahkan!");
      }
      handleCloseFormModal();
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menyimpan lokasi.");
    }
  };

  const handleDeleteClick = (location) => {
    if (!isAdmin) return;
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
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal menghapus lokasi.");
    } finally {
      handleCloseConfirmModal();
    }
  };

  const UtilizationBar = ({ percentage }) => {
    const perc = Math.min(Math.max(percentage, 0), 100); // Batasi 0-100
    let bgClass = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
    if (perc > 75)
      bgClass = "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]";
    if (perc > 90) bgClass = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";

    return (
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bgClass}`}
          style={{ width: `${perc}%` }}
        ></div>
      </div>
    );
  };

  // --- RENDER UTAMA ---
  if (loading) {
    return <LocationListSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">
            Manajemen Lokasi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Atur rak, zona, dan area penyimpanan gudang
          </p>
        </div>

        {isAdmin && (
          <Button onClick={handleAddClick} variant="primary" startIcon="+">
            Tambah Lokasi
          </Button>
        )}
      </div>

      {/* Tabel */}
      <Card>
        {locations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Tidak ada data lokasi.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 backdrop-blur-sm">
                <tr>
                  {[
                    "Nama Lokasi",
                    "Utilisasi Kapasitas",
                    "Deskripsi",
                    "Total Stok",
                    "Aksi",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/60 divide-y divide-gray-100">
                {locations.map((location) => (
                  <tr
                    key={location.id}
                    className="hover:bg-indigo-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {location.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <UtilizationBar
                            percentage={location.utilization_percentage}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {parseFloat(
                            location.utilization_percentage || 0
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {location.description || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="primary" size="sm">
                        {location.total_stock} Item
                      </Badge>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {isAdmin ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditClick(location)}
                            className="!px-2 !py-1"
                          >
                            ✏️
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteClick(location)}
                            className="!px-2 !py-1"
                          >
                            🗑️
                          </Button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">🔒</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
