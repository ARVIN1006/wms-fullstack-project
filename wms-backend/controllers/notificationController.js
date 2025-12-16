const db = require("../config/db");
const logger = require("../config/logger");

// GET /api/notifications/alerts
exports.getAlerts = async (req, res) => {
  try {
    // 1. Low Stock Alerts
    const lowStockQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.min_stock, 
        COALESCE(SUM(s.quantity), 0) as current_stock,
        'low_stock' as type
      FROM products p
      LEFT JOIN stock_levels s ON p.id = s.product_id
      WHERE p.min_stock > 0
      GROUP BY p.id
      HAVING COALESCE(SUM(s.quantity), 0) <= p.min_stock
    `;

    // 2. Expiry Alerts (next 30 days)
    const expiryQuery = `
      SELECT 
        p.id as product_id, 
        p.name, 
        s.batch_number, 
        s.expiry_date, 
        s.quantity, 
        l.name as location_name,
        'expiry' as type
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE s.expiry_date IS NOT NULL 
      AND s.expiry_date <= NOW() + INTERVAL '30 days'
      AND s.quantity > 0
    `;

    const [lowStockResult, expiryResult] = await Promise.all([
      db.query(lowStockQuery),
      db.query(expiryQuery),
    ]);

    res.json({
      lowStock: lowStockResult.rows,
      expiry: expiryResult.rows,
      totalAttributes: lowStockResult.rowCount + expiryResult.rowCount,
    });
  } catch (err) {
    logger.error("ERROR IN NOTIFICATIONS: " + err.message);
    res.status(500).send("Server Error");
  }
};
