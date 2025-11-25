const db = require("./config/db");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

async function superSeeder() {
  console.log("Memulai proses SUPER SEED PENUH...");
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    console.log(
      "Transaksi dimulai. Menghapus tabel lama (Prioritas Dependensi)..."
    );

    // --- 1. HAPUS TABEL ANAK & TRANSAKSI (URUTAN WAJIB BENAR) ---
    await client.query("DROP TABLE IF EXISTS transaction_items CASCADE");
    await client.query("DROP TABLE IF EXISTS stock_levels CASCADE");
    await client.query("DROP TABLE IF EXISTS transactions CASCADE");
    await client.query("DROP TABLE IF EXISTS movements CASCADE");

    // --- 2. HAPUS TABEL INDUK MASTER DATA & SISTEM ---
    await client.query("DROP TABLE IF EXISTS products CASCADE");
    await client.query("DROP TABLE IF EXISTS locations CASCADE");
    await client.query("DROP TABLE IF EXISTS users CASCADE");
    await client.query("DROP TABLE IF EXISTS suppliers CASCADE");
    await client.query("DROP TABLE IF EXISTS customers CASCADE");
    await client.query("DROP TABLE IF EXISTS categories CASCADE");
    await client.query("DROP TABLE IF EXISTS stock_statuses CASCADE");
    console.log("Semua tabel lama berhasil dihapus.");

    // --- 3. BUAT ULANG TABEL DARI database.sql ---
    console.log("Membuat ulang struktur tabel...");
    const sql = fs
      .readFileSync(path.join(__dirname, "database.sql"))
      .toString();
    await client.query(sql);

    // --- SEED DATA MASTER BARU ---

    // STATUSES & CATEGORIES
    const statusRes = await client.query(
      "INSERT INTO stock_statuses (name) VALUES ('Good'), ('Damaged'), ('Expired') RETURNING id"
    );
    const statusGoodId = statusRes.rows[0].id;
    const statusDamagedId = statusRes.rows[1].id;

    const categoryRes = await client.query(
      "INSERT INTO categories (name) VALUES ('Electronics'), ('Office Supplies') RETURNING id"
    );
    const categoryId1 = categoryRes.rows[0].id;
    const categoryId2 = categoryRes.rows[1].id;

    // 4. SEED USERS (Diperbaiki untuk ambil ID dengan aman)
    console.log("Membuat user admin dan 2 staff...");
    const salt = await bcrypt.genSalt(10);
    const passwordHashAdmin = await bcrypt.hash("password123", salt);

    const adminRes = await client.query(
      "INSERT INTO users (username, password_hash, role) VALUES ('admin', $1, 'admin') RETURNING id",
      [passwordHashAdmin]
    );
    const staff1Res = await client.query(
      "INSERT INTO users (username, password_hash, role) VALUES ('staff1', $1, 'staff') RETURNING id",
      [passwordHashAdmin]
    );
    const staff2Res = await client.query(
      "INSERT INTO users (username, password_hash, role) VALUES ('staff2', $1, 'staff') RETURNING id",
      [passwordHashAdmin]
    );

    // Ambil ID dengan pasti
    const adminUserId = adminRes.rows[0].id;
    const staffUserId1 = staff1Res.rows[0].id;
    const staffUserId2 = staff2Res.rows[0].id;
    console.log("User admin dan 2 staff dibuat.");

    // 5. LOCATIONS, SUPPLIERS, CUSTOMERS
    console.log("Membuat lokasi dummy...");
    const locRes = await client.query(
      "INSERT INTO locations (name, description, max_capacity_m3) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9) RETURNING id",
      [
        "RAK A1 (Elektronik)",
        "Lokasi barang fast-moving",
        50.0, // Kapasitas 50 m³
        "RAK B2 (Kantor)",
        "Lokasi barang slow-moving",
        100.0, // Kapasitas 100 m³
        "QA AREA",
        "Area Karantina",
        20.0, // Kapasitas 20 m³
      ]
    );
    const locIdA1 = locRes.rows[0].id;
    const locIdB2 = locRes.rows[1].id;
    const locIdQA = locRes.rows[2].id;

    const supplierRes = await client.query(
      "INSERT INTO suppliers (name) VALUES ('PT. Supplier Emas'), ('CV. Distributor Cepat'), ('Toko Lokal Murah') RETURNING id"
    );
    const customerRes = await client.query(
      "INSERT INTO customers (name) VALUES ('Toko Jaya Abadi'), ('Pelanggan Online'), ('CV. Ritel Besar') RETURNING id"
    );
    const supplierId1 = supplierRes.rows[0].id;
    const supplierId2 = supplierRes.rows[1].id;
    const customerId1 = customerRes.rows[0].id;
    const customerId2 = customerRes.rows[1].id;

    // 6. PRODUCTS (50 Produk)
    console.log("Membuat 50 produk...");
    const productIds = [];
    for (let i = 1; i <= 50; i++) {
      const isElectronic = i <= 25;
      const sku = isElectronic
        ? `ELEC-${i.toString().padStart(3, "0")}`
        : `OFFICE-${(i - 25).toString().padStart(3, "0")}`;
      
      const name = isElectronic // <-- VARIABEL 'name' YANG HILANG, KINI DITAMBAHKAN
        ? `Headset Gaming V${i}`
        : `Kertas A4 HVS ${i - 25} rim`;

      const price = 150000 + i * 500;
      const selling = price * 1.35;
      const catId = isElectronic ? categoryId1 : categoryId2;
      const suppId = i % 2 === 0 ? supplierId1 : supplierId2;
      const volume = isElectronic ? 0.05 : 0.02;
      const res = await client.query(
        "INSERT INTO products (sku, name, unit, category_id, purchase_price, selling_price, main_supplier_id, volume_m3) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, purchase_price, selling_price", // Ambil harga
        [sku, name, "pcs", catId, price, selling, suppId, volume] // 'name' kini didefinisikan
      );
      productIds.push({
          id: res.rows[0].id,
          purchase_price: res.rows[0].purchase_price,
          selling_price: res.rows[0].selling_price
      });
    }

    // --- SEED TRANSACTIONS (100+ TRANSAKSI ACER) ---
    console.log("Memproses 100+ transaksi acak...");

    // Helper untuk membuat tanggal acak
    const generateRandomDate = (daysAgo) => {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
      return date;
    };

    const operators = [adminUserId, staffUserId1, staffUserId2];
    const customerList = [customerId1, customerId2];
    const supplierList = [supplierId1, supplierId2];

    for (let i = 0; i < 100; i++) {
      const type = Math.random() < 0.6 ? "IN" : "OUT";
      const daysAgo = Math.floor(Math.random() * 60);
      const date = generateRandomDate(daysAgo);
      const durationMin = Math.floor(Math.random() * 10) + 2;
      const operatorId = operators[Math.floor(Math.random() * 3)];
      const locationId = i % 2 === 0 ? locIdA1 : locIdB2;
      
      const productIndex = Math.floor(Math.random() * 20);
      const product = productIds[productIndex]; // Ambil objek produk
      const productId = product.id;
      
      const qty = Math.floor(Math.random() * 15) + 1;

      const supplierId =
        type === "IN" ? supplierList[Math.floor(Math.random() * 2)] : null;
      const customerId =
        type === "OUT" ? customerList[Math.floor(Math.random() * 2)] : null;
      const stockStatus = Math.random() < 0.05 ? statusDamagedId : statusGoodId;

      const transRes = await client.query(
        "INSERT INTO transactions (type, notes, supplier_id, customer_id, operator_id, process_start, process_end) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        [
          type,
          `${type} Order #${i}`,
          supplierId,
          customerId,
          operatorId,
          date,
          new Date(date.getTime() + durationMin * 60000),
        ]
      );
      const transId = transRes.rows[0].id;

      const qtyChange = type === "IN" ? qty : -qty;

      // Cek stok sebelum OUT
      if (type === "OUT") {
        const stockCheck = await client.query(
          "SELECT quantity FROM stock_levels WHERE product_id = $1 AND location_id = $2",
          [productId, locationId]
        );
        if ((stockCheck.rows[0]?.quantity || 0) < qty) {
          continue;
        }
      }

      // Catat Item (BARU: Tambahkan kolom harga)
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, purchase_price_at_trans, selling_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          transId,
          productId,
          locationId,
          qty,
          stockStatus,
          product.purchase_price, // Nilai HPP saat ini
          product.selling_price, // Nilai Jual saat ini
        ]
      );

      // Update Stock Levels
      await client.query(
        `
            INSERT INTO stock_levels (product_id, location_id, quantity) VALUES ($1, $2, $3)
            ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity
        `,
        [productId, locationId, qtyChange]
      );
    }

    // 11. SEED MOVEMENT (5 Perpindahan)
    console.log("Membuat 5 perpindahan barang...");
    const firstProduct = productIds[0];
    await client.query(
      "INSERT INTO movements (product_id, from_location_id, to_location_id, quantity, reason, operator_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        firstProduct.id,
        locIdA1,
        locIdQA,
        5,
        "QA/Pengecekan Kualitas",
        adminUserId,
      ]
    );
    // Update stok untuk perpindahan
    await client.query(
      "UPDATE stock_levels SET quantity = quantity - 5 WHERE product_id = $1 AND location_id = $2",
      [firstProduct.id, locIdA1]
    );
    await client.query(
      "INSERT INTO stock_levels (product_id, location_id, quantity) VALUES ($1, $2, $3) ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity",
      [firstProduct.id, locIdQA, 5]
    );

    // 12. SELESAI
    await client.query("COMMIT");
    console.log("✅ SUPER SEED BERHASIL! DB siap untuk pengujian skala besar.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ SUPER SEED GAGAL:", err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Jalankan Super Seeder
superSeeder();