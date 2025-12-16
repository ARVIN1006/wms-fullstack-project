const db = require("../config/db");

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

// 1. STOCK STATUSES
exports.getStockStatuses = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name FROM stock_statuses ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR IN /stock-statuses:", err.message);
    res.status(500).send("Server Error saat mengambil status stok.");
  }
};

// 2. RECENT ACTIVITY
exports.getRecentActivity = async (req, res) => {
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
};

// 3. HISTORY
exports.getHistory = async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      type,
      supplierId,
      customerId,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "DESC",
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

    const safeSortField = ALLOWED_SORT_FIELDS.includes(sortBy)
      ? sortBy
      : sortBy === "transaction_date"
      ? "t.date"
      : "t.date";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

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
      ${orderByClause} 
      LIMIT $${queryParams.length + 1} 
      OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(parsedLimit);
    queryParams.push(offset);

    const dataResult = await db.query(dataQuery, queryParams);

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
};

// 4. HISTORY EXPORT
exports.getHistoryExport = async (req, res) => {
  try {
    const { type, supplierId, customerId, startDate, endDate } = req.query;

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
    res.json(dataResult.rows);
  } catch (err) {
    console.error("ERROR IN /history/export-all:", err.message);
    res.status(500).send("Server Error saat mengambil data ekspor transaksi.");
  }
};

// 5. MOVEMENTS
exports.getMovements = async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      startDate,
      endDate,
      fromLocationId,
      toLocationId,
      productId,
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

    const countQuery = `
      SELECT COUNT(m.id) FROM movements m ${whereString};
    `;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parsedLimit);

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

    queryParams.push(parsedLimit);
    queryParams.push(offset);

    const dataResult = await db.query(dataQuery, queryParams);

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
};

// 6. MOVEMENTS EXPORT
exports.getMovementsExport = async (req, res) => {
  try {
    const { startDate, endDate, fromLocationId, toLocationId, productId } =
      req.query;

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
    res.json(dataResult.rows);
  } catch (err) {
    console.error("ERROR IN /movements/export-all:", err.message);
    res.status(500).send("Server Error saat mengambil data ekspor pergerakan.");
  }
};

// 7. PERFORMANCE
exports.getPerformance = async (req, res) => {
  try {
    const { period = "all", startDate, endDate } = req.query;

    let start, end;

    if (period && period !== "all") {
      const days = parseInt(period.replace("last", ""));
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - days);
    } else {
      start = startDate ? new Date(startDate) : null;
      end = endDate ? new Date(endDate) : null;
    }

    if (!validateDateRange(start, end, res)) return;

    let params = [];
    let whereClauses = [];
    let i = 0;

    if (start) {
      i++;
      whereClauses.push(`t.date >= $${i}`);
      params.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      whereClauses.push(`t.date < $${i}`);
      params.push(end);
    }

    const whereStr =
      whereClauses.length > 0 ? ` AND ${whereClauses.join(" AND ")}` : "";

    const performanceQuery = `
      SELECT 
        u.username AS operator_name,
        COUNT(DISTINCT t.id) AS total_transactions,
        COALESCE(SUM(ti.quantity), 0) AS total_units, 
        AVG(CASE WHEN t.type = 'IN' THEN EXTRACT(EPOCH FROM (t.process_end - t.process_start)) END) / 60 AS avg_inbound_time,
        AVG(CASE WHEN t.type = 'OUT' THEN EXTRACT(EPOCH FROM (t.process_end - t.process_start)) END) / 60 AS avg_outbound_time,
        COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN ti.quantity * (COALESCE(ti.selling_price_at_trans, 0) - COALESCE(ti.purchase_price_at_trans, 0)) ELSE 0 END), 0) AS total_gross_profit
      FROM users u
      INNER JOIN transactions t ON u.id = t.operator_id
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE t.operator_id IS NOT NULL ${whereStr}
      GROUP BY u.username
      ORDER BY total_transactions DESC;
    `;

    const result = await db.query(performanceQuery, params);
    res.json({ reports: result.rows });
  } catch (err) {
    console.error("ERROR IN /performance:", err.message);
    res.status(500).send("Server Error saat mengambil laporan kinerja.");
  }
};

