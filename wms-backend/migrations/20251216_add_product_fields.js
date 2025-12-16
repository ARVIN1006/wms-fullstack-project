/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("products", (table) => {
    table.integer("min_stock").defaultTo(0);
    table.string("barcode").unique().nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("products", (table) => {
    table.dropColumn("min_stock");
    table.dropColumn("barcode");
  });
};
