const db = require('./config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs'); // Kita butuh ini untuk enkripsi password admin

async function superSeeder() {
  console.log('Memulai proses SUPER SEED...');
  const client = await db.connect(); // Ambil satu koneksi
  
  try {
    // 1. MULAI TRANSAKSI BESAR
    await client.query('BEGIN');
    console.log('Transaksi dimulai.');

    // 2. HAPUS SEMUA TABEL LAMA (dari resetDb.js)
    console.log('Menghapus tabel-tabel lama...');
    await client.query('DROP TABLE IF EXISTS stock_levels CASCADE');
    await client.query('DROP TABLE IF EXISTS transaction_items CASCADE');
    await client.query('DROP TABLE IF EXISTS transactions CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS locations CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');

    // 3. BUAT ULANG TABEL (dari setupDb.js)
    console.log('Membuat ulang struktur tabel...');
    const sql = fs.readFileSync(path.join(__dirname, 'database.sql')).toString();
    await client.query(sql);

    // 4. SEED USERS
    console.log('Membuat user admin...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);
    await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      ['admin', passwordHash]
    );

    // 5. SEED LOCATIONS
    console.log('Membuat lokasi dummy...');
    const locRes = await client.query(
      "INSERT INTO locations (name, description) VALUES ('Rak A1', 'Lokasi barang fast-moving'), ('Rak B2', 'Lokasi barang slow-moving') RETURNING id"
    );
    const locId1 = locRes.rows[0].id;
    const locId2 = locRes.rows[1].id;

    // 6. SEED PRODUCTS
    console.log('Membuat 30 produk dummy...');
    const productIds = [];
    for (let i = 1; i <= 30; i++) {
      const sku = `DUMMY-${i.toString().padStart(3, '0')}`;
      const name = `Produk Dummy #${i}`;
      const res = await client.query(
        'INSERT INTO products (sku, name, unit) VALUES ($1, $2, $3) RETURNING id',
        [sku, name, 'pcs']
      );
      productIds.push(res.rows[0].id);
    }
    console.log('30 produk dibuat.');

    // 7. SEED TRANSACTIONS (Paling penting!)
    console.log('Membuat 1 transaksi barang masuk...');
    // Buat 1 header transaksi
    const transRes = await client.query(
      "INSERT INTO transactions (type, notes) VALUES ('IN', 'Data seed awal') RETURNING id"
    );
    const transId = transRes.rows[0].id;

    // Masukkan 10 produk pertama (masing-masing 50 unit) ke Rak A1
    for (let i = 0; i < 10; i++) {
      const prodId = productIds[i];
      const qty = 50;

      // a. Catat di transaction_items
      await client.query(
        'INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity) VALUES ($1, $2, $3, $4)',
        [transId, prodId, locId1, qty]
      );
      
      // b. Update stock_levels (logic-nya sama seperti di API)
      await client.query(`
        INSERT INTO stock_levels (product_id, location_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
      `, [prodId, locId1, qty]);
    }
    console.log('10 produk berhasil di-stok.');

    // 8. SELESAI
    await client.query('COMMIT'); // Simpan semua perubahan
    console.log('✅ SUPER SEED BERHASIL! Database bersih dan siap dipakai.');

  } catch (err) {
    await client.query('ROLLBACK'); // Batalkan semua jika ada 1 error
    console.error('❌ SUPER SEED GAGAL:', err.message);
  } finally {
    client.release(); // Kembalikan koneksi
    process.exit(0); // Tutup script
  }
}

// Jalankan Super Seeder
superSeeder();