import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { Student } from "../types";
import { UserPlus, Image, Camera, AlertCircle, Sparkles, CheckCircle2, RotateCcw, Phone, Mail, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RegisterStudentProps {
  onRegisterSuccess: (student: Student) => void;
  token: string;
}

// Some high-quality default avatars in case the user doesn't have an image ready but wants a beautiful realistic passport photo immediately
const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
];

export default function RegisterStudent({ onRegisterSuccess, token }: RegisterStudentProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [passportPhoto, setPassportPhoto] = useState(""); // Base64 or Image URL
  const [error, setError] = useState("");
  const [successStudent, setSuccessStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  // Camera capture states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Activate Camera
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

  // Capture Image
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 350;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Center crop and draw to keep 3:4 portrait passport ratio
        ctx.drawImage(videoRef.current, 0, 0, 300, 350);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPassportPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Handle file uploads (image files)
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

  // Reset form
  const resetForm = () => {
    setFullName("");
    setPhoneNumber("");
    setEmailAddress("");
    setPassportPhoto("");
    setError("");
    setSuccessStudent(null);
    stopCamera();
  };

  // Form Submit
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessStudent(null);

    // Validation
    if (!fullName.trim()) {
      setError("Student Full Name is required.");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("Phone Number is required.");
      return;
    }
    if (!emailAddress.trim()) {
      setError("Email Address is required.");
      return;
    }
    if (!passportPhoto) {
      setError("Passport Photograph is required. Upload a file, take a picture, or select a template.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

      setSuccessStudent(data);
      onRegisterSuccess(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during student registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Student Registration
          </h1>
          <p className="text-xs text-slate-500">
            Register a student for the Professional Vibe Coding & AI course to generate a PVC card.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {successStudent ? (
          /* SUCCESS NOTIFICATION & QUICK PREVIEW */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-6 text-center space-y-4"
          >
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">
                Student Registered Successfully!
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                <span className="font-bold text-emerald-700">{successStudent.full_name}</span> has been enrolled successfully and assigned unique PVC number: <span className="font-mono font-bold text-blue-900">{successStudent.pvc_id}</span>.
              </p>
            </div>

            {/* Quick Passport & Info preview */}
            <div className="max-w-xs mx-auto border border-slate-200 rounded-xl bg-white p-4 flex items-center gap-4 text-left">
              <img
                src={successStudent.passport_photo}
                alt={successStudent.full_name}
                className="w-16 h-20 object-cover rounded border border-slate-200 shrink-0"
              />
              <div className="space-y-1 overflow-hidden">
                <span className="font-mono text-xs font-black text-blue-600">
                  {successStudent.pvc_id}
                </span>
                <h4 className="font-bold text-slate-800 text-sm truncate uppercase">
                  {successStudent.full_name}
                </h4>
                <p className="text-xs text-slate-400 truncate">{successStudent.email_address}</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Register Another Student
              </button>
            </div>
          </motion.div>
        ) : (
          /* REGISTRATION FORM */
          <motion.form
            key="form"
            onSubmit={handleRegister}
            className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6"
          >
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Photo Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Passport Photograph <span className="text-rose-500">*</span>
              </label>
              
              <div className="flex flex-col md:flex-row gap-6 items-center">
                {/* Image Placeholder Frame */}
                <div className="relative w-[120px] h-[150px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-inner group">
                  {passportPhoto ? (
                    <>
                      <img
                        src={passportPhoto}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPassportPhoto("")}
                        className="absolute bottom-1 right-1 p-1 bg-red-600/95 hover:bg-red-700 text-white rounded text-[10px] font-semibold leading-none shadow transition-colors"
                      >
                        Remove
                      </button>
                    </>
                  ) : isCameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="text-center p-3 text-slate-400 space-y-1">
                      <Image className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                      <span className="text-[10px] block leading-snug">
                        3:4 Portrait Passport
                      </span>
                    </div>
                  )}
                </div>

                {/* Control Actions & Template selection */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex flex-wrap gap-2.5">
                    {/* File Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition-colors"
                    >
                      <Image className="w-4 h-4 text-slate-500" />
                      Upload File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Camera Capture Controls */}
                    {!isCameraActive ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition-colors"
                      >
                        <Camera className="w-4 h-4 text-slate-500" />
                        Snap via Camera
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors animate-pulse"
                        >
                          Capture Shot
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Template quick-avatar list */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Or select a realistic template photo:
                    </span>
                    <div className="flex gap-2.5">
                      {DEFAULT_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPassportPhoto(url);
                            stopCamera();
                          }}
                          className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                            passportPhoto === url ? "border-blue-600 scale-105 shadow-sm" : "border-transparent opacity-80 hover:opacity-100"
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

            {/* Full Name field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Abiodun"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Input Grid: Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Phone Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +234 812 345 6789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g. samuel@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Register button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Registering Student...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5 text-cyan-300" />
                    Register Student & Generate PVC ID
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
