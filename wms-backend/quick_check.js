const db = require("./config/db");
(async () => {
  try {
    const res = await db.query("SELECT COUNT(*) FROM transactions");
    console.log("COUNT:", res.rows[0].count);
  } catch (e) {
    console.error(e);
  }
  process.exit();
})();
