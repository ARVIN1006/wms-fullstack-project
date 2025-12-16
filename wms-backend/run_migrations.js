require("dotenv").config();
const knex = require("knex");
const knexConfig = require("./knexfile");

const environment = process.env.NODE_ENV || "development";
const db = knex(knexConfig[environment]);

async function runMigrations() {
  console.log("Running migrations...");
  try {
    await db.migrate.latest();
    console.log("Migrations complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error running migrations:", err);
    process.exit(1);
  }
}

runMigrations();
