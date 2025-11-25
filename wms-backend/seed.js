const db = require("./config/db");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

// Jumlah transaksi yang akan dibuat
const NUM_TRANSACTIONS = 300; 

// Helper untuk mendapatkan stok saat ini (untuk perhitungan Average Cost)
async function getCurrentStockAndCost(client, productId, locationId) {
  const result = await client.query(
    "SELECT quantity, average_cost FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE",
    [productId, locationId] // Menggunakan FOR UPDATE untuk locking (opsional, tapi bagus untuk seeder)
  );
  return result.rows[0] || { quantity: 0, average_cost: 0.0 };
}

async function superSeeder() {
  console.log("Memulai proses SUPER SEED PENUH...");
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    console.log("Transaksi dimulai. Menghapus tabel lama...");

    // --- 1. HAPUS TABEL (URUTAN WAJIB BENAR) ---
    await client.query("DROP TABLE IF EXISTS transaction_items CASCADE");
    await client.query("DROP TABLE IF EXISTS stock_levels CASCADE");
    await client.query("DROP TABLE IF EXISTS movements CASCADE");
    await client.query("DROP TABLE IF EXISTS transactions CASCADE");
    await client.query("DROP TABLE IF EXISTS products CASCADE");
    await client.query("DROP TABLE IF EXISTS locations CASCADE");
    await client.query("DROP TABLE IF EXISTS users CASCADE");
    await client.query("DROP TABLE IF EXISTS suppliers CASCADE");
    await client.query("DROP TABLE IF EXISTS customers CASCADE");
    await client.query("DROP TABLE IF EXISTS categories CASCADE");
    await client.query("DROP TABLE IF EXISTS stock_statuses CASCADE");
    console.log("Semua tabel lama berhasil dihapus.");

    // --- 2. BUAT ULANG TABEL DARI database.sql ---
    console.log("Membuat ulang struktur tabel...");
    const sql = fs
      .readFileSync(path.join(__dirname, "database.sql"))
      .toString();
    await client.query(sql);
    console.log("Struktur tabel baru berhasil dibuat.");

    // --- SEED DATA MASTER BARU ---

    // STATUSES & CATEGORIES
    console.log("Membuat Status & Kategori...");
    const statusRes = await client.query(
      "INSERT INTO stock_statuses (name) VALUES ('Good'), ('Damaged'), ('Expired') RETURNING id"
    );
    const statusGoodId = statusRes.rows[0].id;
    const statusDamagedId = statusRes.rows[1].id;
    const statusExpiredId = statusRes.rows[2].id;

    const categoryRes = await client.query(
      "INSERT INTO categories (name) VALUES ('Electronics'), ('Office Supplies'), ('Tools'), ('Chemicals') RETURNING id"
    );
    const categoryIds = categoryRes.rows.map(r => r.id);

    // 4. SEED USERS
    console.log("Membuat user admin, 2 staff, dan 1 supervisor...");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);

    const usersData = [
        { username: 'admin', role: 'admin' },
        { username: 'staff1', role: 'staff' },
        { username: 'staff2', role: 'staff' },
        { username: 'supervisor', role: 'admin' },
    ];
    
    const userIds = [];
    for (const u of usersData) {
        const res = await client.query(
            "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
            [u.username, passwordHash, u.role]
        );
        userIds.push(res.rows[0].id);
    }
    const [adminUserId, staffUserId1, staffUserId2, supervisorUserId] = userIds;
    const operators = userIds; 

    // 5. LOCATIONS, SUPPLIERS, CUSTOMERS
    console.log("Membuat 5 lokasi, 4 supplier, dan 4 customer...");
    const locRes = await client.query(
      "INSERT INTO locations (name, description, max_capacity_m3) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9), ($10, $11, $12), ($13, $14, $15) RETURNING id",
      [
        "RAK A1 (Fast)", "Lokasi barang fast-moving", 100.0,
        "RAK B2 (Slow)", "Lokasi barang slow-moving", 200.0,
        "QA AREA", "Area Karantina/Pengecekan", 50.0,
        "LOADING DOCK", "Area Transit Masuk", 30.0,
        "RAK C3 (Tools)", "Lokasi alat berat/tools", 150.0,
      ]
    );
    const locIds = locRes.rows.map(r => r.id);
    const [locIdA1, locIdB2, locIdQA, locIdDock, locIdC3] = locIds;

    const supplierRes = await client.query(
      "INSERT INTO suppliers (name) VALUES ('PT. Electronic Global'), ('CV. Office Supplies'), ('Toko Tools Makmur'), ('PT. Kimia Jaya') RETURNING id"
    );
    const customerRes = await client.query(
      "INSERT INTO customers (name) VALUES ('Toko Jaya Abadi'), ('Pelanggan Online Super'), ('CV. Ritel Besar'), ('Proyek Konstruksi Mega') RETURNING id"
    );
    const supplierIds = supplierRes.rows.map(r => r.id);
    const customerIds = customerRes.rows.map(r => r.id);

    // 6. PRODUCTS (60 Produk)
    console.log("Membuat 60 produk terperinci...");
    const productsData = [];
    for (let i = 1; i <= 60; i++) {
        let catIndex = i % 4; // 0, 1, 2, 3
        const catId = categoryIds[catIndex];
        const supplierId = supplierIds[catIndex];
        
        let sku, name, unit, price, volume;

        if (catIndex === 0) { // Electronics
            sku = `ELEC-${i.toString().padStart(3, "0")}`;
            name = `Headset Gaming Pro V${i}`;
            unit = "pcs";
            price = 100000 + i * 5000;
            volume = 0.05;
        } else if (catIndex === 1) { // Office Supplies
            sku = `OFF-${i.toString().padStart(3, "0")}`;
            name = `Kertas A4 Premium ${i}gsm`;
            unit = "rim";
            price = 35000 + i * 50;
            volume = 0.01;
        } else if (catIndex === 2) { // Tools
            sku = `TOOL-${i.toString().padStart(3, "0")}`;
            name = `Kunci Pas Set Heavy Duty ${i}`;
            unit = "set";
            price = 500000 + i * 10000;
            volume = 0.15;
        } else { // Chemicals
            sku = `CHEM-${i.toString().padStart(3, "0")}`;
            name = `Cleaner Multi Purpose 5L Batch ${i}`;
            unit = "botol";
            price = 75000 + i * 200;
            volume = 0.02;
        }
        
        productsData.push({
            sku, name, unit, 
            category_id: catId, 
            purchase_price: price, 
            selling_price: price * 1.4,
            main_supplier_id: supplierId,
            volume_m3: volume
        });
    }

    const productIds = [];
    for (const p of productsData) {
        const res = await client.query(
            "INSERT INTO products (sku, name, unit, category_id, purchase_price, selling_price, main_supplier_id, volume_m3) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, purchase_price, selling_price",
            [p.sku, p.name, p.unit, p.category_id, p.purchase_price, p.selling_price, p.main_supplier_id, p.volume_m3]
        );
        productIds.push({ 
            id: res.rows[0].id, 
            initial_price: res.rows[0].purchase_price, 
            selling_price: res.rows[0].selling_price
        });
    }


    // --- SEED TRANSACTIONS (300 Transaksi) ---
    console.log(`Memproses ${NUM_TRANSACTIONS} transaksi kompleks...`);

    const generateRandomDate = (daysAgo) => {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
      return date;
    };

    for (let i = 0; i < NUM_TRANSACTIONS; i++) {
      const type = Math.random() < 0.6 ? "IN" : "OUT";
      const daysAgo = Math.floor(Math.random() * 365) + 1; // Data hingga 1 tahun ke belakang
      const date = generateRandomDate(daysAgo);
      const durationMin = Math.floor(Math.random() * 15) + 5;
      const operatorId = operators[Math.floor(Math.random() * operators.length)];
      
      const productIndex = Math.floor(Math.random() * productIds.length); 
      const product = productIds[productIndex]; 
      const productId = product.id;
      
      const qty = Math.floor(Math.random() * 50) + 1;
      
      let locationId, supplierId, customerId, stockStatus, batchNumber, expiryDate;
      
      // Tentukan lokasi berdasarkan tipe produk
      const isElectronic = productIndex < 15; // Contoh logika penentuan lokasi
      locationId = isElectronic ? locIdA1 : locIdB2;

      // Tentukan pihak
      supplierId = type === "IN" ? supplierIds[Math.floor(Math.random() * supplierIds.length)] : null;
      customerId = type === "OUT" ? customerIds[Math.floor(Math.random() * customerIds.length)] : null;
      
      // Tentukan status stok (10% Damaged, 5% Expired saat IN)
      stockStatus = statusGoodId;
      if (type === "IN" && Math.random() < 0.10) {
          stockStatus = Math.random() < 0.5 ? statusDamagedId : statusExpiredId;
      }
      
      // Batch dan Expiry Date
      if (stockStatus === statusExpiredId) {
           expiryDate = generateRandomDate(Math.floor(Math.random() * 60)); // Kadaluarsa dalam 60 hari
      } else if (stockStatus === statusGoodId && productIndex % 10 === 0) {
           batchNumber = `BATCH-${Math.floor(Math.random() * 999)}`;
      }

      // --- LOGIKA AVERAGE COST DAN STOCK CHECK ---
      
      const currentStock = await getCurrentStockAndCost(client, productId, locationId);
      const oldQty = parseFloat(currentStock.quantity);
      const oldAvgCost = parseFloat(currentStock.average_cost);

      let qtyChange = type === "IN" ? qty : -qty;
      let purchasePriceAtTrans = oldAvgCost; 
      let transactionPrice = product.initial_price * (1 + (Math.random() * 0.1 - 0.05)); // Harga Beli +- 5%
      let newAvgCost = oldAvgCost; 
      
      // Hanya izinkan OUT jika stok cukup
      if (type === "OUT") {
        if (oldQty < qty) {
          continue; // Lewati transaksi jika stok tidak cukup
        }
        purchasePriceAtTrans = oldAvgCost; // COGS saat keluar adalah Average Cost
        
      } else if (type === "IN") {
        purchasePriceAtTrans = transactionPrice; // HPP transaksi masuk adalah harga beli
        
        // Hitung Biaya Rata-Rata Baru (Average Cost Logic)
        if (oldQty + qty > 0) {
            newAvgCost = ((oldQty * oldAvgCost) + (qty * transactionPrice)) / (oldQty + qty);
        } else {
            newAvgCost = transactionPrice;
        }
      }

      // 7. Catat Header Transaksi
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

      // 8. Catat Item
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number, expiry_date, purchase_price_at_trans, selling_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          transId,
          productId,
          locationId,
          qty,
          stockStatus,
          batchNumber || null,
          expiryDate || null,
          purchasePriceAtTrans, 
          product.selling_price * (type === 'OUT' ? 1 : 0.9), // Harga jual acak, atau 0.9x jika IN
        ]
      );

      // 9. Update Stock Levels (Termasuk Average Cost)
      // Gunakan UPDATE/INSERT (UPSERT)
      await client.query(
        `
            INSERT INTO stock_levels (product_id, location_id, quantity, average_cost) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (product_id, location_id) 
            DO UPDATE SET 
                quantity = stock_levels.quantity + EXCLUDED.quantity,
                average_cost = $4
        `,
        [productId, locationId, qtyChange, newAvgCost] 
      );
    }

    // 10. SEED MOVEMENT (15 Perpindahan)
    console.log("Membuat 15 perpindahan barang untuk data pergerakan...");
    for (let j = 0; j < 15; j++) {
        const product = productIds[Math.floor(Math.random() * productIds.length)];
        const fromLoc = locIdA1; // Pindahkan dari A1
        const toLoc = locIdQA;  // Pindahkan ke QA
        const moveQty = 5;
        const operatorId = operators[Math.floor(Math.random() * operators.length)];
        
        const stockA1 = await getCurrentStockAndCost(client, product.id, fromLoc);
        if (stockA1.quantity < moveQty) continue;

        await client.query(
            "INSERT INTO movements (product_id, from_location_id, to_location_id, quantity, reason, operator_id, date) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
            [
                product.id,
                fromLoc,
                toLoc,
                moveQty,
                j % 3 === 0 ? "QA Check" : "Relokasi Gudang",
                operatorId,
            ]
        );

        // Update stok (Kurangi di Asal)
        await client.query(
            "UPDATE stock_levels SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3",
            [moveQty, product.id, fromLoc]
        );

        // Update stok (Tambah di Tujuan, HPP tetap sama)
        await client.query(
            `
            INSERT INTO stock_levels (product_id, location_id, quantity, average_cost) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT (product_id, location_id) 
            DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity, average_cost = $4
            `,
            [product.id, toLoc, moveQty, stockA1.average_cost]
        );
    }

    // 11. SELESAI
    await client.query("COMMIT");
    console.log("✅ SUPER SEED BERHASIL! DB siap untuk pengujian Average Cost dan Laporan.");
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