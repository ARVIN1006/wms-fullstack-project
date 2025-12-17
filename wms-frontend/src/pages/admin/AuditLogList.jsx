import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";

function AuditLogList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/audit-logs?page=${p}&limit=50`);
      setLogs(res.data.logs);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const actionColor = (action) => {
    if (action.includes("CREATE")) return "success";
    if (action.includes("UPDATE")) return "warning";
    if (action.includes("DELETE")) return "danger";
    return "primary";
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📜 Audit Logs</h1>
          <p className="text-sm text-gray-500">Rekam jejak aktivitas sistem.</p>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-600">Time</th>
                <th className="px-6 py-3 font-semibold text-gray-600">User</th>
                <th className="px-6 py-3 font-semibold text-gray-600">
                  Action
                </th>
                <th className="px-6 py-3 font-semibold text-gray-600">
                  Entity
                </th>
                <th className="px-6 py-3 font-semibold text-gray-600">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    Belum ada log aktivitas.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM HH:mm:ss")}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {log.username || "System"}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={actionColor(log.action)} size="sm">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {log.entity} #{log.entity_id}
                    </td>
                    <td className="px-6 py-3 text-xs font-mono text-gray-500 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AuditLogList;
