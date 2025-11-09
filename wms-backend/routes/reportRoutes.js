const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// Middleware: Hanya Admin yang boleh melihat semua laporan

// ===============================================
// 1. RUTE EXCEPTION (DIPERLUKAN STAFF/MASTER DATA)
// ===============================================

// GET /api/reports/stock-statuses - Mendapatkan semua status stok (Wajib untuk TransactionForm)
// Mengizinkan Admin dan Staff
router.get(
  "/stock-statuses",
  auth,
  authorize(["admin", "staff"]),
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT id, name FROM stock_statuses ORDER BY name ASC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error("ERROR IN /stock-statuses:", err.message);
      res.status(500).send("Server Error saat mengambil status stok.");
    }
  }
);

// GET /api/reports/recent-activity (Wajib untuk Dashboard)
router.get(
  "/recent-activity",
  auth,
  authorize(["admin", "staff"]),
  async (req, res) => {
    try {
      const query = `
          SELECT 
            t.id, t.date as transaction_date, t.type as transaction_type, ti.quantity,
            p.name as product_name, p.sku
          FROM transaction_items ti
          JOIN transactions t ON ti.transaction_id = t.id
          JOIN products p ON ti.product_id = p.id
          ORDER BY t.date DESC
          LIMIT 5;
        `;
      const result = await db.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("ERROR IN /recent-activity:", err.message);
      res.status(500).send("Server Error saat mengambil aktivitas terbaru.");
    }
  }
);
router.use(auth, authorize(["admin"]));

// ===============================================
// 2. Laporan Riwayat Transaksi (History - IN/OUT)
// ===============================================

// GET /api/reports/history - Laporan Transaksi LENGKAP DENGAN FILTER
router.get("/history", async (req, res) => {
  try {
    const { limit, type, supplierId, customerId, startDate, endDate } =
      req.query;

    let query = `
      SELECT 
        ti.id AS item_id,
        t.id, t.date AS transaction_date, t.type AS transaction_type, t.notes,
        t.process_start, t.process_end, p.sku, p.name AS product_name,
        p.purchase_price, p.selling_price, l.name AS location_name,
        ti.quantity, ts.name AS stock_status_name,
        CASE
          WHEN t.type = 'IN' THEN (ti.quantity * p.purchase_price)
          WHEN t.type = 'OUT' THEN (ti.quantity * p.selling_price)
          ELSE 0
        END AS transaction_value,
        s.name AS supplier_name,
        c.name AS customer_name,
        u.username AS operator_name
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      JOIN locations l ON ti.location_id = l.id
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.operator_id = u.id
      LEFT JOIN stock_statuses ts ON ti.stock_status_id = ts.id
    `;

    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 0;

    // Filter 1: Tipe Transaksi
    if (type) {
      paramIndex++;
      whereClauses.push(`t.type = $${paramIndex}`);
      queryParams.push(type);
    }

    // Filter 2: Supplier
    if (supplierId) {
      paramIndex++;
      whereClauses.push(`t.supplier_id = $${paramIndex}`);
      queryParams.push(parseInt(supplierId));
    }

    // Filter 3: Customer
    if (customerId) {
      paramIndex++;
      whereClauses.push(`t.customer_id = $${paramIndex}`);
      queryParams.push(parseInt(customerId));
    }

    // Filter 4: Tanggal
    if (startDate && endDate) {
      paramIndex++;
      whereClauses.push(`t.date >= $${paramIndex}`);
      queryParams.push(new Date(startDate));

      paramIndex++;
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      whereClauses.push(`t.date < $${paramIndex}`);
      queryParams.push(end);
    }

    // Gabungkan filter
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += ` ORDER BY t.date DESC`;

    if (limit) {
      queryParams.push(parseInt(limit));
      query += ` LIMIT $${queryParams.length}`;
    }

    const result = await db.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR IN /history:", err.message);
    res.status(500).send("Server Error saat mengambil laporan transaksi.");
  }
});

// ===============================================
// 3. Laporan Perpindahan Barang (Movement Report)
// ===============================================

