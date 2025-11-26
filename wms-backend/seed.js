const db = require("./config/db");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

// Konfigurasi
const CONFIG = {
  TOTAL_TRANSACTIONS: 400,
  INITIAL_IN_TRANSACTIONS: 100,
  TOTAL_PRODUCTS: 60,
  TOTAL_MOVEMENTS: 15,
  DATE_RANGE: {
    START_DAYS_AGO: 365,
    END_DAYS_AGO: 0
  },
  PROBABILITY: {
    IN_TRANSACTION: 0.6,
    DAMAGED_GOODS: 0.1,
    EXPIRED_GOODS: 0.05,
    HAS_BATCH_NUMBER: 0.3
  }
};

class AdvancedSeeder {
  constructor() {
    this.client = null;
    this.masterData = {};
    this.statistics = {
      transactions: { created: 0, skipped: 0 },
      movements: { created: 0, skipped: 0 },
      products: { created: 0 },
      startTime: null
    };
  }

  async initialize() {
    console.log("🚀 Memulai Advanced Database Seeder...");
    this.statistics.startTime = new Date();
    this.client = await db.connect();
    
    try {
      await this.client.query("BEGIN");
      await this.cleanDatabase();
      await this.createTables();
      await this.seedMasterData();
      await this.seedUsers();
      await this.seedBusinessPartners();
      await this.seedProducts();
      await this.seedTransactions();
      await this.seedMovements();
      
      await this.client.query("COMMIT");
      await this.generateReport();
      
    } catch (error) {
      await this.client.query("ROLLBACK");
      console.error("❌ Seeder gagal:", error);
      throw error;
    } finally {
      if (this.client) this.client.release();
      process.exit(0);
    }
  }

  async cleanDatabase() {
    console.log("🧹 Membersihkan database lama...");
    
    const tables = [
      'transaction_items', 'stock_levels', 'movements', 'transactions',
      'products', 'locations', 'users', 'suppliers', 'customers', 
      'categories', 'stock_statuses'
    ];

    for (const table of tables) {
      await this.client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    console.log("✅ Database lama berhasil dibersihkan");
  }

  async createTables() {
    console.log("📋 Membuat struktur tabel...");
    
    const sql = fs.readFileSync(path.join(__dirname, "database.sql")).toString();
    await this.client.query(sql);
    console.log("✅ Struktur tabel berhasil dibuat");
  }

  async seedMasterData() {
    console.log("🏗️  Membuat data master...");

    // Stock Statuses - SESUAI SCHEMA ANDA
    const statusRes = await this.client.query(
      `INSERT INTO stock_statuses (name) VALUES 
       ('Good'),
       ('Damaged'),
       ('Expired'),
       ('Quarantine') 
       RETURNING id, name`
    );
    this.masterData.statuses = statusRes.rows.reduce((acc, row) => {
      acc[row.name.toLowerCase()] = row.id;
      return acc;
    }, {});

    // Categories - SESUAI SCHEMA ANDA
    const categoryRes = await this.client.query(
      `INSERT INTO categories (name) VALUES 
       ('Electronics'),
       ('Office Supplies'),
       ('Tools'),
       ('Chemicals'),
       ('Furniture') 
       RETURNING id, name`
    );
    this.masterData.categories = categoryRes.rows.reduce((acc, row) => {
      acc[row.name] = row.id;
      return acc;
    }, {});

    // Locations - SESUAI SCHEMA ANDA
    const locationRes = await this.client.query(
      `INSERT INTO locations (name, description, max_capacity_m3) VALUES 
       ('RAK-A1-01', 'Rak fast-moving items - zona biru', 100.0),
       ('RAK-B2-01', 'Rak slow-moving items - zona hijau', 200.0),
       ('QA-AREA-01', 'Area quality assurance dan karantina', 50.0),
       ('DOCK-IN-01', 'Docking area barang masuk', 30.0),
       ('DOCK-OUT-01', 'Docking area barang keluar', 30.0),
       ('RAK-C3-01', 'Rak alat berat dan tools', 150.0),
       ('COLD-STORAGE', 'Penyimpanan bersuhu rendah', 80.0) 
       RETURNING id, name`
    );
    this.masterData.locations = locationRes.rows.reduce((acc, row) => {
      acc[row.name] = row.id;
      return acc;
    }, {});

    console.log("✅ Data master berhasil dibuat");
  }

  async seedUsers() {
    console.log("👥 Membuat pengguna sistem...");

    const users = [
      { username: 'admin', role: 'admin' },
      { username: 'supervisor', role: 'supervisor' },
      { username: 'staff1', role: 'staff' },
      { username: 'staff2', role: 'staff' },
      { username: 'staff3', role: 'staff' },
      { username: 'qa1', role: 'staff' } // Changed from 'quality' to 'staff' to match your schema
    ];

    this.masterData.users = {};
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);

    for (const user of users) {
      const res = await this.client.query(
        `INSERT INTO users (username, password_hash, role) 
         VALUES ($1, $2, $3) RETURNING id, username`,
        [user.username, passwordHash, user.role]
      );
      this.masterData.users[user.username] = res.rows[0].id;
    }

    console.log(`✅ ${users.length} pengguna berhasil dibuat`);
  }