// 8. ACTIVITY
exports.getActivity = async (req, res) => {
  try {
    const { period = "all", startDate, endDate, operatorId } = req.query;

    let start, end;

    if (period && period !== "all") {
      const days = parseInt(period.replace("last", ""));
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - days);
    } else {
      start = startDate ? new Date(startDate) : null;
      end = endDate ? new Date(endDate) : null;
    }

    if (!validateDateRange(start, end, res)) return;

    let params = [];
    let i = 0;
    let dateWhere = [];
    let operatorWhere = "";

    if (start) {
      i++;
      dateWhere.push(`date >= $${i}`);
      params.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      dateWhere.push(`date < $${i}`);
      params.push(end);
    }

    const dateStr =
      dateWhere.length > 0 ? ` AND ${dateWhere.join(" AND ")}` : "";

    if (operatorId) {
      i++;
      operatorWhere = ` AND u.id = $${i}`;
      params.push(operatorId);
    }

    const query = `
      WITH Activities AS (
          SELECT 
              operator_id, 
              type,
              CASE WHEN type = 'IN' THEN ti.quantity
                   WHEN type = 'OUT' THEN ti.quantity
                   ELSE 0 END AS unit_quantity
          FROM transactions t
          JOIN transaction_items ti ON t.id = ti.transaction_id
          WHERE t.operator_id IS NOT NULL ${dateStr}
          
          UNION ALL
          
          SELECT 
              operator_id, 
              'MOVEMENT' as type,
              quantity as unit_quantity
          FROM movements m
          WHERE m.operator_id IS NOT NULL ${dateStr}
      )
      SELECT
        u.username AS operator_name,
        u.role,
        COUNT(a.operator_id) AS total_activities,
        COALESCE(SUM(CASE WHEN a.type = 'IN' THEN a.unit_quantity ELSE 0 END), 0) AS total_units_in,
        COALESCE(SUM(CASE WHEN a.type = 'OUT' THEN a.unit_quantity ELSE 0 END), 0) AS total_units_out,
        COALESCE(SUM(CASE WHEN a.type = 'MOVEMENT' THEN 1 ELSE 0 END), 0) AS total_movements
      FROM users u
      INNER JOIN Activities a ON u.id = a.operator_id 
      WHERE u.role IN ('admin', 'staff')
      ${operatorWhere}
      GROUP BY u.id, u.username, u.role
      ORDER BY total_activities DESC;
    `;

    const result = await db.query(query, params);
    res.json({ reports: result.rows });
  } catch (err) {
    console.error("ERROR IN /activity:", err.message);
    res.status(500).send("Server Error saat mengambil laporan aktivitas user.");
  }
};

// 9. CUSTOMER ORDER
exports.getCustomerOrder = async (req, res) => {
  try {
    const { period = "all", startDate, endDate } = req.query;

    let start, end;

    if (period && period !== "all") {
      const days = parseInt(period.replace("last", ""));
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - days);
    } else {
      start = startDate ? new Date(startDate) : null;
      end = endDate ? new Date(endDate) : null;
    }

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

    const whereStr = where.length > 0 ? ` AND ${where.join(" AND ")}` : "";

    const summaryQuery = `
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        COUNT(DISTINCT t.id) AS total_orders, 
        COALESCE(SUM(ti.quantity), 0) AS total_units_out,
        COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) AS total_sales_revenue,
        COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS total_cogs,
        COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) -
        COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS gross_profit
      FROM customers c
      INNER JOIN transactions t ON c.id = t.customer_id AND t.type = 'OUT'
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE t.type = 'OUT' ${whereStr}
      GROUP BY c.id, c.name
      ORDER BY gross_profit DESC;
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
      WHERE t.type = 'OUT' ${whereStr}
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
};

// 10. FINANCIAL
exports.getFinancial = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (start) {
      whereConditions.push(`t.date >= $${paramIndex++}`);
      params.push(start);
    }
    if (end) {
      const endDay = new Date(end);
      endDay.setDate(endDay.getDate() + 1);
      whereConditions.push(`t.date < $${paramIndex++}`);
      params.push(endDay);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const summaryQuery = `
        SELECT 
            COALESCE(SUM(ti.quantity * COALESCE(ti.selling_price_at_trans, 0)), 0) AS total_revenue,
            COALESCE(SUM(ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)), 0) AS total_cogs
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        ${whereClause} ${whereClause ? "AND" : "WHERE"} t.type = 'OUT'
    `;

    const summaryResult = await db.query(summaryQuery, params);
    const summaryRow = summaryResult.rows[0];

    const totalRevenue = parseFloat(summaryRow.total_revenue);
    const totalCOGS = parseFloat(summaryRow.total_cogs);
    const grossProfit = totalRevenue - totalCOGS;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const valuationQuery = `
        SELECT 
            COALESCE(SUM(s.quantity * p.purchase_price), 0) AS total_asset_value,
            COUNT(DISTINCT p.id) as total_products
        FROM products p
        JOIN stock_levels s ON p.id = s.product_id
    `;
    const valuationResult = await db.query(valuationQuery);
    const valuationRow = valuationResult.rows[0];

    const countQuery = `
        SELECT COUNT(DISTINCT t.id) 
        FROM transactions t
        ${whereClause}
    `;

    // Use params that match whereClause
    const countResult = await db.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parsedLimit);

    // B. Fetch Data Detail
    const listParams = [...params];
    listParams.push(parsedLimit); // Limit
    listParams.push(offset); // Offset

    const listQuery = `
        SELECT 
            t.id,
            t.date AS created_at,
            t.type,
            t.notes,
            c.name AS customer_name,
            s.name AS supplier_name,
            u.username AS operator_name,
            SUM(ti.quantity * 
                CASE 
                    WHEN t.type = 'OUT' THEN COALESCE(ti.selling_price_at_trans, 0)
                    ELSE COALESCE(ti.purchase_price_at_trans, 0)
                END
            ) AS total_amount,
            SUM(
                CASE 
                    WHEN t.type = 'OUT' THEN ti.quantity * COALESCE(ti.purchase_price_at_trans, 0)
                    ELSE 0
                END
            ) AS total_cogs,
            SUM(
                CASE 
                    WHEN t.type = 'OUT' THEN (ti.quantity * COALESCE(ti.selling_price_at_trans, 0)) - (ti.quantity * COALESCE(ti.purchase_price_at_trans, 0))
                    ELSE 0
                END
            ) AS profit
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN suppliers s ON t.supplier_id = s.id
        LEFT JOIN users u ON t.operator_id = u.id
        ${whereClause}
        GROUP BY t.id, t.date, t.type, t.notes, c.name, s.name, u.username
        ORDER BY t.date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const listResult = await db.query(listQuery, listParams);

    res.json({
      summary: {
        total_revenue: totalRevenue,
        total_cogs: totalCOGS,
        gross_profit: grossProfit,
        margin_percentage: margin,
      },
      valuation: {
        total_asset_value: parseFloat(valuationRow.total_asset_value),
        total_products: parseInt(valuationRow.total_products),
      },
      transactions: listResult.rows.map((row) => ({
        ...row,
        total_amount: parseFloat(row.total_amount),
        total_cogs: parseFloat(row.total_cogs),
        profit: parseFloat(row.profit),
      })),
      pagination: {
        totalCount,
        totalPages,
        currentPage: parsedPage,
      },
    });
  } catch (err) {
    console.error(`ERROR IN /financial: ${err.message}`);
    res.status(500).send("Server Error saat menghitung laporan keuangan.");
  }
};

