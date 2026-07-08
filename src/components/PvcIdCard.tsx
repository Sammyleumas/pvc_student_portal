import { useRef, useState } from "react";
import { Student } from "../types";
import Barcode from "./Barcode";
import QrCodeGenerator from "./QrCodeGenerator";
import { Printer, Download, Eye, Smartphone, Mail, Calendar, MapPin, Globe, Phone, ShieldCheck, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface PvcIdCardProps {
  student: Student;
  contactAddress?: string;
  contactWebsite?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export default function PvcIdCard({
  student,
  contactAddress = "Suite 4B, Tech Hub Towers, AI Way, Lagos, Nigeria",
  contactWebsite = "www.sltechcoacademy.com",
  contactEmail = "info@sltechcoacademy.com",
  contactPhone = "+234 812 345 6789",
}: PvcIdCardProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Generate verification URL
  const verificationUrl = `${window.location.origin}/verify/${student.pvc_id}`;

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (!printContent) return;

    // Create a temporary window or write to current document for a seamless pixel-perfect print
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the ID card.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>SL-TECHCO ACADEMY - Print ID Card - ${student.full_name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              background-color: white;
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            /* CR80 Dimensions: 85.6mm x 53.98mm (Approx 324px x 204px at 96 DPI, or 1011px x 638px at high-res 300 DPI) */
            /* We will print with a standard container of 85.6mm by 53.98mm */
            .cr80-card {
              width: 85.6mm;
              height: 53.98mm;
              box-sizing: border-box;
              position: relative;
              overflow: hidden;
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 3.18mm; /* Approx 1/8 inch radius */
              page-break-after: always;
              margin-bottom: 10px;
              display: flex;
              flex-direction: column;
              font-size: 7.5pt;
              line-height: 1.1;
            }
            @media print {
              body {
                padding: 0;
                background: none;
              }
              .no-print {
                display: none !important;
              }
              .cr80-card {
                margin: 0;
                border: none;
                box-shadow: none;
              }
              .page-break {
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print mb-6 text-center">
            <h1 class="text-xl font-bold text-slate-800">Print Preview - SL-TECHCO ACADEMY</h1>
            <p class="text-xs text-slate-500 mt-1">Ready for standard CR80 PVC card printers or high-quality card stock paper.</p>
            <button onclick="window.print()" class="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold text-sm rounded shadow hover:bg-blue-700 transition">
              Click to Open Print Dialog
            </button>
          </div>
          
          <div class="flex flex-col gap-6 items-center">
            ${printContent}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const frontElement = document.getElementById(`card-front-${student.pvc_id}`);
      const backElement = document.getElementById(`card-back-${student.pvc_id}`);

      if (!frontElement || !backElement) {
        alert("ID card components not found on page.");
        return;
      }

      // We render both elements to high-quality canvas
      const options = {
        scale: 4, // high resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "transparent",
      };

      const frontCanvas = await html2canvas(frontElement, options);
      const backCanvas = await html2canvas(backElement, options);

      const frontImgData = frontCanvas.toDataURL("image/png");
      const backImgData = backCanvas.toDataURL("image/png");

      // A4 canvas in portrait: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Page background style / Title info
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.rect(0, 0, 210, 297, "F");

      // Title & Academy details
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("SL-TECHCO ACADEMY", 105, 20, { align: "center" });

      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105); // slate-600
      pdf.text("Official Candidate Identification Badge Document", 105, 25, { align: "center" });

      // Add a separator line
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.5);
      pdf.line(20, 32, 190, 32);

      const cardWidth = 85.6;
      const cardHeight = 53.98;
      const xOffset = (210 - cardWidth) / 2; // centered

      // --- FRONT CARD SECTION ---
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.text("CARD FRONT", 105, 42, { align: "center" });

      // Add cutting guide
      pdf.setDrawColor(203, 213, 225); // slate-300
      pdf.setLineDashPattern([1.5, 1.5], 0);
      pdf.rect(xOffset - 0.5, 45 - 0.5, cardWidth + 1, cardHeight + 1);

      // Add Front Card Image
      pdf.addImage(frontImgData, "PNG", xOffset, 45, cardWidth, cardHeight);

      // --- BACK CARD SECTION ---
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.text("CARD BACK", 105, 115, { align: "center" });

      // Add cutting guide
      pdf.setDrawColor(203, 213, 225); // slate-300
      pdf.setLineDashPattern([1.5, 1.5], 0);
      pdf.rect(xOffset - 0.5, 118 - 0.5, cardWidth + 1, cardHeight + 1);

      // Add Back Card Image
      pdf.addImage(backImgData, "PNG", xOffset, 118, cardWidth, cardHeight);

      // --- INSTRUCTIONS SECTION ---
      pdf.setLineDashPattern([], 0); // Reset dash style
      pdf.setDrawColor(191, 219, 254); // blue-200
      pdf.setFillColor(239, 246, 255); // blue-50
      pdf.roundedRect(20, 185, 170, 45, 3, 3, "FD");

      pdf.setTextColor(29, 78, 216); // blue-700
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("PRINT & ASSEMBLY INSTRUCTIONS", 25, 192);

      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(8);
      const instructions = [
        "1. Paper Type: For a physical feel, print this PDF on a standard 200-300gsm thick cardstock or photo paper.",
        "2. Print Scale: Under print settings, set the page scale to '100%' or 'Actual Size' to preserve physical CR80 sizes.",
        "3. Cutting Out: Carefully cut out both the Front and Back sides using a utility knife or sharp scissors along the dotted borders.",
        "4. Assembly: Fold the cards together or glue them back-to-back, then laminate them or insert them into an ID card holder.",
        "5. System Verification: The dynamic QR code on the back remains fully active and scannable for credential verification."
      ];
      
      let yText = 198;
      instructions.forEach((line) => {
        pdf.text(line, 25, yText);
        yText += 5.5;
      });

      // Footer
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.setFontSize(8);
      pdf.text(`SL-TECHCO ACADEMY PORTAL - Candidate PVC Badge for ${student.full_name}`, 105, 275, { align: "center" });
      pdf.text(`System ID Reference: ${student.pvc_id} | Issued: ${student.registration_date}`, 105, 280, { align: "center" });

      // Save document
      pdf.save(`SL-TECHCO-ID-${student.pvc_id}.pdf`);
    } catch (err) {
      console.error("Failed to generate and download PDF", err);
      alert("There was an error generating your PDF ID card. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Interactive Controls */}
      <div className="w-full flex justify-end gap-3 mb-4">
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin text-cyan-400" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Printable PDF</span>
            </>
          )}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-sm font-medium text-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print ID Card (CR80)</span>
        </button>
      </div>

      {/* Render Area (Both Screen Display & Injected Print) */}
      <div ref={printAreaRef} className="flex flex-col md:flex-row gap-6 justify-center items-center">
        
        {/* FRONT CARD */}
        <div 
          id={`card-front-${student.pvc_id}`}
          className="cr80-card relative bg-white border border-slate-200 shadow-md flex flex-col justify-between overflow-hidden text-slate-800"
          style={{
            width: "85.6mm",
            height: "53.98mm",
            borderRadius: "3.18mm",
            boxSizing: "border-box",
            background: "linear-gradient(135deg, #ffffff 60%, #f0f7ff 100%)",
          }}
        >
          {/* Card Top Accent / Header Banner */}
          <div className="h-[12mm] bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 px-3 py-1 flex items-center justify-between border-b border-blue-950">
            <div className="flex items-center gap-1">
              {/* Academy Logo Symbol */}
              <div className="w-5 h-5 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-sm flex items-center justify-center font-extrabold text-white text-[10px] shadow-sm">
                SL
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-[8px] tracking-wider leading-none">
                  SL-TECHCO ACADEMY
                </span>
                <span className="text-[5px] text-cyan-300 font-medium tracking-widest leading-none mt-0.5">
                  PROFESSIONAL VIBE CODING & AI
                </span>
              </div>
            </div>
            <div className="text-right flex flex-col">
              <span className="bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 text-[5px] font-bold px-1 rounded-sm uppercase tracking-widest py-0.5 leading-none">
                STUDENT ID
              </span>
            </div>
          </div>

          {/* Card Body - Grid Layout */}
          <div className="flex-1 p-2.5 flex gap-2">
            
            {/* Left: Passport photo and student ID number */}
            <div className="flex flex-col items-center justify-center gap-1.5 w-[20mm]">
              <div className="w-[18mm] h-[22mm] bg-slate-100 rounded border border-slate-300 shadow-sm overflow-hidden flex items-center justify-center">
                <img
                  src={student.passport_photo}
                  alt={student.full_name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[5px] text-slate-400 font-semibold tracking-wider leading-none">
                  STUDENT ID
                </span>
                <span className="font-mono font-bold text-blue-900 text-[10px] leading-tight">
                  {student.pvc_id}
                </span>
              </div>
            </div>

            {/* Middle: Details */}
            <div className="flex-1 flex flex-col justify-between py-0.5">
              <div className="space-y-1">
                <div>
                  <div className="text-[5px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                    Student Name
                  </div>
                  <div className="font-bold text-slate-900 text-[9px] truncate tracking-tight uppercase leading-tight mt-0.5">
                    {student.full_name}
                  </div>
                </div>

                <div>
                  <div className="text-[5px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                    Enrolled Course
                  </div>
                  <div className="font-semibold text-indigo-950 text-[6.5px] leading-tight tracking-tight mt-0.5 whitespace-normal line-clamp-2">
                    PROFESSIONAL VIBE CODING AND AI DEVELOPMENT
                  </div>
                </div>

                <div className="flex gap-2">
                  <div>
                    <div className="text-[5px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                      Phone Number
                    </div>
                    <div className="font-medium text-slate-800 text-[6.5px] mt-0.5">
                      {student.phone_number}
                    </div>
                  </div>
                  <div>
                    <div className="text-[5px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                      Issue Date
                    </div>
                    <div className="font-medium text-slate-800 text-[6.5px] mt-0.5">
                      {student.registration_date}
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode inside Card Body Bottom */}
              <div className="w-full h-[6mm] flex items-center justify-start scale-x-[0.95] origin-left">
                <Barcode value={student.pvc_id} height={16} showText={false} />
              </div>
            </div>

            {/* Right Side: QR Code for validation */}
            <div className="w-[14mm] flex flex-col items-center justify-center gap-1 border-l border-slate-200/60 pl-2">
              <div className="w-[12mm] h-[12mm] scale-[0.9] origin-center">
                <QrCodeGenerator value={verificationUrl} size={45} />
              </div>
              <span className="text-[4px] text-slate-400 font-bold tracking-widest uppercase text-center leading-none">
                SCAN FOR STATUS
              </span>
            </div>

          </div>

          {/* Bottom Banner */}
          <div className="h-[2mm] bg-blue-900"></div>
        </div>

        {/* BACK CARD */}
        <div 
          id={`card-back-${student.pvc_id}`}
          className="cr80-card relative bg-white border border-slate-200 shadow-md flex flex-col justify-between overflow-hidden text-slate-800"
          style={{
            width: "85.6mm",
            height: "53.98mm",
            borderRadius: "3.18mm",
            boxSizing: "border-box",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          }}
        >
          {/* Back Header Banner */}
          <div className="h-[10mm] bg-slate-900 px-3 py-1 flex items-center border-b border-slate-950">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-sm flex items-center justify-center font-extrabold text-white text-[8px]">
                SL
              </div>
              <span className="font-extrabold text-white text-[7.5px] tracking-wider leading-none">
                SL-TECHCO ACADEMY
              </span>
            </div>
          </div>

          {/* Back Body */}
          <div className="flex-1 p-2.5 flex justify-between gap-3 text-slate-300">
            {/* Left: Rules & Verification Info */}
            <div className="flex-1 flex flex-col justify-between py-0.5">
              <div className="space-y-1">
                <div className="text-[5.5px] font-semibold text-slate-400 uppercase tracking-widest leading-tight">
                  Card Terms & Instructions
                </div>
                <ul className="list-disc pl-2.5 text-[5px] text-slate-300 leading-tight space-y-0.5">
                  <li>This card is property of SL-TECHCO ACADEMY.</li>
                  <li>Always keep this ID card visible within academy premises.</li>
                  <li>Scan the QR code to verify student active enrollment status.</li>
                  <li className="font-bold text-cyan-300">If found, please return to SL-TECHCO ACADEMY.</li>
                </ul>
              </div>

              {/* Admin Signature space */}
              <div className="flex items-end justify-between mt-1">
                <div className="flex flex-col">
                  <span className="text-[4.5px] text-slate-400 font-semibold uppercase leading-none">
                    Authorized Signatory
                  </span>
                  <div className="h-[4.5mm] border-b border-dashed border-slate-500 w-[24mm] relative">
                    <span className="absolute bottom-0.5 left-2 font-serif italic text-cyan-400 text-[8px] leading-none">
                      S.L. Techco
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col text-right">
                  <span className="text-[4px] text-slate-400 uppercase leading-none">
                    SYSTEM ID VERIFIED
                  </span>
                  <div className="flex items-center justify-end gap-0.5 text-cyan-400 font-bold text-[5px] mt-0.5">
                    <ShieldCheck className="w-1.5 h-1.5" />
                    SECURE ACCESS
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Contact & Verification QR */}
            <div className="w-[20mm] flex flex-col justify-between items-center text-center border-l border-slate-800/80 pl-2">
              <div className="w-[12mm] h-[12mm] scale-[0.85] origin-center">
                <QrCodeGenerator value={verificationUrl} size={45} />
              </div>
              
              {/* Contact Details */}
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="text-[4px] font-bold text-cyan-300 leading-tight truncate">
                  {contactWebsite}
                </span>
                <span className="text-[3.5px] text-slate-400 leading-tight truncate">
                  {contactPhone}
                </span>
                <span className="text-[3.5px] text-slate-400 leading-tight truncate max-w-[18mm]">
                  {contactEmail}
                </span>
              </div>
            </div>
          </div>

          {/* Back Footer Line */}
          <div className="h-[2mm] bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        </div>

      </div>

      {/* Screen Instructions */}
      <div className="mt-4 max-w-md bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex gap-2.5">
        <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Verification QR Code:</span> Scanning this QR code from any smartphone camera redirects directly to the real-time student credentials status portal for SL-TECHCO ACADEMY authentication.
        </div>
      </div>
    </div>
  );
}
