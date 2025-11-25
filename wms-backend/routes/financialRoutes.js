const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role"); // FIX: Menghapus require ganda

// Middleware: Hanya Admin yang boleh melihat laporan keuangan
router.use(auth, authorize(["admin"]));

// GET /api/reports/financial - Laporan Keuangan (Final Upgrade dengan Filter & Tren)
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Ambil filter

    let whereClauses = [];
    let queryParams = [];
    let paramIndex = 0;

    // Logika Filter Tanggal (Sama seperti di Report History)
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

    // --- 1. QUERY VALUASI STOK (TIDAK DIPENGARUHI OLEH FILTER TANGGAL) ---
    // Valuasi stok selalu berdasarkan stok saat ini
    const stockValueQuery = `
      SELECT 
          COALESCE(SUM(s.quantity * p.purchase_price), 0) AS total_asset_value,
          COALESCE(SUM(s.quantity), 0) AS total_units_in_stock
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id;
    `;
    const stockValueResult = await db.query(stockValueQuery);

    // --- 2. QUERY LABA KOTOR KESELURUHAN (DIPENGARUHI FILTER) ---
    // PERBAIKAN COALESCE
    const profitQuery = `
        SELECT 
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) AS total_sales_revenue, 
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS total_cogs,     
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) - 
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS gross_profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        JOIN products p ON ti.product_id = p.id
        ${whereString} AND t.type = 'OUT'; -- Gabungkan filter Tanggal
    `;
    const profitResult = await db.query(profitQuery, queryParams);

    // --- 3. QUERY PROFITABILITAS PER PRODUK (DIPENGARUHI FILTER) ---
    // PERBAIKAN COALESCE
    const productProfitQuery = `
        SELECT
            p.sku,
            p.name AS product_name,
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) AS product_revenue, 
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS product_cogs,     
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) - 
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS product_gross_profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        JOIN products p ON ti.product_id = p.id
        ${whereString} AND t.type = 'OUT'
        GROUP BY p.sku, p.name 
        ORDER BY product_gross_profit DESC;
    `;
    const productProfitResult = await db.query(productProfitQuery, queryParams);

    // --- 4. QUERY TREND LABA KOTOR BULANAN (BARU) ---
    // PERBAIKAN COALESCE
    const monthlyTrendQuery = `
        SELECT
            DATE_TRUNC('month', t.date) AS sale_month,
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) - 
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS monthly_profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        JOIN products p ON ti.product_id = p.id
        WHERE t.type = 'OUT'
        GROUP BY sale_month
        ORDER BY sale_month ASC;
    `;
    const monthlyTrendResult = await db.query(monthlyTrendQuery);

    // 5. Gabungkan hasil dan kirim
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