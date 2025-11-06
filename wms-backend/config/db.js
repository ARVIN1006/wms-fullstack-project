const { Pool } = require('pg');
require('dotenv').config();

// Membuat pool koneksi (kumpulan koneksi siap pakai)
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Tes koneksi saat file ini pertama kali dijalankan
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Gagal terkoneksi ke Database:', err.message);
  }
  console.log('✅ Berhasil terkoneksi ke Database PostgreSQL!');
  release(); // Kembalikan koneksi ke pool
});

module.exports = pool;