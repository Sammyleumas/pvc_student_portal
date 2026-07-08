import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { Student } from "../types";
import { UserPlus, Image, Camera, AlertCircle, Sparkles, CheckCircle2, Phone, Mail, User, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PublicStudentRegisterProps {
  onSuccess: (student: Student, token: string) => void;
  onBack: () => void;
}

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
];

export default function PublicStudentRegister({ onSuccess, onBack }: PublicStudentRegisterProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [passportPhoto, setPassportPhoto] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<Student | null>(null);
  const [generatedToken, setGeneratedToken] = useState("");

  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      setError("");
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 350, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Failed to access camera. Please upload an image file instead.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 350;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 350);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPassportPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPassportPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !phoneNumber.trim() || !emailAddress.trim()) {
      setError("Please fill out all contact and identifier fields.");
      return;
    }

    if (!passportPhoto) {
      setError("Please upload, take a webcam photo, or select a template portrait picture.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/student-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone_number: phoneNumber,
          email_address: emailAddress,
          passport_photo: passportPhoto,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register student");
      }

      // Automatically generate credentials token based on the registered student
      const token = "student:" + btoa(data.id);
      setSuccessData(data);
      setGeneratedToken(token);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => {
          stopCamera();
          onBack();
        }}
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Portal Options
      </button>

      <AnimatePresence mode="wait">
        {successData ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-4"
          >
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 leading-snug">
                Student Registered Successfully!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Welcome to SL-TECHCO! Your account is active. Your assigned PVC student credential number is:{" "}
                <span className="font-mono font-black text-blue-600">{successData.pvc_id}</span>.
              </p>
            </div>

            <div className="max-w-xs mx-auto border border-slate-100 rounded-2xl bg-slate-50 p-3.5 flex items-center gap-3.5 text-left shadow-sm">
              <img
                src={successData.passport_photo}
                alt={successData.full_name}
                className="w-14 h-18 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
              />
              <div className="space-y-0.5 overflow-hidden">
                <span className="font-mono text-[10px] font-bold text-indigo-600 block">
                  {successData.pvc_id}
                </span>
                <h4 className="font-extrabold text-slate-800 text-xs truncate uppercase leading-tight">
                  {successData.full_name}
                </h4>
                <p className="text-[10px] text-slate-400 truncate leading-none">{successData.email_address}</p>
              </div>
            </div>

            <button
              onClick={() => onSuccess(successData, generatedToken)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Enter My Student Portal
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Student Self-Registration
              </h2>
              <p className="text-xs text-slate-500 leading-snug">
                Fill in your registration details. Your PVC digital credential card will be generated automatically.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-100 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Passport Photo */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Passport Photograph <span className="text-rose-500">*</span>
              </label>

              <div className="flex gap-4 items-center">
                <div className="relative w-16 h-20 bg-slate-50 rounded-lg border border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-inner">
                  {passportPhoto ? (
                    <>
                      <img src={passportPhoto} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPassportPhoto("")}
                        className="absolute bottom-0.5 right-0.5 p-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[8px] font-bold leading-none shadow"
                      >
                        Del
                      </button>
                    </>
                  ) : isCameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <Image className="w-5 h-5 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-md shadow-sm transition-colors"
                    >
                      Upload File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {!isCameraActive ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-md shadow-sm transition-colors"
                      >
                        Snap Pic
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md shadow-sm transition-colors"
                        >
                          Capture
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-2.5 py-1.5 bg-slate-500 hover:bg-slate-600 text-white text-[10px] font-bold rounded-md shadow-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                      Or select template:
                    </span>
                    <div className="flex gap-1">
                      {DEFAULT_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPassportPhoto(url);
                            stopCamera();
                          }}
                          className={`w-6 h-6 rounded-md overflow-hidden border-2 transition-all ${
                            passportPhoto === url ? "border-indigo-600 scale-105" : "border-transparent opacity-80"
                          }`}
                        >
                          <img src={url} alt={`Template ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Abiodun"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +234..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

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
                    placeholder="e.g. samuel@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                "Creating Student Account..."
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5 text-cyan-300" />
                  Register & Create ID Card
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
