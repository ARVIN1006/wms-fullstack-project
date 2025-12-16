const path = require("path");
console.log("Starting script...");
const envPath = path.join(__dirname, "wms-backend", ".env");
console.log("Loading .env from:", envPath);
require("dotenv").config({ path: envPath });

console.log("DB Config:", {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const db = require("./wms-backend/config/db");

async function checkData() {
  const client = await db.connect();
  try {
    console.log("Checking Transactions Data...");

    // 1. Check total count
    const countRes = await client.query("SELECT COUNT(*) FROM transactions");
    console.log("Total Transactions:", countRes.rows[0].count);

    // 2. Check date range
    const dateRes = await client.query(
      "SELECT MIN(date), MAX(date) FROM transactions"
    );
    console.log("Date Range:", dateRes.rows[0]);

    // 3. Check data for current month (December 2025 based on system time)
    // System time is 2025-12-15
    const currentMonthRes = await client.query(`
            SELECT COUNT(*) FROM transactions 
            WHERE date >= '2025-12-01' AND date <= '2025-12-31'
        `);
    console.log("Transactions in Dec 2025:", currentMonthRes.rows[0].count);

    // 4. Sample transaction items to check prices
    const sampleQuery = `
            SELECT t.id, t.type, t.date, 
                   ti.quantity, ti.selling_price_at_trans, ti.purchase_price_at_trans
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transaction_id
            LIMIT 5
        `;
    const sampleRes = await client.query(sampleQuery);
    console.log("Sample Transaction Items:", sampleRes.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    process.exit();
  }
}

checkData();
