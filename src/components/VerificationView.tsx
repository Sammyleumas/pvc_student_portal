import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Award, Calendar, Mail, Phone, ExternalLink } from "lucide-react";

interface VerificationViewProps {
  pvcId: string;
  onClose?: () => void;
}

export default function VerificationView({ pvcId, onClose }: VerificationViewProps) {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkVerification = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/verify/${pvcId.trim()}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Invalid Student ID.");
        }
        
        setStudent(data.student);
      } catch (err: any) {
        setError(err.message || "Invalid Student ID.");
      } finally {
        setLoading(false);
      }
    };

    if (pvcId) {
      checkVerification();
    }
  }, [pvcId]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 flex flex-col items-center justify-center p-4">
      
      {/* Decorative backdrop glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
        
        {loading ? (
          <div className="py-16 space-y-4">
            <svg className="animate-spin h-10 w-10 text-cyan-400 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-bold text-slate-300 tracking-wider uppercase">
              Verifying Credentials Signature...
            </p>
          </div>
        ) : error ? (
          /* FAILURE VIEW */
          <div className="py-8 space-y-6">
            <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-rose-400 tracking-tight">
                Invalid Credentials
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-xs mx-auto">
                The PVC student identification number <span className="font-mono font-bold text-rose-300">"{pvcId}"</span> could not be authenticated in the SL-TECHCO ACADEMY database.
              </p>
            </div>

            <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-300/80">
              {error}
            </div>
          </div>
        ) : (
          /* SUCCESS VERIFIED VIEW */
          <div className="space-y-6">
            <div className="mx-auto w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center shadow-xl">
              <ShieldCheck className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full uppercase tracking-widest">
                ✓ Authentic Certificate
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Credential Verified
              </h2>
              <p className="text-xs text-slate-400">
                SL-TECHCO ACADEMY OFFICIAL ENROLLMENT SIGNATURE
              </p>
            </div>

            {/* Passport & Core details */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={student.passport_photo}
                  alt={student.full_name}
                  className="w-16 h-20 object-cover rounded-lg border border-white/20 shadow-md"
                />
                <div className="space-y-1 overflow-hidden">
                  <span className="font-mono font-black text-cyan-300 text-sm block">
                    {student.pvc_id}
                  </span>
                  <h4 className="font-bold text-white text-base uppercase truncate tracking-tight">
                    {student.full_name}
                  </h4>
                  <span className="inline-block text-[9px] font-bold text-cyan-400 leading-none">
                    ACTIVE STUDENT
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">PROFESSIONAL VIBE CODING AND AI DEVELOPMENT</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">{student.email_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{student.phone_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Enrolled: {student.registration_date}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
          {onClose ? (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs rounded-xl transition shadow"
            >
              Back to Portal
            </button>
          ) : (
            <a
              href="/"
              className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
            >
              Access SL-TECHCO Academy Portal
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <span className="text-[9px] text-slate-500">
            Powered by SL-TECHCO ACADEMY Cryptographic ID verification network.
          </span>
        </div>

      </div>
    </div>
  );
}
