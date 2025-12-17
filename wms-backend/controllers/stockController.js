const db = require("../config/db");

// GET /api/stocks
exports.getStocks = async (req, res) => {
  try {
    const { page = 1, limit = 1000 } = req.query;
    const parsedLimit = parseInt(limit, 10) || 1000;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    // 1. Query COUNT
    const countQuery = `SELECT COUNT(*) FROM stock_levels s`;
    const countResult = await db.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / parsedLimit);

    // 2. Query DATA
    const query = `
      SELECT 
        p.name as product_name,
        p.sku,
        s.average_cost AS purchase_price, 
        l.name as location_name,
        s.quantity,
        (s.quantity * s.average_cost) AS stock_value
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY p.name ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(query, [parsedLimit, offset]);

    res.json({
      stocks: result.rows,
      totalPages,
      currentPage: parsedPage,
      totalCount,
    });
  } catch (err) {
    console.error("ERROR IN /api/stocks:", err.message);
    res.status(500).send("Server Error");
  }
};

// GET /api/stocks/low-stock
exports.getLowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 10;
    const query = `
      SELECT 
        p.id as product_id,
        p.sku,
        p.name as product_name,
        l.name as location_name,
        s.quantity
      FROM stock_levels s
      JOIN products p ON s.product_id = p.id
      JOIN locations l ON s.location_id = l.id
      WHERE s.quantity <= $1 AND s.quantity > 0
      ORDER BY s.quantity ASC;
    `;
    const result = await db.query(query, [threshold]);
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR IN /api/stocks/low-stock:", err.message);
    res.status(500).send("Server Error");
  }
};

// GET /api/stocks/batches - Suggest Batches (FIFO)
exports.getBatchSuggestions = async (req, res) => {
  try {
    const { productId, locationId } = req.query;
    if (!productId || !locationId) {
      return res
        .status(400)
        .json({ msg: "Product ID and Location ID required" });
    }

    const query = `
      SELECT 
        batch_number, 
        expiry_date, 
        quantity
      FROM stock_levels
      WHERE product_id = $1 AND location_id = $2 AND quantity > 0
      ORDER BY expiry_date ASC NULLS LAST
    `;
    const result = await db.query(query, [productId, locationId]);
    res.json(result.rows);
  } catch (err) {
    console.error("ERROR IN /api/stocks/batches:", err.message);
    res.status(500).send("Server Error");
  }
};

// GET /api/stocks/specific/:productId/:locationId
exports.getSpecificStock = async (req, res) => {
  try {
    const { productId, locationId } = req.params;
    const query = `
      SELECT quantity 
      FROM stock_levels 
      WHERE product_id = $1 AND location_id = $2
    `;
    const result = await db.query(query, [productId, locationId]);

    if (result.rows.length === 0) {
      return res.json({ system_count: 0 });
    }
    res.json({ system_count: result.rows[0].quantity });
  } catch (err) {
    console.error("ERROR IN /api/stocks/specific:", err.message);
    res.status(500).send("Server Error");
  }
};

// POST /api/stocks/opname
exports.createOpname = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const {
      product_id,
      location_id,
      adjustment_quantity,
      physical_count,
      system_count,
      notes,
    } = req.body;
    const operator_id = req.user.id;
    const adjustmentQty = parseInt(adjustment_quantity, 10);

    if (!product_id || !location_id) {
      return res.status(400).json({ msg: "Produk dan Lokasi wajib diisi." });
    }

    // 1. Update Stock Levels (Batch-aware)
    // Since we dropped the unique constraint on (product_id, location_id) alone,
    // we must find the specific batchless row (batch_number IS NULL) to update, or insert a new one.
    if (adjustmentQty !== 0) {
      const checkStock = await client.query(
        "SELECT * FROM stock_levels WHERE product_id = $1 AND location_id = $2 AND batch_number IS NULL",
        [product_id, location_id]
      );

      if (checkStock.rows.length > 0) {
        await client.query(
          "UPDATE stock_levels SET quantity = quantity + $1 WHERE product_id = $2 AND location_id = $3 AND batch_number IS NULL",
          [adjustmentQty, product_id, location_id]
        );
      } else {
        await client.query(
          "INSERT INTO stock_levels (product_id, location_id, quantity, batch_number) VALUES ($1, $2, $3, NULL)",
          [product_id, location_id, adjustmentQty]
        );
      }

      // 2. Log to Transactions (Opname History)
      // Determine type based on adjustment sign to satisfy constraint (IN/OUT)
      const transType = adjustmentQty >= 0 ? "IN" : "OUT";
      // Use absolute quantity for transaction items if needed, but here quantity is signed?
      // Transaction items usually store positive quantity.
      // Let's ensure we store positive quantity in items, and type indicates direction.
      const absQty = Math.abs(adjustmentQty);

      const transRes = await client.query(
        `INSERT INTO transactions (type, notes, operator_id, process_start, process_end) 
         VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
        [
          transType,
          `Opname Adjustment: Fisik(${physical_count}) vs Sistem(${system_count}). Notes: ${
            notes || "-"
          }`,
          operator_id,
        ]
      );
      const transactionId = transRes.rows[0].id;

      // 3. Log Transaction Item (Always positive quantity for the item record)
      await client.query(
        `INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number)
         VALUES ($1, $2, $3, $4, $5, NULL)`,
        [transactionId, product_id, location_id, absQty, 1] // 1 = Available/Good (Default)
      );
    }

    await client.query("COMMIT");
    res.status(200).json({
      msg: `Stok opname berhasil dicatat. Penyesuaian: ${adjustmentQty}`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("STOCK OPNAME ERROR:", err.message);
    res
      .status(500)
      .json({ msg: "Gagal mencatat penyesuaian stok: " + err.message });
  } finally {
    client.release();
  }
};
