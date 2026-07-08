import { useState, useEffect } from "react";
import { 
  Trophy, BookOpen, Clock, CheckCircle2, Search, ExternalLink, 
  Sparkles, Loader2, Award, AlertCircle, Edit3, Send, RefreshCw, Star 
} from "lucide-react";
import { AssignmentSubmission, LeaderboardEntry } from "../types";

interface AdminEvaluationsProps {
  token: string;
}

const TEXTBOOK_MODULES = [
  "Module 1: Introduction to Vibe Coding",
  "Module 2: AI Tools for Vibe Coding",
  "Module 3: Prompt Engineering for Developers",
  "Module 4: Web Development with AI",
  "Module 5: No-Code and Low-Code Development",
  "Module 6: UI/UX Design with AI",
  "Module 7: Mobile App Development with AI",
  "Module 8: Databases and Backend Development",
  "Module 9: Automation with AI",
  "Module 10: AI Content Creation & Digital Products",
  "Module 11: SaaS Development with AI",
  "Module 12: Deployment and Launching",
  "Module 13: Freelancing & Client Acquisition",
  "Module 14: Advanced AI Agents & Professional Vibe Coding"
];

export default function AdminEvaluations({ token }: AdminEvaluationsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"submissions" | "leaderboard">("submissions");
  
  // Settings State
  const [notifyOnAIGrading, setNotifyOnAIGrading] = useState(true);
  const [activeStudyModule, setActiveStudyModule] = useState("Module 1: Introduction to Vibe Coding");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Submissions State
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "graded">("all");

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Grading State
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<number | "">("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [gradingError, setGradingError] = useState("");
  const [gradingLoading, setGradingLoading] = useState(false);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setNotifyOnAIGrading(data.settings.notifyOnAIGrading);
          setActiveStudyModule(data.settings.activeStudyModule);
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleUpdateSettings = async (notify: boolean, moduleStr: string) => {
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          notifyOnAIGrading: notify,
          activeStudyModule: moduleStr
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setNotifyOnAIGrading(data.settings.notifyOnAIGrading);
          setActiveStudyModule(data.settings.activeStudyModule);
          setSettingsSuccess(true);
          setTimeout(() => setSettingsSuccess(false), 3000);
        }
      }
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

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

  useEffect(() => {
    if (activeSubTab === "submissions") {
      fetchSubmissions();
    } else {
      fetchLeaderboard();
    }
  }, [activeSubTab]);

  const handleGradeSubmit = async (submissionId: string) => {
    setGradingError("");
    
    if (scoreInput === "") {
      setGradingError("Please enter a numeric score.");
      return;
    }

    const scoreNum = Number(scoreInput);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setGradingError("Score must be a number between 0 and 100.");
      return;
    }

    setGradingLoading(true);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          score: scoreNum,
          feedback: feedbackInput
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit grade");
      }

      // Reset grading state
      setGradingSubmissionId(null);
      setScoreInput("");
      setFeedbackInput("");
      
      // Refresh submissions
      fetchSubmissions();
    } catch (err: any) {
      setGradingError(err.message || "An unexpected error occurred.");
    } finally {
      setGradingLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = 
      sub.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.pvc_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.title.toLowerCase().includes(searchQuery.toLowerCase());

    const isGraded = sub.score !== undefined && sub.score !== null;
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "pending" && !isGraded) ||
      (statusFilter === "graded" && isGraded);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Academy Project Evaluations & Leaderboard
          </h2>
          <p className="text-xs text-slate-500">
            Assess submitted project repositories, assign official scores, and monitor live class rankings.
          </p>
        </div>

        {/* Tab switcher pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveSubTab("submissions")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === "submissions"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Student Submissions
          </button>
          <button
            onClick={() => setActiveSubTab("leaderboard")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === "leaderboard"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Class Leaderboard
          </button>
        </div>
      </div>

      {/* AI GRADED NOTIFICATIONS & STUDY COORDINATOR SETTINGS */}
      <div className="bg-slate-900 border border-slate-950 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400">
                  AI Evaluator & Daily Study Coordinator Settings
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Manage automated notification systems and sync the textbook study focus for daily assessments.
                </p>
              </div>
            </div>

            {settingsSuccess && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold animate-fade-in">
                ✓ Live settings updated and synced
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            
            {/* Toggle Switch */}
            <div className="space-y-2.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Automated Notifications Toggle
              </span>
              <label className="flex items-start gap-3 bg-slate-950/40 border border-slate-800 p-3.5 rounded-2xl cursor-pointer hover:bg-slate-950/60 transition-all">
                <input
                  type="checkbox"
                  checked={notifyOnAIGrading}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setNotifyOnAIGrading(val);
                    handleUpdateSettings(val, activeStudyModule);
                  }}
                  className="w-4.5 h-4.5 rounded-md border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 mt-0.5"
                />
                <div className="space-y-0.5 select-none">
                  <span className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                    Trigger student notifications on AI grade
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-relaxed font-medium">
                    When active, students will receive instant, detailed scorecard notifications with their calculated score and feedback whenever their code has been evaluated by the AI.
                  </span>
                </div>
              </label>
            </div>

            {/* Dropdown Selector for daily module focus */}
            <div className="space-y-2.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Daily Quiz Study Focus & Prep Alert
              </span>
              <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-2xl space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-300">
                    Active Study Target (14 modules of PVC-AID)
                  </label>
                  <select
                    value={activeStudyModule}
                    disabled={savingSettings}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveStudyModule(val);
                      handleUpdateSettings(notifyOnAIGrading, val);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {TEXTBOOK_MODULES.map((mod) => (
                      <option key={mod} value={mod} className="bg-slate-900">
                        {mod}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  Changing this module immediately issues a preparation notice to all candidates, instructing them which textbook chapter to study before attempting today's AI-synthesized daily quiz.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Sub-tab stages */}
      {activeSubTab === "submissions" ? (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by student, PVC ID, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filter:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                {(["all", "pending", "graded"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                      statusFilter === filter 
                        ? "bg-white text-slate-800 shadow-sm" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchSubmissions}
                className="ml-auto p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 shadow-sm transition-all flex items-center justify-center"
                title="Refresh List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSubmissions ? "animate-spin text-indigo-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* Submissions Lists */}
          {loadingSubmissions ? (
            <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 shadow-sm">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              <span className="text-xs font-medium">Synchronizing project evaluations list...</span>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200/80 rounded-2xl text-slate-400 shadow-sm space-y-1">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No matching submissions found</p>
              <p className="text-[10px] text-slate-400">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((sub) => {
                const isGraded = sub.score !== undefined && sub.score !== null;
                const isCurrentlyGrading = gradingSubmissionId === sub.id;

                return (
                  <div 
                    key={sub.id} 
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                      isCurrentlyGrading 
                        ? "border-blue-500 ring-2 ring-blue-500/10" 
                        : isGraded 
                          ? "border-slate-200 hover:border-slate-300" 
                          : "border-amber-200 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-50 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {sub.title}
                          </h4>
                          {isGraded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Graded: {sub.score}/100
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full">
                              <Clock className="w-3 h-3" />
                              Pending Review
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1">
                          <span className="font-extrabold text-indigo-600 uppercase">{sub.student_name}</span>
                          <span>({sub.pvc_id})</span>
                          <span>•</span>
                          <span>Submitted: {new Date(sub.submitted_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Grade Action button */}
                      {!isCurrentlyGrading && (
                        <button
                          onClick={() => {
                            setGradingSubmissionId(sub.id);
                            setScoreInput(sub.score !== undefined ? sub.score : "");
                            setFeedbackInput(sub.feedback || "");
                            setGradingError("");
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border shadow-sm transition-all flex items-center gap-1.5 ${
                            isGraded 
                              ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700" 
                              : "bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {isGraded ? "Update Score & Details" : "Add Score & Feedback"}
                        </button>
                      )}
                    </div>

                    {/* GRADING CONSOLE EXPANDED */}
                    {isCurrentlyGrading ? (
                      <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                          <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            Evaluation Console
                          </h5>
                          <button
                            onClick={() => setGradingSubmissionId(null)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                          >
                            Close
                          </button>
                        </div>

                        {gradingError && (
                          <div className="p-2.5 bg-rose-50 text-rose-800 text-[11px] rounded-xl border border-rose-100 flex items-start gap-2 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                            <span>{gradingError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-1 space-y-1">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Assigned Score (0 - 100) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              max="100"
                              placeholder="e.g. 85"
                              value={scoreInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setScoreInput(val === "" ? "" : Number(val));
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                            />
                          </div>

                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Assessor Feedback & Explanatory Details
                            </label>
                            <input
                              type="text"
                              placeholder="Describe assessment details, code layout review or recommended improvements..."
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setGradingSubmissionId(null)}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={gradingLoading}
                            onClick={() => handleGradeSubmit(sub.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1"
                          >
                            {gradingLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                Submit Assessment Score
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* METADATA VIEWS */
                      <div className="mt-3.5 text-xs space-y-2">
                        <div className="flex items-center gap-1 text-blue-600 hover:underline">
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <a href={sub.submission_link} target="_blank" rel="noreferrer" className="font-mono truncate">
                            {sub.submission_link}
                          </a>
                        </div>

                        {sub.comments && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Student Developer Notes</span>
                            <p className="text-slate-600 text-[11px] leading-relaxed italic">{sub.comments}</p>
                          </div>
                        )}

                        {isGraded && (
                          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">
                              Assessor Feedback (by {sub.graded_by})
                            </span>
                            <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                              {sub.feedback || "No additional feedback provided. Perfect execution."}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : (
        /* live leaderboard */
        <div className="space-y-4">
          <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-sm flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Rankings compiled live. Score criteria: Sum of graded assignment score values.
            </span>
            <button
              onClick={fetchLeaderboard}
              className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 shadow-sm transition-all"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLeaderboard ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>

          {loadingLeaderboard ? (
            <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 shadow-sm">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              <span className="text-xs font-medium">Retrieving live ranks...</span>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl text-slate-400 shadow-sm">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">Leaderboard is empty</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100">
                {leaderboard.map((entry, idx) => {
                  let rankColor = "text-slate-400 bg-slate-100";
                  if (entry.rank === 1) rankColor = "text-amber-700 bg-amber-100 border border-amber-200";
                  if (entry.rank === 2) rankColor = "text-slate-700 bg-slate-200 border border-slate-300";
                  if (entry.rank === 3) rankColor = "text-amber-800 bg-amber-50 border border-amber-100";

                  return (
                    <div
                      key={entry.student_id}
                      className="p-4 flex items-center gap-4 hover:bg-slate-50/40 transition-all"
                    >
                      {/* Rank badge */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${rankColor}`}>
                        {entry.rank}
                      </div>

                      {/* Student Portrait */}
                      <img
                        src={entry.passport_photo}
                        alt={entry.full_name}
                        className="w-10 h-12 object-cover rounded-lg border border-slate-200 bg-white shrink-0 shadow-xs"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-xs truncate uppercase tracking-tight">
                          {entry.full_name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>{entry.pvc_id}</span>
                          <span>•</span>
                          <span>{entry.submissions_count} graded projects</span>
                        </div>
                      </div>

                      {/* Cumulative Score */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Accumulated Score</span>
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

    </div>
  );
}
