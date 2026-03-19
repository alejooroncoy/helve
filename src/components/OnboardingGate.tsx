import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProgress } from "@/hooks/useUserProgress";

interface Props {
  children: React.ReactNode;
}

const OnboardingGate = ({ children }: Props) => {
  const { user } = useAuth();
  const { loadProgress } = useUserProgress();
  const [status, setStatus] = useState<"loading" | "done" | "pending">("loading");

  useEffect(() => {
    if (!user) return;
    loadProgress().then((p) => {
      setStatus(p?.onboarding_completed ? "done" : "pending");
    });
  }, [user]);

  if (status === "loading") return null;
  if (status === "done") return <Navigate to="/panel" replace />;

  return <>{children}</>;
};

export default OnboardingGate;
