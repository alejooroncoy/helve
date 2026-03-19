import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2600);
    const doneTimer = setTimeout(() => onFinish(), 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        backgroundColor: "#5BB8F5",
        transition: "opacity 0.4s ease",
        opacity: fading ? 0 : 1,
        zIndex: 9999,
      }}
    >
      <img
        src="/face.png"
        alt="Helve"
        className="object-contain"
        style={{ width: "70vw", maxWidth: 320 }}
      />
      <p
        className="absolute bottom-12 text-white font-serif tracking-widest"
        style={{ fontSize: "2.5rem", fontWeight: 900 }}
      >
        HELVE
      </p>
    </div>
  );
}
