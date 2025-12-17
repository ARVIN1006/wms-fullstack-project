const db = require("../config/db");
const { logAudit } = require("./auditController");

// --- PURCHASE ORDERS ---

exports.getPurchaseOrders = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT po.*, s.name as supplier_name,
      (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as item_count
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const poResult = await db.query(
      `
      SELECT po.*, s.name as supplier_name 
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = $1
    `,
      [id]
    );

    if (poResult.rows.length === 0)
      return res.status(404).json({ msg: "PO not found" });

    const itemsResult = await db.query(
      `
      SELECT poi.*, p.name as product_name, p.sku 
      FROM purchase_order_items poi
      JOIN products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.id ASC
    `,
      [id]
    );

    res.json({ ...poResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.createPurchaseOrder = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { supplier_id, notes, items } = req.body;

    const poRes = await client.query(
      "INSERT INTO purchase_orders (supplier_id, notes, status) VALUES ($1, $2, $3) RETURNING id",
      [supplier_id, notes, "draft"]
    );
    const poId = poRes.rows[0].id;

    for (const item of items) {
      await client.query(
        "INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)",
        [poId, item.product_id, item.quantity, item.unit_price]
      );
    }

    await client.query("COMMIT");

    // Audit Log
    logAudit(req.user.id, "CREATE_PO", "PurchaseOrder", poId, {
      notes,
      supplier_id,
      total_items: items.length,
    });

    res.status(201).json({ msg: "PO Created", id: poId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message);
    res.status(500).send("Server Error");
  } finally {
    client.release();
  }
};

exports.updatePurchaseOrderStatus = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const { status, target_location_id } = req.body; // target_location_id required if status='received'

    // Get Current PO
    const poRes = await client.query(
      "SELECT * FROM purchase_orders WHERE id = $1",
      [id]
    );
    if (poRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ msg: "PO not found" });
    }
    const po = poRes.rows[0];

    // Transition Logic
    if (status === "received" && po.status !== "received") {
      // AUTO-RECEIVE: Create Inbound Transaction
      if (!target_location_id) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ msg: "Target Location ID is required to receive PO." });
      }

      const itemsRes = await client.query(
        "SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY id ASC",
        [id]
      );
      const items = itemsRes.rows;

      // Create Transaction Header
      const transRes = await client.query(
        "INSERT INTO transactions (type, notes, supplier_id, operator_id, process_start, process_end) VALUES ('IN', $1, $2, $3, NOW(), NOW()) RETURNING id",
        [`Received from PO #${id}`, po.supplier_id, req.user.id]
      );
      const transId = transRes.rows[0].id;

      // Process Items (Inbound Logic - Simplified)
      for (const item of items) {
        // Basic Stock Insert/Update
        // Note: We use 'Average Cost' logic here simply as the PO price
        await client.query(
          "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, purchase_price_at_trans) VALUES ($1, $2, $3, $4, 1, $5)",
          [
            transId,
            item.product_id,
            target_location_id,
            item.quantity,
            item.unit_price,
          ]
        );

        // UPdate Stock Level
        // Check exist
        const stockRes = await client.query(
          "SELECT quantity, average_cost FROM stock_levels WHERE product_id = $1 AND location_id = $2 AND batch_number IS NULL",
          [item.product_id, target_location_id]
        );

        if (stockRes.rows.length > 0) {
          // Avg Cost Calc
          const oldQty = parseFloat(stockRes.rows[0].quantity);
          const oldCost = parseFloat(stockRes.rows[0].average_cost);
          const newQty = parseFloat(item.quantity);
          const newCost =
            (oldQty * oldCost + newQty * parseFloat(item.unit_price)) /
            (oldQty + newQty);

          await client.query(
            "UPDATE stock_levels SET quantity = quantity + $1, average_cost = $2 WHERE product_id = $3 AND location_id = $4 AND batch_number IS NULL",
            [item.quantity, newCost, item.product_id, target_location_id]
          );
        } else {
          await client.query(
            "INSERT INTO stock_levels (product_id, location_id, quantity, average_cost, batch_number) VALUES ($1, $2, $3, $4, NULL)",
            [
              item.product_id,
              target_location_id,
              item.quantity,
              item.unit_price,
            ]
          );
        }
      }
    }

    // Update PO Status
    await client.query("UPDATE purchase_orders SET status = $1 WHERE id = $2", [
      status,
      id,
    ]);

    await client.query("COMMIT");

    // Audit Log
    logAudit(req.user.id, "UPDATE_PO_STATUS", "PurchaseOrder", id, {
      status,
      target_location_id,
    });

    res.json({ msg: `PO Status updated to ${status}` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message);
    res.status(500).send("Server Error");
  } finally {
    client.release();
  }
};

// --- SALES ORDERS ---