  async seedBusinessPartners() {
    console.log("🏢 Membuat supplier dan customer...");

    // Suppliers - SESUAI SCHEMA ANDA
    const suppliers = [
      { name: 'PT. Electronic Global Indonesia', contact_person: 'Budi Santoso', phone: '021-1234567', address: 'Jl. Elektronik No. 123, Jakarta' },
      { name: 'CV. Office Supplies Mandiri', contact_person: 'Sari Dewi', phone: '021-2345678', address: 'Jl. Kantor No. 45, Bandung' },
      { name: 'Toko Tools Makmur Jaya', contact_person: 'Joko Widodo', phone: '021-3456789', address: 'Jl. Perkakas No. 67, Surabaya' },
      { name: 'PT. Kimia Jaya Abadi', contact_person: 'Dian Sastro', phone: '021-4567890', address: 'Jl. Kimia No. 89, Medan' },
      { name: 'PT. Furniture Modern Indonesia', contact_person: 'Rina Melati', phone: '021-5678901', address: 'Jl. Mebel No. 12, Semarang' }
    ];

    const supplierIds = [];
    for (const supplier of suppliers) {
      const res = await this.client.query(
        `INSERT INTO suppliers (name, contact_person, phone, address) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [supplier.name, supplier.contact_person, supplier.phone, supplier.address]
      );
      supplierIds.push(res.rows[0].id);
    }
    this.masterData.suppliers = supplierIds;

    // Customers - SESUAI SCHEMA ANDA
    const customers = [
      { name: 'Toko Jaya Abadi Sentosa', contact_person: 'Ahmad Fauzi', phone: '021-6789012', address: 'Jl. Raya No. 34, Jakarta' },
      { name: 'Pelanggan Online Super Store', contact_person: 'Maya Sari', phone: '021-7890123', address: 'Jl. Online No. 56, Tangerang' },
      { name: 'CV. Ritel Besar Indonesia', contact_person: 'Rudi Hartono', phone: '021-8901234', address: 'Jl. Retail No. 78, Bekasi' },
      { name: 'Proyek Konstruksi Mega Bangun', contact_person: 'Eko Prasetyo', phone: '021-9012345', address: 'Jl. Konstruksi No. 90, Bogor' },
      { name: 'PT. Corporate Solution Indonesia', contact_person: 'Lisa Permata', phone: '021-0123456', address: 'Jl. Corporate No. 11, Depok' }
    ];

    const customerIds = [];
    for (const customer of customers) {
      const res = await this.client.query(
        `INSERT INTO customers (name, contact_person, phone, address) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [customer.name, customer.contact_person, customer.phone, customer.address]
      );
      customerIds.push(res.rows[0].id);
    }
    this.masterData.customers = customerIds;

    console.log(`✅ ${this.masterData.suppliers.length} supplier dan ${this.masterData.customers.length} customer berhasil dibuat`);
  }

