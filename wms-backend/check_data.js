const db = require("./config/db");

async function checkData() {
  try {
    const transactionCount = await db.query(
      "SELECT COUNT(*) FROM transactions"
    );
    console.log("Total Transactions:", transactionCount.rows[0].count);

    if (parseInt(transactionCount.rows[0].count) > 0) {
      const dateRange = await db.query(
        "SELECT MIN(date), MAX(date) FROM transactions"
      );
      console.log("Date Range:", dateRange.rows[0]);

      const types = await db.query(
        "SELECT type, COUNT(*) FROM transactions GROUP BY type"
      );
      console.log("Transaction Types:", types.rows);

      const outTransactions = await db.query(
        "SELECT COUNT(*) FROM transactions WHERE type = 'OUT'"
      );
      console.log("OUT Transactions:", outTransactions.rows[0].count);
    } else {
      console.log("No transactions found. Please seed data.");
    }
  } catch (err) {
    console.error("Error querying database:", err);
  } finally {
    process.exit();
  }
}

checkData();
