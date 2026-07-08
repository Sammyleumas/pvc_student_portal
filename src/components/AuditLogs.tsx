import { AuditLog } from "../types";
import { ShieldAlert, Clock, RefreshCw, FileLock2 } from "lucide-react";

interface AuditLogsProps {
  logs: AuditLog[];
  onRefresh: () => void;
  loading?: boolean;
}

export default function AuditLogs({ logs, onRefresh, loading = false }: AuditLogsProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            System Audit Logs
          </h1>
          <p className="text-xs text-slate-500">
            Secure tracking of administrator logins, student registrations, details editing, and records deletion.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl transition-all"
          title="Refresh History"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <FileLock2 className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-sm">No activity records logged in the database yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-4">Operator</th>
                  <th className="py-4 px-4">Event Type</th>
                  <th className="py-4 px-6">Operation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {log.admin_name}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        log.action.includes("Login") ? "bg-cyan-50 text-cyan-700 border border-cyan-100" :
                        log.action.includes("Register") ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        log.action.includes("Delete") ? "bg-rose-50 text-rose-700 border border-rose-100" :
                        "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600 leading-relaxed max-w-[400px]">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
