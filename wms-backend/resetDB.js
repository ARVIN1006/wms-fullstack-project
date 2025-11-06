const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
  console.log('Memulai proses reset database...');
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Menghapus tabel-tabel lama...');
    await client.query('DROP TABLE IF EXISTS stock_levels CASCADE');
    await client.query('DROP TABLE IF EXISTS transaction_items CASCADE');
    await client.query('DROP TABLE IF EXISTS transactions CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS locations CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('Semua tabel lama berhasil dihapus.');

    const sql = fs.readFileSync(path.join(__dirname, 'database.sql')).toString();
    
    console.log('Membuat ulang struktur tabel...');
    await client.query(sql);
    console.log('Struktur tabel baru berhasil dibuat.');

    await client.query('COMMIT');
    console.log('✅ Database berhasil di-reset ke kondisi bersih!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Gagal me-reset database:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

resetDatabase();