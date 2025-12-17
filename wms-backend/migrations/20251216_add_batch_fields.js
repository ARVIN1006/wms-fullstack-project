/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("stock_levels", (table) => {
    table.string("batch_number").nullable();
    table.date("expiry_date").nullable();
    // Drop the existing Primary Key (product_id, location_id)
    table.dropPrimary();
    // We add a unique constraint including batch_number.
    // Note: Postgres treats NULLs as distinct in UNIQUE indexes, so we might multiple NULL batches per location.
    // To prevent this, we'd need a partial index or COALESCE.
    // For now, we just add the columns and drop the strict PK to allow multiple batches.
    // table.unique(["product_id", "location_id", "batch_number"]);
    // Commented out unique for flexibility, application handles logic.
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("stock_levels", (table) => {
    table.dropUnique(["product_id", "location_id", "batch_number"]);
    table.unique(["product_id", "location_id"]);
    table.dropColumn("batch_number");
    table.dropColumn("expiry_date");
  });
};
