/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("stock_levels", (table) => {
    table.string("batch_number").nullable();
    table.date("expiry_date").nullable();
    // We are NOT dropping the unique constraint on (product_id, location_id) yet
    // to avoid breaking existing logic. We will rely on application logic
    // to manage batches or use a separate row for each batch if we decide to drop constraint later.
    // For now, let's assume stock_levels sums up, OR we just add columns for info.
    // WAIT. If we want FIFO, we MUST distinguish rows.
    // So we should drop the constraint.
    table.dropUnique(["product_id", "location_id"]);
    table.unique(["product_id", "location_id", "batch_number"]);
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
