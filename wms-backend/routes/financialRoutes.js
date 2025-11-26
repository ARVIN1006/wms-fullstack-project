const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const authorize = require("../middleware/role");

// Middleware: Hanya Admin yang boleh melihat laporan keuangan
router.use(auth, authorize(["admin"]));

// Helper untuk validasi dan pembangunan kondisi tanggal
const validateDateRange = (start, end, res) => {
    const isValidDate = (date) => date instanceof Date && !isNaN(date);
    if ((start && !isValidDate(start)) || (end && !isValidDate(end))) {
        res.status(400).send("Format tanggal tidak valid.");
        return false;
    }
    return true;
}

// GET /api/reports/financial - Laporan Keuangan (Final Upgrade dengan Filter & Tren)
router.get("/", async (req, res) => {
  const client = await db.connect();
  try {
    const { startDate, endDate, summaryPage = 1, summaryLimit = 10 } = req.query; 

    const parsedLimit = parseInt(summaryLimit, 10);
    const parsedPage = parseInt(summaryPage, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (!validateDateRange(start, end, res)) return;

    let params = [];
    let i = 0;

    // Logika Filter Tanggal untuk query Profit dan Trend
    if (start) {
      i++;
      params.push(start);
    }
    if (end) {
      i++;
      const endDateExclusive = new Date(end.getTime());
      endDateExclusive.setDate(endDateExclusive.getDate() + 1);
      params.push(endDateExclusive);
    }

    // String kondisi untuk WHERE di query Profit/Trend
    const dateCondition = params.length > 0 
        ? ` AND t.date >= $${i - (params.length === 2 ? 1 : 0)} AND t.date < $${i}` 
        : "";
    
    // --- 1. QUERY VALUASI STOK (Snapshot saat ini) ---
    const stockValueQuery = `
      SELECT 
          COALESCE(SUM(s.quantity * s.average_cost), 0) AS total_asset_value,
          COALESCE(SUM(s.quantity), 0) AS total_units_in_stock
      FROM stock_levels s;
    `;
    const stockValueResult = await client.query(stockValueQuery);

    // --- 2. QUERY LABA KOTOR KESELURUHAN (DIPENGARUHI FILTER TANGGAL) ---
    const profitQuery = `
        SELECT 
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) AS total_sales_revenue, 
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS total_cogs,     
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) - 
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS gross_profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        WHERE t.type = 'OUT' ${dateCondition}; 
    `;
    const profitResult = await client.query(profitQuery, params);

    // --- 3. QUERY TREND LABA KOTOR BULANAN (DIPENGARUHI FILTER TANGGAL) ---
    const monthlyTrendQuery = `
        SELECT
            DATE_TRUNC('month', t.date) AS sale_month,
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) - 
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS monthly_profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        WHERE t.type = 'OUT' ${dateCondition}
        GROUP BY sale_month
        ORDER BY sale_month ASC;
    `;
    const monthlyTrendResult = await client.query(monthlyTrendQuery, params); 

    // --- 4. QUERY PAGINATED PRODUCT SUMMARY (Valuation) ---
    const productValuationCountQuery = `
      SELECT COUNT(p.id)
      FROM products p
      INNER JOIN stock_levels sl ON p.id = sl.product_id
      GROUP BY p.id
      HAVING COALESCE(SUM(sl.quantity), 0) > 0;
    `;
    const productValuationCountResult = await client.query(productValuationCountQuery);
    const productSummaryTotalCount = productValuationCountResult.rows.length; 
    const productSummaryTotalPages = Math.ceil(productSummaryTotalCount / parsedLimit);

    // Query untuk data paginasi
    const productValuationQuery = `
      SELECT
        p.sku,
        p.name AS product_name,
        COALESCE(SUM(sl.quantity), 0) AS total_quantity_in_stock,
        COALESCE(SUM(sl.quantity * sl.average_cost), 0) AS total_value_asset,
        AVG(sl.average_cost) AS average_cost
      FROM products p
      INNER JOIN stock_levels sl ON p.id = sl.product_id
      GROUP BY p.sku, p.name
      HAVING COALESCE(SUM(sl.quantity), 0) > 0
      ORDER BY total_value_asset DESC
      LIMIT $1 OFFSET $2;
    `;
    const valuationParams = [parsedLimit, offset];
    const productValuation = await client.query(productValuationQuery, valuationParams);

    // --- 5. FINAL RESPONSE ---
    res.json({
      valuation: stockValueResult.rows[0],
      profit: profitResult.rows[0],
      product_summary: productValuation.rows, 
      monthlyTrend: monthlyTrendResult.rows, // KRITIS: Memastikan key ini dikirim
      productSummaryMetadata: { 
          totalPages: productSummaryTotalPages,
          currentPage: parsedPage,
          totalCount: productSummaryTotalCount,
      },
    });
  } catch (err) {
    console.error("FINAL ERROR IN /financial:", err.message);
    res.status(500).send("Server Error saat mengambil laporan keuangan.");
  } finally {
    client.release();
  }
});
module.exports = router;