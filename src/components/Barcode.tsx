import React from "react";

// Code 39 Barcode Map (9 elements: 5 bars, 4 spaces. 1 = wide, 0 = narrow)
const CODE39_MAP: { [key: string]: string } = {
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
  "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
  "8": "100100100", "9": "001100100", "A": "100001001", "B": "001001001",
  "C": "101001000", "D": "000011001", "E": "100011000", "F": "001011000",
  "G": "000001101", "H": "100001100", "I": "001001100", "J": "000011100",
  "K": "100000011", "L": "001000011", "M": "101000010", "N": "000010011",
  "O": "100010010", "P": "001010010", "Q": "000000111", "R": "100000110",
  "S": "001000110", "T": "000010110", "U": "110000001", "V": "011000001",
  "W": "111000000", "X": "010010001", "Y": "110010000", "Z": "011010000",
  "-": "010000101", ".": "110000100", " ": "011000100", "*": "010010100",
  "$": "010101000", "/": "010100010", "+": "010001010", "%": "000101010"
};

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

export default function Barcode({
  value,
  width = 150,
  height = 40,
  showText = true,
}: BarcodeProps) {
  const formattedValue = `*${value.toUpperCase()}*`;
  
  // Calculate stripes
  let pattern = "";
  for (let i = 0; i < formattedValue.length; i++) {
    const char = formattedValue[i];
    const code = CODE39_MAP[char] || CODE39_MAP[" "]; // Fallback to space
    pattern += code + "0"; // Add a narrow space between characters
  }

  // Draw SVG
  // 1 = wide bar (width: 3), 0 = narrow bar (width: 1)
  // Even indexes are bars, odd are spaces (since we interleave them)
  const elements: React.ReactNode[] = [];
  let currentX = 0;
  
  for (let i = 0; i < pattern.length; i++) {
    const isBar = i % 2 === 0;
    const isWide = pattern[i] === "1";
    const elemWidth = isWide ? 2.5 : 1;

    if (isBar) {
      elements.push(
        <rect
          key={i}
          x={currentX}
          y={0}
          width={elemWidth}
          height={height}
          fill="black"
        />
      );
    }
    currentX += elemWidth;
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${currentX} ${height}`}
        preserveAspectRatio="none"
        className="max-w-full"
      >
        {elements}
      </svg>
      {showText && (
        <span className="mt-1 font-mono text-[10px] tracking-widest text-slate-700">
          {value.toUpperCase()}
        </span>
      )}
    </div>
  );
}