exports.getSalesOrders = async (req, res) => {
  try {
    const result = await db.query(`
        SELECT so.*, c.name as customer_name,
        (SELECT COUNT(*) FROM sales_order_items WHERE sales_order_id = so.id) as item_count
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        ORDER BY so.created_at DESC
      `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const soResult = await db.query(
      `
        SELECT so.*, c.name as customer_name 
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.id = $1
      `,
      [id]
    );

    if (soResult.rows.length === 0)
      return res.status(404).json({ msg: "SO not found" });

    const itemsResult = await db.query(
      `
        SELECT soi.*, p.name as product_name, p.sku 
        FROM sales_order_items soi
        JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = $1
        ORDER BY soi.id ASC
      `,
      [id]
    );

    res.json({ ...soResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.createSalesOrder = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { customer_id, notes, items } = req.body;

    const soRes = await client.query(
      "INSERT INTO sales_orders (customer_id, notes, status) VALUES ($1, $2, $3) RETURNING id",
      [customer_id, notes, "draft"]
    );
    const soId = soRes.rows[0].id;

    for (const item of items) {
      await client.query(
        "INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)",
        [soId, item.product_id, item.quantity, item.unit_price]
      );
    }

    await client.query("COMMIT");

    // Audit Log
    logAudit(req.user.id, "CREATE_SO", "SalesOrder", soId, {
      notes,
      customer_id,
      total_items: items.length,
    });

    res.status(201).json({ msg: "SO Created", id: soId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message);
    res.status(500).send("Server Error");
  } finally {
    client.release();
  }
};

exports.updateSalesOrderStatus = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const { status } = req.body;

    const soRes = await client.query(
      "SELECT * FROM sales_orders WHERE id = $1",
      [id]
    );
    if (soRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ msg: "SO not found" });
    }
    const so = soRes.rows[0];

    if (status === "shipped" && so.status !== "shipped") {
      // AUTO-SHIP: Create Outbound Transaction (FIFO)
      const itemsRes = await client.query(
        "SELECT * FROM sales_order_items WHERE sales_order_id = $1",
        [id]
      );
      const items = itemsRes.rows;

      // Check Stock FIRST
      for (const item of items) {
        const stockRes = await client.query(
          "SELECT SUM(quantity) as total FROM stock_levels WHERE product_id = $1",
          [item.product_id]
        );
        const totalObj = stockRes.rows[0].total;
        const total = totalObj ? parseFloat(totalObj) : 0;
        if (total < parseFloat(item.quantity)) {
          throw new Error(
            `Insufficient stock for Product ID ${item.product_id}`
          );
        }
      }

      // Create Transaction
      const transRes = await client.query(
        "INSERT INTO transactions (type, notes, customer_id, operator_id, process_start, process_end) VALUES ('OUT', $1, $2, $3, NOW(), NOW()) RETURNING id",
        [`Shipped for SO #${id}`, so.customer_id, req.user.id]
      );
      const transId = transRes.rows[0].id;

      // FIFO Logic per item
      for (const item of items) {
        let qtyNeeded = parseFloat(item.quantity);

        // Get Batches ASC expiry
        const batchesRes = await client.query(
          `
                  SELECT * FROM stock_levels 
                  WHERE product_id = $1 AND quantity > 0
                  ORDER BY expiry_date ASC NULLS LAST
              `,
          [item.product_id]
        );

        for (const batch of batchesRes.rows) {
          if (qtyNeeded <= 0) break;

          const batchQty = parseFloat(batch.quantity);
          const deduct = Math.min(batchQty, qtyNeeded);

          // Deduct
          await client.query(
            "UPDATE stock_levels SET quantity = quantity - $1 WHERE product_id = $2 AND location_id = $3 AND (batch_number = $4 OR (batch_number IS NULL AND $4 IS NULL))",
            [deduct, item.product_id, batch.location_id, batch.batch_number]
          );

          // Record Item
          await client.query(
            "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number, expiry_date, selling_price_at_trans, purchase_price_at_trans) VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8)",
            [
              transId,
              item.product_id,
              batch.location_id,
              deduct,
              batch.batch_number,
              batch.expiry_date,
              item.unit_price,
              batch.average_cost,
            ]
          );

          qtyNeeded -= deduct;
        }
      }
    }

    await client.query("UPDATE sales_orders SET status = $1 WHERE id = $2", [
      status,
      id,
    ]);

    await client.query("COMMIT");

    // Audit Log
    logAudit(req.user.id, "UPDATE_SO_STATUS", "SalesOrder", id, { status });

    res.json({ msg: `SO Status updated to ${status}` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  } finally {
    client.release();
  }
};

// GET PENDING COUNTS
exports.getPendingCounts = async (req, res) => {
  try {
    const poCount = await db.query(
      `SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft', 'submitted')`
    );
    const soCount = await db.query(
      `SELECT COUNT(*) FROM sales_orders WHERE status IN ('draft', 'confirmed')`
    );

    res.json({
      pending_po: parseInt(poCount.rows[0].count),
      pending_so: parseInt(soCount.rows[0].count),
    });
  } catch (err) {
    console.error("ERROR IN getPendingCounts:", err.message);
    res.status(500).send("Server Error");
  }
};
