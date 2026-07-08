import { useState, useEffect } from "react";

interface QrCodeGeneratorProps {
  value: string;
  size?: number;
}

export default function QrCodeGenerator({ value, size = 100 }: QrCodeGeneratorProps) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    // We use the QRServer api which is extremely fast, free, secure, and produces crisp QR codes.
    const encodedValue = encodeURIComponent(value);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&ecc=M&margin=1`);
  }, [value, size]);

  return (
    <div className="flex items-center justify-center bg-white p-1 rounded-sm border border-slate-200">
      {qrUrl ? (
        <img
          src={qrUrl}
          alt={`QR Code for ${value}`}
          width={size}
          height={size}
          className="object-contain"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="flex items-center justify-center bg-slate-100 text-[10px] text-slate-400"
        >
          Loading...
        </div>
      )}
    </div>
  );
}
