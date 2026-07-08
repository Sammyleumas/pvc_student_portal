import { useEffect, useState } from "react";
import { DashboardStats, Student, AuditLog } from "../types";
import { Users, CalendarCheck, CreditCard, Award, ArrowRight, ShieldCheck, Database } from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  stats: DashboardStats;
  recentStudents: Student[];
  auditLogs: AuditLog[];
  onNavigate: (tab: string) => void;
  adminName: string;
}

export default function Dashboard({
  stats,
  recentStudents,
  auditLogs,
  onNavigate,
  adminName,
}: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white shadow-xl">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300 bg-cyan-500/15 border border-cyan-500/20 rounded-full">
            <Award className="w-3.5 h-3.5 animate-pulse" />
            PROFESSIONAL VIBE CODING AND AI DEVELOPMENT
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome, {adminName}
          </h1>
          <p className="text-sm md:text-base text-blue-100 max-w-2xl leading-relaxed">
            Welcome to the SL-TECHCO ACADEMY PVC Student ID Management System. Use this portal to register new candidates, generate unique sequential PVC ID credentials, and print standard CR80 PVC identity cards.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate("register")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-500 text-blue-950 font-bold text-sm rounded-xl transition shadow-lg hover:shadow-cyan-400/20"
            >
              Register New Student
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ambient Decorative Shapes */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Students */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/45 backdrop-blur-md p-6 shadow-md hover:shadow-lg transition-all"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Total Enrolled
              </span>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                {stats.totalStudents}
              </h2>
            </div>
            <div className="p-3 bg-blue-100/80 rounded-xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
            <Database className="w-3.5 h-3.5" />
            <span>Active student records database</span>
          </div>
        </motion.div>

        {/* Today's Registrations */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/45 backdrop-blur-md p-6 shadow-md hover:shadow-lg transition-all"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Today's Enrollments
              </span>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                {stats.todaysRegistrations}
              </h2>
            </div>
            <div className="p-3 bg-cyan-100/80 rounded-xl text-cyan-600">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-600">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping" />
            <span>Real-time enrollment rate</span>
          </div>
        </motion.div>

        {/* Total PVC Cards Issued */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/45 backdrop-blur-md p-6 shadow-md hover:shadow-lg transition-all"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Max PVC Number
              </span>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                {stats.totalPvcGenerated > 0
                  ? `PVC${stats.totalPvcGenerated.toString().padStart(3, "0")}`
                  : "N/A"}
              </h2>
            </div>
            <div className="p-3 bg-indigo-100/80 rounded-xl text-indigo-600">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sequential IDs (no duplicates)</span>
          </div>
        </motion.div>

      </div>

      {/* Main Grid: Recent Registrations & System Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Registrations Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-lg">
              Recent Student Registrations
            </h3>
            <button
              onClick={() => onNavigate("directory")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View Directory
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 text-slate-300 stroke-[1.5]" />
              <p className="text-sm">No student registrations found.</p>
              <button
                onClick={() => onNavigate("register")}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Create your first registration
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentStudents.slice(0, 5).map((student) => (
                <div key={student.id} className="py-3 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <img
                      src={student.passport_photo}
                      alt={student.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                        {student.full_name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        {student.pvc_id} • {student.email_address}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {student.registration_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Activity Logs Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-lg">
              System Audit Logs
            </h3>
            <button
              onClick={() => onNavigate("logs")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Full History
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xs">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {log.details}
                  </p>
                  <div className="text-[10px] text-slate-400 font-medium">
                    By: {log.admin_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
