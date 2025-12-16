const db = require("../config/db");
const logger = require("../config/logger");

// Fungsi untuk mendapatkan data stok saat ini
async function getCurrentStockAndCost(client, productId, locationId) {
  const result = await client.query(
    "SELECT quantity, average_cost FROM stock_levels WHERE product_id = $1 AND location_id = $2 FOR UPDATE",
    [productId, locationId]
  );
  return result.rows[0] || { quantity: 0, average_cost: 0.0 };
}

// BARU: Fungsi Helper untuk Mendapatkan Utilisasi Volume Lokasi
async function getLocationVolumeUtilization(client, locationId) {
  // 1. Ambil Kapasitas Maksimum Lokasi
  const maxCapRes = await client.query(
    "SELECT max_capacity_m3 FROM locations WHERE id = $1",
    [locationId]
  );
  const maxCapacity = parseFloat(maxCapRes.rows[0]?.max_capacity_m3 || 0);

  // 2. Hitung Volume yang Sudah Terpakai Saat Ini
  const currentVolumeRes = await client.query(
    `
        SELECT 
            COALESCE(SUM(sl.quantity * p.volume_m3), 0) AS current_volume_used
        FROM stock_levels sl
        JOIN products p ON sl.product_id = p.id
        WHERE sl.location_id = $1
    `,
    [locationId]
  );
  const currentVolumeUsed = parseFloat(
    currentVolumeRes.rows[0]?.current_volume_used || 0
  );

  return { maxCapacity, currentVolumeUsed };
}

