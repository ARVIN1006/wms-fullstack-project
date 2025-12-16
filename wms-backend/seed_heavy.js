const path = require("path");
const fs = require("fs");

// Load environment variables manually to ensure they are found
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  // Fallback if run from root
  require("dotenv").config({
    path: path.join(__dirname, "wms-backend", ".env"),
  });
}

const pool = require("./config/db");
const bcrypt = require("bcryptjs");

// --- CONFIGURATION ---
const RESET_DB = true; // Set to true to WIPE database before seeding
const NUM_PRODUCTS = 50;
const NUM_LOCATIONS = 10;
const NUM_SUPPLIERS = 10;
const NUM_CUSTOMERS = 20;
const NUM_TRANSACTIONS = 500; // Total transactions to generate

// --- HELPERS ---
const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) =>
  (Math.random() * (max - min) + min).toFixed(2);
const getRandomArrayItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// --- DATASETS ---
const CATEGORIES = [
  "Electronics",
  "Furniture",
  "Clothing",
  "Office Supplies",
  "Auto Parts",
  "Groceries",
];
const ADJECTIVES = [
  "Premium",
  "Standard",
  "Basic",
  "Luxury",
  "Heavy Duty",
  "Lightweight",
  "Wireless",
  "Smart",
];
const PRODUCT_NOUNS = [
  "Phone",
  "Laptop",
  "Chair",
  "Table",
  "Shirt",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Headphones",
  "Adapter",
  "Desk",
  "Shelf",
  "Battery",
  "Charger",
];

const LOCATIONS = [
  { name: "A-01-01", type: "Rack", capacity: 100 },
  { name: "A-01-02", type: "Rack", capacity: 100 },
  { name: "A-02-01", type: "Rack", capacity: 100 },
  { name: "A-02-02", type: "Rack", capacity: 100 },
  { name: "B-01-01", type: "Bin", capacity: 50 },
  { name: "B-01-02", type: "Bin", capacity: 50 },
  { name: "C-Cooler-01", type: "Cold Storage", capacity: 200 },
  { name: "D-Bulk-01", type: "Floor", capacity: 500 },
  { name: "D-Bulk-02", type: "Floor", capacity: 500 },
  { name: "R-Return-Area", type: "Zone", capacity: 50 },
];

const SUPPLIERS = [
  "TechGlobal Inc",
  "Furniture World",
  "FastFashion Ltd",
  "OfficeDepot Wholesale",
  "AutoMotive Parts Co",
  "Mega Distributors",
  "China Import Co",
  "Local Goods Supply",
  "Green Earth Source",
  "Prime Logistics",
];

const CUSTOMERS = [
  "PT Maju Jaya",
  "CV Sejahtera",
  "Toko Abadi",
  "Warung Berkah",
  "PT Teknologi Nusantara",
  "Rumah Sakit Sehat",
  "Universitas Merdeka",
  "Hotel Bintang Lima",
  "Restoran Enak",
  "Koperasi Warga",
];

