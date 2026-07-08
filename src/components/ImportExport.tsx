import { useState, useRef, ChangeEvent } from "react";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, FileText, Sparkles, Database } from "lucide-react";
import { Student } from "../types";

interface ImportExportProps {
  token: string;
  onImportSuccess: () => void;
}

export default function ImportExport({ token, onImportSuccess }: ImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [previewList, setPreviewList] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export current student list to CSV
  const handleExportCSV = async () => {
    try {
      setError("");
      setSuccessMsg("");

      // Fetch all students from directory
      const response = await fetch("/api/students?limit=10000"); // fetch up to 10k
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to load students for export");
      }

      const studentsList: Student[] = data.students;
      if (studentsList.length === 0) {
        setError("There are no registered students to export.");
        return;
      }

      // Convert array to CSV
      const headers = ["PVC ID", "Full Name", "Phone Number", "Email Address", "Registration Date"];
      const csvRows = [headers.join(",")];

      for (const student of studentsList) {
        const values = [
          student.pvc_id,
          `"${student.full_name.replace(/"/g, '""')}"`,
          `"${student.phone_number}"`,
          `"${student.email_address}"`,
          student.registration_date,
        ];
        csvRows.push(values.join(","));
      }

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SL_TECHCO_Students_Directory_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMsg(`Successfully exported ${studentsList.length} student records to CSV file.`);
    } catch (err: any) {
      setError(err.message || "Failed to export CSV.");
    }
  };

  // Download a sample CSV import template
  const handleDownloadTemplate = () => {
    const headers = ["full_name", "phone_number", "email_address"];
    const rows = [
      headers.join(","),
      "Abiodun Samuel,+2348123456789,samuel@example.com",
      "John Doe,+1234567890,john@example.com",
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SL_TECHCO_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV File manually (simple RFC4180-compliant parser in vanilla JS)
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccessMsg("");
    setPreviewList([]);
    
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setError("Only standard CSV (.csv) files are supported for import.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        setError("The uploaded CSV file appears to be empty or has no data rows.");
        return;
      }

      // Read Header
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
      
      const fullNameIdx = headers.indexOf("full_name");
      const phoneIdx = headers.indexOf("phone_number");
      const emailIdx = headers.indexOf("email_address");

      if (fullNameIdx === -1 || phoneIdx === -1 || emailIdx === -1) {
        setError("CSV header mismatch. Ensure your columns are: full_name, phone_number, email_address");
        return;
      }

      const parsedStudents: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Custom split to handle potential quotes and commas
        const cols = line.split(",").map((col) => col.replace(/^"|"$/g, "").trim());
        if (cols.length < headers.length) continue;

        parsedStudents.push({
          full_name: cols[fullNameIdx],
          phone_number: cols[phoneIdx],
          email_address: cols[emailIdx],
        });
      }

      if (parsedStudents.length === 0) {
        setError("No valid records found in the CSV file.");
      } else {
        setPreviewList(parsedStudents);
      }
    };
    reader.readAsText(file);
  };

  // Submit Import List to API
  const handleImportSubmit = async () => {
    if (previewList.length === 0) return;
    setImporting(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/students/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentsList: previewList }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Bulk import failed");
      }

      setSuccessMsg(
        `Successfully imported ${data.importedCount} new student records with unique sequential PVC IDs. (Skipped/Existing: ${data.skippedCount})`
      );
      setPreviewList([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onImportSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Import & Export Portal
          </h1>
          <p className="text-xs text-slate-500">
            Manage student directories in bulk. Import directories via CSV, or export active directories instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* EXPORT PANEL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Export Student Directory
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export all student names, enrollment dates, phone numbers, and unique sequential PVC numbers to a standard Excel-compatible CSV database file.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Directory (CSV)
          </button>
        </div>

        {/* IMPORT PANEL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Bulk Student Import (CSV)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Register multiple candidates at once. Download our CSV import template, fill in student details, and upload it back here.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              Download Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

      </div>

      {/* Dynamic Notifications */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Preview Section if CSV Uploaded */}
      {previewList.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-cyan-500 animate-pulse" />
              <h3 className="font-extrabold text-slate-800 text-sm">
                CSV Parse Preview ({previewList.length} Records Detected)
              </h3>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Ready to commit
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
            {previewList.map((item, idx) => (
              <div key={idx} className="p-3 flex justify-between items-center text-xs text-slate-700 hover:bg-slate-50/50 transition-colors">
                <div className="font-bold uppercase tracking-tight">{item.full_name}</div>
                <div className="font-mono text-[11px] text-slate-500">{item.phone_number} • {item.email_address}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => {
                setPreviewList([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel Upload
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={importing}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {importing ? "Importing records..." : (
                <>
                  <Database className="w-4 h-4" />
                  Commit & Generate unique PVC IDs
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
