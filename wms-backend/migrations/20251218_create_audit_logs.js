exports.up = function (knex) {
  return knex.schema.createTable("audit_logs", function (table) {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("action").notNullable(); // e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
    table.string("entity").nullable(); // e.g., 'Product', 'Order'
    table.integer("entity_id").nullable();
    table.jsonb("details").nullable(); // Store changed fields or snapshot
    table.string("ip_address").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("audit_logs");
};
