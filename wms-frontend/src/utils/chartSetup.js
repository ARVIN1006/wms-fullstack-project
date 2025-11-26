import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement, // Diperlukan untuk Bar Chart di Dashboard
  Title,
  Tooltip,
  Legend,
  ArcElement,      // Diperlukan untuk Pie Chart
  // PointElement, LineElement, Filler DIHAPUS dari impor global
} from 'chart.js';

export function registerChartComponents() {
  ChartJS.register(
    // Wajib untuk semua grafik
    CategoryScale,
    LinearScale,
    
    // Elemen yang Diperlukan Secara Global
    BarElement,
    ArcElement, 
    
    // Umum
    Title,
    Tooltip,
    Legend
  );
}