// 11. INVENTORY STATUS
exports.getInventoryStatus = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      statusId,
      locationId,
    } = req.query;

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!validateDateRange(start, end, res)) return;

    let condition = ["ts.name <> 'Good'"];
    let params = [];
    let i = 0;

    if (statusId) {
      i++;
      condition.push(`ti.stock_status_id = $${i}`);
      params.push(statusId);
    }

    if (locationId) {
      i++;
      condition.push(`ti.location_id = $${i}`);
      params.push(locationId);
    }

    if (start) {
      i++;
      condition.push(`t.date >= $${i}`);
      params.push(start);
    }
    if (end) {
      i++;
      end.setDate(end.getDate() + 1);
      condition.push(`t.date < $${i}`);
      params.push(end);
    }

    const whereStr =
      condition.length > 0 ? ` WHERE ${condition.join(" AND ")}` : "";

    const countQuery = `
            SELECT COUNT(ti.id)
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN stock_statuses ts ON ti.stock_status_id = ts.id
            ${whereStr};
        `;
    const countResult = await db.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parsedLimit);

    const dataParams = [...params];
    dataParams.push(parsedLimit);
    dataParams.push(offset);

    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    const dataQuery = `
            SELECT
                t.date AS transaction_date,
                p.sku,
                p.name AS product_name,
                ti.quantity,
                ts.name AS stock_status_name,
                l.name AS location_name,
                ti.batch_number,
                ti.expiry_date,
                u.username AS operator_name
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            JOIN products p ON ti.product_id = p.id
            JOIN locations l ON ti.location_id = l.id
            JOIN stock_statuses ts ON ti.stock_status_id = ts.id
            LEFT JOIN users u ON t.operator_id = u.id
            ${whereStr}
            ORDER BY t.date DESC
            LIMIT $${limitIndex} OFFSET $${offsetIndex};
        `;

    const reportData = await db.query(dataQuery, dataParams);

    res.json({
      reports: reportData.rows,
      metadata: {
        totalPages: totalPages,
        currentPage: parsedPage,
        totalCount: totalCount,
      },
    });
  } catch (err) {
    console.error("ERROR IN /inventory-status:", err.message);
    res
      .status(500)
      .send("Server Error saat mengambil laporan status inventaris.");
  }
};
