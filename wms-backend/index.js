require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const http = require('http');
const { Server } = require("socket.io");

// Impor Rute
const productRoutes = require('./routes/productRoutes');
const locationRoutes = require('./routes/locationRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const stockRoutes = require('./routes/stockRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const movementRoutes = require('./routes/movementRoutes');
const financialRoutes = require('./routes/financialRoutes');


const app = express();
const PORT = process.env.PORT || 5000;

// --- SETUP SOCKET.IO ---
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});

// Middleware Global
app.use(cors());
app.use(express.json());

// BARU: MIDDLEWARE PENYUNTIK IO
// Middleware ini harus diletakkan sebelum semua rute yang menggunakan req.io
app.use((req, res, next) => {
    req.io = io;
    next();
});
// END MIDDLEWARE PENYUNTIK IO

// Gunakan Rute (Sekarang req.io tersedia di semua rute di bawah ini)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/locations', locationRoutes);

// Fix: transactionRoutes harus berada di sini
app.use('/api/transactions', transactionRoutes); 

app.use('/api/stocks', stockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);

// Fix: movementRoutes harus berada di sini
app.use('/api/movements', movementRoutes); 

app.use('/api/reports/financial', financialRoutes);

app.get('/', (req, res) => {
  res.send('Halo! Server WMS sudah aktif 🚀');
});

// Logika Koneksi Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 Seorang pengguna terhubung (Socket.IO)');
  
  socket.on('disconnect', () => {
    console.log('❌ Pengguna terputus');
  });
});

server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});