// GET /api/reports/movements - Laporan Perpindahan Barang (DENGAN FILTER)
router.get('/movements', async (req, res) => {
  try {
    const { startDate, endDate, fromLocationId, toLocationId, productId } = req.query; 

    let query = `
      SELECT 
        m.date, p.sku, p.name AS product_name, m.quantity, m.reason,
        uf.name AS from_location_name, ut.name AS to_location_name, u.username AS operator_name
      FROM movements m
      JOIN products p ON m.product_id = p.id
      JOIN users u ON m.operator_id = u.id
      JOIN locations uf ON m.from_location_id = uf.id 
      JOIN locations ut ON m.to_location_id = ut.id
    `;
    
    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 0;

    // Filter 1: Tanggal
    if (startDate && endDate) {
        paramIndex++; whereClauses.push(`m.date >= $${paramIndex}`); queryParams.push(new Date(startDate));
        paramIndex++; const end = new Date(endDate); end.setDate(end.getDate() + 1); 
        whereClauses.push(`m.date < $${paramIndex}`); queryParams.push(end);
    }
    
    // Filter 2: Lokasi ASAL
    if (fromLocationId) {
        paramIndex++; whereClauses.push(`m.from_location_id = $${paramIndex}`); 
        queryParams.push(parseInt(fromLocationId));
    }
    
    // Filter 3: Lokasi TUJUAN
    if (toLocationId) {
        paramIndex++; whereClauses.push(`m.to_location_id = $${paramIndex}`); 
        queryParams.push(parseInt(toLocationId));
    }
    
    // Filter 4: Produk (SKU/ID) (BARU)
    if (productId) {
        paramIndex++;
        whereClauses.push(`m.product_id = $${paramIndex}`);
        queryParams.push(parseInt(productId));
    }

    if (whereClauses.length > 0) { query += ` WHERE ${whereClauses.join(' AND ')}`; }
    query += ` ORDER BY m.date DESC;`;

    const result = await db.query(query, queryParams);
    res.json(result.rows);

  } catch (err) {
    console.error('ERROR IN /movements:', err.message);
    res.status(500).send('Server Error saat mengambil laporan pergerakan.');
  }
});

// ===============================================
// 4. Laporan Kinerja Gudang (Performance Report)
// ===============================================

// GET /api/reports/performance - Laporan Kinerja Waktu Proses
router.get("/performance", async (req, res) => {
  try {
    const query = `
      SELECT 
        type,
        AVG(EXTRACT(EPOCH FROM (process_end - process_start))) AS avg_duration_seconds
      FROM transactions
      WHERE process_start IS NOT NULL AND process_end IS NOT NULL
      GROUP BY type
      ORDER BY type;
    `;

    const result = await db.query(query);

    const formattedResult = result.rows.map((row) => ({
      type: row.type,
      avg_duration_minutes: (
        parseFloat(row.avg_duration_seconds || 0) / 60
      ).toFixed(2),
    }));

    res.json(formattedResult);
  } catch (err) {
    console.error("ERROR IN /performance:", err.message);
    res.status(500).send("Server Error saat mengambil laporan kinerja.");
  }
});

// ===============================================
// 5. Laporan Aktivitas User (User Activity Report)
// ===============================================

// GET /api/reports/activity - Laporan Aktivitas User
router.get('/activity', auth, authorize(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, operatorId } = req.query; 

    // --- LOGIKA FILTER (DISEDERHANAKAN & AMAN) ---
    // Kita akan menggunakan $1, $2, $3 untuk parameter
    const queryParams = [
        startDate || '1970-01-01', // $1
        endDate ? new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) : '9999-12-31', // $2
        operatorId || null // $3
    ];
    
    // String WHERE untuk filter operator (opsional)
    const userWhereString = operatorId ? `AND u.id = $3` : '';
    // --- AKHIR LOGIKA FILTER ---


    const query = `
      WITH UserActivities AS (
          -- Aktivitas dari Transaksi (IN/OUT)
          SELECT operator_id, 
                 CASE 
                   WHEN type = 'IN' THEN 'Inbound' 
                   WHEN type = 'OUT' THEN 'Outbound' 
                   ELSE 'Transaction' 
                 END AS activity_type
          FROM transactions
          WHERE (date >= $1::date AND date < $2::date)
            AND ($3::int IS NULL OR operator_id = $3::int)
          
          UNION ALL
          
          -- Aktivitas dari Perpindahan (Movement)
          SELECT operator_id, 'Movement' AS activity_type
          FROM movements
          WHERE (date >= $1::date AND date < $2::date)
            AND ($3::int IS NULL OR operator_id = $3::int)
      )
      
      SELECT
          u.id AS operator_id,
          u.username AS operator_name,
          u.role,
          COUNT(a.operator_id) AS total_activities,
          COUNT(CASE WHEN a.activity_type = 'Inbound' THEN 1 END) AS total_inbound,
          COUNT(CASE WHEN a.activity_type = 'Outbound' THEN 1 END) AS total_outbound,
          COUNT(CASE WHEN a.activity_type = 'Movement' THEN 1 END) AS total_movements
          
      FROM users u
      
      -- PERBAIKAN: Ganti LEFT JOIN menjadi INNER JOIN
      -- Ini memastikan bahwa jika UserActivities kosong (karena filter tanggal), 
      -- tidak ada user yang akan ditampilkan.
      INNER JOIN UserActivities a ON u.id = a.operator_id 
      
      WHERE u.role IN ('admin', 'staff')
      ${userWhereString} -- Terapkan filter operator di sini jika ada
      
      GROUP BY u.id, u.username, u.role
      ORDER BY total_activities DESC;
    `;
    
    const result = await db.query(query, queryParams);
    
    res.json(result.rows);

  } catch (err) {
    console.error('ERROR IN /activity:', err.message);
    res.status(500).send('Server Error saat mengambil laporan aktivitas user.');
  }
});
// ===============================================
// 6. Laporan Customer & Order (Report No. 7)
// ===============================================