// --- MAIN FUNCTION ---
async function seedHeavy() {
  const client = await pool.connect();

  try {
    console.log("🚀 STARTING HEAVY SEEDER...");
    console.log(
      `CONFIG: Reset=${RESET_DB}, Products=${NUM_PRODUCTS}, Trans=${NUM_TRANSACTIONS}`
    );

    if (RESET_DB) {
      console.log("🗑️ Clearing existing data...");
      // Urutan penting karena foreign key constraints
      await client.query(
        "TRUNCATE TABLE transaction_items, transactions, stock_levels, products, locations, suppliers, customers, users RESTART IDENTITY CASCADE"
      );
    }

    // 1. CREATE USERS
    console.log("👤 Creating Users...");
    const passwordHash = await bcrypt.hash("password123", 10);
    const users = [
      { name: "Super Admin", email: "admin@wms.com", role: "admin" },
      { name: "Warehouse Staff", email: "staff@wms.com", role: "staff" },
    ];

    const userIds = [];
    for (const u of users) {
      const res = await client.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id",
        [u.name, u.email, passwordHash, u.role]
      );
      userIds.push(res.rows[0].id);
    }
    const adminId = userIds[0];

    // 2. CREATE LOCATIONS
    console.log("📍 Creating Locations...");
    const locationIds = [];
    for (const l of LOCATIONS) {
      const res = await client.query(
        "INSERT INTO locations (name, type, max_capacity_m3) VALUES ($1, $2, $3) RETURNING id",
        [l.name, l.type, l.capacity]
      );
      locationIds.push(res.rows[0].id);
    }
    // Fill up to NUM_LOCATIONS if needed (mock names)
    while (locationIds.length < NUM_LOCATIONS) {
      const name = `Z-${getRandomInt(1, 99)}-${getRandomInt(1, 99)}`;
      const res = await client.query(
        "INSERT INTO locations (name, type, max_capacity_m3) VALUES ($1, 'Rack', 100) RETURNING id",
        [name]
      );
      locationIds.push(res.rows[0].id);
    }

    // 3. CREATE SUPPLIERS
    console.log("🚚 Creating Suppliers...");
    const supplierIds = [];
    for (const s of SUPPLIERS) {
      const res = await client.query(
        "INSERT INTO suppliers (name, contact_info, address) VALUES ($1, $2, $3) RETURNING id",
        [
          s,
          `contact@${s.replace(/\s/g, "").toLowerCase()}.com`,
          "Jakarta, Indonesia",
        ]
      );
      supplierIds.push(res.rows[0].id);
    }

    // 4. CREATE CUSTOMERS
    console.log("👥 Creating Customers...");
    const customerIds = [];
    for (const c of CUSTOMERS) {
      const res = await client.query(
        "INSERT INTO customers (name, contact_info, address) VALUES ($1, $2, $3) RETURNING id",
        [
          c,
          `info@${c.replace(/\s/g, "").toLowerCase()}.com`,
          "Surabaya, Indonesia",
        ]
      );
      customerIds.push(res.rows[0].id);
    }

    // 5. CREATE PRODUCTS
    console.log("📦 Creating Products...");
    const productIds = [];
    const productDetails = new Map(); // Store base price for simulation

    for (let i = 0; i < NUM_PRODUCTS; i++) {
      const noun = getRandomArrayItem(PRODUCT_NOUNS);
      const adj = getRandomArrayItem(ADJECTIVES);
      const name = `${adj} ${noun} ${getRandomInt(100, 999)}`;
      const sku = `SKU-${noun.substring(0, 3).toUpperCase()}-${getRandomInt(
        1000,
        9999
      )}`;
      const category = getRandomArrayItem(CATEGORIES);
      const volume = getRandomFloat(0.01, 0.5);

      // Random Base Price (10k - 5jt)
      const basePrice = getRandomInt(10, 5000) * 1000;
      const sellingPrice = Math.floor(basePrice * 1.3); // 30% margin default

      const res = await client.query(
        "INSERT INTO products (name, sku, category, description, price, volume_m3, selling_price) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        [
          name,
          sku,
          category,
          `Description for ${name}`,
          sellingPrice,
          volume,
          sellingPrice,
        ] // price field usually refers to selling price in some schemas but let's stick to Schema. selling_price is explicit
      );
      const pid = res.rows[0].id;
      productIds.push(pid);
      productDetails.set(pid, { basePrice, sellingPrice });
    }

    // 6. SIMULATE TRANSACTIONS (Chronological Order)
    console.log("💸 Simulating Transactions...");

    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1); // Start from 1 year ago

    // Sort of dates
    let timeline = [];
    for (let i = 0; i < NUM_TRANSACTIONS; i++) {
      timeline.push(randomDate(startDate, new Date()));
    }
    timeline.sort((a, b) => a - b);

    // Track stock in memory to simulate validity
    // Map<ProductId, Map<LocationId, {qty, avgCost}>>
    const stockMap = new Map();

    const getStock = (pid, lid) => {
      if (!stockMap.has(pid)) stockMap.set(pid, new Map());
      if (!stockMap.get(pid).has(lid))
        stockMap.get(pid).set(lid, { qty: 0, cost: 0 });
      return stockMap.get(pid).get(lid);
    };

    let successCount = 0;

    for (const date of timeline) {
      // Decide type: More IN at beginning, mixed later. Randomly 60% OUT, 40% IN generally
      // But ensure we have stock first.

      // Bias towards IN if total transactions low (to build stock)
      const isEarly = successCount < 50;
      const type = isEarly || Math.random() > 0.6 ? "IN" : "OUT";

      if (type === "IN") {
        const supplier = getRandomArrayItem(supplierIds);
        const notes = `Restock ${date.toISOString().split("T")[0]}`;

        // Header
        const transRes = await client.query(
          "INSERT INTO transactions (type, notes, supplier_id, operator_id, date, created_at) VALUES ($1, $2, $3, $4, $5, $5) RETURNING id",
          ["IN", notes, supplier, adminId, date]
        );
        const transId = transRes.rows[0].id;

        // Items (1-5 items per trans)
        const numItems = getRandomInt(1, 5);
        for (let k = 0; k < numItems; k++) {
          const pid = getRandomArrayItem(productIds);
          const lid = getRandomArrayItem(locationIds);
          const qty = getRandomInt(10, 100);

          const pInfo = productDetails.get(pid);
          // Price variation +/- 10%
          const purchasePrice = Math.floor(
            pInfo.basePrice * getRandomFloat(0.9, 1.1)
          );

          // Update Memory Stock (Avg Cost)
          const stock = getStock(pid, lid);
          const oldTotalVal = stock.qty * stock.cost;
          const newTotalVal = oldTotalVal + qty * purchasePrice;
          stock.qty += qty;
          stock.cost = newTotalVal / stock.qty;

          // Insert Item
          await client.query(
            "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, purchase_price_at_trans, selling_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6)",
            [transId, pid, lid, qty, purchasePrice, pInfo.sellingPrice]
          );

          // Update DB Stock
          await client.query(
            `
                        INSERT INTO stock_levels (product_id, location_id, quantity, average_cost)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (product_id, location_id)
                        DO UPDATE SET
                            quantity = stock_levels.quantity + $3,
                            average_cost = $4
                    `,
            [pid, lid, qty, stock.cost]
          );
        }
        successCount++;
      } else {
        // OUT
        const customer = getRandomArrayItem(customerIds);
        const notes = `Sales Order ${date.toISOString().split("T")[0]}`;

        // Find products with stock
        let availableProducts = [];
        productIds.forEach((pid) => {
          // Check all locations for this product
          locationIds.forEach((lid) => {
            const s = getStock(pid, lid);
            if (s.qty > 5)
              availableProducts.push({ pid, lid, qty: s.qty, cost: s.cost });
          });
        });

        if (availableProducts.length === 0) continue; // Skip if no stock

        // Header
        const transRes = await client.query(
          "INSERT INTO transactions (type, notes, customer_id, operator_id, date, created_at) VALUES ($1, $2, $3, $4, $5, $5) RETURNING id",
          ["OUT", notes, customer, adminId, date]
        );
        const transId = transRes.rows[0].id;

        const numItems = getRandomInt(1, 3);
        for (let k = 0; k < numItems; k++) {
          if (availableProducts.length === 0) break;

          const selectionIndex = getRandomInt(0, availableProducts.length - 1);
          const sel = availableProducts[selectionIndex];

          // Remove from choices to avoid duplicate lines same trans (simple logic)
          availableProducts.splice(selectionIndex, 1);

          const qtyOr = getRandomInt(1, Math.min(sel.qty, 20)); // Sell up to 20 or max stock
          const pInfo = productDetails.get(sel.pid);

          // Selling Price maybe +/- discount
          const actualSellingPrice = pInfo.sellingPrice;

          // Update Memory
          const stock = getStock(sel.pid, sel.lid);
          stock.qty -= qtyOr;

          // Insert Item
          await client.query(
            "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, purchase_price_at_trans, selling_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6)",
            [transId, sel.pid, sel.lid, qtyOr, stock.cost, actualSellingPrice]
          );

          // Update DB Stock
          await client.query(
            "UPDATE stock_levels SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3",
            [qtyOr, sel.pid, sel.lid]
          );
        }
        successCount++;
      }

      if (successCount % 50 === 0)
        console.log(`   Processed ${successCount} transactions...`);
    }

    console.log("✅ HEAVY SEED COMPLETED SUCCESSFULLY!");
    console.log(`Summary: Generated ${successCount} transactions.`);
  } catch (err) {
    console.error("❌ SEED ERROR:", err);
  } finally {
    client.release();
    process.exit(); // Force exit
  }
}

seedHeavy();
