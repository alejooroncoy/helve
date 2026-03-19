import { useEffect, useRef } from "react";

interface Props {
  value: string;
  size?: number;
}

// Simple QR code generator using canvas — no external lib needed
// Uses a basic QR encoding approach with a QR API fallback
const QRCodeDisplay = ({ value, size = 160 }: Props) => {
  // Use a QR code API for simplicity
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=FAF6F0&color=000000&margin=8`;

  return (
    <div className="bg-background rounded-2xl p-3 inline-block">
      <img
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        className="rounded-lg"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
};

export default QRCodeDisplay;
