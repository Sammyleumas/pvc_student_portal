import { useState, useEffect, FormEvent } from "react";
import { Student } from "../types";
import { Search, Eye, Edit2, Trash2, Printer, ChevronLeft, ChevronRight, X, AlertTriangle, Phone, Mail, Sparkles, User, FileText, Check } from "lucide-react";
import PvcIdCard from "./PvcIdCard";

interface StudentDirectoryProps {
  token: string;
  onUpdateStats: () => void;
}

export default function StudentDirectory({ token, onUpdateStats }: StudentDirectoryProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal / Interaction states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Fetch Students from API
  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/students?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=8`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to retrieve student directory");
      }
      setStudents(data.students);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalRecords(data.pagination.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to connect to API.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1); // Reset page on new search
      fetchStudents();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Handle page change
  useEffect(() => {
    fetchStudents();
  }, [page]);

  // Open Edit Modal
  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    setEditName(student.full_name);
    setEditPhone(student.phone_number);
    setEditEmail(student.email_address);
    setEditPhoto(student.passport_photo);
    setEditError("");
  };

  // Save Edit Changes
  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    setEditError("");
    setEditSaving(true);

    try {
      const response = await fetch(`/api/students/${studentToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: editName,
          phone_number: editPhone,
          email_address: editEmail,
          passport_photo: editPhoto,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save edits");
      }

      setStudentToEdit(null);
      fetchStudents();
      onUpdateStats();
    } catch (err: any) {
      setEditError(err.message || "Failed to update record.");
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      const response = await fetch(`/api/students/${studentToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete student record");
      }

      setStudentToDelete(null);
      fetchStudents();
      onUpdateStats();
    } catch (err: any) {
      alert(err.message || "An error occurred during deletion.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            Student Directory
          </h1>
          <p className="text-xs text-slate-500">
            Browse registered students, edit records, and trigger premium CR80 PVC card printing.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-80 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by PVC ID, name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading && students.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold">Retrieving Student Records...</p>
          </div>
        ) : error ? (
          <div className="p-16 text-center text-rose-600 space-y-2">
            <AlertTriangle className="w-10 h-10 mx-auto text-rose-400" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Search className="w-10 h-10 text-slate-300 stroke-[1.5] mx-auto" />
            <p className="text-sm">No students match your query criteria.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  <th className="py-4 px-6">PVC ID</th>
                  <th className="py-4 px-4">Photo</th>
                  <th className="py-4 px-4">Student Name</th>
                  <th className="py-4 px-4">Phone Number</th>
                  <th className="py-4 px-4">Email Address</th>
                  <th className="py-4 px-4">Registered</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6 font-mono font-black text-blue-900 text-sm">
                      {student.pvc_id}
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-9 h-11 bg-slate-100 rounded border border-slate-200 overflow-hidden shadow-sm">
                        <img
                          src={student.passport_photo}
                          alt={student.full_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-800 uppercase tracking-tight max-w-[150px] truncate">
                      {student.full_name}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {student.phone_number}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium truncate max-w-[180px]">
                      {student.email_address}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium whitespace-nowrap">
                      {student.registration_date}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          title="View PVC Card & Print"
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(student)}
                          title="Edit Details"
                          className="p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(student)}
                          title="Delete Student"
                          className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Control Bar */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Showing page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages}</span> ({totalRecords} total student records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: VIEW CARD & PRINT MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                PVC Student ID Card - SL-TECHCO ACADEMY
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render ID Card Layout */}
            <div className="py-4">
              <PvcIdCard student={selectedStudent} />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT STUDENT DETAILS MODAL */}
      {studentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
          <form 
            onSubmit={handleSaveEdit}
            className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                Edit Student Details: {studentToEdit.pvc_id}
              </h3>
              <button
                type="button"
                onClick={() => setStudentToEdit(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100">
                {editError}
              </div>
            )}

            <div className="space-y-3.5">
              {/* Photo selector/display */}
              <div className="flex items-center gap-4">
                <img
                  src={editPhoto}
                  alt="Avatar"
                  className="w-12 h-16 object-cover border border-slate-200 rounded-lg"
                />
                <div className="text-[11px] text-slate-500">
                  <p className="font-bold">Passport Photo Loaded</p>
                  <p>Photo remains preserved. To replace, upload file or capture shot.</p>
                </div>
              </div>

              {/* Student Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Student Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Student Phone */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Student Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end text-xs">
              <button
                type="button"
                onClick={() => setStudentToEdit(null)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                {editSaving ? "Saving..." : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">
                Delete Student Record?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-800">{studentToDelete.full_name}</span>? This action is permanent and cannot be undone. 
                <br />
                <span className="text-amber-600 font-medium">Note: Unique sequential ID numbering continues permanently.</span>
              </p>
            </div>

            <div className="pt-2 flex gap-3 text-xs">
              <button
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Keep Record
              </button>
              <button
                onClick={handleDeleteStudent}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-colors"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
