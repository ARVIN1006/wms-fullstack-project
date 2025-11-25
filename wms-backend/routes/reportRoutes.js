const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// ====================================================
// DAFTAR FIELD SORTING YANG DIIZINKAN
// ====================================================
const ALLOWED_SORT_FIELDS = [
  "transaction_date",
  "product_name",
  "quantity",
  "transaction_value",
  "operator_name",
];

// ====================================================
// FUNGSI VALIDASI TAMBAHAN
// ====================================================
function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}

function validateDateRange(start, end, res) {
  if ((start && !isValidDate(start)) || (end && !isValidDate(end))) {
    res.status(400).send("Format tanggal tidak valid.");
    return false;
  }
  return true;
}

// Middleware: Hanya Admin yang boleh melihat semua laporan utama
router.use(auth, authorize(["admin"]));

// ====================================================
// 1. RUTE EXCEPTION (WAJIB STAFF/MASTER DATA)
// ====================================================

// GET /api/reports/stock-statuses
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

// GET /api/reports/recent-activity
router.get(
  "/recent-activity",
  auth,
  authorize(["admin", "staff"]),
  async (req, res) => {
    try {
      const query = `
        SELECT 
          t.id, t.date AS transaction_date, t.type AS transaction_type, ti.quantity,
          p.name AS product_name, p.sku
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

// Middleware: Hanya Admin yang boleh melihat semua laporan utama
router.use(auth, authorize(["admin"]));

// ====================================================
// 2. LAPORAN RIWAYAT TRANSAKSI (HISTORY)
// ====================================================
router.get("/history", async (req, res) => {
  try {
    const {
      limit = 20, // Default limit
      page = 1, // Default page
      type,
      supplierId,
      customerId,
      startDate,
      endDate,
      sortBy = "date", // Default sort column di tabel transactions
      sortOrder = "DESC", // Default sort order
    } = req.query;

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let queryParams = [];
    let whereClauses = [];
    let i = 0;

    if (type) {
      i++;
      whereClauses.push(`t.type = $${i}`);
      queryParams.push(type);
    }
    if (supplierId) {
      i++;
      whereClauses.push(`t.supplier_id = $${i}`);
      queryParams.push(supplierId);
    }
    if (customerId) {
      i++;
      whereClauses.push(`t.customer_id = $${i}`);
      queryParams.push(customerId);
    }
    if (start) {
      i++;
      whereClauses.push(`t.date >= $${i}`);
      queryParams.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      whereClauses.push(`t.date < $${i}`);
      queryParams.push(end);
    }

    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // 1. Query COUNT (menggunakan filter)
    const countQuery = `
      SELECT COUNT(ti.id)
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN customers c ON t.customer_id = c.id
      ${whereString};
    `;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parsedLimit);

    // 2. Tentukan field sorting yang aman
    const safeSortField = ALLOWED_SORT_FIELDS.includes(sortBy)
      ? sortBy
      : sortBy === "transaction_date"
      ? "t.date"
      : "t.date"; // Default ke t.date
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // PENTING: Untuk sorting field di tabel JOIN, gunakan alias yang sesuai (misal: p.name)
    const orderByClause = `ORDER BY 
      ${
        sortBy === "product_name"
          ? "p.name"
          : sortBy === "transaction_value"
          ? "transaction_value"
          : sortBy === "operator_name"
          ? "u.username"
          : sortBy === "quantity"
          ? "ti.quantity"
          : "t.date"
      } ${order}`;

    // 3. Query DATA (menggunakan filter, sorting, limit, offset)
    const dataQuery = `
      SELECT 
        ti.id AS item_id,
        t.id, t.date AS transaction_date, t.type AS transaction_type, t.notes,
        t.process_start, t.process_end, p.sku, p.name AS product_name,
        ti.purchase_price_at_trans AS purchase_price, 
        ti.selling_price_at_trans AS selling_price,   
        l.name AS location_name,
        ti.quantity, ti.batch_number, ti.expiry_date, 
        ts.name AS stock_status_name,
        CASE
          WHEN t.type = 'IN' THEN (ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)) -- PERBAIKAN COALESCE
          WHEN t.type = 'OUT' THEN (ti.quantity * COALESCE(ti.selling_price_at_trans, 0))   -- PERBAIKAN COALESCE
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
      ${whereString} 
      ${orderByClause} 
      LIMIT $${queryParams.length + 1} 
      OFFSET $${queryParams.length + 2}
    `;

    // Tambahkan limit dan offset ke parameter
    queryParams.push(parsedLimit);
    queryParams.push(offset);

    const dataResult = await db.query(dataQuery, queryParams);

    // Mengembalikan data dan metadata pagination
    res.json({
      reports: dataResult.rows,
      totalPages,
      currentPage: parsedPage,
      totalCount,
    });
  } catch (err) {
    console.error("ERROR IN /history:", err.message);
    res.status(500).send("Server Error saat mengambil laporan transaksi.");
  }
});

// ====================================================
// 2A. RUTE EXPORT HISTORY (IGNORING PAGINATION) - BARU
// ====================================================
router.get("/history/export-all", async (req, res) => {
  try {
    const {
      type,
      supplierId,
      customerId,
      startDate,
      endDate,
    } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let queryParams = [];
    let whereClauses = [];
    let i = 0;

    if (type) {
      i++;
      whereClauses.push(`t.type = $${i}`);
      queryParams.push(type);
    }
    if (supplierId) {
      i++;
      whereClauses.push(`t.supplier_id = $${i}`);
      queryParams.push(supplierId);
    }
    if (customerId) {
      i++;
      whereClauses.push(`t.customer_id = $${i}`);
      queryParams.push(customerId);
    }
    if (start) {
      i++;
      whereClauses.push(`t.date >= $${i}`);
      queryParams.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      whereClauses.push(`t.date < $${i}`);
      queryParams.push(end);
    }

    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // Query DATA (TANPA LIMIT DAN OFFSET)
    const dataQuery = `
      SELECT 
        ti.id AS item_id,
        t.id, t.date AS transaction_date, t.type AS transaction_type, t.notes,
        t.process_start, t.process_end, p.sku, p.name AS product_name,
        ti.purchase_price_at_trans AS purchase_price, 
        ti.selling_price_at_trans AS selling_price,   
        l.name AS location_name,
        ti.quantity, ti.batch_number, ti.expiry_date, 
        ts.name AS stock_status_name,
        CASE
          WHEN t.type = 'IN' THEN (ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)) 
          WHEN t.type = 'OUT' THEN (ti.quantity * COALESCE(ti.selling_price_at_trans, 0))   
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
      ${whereString} 
      ORDER BY t.date DESC;
    `;

    const dataResult = await db.query(dataQuery, queryParams);

    // Mengembalikan data mentah (non-paginated)
    res.json(dataResult.rows);
  } catch (err) {
    console.error("ERROR IN /history/export-all:", err.message);
    res.status(500).send("Server Error saat mengambil data ekspor transaksi.");
  }
});

// ====================================================
// 3. LAPORAN PERPINDAHAN BARANG (MOVEMENT) - DITAMBAH PAGINATION
// ====================================================
router.get("/movements", async (req, res) => {
  try {
    const { 
      limit = 20, // Default limit
      page = 1, // Default page
      startDate, 
      endDate, 
      fromLocationId, 
      toLocationId, 
      productId 
    } = req.query;

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let queryParams = [];
    let whereClauses = [];
    let i = 0;

    if (start) {
      i++;
      whereClauses.push(`m.date >= $${i}`);
      queryParams.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      whereClauses.push(`m.date < $${i}`);
      queryParams.push(end);
    }
    if (fromLocationId) {
      i++;
      whereClauses.push(`m.from_location_id = $${i}`);
      queryParams.push(fromLocationId);
    }
    if (toLocationId) {
      i++;
      whereClauses.push(`m.to_location_id = $${i}`);
      queryParams.push(toLocationId);
    }
    if (productId) {
      i++;
      whereClauses.push(`m.product_id = $${i}`);
      queryParams.push(productId);
    }

    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";
      
    // 1. Query COUNT
    const countQuery = `
      SELECT COUNT(m.id) FROM movements m ${whereString};
    `;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parsedLimit);


    // 2. Query DATA
    const dataQuery = `
      SELECT 
        m.date, p.sku, p.name AS product_name, m.quantity, m.reason,
        uf.name AS from_location_name, ut.name AS to_location_name, u.username AS operator_name
      FROM movements m
      JOIN products p ON m.product_id = p.id
      JOIN users u ON m.operator_id = u.id
      JOIN locations uf ON m.from_location_id = uf.id 
      JOIN locations ut ON m.to_location_id = ut.id
      ${whereString} 
      ORDER BY m.date DESC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2}
    `;
    
    // Tambahkan limit dan offset ke parameter
    queryParams.push(parsedLimit);
    queryParams.push(offset);
    
    const dataResult = await db.query(dataQuery, queryParams);
    
    // Mengembalikan data dan metadata pagination
    res.json({
      reports: dataResult.rows,
      totalPages,
      currentPage: parsedPage,
      totalCount,
    });
  } catch (err) {
    console.error("ERROR IN /movements:", err.message);
    res.status(500).send("Server Error saat mengambil laporan pergerakan.");
  }
});


// ====================================================
// 3A. RUTE EXPORT ALL MOVEMENT (TANPA PAGINATION) - BARU
// ====================================================
router.get("/movements/export-all", async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      fromLocationId, 
      toLocationId, 
      productId 
    } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let queryParams = [];
    let whereClauses = [];
    let i = 0;

    if (start) {
      i++;
      whereClauses.push(`m.date >= $${i}`);
      queryParams.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      whereClauses.push(`m.date < $${i}`);
      queryParams.push(end);
    }
    if (fromLocationId) {
      i++;
      whereClauses.push(`m.from_location_id = $${i}`);
      queryParams.push(fromLocationId);
    }
    if (toLocationId) {
      i++;
      whereClauses.push(`m.to_location_id = $${i}`);
      queryParams.push(toLocationId);
    }
    if (productId) {
      i++;
      whereClauses.push(`m.product_id = $${i}`);
      queryParams.push(productId);
    }

    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";
      
    // Query DATA (TANPA LIMIT/OFFSET)
    const dataQuery = `
      SELECT 
        m.date, p.sku, p.name AS product_name, m.quantity, m.reason,
        uf.name AS from_location_name, ut.name AS to_location_name, u.username AS operator_name
      FROM movements m
      JOIN products p ON m.product_id = p.id
      JOIN users u ON m.operator_id = u.id
      JOIN locations uf ON m.from_location_id = uf.id 
      JOIN locations ut ON m.to_location_id = ut.id
      ${whereString} 
      ORDER BY m.date DESC
    `;
    
    const dataResult = await db.query(dataQuery, queryParams);
    
    // Mengembalikan data mentah (non-paginated)
    res.json(dataResult.rows);
  } catch (err) {
    console.error("ERROR IN /movements/export-all:", err.message);
    res.status(500).send("Server Error saat mengambil data ekspor pergerakan.");
  }
});

// ====================================================
// 4. LAPORAN KINERJA GUDANG
// ====================================================
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
    const formatted = result.rows.map((r) => ({
      type: r.type,
      avg_duration_minutes: (
        parseFloat(r.avg_duration_seconds || 0) / 60
      ).toFixed(2),
    }));

    res.json(formatted);
  } catch (err) {
    console.error("ERROR IN /performance:", err.message);
    res.status(500).send("Server Error saat mengambil laporan kinerja.");
  }
});

// ====================================================
// 5. LAPORAN AKTIVITAS USER (FIX BUG FILTER TANGGAL)
// ====================================================
router.get("/activity", async (req, res) => {
  try {
    const { startDate, endDate, operatorId } = req.query;

    const queryParams = [
      startDate || "1970-01-01",
      endDate
        ? new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1))
        : "9999-12-31",
      operatorId || null,
    ];

    const userWhere = operatorId ? `AND u.id = $3` : "";

    const query = `
      WITH UserActivities AS (
        SELECT operator_id, 
          CASE WHEN type = 'IN' THEN 'Inbound' 
               WHEN type = 'OUT' THEN 'Outbound' 
               ELSE 'Transaction' END AS activity_type
        FROM transactions
        WHERE (date >= $1::date AND date < $2::date)
          AND ($3::int IS NULL OR operator_id = $3::int)
        UNION ALL
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
      ${userWhere}
      GROUP BY u.id, u.username, u.role
      ORDER BY total_activities DESC;
    `;

    const result = await db.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR IN /activity:", err.message);
    res.status(500).send("Server Error saat mengambil laporan aktivitas user.");
  }
});

// ====================================================
// 6. LAPORAN CUSTOMER & ORDER (FIX BUG FILTER TANGGAL)
// ====================================================
router.get("/customer-order", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let where = [];
    let params = [];
    let i = 0;

    if (start) {
      i++;
      where.push(`t.date >= $${i}`);
      params.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      where.push(`t.date < $${i}`);
      params.push(end);
    }

    const whereStr = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
    const whereStrAnd =
      where.length > 0 ? ` WHERE ${where.join(" AND ")} AND ` : ` WHERE `;

    const summaryQuery = `
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        COUNT(DISTINCT t.id) AS total_orders, 
        COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) AS total_revenue -- PERBAIKAN COALESCE
      FROM customers c
      
      -- PERBAIKAN: Ganti LEFT JOIN menjadi INNER JOIN
      -- Ini memastikan hanya pelanggan DENGAN transaksi (sesuai filter) yang muncul
      INNER JOIN transactions t ON c.id = t.customer_id AND t.type = 'OUT'
      
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      LEFT JOIN products p ON ti.product_id = p.id
      ${whereStr}
      GROUP BY c.id, c.name
      ORDER BY total_orders DESC;
    `;
    const summary = await db.query(summaryQuery, params);

    const topProductQuery = `
      SELECT
        p.sku,
        p.name AS product_name,
        SUM(ti.quantity) AS total_units_sold
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id
      ${whereStrAnd} t.type = 'OUT'
      GROUP BY p.sku, p.name
      ORDER BY total_units_sold DESC
      LIMIT 5;
    `;
    const topProducts = await db.query(topProductQuery, params);

    res.json({
      customerSummary: summary.rows,
      topSellingProducts: topProducts.rows,
    });
  } catch (err) {
    console.error("ERROR IN /customer-order:", err.message);
    res.status(500).send("Server Error saat mengambil laporan pelanggan.");
  }
});

// ====================================================
// 7. LAPORAN KEUANGAN - VALUASI STOK DIPERBAIKI
// ====================================================
router.get("/financial", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let where = [];
    let params = [];
    let i = 0;

    if (start) {
      i++;
      where.push(`t.date >= $${i}`);
      params.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      where.push(`t.date < $${i}`);
      params.push(end);
    }

    const whereStr = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";

    // VALUASI STOK MENGGUNAKAN AVERAGE_COST DARI STOCK_LEVELS
    const stockValue = await db.query(`
      SELECT 
        COALESCE(SUM(s.quantity * s.average_cost), 0) AS total_asset_value,
        COALESCE(SUM(s.quantity), 0) AS total_units_in_stock
      FROM stock_levels s;
    `);

    // PERHITUNGAN PROFIT MENGGUNAKAN PURCHASE_PRICE_AT_TRANS (yang kini berisi Average Cost)
    const profit = await db.query(
      `
      SELECT 
        COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) AS total_sales_revenue, 
        COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS total_cogs,     
        COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) - 
        COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS gross_profit
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id
      ${whereStr} AND t.type = 'OUT';
      `,
      params
    );

    const productProfit = await db.query(
      `
      SELECT
        p.sku,
        p.name AS product_name,
        COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) AS product_revenue, -- PERBAIKAN COALESCE
        COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS product_cogs,     -- PERBAIKAN COALESCE
        COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) - 
        COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS product_gross_profit
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id
      ${whereStr} AND t.type = 'OUT'
      GROUP BY p.sku, p.name 
      ORDER BY product_gross_profit DESC;
      `,
      params
    );

    const monthlyTrend = await db.query(`
      SELECT
        DATE_TRUNC('month', t.date) AS sale_month,
        COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) - -- PERBAIKAN COALESCE
        COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS monthly_profit -- PERBAIKAN COALESCE
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id
      WHERE t.type = 'OUT'
      GROUP BY sale_month
      ORDER BY sale_month ASC;
    `);

    res.json({
      valuation: stockValue.rows[0],
      profit: profit.rows[0],
      profitByProduct: productProfit.rows,
      monthlyTrend: monthlyTrend.rows,
    });
  } catch (err) {
    console.error("ERROR IN /financial:", err.message);
    res.status(500).send("Server Error saat mengambil laporan keuangan.");
  }
});

// ====================================================
// 8. STATUS INVENTORY
// ====================================================
router.get("/status-inventory", async (req, res) => {
  try {
    const { startDate, endDate, statusId } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let query = `
      SELECT 
        ti.id AS item_id,
        t.date AS transaction_date,
        p.sku,
        p.name AS product_name,
        l.name AS location_name,
        ti.quantity,
        ss.name AS stock_status_name,
        ti.batch_number,
        ti.expiry_date,
        u.username AS operator_name
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      JOIN locations l ON ti.location_id = l.id
      JOIN stock_statuses ss ON ti.stock_status_id = ss.id
      LEFT JOIN users u ON t.operator_id = u.id
    `;

    let where = ["ss.name != 'Good'"];
    let params = [];
    let i = 0;

    if (start) {
      i++;
      where.push(`t.date >= $${i}`);
      params.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      where.push(`t.date < $${i}`);
      params.push(end);
    }
    if (statusId) {
      i++;
      where.push(`ti.stock_status_id = $${i}`);
      params.push(statusId);
    }

    query += ` WHERE ${where.join(" AND ")}`;
    query += ` ORDER BY t.date DESC;`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR IN /status-inventory:", err.message);
    res
      .status(500)
      .send("Server Error saat mengambil laporan status inventaris.");
  }
});

module.exports = router;