import { useState, useEffect, FormEvent } from "react";
import { 
  LogOut, GraduationCap, Calendar, ShieldCheck, Mail, Phone, Award, 
  BookOpen, Trophy, Send, CheckCircle2, Clock, ExternalLink, AlertCircle, 
  Sparkles, ChevronRight, User, Loader2, Bell 
} from "lucide-react";
import { Student, AssignmentSubmission, LeaderboardEntry } from "../types";
import PvcIdCard from "./PvcIdCard";

interface StudentPortalProps {
  student: Student;
  token: string;
  onLogout: () => void;
}

export default function StudentPortal({ student, token, onLogout }: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<"card" | "assignments" | "leaderboard" | "quiz">("card");
  
  // Submissions State
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitLink, setSubmitLink] = useState("");
  const [submitComments, setSubmitComments] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Quiz State
  const [todayQuiz, setTodayQuiz] = useState<any>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(Array(10).fill(-1));

  // Notifications & Active Study Target states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activeStudyModule, setActiveStudyModule] = useState("");

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchActiveStudyModule = async () => {
    try {
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setActiveStudyModule(data.settings.activeStudyModule);
        }
      }
    } catch (err) {
      console.error("Failed to fetch active module focus", err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchActiveStudyModule();
  }, [token]);

  // Fetch student submissions
  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch("/api/submissions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch("/api/leaderboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Fetch today's quiz
  const fetchTodayQuiz = async () => {
    setLoadingQuiz(true);
    setQuizError("");
    try {
      const res = await fetch("/api/quiz/today", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayQuiz(data.quiz || null);
        if (data.quiz && data.quiz.answers) {
          setSelectedAnswers(data.quiz.answers);
        } else {
          setSelectedAnswers(Array(10).fill(-1));
        }
      } else if (res.status === 404) {
        // Safe standard state: no quiz generated yet for today. Do not show error.
        setTodayQuiz(null);
      } else {
        const errData = await res.json();
        setQuizError(errData.error || "Failed to load today's quiz.");
      }
    } catch (err) {
      console.error("Failed to fetch today's quiz", err);
      setQuizError("Network error. Please try again.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Generate today's quiz
  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setQuizError("");
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate quiz.");
      }
      setTodayQuiz(data.quiz);
      setSelectedAnswers(Array(10).fill(-1));
    } catch (err: any) {
      setQuizError(err.message || "An error occurred during quiz generation.");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // Submit today's quiz
  const handleSubmitQuiz = async () => {
    if (selectedAnswers.includes(-1)) {
      setQuizError("Please answer all 10 questions before submitting.");
      return;
    }

    setSubmittingQuiz(true);
    setQuizError("");
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: todayQuiz.id,
          answers: selectedAnswers
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit quiz.");
      }
      setTodayQuiz(data.quiz);
      // Fetch leaderboard so rankings refresh if quiz score is added!
      fetchLeaderboard();
    } catch (err: any) {
      setQuizError(err.message || "An error occurred during submission.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleOptionChange = (qIdx: number, oIdx: number) => {
    const updated = [...selectedAnswers];
    updated[qIdx] = oIdx;
    setSelectedAnswers(updated);
  };

  // Trigger fetches on tab active
  useEffect(() => {
    fetchNotifications();
    fetchActiveStudyModule();
    if (activeTab === "assignments") {
      fetchSubmissions();
    } else if (activeTab === "leaderboard") {
      fetchLeaderboard();
    } else if (activeTab === "quiz") {
      fetchTodayQuiz();
    }
  }, [activeTab]);

  // Handle submit assignment
  const handleSubmitAssignment = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!submitTitle.trim() || !submitLink.trim()) {
      setSubmitError("Please fill in both the assignment title and submission link.");
      return;
    }

    // basic link validation
    if (!submitLink.startsWith("http://") && !submitLink.startsWith("https://")) {
      setSubmitError("Submission Link must start with http:// or https:// (e.g. GitHub URL, code link)");
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: submitTitle,
          submission_link: submitLink,
          comments: submitComments
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit assignment");
      }

      setSubmitTitle("");
      setSubmitLink("");
      setSubmitComments("");
      setSubmitSuccess(true);
      fetchSubmissions(); // refresh submissions list
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Find student entry in leaderboard for stats
  const studentLeaderboardEntry = leaderboard.find(entry => entry.student_id === student.id);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-950 px-6 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center font-black text-white text-sm shadow">
            SL
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-xs tracking-wider uppercase leading-none">
              SL-TECHCO ACADEMY
            </span>
            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest leading-none mt-0.5">
              STUDENT CREDENTIAL PORTAL
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      {/* Main Stage */}
      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Active Student Account
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
                Welcome back, {student.full_name}!
              </h1>
              <p className="text-xs text-slate-500 max-w-xl">
                Access your official cryptographic PVC student ID, submit code assignments to the evaluation engine, and keep track of your active ranking on the student leaderboard.
              </p>
            </div>
          </div>

          <div className="flex gap-6 border-t border-slate-100 pt-4 md:border-0 md:pt-0 shrink-0 font-mono text-[11px] text-slate-500">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">PVC Student ID</span>
              <span className="font-bold text-blue-600 text-sm">{student.pvc_id}</span>
            </div>
            {studentLeaderboardEntry && (
              <div className="space-y-1 border-l border-slate-100 pl-6">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Class Rank</span>
                <span className="font-black text-indigo-600 text-sm">#{studentLeaderboardEntry.rank}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap border-b border-slate-200 gap-y-1">
          <button
            id="tab-card"
            onClick={() => setActiveTab("card")}
            className={`px-5 py-3 border-b-2 text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-2 ${
              activeTab === "card"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Award className="w-4 h-4" />
            Digital ID Card
          </button>
          <button
            id="tab-assignments"
            onClick={() => setActiveTab("assignments")}
            className={`px-5 py-3 border-b-2 text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-2 ${
              activeTab === "assignments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Assignment Hub
          </button>
          <button
            id="tab-quiz"
            onClick={() => setActiveTab("quiz")}
            className={`px-5 py-3 border-b-2 text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-2 ${
              activeTab === "quiz"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Daily AI Quiz
          </button>
          <button
            id="tab-leaderboard"
            onClick={() => setActiveTab("leaderboard")}
            className={`px-5 py-3 border-b-2 text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-2 ${
              activeTab === "leaderboard"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN - Profile & Notification Hub */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* PROFILE CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div className="text-center space-y-4">
                <img
                  src={student.passport_photo}
                  alt={student.full_name}
                  className="w-24 h-32 object-cover mx-auto rounded-xl border border-slate-200 shadow-sm bg-slate-50"
                />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-tight">
                    {student.full_name}
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                    SL-TECHCO Candidate
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-4 text-xs text-slate-600">
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Department</span>
                    <span className="font-bold text-slate-800">Professional Vibe Coding & AI</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Email Address</span>
                    <span className="font-medium text-slate-800 break-all">{student.email_address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Phone Number</span>
                    <span className="font-medium text-slate-800">{student.phone_number}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Enrollment Date</span>
                    <span className="font-medium text-slate-800">{student.registration_date}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NOTIFICATION HUB */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Bell className="w-4 h-4 text-slate-500" />
                    {notifications.some(n => !n.read) && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Notification Hub
                  </h4>
                </div>
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={handleMarkNotificationsRead}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold transition-all"
                  >
                    Mark read
                  </button>
                )}
              </div>

              {loadingNotifications && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Syncing alert feed...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-[10px] uppercase tracking-wider text-slate-400">All caught up!</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">No recent alerts or evaluations.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                        notif.read
                          ? "bg-slate-50/50 border-slate-100 text-slate-600"
                          : "bg-blue-50/40 border-blue-100/80 text-slate-800 shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-[11px] leading-tight block">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono block">
                        {new Date(notif.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* DYNAMIC TAB STAGE - Right Panel */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* TAB 1: ID CARD VIEWER */}
            {activeTab === "card" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-cyan-600" />
                    Your Official Digital ID Badge (CR80 PVC)
                  </h3>
                </div>
                
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm flex items-center justify-center">
                  <PvcIdCard student={student} />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs leading-relaxed flex gap-2.5">
                  <ShieldCheck className="w-4.5 h-4.5 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">ID Verification Notice</span>
                    The QR code printed on the card back links directly to the secure verification domain. Any academy official or external entity can verify your student status by scanning this code using a mobile camera.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ASSIGNMENT HUB */}
            {activeTab === "assignments" && (
              <div className="space-y-6">
                
                {/* Submit Assignment Form */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-indigo-600" />
                      Submit New Assignment
                    </h3>
                    <p className="text-xs text-slate-400">
                      Submit your repository link or hosted demo link for assessment.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-100 flex items-start gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100 flex items-start gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span>Your assignment has been submitted successfully! The administration has been notified to score it.</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitAssignment} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Assignment Title
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. React Task Management Dashboard"
                          value={submitTitle}
                          onChange={(e) => { setSubmitTitle(e.target.value); setSubmitSuccess(false); }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Submission Link (GitHub / Demo)
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://github.com/..."
                          value={submitLink}
                          onChange={(e) => { setSubmitLink(e.target.value); setSubmitSuccess(false); }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Developer Comments & Technical Overview
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Add details about technology stacks, vibe coding techniques used, or notes to the admin."
                        value={submitComments}
                        onChange={(e) => setSubmitComments(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {submitLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Uploading Submission Details...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-cyan-300" />
                          Publish to Evaluator Engine
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Submissions List */}
                <div className="space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    My Previous Submissions ({submissions.length})
                  </h3>

                  {loadingSubmissions ? (
                    <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                      <span className="text-xs">Accessing submission registry...</span>
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl text-slate-400 space-y-1">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">No submissions found</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Submit your first project assignment above to kick off your academy track.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.map((sub) => (
                        <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 hover:border-slate-300 transition-all">
                          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-50 pb-2.5">
                            <div className="space-y-0.5">
                              <h4 className="font-bold text-slate-900 text-xs leading-tight">
                                {sub.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Submitted on: {new Date(sub.submitted_at).toLocaleDateString()} at {new Date(sub.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>

                            <div>
                              {sub.score !== undefined && sub.score !== null ? (
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full">
                                    Graded: {sub.score}/100
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  Pending Review
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-xs space-y-2">
                            <div className="flex items-center gap-1 text-blue-600 hover:underline">
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <a href={sub.submission_link} target="_blank" rel="noreferrer" className="font-mono truncate">
                                {sub.submission_link}
                              </a>
                            </div>

                            {sub.comments && (
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">My Developer Notes</span>
                                <p className="text-slate-600 text-[11px] leading-relaxed italic">{sub.comments}</p>
                              </div>
                            )}

                            {sub.feedback && (
                              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block mb-0.5">
                                  Evaluator Feedback (by {sub.graded_by})
                                </span>
                                <p className="text-slate-700 text-[11px] leading-relaxed font-medium">{sub.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: LEADERBOARD */}
            {activeTab === "leaderboard" && (
              <div className="space-y-4">
                
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Academy Student Rankings
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Updated live from score registry
                  </span>
                </div>

                {loadingLeaderboard ? (
                  <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    <span className="text-xs">Retrieving rankings board...</span>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">No leaderboard entries available</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-slate-100">
                      {leaderboard.map((entry, idx) => {
                        const isSelf = entry.student_id === student.id;
                        let rankColor = "text-slate-400 bg-slate-100";
                        if (entry.rank === 1) rankColor = "text-amber-700 bg-amber-100 border border-amber-200";
                        if (entry.rank === 2) rankColor = "text-slate-700 bg-slate-200 border border-slate-300";
                        if (entry.rank === 3) rankColor = "text-amber-800 bg-amber-50 border border-amber-100";

                        return (
                          <div
                            key={entry.student_id}
                            className={`p-4 flex items-center gap-4 transition-all ${
                              isSelf ? "bg-blue-50/50 border-l-4 border-blue-600" : "hover:bg-slate-50/40"
                            }`}
                          >
                            {/* Rank Badge */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${rankColor}`}>
                              {entry.rank}
                            </div>

                            {/* Passport Avatar */}
                            <img
                              src={entry.passport_photo}
                              alt={entry.full_name}
                              className="w-10 h-12 object-cover rounded-lg border border-slate-200 bg-white shrink-0 shadow-sm"
                            />

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-extrabold text-slate-900 text-xs truncate">
                                  {entry.full_name}
                                </h4>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-black uppercase text-blue-700 bg-blue-100 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>{entry.pvc_id}</span>
                                <span>•</span>
                                <span>{entry.submissions_count} projects graded</span>
                              </div>
                            </div>

                            {/* Score */}
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Score</span>
                              <span className="font-mono text-sm font-black text-slate-900">
                                {entry.total_score} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB 4: DAILY AI QUIZ */}
            {activeTab === "quiz" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Daily Textbook Assessment
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Receive 10 unique AI-generated questions daily from your course textbook
                    </p>
                  </div>
                  <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                    Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                {quizError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <p className="font-bold">Assessment Message</p>
                      <p>{quizError}</p>
                    </div>
                  </div>
                )}

                {loadingQuiz ? (
                  <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700">Accessing Daily Quiz Vault...</p>
                      <p className="text-[10px] text-slate-400">Verifying secure student tokens and fetching database records</p>
                    </div>
                  </div>
                ) : !todayQuiz ? (
                  <div className="space-y-6">
                    {/* STUDY PREPARATION NOTIFICATION CARD */}
                    {activeStudyModule && (
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden text-left">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl pointer-events-none" />
                        <div className="w-10 h-10 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 relative z-10 flex-1">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-700 block">
                            Study Focus Target Alert
                          </span>
                          <h4 className="text-xs font-black text-amber-900">
                            Active Study Preparation: {activeStudyModule}
                          </h4>
                          <p className="text-[10px] text-amber-700/80 leading-relaxed font-medium">
                            The academy administrator has configured today's curriculum to test concepts from <strong className="font-extrabold">{activeStudyModule}</strong>. Review this module inside your course textbook before generating today's assessment to maximize your scorecard potential!
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-center max-w-xl mx-auto">
                    <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-slate-900 text-base tracking-tight">Generate Today's AI Assessment</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Our server-side Gemini AI model will synthesize 10 multiple-choice questions selected dynamically from our textbook. Test your knowledge, unlock certificates, and earn leaderboard points!
                      </p>
                    </div>
                    <button
                      id="btn-generate-quiz"
                      disabled={generatingQuiz}
                      onClick={handleGenerateQuiz}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md tracking-wider uppercase transition-all"
                    >
                      {generatingQuiz ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Synthesizing Questions...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Start Today's Quiz
                        </>
                      )}
                    </button>
                    </div>
                  </div>
                ) : todayQuiz.answers ? (
                  /* SUBMITTED / GRADED QUIZ VIEW */
                  <div className="space-y-6">
                    {/* Score Header Card */}
                    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-950 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold text-cyan-300 bg-cyan-950/50 border border-cyan-800 rounded-full uppercase tracking-widest">
                            Daily Quiz Graded
                          </span>
                          <h4 className="font-black text-lg tracking-tight">Assessment Completed successfully!</h4>
                          <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
                            {todayQuiz.feedback || "Your scores have been logged to the SL-Techco database and added to your academy ranking profile."}
                          </p>
                        </div>
                        <div className="shrink-0 text-center md:text-right bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[120px]">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">SCORE</span>
                          <span className="font-mono text-3xl font-black text-cyan-400">{todayQuiz.score}%</span>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {todayQuiz.score / 10} / 10 Correct
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Question Answers Review List */}
                    <div className="space-y-4">
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        Detailed Question Review
                      </h4>

                      {todayQuiz.questions.map((q: any, qIdx: number) => {
                        const studentAns = todayQuiz.answers[qIdx];
                        const correctAns = q.correctAnswerIndex;
                        const isCorrect = studentAns === correctAns;

                        return (
                          <div key={qIdx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                            <div className="flex items-start gap-2.5">
                              <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                isCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                              }`}>
                                {qIdx + 1}
                              </span>
                              <p className="font-bold text-slate-900 text-xs leading-relaxed">
                                {q.question}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-8">
                              {q.options.map((opt: string, oIdx: number) => {
                                let optStyle = "bg-slate-50/50 text-slate-600 border-slate-200/80";
                                if (oIdx === correctAns) {
                                  optStyle = "bg-emerald-50/50 text-emerald-800 border-emerald-200 font-medium";
                                } else if (oIdx === studentAns && !isCorrect) {
                                  optStyle = "bg-red-50/50 text-red-800 border-red-200 font-medium";
                                }

                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-3 border rounded-xl text-xs flex items-center justify-between ${optStyle}`}
                                  >
                                    <span>{opt}</span>
                                    {oIdx === correctAns && (
                                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                        Correct
                                      </span>
                                    )}
                                    {oIdx === studentAns && !isCorrect && (
                                      <span className="text-[10px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                        Incorrect
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {q.explanation && (
                              <div className="bg-blue-50/40 border border-blue-100/50 rounded-xl p-3.5 pl-8 text-[11px] leading-relaxed text-slate-600">
                                <span className="font-bold text-blue-800 block mb-0.5">Gemini Explanation:</span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ACTIVE QUIZ FILL-IN VIEW */
                  <div className="space-y-6">
                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-bold text-amber-900">Academic Integrity Notice</p>
                        <p className="text-slate-600 leading-relaxed">
                          You are taking the Daily Assessment for {student.full_name}. Please answer all questions carefully before submitting. You cannot re-take or edit your answers once submitted.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {todayQuiz.questions.map((q: any, qIdx: number) => (
                        <div key={qIdx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-all">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 font-black text-indigo-700 text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {qIdx + 1}
                            </span>
                            <p className="font-bold text-slate-900 text-xs leading-relaxed">
                              {q.question}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-9">
                            {q.options.map((opt: string, oIdx: number) => {
                              const isSelected = selectedAnswers[qIdx] === oIdx;
                              return (
                                <button
                                  key={oIdx}
                                  id={`quiz-q${qIdx}-o${oIdx}`}
                                  type="button"
                                  onClick={() => handleOptionChange(qIdx, oIdx)}
                                  className={`p-3 border rounded-xl text-xs text-left transition-all ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-50/40 font-bold text-indigo-900 shadow-sm"
                                      : "border-slate-200 bg-slate-50/40 hover:bg-slate-100/50 text-slate-700"
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                      <span className="text-xs font-mono text-slate-400">
                        {selectedAnswers.filter(a => a !== -1).length} of 10 questions answered
                      </span>
                      <button
                        id="btn-submit-quiz"
                        disabled={selectedAnswers.includes(-1) || submittingQuiz}
                        onClick={handleSubmitQuiz}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-md tracking-wider uppercase transition-all"
                      >
                        {submittingQuiz ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Evaluating Answers...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Assessment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/60 bg-white text-center text-[10px] text-slate-400 select-none shrink-0">
        © {new Date().getFullYear()} SL-TECHCO ACADEMY. All student identity profiles are cryptographically hashed and cataloged securely.
      </footer>
    </div>
  );
}