  async seedProducts() {
    console.log("📦 Membuat produk...");

    const productTemplates = {
      'Electronics': [
        { name: 'Headset Gaming Pro', unit: 'pcs', basePrice: 250000, volume: 0.08 },
        { name: 'Mouse Wireless Premium', unit: 'pcs', basePrice: 120000, volume: 0.03 },
        { name: 'Keyboard Mechanical', unit: 'pcs', basePrice: 350000, volume: 0.12 },
        { name: 'Webcam HD 1080p', unit: 'pcs', basePrice: 180000, volume: 0.05 },
        { name: 'Power Bank 20000mAh', unit: 'pcs', basePrice: 150000, volume: 0.06 }
      ],
      'Office Supplies': [
        { name: 'Kertas A4 Premium', unit: 'rim', basePrice: 45000, volume: 0.15 },
        { name: 'Pulpen Standard', unit: 'pack', basePrice: 25000, volume: 0.02 },
        { name: 'Stapler Max Pro', unit: 'pcs', basePrice: 35000, volume: 0.04 },
        { name: 'Binder Clip Set', unit: 'box', basePrice: 15000, volume: 0.01 },
        { name: 'Notebook Executive', unit: 'pcs', basePrice: 28000, volume: 0.03 }
      ],
      'Tools': [
        { name: 'Kunci Pas Set', unit: 'set', basePrice: 280000, volume: 0.25 },
        { name: 'Obeng Set Premium', unit: 'set', basePrice: 120000, volume: 0.08 },
        { name: 'Tang Combination', unit: 'pcs', basePrice: 75000, volume: 0.05 },
        { name: 'Meteran Laser', unit: 'pcs', basePrice: 450000, volume: 0.15 },
        { name: 'Drill Electric Set', unit: 'set', basePrice: 680000, volume: 0.35 }
      ],
      'Chemicals': [
        { name: 'Cleaner Multi Purpose', unit: 'botol', basePrice: 45000, volume: 0.02 },
        { name: 'Disinfectant Spray', unit: 'can', basePrice: 35000, volume: 0.015 },
        { name: 'Floor Polish', unit: 'botol', basePrice: 68000, volume: 0.025 },
        { name: 'Glass Cleaner', unit: 'botol', basePrice: 32000, volume: 0.018 },
        { name: 'Hand Sanitizer', unit: 'botol', basePrice: 28000, volume: 0.012 }
      ],
      'Furniture': [
        { name: 'Kursi Kantor Executive', unit: 'pcs', basePrice: 850000, volume: 0.8 },
        { name: 'Meja Meeting', unit: 'pcs', basePrice: 1200000, volume: 1.2 },
        { name: 'Filing Cabinet', unit: 'pcs', basePrice: 450000, volume: 0.3 },
        { name: 'Rak Buku Minimalis', unit: 'pcs', basePrice: 320000, volume: 0.4 },
        { name: 'Partisi Kantor', unit: 'panel', basePrice: 180000, volume: 0.15 }
      ]
    };

    this.masterData.products = [];
    let productCounter = 1;

    for (const [categoryName, templates] of Object.entries(productTemplates)) {
      const categoryId = this.masterData.categories[categoryName];
      const supplierIndex = Object.keys(productTemplates).indexOf(categoryName) % this.masterData.suppliers.length;
      const mainSupplierId = this.masterData.suppliers[supplierIndex];

      for (const template of templates) {
        for (let variant = 1; variant <= 3; variant++) {
          const productName = `${template.name} V${variant}`;
          const sku = `${categoryName.substring(0, 4).toUpperCase()}-${productCounter.toString().padStart(3, '0')}`;
          const description = `${productName} - ${categoryName} dengan kualitas terbaik`;
          
          const purchasePrice = template.basePrice * (0.9 + (variant * 0.1));
          const sellingPrice = purchasePrice * (1.3 + (Math.random() * 0.3));
          
          const res = await this.client.query(
            `INSERT INTO products (sku, name, description, unit, category_id, purchase_price, selling_price, main_supplier_id, volume_m3) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
              sku,
              productName,
              description,
              template.unit,
              categoryId,
              Math.round(purchasePrice),
              Math.round(sellingPrice),
              mainSupplierId,
              template.volume
            ]
          );

          this.masterData.products.push({
            id: res.rows[0].id,
            purchasePrice: purchasePrice,
            sellingPrice: sellingPrice,
            category: categoryName,
            volume: template.volume
          });

          productCounter++;
          this.statistics.products.created++;
        }
      }
    }

    console.log(`✅ ${this.statistics.products.created} produk berhasil dibuat`);
  }

  async seedTransactions() {
    console.log(`💰 Membuat ${CONFIG.TOTAL_TRANSACTIONS} transaksi...`);

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const startDate = new Date(Date.now() - (CONFIG.DATE_RANGE.START_DAYS_AGO * ONE_DAY));
    const endDate = new Date(Date.now() - (CONFIG.DATE_RANGE.END_DAYS_AGO * ONE_DAY));

    for (let i = 0; i < CONFIG.TOTAL_TRANSACTIONS; i++) {
      const type = i < CONFIG.INITIAL_IN_TRANSACTIONS ? 'IN' : 
                  (Math.random() < CONFIG.PROBABILITY.IN_TRANSACTION ? 'IN' : 'OUT');

      // Tanggal acak dalam rentang
      const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
      const transactionDate = new Date(randomTime);

      const product = this.masterData.products[Math.floor(Math.random() * this.masterData.products.length)];
      const quantity = Math.floor(Math.random() * 30) + 1;
      const userId = Object.values(this.masterData.users)[Math.floor(Math.random() * Object.values(this.masterData.users).length)];

      // Tentukan lokasi berdasarkan kategori produk
      let locationId;
      if (product.category === 'Electronics') {
        locationId = this.masterData.locations['RAK-A1-01'];
      } else if (product.category === 'Tools') {
        locationId = this.masterData.locations['RAK-C3-01'];
      } else if (product.category === 'Chemicals') {
        locationId = this.masterData.locations['COLD-STORAGE'];
      } else {
        locationId = this.masterData.locations['RAK-B2-01'];
      }

      // Data untuk transaksi IN vs OUT
      let supplierId = null, customerId = null;
      if (type === 'IN') {
        supplierId = this.masterData.suppliers[Math.floor(Math.random() * this.masterData.suppliers.length)];
      } else {
        customerId = this.masterData.customers[Math.floor(Math.random() * this.masterData.customers.length)];
      }

      // Status stok dan batch number
      let stockStatusId = this.masterData.statuses.good;
      let batchNumber = null;
      let expiryDate = null;

      if (type === 'IN') {
        if (Math.random() < CONFIG.PROBABILITY.DAMAGED_GOODS) {
          stockStatusId = this.masterData.statuses.damaged;
        } else if (Math.random() < CONFIG.PROBABILITY.EXPIRED_GOODS) {
          stockStatusId = this.masterData.statuses.expired;
          expiryDate = new Date(transactionDate.getTime() - (Math.random() * 90 * ONE_DAY));
        }

        if (Math.random() < CONFIG.PROBABILITY.HAS_BATCH_NUMBER) {
          batchNumber = `BATCH-${transactionDate.getFullYear()}${(transactionDate.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        }
      }

      try {
        // Cek stok untuk transaksi OUT
        if (type === 'OUT') {
          const stockCheck = await this.getCurrentStock(product.id, locationId);
          if (!stockCheck || stockCheck.quantity < quantity) {
            this.statistics.transactions.skipped++;
            continue;
          }
        }

        // Insert transaksi
        const transRes = await this.client.query(
          `INSERT INTO transactions (type, notes, supplier_id, customer_id, operator_id, process_start, process_end, date) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            type,
            `${type} Transaction #${i + 1} - ${product.category}`,
            supplierId,
            customerId,
            userId,
            transactionDate,
            new Date(transactionDate.getTime() + (Math.floor(Math.random() * 30) + 10) * 60000), // +10-40 menit
            transactionDate
          ]
        );

        const transactionId = transRes.rows[0].id;

        // Update harga berdasarkan waktu (inflasi simulasi)
        const timeFactor = (transactionDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
        const currentPurchasePrice = product.purchasePrice * (1 + (timeFactor * 0.2)); // +20% over time
        const currentSellingPrice = product.sellingPrice * (1 + (timeFactor * 0.15)); // +15% over time

        // Insert transaction item
        await this.client.query(
          `INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number, expiry_date, purchase_price_at_trans, selling_price_at_trans) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            transactionId,
            product.id,
            locationId,
            quantity,
            stockStatusId,
            batchNumber,
            expiryDate,
            Math.round(currentPurchasePrice),
            type === 'OUT' ? Math.round(currentSellingPrice) : null
          ]
        );

        // Update stock levels dengan average cost calculation
        await this.updateStockLevels(product.id, locationId, type === 'IN' ? quantity : -quantity, currentPurchasePrice);

        this.statistics.transactions.created++;

        // Progress reporting
        if ((i + 1) % 50 === 0) {
          console.log(`📊 Progress: ${i + 1}/${CONFIG.TOTAL_TRANSACTIONS} transaksi dibuat...`);
        }

      } catch (error) {
        console.warn(`⚠️ Transaksi ${i} dilewati:`, error.message);
        this.statistics.transactions.skipped++;
      }
    }

    console.log(`✅ ${this.statistics.transactions.created} transaksi berhasil dibuat, ${this.statistics.transactions.skipped} dilewati`);
  }

  async seedMovements() {
    console.log("🔄 Membuat data perpindahan barang...");

    const movementReasons = [
      "Quality Assurance Check",
      "Stock Rotation",
      "Relokasi Gudang",
      "Picking untuk Packing",
      "Karantina Quality Control",
      "Optimisasi Penyimpanan"
    ];

    for (let i = 0; i < CONFIG.TOTAL_MOVEMENTS; i++) {
      try {
        const product = this.masterData.products[Math.floor(Math.random() * this.masterData.products.length)];
        const fromLocationId = this.masterData.locations['RAK-A1-01'];
        const toLocationId = this.masterData.locations['QA-AREA-01'];
        const quantity = Math.floor(Math.random() * 10) + 1;
        const userId = Object.values(this.masterData.users)[Math.floor(Math.random() * Object.values(this.masterData.users).length)];

        // Cek stok di lokasi asal
        const sourceStock = await this.getCurrentStock(product.id, fromLocationId);
        if (!sourceStock || sourceStock.quantity < quantity) {
          this.statistics.movements.skipped++;
          continue;
        }

        // Insert movement
        await this.client.query(
          `INSERT INTO movements (product_id, from_location_id, to_location_id, quantity, reason, operator_id, date) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW() - ($7 || ' days')::interval)`,
          [
            product.id,
            fromLocationId,
            toLocationId,
            quantity,
            movementReasons[Math.floor(Math.random() * movementReasons.length)],
            userId,
            Math.floor(Math.random() * 30) // Random date dalam 30 hari terakhir
          ]
        );

        // Update stock levels
        await this.updateStockLevels(product.id, fromLocationId, -quantity, sourceStock.average_cost);
        await this.updateStockLevels(product.id, toLocationId, quantity, sourceStock.average_cost);

        this.statistics.movements.created++;

      } catch (error) {
        console.warn(`⚠️ Movement ${i} dilewati:`, error.message);
        this.statistics.movements.skipped++;
      }
    }

    console.log(`✅ ${this.statistics.movements.created} perpindahan berhasil dibuat, ${this.statistics.movements.skipped} dilewati`);
  }

  // Helper Methods
  async getCurrentStock(productId, locationId) {
    const result = await this.client.query(
      "SELECT quantity, average_cost FROM stock_levels WHERE product_id = $1 AND location_id = $2",
      [productId, locationId]
    );
    return result.rows[0] || null;
  }

  async updateStockLevels(productId, locationId, quantityChange, purchasePrice) {
    const currentStock = await this.getCurrentStock(productId, locationId);
    
    let newQuantity, newAverageCost;

    if (!currentStock) {
      newQuantity = quantityChange;
      newAverageCost = purchasePrice;
    } else {
      newQuantity = parseFloat(currentStock.quantity) + quantityChange;
      
      if (quantityChange > 0) { // Hanya update average cost untuk barang masuk
        const currentTotalValue = parseFloat(currentStock.quantity) * parseFloat(currentStock.average_cost);
        const incomingValue = quantityChange * purchasePrice;
        newAverageCost = (currentTotalValue + incomingValue) / newQuantity;
      } else {
        newAverageCost = parseFloat(currentStock.average_cost);
      }
    }

    await this.client.query(
      `INSERT INTO stock_levels (product_id, location_id, quantity, average_cost) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, location_id) 
       DO UPDATE SET quantity = $3, average_cost = $4`,
      [productId, locationId, newQuantity, newAverageCost]
    );
  }

  async generateReport() {
    const endTime = new Date();
    const duration = (endTime - this.statistics.startTime) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('📊 LAPORAN FINAL SEEDER');
    console.log('='.repeat(60));
    console.log(`⏱️  Durasi proses: ${duration.toFixed(2)} detik`);
    console.log(`📦 Produk dibuat: ${this.statistics.products.created}`);
    console.log(`💰 Transaksi: ${this.statistics.transactions.created} berhasil, ${this.statistics.transactions.skipped} dilewati`);
    console.log(`🔄 Pergerakan: ${this.statistics.movements.created} berhasil, ${this.statistics.movements.skipped} dilewati`);
    console.log(`👥 User: ${Object.keys(this.masterData.users).length}`);
    console.log(`🏢 Supplier: ${this.masterData.suppliers.length}`);
    console.log(`🏪 Customer: ${this.masterData.customers.length}`);
    console.log(`📋 Kategori: ${Object.keys(this.masterData.categories).length}`);
    console.log(`📍 Lokasi: ${Object.keys(this.masterData.locations).length}`);
    console.log('='.repeat(60));
    console.log('✅ SEEDER BERHASIL DIJALANKAN! Database siap untuk pengujian.');
    console.log('='.repeat(60));
  }
}

// Jalankan seeder
const seeder = new AdvancedSeeder();
seeder.initialize().catch(console.error);