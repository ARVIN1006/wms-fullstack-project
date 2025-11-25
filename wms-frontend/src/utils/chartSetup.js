import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,      // Wajib untuk Pie Chart
  PointElement,    // Wajib untuk Line Chart
  LineElement,     // Wajib untuk Line Chart
  Filler,          // Wajib untuk Fill di Line Chart
} from 'chart.js';

export function registerChartComponents() {
  ChartJS.register(
    // Wajib untuk semua grafik
    CategoryScale,
    LinearScale,
    
    // Elemen Wajib
    BarElement,
    ArcElement, 
    PointElement,
    LineElement,
    Filler, // Tambahkan Filler
    
    // Umum
    Title,
    Tooltip,
    Legend
  );
}