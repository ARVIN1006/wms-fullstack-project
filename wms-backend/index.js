require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

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

// Middleware
app.use(cors());
app.use(express.json()); // Agar bisa membaca body JSON

// Gunakan Rute
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/reports/financial', financialRoutes);

app.get('/', (req, res) => {
  res.send('Halo! Server WMS sudah aktif 🚀');
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});