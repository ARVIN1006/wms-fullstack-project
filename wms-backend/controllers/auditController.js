const db = require("../config/db");

// Helper Function: Log Audit
exports.logAudit = async (
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress = null
) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await db.query(query, [
      userId,
      action,
      entity,
      entityId,
      JSON.stringify(details),
      ipAddress,
    ]);
  } catch (err) {
    console.error("FAILED TO LOG AUDIT:", err.message);
    // Don't crash the main flow if logging fails
  }
};

// Route Handler: Get Logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, entity, action, userId } = req.query;
    const parsedLimit = parseInt(limit);
    const offset = (parseInt(page) - 1) * parsedLimit;

    let where = [];
    let params = [];
    let i = 0;

    if (entity) {
      i++;
      where.push(`a.entity = $${i}`);
      params.push(entity);
    }
    if (action) {
      i++;
      where.push(`a.action = $${i}`);
      params.push(action);
    }
    if (userId) {
      i++;
      where.push(`a.user_id = $${i}`);
      params.push(userId);
    }

    const whereStr = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const countRes = await db.query(
      `SELECT COUNT(*) FROM audit_logs a ${whereStr}`,
      params
    );
    const totalCount = parseInt(countRes.rows[0].count);
    const totalPages = Math.ceil(totalCount / parsedLimit);

    const query = `
      SELECT a.*, u.username 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereStr}
      ORDER BY a.created_at DESC
      LIMIT $${i + 1} OFFSET $${i + 2}
    `;

    params.push(parsedLimit, offset);

    const result = await db.query(query, params);

    res.json({
      logs: result.rows,
      totalPages,
      currentPage: parseInt(page),
      totalCount,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