// POST /api/transactions/in (Barang Masuk - DENGAN KAPASITAS CEK)
exports.createTransactionIn = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { notes, items, supplier_id } = req.body;
    const operator_id = req.user.id;

    // --- Cek Kapasitas Lokasi untuk Setiap Item Masuk ---
    const checkedLocations = new Map();

    for (const item of items) {
      const {
        product_id,
        location_id,
        quantity: rawQuantity,
        purchase_price,
      } = item;
      const quantity = parseFloat(rawQuantity);

      if (quantity <= 0 || !product_id || !location_id) {
        throw new Error(
          "Item baris wajib memiliki Produk, Lokasi, dan Jumlah."
        );
      }

      // Ambil Volume Produk yang akan masuk
      const productVolumeRes = await client.query(
        "SELECT volume_m3 FROM products WHERE id = $1",
        [product_id]
      );
      const itemVolume = parseFloat(
        productVolumeRes.rows[0]?.volume_m3 || 0.01
      );
      const incomingVolume = itemVolume * quantity;

      // Hitung Utilisasi Volume Lokasi (Hanya dilakukan sekali per lokasi)
      if (!checkedLocations.has(location_id)) {
        const { maxCapacity, currentVolumeUsed } =
          await getLocationVolumeUtilization(client, location_id);
        checkedLocations.set(location_id, { maxCapacity, currentVolumeUsed });
      }

      const locationData = checkedLocations.get(location_id);

      const newTotalVolume = locationData.currentVolumeUsed + incomingVolume;

      // KRITIS: KAPASITAS CEK
      if (newTotalVolume > locationData.maxCapacity) {
        throw new Error(
          `Kapasitas Lokasi ${location_id} terlampaui. Volume terpakai baru: ${newTotalVolume.toFixed(
            2
          )} m³ (Maks: ${locationData.maxCapacity.toFixed(2)} m³)`
        );
      }

      // Update Total Volume Terpakai untuk lokasi tersebut (untuk item berikutnya)
      locationData.currentVolumeUsed = newTotalVolume;
    }

    // 1. Buat Header Transaksi
    const transResult = await client.query(
      "INSERT INTO transactions (type, notes, supplier_id, operator_id, process_start, process_end) VALUES ('IN', $1, $2, $3, NOW(), NOW()) RETURNING id",
      [notes, supplier_id || null, operator_id]
    );
    const transactionId = transResult.rows[0].id;

    // 2. Proses Setiap Item Barang (Loop Ulang untuk Mencegah Logika Duplikat)
    for (const item of items) {
      const {
        product_id,
        location_id,
        quantity: rawQuantity,
        stock_status_id,
        purchase_price, // Harga Beli Item Masuk
        selling_price,
        batch_number,
        expiry_date,
      } = item;

      const quantity = parseFloat(rawQuantity);

      // --- LOGIKA AVERAGE COST ---
      const currentStock = await getCurrentStockAndCost(
        client,
        product_id,
        location_id
      );
      const oldQty = parseFloat(currentStock.quantity);
      const oldAvgCost = parseFloat(currentStock.average_cost);
      const inQty = parseFloat(quantity);
      const inPrice = parseFloat(purchase_price);

      let newAvgCost;
      if (oldQty + inQty > 0) {
        newAvgCost = (oldQty * oldAvgCost + inQty * inPrice) / (oldQty + inQty);
      } else {
        newAvgCost = inPrice;
      }

      // 2a. Menyimpan detail di transaction_items (purchase_price_at_trans = Harga Masuk)
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number, expiry_date, purchase_price_at_trans, selling_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          transactionId,
          product_id,
          location_id,
          quantity,
          stock_status_id,
          batch_number || null,
          expiry_date || null,
          inPrice,
          selling_price,
        ]
      );

      // 2b. Update Stok dan Average Cost (UPSERT + UPDATE COST)
      // 2b. Update Stok dan Average Cost (UPSERT Manual untuk handle Batch NULL)
      // Cek stok eksisting untuk batch ini
      const checkStockQuery = `
          SELECT quantity FROM stock_levels 
          WHERE product_id = $1 AND location_id = $2 
          AND (batch_number = $3 OR (batch_number IS NULL AND $3 IS NULL))
        `;
      const existingStockRes = await client.query(checkStockQuery, [
        product_id,
        location_id,
        batch_number || null,
      ]);

      if (existingStockRes.rows.length > 0) {
        // Update
        await client.query(
          `UPDATE stock_levels 
              SET quantity = quantity + $3, average_cost = $4, expiry_date = COALESCE($5, expiry_date)
              WHERE product_id = $1 AND location_id = $2 
              AND (batch_number = $6 OR (batch_number IS NULL AND $6 IS NULL))`,
          [
            product_id,
            location_id,
            quantity,
            newAvgCost,
            expiry_date || null,
            batch_number || null,
          ]
        );
      } else {
        // Insert
        await client.query(
          `INSERT INTO stock_levels (product_id, location_id, quantity, average_cost, batch_number, expiry_date)
              VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            product_id,
            location_id,
            quantity,
            newAvgCost,
            batch_number || null,
            expiry_date || null,
          ]
        );
      }

      // 2c. Update Master Data Produk (Harga Jual Terbaru saja)
      if (selling_price > 0) {
        await client.query(
          "UPDATE products SET selling_price = $1 WHERE id = $2",
          [selling_price, product_id]
        );
      }
    }

    await client.query("COMMIT");

    req.io.emit("new_activity", {
      message: "Aktivitas Inbound baru tercatat!",
      type: "IN",
    });

    res.json({ msg: "Barang masuk berhasil dicatat!", transactionId });
  } catch (err) {
    await client.query("ROLLBACK");

    // Tangani error kapasitas dengan kode 400
    if (err.message.includes("Kapasitas Lokasi terlampaui")) {
      return res.status(400).json({ msg: err.message });
    }

    logger.error("TRANSACTION IN ERROR: " + err.message);
    res.status(500).json({ msg: "Gagal mencatat transaksi: " + err.message });
  } finally {
    client.release();
  }
};

// POST /api/transactions/out (Barang Keluar - AVERAGE COST IMPLEMENTATION)
exports.createTransactionOut = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { notes, items, customer_id } = req.body;
    const operator_id = req.user.id;
    console.log("REQ BODY OUT:", JSON.stringify(req.body, null, 2));

    // 1. Buat Header Transaksi
    const transResult = await client.query(
      "INSERT INTO transactions (type, notes, customer_id, operator_id, process_start, process_end) VALUES ('OUT', $1, $2, $3, NOW(), NOW()) RETURNING id",
      [notes, customer_id || null, operator_id]
    );
    const transactionId = transResult.rows[0].id;

    // 2. Proses Setiap Item Barang
    // 2. Proses Setiap Item Barang
    let idx = 0;
    for (const item of items) {
      idx++;
      const {
        product_id,
        location_id,
        quantity: rawQuantity,
        stock_status_id,
        selling_price,
        batch_number,
        expiry_date,
      } = item;

      const quantity = parseFloat(rawQuantity);

      // DEBUG LOG
      console.log(
        `Processing Item #${idx}: Product=${product_id}, Loc=${location_id}, Qty=${quantity}, Status=${stock_status_id}`
      );

      // VALIDASI VERBOSE
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(
          `Item #${idx}: Jumlah (Quantity) tidak valid atau 0 (Parsed: ${quantity}).`
        );
      }
      if (!product_id) throw new Error(`Item #${idx}: Produk belum dipilih.`);
      if (!location_id) throw new Error(`Item #${idx}: Lokasi belum dipilih.`);
      if (!stock_status_id)
        throw new Error(`Item #${idx}: Status Stok belum dipilih.`);

      // 2a. FIFO ALLOCATION LOGIC (Smart Batching)
      // Ambil semua batch yang tersedia, urutkan berdasarkan expiry_date (FIFO)
      const availableBatchesRes = await client.query(
        `SELECT batch_number, quantity, expiry_date, average_cost 
         FROM stock_levels 
         WHERE product_id = $1 AND location_id = $2 AND quantity > 0
         ORDER BY expiry_date ASC NULLS LAST, created_at ASC`,
        [product_id, location_id]
      );

      const availableBatches = availableBatchesRes.rows;
      const totalAvailable = availableBatches.reduce(
        (sum, b) => sum + parseFloat(b.quantity),
        0
      );

      if (totalAvailable < quantity) {
        throw new Error(
          `Item #${idx}: Stok tidak cukup di lokasi ini. (Tersedia: ${totalAvailable.toFixed(
            2
          )}, Diminta: ${quantity.toFixed(2)})`
        );
      }

      // Alokasi pengurangan stok dari batch (FIFO)
      let quantityToDeduct = quantity;

      for (const batch of availableBatches) {
        if (quantityToDeduct <= 0) break;

        const batchQty = parseFloat(batch.quantity);
        const deduct = Math.min(batchQty, quantityToDeduct);

        // Update stok batch ini
        await client.query(
          `UPDATE stock_levels 
            SET quantity = quantity - $1 
            WHERE product_id = $2 AND location_id = $3 
            AND (batch_number = $4 OR (batch_number IS NULL AND $4 IS NULL))`,
          [deduct, product_id, location_id, batch.batch_number]
        );

        // Catat di transaction_items (per batch allocation)
        // Jika satu item transaksi memakan banyak batch, idealnya kita split rows.
        // TAPI untuk simplifikasi di MVP ini, kita insert row transaksi UTAMA dengan batch FIFO pertama/dominan
        // ATAU kita biarkan batch_number NULL di trans_items jika multiple.
        // UNTUK AKURASI: Kita catat detail transaction_items terpisah untuk tiap batch yg kemakan?
        // SEMENTARA: Kita catat item transaksi general, tapi backend update stoknya detail.
        // Masalah: Nanti tracking batch mana yang keluar susah.
        // BETTER: Insert 1 row transaction_item per batch deduction.

        await client.query(
          "INSERT INTO transaction_items (transaction_id, product_id, location_id, quantity, stock_status_id, batch_number, expiry_date, selling_price_at_trans, purchase_price_at_trans) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            transactionId,
            product_id,
            location_id,
            deduct,
            stock_status_id,
            batch.batch_number, // Real batch used
            batch.expiry_date,
            selling_price,
            batch.average_cost, // True COGS for this specific batch
          ]
        );

        quantityToDeduct -= deduct;
      }

      // Update Master Data Produk (Harga Jual Terbaru)
      if (selling_price > 0) {
        await client.query(
          "UPDATE products SET selling_price = $1 WHERE id = $2",
          [selling_price, product_id]
        );
      }
    }

    await client.query("COMMIT");

    req.io.emit("new_activity", {
      message: "Aktivitas Outbound baru tercatat!",
      type: "OUT",
    });

    res.json({ msg: "Barang keluar berhasil dicatat!", transactionId });
  } catch (err) {
    await client.query("ROLLBACK");
    const statusCode = err.message.includes("Stok tidak cukup") ? 400 : 500;
    logger.error("TRANSACTION OUT ERROR: " + err.message);
    res.status(statusCode).json({ msg: err.message });
  } finally {
    client.release();
  }
};