// GET /api/reports/customer-order - Laporan Order & Produk Terlaris per Pelanggan (FINAL DENGAN FILTER)
router.get("/customer-order", async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // <-- AMBIL FILTER

    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 0;

    // Logika Filter Tanggal
    if (startDate && endDate) {
      paramIndex++;
      whereClauses.push(`t.date >= $${paramIndex}`);
      queryParams.push(new Date(startDate));

      paramIndex++;
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      whereClauses.push(`t.date < $${paramIndex}`);
      queryParams.push(end);
    }

    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // 1. QUERY Customer Summary (Total Order dan Revenue per Pelanggan)
    const customerSummaryQuery = `
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        COUNT(DISTINCT t.id) AS total_orders, 
        COALESCE(SUM(ti.quantity * p.selling_price), 0) AS total_revenue
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id AND t.type = 'OUT'
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      LEFT JOIN products p ON ti.product_id = p.id
      ${whereString} -- <-- TERAPKAN FILTER TANGGAL
      GROUP BY c.id, c.name
      ORDER BY total_orders DESC;
    `;
    const summaryResult = await db.query(customerSummaryQuery, queryParams); // Kirim parameter

    // 2. Tentukan Produk Terlaris (Top 5 Global)
    const topProductQuery = `
      SELECT
        p.sku,
        p.name AS product_name,
        SUM(ti.quantity) AS total_units_sold
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id
      ${whereString} AND t.type = 'OUT' -- <-- TERAPKAN FILTER TANGGAL
      GROUP BY p.sku, p.name
      ORDER BY total_units_sold DESC
      LIMIT 5;
    `;
    const topProductResult = await db.query(topProductQuery, queryParams); // Kirim parameter

    res.json({
      customerSummary: summaryResult.rows,
      topSellingProducts: topProductResult.rows,
    });
  } catch (err) {
    console.error("ERROR IN /customer-order:", err.message);
    res.status(500).send("Server Error saat mengambil laporan pelanggan.");
  }
});

// ===============================================
// 7. Laporan Keuangan (Financial Overview)
// ===============================================

// GET /api/reports/financial - Laporan Keuangan (Final)
router.get("/financial", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 0;

    // Logika Filter Tanggal
    if (startDate && endDate) {
      paramIndex++;
      whereClauses.push(`t.date >= $${paramIndex}`);
      queryParams.push(new Date(startDate));

      paramIndex++;
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      whereClauses.push(`t.date < $${paramIndex}`);
      queryParams.push(end);
    }

    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // 1. QUERY VALUASI STOK
    const stockValueQuery = `
      SELECT 
          COALESCE(SUM(s.quantity * p.purchase_price), 0) AS total_asset_value,
          COALESCE(SUM(s.quantity), 0) AS total_units_in_stock
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id;
    `;
    const stockValueResult = await db.query(stockValueQuery);

    // 2. QUERY LABA KOTOR KESELURUHAN
    const profitQuery = `
        SELECT 
            COALESCE(SUM(ti.quantity * p.selling_price), 0) AS total_sales_revenue, 
            COALESCE(SUM(ti.quantity * p.purchase_price), 0) AS total_cogs,
            COALESCE(SUM(ti.quantity * p.selling_price), 0) - 
            COALESCE(SUM(ti.quantity * p.purchase_price), 0) AS gross_profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        JOIN products p ON ti.product_id = p.id
        ${whereString} AND t.type = 'OUT';
    `;
    const profitResult = await db.query(profitQuery, queryParams);

    // 3. QUERY PROFITABILITAS PER PRODUK
    const productProfitQuery = `
        SELECT
            p.sku,
            p.name AS product_name,
            COALESCE(SUM(ti.quantity * p.selling_price), 0) AS product_revenue,
            COALESCE(SUM(ti.quantity * p.purchase_price), 0) AS product_cogs,
            COALESCE(SUM(ti.quantity * p.selling_price), 0) - 
            COALESCE(SUM(ti.quantity * p.purchase_price), 0) AS product_gross_profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        JOIN products p ON ti.product_id = p.id
        ${whereString} AND t.type = 'OUT'
        GROUP BY p.sku, p.name 
        ORDER BY product_gross_profit DESC;
    `;
    const productProfitResult = await db.query(productProfitQuery, queryParams);

    // 4. QUERY TREND LABA KOTOR BULANAN
    const monthlyTrendQuery = `
        SELECT
            DATE_TRUNC('month', t.date) AS sale_month,
            COALESCE(SUM(ti.quantity * p.selling_price), 0) - 
            COALESCE(SUM(ti.quantity * p.purchase_price), 0) AS monthly_profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        JOIN products p ON ti.product_id = p.id
        WHERE t.type = 'OUT'
        GROUP BY sale_month
        ORDER BY sale_month ASC;
    `;
    const monthlyTrendResult = await db.query(monthlyTrendQuery);

    res.json({
      valuation: stockValueResult.rows[0],
      profit: profitResult.rows[0],
      profitByProduct: productProfitResult.rows,
      monthlyTrend: monthlyTrendResult.rows,
    });
  } catch (err) {
    console.error("ERROR IN /financial:", err.message);
    res.status(500).send("Server Error saat mengambil laporan keuangan.");
  }
});

module.exports = router;
