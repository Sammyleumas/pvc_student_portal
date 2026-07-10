import { useState, useEffect, FormEvent } from "react";
import { Student, AdminUser, DashboardStats, AuditLog } from "./types";
import Dashboard from "./components/Dashboard";
import RegisterStudent from "./components/RegisterStudent";
import StudentDirectory from "./components/StudentDirectory";
import ImportExport from "./components/ImportExport";
import AuditLogs from "./components/AuditLogs";
import VerificationView from "./components/VerificationView";
import StudentPortal from "./components/StudentPortal";
import PublicStudentRegister from "./components/PublicStudentRegister";
import PublicAdminRegister from "./components/PublicAdminRegister";
import AdminEvaluations from "./components/AdminEvaluations";
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  FileLock2, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard, 
  ShieldCheck,
  Smartphone,
  Lock,
  Mail,
  Award,
  GraduationCap,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Authentication & Session
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const stored = localStorage.getItem("admin_user");
    return stored ? JSON.parse(stored) : null;
  });

  // Student Session
  const [studentToken, setStudentToken] = useState<string | null>(localStorage.getItem("student_token"));
  const [student, setStudent] = useState<Student | null>(() => {
    const stored = localStorage.getItem("student_user");
    return stored ? JSON.parse(stored) : null;
  });

  // Portal Toggle on Login page: 'student' | 'admin'
  const [loginRole, setLoginRole] = useState<"student" | "admin">("student");

  // Portal login view state: 'login' | 'student-register' | 'admin-register'
  const [loginView, setLoginView] = useState<"login" | "student-register" | "admin-register">("login");

  // Navigation tabs: 'dashboard' | 'register' | 'directory' | 'import-export' | 'logs'
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Stats & Logs synced from Server
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    todaysRegistrations: 0,
    totalPvcGenerated: 0,
  });
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Student Login Form States
  const [studentEmail, setStudentEmail] = useState("");
  const [studentCredential, setStudentCredential] = useState("");

  // Parse Verification URL (e.g. /verify/PVC001)
  const pathname = window.location.pathname;
  const verifyMatch = pathname.match(/\/verify\/([A-Za-z0-9_-]+)/);
  const pvcIdFromUrl = verifyMatch ? verifyMatch[1] : null;

  // Sync session and fetch stats
  const handleLoginSuccess = (newToken: string, newAdmin: AdminUser) => {
    localStorage.setItem("admin_token", newToken);
    localStorage.setItem("admin_user", JSON.stringify(newAdmin));
    setToken(newToken);
    setAdmin(newAdmin);
    setLoginError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setAdmin(null);
    setActiveTab("dashboard");
  };

  const handleStudentLoginSuccess = (newToken: string, newStudent: Student) => {
    localStorage.setItem("student_token", newToken);
    localStorage.setItem("student_user", JSON.stringify(newStudent));
    setStudentToken(newToken);
    setStudent(newStudent);
    setLoginError("");
  };

  const handleStudentLogout = () => {
    localStorage.removeItem("student_token");
    localStorage.removeItem("student_user");
    setStudentToken(null);
    setStudent(null);
  };

  const fetchStatsAndLogs = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Recent Students (page 1, limit 5)
      const studentsRes = await fetch("/api/students?page=1&limit=5");
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setRecentStudents(studentsData.students);
      }

      // 3. Fetch Audit Logs
      const logsRes = await fetch("/api/audit-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.auditLogs);
      }
    } catch (err) {
      console.error("Failed to sync backend statistics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatsAndLogs();
    }
  }, [token]);

  // Handle Login Form Submit
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      handleLoginSuccess(data.token, data.admin);
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Student Login Form Submit
  const handleStudentLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: studentEmail, credential: studentCredential }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Student login failed");
      }

      handleStudentLoginSuccess(data.token, data.student);
    } catch (err: any) {
      setLoginError(err.message || "Invalid student credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  // If we are in public student credential verification mode, render that immediately
  if (pvcIdFromUrl) {
    return <VerificationView pvcId={pvcIdFromUrl} />;
  }

  // If we are logged in as a student, render the student portal immediately
  if (studentToken && student) {
    return <StudentPortal student={student} token={studentToken} onLogout={handleStudentLogout} />;
  }

  // Admin / Student login layout
  if (!token || !admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Soft elegant background shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          
          {/* Logo & Academy header */}
          <div className="text-center space-y-2">
            <div className="inline-flex w-14 h-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 rounded-2xl items-center justify-center font-black text-white text-xl shadow-xl shadow-blue-500/15 border border-white">
              SL
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wider">
                SL-TECHCO ACADEMY
              </h1>
              <p className="text-[11px] text-indigo-600 font-bold tracking-widest uppercase">
                PVC Student ID Management Portal
              </p>
            </div>
          </div>

          {/* Login card */}
          <div className="bg-white/70 backdrop-blur-md border border-white rounded-3xl p-6 md:p-8 shadow-xl">
            
            {loginView === "student-register" ? (
              <PublicStudentRegister
                onSuccess={(student, token) => {
                  handleStudentLoginSuccess(token, student);
                  setLoginView("login");
                }}
                onBack={() => setLoginView("login")}
              />
            ) : loginView === "admin-register" ? (
              <PublicAdminRegister
                onSuccess={(admin, token) => {
                  handleLoginSuccess(token, admin);
                  setLoginView("login");
                }}
                onBack={() => setLoginView("login")}
              />
            ) : (
              <>
                {/* Pill role switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
                  <button
                    type="button"
                    onClick={() => { setLoginRole("student"); setLoginError(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      loginRole === "student" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    Student Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginRole("admin"); setLoginError(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      loginRole === "admin" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    Admin Portal
                  </button>
                </div>

                {/* Error Notifications */}
                {loginError && (
                  <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-100 font-semibold mb-4">
                    {loginError}
                  </div>
                )}

                {loginRole === "student" ? (
                  /* STUDENT PORTAL FORM */
                  <form onSubmit={handleStudentLoginSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-slate-800">
                        Student Login Portal
                      </h2>
                      <p className="text-xs text-slate-500">
                        Log in with your registered credentials to view and print your active student ID card.
                      </p>
                    </div>

                    {/* Student Email */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Your Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="e.g. student@example.com"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Student Phone or PVC ID */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        PVC ID or Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="e.g. PVC001 or +234..."
                          value={studentCredential}
                          onChange={(e) => setStudentCredential(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Access Button */}
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {loginLoading ? (
                        "Retrieving Credentials..."
                      ) : (
                        <>
                          <GraduationCap className="w-4.5 h-4.5 text-cyan-300" />
                          View My ID Card
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-[11px] text-slate-500 leading-relaxed text-center space-y-2">
                      <div>
                        To get registered on the academy list, you can register yourself directly.
                      </div>
                      <div className="border-t border-slate-100 pt-2">
                        <button
                          type="button"
                          onClick={() => { setLoginView("student-register"); setLoginError(""); }}
                          className="text-indigo-600 hover:underline font-bold text-xs"
                        >
                          New Student? Register Yourself Here &rarr;
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* ADMINISTRATOR FORM */
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-slate-800">
                        Administrator Login
                      </h2>
                      <p className="text-xs text-slate-500">
                        Authorize admin session to register students and manage directories.
                      </p>
                    </div>

                    {/* Admin Email */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="e.g. admin@sltechco.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Admin Password */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Secret Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Admin Sign in Button */}
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {loginLoading ? (
                        "Authenticating Session..."
                      ) : (
                        <>
                          <ShieldCheck className="w-4.5 h-4.5 text-cyan-300" />
                          Authorize Portal Session
                        </>
                      )}
                    </button>

                    <div className="pt-2 border-t border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={() => { setLoginView("admin-register"); setLoginError(""); }}
                        className="text-blue-600 hover:underline font-bold text-xs"
                      >
                        Register New Administrator &rarr;
                      </button>
                    </div>

                    {/* Quick prefilled credentials guide for testing ease */}
                    <div className="mt-4 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-blue-800 space-y-1">
                      <span className="font-bold">Portal Demo Credentials:</span>
                      <div className="flex justify-between items-center text-slate-600 mt-1">
                        <span>Email: <span className="font-mono text-blue-900 font-bold">admin@sltechco.com</span></span>
                        <button 
                          type="button" 
                          onClick={() => { setLoginEmail("admin@sltechco.com"); setLoginPassword("admin123"); }}
                          className="text-blue-600 hover:underline font-bold"
                        >
                          Autofill
                        </button>
                      </div>
                      <div className="text-slate-600">Password: <span className="font-mono text-blue-900 font-bold">admin123</span></div>
                    </div>
                  </form>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    );
  }

  // Sidebar Menu List
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "register", label: "Register Student", icon: UserPlus },
    { id: "directory", label: "Student Directory", icon: Users },
    { id: "evaluations", label: "Project Evaluations", icon: Trophy },
    { id: "import-export", label: "Import & Export", icon: FileSpreadsheet },
    { id: "logs", label: "Audit Logs", icon: FileLock2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* 1. LEFT SIDEBAR - DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-950 shrink-0 select-none">
        
        {/* Brand logo */}
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-950 bg-slate-950/40">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center font-black text-white text-sm shadow">
            SL
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-xs tracking-wider uppercase leading-none">
              SL-TECHCO
            </span>
            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest leading-none mt-0.5">
              ID MANAGER
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const IconComp = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <IconComp className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Administrator profile in footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                A
              </div>
              <div className="overflow-hidden leading-tight">
                <h4 className="font-bold text-slate-200 text-xs truncate uppercase">
                  {admin.name}
                </h4>
                <span className="text-[9px] text-slate-500 font-medium">
                  {admin.role}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Logout Session"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE DRAWER SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-sm lg:hidden"
            />

            {/* Sidebar content */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-slate-900 border-r border-slate-950 lg:hidden"
            >
              <div className="h-16 px-6 flex items-center justify-between border-b border-slate-950 bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center font-black text-white text-sm shadow">
                    SL
                  </div>
                  <span className="font-bold text-white text-xs tracking-wider uppercase">
                    SL-TECHCO
                  </span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => {
                  const IconComp = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? "bg-blue-600 text-white shadow"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                      }`}
                    >
                      <IconComp className="w-4 h-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      A
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs uppercase">
                        {admin.name}
                      </h4>
                      <span className="text-[9px] text-slate-500 font-medium">
                        {admin.role}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsSidebarOpen(false);
                    }}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 3. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header bar */}
        <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between select-none">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-lg lg:hidden"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            
            <div className="hidden sm:flex flex-col">
              <span className="text-xs text-indigo-600 font-extrabold tracking-widest uppercase">
                SL-TECHCO ACADEMY PORTAL
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase leading-none mt-0.5 flex items-center gap-1">
                <Award className="w-3 h-3 text-cyan-500" />
                Professional Vibe Coding & AI Enrollment System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider leading-none">
                ✓ SYSTEM ONLINE
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Stage */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "dashboard" && (
                <Dashboard
                  stats={stats}
                  recentStudents={recentStudents}
                  auditLogs={auditLogs}
                  onNavigate={(tab) => setActiveTab(tab)}
                  adminName={admin.name}
                />
              )}

              {activeTab === "register" && (
                <RegisterStudent
                  token={token}
                  onRegisterSuccess={() => {
                    fetchStatsAndLogs();
                  }}
                />
              )}

              {activeTab === "directory" && (
                <StudentDirectory
                  token={token}
                  onUpdateStats={fetchStatsAndLogs}
                />
              )}

              {activeTab === "evaluations" && token && (
                <AdminEvaluations token={token} />
              )}

              {activeTab === "import-export" && (
                <ImportExport
                  token={token}
                  onImportSuccess={fetchStatsAndLogs}
                />
              )}

              {activeTab === "logs" && (
                <AuditLogs
                  logs={auditLogs}
                  onRefresh={fetchStatsAndLogs}
                  loading={loadingStats}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

    </div>
  );
}
